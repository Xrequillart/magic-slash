import { autoUpdater, UpdateInfo, ProgressInfo } from 'electron-updater'
import { BrowserWindow, ipcMain, app } from 'electron'
import { writeFileSync, readFileSync, unlinkSync, existsSync } from 'fs'
import { join } from 'path'
import { cleanupAllTerminals } from './pty/terminal-manager'
import { stopStatusServer } from './hooks/status-server'
import { githubHeaders } from './github'

function getPendingWhatsNewPath() {
  return join(app.getPath('userData'), 'pending-whats-new.json')
}

function savePendingWhatsNew(version: string, releaseNotes: string) {
  try {
    writeFileSync(getPendingWhatsNewPath(), JSON.stringify({ version, releaseNotes }), 'utf-8')
  } catch (err) {
    console.error('[Updater] Failed to save pending what\'s new:', err)
  }
}

function readPendingWhatsNew(): { version: string; releaseNotes: string } | null {
  try {
    const filePath = getPendingWhatsNewPath()
    if (!existsSync(filePath)) return null
    return JSON.parse(readFileSync(filePath, 'utf-8'))
  } catch {
    return null
  }
}

function clearPendingWhatsNew() {
  try {
    const filePath = getPendingWhatsNewPath()
    if (existsSync(filePath)) unlinkSync(filePath)
  } catch {
    // ignore
  }
}

function forceCloseAllWindows() {
  for (const win of BrowserWindow.getAllWindows()) {
    win.removeAllListeners('close')
    win.destroy()
  }
}

export type UpdateStatus =
  | { type: 'checking' }
  | { type: 'available'; version: string }
  | { type: 'not-available' }
  | { type: 'downloading'; progress: number }
  | { type: 'downloaded'; version: string; releaseNotes?: string }
  | { type: 'error'; message: string; phase?: 'check' | 'download' | 'install' }

export let isUpdating = false
// Raised while a transfer is in flight, so nothing pulls the same release twice in
// parallel. With autoDownload on, electron-updater starts the download itself the
// moment it emits 'update-available' — without this flag the tray's download button
// (and the sidebar row's retry) would kick off a second one on top of it.
let downloadInFlight = false
let currentPhase: 'check' | 'download' | 'install' = 'check'
let mainWindow: BrowserWindow | null = null
let currentStatus: UpdateStatus = { type: 'not-available' }
let statusListeners: Array<(status: UpdateStatus) => void> = []
function sendStatus(status: UpdateStatus) {
  currentStatus = status
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('updater:status', status)
  }
  for (const listener of statusListeners) {
    listener(status)
  }
}

export function getUpdateStatus(): UpdateStatus {
  return currentStatus
}

export function onUpdateStatusChange(listener: (status: UpdateStatus) => void): () => void {
  statusListeners.push(listener)
  return () => {
    statusListeners = statusListeners.filter(l => l !== listener)
  }
}

