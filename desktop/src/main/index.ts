import { app, BrowserWindow, Notification, ipcMain, dialog, Menu, shell, globalShortcut } from 'electron'
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
import { readConfig, writeConfig } from './config/config'
import { TrayManager } from './tray/tray-manager'
import { AgentStateAggregator } from './tray/agent-state-aggregator'
import { destroyPopover } from './windows/popover-window'
import { showQuickLaunch, hideQuickLaunch, isQuickLaunchVisible, resizeQuickLaunch, destroyQuickLaunch } from './windows/quick-launch-window'

let mainWindow: BrowserWindow | null = null
let isQuitting = false
let forceQuit = false
let trayManager: TrayManager | null = null
let aggregator: AgentStateAggregator | null = null

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

  // Close-to-tray: hide window instead of closing when tray is active
  mainWindow.on('close', (event) => {
    if (!isQuitting && trayManager) {
      event.preventDefault()
      mainWindow?.hide()
    }
  })

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
  setupConfigHandlers(() => mainWindow)
  setupSkillsHandlers()
  setupScriptHandlers(() => mainWindow)
  setupTerminalHandlers(
    () => mainWindow,
    // Notification callback - only show when window is not focused
    (title: string, body: string) => {
      if (Notification.isSupported() && mainWindow && !mainWindow.isFocused()) {
        const notification = new Notification({ title, body })
        notification.on('click', () => {
          if (mainWindow) {
            mainWindow.show()
            mainWindow.focus()
          }
        })
        notification.show()
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

  // Tray IPC handlers
  setupTrayHandlers()

  // Quick Launch IPC handlers
  setupQuickLaunchHandlers()

  // Auto-start IPC handler
  ipcMain.handle('config:setAutoStart', async (_event, { enabled }: { enabled: boolean }) => {
    app.setLoginItemSettings({
      openAtLogin: enabled,
      openAsHidden: true,
    })
    const config = readConfig()
    config.autoStartAtLogin = enabled
    writeConfig(config)
    return config
  })

  ipcMain.handle('config:getAutoStart', async () => {
    const settings = app.getLoginItemSettings()
    return settings.openAtLogin
  })
}

/** Show and focus the main window, then run an optional callback. */
function focusMainWindow(callback?: (win: BrowserWindow) => void): void {
  if (!mainWindow) return
  mainWindow.show()
  mainWindow.focus()
  callback?.(mainWindow)
}

function setupTrayHandlers() {
  ipcMain.handle('tray:getAgents', async () => {
    if (!aggregator) return []
    return aggregator.getAgentSummaries().map(a => ({
      id: a.id,
      name: a.name,
      state: a.state,
      ticketId: a.ticketId,
      title: a.title,
      createdAt: a.createdAt.getTime(),
    }))
  })

  ipcMain.handle('tray:focusAgent', async (_event, id: string) => {
    focusMainWindow(win => win.webContents.send('tray:focusAgent', { id }))
  })

  ipcMain.handle('tray:openSettings', async () => {
    focusMainWindow(win => win.webContents.send('tray:openSettings'))
  })

  ipcMain.handle('tray:quit', async () => {
    forceQuit = true
    app.quit()
  })
}

function setupQuickLaunchHandlers() {
  ipcMain.handle('quicklaunch:dispatch', async (_event, { ticketId, action }: { ticketId: string; action: string }) => {
    hideQuickLaunch()
    focusMainWindow(win => win.webContents.send('quicklaunch:dispatch', { ticketId, action }))
  })

  ipcMain.handle('quicklaunch:close', async () => {
    hideQuickLaunch()
  })

  ipcMain.handle('quicklaunch:resize', async (_event, { height }: { height: number }) => {
    resizeQuickLaunch(height)
  })
}

app.whenReady().then(async () => {
  // Migrate config to ensure all repositories have complete fields
  migrateConfig(app.getVersion())

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

  // Initialize tray icon and agent state aggregator
  aggregator = new AgentStateAggregator()
  trayManager = new TrayManager(aggregator, () => mainWindow, () => {
    forceQuit = true
    app.quit()
  })
  trayManager.init()
  aggregator.startPolling()

  // Apply auto-start setting from config
  const config = readConfig()
  if (config.autoStartAtLogin !== undefined) {
    app.setLoginItemSettings({
      openAtLogin: config.autoStartAtLogin,
      openAsHidden: true,
    })
  }

  // Register global shortcut: Ctrl+Space for Quick Launch
  const registered = globalShortcut.register('Control+Space', () => {
    if (isQuickLaunchVisible()) {
      hideQuickLaunch()
    } else {
      showQuickLaunch()
    }
  })
  console.log(`[QuickLaunch] Global shortcut registered: ${registered}`)

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
    if (mainWindow) {
      mainWindow.show()
      mainWindow.focus()
    } else {
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
      // Update tray icon state
      if (aggregator) {
        aggregator.update()
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
      // Update tray (metadata changes may affect display)
      if (aggregator) {
        aggregator.update()
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

    // Trigger initial tray state update after agents are restored
    setTimeout(() => {
      if (aggregator) aggregator.update()
    }, 1000)
  } catch (error) {
    console.error('Failed to initialize hooks:', error)
  }
}

app.on('window-all-closed', () => {
  // On macOS with tray, don't quit when all windows are closed
  if (process.platform !== 'darwin' && !trayManager) {
    cleanupTerminals()
    app.quit()
  }
})

app.on('before-quit', async (event) => {
  // If tray is active and this isn't a force quit (from tray "Quit" button),
  // just hide the window and stay in the menu bar
  if (trayManager && !forceQuit && !isUpdating) {
    event.preventDefault()
    mainWindow?.hide()
    return
  }

  isQuitting = true
  if (isUpdating) return

  // Cleanup global shortcuts
  globalShortcut.unregisterAll()

  // Destroy auxiliary windows
  destroyPopover()
  destroyQuickLaunch()

  // Stop aggregator polling
  if (aggregator) {
    aggregator.stopPolling()
    aggregator = null
  }

  // Destroy tray
  if (trayManager) {
    trayManager.destroy()
    trayManager = null
  }

  cleanupTerminals()
  await stopStatusServer()
})
