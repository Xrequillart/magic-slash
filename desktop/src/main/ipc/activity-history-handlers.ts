import { ipcMain } from 'electron'
import { readHistory, addHistoryEntry } from '../config/activity-history'
import { ensureHydrated } from '../store/hydrate'

export function registerActivityHistoryHandlers(): void {
  ipcMain.handle('activityHistory:getAll', async () => {
    await ensureHydrated()
    return readHistory()
  })
  ipcMain.handle('activityHistory:add', async (_event, params) => {
    if (typeof params?.agentId !== 'string' || typeof params?.agentName !== 'string' || typeof params?.action !== 'string') return
    return addHistoryEntry(params)
  })
}
