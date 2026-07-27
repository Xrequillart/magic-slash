import { ipcMain, clipboard } from 'electron'
import type { Config } from '../../types'
import { readConfig, writeConfig } from '../config/config'
import { addConfigChangeListener } from '../config/remote-sync'
import { writeToTerminal, getTerminal } from '../pty/terminal-manager'
import type { PRReviewWatcher } from '../pr-review-watcher/watcher'

const MIN_POLL_INTERVAL_MS = 30_000
const MAX_POLL_INTERVAL_MS = 600_000

/** Whether a poll interval is one the watcher may actually be driven with. */
function isValidPollInterval(ms: unknown): ms is number {
  return typeof ms === 'number' && Number.isFinite(ms) && ms >= MIN_POLL_INTERVAL_MS && ms <= MAX_POLL_INTERVAL_MS
}

/**
 * Mirror a remotely-changed PR review setting onto the live watcher.
 *
 * The IPC handlers below are the LOCAL path only; a change made on the web app
 * arrives through Realtime and would otherwise sit in the config, correct but
 * inert, until the next launch.
 *
 * Each setting is applied only when it actually moved, so an echo of the app's
 * own write (every save upserts all the settings columns) does not restart the
 * poll timer. The interval is re-validated here rather than trusted: the bounds
 * live in this process, and the column's only database constraint is `> 0` — a
 * row carrying 1000 would otherwise poll GitHub every second.
 */
function applyRemotePRReviewSettings(watcher: PRReviewWatcher, prev: Config, next: Config): void {
  // Absent means ON, matching the watcher's own reading of the setting
  // (getStatus, and the launch check in main/index.ts).
  const wasEnabled = prev.prReviews?.enabled !== false
  const isEnabled = next.prReviews?.enabled !== false
  if (wasEnabled !== isEnabled) watcher.setEnabled(isEnabled)

  const interval = next.prReviews?.pollIntervalMs
  if (interval !== prev.prReviews?.pollIntervalMs && isValidPollInterval(interval)) {
    watcher.setInterval(interval)
  }
}

export function setupPRReviewHandlers(watcher: PRReviewWatcher) {
  addConfigChangeListener(({ prev, next }) => {
    // No previous config means nothing is known to have changed — a diff against
    // "absent" would read every setting as new and restart the watcher for nothing.
    if (prev) applyRemotePRReviewSettings(watcher, prev, next)
  })

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
    if (!isValidPollInterval(ms)) {
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
