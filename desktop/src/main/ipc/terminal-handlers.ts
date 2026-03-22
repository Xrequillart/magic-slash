import { ipcMain, BrowserWindow } from 'electron'
import {
  registerAgent,
  killTerminal,
  getTerminal,
  getAllTerminals,
  cleanupAllTerminals,
  updateTerminalMetadataFromHook,
  updateTerminalRepositoriesFromHook,
  sendOverlayMessage,
  respondToOverlay,
  resetOverlaySession,
  cleanupOverlay,
  getClaudeCodeInfo,
  type TerminalMetadata,
  type TerminalState,
} from '../pty/terminal-manager'
import {
  saveAgent,
  removeAgent,
  getAgents,
} from '../config/config'

let getMainWindow: () => BrowserWindow | null
let showNotification: (title: string, body: string) => void

// Track last notification time per terminal to avoid spam
const lastNotificationTime = new Map<string, number>()
const NOTIFICATION_COOLDOWN = 30000 // 30 seconds between notifications per terminal

// Helper to show notification with cooldown and focus check
function maybeShowNotification(
  id: string,
  _name: string,
  title: string,
  body: string
) {
  const mainWindow = getMainWindow()

  // Don't notify if window is focused
  if (mainWindow && mainWindow.isFocused()) {
    return
  }

  // Check cooldown
  const now = Date.now()
  const lastTime = lastNotificationTime.get(id) || 0
  if (now - lastTime < NOTIFICATION_COOLDOWN) {
    return
  }

  // Show notification and update last time
  lastNotificationTime.set(id, now)
  showNotification(title, body)
}

function createAgentCallbacks(id: string, name: string) {
  return {
    onStateChange: (state: TerminalState, previousState: TerminalState) => {
      const mainWindow = getMainWindow()
      if (mainWindow) {
        mainWindow.webContents.send('terminal:state', { id, state, previousState })
      }

      const t = getTerminal(id)
      const displayName = t?.metadata?.title || name

      if (state === 'waiting' && previousState !== 'waiting') {
        maybeShowNotification(id, displayName, 'Claude Code needs attention', `Agent "${displayName}" is waiting for your input`)
      }

      if (state === 'completed' && previousState !== 'completed') {
        maybeShowNotification(id, displayName, 'Task completed', `Agent "${displayName}" has finished`)
      }
    },
    onBranchChange: (branchName: string | null) => {
      const mainWindow = getMainWindow()
      if (mainWindow) {
        mainWindow.webContents.send('terminal:branch', { id, branchName })
      }
    },
    onMetadataChange: (metadata: TerminalMetadata) => {
      const mainWindow = getMainWindow()
      if (mainWindow) {
        mainWindow.webContents.send('terminal:metadata', { id, metadata })
      }
    },
    onRepositoriesChange: (repositories: string[]) => {
      const mainWindow = getMainWindow()
      if (mainWindow) {
        mainWindow.webContents.send('terminal:repositories', { id, repositories })
      }
    },
  }
}

export function restoreAgents() {
  try {
    // Filter out sidebar agents (VS Code extension)
    const agents = getAgents().filter(a => !a.id.startsWith('sidebar-'))

    // Only restore if there are no running terminals yet
    const existingTerminals = getAllTerminals()
    if (existingTerminals.length > 0) {
      return
    }

    if (agents.length === 0) {
      return
    }

    for (const agent of agents) {
      const cwd = agent.repositories[0] || ''
      if (!cwd) continue

      const callbacks = createAgentCallbacks(agent.id, agent.name)
      registerAgent(
        agent.id,
        agent.name,
        agent.repositories,
        callbacks.onStateChange,
        callbacks.onBranchChange,
        callbacks.onMetadataChange,
        callbacks.onRepositoriesChange,
        agent.metadata as TerminalMetadata | undefined,
      )

      // Save restored agent to disk (preserve original tsCreate)
      saveAgent(agent.id, agent.name, agent.repositories, agent.metadata, agent.tsCreate, agent.outputFormat)
    }
  } catch (error) {
    console.error('Error restoring agents:', error)
  }
}


