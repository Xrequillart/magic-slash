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
  // Configure auto-updater
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true

  // Event handlers
  autoUpdater.on('checking-for-update', () => {
    sendStatus({ type: 'checking' })
  })

  // Deliberately does NOT start the download. The check still runs by itself at
  // launch, but pulling ~150 MB is the person's call: 'available' is what raises
  // the update button at the bottom of the left sidebar, and that button is the
  // only thing that calls `updater:download` below.
  autoUpdater.on('update-available', (info: UpdateInfo) => {
    currentPhase = 'download'
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
    sendStatus({ type: 'error', message: err.message, phase: currentPhase })
  })

  // IPC handlers
  ipcMain.handle('updater:check', async () => checkForUpdates())

  ipcMain.handle('updater:download', async () => {
    // Guarded rather than trusting the caller: downloadUpdate() rejects when
    // electron-updater has no update info in hand, which is every state but these
    // two. A failed download stays retryable — the error came from the transfer,
    // not from the update being gone.
    if (currentStatus.type !== 'available' && !(currentStatus.type === 'error' && currentStatus.phase === 'download')) {
      return
    }
    try {
      currentPhase = 'download'
      await autoUpdater.downloadUpdate()
    } catch (err) {
      // The 'error' event has already reported this to the renderer; swallowing the
      // rejection here only keeps it from surfacing as an unhandled invoke failure.
      console.error('[Updater] Download failed:', (err as Error).message)
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

