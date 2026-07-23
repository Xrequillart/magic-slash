import { ipcMain } from 'electron'
import { getClaudeAccount, getSpendSummary } from '../usage/claude-account-usage'

export function setupUsageHandlers(): void {
  ipcMain.handle('usage:getAccount', async () => getClaudeAccount())
  ipcMain.handle('usage:getSpend', async () => getSpendSummary())
}
