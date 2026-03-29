import { app, BrowserWindow, Notification, ipcMain, dialog, Menu, shell } from 'electron'
import { join } from 'path'
import { setupConfigHandlers } from './ipc/config-handlers'
import { setupTerminalHandlers, cleanupTerminals, restoreAgents } from './ipc/terminal-handlers'
import { startStatusServer, stopStatusServer, setStateCallback, setMetadataCallback, setCommandStartCallback, setCommandEndCallback, setRepositoriesCallback } from './hooks/status-server'
import { installShellIntegration } from './hooks/shell-integration'
import { configureClaudeHooks } from './hooks/claude-hooks-config'
import { setStatusServerPort, updateTerminalStateFromHook, updateTerminalMetadataFromHook, updateTerminalRepositoriesFromHook } from './pty/terminal-manager'
import { setupAutoUpdater, setUpdaterMainWindow, checkForUpdatesOnStartup, isUpdating } from './updater'
import { updateSkills } from './skills-updater'
import { setupSkillsHandlers } from './ipc/skills-handlers'
import { setupScriptHandlers } from './ipc/script-handlers'
import { migrateConfig } from './config/migrate'

let mainWindow: BrowserWindow | null = null

function createMenu() {
  const isMac = process.platform === 'darwin'

  const template: Electron.MenuItemConstructorOptions[] = [
    // App menu (macOS only)
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: 'about' as const },
              { type: 'separator' as const },
              { role: 'services' as const },
              { type: 'separator' as const },
              { role: 'hide' as const },
              { role: 'hideOthers' as const },
              { role: 'unhide' as const },
              { type: 'separator' as const },
              { role: 'quit' as const },
            ],
          },
        ]
      : []),
    // File menu - without Cmd+W close window
    {
      label: 'File',
      submenu: [isMac ? { role: 'close' as const, accelerator: '' } : { role: 'quit' as const }],
    },
    // Edit menu
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' as const },
        { role: 'redo' as const },
        { type: 'separator' as const },
        { role: 'cut' as const },
        { role: 'copy' as const },
        { role: 'paste' as const },
        { role: 'selectAll' as const },
      ],
    },
    // View menu
    {
      label: 'View',
      submenu: [
        { role: 'reload' as const },
        { role: 'forceReload' as const },
        // Include toggleDevTools only in dev mode
        ...(process.env.VITE_DEV_SERVER_URL ? [{ role: 'toggleDevTools' as const }] : []),
        { type: 'separator' as const },
        { role: 'resetZoom' as const },
        { role: 'zoomIn' as const },
        { role: 'zoomOut' as const },
        { type: 'separator' as const },
        { role: 'togglefullscreen' as const },
      ],
    },
    // Window menu
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' as const },
        { role: 'zoom' as const },
        ...(isMac
          ? [
              { type: 'separator' as const },
              { role: 'front' as const },
            ]
          : []),
      ],
    },
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    titleBarStyle: 'hidden',
    trafficLightPosition: { x: 16, y: 12 },
    transparent: true,
    vibrancy: 'fullscreen-ui',
    visualEffectState: 'active',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
      // sandbox: false is required because the preload script needs access to
      // Node.js APIs (child_process, fs, path) for node-pty terminal management.
      // Security mitigations: contextIsolation=true prevents renderer from accessing
      // Node globals, nodeIntegration=false blocks require() in renderer, and all
      // IPC is mediated through contextBridge in preload/index.ts.
      sandbox: false,
    },
  })

  // In development, load from Vite dev server
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
    mainWindow.webContents.openDevTools()
  } else {
    // In production, load the built files
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  // Intercept navigation to external URLs and open them in the default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // Open external URLs in the default browser
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url)
    }
    return { action: 'deny' }
  })

  // Prevent navigation away from the app
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const appUrl = process.env.VITE_DEV_SERVER_URL || 'file://'
    if (!url.startsWith(appUrl)) {
      event.preventDefault()
      if (url.startsWith('http://') || url.startsWith('https://')) {
        shell.openExternal(url)
      }
    }
  })
}

