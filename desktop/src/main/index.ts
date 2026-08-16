import { app, BrowserWindow, Notification, ipcMain, dialog, Menu, shell, globalShortcut, powerMonitor } from 'electron'
import { join } from 'path'
import { setupConfigHandlers } from './ipc/config-handlers'
import { setupRepoHandlers } from './ipc/repo-handlers'
import { setupTerminalHandlers, cleanupTerminals } from './ipc/terminal-handlers'
import { startStatusServer, stopStatusServer, setStateCallback, setMetadataCallback, setCommandStartCallback, setCommandEndCallback, setRepositoriesCallback, setUsageCallback, setSkillCallback, setQuestionCallback, setClearQuestionCallback, setConfigProvider, setAgentProvider, setWorktreeFilesWriter, setPRUrlCallback } from './hooks/status-server'
import { ingestQuestionPayload, getPendingQuestion, clearPendingQuestion } from './questions/pending-questions'
import { answerPendingQuestion } from './questions/answer-question'
import { recordSkillInvocation } from './usage/skill-invocations'
import { installShellIntegration } from './hooks/shell-integration'
import { configureClaudeHooks, configureStatusLine } from './hooks/claude-hooks-config'
import { setStatusServerPort, setInnerStatusLine, updateTerminalStateFromHook, updateTerminalMetadataFromHook, updateTerminalUsageFromHook, updateTerminalRepositoriesFromHook, writeToTerminal, getTerminalBuffer } from './pty/terminal-manager'
import type { TerminalUsage, TrayAnswerChoice, TrayAnswerResult, TrayState, TrayUpdate } from '../types'
import { setupAutoUpdater, setUpdaterMainWindow, checkForUpdatesOnStartup, isUpdating, getUpdateStatus } from './updater'
import { updateSkills } from './skills-updater'
import { setupSkillsHandlers } from './ipc/skills-handlers'
import { setupScriptHandlers } from './ipc/script-handlers'
import { setupSetupHandlers } from './ipc/setup-handlers'
import { setupConnectivityHandlers } from './ipc/connectivity-handlers'
import { setupAppearanceHandlers } from './ipc/appearance-handlers'
import { setStore } from './store/Store'
import { CloudStore } from './store/CloudStore'
import { readConfig, writeConfig, updateRepositoryWorktreeFilesSettings } from './config/config'
import { expandPath } from './config/validation'
import { resolveRepoIds } from '../repoMatch'
import { readAgents } from './config/agents'
import { TrayManager } from './tray/tray-manager'
import { AgentStateAggregator } from './tray/agent-state-aggregator'
import { destroyPopover, hidePopover, resizePopover } from './windows/popover-window'
import { hideQuickLaunch, resizeQuickLaunch, destroyQuickLaunch } from './windows/quick-launch-window'
import { reRegisterSpotlightShortcut } from './spotlight-shortcut'
import { initAppearance, appearanceArguments, applyZoom, onLanguageChanged, setZoomWindow, stepZoom } from './appearance'
import { t } from './i18n'
import { setupProfileHandlers } from './ipc/profile-handlers'
import { setupUsageHandlers } from './ipc/usage-handlers'
import { setupAuthHandlers } from './ipc/auth-handlers'
import { setupOrgHandlers } from './ipc/org-handlers'
import { stopOrgAgentsRealtime } from './cloud/realtime'
import { PRReviewWatcher } from './pr-review-watcher/watcher'
import { setupPRReviewHandlers } from './ipc/pr-review-handlers'
import { setupReengagementNotifications } from './notifications/reengagement'
import { DailyDigestScheduler } from './notifications/daily-digest'

let mainWindow: BrowserWindow | null = null
let isQuitting = false
let forceQuit = false
let trayManager: TrayManager | null = null
let aggregator: AgentStateAggregator | null = null
let prReviewWatcher: PRReviewWatcher | null = null
let dailyDigest: DailyDigestScheduler | null = null

// Electron derives userData from the app name, which both builds resolve to
// `magic-slash-desktop` (desktop/package.json's `name`; `build.productName` only names
// the .app bundle). So they share userData AND the instance lock it holds: without
// moving the dev build first, the lock below would turn `npm run desktop` into a no-op
// whenever the installed app is running. Must happen before the app is ready.
if (process.env.VITE_DEV_SERVER_URL) {
  app.setPath('userData', `${app.getPath('userData')}-dev`)
}

