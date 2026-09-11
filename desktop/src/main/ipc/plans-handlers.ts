import { ipcMain } from 'electron'
import type { PlanOverview } from '../../types'
import { listPlanSessions } from '../cloud/plans'

/**
 * The Plans page's one channel.
 *
 * A pass-through, like `org-handlers.ts`: there is no argument to validate and nothing
 * to decide here — `listPlanSessions` degrades to an empty overview on every failure
 * path it has (cloud off, signed out, a read that errored), so there is no rejection for
 * a try/catch to turn into anything better than what the renderer already draws.
 *
 * The renderer never talks to Supabase. This is the whole of its access to
 * `plan_sessions`, and it is read-only.
 */
export function setupPlansHandlers(): void {
  ipcMain.handle('plans:list', async (): Promise<PlanOverview> => listPlanSessions())
}
