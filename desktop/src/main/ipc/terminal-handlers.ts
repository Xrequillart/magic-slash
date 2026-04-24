import os from 'os'
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
  type TerminalMetadata,
} from '../pty/terminal-manager'
import {
  saveAgent,
  removeAgent,
  readAgents,
  updateAgentSplitPane,
} from '../config/agents'
import { addHistoryEntry } from '../config/activity-history'
import type { HistoryAction } from '../../types'

let getMainWindow: () => BrowserWindow | null
let showNotification: (title: string, body: string) => void
let onAgentChange: (() => void) | null = null

// Track last notification time per terminal to avoid spam
const lastNotificationTime = new Map<string, number>()
// Track previous metadata status per terminal for history entries
const previousStatus = new Map<string, string>()
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

/**
 * Creates the base IPC-forwarding callbacks for a terminal.
 * Used by both terminal-handlers and the scheduler to avoid duplication.
 */
export function createBaseCallbacks(id: string, windowGetter: () => BrowserWindow | null) {
  return {
    onData: (data: string) => {
      const win = windowGetter()
      if (win) win.webContents.send('terminal:data', { id, data })
    },
    onStateChange: (state: string, previousState: string) => {
      const win = windowGetter()
      if (win) win.webContents.send('terminal:state', { id, state, previousState })
    },
    onExit: (exitCode: number) => {
      const win = windowGetter()
      if (win) win.webContents.send('terminal:exit', { id, exitCode })
    },
    onBranchChange: (branchName: string | null) => {
      const win = windowGetter()
      if (win) win.webContents.send('terminal:branch', { id, branchName })
    },
    onMetadataChange: (metadata: TerminalMetadata) => {
      const win = windowGetter()
      if (win) win.webContents.send('terminal:metadata', { id, metadata })
    },
    onRepositoriesChange: (repositories: string[]) => {
      const win = windowGetter()
      if (win) win.webContents.send('terminal:repositories', { id, repositories })
    },
  }
}

function createTerminalCallbacks(id: string, name: string) {
  const base = createBaseCallbacks(id, getMainWindow)
  return {
    onData: base.onData,
    onStateChange: (state: string, previousState: string) => {
      base.onStateChange(state, previousState)

      const t = getTerminal(id)
      const displayName = t?.metadata?.title || name

      if (state === 'waiting' && previousState !== 'waiting') {
        maybeShowNotification(
          id,
          displayName,
          'Claude Code needs attention',
          `Agent "${displayName}" is waiting for your input`
        )
      }

      if (state === 'completed' && previousState !== 'completed') {
        maybeShowNotification(
          id,
          displayName,
          'Task completed',
          `Agent "${displayName}" has finished`
        )
      }
    },
    onExit: (exitCode: number) => {
      base.onExit(exitCode)
      previousStatus.delete(id)
    },
    onBranchChange: base.onBranchChange,
    onMetadataChange: (metadata: TerminalMetadata) => {
      base.onMetadataChange(metadata)

      // Track status changes and create history entries
      const newStatus = metadata.status || ''
      const oldStatus = previousStatus.get(id) || ''
      if (newStatus && newStatus !== oldStatus) {
        const statusToAction: Record<string, HistoryAction> = {
          'in progress': 'started',
          'committed': 'committed',
          'PR created': 'pr_created',
          'in review': 'review',
          'PR merged': 'merged',
        }
        const action = statusToAction[newStatus]
        if (action) {
          const t = getTerminal(id)
          addHistoryEntry({
            agentId: id,
            agentName: t?.metadata?.title || t?.name || name,
            action,
            ticketId: t?.metadata?.ticketId,
            description: t?.metadata?.description,
            repositories: t?.repositories || [],
          })
        }
        previousStatus.set(id, newStatus)
      }
    },
    onRepositoriesChange: base.onRepositoriesChange,
  }
}

export function restoreAgents() {
  try {
    // Filter out sidebar agents (VS Code extension) and idle scheduled agents
    const agents = readAgents().filter(a => !a.id.startsWith('sidebar-') && !a.schedule?.enabled)

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
      const cwd = agent.repositories[0] || os.homedir()

      const callbacks = createTerminalCallbacks(agent.id, agent.name)
      launchClaude(
        agent.id,
        agent.name,
        cwd,
        callbacks.onData,
        callbacks.onStateChange,
        callbacks.onExit,
        callbacks.onBranchChange,
        callbacks.onMetadataChange,
        agent.metadata as TerminalMetadata | undefined,
        callbacks.onRepositoriesChange,
        agent.repositories
      )

      // Save restored agent to disk (preserve original tsCreate)
      saveAgent(agent.id, agent.name, agent.repositories, agent.metadata, agent.tsCreate)
    }
  } catch (error) {
    console.error('Error restoring agents:', error)
  }
}


