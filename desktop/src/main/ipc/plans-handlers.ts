import { ipcMain } from 'electron'
import type { PlanDetail, PlanOverview } from '../../types'
import { listPlanDetail, listPlanSessions } from '../cloud/plans'

/**
 * The Plans page's two channels: the list, and one plan.
 *
 * A pass-through, like `org-handlers.ts`: there is nothing to validate and nothing to
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
  // The id is a uuid the renderer got from `plans:list`, so there is nothing to
  // validate here either: an id naming no visible session comes back as `session: null`
  // by RLS, which is the same answer a made-up one would get.
  ipcMain.handle('plans:detail', async (_e, id: string): Promise<PlanDetail> => listPlanDetail(id))
}
