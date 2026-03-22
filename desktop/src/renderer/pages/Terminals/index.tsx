import { useState, useEffect } from 'react'
import { Bot } from 'lucide-react'
import { useTerminals } from '../../hooks/useTerminals'
import { useGroupedTerminals } from '../../hooks/useGroupedTerminals'
import { useStore } from '../../store'
import { FriendlyOverlay } from '../../components/FriendlyOverlay'
import { showToast } from '../../components/Toast'

const DEFAULT_PATH = '~/Documents'
const MAX_AGENTS = 12

export function TerminalsPage() {
  const { terminals, activeTerminalId, launchClaudeTerminal, setActiveTerminal, duplicateAgent } = useTerminals()
  const { flatVisualOrder } = useGroupedTerminals()
  const { toggleRightSidebar, setCurrentPage } = useStore()
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
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault()
        handleCreateTerminal()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [terminals.length, isCreating])

  // Listen for Command+Arrow to switch between agents (follows visual order in sidebar)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
        e.preventDefault()
        if (flatVisualOrder.length === 0) return

        const currentIndex = flatVisualOrder.findIndex(t => t.id === activeTerminalId)
        let newIndex: number

        if (flatVisualOrder.length === 1) {
          newIndex = 0
        } else if (e.key === 'ArrowUp') {
          newIndex = currentIndex <= 0 ? flatVisualOrder.length - 1 : currentIndex - 1
        } else {
          newIndex = currentIndex >= flatVisualOrder.length - 1 ? 0 : currentIndex + 1
        }

        setCurrentPage('terminals')
        setActiveTerminal(flatVisualOrder[newIndex].id)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [flatVisualOrder, activeTerminalId, setActiveTerminal, setCurrentPage])

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

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-1 overflow-hidden relative">
        <div className="h-full">
          <FriendlyOverlay terminalId={activeTerminalId} />
        </div>
      </div>
    </div>
  )
}
