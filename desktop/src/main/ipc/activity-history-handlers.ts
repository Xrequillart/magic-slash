import { ipcMain } from 'electron'
import { readHistory, addHistoryEntry, clearHistory } from '../config/activity-history'

export function registerActivityHistoryHandlers(): void {
  ipcMain.handle('activityHistory:getAll', async () => readHistory())
  ipcMain.handle('activityHistory:add', async (_event, params) => {
    if (typeof params?.agentId !== 'string' || typeof params?.agentName !== 'string' || typeof params?.action !== 'string') return
    return addHistoryEntry(params)
  })
  ipcMain.handle('activityHistory:clear', async () => clearHistory())
}
