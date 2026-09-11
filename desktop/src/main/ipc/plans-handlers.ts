import { ipcMain } from 'electron'
import type { PlanDetail, PlanOverview } from '../../types'
import { listPlanDetail, listPlanSessions } from '../cloud/plans'

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
}
