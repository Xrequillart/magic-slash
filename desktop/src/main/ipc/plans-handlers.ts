import { ipcMain } from 'electron'
import type { PlanOverview } from '../../types'
import { listPlanSessions } from '../cloud/plans'

/**
 * The Plans page's one channel.
 *
 * A pass-through, like `org-handlers.ts`: there is no argument to validate and nothing to
 * decide here. `listPlanSessions` answers with an overview whatever happens — it carries
 * `failed` for a read that errored and an empty, unfailed overview for an app with
 * nowhere to read from — so there is no rejection for a try/catch to turn into anything
 * the renderer does not already draw from the answer itself.
 *
 * The renderer never talks to Supabase. This is the whole of its access to
 * `plan_sessions`, and it is read-only.
 */
export function setupPlansHandlers(): void {
  ipcMain.handle('plans:list', async (): Promise<PlanOverview> => listPlanSessions())
}
