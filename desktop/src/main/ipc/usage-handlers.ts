import { ipcMain } from 'electron'
import { getClaudeAccount, getSpendSummary } from '../usage/claude-account-usage'
import { telemetryHealth } from '../usage/telemetry-health'

export function setupUsageHandlers(): void {
  ipcMain.handle('usage:getAccount', async () => getClaudeAccount())
  ipcMain.handle('usage:getSpend', async () => getSpendSummary())
  // Computed on demand rather than cached: it inspects the filesystem and PATH, and
  // is read by one panel a user opens deliberately.
  ipcMain.handle('usage:getTelemetryHealth', async () => telemetryHealth())
}
