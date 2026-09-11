import { ipcMain } from 'electron'
import type { PlanDetail, PlanOverview, PlanTicketOrigin } from '../../types'
import { findPlanForTicket, listPlanDetail, listPlanSessions } from '../cloud/plans'

/**
 * The renderer is expected to send back a uuid it got from `plans:list`, and RLS would
 * answer `session: null` for anything else. The guard is here anyway, because "the
 * caller is well behaved" is not a property this side of the bridge can check: every
 * other handler in this directory validates its arguments, and a channel that trusts its
 * input is the one that stops being true the day something else calls it.
 *
 * It is a SHAPE check, not an authorization check — that stays with RLS, which is the
 * only thing that knows which sessions this reader may see. So a malformed id gets the
 * same answer a well-formed unknown one does, rather than a distinguishable rejection:
 * the renderer draws one "this plan is not available" state either way.
 */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * The Plans page's two channels: the list, and one plan.
 *
 * Beyond that guard these are pass-throughs, like `org-handlers.ts`: there is nothing to
 * decide here. Both reads answer whatever happens — each carries `failed` for a read
 * that errored, and an empty, unfailed answer for an app with nowhere to read from — so
 * there is no rejection for a try/catch to turn into anything the renderer does not
 * already draw from the answer itself.
 *
 * The renderer never talks to Supabase. This is the whole of its access to
 * `plan_sessions`, and it is read-only.
 */
export function setupPlansHandlers(): void {
  ipcMain.handle('plans:list', async (): Promise<PlanOverview> => listPlanSessions())
  ipcMain.handle('plans:detail', async (_e, id: unknown): Promise<PlanDetail> => {
    if (typeof id !== 'string' || !UUID_RE.test(id)) return { session: null, tickets: [], failed: false }
    return listPlanDetail(id)
  })
  /**
   * The plan a ticket came out of, asked by the TICKET page — the one read here that
   * goes the other way round.
   *
   * The repositories are uuids from the same cloud as the session ids above, so they get
   * the same shape check and for the same reason: RLS would answer nothing for anything
   * else, and a channel that trusts its input is the one that stops being true the day
   * something else calls it. Several of them, because a ticket's card can stand for
   * several — one Jira project planned for two services. The KEYS are not
   * pattern-checked: they are tracker identifiers in two spellings and they reach
   * PostgREST as bound values, never as SQL. Both arrays are, since a handler that
   * iterates whatever arrived is the one that throws where this promises an answer.
   *
   * Every rejection is `null`, which is also what "no plan filed this" is. The two are
   * one state on the page: the block is simply not drawn, and the overwhelming majority
   * of tickets were filed by hand and have no plan behind them anyway.
   */
  ipcMain.handle('plans:forTicket', async (_e, args: unknown): Promise<PlanTicketOrigin | null> => {
    if (typeof args !== 'object' || args === null) return null
    const { repoIds, keys } = args as { repoIds?: unknown; keys?: unknown }
    if (!Array.isArray(repoIds) || !repoIds.every((id) => typeof id === 'string' && UUID_RE.test(id))) {
      return null
    }
    if (!Array.isArray(keys) || !keys.every((key) => typeof key === 'string')) return null
    return findPlanForTicket(repoIds, keys)
  })
}