export function setupTerminalHandlers(
  mainWindowGetter: () => BrowserWindow | null,
  notificationCallback: (title: string, body: string) => void,
  agentChangeCallback?: () => void,
) {
  getMainWindow = mainWindowGetter
  showNotification = notificationCallback
  onAgentChange = agentChangeCallback || null

  // Create a new terminal
  ipcMain.handle('terminal:create', async (_event, { id, name, cwd }) => {
    if (typeof id !== 'string' || typeof name !== 'string') {
      throw new Error('terminal:create requires id (string) and name (string)')
    }
    const callbacks = createTerminalCallbacks(id, name)
    const terminal = createTerminal(
      id,
      name,
      cwd,
      callbacks.onData,
      callbacks.onStateChange,
      callbacks.onExit,
      callbacks.onBranchChange,
      callbacks.onMetadataChange
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
  ipcMain.handle('terminal:launchClaude', async (_event, { id, name, cwd, initialPrompt }) => {
    if (typeof id !== 'string' || typeof name !== 'string') {
      throw new Error('terminal:launchClaude requires id (string) and name (string)')
    }
    const callbacks = createTerminalCallbacks(id, name)
    const terminal = launchClaude(
      id,
      name,
      cwd,
      callbacks.onData,
      callbacks.onStateChange,
      callbacks.onExit,
      callbacks.onBranchChange,
      callbacks.onMetadataChange,
      undefined,
      callbacks.onRepositoriesChange,
      undefined,
      typeof initialPrompt === 'string' ? initialPrompt : undefined
    )

    // Save agent to disk immediately
    const tsCreate = Date.now()
    saveAgent(terminal.id, terminal.name, terminal.repositories, terminal.metadata, tsCreate)

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
    if (typeof id !== 'string' || typeof data !== 'string') return
    writeToTerminal(id, data)
  })

  // Resize terminal
  ipcMain.handle('terminal:resize', async (_event, { id, cols, rows }) => {
    if (typeof id !== 'string' || typeof cols !== 'number' || typeof rows !== 'number') return
    if (cols <= 0 || rows <= 0) return
    resizeTerminal(id, cols, rows)
  })

  // Kill terminal
  ipcMain.handle('terminal:kill', async (_event, { id }) => {
    if (typeof id !== 'string') return
    killTerminal(id)
    // Remove agent from disk
    removeAgent(id)
  })

  // Get terminal info
  ipcMain.handle('terminal:get', async (_event, { id }) => {
    const terminal = getTerminal(id)
    if (!terminal) return null

    const savedAgents = readAgents()
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
    const savedAgents = readAgents()
    const agentMap = new Map(savedAgents.map(a => [a.id, a]))
    return getAllTerminals().map(t => ({
      id: t.id,
      name: t.name,
      state: t.state,
      repositories: t.repositories,
      branchName: t.branchName,
      createdAt: t.createdAt,
      tsCreate: agentMap.get(t.id)?.tsCreate,
      metadata: t.metadata,
      splitPane: agentMap.get(t.id)?.splitPane,
    }))
  })

  // Get current working directory of a terminal (queries the PTY process)
  ipcMain.handle('terminal:getCwd', async (_event, { id }) => {
    if (typeof id !== 'string') return null
    return getTerminalCwd(id)
  })

  const handleGetAgents = async () => {
    const agents = readAgents()
    const runningIds = new Set(getAllTerminals().map(t => t.id))
    // Exclude scheduled agents unless they have an active terminal
    return agents.filter(a => !a.schedule?.enabled || runningIds.has(a.id))
  }
  ipcMain.handle('terminal:getSessions', handleGetAgents) // legacy alias
  ipcMain.handle('terminal:getAgents', handleGetAgents)

  // Update agent split pane assignment
  ipcMain.handle('terminal:updateSplitPane', async (_event, { id, pane }) => {
    return updateAgentSplitPane(id, pane)
  })

  // Get terminal display buffer (for reconnection after refresh)
  ipcMain.handle('terminal:getBuffer', async (_event, { id }) => {
    if (typeof id !== 'string') return null
    return getTerminalBuffer(id)
  })

  // Update terminal metadata
  ipcMain.handle('terminal:updateMetadata', async (_event, { id, metadata }) => {
    if (typeof id !== 'string' || typeof metadata !== 'object' || metadata === null) return
    updateTerminalMetadataFromHook(id, metadata)
    onAgentChange?.()
  })

  // Update terminal repositories
  ipcMain.handle('terminal:updateRepositories', async (_event, { id, repositories }) => {
    if (typeof id !== 'string' || !Array.isArray(repositories)) return
    updateTerminalRepositoriesFromHook(id, repositories)
    onAgentChange?.()
    // Notify renderer
    const mainWindow = getMainWindow()
    if (mainWindow) {
      mainWindow.webContents.send('terminal:repositories', { id, repositories })
    }
  })
}

export function cleanupTerminals() {
  // Cleanup all PTY processes
  // Note: Agents are already saved individually via saveAgent() when created/updated,
  // so we don't need to save them again here
  cleanupAllTerminals()
}