/**
 * One instance per build.
 *
 * Two of them hydrate the same session and restore the same agent roster, then write
 * it to the same rows — that is how agents ended up duplicated (issue #179). Claimed
 * here, at module scope, so the loser quits before whenReady() builds a store or opens
 * the status server. The dev build has its own userData (above) and so its own lock:
 * this never stops a developer from running dev alongside the installed app.
 */
const hasInstanceLock = app.requestSingleInstanceLock()
if (!hasInstanceLock) {
  app.quit()
} else {
  // A second launch means the user wants the window, not another process.
  app.on('second-instance', revealMainWindow)
}

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
              { role: 'hide' as const, accelerator: '' },
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
      label: t('menu.file'),
      submenu: [isMac ? { role: 'close' as const, accelerator: '' } : { role: 'quit' as const }],
    },
    // Edit menu
    {
      label: t('menu.edit'),
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
      label: t('menu.view'),
      submenu: [
        { role: 'reload' as const },
        { role: 'forceReload' as const },
        // Include toggleDevTools only in dev mode
        ...(process.env.VITE_DEV_SERVER_URL ? [{ role: 'toggleDevTools' as const }] : []),
        { type: 'separator' as const },
        // Not the built-in zoom roles: those change the factor behind the app's
        // back, so nothing would be saved and Settings would show a stale value.
        { label: t('menu.actualSize'), accelerator: 'CmdOrCtrl+0', click: () => applyZoom(1) },
        { label: t('menu.zoomIn'), accelerator: 'CmdOrCtrl+Plus', click: () => stepZoom(1) },
        { label: t('menu.zoomOut'), accelerator: 'CmdOrCtrl+-', click: () => stepZoom(-1) },
        { type: 'separator' as const },
        { role: 'togglefullscreen' as const },
      ],
    },
    // Window menu
    {
      label: t('menu.window'),
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
    show: false,
    titleBarStyle: 'hidden',
    trafficLightPosition: { x: 16, y: 12 },
    transparent: true,
    vibrancy: 'fullscreen-ui',
    visualEffectState: 'active',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      // Hands the preload the current theme, so the renderer paints in it from
      // its very first frame instead of flashing the default and correcting.
      additionalArguments: appearanceArguments(),
      nodeIntegration: false,
      contextIsolation: true,
      backgroundThrottling: false,
      // sandbox: false is required because the preload script needs access to
      // Node.js APIs (child_process, fs, path) for node-pty terminal management.
      // Security mitigations: contextIsolation=true prevents renderer from accessing
      // Node globals, nodeIntegration=false blocks require() in renderer, and all
      // IPC is mediated through contextBridge in preload/index.ts.
      sandbox: false,
    },
  })

  // The interface scale applies to this window only — the popover and quick
  // launch are sized for their content.
  setZoomWindow(mainWindow)

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
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
  setupConfigHandlers()
  // Cloning an org repo into place — the other half of "bind a local folder",
  // for the invitee who does not have one yet.
  setupRepoHandlers()
  setupAppearanceHandlers()
  setupSkillsHandlers()
  setupScriptHandlers(() => mainWindow)
  // Machine setup (prerequisites, MCP servers, integrations) — what the install
  // script used to do. The automatic half runs from the connectivity gate, which is
  // where the hydrated config is available; these handlers serve the UI.
  setupSetupHandlers(() => mainWindow)
  setupProfileHandlers()
  setupUsageHandlers()
  // Cloud is MANDATORY: auth + organization + connectivity gate. The renderer
  // blocks the whole app behind these until the backend reports 'ok'.
  setupAuthHandlers(() => mainWindow)
  setupOrgHandlers()
  setupConnectivityHandlers(() => mainWindow)
  // Notification callback - only show when window is not focused.
  //
  // Also the master switch: every producer in the app (agent states, PR review
  // watcher, re-engagement, daily digest) funnels through here, so one check
  // silences all of them — including the kinds that have no switch of their own.
  // The config is re-read per notification rather than captured, so the switch
  // takes effect immediately and survives a remote settings change.
  const notificationCallback = (title: string, body: string) => {
    if (readConfig().notifications?.enabled === false) return
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

  setupTerminalHandlers(
    () => mainWindow,
    notificationCallback,
    // Agent change callback - update tray state
    () => { if (aggregator) aggregator.update() },
  )

  // Initialize PR review watcher and its IPC handlers
  prReviewWatcher = new PRReviewWatcher(
    () => mainWindow,
    notificationCallback,
  )
  setupPRReviewHandlers(prReviewWatcher)

  // Re-engagement notifications: subscribe to the org-agents realtime stream and
  // notify when a colleague picks up a shared ticket or one of the user's PRs
  // goes to changes-requested. Fires through the same focus-guarded callback.
  setupReengagementNotifications(notificationCallback)

  // Optional daily team digest (opt-in — Config.dailyDigest.enabled). Started
  // unconditionally; it re-reads the flag at fire time and no-ops when disabled.
  dailyDigest = new DailyDigestScheduler(notificationCallback)

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
      title: t('dialog.selectRepository')
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

/**
 * Bring the app back to the front, rebuilding the window if it is gone.
 *
 * The two ways a user asks for that — clicking the dock icon ('activate') and
 * relaunching an app that already holds the instance lock ('second-instance') —
 * want exactly the same thing, so they share this rather than each keeping their
 * own copy of "show it, or create it and re-point the updater at it".
 */
function revealMainWindow(): void {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore()
    focusMainWindow()
    return
  }
  createWindow()
  // Terminal sessions are restored by the connectivity gate once the backend is
  // reachable + hydrated (see connectivity-handlers.ts), not here.
  if (mainWindow) setUpdaterMainWindow(mainWindow)
}

