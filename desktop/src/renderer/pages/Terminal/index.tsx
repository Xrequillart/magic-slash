import { useEffect, useCallback, useRef } from 'react'
import { Plus, X, Terminal as TerminalIcon } from 'lucide-react'
import { useWorkspaceTerminals } from '../../hooks/useWorkspaceTerminals'
import { TerminalPane } from '../../components/TerminalPane'

const MAX_TERMINALS = 4

export function TerminalPage() {
  const {
    workspaceTerminals,
    activeWorkspacePane,
    createWorkspaceTerminal,
    killWorkspaceTerminal,
    setActiveWorkspacePane,
  } = useWorkspaceTerminals()

  const initializedRef = useRef(false)

  // Create a default terminal on mount (in home directory)
  useEffect(() => {
    if (initializedRef.current) return
    if (workspaceTerminals.length === 0) {
      initializedRef.current = true
      createWorkspaceTerminal(0, '~', 'Terminal 1')
    }
  }, [workspaceTerminals.length, createWorkspaceTerminal])

  // Create new terminal
  const createNewTerminal = useCallback(async () => {
    if (workspaceTerminals.length >= MAX_TERMINALS) return

    const newIndex = workspaceTerminals.length
    await createWorkspaceTerminal(newIndex, '~', `Terminal ${newIndex + 1}`)
  }, [workspaceTerminals.length, createWorkspaceTerminal])

  // Close terminal at index
  const closeTerminal = useCallback(async (index: number) => {
    if (workspaceTerminals.length <= 1) return

    const terminal = workspaceTerminals[index]
    if (terminal) {
      await killWorkspaceTerminal(terminal.paneIndex)

      // Adjust active pane if needed
      if (activeWorkspacePane >= workspaceTerminals.length - 1) {
        setActiveWorkspacePane(Math.max(0, workspaceTerminals.length - 2))
      }
    }
  }, [workspaceTerminals, activeWorkspacePane, killWorkspaceTerminal, setActiveWorkspacePane])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+W to close active terminal
      if (e.metaKey && e.key === 'w') {
        e.preventDefault()
        if (workspaceTerminals.length > 1) {
          closeTerminal(activeWorkspacePane)
        }
        return
      }

      // Cmd+1/2/3/4 to switch between terminals
      if (e.metaKey && e.key >= '1' && e.key <= '4') {
        const index = parseInt(e.key) - 1
        if (index < workspaceTerminals.length) {
          e.preventDefault()
          setActiveWorkspacePane(index)
        }
        return
      }

      // Cmd+Shift+] to go to next terminal
      if (e.metaKey && e.shiftKey && e.key === ']') {
        e.preventDefault()
        const nextIndex = (activeWorkspacePane + 1) % workspaceTerminals.length
        setActiveWorkspacePane(nextIndex)
        return
      }

      // Cmd+Shift+[ to go to previous terminal
      if (e.metaKey && e.shiftKey && e.key === '[') {
        e.preventDefault()
        const prevIndex = (activeWorkspacePane - 1 + workspaceTerminals.length) % workspaceTerminals.length
        setActiveWorkspacePane(prevIndex)
        return
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [workspaceTerminals.length, activeWorkspacePane, createNewTerminal, closeTerminal, setActiveWorkspacePane])

  const activeTerminal = workspaceTerminals[activeWorkspacePane]

  return (
    <div className="h-full flex flex-col overflow-hidden bg-transparent">
      {/* Tab bar */}
      <div className="flex items-center gap-1 px-2 py-1.5 bg-black/30 backdrop-blur-md border-b border-white/10 shrink-0">
        {/* Tabs */}
        {workspaceTerminals.map((term, index) => (
          <button
            key={term.id}
            onClick={() => setActiveWorkspacePane(index)}
            className={`
              group relative flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-all
              ${index === activeWorkspacePane
                ? 'bg-bg-tertiary text-white'
                : 'text-text-secondary hover:text-white hover:bg-bg-tertiary/50'
              }
            `}
          >
            <TerminalIcon className="w-3.5 h-3.5" />
            <span className="max-w-[100px] truncate">{term.name}</span>
            <span className="text-xs opacity-50 ml-1">
              {index + 1}
            </span>

            {/* Close button - only show if more than 1 terminal */}
            {workspaceTerminals.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  closeTerminal(index)
                }}
                className={`
                  p-0.5 rounded transition-colors ml-1
                  ${index === activeWorkspacePane
                    ? 'hover:bg-white/10 text-text-secondary hover:text-white'
                    : 'opacity-0 group-hover:opacity-100 hover:bg-white/10 text-text-secondary hover:text-white'
                  }
                `}
                title="Close terminal (W)"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </button>
        ))}

        {/* New terminal button */}
        {workspaceTerminals.length < MAX_TERMINALS && (
          <button
            onClick={createNewTerminal}
            className="flex items-center justify-center p-1.5 text-text-secondary hover:text-white hover:bg-bg-tertiary/50 rounded-md transition-colors"
            title="New terminal (D)"
          >
            <Plus className="w-4 h-4" />
          </button>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Terminal count indicator */}
        <div className="text-xs text-text-secondary px-2">
          {workspaceTerminals.length}/{MAX_TERMINALS}
        </div>
      </div>

      {/* Active terminal pane */}
      <div className="flex-1 overflow-hidden">
        {activeTerminal ? (
          <TerminalPane
            terminal={activeTerminal}
            isActive={true}
          />
        ) : (
          <div className="h-full flex items-center justify-center text-text-secondary">
            <div className="text-center">
              <TerminalIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No terminal open</p>
              <button
                onClick={createNewTerminal}
                className="mt-4 px-4 py-2 bg-green text-black rounded-lg text-sm font-medium hover:bg-green/80 transition-colors"
              >
                Open Terminal
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
