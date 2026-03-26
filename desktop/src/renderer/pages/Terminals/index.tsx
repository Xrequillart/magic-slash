import { useState, useEffect, useMemo, useCallback } from 'react'
import { Bot } from 'lucide-react'
import { useTerminals } from '../../hooks/useTerminals'
import { useScriptRunner } from '../../hooks/useScriptRunner'
import { useGroupedTerminals } from '../../hooks/useGroupedTerminals'
import { useStore } from '../../store'
import { TerminalView } from '../../components/TerminalView'
import { showToast } from '../../components/Toast'

const DEFAULT_PATH = '~/Documents'
const MAX_AGENTS = 12

export function TerminalsPage() {
  const { terminals, activeTerminalId, launchClaudeTerminal, setActiveTerminal, duplicateAgent } = useTerminals()
  const { scriptTerminals } = useScriptRunner()
  const { flatVisualOrder } = useGroupedTerminals()
  const { toggleRightSidebar, setCurrentPage, isSplitMode, splitTerminalId, focusedPane, setSplitTerminalId, setFocusedPane, rightPaneTerminalIds, moveTerminalToPane } = useStore()
  const [isCreating, setIsCreating] = useState(false)

  // Generate terminal name based on count
  const getNextTerminalName = () => {
    const count = terminals.length + 1
    return `Claude ${count}`
  }

  const handleCreateTerminal = async () => {
    if (isCreating) return

    // Block creation if max agents reached
    if (terminals.length >= MAX_AGENTS) {
      showToast(`Maximum of ${MAX_AGENTS} agents reached`, 'error')
      return
    }

    setIsCreating(true)
    try {
      const name = getNextTerminalName()
      await launchClaudeTerminal(name, DEFAULT_PATH)
      setCurrentPage('terminals')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to create terminal', 'error')
    } finally {
      setIsCreating(false)
    }
  }

  const handleCreateTerminalInRightPane = async () => {
    if (isCreating) return
    if (terminals.length >= MAX_AGENTS) {
      showToast(`Maximum of ${MAX_AGENTS} agents reached`, 'error')
      return
    }
    setIsCreating(true)
    try {
      const name = getNextTerminalName()
      const terminal = await launchClaudeTerminal(name, DEFAULT_PATH)
      moveTerminalToPane(terminal.id, 'right')
      setSplitTerminalId(terminal.id)
      setFocusedPane('secondary')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to create terminal', 'error')
    } finally {
      setIsCreating(false)
    }
  }

  // Listen for new terminal event from sidebar
  useEffect(() => {
    const handleNewTerminal = () => {
      handleCreateTerminal()
    }

    window.addEventListener('new-terminal', handleNewTerminal)
    return () => window.removeEventListener('new-terminal', handleNewTerminal)
  }, [terminals.length, isCreating])

  // Listen for Command+N keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Command+N (Mac) or Ctrl+N (Windows/Linux)
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault()
        handleCreateTerminal()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [terminals.length, isCreating])

  // Listen for Command+Arrow to switch between agents (within current zone in split mode)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
        e.preventDefault()

        const isSecondary = isSplitMode && focusedPane === 'secondary'
        // In split mode, only navigate within the zone's agents
        const zoneTerminals = isSplitMode
          ? (isSecondary
            ? flatVisualOrder.filter(t => rightPaneTerminalIds.includes(t.id))
            : flatVisualOrder.filter(t => !rightPaneTerminalIds.includes(t.id)))
          : flatVisualOrder

        if (zoneTerminals.length === 0) return

        const currentId = isSecondary ? splitTerminalId : activeTerminalId
        const currentIndex = zoneTerminals.findIndex(t => t.id === currentId)
        let newIndex: number

        if (zoneTerminals.length === 1) {
          newIndex = 0
        } else if (e.key === 'ArrowUp') {
          newIndex = currentIndex <= 0 ? zoneTerminals.length - 1 : currentIndex - 1
        } else {
          newIndex = currentIndex >= zoneTerminals.length - 1 ? 0 : currentIndex + 1
        }

        setCurrentPage('terminals')
        if (isSecondary) {
          setSplitTerminalId(zoneTerminals[newIndex].id)
        } else {
          setActiveTerminal(zoneTerminals[newIndex].id)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [flatVisualOrder, activeTerminalId, splitTerminalId, isSplitMode, focusedPane, rightPaneTerminalIds, setActiveTerminal, setSplitTerminalId, setCurrentPage])

  // Listen for Command+I to toggle Info sidebar (only with agents)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'i') {
        e.preventDefault()
        if (terminals.length > 0) {
          toggleRightSidebar('info')
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [terminals.length, toggleRightSidebar])

  // Listen for Command+D to duplicate the active agent
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'd' && !e.shiftKey) {
        e.preventDefault()
        if (!activeTerminalId) return

        // Check max agents limit
        if (terminals.length >= MAX_AGENTS) {
          showToast(`Maximum of ${MAX_AGENTS} agents reached`, 'error')
          return
        }

        const activeTerminal = terminals.find(t => t.id === activeTerminalId)
        if (!activeTerminal) return

        try {
          const newTerminal = await duplicateAgent(activeTerminal)
          setActiveTerminal(newTerminal.id)
        } catch (error) {
          showToast(error instanceof Error ? error.message : 'Failed to duplicate agent', 'error')
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeTerminalId, terminals, duplicateAgent, setActiveTerminal])

  // Listen for Command+\ or Command+Left/Right to toggle focus between split panes
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || !isSplitMode || !splitTerminalId) return

      if (e.key === '\\') {
        e.preventDefault()
        setFocusedPane(focusedPane === 'primary' ? 'secondary' : 'primary')
      } else if (e.key === 'ArrowLeft' && focusedPane !== 'primary') {
        e.preventDefault()
        setFocusedPane('primary')
      } else if (e.key === 'ArrowRight' && focusedPane !== 'secondary') {
        e.preventDefault()
        setFocusedPane('secondary')
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isSplitMode, splitTerminalId, focusedPane, setFocusedPane])


  // Reset focused pane when exiting split mode
  useEffect(() => {
    if (!isSplitMode) {
      setFocusedPane('primary')
    }
  }, [isSplitMode, setFocusedPane])

  // Detect platform for keyboard shortcut display
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
  const shortcutKey = isMac ? '⌘N' : 'Ctrl+N'

  if (terminals.length === 0) {
    return (
      <div className="h-full flex items-center justify-center animate-fade-in">
        <div className="text-center">
          <Bot className="w-16 h-16 mx-auto mb-4 text-text-secondary opacity-40" />
          <p className="text-lg mb-2">No agents running</p>
          <p className="text-text-secondary text-sm mb-6">Launch a new agent to get started</p>
          <button
            onClick={handleCreateTerminal}
            disabled={isCreating}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-purple hover:bg-purple/80 text-white rounded-lg font-semibold transition-colors disabled:opacity-50"
          >
            <Bot className="w-4 h-4" />
            {isCreating ? 'Launching...' : 'Launch new agent'}
            <span className="ml-1 text-xs opacity-60">{shortcutKey}</span>
          </button>
        </div>
      </div>
    )
  }

  // Memoize filtered terminal lists using zone assignments
  const primaryTerminals = useMemo(
    () => isSplitMode ? terminals.filter(t => !rightPaneTerminalIds.includes(t.id)) : terminals,
    [terminals, isSplitMode, rightPaneTerminalIds]
  )
  const secondaryTerminals = useMemo(
    () => isSplitMode ? terminals.filter(t => rightPaneTerminalIds.includes(t.id)) : [],
    [terminals, isSplitMode, rightPaneTerminalIds]
  )

  // Guarded focus handlers - only update store when pane actually changes
  const handlePrimaryFocus = useCallback(() => {
    if (focusedPane !== 'primary') setFocusedPane('primary')
  }, [focusedPane, setFocusedPane])
  const handleSecondaryFocus = useCallback(() => {
    if (focusedPane !== 'secondary') setFocusedPane('secondary')
  }, [focusedPane, setFocusedPane])

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Terminal Content */}
      <div className={`flex-1 overflow-hidden ${isSplitMode ? 'flex' : ''}`}>
        {isSplitMode ? (
          <>
            {/* Primary pane */}
            <div
              className="w-1/2 h-full relative"
              onMouseDown={handlePrimaryFocus}
            >
              {focusedPane === 'primary' && <div className="absolute top-0 left-0 right-0 h-0.5 bg-accent/50 z-10" />}
              {primaryTerminals.map((terminal) => (
                <TerminalView
                  key={terminal.id}
                  terminal={terminal}
                  isVisible={terminal.id === activeTerminalId}
                  isFocused={terminal.id === activeTerminalId && focusedPane === 'primary'}
                />
              ))}
              {scriptTerminals.map((script) => (
                <TerminalView
                  key={script.id}
                  terminal={{
                    id: script.id,
                    name: `${script.scriptName} (${script.agentName})`,
                    state: script.state === 'running' ? 'working' : 'error',
                    repositories: [script.projectPath],
                  }}
                  isVisible={script.id === activeTerminalId}
                  isFocused={script.id === activeTerminalId && focusedPane === 'primary'}
                />
              ))}
            </div>
            {/* Divider */}
            <div className="w-px bg-white/10 flex-shrink-0" />
            {/* Secondary pane */}
            <div
              className="w-1/2 h-full relative"
              onMouseDown={handleSecondaryFocus}
            >
              {focusedPane === 'secondary' && secondaryTerminals.length > 0 && <div className="absolute top-0 left-0 right-0 h-0.5 bg-accent/50 z-10" />}
              {secondaryTerminals.length > 0 ? (
                secondaryTerminals.map((terminal) => (
                  <TerminalView
                    key={`split-${terminal.id}`}
                    terminal={terminal}
                    isVisible={terminal.id === splitTerminalId}
                    isFocused={terminal.id === splitTerminalId && focusedPane === 'secondary'}
                  />
                ))
              ) : (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <Bot className="w-12 h-12 mx-auto mb-3 text-text-secondary opacity-30" />
                    <p className="text-sm text-text-secondary/50 mb-4">Drag an agent here or create a new one</p>
                    <button
                      onClick={handleCreateTerminalInRightPane}
                      disabled={isCreating}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-purple hover:bg-purple/80 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                    >
                      <Bot className="w-3.5 h-3.5" />
                      {isCreating ? 'Launching...' : 'New agent'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          /* Single pane mode */
          <>
            {terminals.map((terminal) => (
              <TerminalView
                key={terminal.id}
                terminal={terminal}
                isVisible={terminal.id === activeTerminalId}
                isFocused={terminal.id === activeTerminalId}
              />
            ))}
            {scriptTerminals.map((script) => (
              <TerminalView
                key={script.id}
                terminal={{
                  id: script.id,
                  name: `${script.scriptName} (${script.agentName})`,
                  state: script.state === 'running' ? 'working' : 'error',
                  repositories: [script.projectPath],
                }}
                isVisible={script.id === activeTerminalId}
                isFocused={script.id === activeTerminalId}
              />
            ))}
          </>
        )}
      </div>
    </div>
  )
}
