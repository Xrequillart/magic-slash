import { ipcMain, clipboard } from 'electron'
import { readConfig, writeConfig } from '../config/config'
import { writeToTerminal, getTerminal } from '../pty/terminal-manager'
import type { PRReviewWatcher } from '../pr-review-watcher/watcher'

const MIN_POLL_INTERVAL_MS = 30_000
const MAX_POLL_INTERVAL_MS = 600_000

export function setupPRReviewHandlers(watcher: PRReviewWatcher) {
  ipcMain.handle('prWatcher:setEnabled', async (_event, enabled: boolean) => {
    const config = readConfig()
    config.prReviews = { ...(config.prReviews || {}), enabled }
    writeConfig(config)
    watcher.setEnabled(enabled)
    return config
  })

  ipcMain.handle('prWatcher:getStatus', async () => {
    return watcher.getStatus()
  })

  ipcMain.handle('prWatcher:setInterval', async (_event, ms: number) => {
    if (!Number.isFinite(ms) || ms < MIN_POLL_INTERVAL_MS || ms > MAX_POLL_INTERVAL_MS) {
      throw new Error(`Invalid poll interval: ${ms} (must be ${MIN_POLL_INTERVAL_MS}..${MAX_POLL_INTERVAL_MS})`)
    }
    const config = readConfig()
    config.prReviews = { ...(config.prReviews || {}), pollIntervalMs: ms }
    writeConfig(config)
    watcher.setInterval(ms)
    return config
  })

  ipcMain.handle('prWatcher:setAutoLaunchSkills', async (_event, enabled: boolean) => {
    const config = readConfig()
    config.prReviews = { ...(config.prReviews || {}), autoLaunchSkills: enabled }
    writeConfig(config)
    return config
  })

  // Sends a slash command to an agent terminal. If autoLaunchSkills is disabled,
  // the command is copied to clipboard instead so the user can paste it manually.
  ipcMain.handle('prWatcher:sendCommand', async (_event, { terminalId, command }: { terminalId: string; command: string }) => {
    if (!command.trim()) {
      throw new Error('prWatcher:sendCommand requires a non-empty command')
    }
    if (!getTerminal(terminalId)) {
      throw new Error(`Terminal ${terminalId} not found`)
    }
    const autoLaunch = readConfig().prReviews?.autoLaunchSkills === true
    if (!autoLaunch) {
      clipboard.writeText(command)
      return { launched: false, copied: true }
    }
    writeToTerminal(terminalId, command + '\n')
    return { launched: true, copied: false }
  })
}