// Setup IPC handlers
function setupHandlers() {
  setupConfigHandlers()
  setupSkillsHandlers()
  setupScriptHandlers(() => mainWindow)
  setupTerminalHandlers(
    () => mainWindow,
    // Notification callback - only show when window is not focused
    (title: string, body: string) => {
      if (Notification.isSupported() && mainWindow && !mainWindow.isFocused()) {
        new Notification({ title, body }).show()
      }
    }
  )

  // Window control handlers
  ipcMain.handle('window:minimize', () => {
    mainWindow?.minimize()
  })

  ipcMain.handle('window:maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize()
    } else {
      mainWindow?.maximize()
    }
  })

  ipcMain.handle('window:close', () => {
    mainWindow?.close()
  })

  ipcMain.handle('window:isMaximized', () => {
    return mainWindow?.isMaximized() ?? false
  })

  // Shell handlers
  ipcMain.handle('shell:openExternal', async (_event, url: string) => {
    await shell.openExternal(url)
  })

  ipcMain.handle('shell:openInVSCode', async (_event, path: string) => {
    const { spawn } = await import('child_process')
    if (process.platform === 'darwin') {
      // macOS: use 'open' command with VSCode app
      spawn('open', ['-a', 'Visual Studio Code', path], { detached: true, stdio: 'ignore' }).unref()
    } else if (process.platform === 'win32') {
      // Windows: use 'code' from typical install location or PATH
      spawn('cmd', ['/c', 'code', path], { detached: true, stdio: 'ignore' }).unref()
    } else {
      // Linux: use 'code' command
      spawn('code', [path], { detached: true, stdio: 'ignore' }).unref()
    }
  })

  // Dialog handlers
  ipcMain.handle('dialog:openFolder', async () => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ['openDirectory'],
      title: 'Select a repository folder'
    })

    if (result.canceled || result.filePaths.length === 0) {
      return null
    }

    return result.filePaths[0]
  })
}

app.whenReady().then(async () => {
  // Migrate config to ensure all repositories have complete fields
  migrateConfig()

  // Create custom menu (removes Cmd+W close window behavior)
  createMenu()

  // Setup auto-updater handlers
  setupAutoUpdater()

  // Setup IPC handlers first so renderer can communicate
  setupHandlers()

  // Create window immediately for faster perceived startup
  createWindow()

  // Connect updater to main window
  if (mainWindow) {
    setUpdaterMainWindow(mainWindow)
  }

  // Check for app updates on startup
  checkForUpdatesOnStartup()

  // Update skills in background (after app update check)
  updateSkills().catch(err => {
    console.error('Failed to update skills:', err)
  })

  // Initialize hooks and restore sessions in background (non-blocking)
  initializeHooksAndSessions().catch(err => {
    console.error('[Init] Failed to initialize hooks and sessions:', err)
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
      // Connect updater to new window
      if (mainWindow) {
        setUpdaterMainWindow(mainWindow)
      }
      // Restore terminal sessions when window is reopened on Mac
      restoreAgents()
    }
  })
})

// Deferred initialization - runs after window is shown
async function initializeHooksAndSessions() {
  try {
    const port = await startStatusServer()
    setStatusServerPort(port)

    // Configure Claude Code hooks (deferred file I/O)
    configureClaudeHooks()

    // Set up callbacks for status updates
    setStateCallback((terminalId: string, state: string) => {
      updateTerminalStateFromHook(terminalId, state)
      if (mainWindow) {
        mainWindow.webContents.send('terminal:state', {
          id: terminalId,
          state,
          previousState: null
        })
      }
    })

    setMetadataCallback((terminalId: string, metadata: Record<string, string | string[] | Record<string, { prUrl?: string }>>) => {
      updateTerminalMetadataFromHook(terminalId, metadata)
      if (mainWindow) {
        mainWindow.webContents.send('terminal:metadata', {
          id: terminalId,
          metadata
        })
      }
    })

    // Set up callbacks for command start/end (shell hooks)
    setCommandStartCallback((terminalId: string, command: string) => {
      if (mainWindow) {
        mainWindow.webContents.send('terminal:commandStart', {
          id: terminalId,
          command
        })
      }
    })

    setCommandEndCallback((terminalId: string, exitCode: number) => {
      if (mainWindow) {
        mainWindow.webContents.send('terminal:commandEnd', {
          id: terminalId,
          exitCode
        })
      }
    })

    setRepositoriesCallback((terminalId: string, repositories: string[]) => {
      updateTerminalRepositoriesFromHook(terminalId, repositories)
      if (mainWindow) {
        mainWindow.webContents.send('terminal:repositories', {
          id: terminalId,
          repositories
        })
      }
    })

    // Install shell integration hooks
    installShellIntegration()

    console.log(`Magic Slash hooks configured on port ${port}`)

    // Restore terminal sessions after hooks are ready
    restoreAgents()
  } catch (error) {
    console.error('Failed to initialize hooks:', error)
  }
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    cleanupTerminals()
    app.quit()
  }
})

app.on('before-quit', async () => {
  if (isUpdating) return
  cleanupTerminals()
  await stopStatusServer()
})
