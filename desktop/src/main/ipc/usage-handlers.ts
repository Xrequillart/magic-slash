import { ipcMain } from 'electron'
import type { SkillHours } from '../../types'
import { getClaudeAccount, getSpendSummary } from '../usage/claude-account-usage'
import { readSkillHours } from '../usage/skill-invocations'
import { telemetryHealth } from '../usage/telemetry-health'

export function setupUsageHandlers(): void {
  ipcMain.handle('usage:getAccount', async () => getClaudeAccount())
  ipcMain.handle('usage:getSpend', async () => getSpendSummary())
  // Here rather than beside the org: skill_hours answers about the SIGNED-IN USER across
  // every scope, so it takes no org id and has none to get wrong.
  ipcMain.handle('usage:getSkillHours', async (): Promise<SkillHours | null> => readSkillHours())
  // Computed on demand rather than cached: it inspects the filesystem and PATH, and
  // is read by one panel a user opens deliberately.
  ipcMain.handle('usage:getTelemetryHealth', async () => telemetryHealth())
}