/** Show and focus the main window, then run an optional callback. */
function focusMainWindow(callback?: (win: BrowserWindow) => void): void {
  if (!mainWindow) return
  mainWindow.show()
  mainWindow.focus()
  callback?.(mainWindow)
}

/** Collapse the updater's six states onto the three the panel's header can show. */
function trayUpdate(): TrayUpdate {
  const status = getUpdateStatus()
  switch (status.type) {
    case 'checking': return { phase: 'checking' }
    // "available" means the download just started — same thing to the user.
    case 'available': return { phase: 'downloading', percent: 0 }
    case 'downloading': return { phase: 'downloading', percent: Math.round(status.progress) }
    case 'downloaded': return { phase: 'ready', version: status.version }
    case 'error': return { phase: 'error' }
    default: return { phase: 'idle' }
  }
}

function setupTrayHandlers() {
  // One call for everything the menu bar panel paints, because it polls: agents,
  // the version in its header, and the update state that turns that version into
  // a "restart to update" button. Auth is deliberately NOT in here — getStatus()
  // can refresh a token over the network, which has no business on a 2s poll; the
  // panel asks `auth:status` once when it opens.
  ipcMain.handle('tray:getState', async (): Promise<TrayState> => ({
    version: app.getVersion(),
    update: trayUpdate(),
    agents: (aggregator?.getAgentSummaries() ?? []).map(a => ({
      id: a.id,
      name: a.name,
      state: a.state,
      ticketId: a.ticketId,
      title: a.title,
      createdAt: a.createdAt.getTime(),
      // This .map() drops anything not listed, so a new field has to be added here
      // as well as to AgentSummary or the panel simply never sees it.
      pendingQuestion: a.pendingQuestion,
    })),
  }))

  /**
   * Answer a pending question from the panel, without activating the app.
   *
   * The token is the whole safety mechanism. Answer in the main window (or let the
   * agent move on) and the store is cleared, so a click on a card the panel has not
   * refreshed yet finds no match and writes NOTHING to the PTY — the alternative
   * being keystrokes landing in whatever the agent is doing now.
   *
   * `keysFor` returning null is the second gate: an unsupported question or an index
   * we cannot place is not approximated.
   *
   * The decision itself lives in `answerPendingQuestion` so it can be unit-tested;
   * this handler only supplies the store and the PTY.
   */
  ipcMain.handle('tray:answerQuestion', async (
    _event,
    payload: { id: string; token: string; choice: TrayAnswerChoice },
  ): Promise<TrayAnswerResult> => {
    // Guard the envelope BEFORE destructuring it. `answerPendingQuestion` validates
    // the three fields, but it never gets the chance if unpacking a null payload has
    // already thrown — and a TypeError crossing back over IPC rejects the renderer's
    // invoke() instead of giving it the documented `{ ok: false }`.
    if (typeof payload !== 'object' || payload === null) return { ok: false }
    const { id, token, choice } = payload

    // Awaited: the answer is typed one keypress at a time, spaced, because the TUI
    // drops all but one event out of a single burst — see answer-keys.ts.
    const result = await answerPendingQuestion(id, token, choice, {
      getQuestion: getPendingQuestion,
      write: writeToTerminal,
      clear: clearPendingQuestion,
    })
    // Refresh the tray immediately: the agent's state is hook-driven and will not
    // leave `waiting` on its own just because we typed.
    if (result.ok) aggregator?.update()
    return result
  })

  ipcMain.handle('tray:resize', async (_event, { height }: { height: number }) => {
    resizePopover(height)
  })

  // Anything that brings the main window forward closes the panel first —
  // otherwise it lingers over the app until the blur lands.
  ipcMain.handle('tray:showWindow', async () => {
    hidePopover()
    focusMainWindow()
  })

  ipcMain.handle('tray:focusAgent', async (_event, id: string) => {
    hidePopover()
    focusMainWindow(win => win.webContents.send('tray:focusAgent', { id }))
  })

  ipcMain.handle('tray:openSettings', async () => {
    hidePopover()
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
  // app.quit() above only schedules the exit; nothing here may run in the loser.
  if (!hasInstanceLock) return

  // Wire the single source of truth (Supabase). Config, agents and history are
  // hydrated from the DB after auth + connectivity are established (via the
  // connectivity gate). Nothing is persisted locally.
  setStore(new CloudStore())

  // Before any window: the stored theme drives the traffic lights and the macOS
  // vibrancy material, which are decided at creation time.
  initAppearance()

  // Create custom menu (removes Cmd+W close window behavior)
  createMenu()

  // The native chrome is built from strings, so it has to be rebuilt when the
  // language changes — whether from Settings or from cloud hydration. The tray is
  // not in here: its panel is a renderer window and re-translates itself.
  onLanguageChanged(() => {
    createMenu()
  })

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
  // The panel it opens reaches the main window and quits the app through the
  // `tray:*` handlers above, so the manager itself needs neither.
  trayManager = new TrayManager(aggregator)
  trayManager.init()
  aggregator.startPolling()

  // Apply auto-start setting from config (only if it differs to avoid macOS notification spam)
  const config = readConfig()
  if (config.autoStartAtLogin !== undefined) {
    const current = app.getLoginItemSettings()
    if (current.openAtLogin !== config.autoStartAtLogin) {
      app.setLoginItemSettings({
        openAtLogin: config.autoStartAtLogin,
        openAsHidden: true,
      })
    }
  }

  // Register global shortcut for Quick Launch (from config)
  reRegisterSpotlightShortcut()

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

  app.on('activate', revealMainWindow)
})

// Deferred initialization - runs after window is shown
async function initializeHooksAndSessions() {
  try {
    const port = await startStatusServer()
    setStatusServerPort(port)

    // Configure Claude Code hooks (deferred file I/O)
    configureClaudeHooks()

    // Configure the statusLine capture wrapper, preserving any user statusLine
    setInnerStatusLine(configureStatusLine())

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

    // Usage stats from the statusLine wrapper — in-memory update + single metadata IPC.
    // Not persisted to disk (see updateTerminalUsageFromHook) since statusLine is high-frequency.
    setUsageCallback((terminalId: string, usage: TerminalUsage) => {
      updateTerminalUsageFromHook(terminalId, usage)
      if (mainWindow) {
        mainWindow.webContents.send('terminal:metadata', {
          id: terminalId,
          metadata: { usage }
        })
      }
    })

    // A question an agent is blocked on, from the capture hooks. The payload is
    // forwarded raw and parsed by the store; the buffer is handed over as a callback
    // so it is only read for the payloads that actually build a preview from it.
    setQuestionCallback((terminalId: string, body: string) => {
      const question = ingestQuestionPayload(terminalId, body, () => getTerminalBuffer(terminalId))
      // Only nudge the tray when something was actually stored: the fingerprint
      // now carries the question token, so this is what makes the panel repaint.
      if (question && aggregator) {
        aggregator.update()
      }
    })

    setClearQuestionCallback((terminalId: string) => {
      clearPendingQuestion(terminalId)
      if (aggregator) {
        aggregator.update()
      }
    })

    // Skill invocations from the PreToolUse hook. Telemetry only — nothing in the
    // UI reacts to it, so there is no IPC broadcast here. terminalId is undefined
    // for runs outside the app, which are logged without an agent.
    setSkillCallback((terminalId: string | undefined, skill: string) => {
      void recordSkillInvocation({ agentId: terminalId, skill })
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

    // Read-back providers: let terminal-run skills read the live config/agent metadata
    // (served from the in-memory caches hydrated from the cloud store) and persist the
    // one config mutation they perform (worktreeFiles).
    setConfigProvider(() => readConfig())
    setAgentProvider((terminalId: string) => readAgents().find((a) => a.id === terminalId) ?? null)
    setWorktreeFilesWriter((files: string[], path: string | null, repo: string | null) => {
      // Resolve to the repo's KEY in the config record, which is not always its
      // name: two orgs can share a name, and the second one's key is suffixed.
      const repositories = readConfig().repositories ?? {}
      const [repoId] = path ? resolveRepoIds([path], repositories, expandPath) : []
      const key = repoId
        ? Object.keys(repositories).find((k) => repositories[k].id === repoId)
        : Object.keys(repositories).find((k) => k === repo || repositories[k].name === repo)

      if (!key) {
        console.warn(`[worktree-files] no configured repository matches path=${path} repo=${repo}`)
        return
      }
      updateRepositoryWorktreeFilesSettings(key, { worktreeFiles: files })
    })

    // Install shell integration hooks
    installShellIntegration()

    console.log(`Magic Slash hooks configured on port ${port}`)

    // NOTE: terminal sessions are NOT restored here. Under the hydrate-first
    // model the agents cache is empty until the backend is reachable + hydrated,
    // so restoration runs once behind the connectivity gate (connectivity-handlers.ts).

    // Start PR review watcher (default ON unless explicitly disabled)
    if (prReviewWatcher) {
      const cfg = readConfig()
      if (cfg.prReviews?.enabled !== false) {
        prReviewWatcher.start()
      }

      // On wake/unlock, kick an immediate tick (suspend is a no-op: the interval pauses naturally).
      powerMonitor.on('resume', () => prReviewWatcher?.onResume())
      powerMonitor.on('unlock-screen', () => prReviewWatcher?.onResume())

      // Coming back to the window is the moment a stale card is most visible.
      // Throttled inside the watcher (15 s) so alt-tabbing is not a poll storm.
      app.on('browser-window-focus', () => prReviewWatcher?.onFocus())

      // `/magic:pr` announcing a new PR URL through the `/metadata` hook: read
      // that one PR straight away instead of leaving the card empty until the
      // next scheduled tick.
      setPRUrlCallback((_terminalId, _repoPath, prUrl) => prReviewWatcher?.onPRUrlAnnounced(prUrl))
    }

    // Start the daily digest scheduler and re-arm it on wake/unlock (a slept
    // machine's setTimeout may be stale or overdue).
    if (dailyDigest) {
      dailyDigest.start()
      powerMonitor.on('resume', () => dailyDigest?.onResume())
      powerMonitor.on('unlock-screen', () => dailyDigest?.onResume())
    }

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

  // Stop PR review watcher
  if (prReviewWatcher) {
    prReviewWatcher.stop()
    prReviewWatcher = null
  }

  // Stop the daily digest scheduler
  if (dailyDigest) {
    dailyDigest.stop()
    dailyDigest = null
  }

  // Tear down the org-agents realtime channel
  void stopOrgAgentsRealtime()

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
