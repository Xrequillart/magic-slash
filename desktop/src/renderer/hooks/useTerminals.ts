import { useCallback, useEffect, useRef } from 'react'
import { useStore } from '../store'
import type { TerminalState, TerminalInfo, TerminalMetadata } from '../../types'

export function useTerminals() {
  const {
    terminals,
    activeTerminalId,
    addTerminal,
    updateTerminalState,
    updateTerminalBranch,
    updateTerminalMetadata,
    updateTerminalRepositories,
    removeTerminal,
    setActiveTerminal,
  } = useStore()

  // Helper to check if terminal is a sidebar terminal (not an agent)
  const isSidebarTerminal = (id: string) => id.startsWith('sidebar-')

  // Helper to check if terminal is a script terminal (not an agent)
  const isScriptTerminal = (id: string) => id.startsWith('script-')

  // Helper to check if terminal should be ignored (not an agent)
  const shouldIgnoreTerminal = (id: string) => isSidebarTerminal(id) || isScriptTerminal(id)

  // Setup global event listeners
  useEffect(() => {
    const unsubData = window.electronAPI.terminal.onData(() => {
      // Data is handled by individual terminal components
    })

    const unsubState = window.electronAPI.terminal.onState(({ id, state }) => {
      // Ignore non-agent terminals
      if (shouldIgnoreTerminal(id)) return
      updateTerminalState(id, state)
    })

    const unsubExit = window.electronAPI.terminal.onExit(({ id, exitCode }) => {
      // Ignore non-agent terminals
      if (shouldIgnoreTerminal(id)) return
      updateTerminalState(id, exitCode === 0 ? 'completed' : 'error')
    })

    const unsubBranch = window.electronAPI.terminal.onBranch(({ id, branchName }) => {
      // Ignore non-agent terminals
      if (shouldIgnoreTerminal(id)) return
      updateTerminalBranch(id, branchName)
    })

    const unsubMetadata = window.electronAPI.terminal.onMetadata(({ id, metadata }) => {
      // Ignore non-agent terminals
      if (shouldIgnoreTerminal(id)) return
      updateTerminalMetadata(id, metadata)
    })

    const unsubRepositories = window.electronAPI.terminal.onRepositories(({ id, repositories }) => {
      // Ignore non-agent terminals
      if (shouldIgnoreTerminal(id)) return
      updateTerminalRepositories(id, repositories)
    })

    return () => {
      unsubData()
      unsubState()
      unsubExit()
      unsubBranch()
      unsubMetadata()
      unsubRepositories()
    }
  }, [updateTerminalState, updateTerminalBranch, updateTerminalMetadata, updateTerminalRepositories])

  // Track if we've already loaded terminals
  const hasLoadedRef = useRef(false)

  // Load existing terminals on mount (after refresh)
  useEffect(() => {
    // Only run once
    if (hasLoadedRef.current) return
    hasLoadedRef.current = true

    const loadExistingTerminals = async () => {
      try {
        // Check if there are already running terminals (e.g., after refresh)
        const existingTerminals = await window.electronAPI.terminal.getAll()

        if (existingTerminals && existingTerminals.length > 0) {
          // Preserve the current activeTerminalId (from sessionStorage) before loading
          const savedActiveTerminalId = useStore.getState().activeTerminalId

          // Use existing terminals (after refresh), but filter out non-agent terminals
          for (const term of existingTerminals) {
            // Skip non-agent terminals (sidebar and scripts)
            if (shouldIgnoreTerminal(term.id)) continue

            const terminalInfo: TerminalInfo = {
              id: term.id,
              name: term.name,
              state: term.state as TerminalState,
              repositories: term.repositories || [],
              branchName: term.branchName,
              tsCreate: term.tsCreate,
              metadata: term.metadata,
            }
            addTerminal(terminalInfo)
          }

          // Restore the saved activeTerminalId if it still exists in the loaded terminals
          if (savedActiveTerminalId) {
            const terminalStillExists = existingTerminals.some(
              (t: { id: string }) => t.id === savedActiveTerminalId && !shouldIgnoreTerminal(t.id)
            )
            if (terminalStillExists) {
              setActiveTerminal(savedActiveTerminalId)
            }
          }
        }
      } catch (error) {
        console.error('Failed to load existing terminals:', error)
      }
    }

    loadExistingTerminals()
  }, [])

  const launchClaudeTerminal = useCallback(async (name: string, cwd: string) => {
    const id = `claude-${Date.now()}`
    const result = await window.electronAPI.terminal.launchClaude(id, name, cwd)

    const terminalInfo: TerminalInfo = {
      id: result.id,
      name: result.name,
      state: result.state as TerminalState,
      repositories: result.repositories || [cwd],
      tsCreate: result.tsCreate,
      metadata: result.metadata,
    }

    addTerminal(terminalInfo)
    return terminalInfo
  }, [addTerminal])

  const killTerminal = useCallback(async (id: string) => {
    await window.electronAPI.terminal.kill(id)
    removeTerminal(id)
  }, [removeTerminal])

  // Update terminal metadata (both local store and backend)
  const updateMetadata = useCallback(async (id: string, metadata: Partial<TerminalMetadata>) => {
    // Update local store
    updateTerminalMetadata(id, metadata)
    // Update backend
    await window.electronAPI.terminal.updateMetadata(id, metadata as Record<string, string | undefined>)
  }, [updateTerminalMetadata])

  // Update terminal repositories (both local store and backend)
  const updateRepositories = useCallback(async (id: string, repositories: string[]) => {
    // Update local store
    updateTerminalRepositories(id, repositories)
    // Update backend
    await window.electronAPI.terminal.updateRepositories(id, repositories)
  }, [updateTerminalRepositories])

  // Generate unique name with "(Copy)" or "(Copy N)" suffix
  const generateCopyName = useCallback((baseName: string) => {
    // Remove existing "(Copy)" or "(Copy N)" suffix to get base name
    const cleanName = baseName.replace(/\s*\(Copy(?:\s+\d+)?\)$/, '')

    // Find all existing copy numbers
    const copyPattern = new RegExp(`^${cleanName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\(Copy(?:\\s+(\\d+))?\\)$`)
    const existingNumbers: number[] = []

    for (const terminal of terminals) {
      const title = terminal.metadata?.title || terminal.name
      const match = title.match(copyPattern)
      if (match) {
        // "(Copy)" without number counts as 1
        existingNumbers.push(match[1] ? parseInt(match[1]) : 1)
      }
    }

    if (existingNumbers.length === 0) {
      return `${cleanName} (Copy)`
    }

    // Find the next available number
    const maxNumber = Math.max(...existingNumbers)
    return `${cleanName} (Copy ${maxNumber + 1})`
  }, [terminals])

  // Duplicate an existing agent
  const duplicateAgent = useCallback(async (sourceTerminal: TerminalInfo) => {
    // Generate unique name
    const sourceName = sourceTerminal.metadata?.title || sourceTerminal.name
    const newName = generateCopyName(sourceName)

    // Generate new ID
    const newId = `claude-${Date.now()}`

    // Determine working directory (first repository or default)
    const cwd = sourceTerminal.repositories?.[0] || '~/Documents'

    // Launch new Claude terminal
    const result = await window.electronAPI.terminal.launchClaude(newId, newName, cwd)

    // Create terminal info with copied metadata
    const terminalInfo: TerminalInfo = {
      id: result.id,
      name: result.name,
      state: result.state as TerminalState,
      repositories: sourceTerminal.repositories || [cwd],
      tsCreate: result.tsCreate,
      metadata: {
        // Copy selective metadata
        title: newName,
        ticketId: sourceTerminal.metadata?.ticketId,
        description: sourceTerminal.metadata?.description,
        fullStackTaskId: sourceTerminal.metadata?.fullStackTaskId,
        // Don't copy: branchName, status, prUrl, relatedWorktrees, repositoryMetadata
      },
    }

    // Add to store
    addTerminal(terminalInfo)

    // Update repositories on backend if multiple repos
    if (sourceTerminal.repositories && sourceTerminal.repositories.length > 0) {
      await window.electronAPI.terminal.updateRepositories(result.id, sourceTerminal.repositories)
    }

    // Update metadata on backend
    if (terminalInfo.metadata) {
      await window.electronAPI.terminal.updateMetadata(result.id, terminalInfo.metadata as Record<string, string | undefined>)
    }

    return terminalInfo
  }, [generateCopyName, addTerminal])

  return {
    terminals,
    activeTerminalId,
    setActiveTerminal,
    launchClaudeTerminal,
    killTerminal,
    updateTerminalMetadata: updateMetadata,
    updateTerminalRepositories: updateRepositories,
    duplicateAgent,
  }
}
