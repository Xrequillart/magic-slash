import { useCallback } from 'react'
import { useStore } from '../store'

const WORKSPACE_PREFIX = 'workspace-'

export function useWorkspaceTerminals() {
  const {
    workspaceTerminals,
    workspaceLayout,
    activeWorkspacePane,
    addWorkspaceTerminal,
    removeWorkspaceTerminal,
    setWorkspaceLayout,
    setActiveWorkspacePane,
  } = useStore()

  // Note: Workspace terminals are NOT restored on app restart
  // They start fresh each time the app is launched

  const createWorkspaceTerminal = useCallback(async (paneIndex: number, cwd: string, name?: string) => {
    const id = `${WORKSPACE_PREFIX}${Date.now()}-${paneIndex}`
    const terminalName = name || `Terminal ${paneIndex + 1}`

    // Kill existing terminal at this pane if any
    const existing = workspaceTerminals.find((t) => t.paneIndex === paneIndex)
    if (existing) {
      await window.electronAPI.terminal.kill(existing.id)
    }

    // Create a regular shell terminal (not Claude)
    await window.electronAPI.terminal.create(id, terminalName, cwd)

    addWorkspaceTerminal(paneIndex, id, terminalName, [cwd])

    return { id, name: terminalName, repositories: [cwd] }
  }, [workspaceTerminals, addWorkspaceTerminal])

  const killWorkspaceTerminal = useCallback(async (paneIndex: number) => {
    const terminal = workspaceTerminals.find((t) => t.paneIndex === paneIndex)
    if (terminal) {
      await window.electronAPI.terminal.kill(terminal.id)
      removeWorkspaceTerminal(paneIndex)
    }
  }, [workspaceTerminals, removeWorkspaceTerminal])

  const getTerminalAtPane = useCallback((paneIndex: number) => {
    return workspaceTerminals.find((t) => t.paneIndex === paneIndex)
  }, [workspaceTerminals])

  const clearWorkspaceTerminal = useCallback(async (paneIndex: number) => {
    const terminal = workspaceTerminals.find((t) => t.paneIndex === paneIndex)
    if (terminal) {
      // Send clear command
      window.electronAPI.terminal.write(terminal.id, 'clear\r')
    }
  }, [workspaceTerminals])

  return {
    workspaceTerminals,
    workspaceLayout,
    activeWorkspacePane,
    createWorkspaceTerminal,
    killWorkspaceTerminal,
    getTerminalAtPane,
    setWorkspaceLayout,
    setActiveWorkspacePane,
    clearWorkspaceTerminal,
  }
}