export function setupTerminalHandlers(
  mainWindowGetter: () => BrowserWindow | null,
  notificationCallback: (title: string, body: string) => void
) {
  getMainWindow = mainWindowGetter
  showNotification = notificationCallback

  // Launch Claude agent (register without PTY — overlay SDK handles communication)
  ipcMain.handle('terminal:launchClaude', async (_event, { id, name, cwd, outputFormat }) => {
    const callbacks = createAgentCallbacks(id, name)
    const terminal = registerAgent(
      id,
      name,
      [cwd],
      callbacks.onStateChange,
      callbacks.onBranchChange,
      callbacks.onMetadataChange,
      callbacks.onRepositoriesChange,
    )

    // Save agent to disk immediately
    const tsCreate = Date.now()
    saveAgent(terminal.id, terminal.name, terminal.repositories, terminal.metadata, tsCreate, outputFormat)

    return {
      id: terminal.id,
      name: terminal.name,
      state: terminal.state,
      repositories: terminal.repositories,
      branchName: terminal.branchName,
      metadata: terminal.metadata,
      tsCreate
    }
  })

  // Kill terminal
  ipcMain.handle('terminal:kill', async (_event, { id }) => {
    killTerminal(id)
    cleanupOverlay(id)
    removeAgent(id)
  })

  // Get terminal info
  ipcMain.handle('terminal:get', async (_event, { id }) => {
    const terminal = getTerminal(id)
    if (!terminal) return null

    const savedAgents = getAgents()
    const savedAgent = savedAgents.find(a => a.id === id)

    return {
      id: terminal.id,
      name: terminal.name,
      state: terminal.state,
      repositories: terminal.repositories,
      branchName: terminal.branchName,
      createdAt: terminal.createdAt,
      tsCreate: savedAgent?.tsCreate,
      metadata: terminal.metadata
    }
  })

  // Get all terminals
  ipcMain.handle('terminal:getAll', async () => {
    const savedAgents = getAgents()
    const agentMap = new Map(savedAgents.map(a => [a.id, a]))
    return getAllTerminals().map(t => ({
      id: t.id,
      name: t.name,
      state: t.state,
      repositories: t.repositories,
      branchName: t.branchName,
      createdAt: t.createdAt,
      tsCreate: agentMap.get(t.id)?.tsCreate,
      metadata: t.metadata
    }))
  })

  // Get saved agents
  ipcMain.handle('terminal:getSessions', async () => {
    return getAgents()
  })

  // Get saved agents (new API)
  ipcMain.handle('terminal:getAgents', async () => {
    return getAgents()
  })

  // Update terminal metadata
  ipcMain.handle('terminal:updateMetadata', async (_event, { id, metadata }) => {
    updateTerminalMetadataFromHook(id, metadata)
  })

  // Update terminal repositories
  ipcMain.handle('terminal:updateRepositories', async (_event, { id, repositories }) => {
    updateTerminalRepositoriesFromHook(id, repositories)
    const mainWindow = getMainWindow()
    if (mainWindow) {
      mainWindow.webContents.send('terminal:repositories', { id, repositories })
    }
  })

  // Send a message via overlay mode (non-PTY, stream-json)
  ipcMain.handle('overlay:getClaudeInfo', async () => {
    return getClaudeCodeInfo()
  })

  ipcMain.handle('overlay:sendMessage', async (_event, { id, message, cwd }) => {
    const mainWindow = getMainWindow()
    if (!mainWindow) return

    sendOverlayMessage(
      id,
      message,
      cwd,
      (jsonLine) => {
        mainWindow.webContents.send('overlay:data', { id, data: jsonLine })
      },
      (exitCode) => {
        mainWindow.webContents.send('overlay:done', { id, exitCode })
      }
    )
  })

  // Respond to an active overlay process permission request
  ipcMain.handle('overlay:respond', async (_event, { id, requestId, behavior, message, updatedInput }) => {
    respondToOverlay(id, requestId, behavior, message, updatedInput)
  })

  // Reset overlay session
  ipcMain.handle('overlay:resetSession', async (_event, { id }) => {
    resetOverlaySession(id)
  })
}

export function cleanupTerminals() {
  cleanupAllTerminals()
}
