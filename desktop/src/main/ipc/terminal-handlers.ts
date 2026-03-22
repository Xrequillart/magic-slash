import { ipcMain, BrowserWindow } from 'electron'
import {
  createTerminal,
  launchClaude,
  writeToTerminal,
  resizeTerminal,
  killTerminal,
  getTerminal,
  getTerminalCwd,
  getTerminalBuffer,
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
} from '../pty/terminal-manager'
import {
  saveAgent,
  removeAgent,
  getAgents,
  updateAgentMetadata,
  updateAgentRepositories,
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

export function restoreAgents() {
  try {
    // Filter out sidebar agents (VS Code extension)
    const agents = getAgents().filter(a => !a.id.startsWith('sidebar-'))

    // Only restore if there are no running terminals yet
    const existingTerminals = getAllTerminals()
    if (existingTerminals.length > 0) {
      // Already have running terminals, no need to restore
      return
    }

    // No agents to restore
    if (agents.length === 0) {
      return
    }

    for (const agent of agents) {
      // Use first repository as cwd for PTY
      const cwd = agent.repositories[0] || ''
      if (!cwd) continue // Skip agents without repositories

      launchClaude(
        agent.id,
        agent.name,
        cwd,
        // onData
        (data) => {
          const mainWindow = getMainWindow()
          if (mainWindow) {
            mainWindow.webContents.send('terminal:data', { id: agent.id, data })
          }
        },
        // onStateChange
        (state, previousState) => {
          const mainWindow = getMainWindow()
          if (mainWindow) {
            mainWindow.webContents.send('terminal:state', { id: agent.id, state, previousState })
          }

          // Use title from metadata if available, fallback to name
          const displayName = agent.metadata?.title || agent.name

          if (state === 'waiting' && previousState !== 'waiting') {
            maybeShowNotification(
              agent.id,
              displayName,
              'Claude Code needs attention',
              `Agent "${displayName}" is waiting for your input`
            )
          }

          if (state === 'completed' && previousState !== 'completed') {
            maybeShowNotification(
              agent.id,
              displayName,
              'Task completed',
              `Agent "${displayName}" has finished`
            )
          }
        },
        // onExit
        (exitCode) => {
          const mainWindow = getMainWindow()
          if (mainWindow) {
            mainWindow.webContents.send('terminal:exit', { id: agent.id, exitCode })
          }
        },
        // onBranchChange
        (branchName) => {
          const mainWindow = getMainWindow()
          if (mainWindow) {
            mainWindow.webContents.send('terminal:branch', { id: agent.id, branchName })
          }
        },
        // onMetadataChange
        (metadata) => {
          const mainWindow = getMainWindow()
          if (mainWindow) {
            mainWindow.webContents.send('terminal:metadata', { id: agent.id, metadata })
          }
        },
        // initialMetadata - restore saved metadata
        agent.metadata as TerminalMetadata | undefined,
        // onRepositoriesChange
        (repositories) => {
          const mainWindow = getMainWindow()
          if (mainWindow) {
            mainWindow.webContents.send('terminal:repositories', { id: agent.id, repositories })
          }
        },
        // initialRepositories - restore saved repositories
        agent.repositories,
        // outputFormat - restore saved format
        agent.outputFormat
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

  // Create a new terminal
  ipcMain.handle('terminal:create', async (_event, { id, name, cwd }) => {
    const terminal = createTerminal(
      id,
      name,
      cwd,
      // onData
      (data) => {
        const mainWindow = getMainWindow()
        if (mainWindow) {
          mainWindow.webContents.send('terminal:data', { id, data })
        }
      },
      // onStateChange
      (state, previousState) => {
        const mainWindow = getMainWindow()
        if (mainWindow) {
          mainWindow.webContents.send('terminal:state', { id, state, previousState })
        }

        // Use title from metadata if available, fallback to name
        const t = getTerminal(id)
        const displayName = t?.metadata?.title || name

        // Show notification when terminal is waiting for input
        if (state === 'waiting' && previousState !== 'waiting') {
          maybeShowNotification(
            id,
            displayName,
            'Claude Code needs attention',
            `Terminal "${displayName}" is waiting for your input`
          )
        }

        // Show notification when task is completed
        if (state === 'completed' && previousState !== 'completed') {
          maybeShowNotification(
            id,
            displayName,
            'Task completed',
            `Terminal "${displayName}" has finished`
          )
        }
      },
      // onExit
      (exitCode) => {
        const mainWindow = getMainWindow()
        if (mainWindow) {
          mainWindow.webContents.send('terminal:exit', { id, exitCode })
        }
      },
      // onBranchChange
      (branchName) => {
        const mainWindow = getMainWindow()
        if (mainWindow) {
          mainWindow.webContents.send('terminal:branch', { id, branchName })
        }
      },
      // onMetadataChange
      (metadata) => {
        const mainWindow = getMainWindow()
        if (mainWindow) {
          mainWindow.webContents.send('terminal:metadata', { id, metadata })
        }
      }
    )

    return {
      id: terminal.id,
      name: terminal.name,
      state: terminal.state,
      repositories: terminal.repositories,
      branchName: terminal.branchName
    }
  })

  // Launch Claude in a new terminal
  ipcMain.handle('terminal:launchClaude', async (_event, { id, name, cwd, outputFormat }) => {
    const terminal = launchClaude(
      id,
      name,
      cwd,
      // onData
      (data) => {
        const mainWindow = getMainWindow()
        if (mainWindow) {
          mainWindow.webContents.send('terminal:data', { id, data })
        }
      },
      // onStateChange
      (state, previousState) => {
        const mainWindow = getMainWindow()
        if (mainWindow) {
          mainWindow.webContents.send('terminal:state', { id, state, previousState })
        }

        // Use title from metadata if available, fallback to name
        const t = getTerminal(id)
        const displayName = t?.metadata?.title || name

        // Show notification when terminal is waiting for input
        if (state === 'waiting' && previousState !== 'waiting') {
          maybeShowNotification(
            id,
            displayName,
            'Claude Code needs attention',
            `Agent "${displayName}" is waiting for your input`
          )
        }

        // Show notification when task is completed
        if (state === 'completed' && previousState !== 'completed') {
          maybeShowNotification(
            id,
            displayName,
            'Task completed',
            `Agent "${displayName}" has finished`
          )
        }
      },
      // onExit
      (exitCode) => {
        const mainWindow = getMainWindow()
        if (mainWindow) {
          mainWindow.webContents.send('terminal:exit', { id, exitCode })
        }
      },
      // onBranchChange
      (branchName) => {
        const mainWindow = getMainWindow()
        if (mainWindow) {
          mainWindow.webContents.send('terminal:branch', { id, branchName })
        }
      },
      // onMetadataChange
      (metadata) => {
        const mainWindow = getMainWindow()
        if (mainWindow) {
          mainWindow.webContents.send('terminal:metadata', { id, metadata })
        }
      },
      // initialMetadata
      undefined,
      // onRepositoriesChange
      (repositories) => {
        const mainWindow = getMainWindow()
        if (mainWindow) {
          mainWindow.webContents.send('terminal:repositories', { id, repositories })
        }
      },
      // initialRepositories
      undefined,
      // outputFormat
      outputFormat
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

  // Write to terminal
  ipcMain.handle('terminal:write', async (_event, { id, data }) => {
    writeToTerminal(id, data)
  })

  // Resize terminal
  ipcMain.handle('terminal:resize', async (_event, { id, cols, rows }) => {
    resizeTerminal(id, cols, rows)
  })

  // Kill terminal
  ipcMain.handle('terminal:kill', async (_event, { id }) => {
    killTerminal(id)
    cleanupOverlay(id)
    // Remove agent from disk
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

  // Get current working directory of a terminal (queries the PTY process)
  ipcMain.handle('terminal:getCwd', async (_event, { id }) => {
    return getTerminalCwd(id)
  })

  // Get saved agents
  ipcMain.handle('terminal:getSessions', async () => {
    return getAgents()
  })

  // Get saved agents (new API)
  ipcMain.handle('terminal:getAgents', async () => {
    return getAgents()
  })

  // Get terminal display buffer (for reconnection after refresh)
  ipcMain.handle('terminal:getBuffer', async (_event, { id }) => {
    return getTerminalBuffer(id)
  })

  // Update terminal metadata
  ipcMain.handle('terminal:updateMetadata', async (_event, { id, metadata }) => {
    updateTerminalMetadataFromHook(id, metadata)
    // Also persist to disk (updateTerminalMetadataFromHook already does this, but let's be explicit)
    updateAgentMetadata(id, metadata)
  })

  // Update terminal repositories
  ipcMain.handle('terminal:updateRepositories', async (_event, { id, repositories }) => {
    updateTerminalRepositoriesFromHook(id, repositories)
    // Persist to disk
    updateAgentRepositories(id, repositories)
    // Notify renderer
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
      // onEvent — stream each JSON line to renderer
      (jsonLine) => {
        mainWindow.webContents.send('overlay:data', { id, data: jsonLine })
      },
      // onDone
      (exitCode) => {
        mainWindow.webContents.send('overlay:done', { id, exitCode })
      }
    )
  })

  // Respond to an active overlay process permission request
  ipcMain.handle('overlay:respond', async (_event, { id, requestId, behavior, message, updatedInput }) => {
    respondToOverlay(id, requestId, behavior, message, updatedInput)
  })

  // Reset overlay session (clears session history for fresh start)
  ipcMain.handle('overlay:resetSession', async (_event, { id }) => {
    resetOverlaySession(id)
  })
}

export function cleanupTerminals() {
  // Cleanup all PTY processes
  // Note: Agents are already saved individually via saveAgent() when created/updated,
  // so we don't need to save them again here
  cleanupAllTerminals()
}
