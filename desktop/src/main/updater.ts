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

function sendStatus(status: UpdateStatus) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('updater:status', status)
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

  autoUpdater.on('update-available', (info: UpdateInfo) => {
    currentPhase = 'download'
    sendStatus({ type: 'available', version: info.version })
    // Start download automatically
    autoUpdater.downloadUpdate()
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
    // Persist to disk (main process) so the renderer can read it after restart.
    // We cannot rely on the renderer's localStorage because forceCloseAllWindows()
    // destroys the renderer before Chromium may have flushed LevelDB to disk.
    if (notes) {
      savePendingWhatsNew(info.version, notes)
    }
    // Clean up resources then restart
    setTimeout(async () => {
      isUpdating = true
      try {
        cleanupAllTerminals()
        await stopStatusServer()
      } catch (err) {
        console.error('[Updater] Pre-install cleanup error:', err)
      }

      try {
        // On macOS, open windows can prevent app.quit() from completing.
        // Destroy all windows before calling quitAndInstall to ensure clean exit.
        forceCloseAllWindows()
        autoUpdater.quitAndInstall(true, true)
      } catch (err) {
        console.error('[Updater] quitAndInstall failed:', err)
        isUpdating = false
      }
    }, 3000)
  })

  autoUpdater.on('error', (err: Error) => {
    console.error('[Updater] Error:', err.message)
    sendStatus({ type: 'error', message: err.message, phase: currentPhase })
  })

  // IPC handlers
  ipcMain.handle('updater:check', async () => {
    try {
      return await autoUpdater.checkForUpdates()
    } catch (err) {
      console.error('[Updater] Check failed:', err)
      return null
    }
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
