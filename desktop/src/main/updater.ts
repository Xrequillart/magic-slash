import { autoUpdater, UpdateInfo, ProgressInfo } from 'electron-updater'
import { BrowserWindow, ipcMain, app } from 'electron'

export type UpdateStatus =
  | { type: 'checking' }
  | { type: 'available'; version: string }
  | { type: 'not-available' }
  | { type: 'downloading'; progress: number }
  | { type: 'downloaded'; version: string }
  | { type: 'error'; message: string }

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
    sendStatus({ type: 'downloaded', version: info.version })
    // Auto restart after 3 seconds
    setTimeout(() => {
      autoUpdater.quitAndInstall(false, true)
    }, 3000)
  })

  autoUpdater.on('error', (err: Error) => {
    console.error('[Updater] Error:', err.message)
    sendStatus({ type: 'error', message: err.message })
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