export function setupAutoUpdater() {
  // Configure auto-updater. The download starts by itself: the check runs at launch
  // and the transfer follows it without asking, because nothing about it interrupts
  // the person — progress is drawn in the left sidebar and the app stays usable
  // throughout. Only the restart is still a choice, offered by that same row.
  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  // Event handlers
  autoUpdater.on('checking-for-update', () => {
    sendStatus({ type: 'checking' })
  })

  // A brief state now that autoDownload is on: electron-updater emits this and goes
  // straight into the transfer, so the sidebar row shows the version found for a
  // moment before the progress bar replaces it. `updater:download` below is still
  // reachable — it is the retry path after a failed transfer.
  autoUpdater.on('update-available', (info: UpdateInfo) => {
    currentPhase = 'download'
    downloadInFlight = autoUpdater.autoDownload
    sendStatus({ type: 'available', version: info.version })
  })

  autoUpdater.on('update-not-available', () => {
    sendStatus({ type: 'not-available' })
  })

  autoUpdater.on('download-progress', (progress: ProgressInfo) => {
    sendStatus({ type: 'downloading', progress: progress.percent })
  })

  autoUpdater.on('update-downloaded', (info: UpdateInfo) => {
    currentPhase = 'install'
    downloadInFlight = false
    const notes = typeof info.releaseNotes === 'string'
      ? info.releaseNotes
      : Array.isArray(info.releaseNotes)
        ? info.releaseNotes.map(n => typeof n === 'string' ? n : n.note).join('\n')
        : undefined
    sendStatus({ type: 'downloaded', version: info.version, releaseNotes: notes || undefined })
    if (notes) {
      savePendingWhatsNew(info.version, notes)
    }
  })

  autoUpdater.on('error', (err: Error) => {
    console.error('[Updater] Error:', err.message)
    downloadInFlight = false
    sendStatus({ type: 'error', message: err.message, phase: currentPhase })
  })

  // IPC handlers
  ipcMain.handle('updater:check', async () => checkForUpdates())

  ipcMain.handle('updater:download', async () => {
    // Guarded rather than trusting the caller. A transfer already running wins:
    // autoDownload starts one by itself, so the callers that still offer a download
    // button would otherwise duplicate it. And downloadUpdate() rejects when
    // electron-updater has no update info in hand, which is every state but these
    // two — a failed download stays retryable, since the error came from the
    // transfer and not from the update being gone.
    if (downloadInFlight) return
    if (currentStatus.type !== 'available' && !(currentStatus.type === 'error' && currentStatus.phase === 'download')) {
      return
    }
    try {
      currentPhase = 'download'
      downloadInFlight = true
      await autoUpdater.downloadUpdate()
    } catch (err) {
      // The 'error' event has already reported this to the renderer; swallowing the
      // rejection here only keeps it from surfacing as an unhandled invoke failure.
      console.error('[Updater] Download failed:', (err as Error).message)
    } finally {
      downloadInFlight = false
    }
  })

  ipcMain.handle('updater:getStatus', () => {
    return currentStatus
  })

  ipcMain.handle('updater:install', async () => {
    await installUpdate()
  })

  ipcMain.handle('updater:getVersion', () => {
    return app.getVersion()
  })

  ipcMain.handle('updater:getPendingWhatsNew', () => {
    return readPendingWhatsNew()
  })

  ipcMain.handle('updater:clearPendingWhatsNew', () => {
    clearPendingWhatsNew()
  })

  ipcMain.handle('updater:getReleaseNotes', async (_event, version: string) => {
    try {
      const response = await fetch(
        `https://api.github.com/repos/xrequillart/magic-slash/releases/tags/v${version}`,
        { headers: githubHeaders({ Accept: 'application/vnd.github.html+json' }) }
      )
      if (!response.ok) return null
      const data = await response.json()
      return data.body_html || null
    } catch {
      return null
    }
  })
}

export function setUpdaterMainWindow(window: BrowserWindow) {
  mainWindow = window
}

/**
 * Check on demand — what the tray panel's button and the app menu's
 * "Check for Updates" both call.
 *
 * Unlike checkForUpdatesOnStartup() there is no dev guard and no delay: someone
 * asked for it, so the failure is worth surfacing rather than swallowing. The
 * outcome reaches the UI through autoUpdater's own events, which sendStatus()
 * forwards on the 'updater:status' channel; the return value is only for the
 * IPC caller.
 */
export async function checkForUpdates() {
  try {
    return await autoUpdater.checkForUpdates()
  } catch (err) {
    console.error('[Updater] Check failed:', err)
    return null
  }
}

export async function checkForUpdatesOnStartup() {
  // Skip in development
  if (process.env.VITE_DEV_SERVER_URL) {
    sendStatus({ type: 'not-available' })
    return
  }

  // Wait a bit before checking to let the app fully load
  setTimeout(async () => {
    try {
      await autoUpdater.checkForUpdates()
    } catch (err) {
      console.error('[Updater] Startup check failed:', err)
      sendStatus({ type: 'error', message: (err as Error).message })
    }
  }, 1000)
}

export async function installUpdate(): Promise<void> {
  if (currentStatus.type !== 'downloaded') return

  isUpdating = true
  try {
    cleanupAllTerminals()
    await stopStatusServer()
  } catch (err) {
    console.error('[Updater] Pre-install cleanup error:', err)
  }

  try {
    forceCloseAllWindows()
    autoUpdater.quitAndInstall(true, true)
  } catch (err) {
    console.error('[Updater] quitAndInstall failed:', err)
    isUpdating = false
  }
}

