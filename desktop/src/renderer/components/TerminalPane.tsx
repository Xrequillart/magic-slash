import { useEffect, useRef, useState, useCallback } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { Loader2, Square, Check, AlertCircle, Circle, CornerDownLeft } from 'lucide-react'
import type { WorkspaceTerminal } from '../../types'
import { formatDroppedPaths } from '../utils/formatDroppedPaths'

interface CommandBlock {
  id: string
  command: string
  output: string
  outputHtml: string  // Pre-computed HTML from ANSI conversion
  status: 'running' | 'completed' | 'interrupted' | 'error'
  exitCode?: number
  timestamp: Date
}

interface TerminalPaneProps {
  terminal: WorkspaceTerminal
  isActive: boolean
}

// Convert ANSI escape codes to HTML - keep for colors
function ansiToHtml(text: string): string {
  const ansiColors: Record<string, string> = {
    '30': '#0a0a0b', '31': '#ef4444', '32': '#22c55e', '33': '#eab308',
    '34': '#6366f1', '35': '#a855f7', '36': '#06b6d4', '37': '#ffffff',
    '90': '#a1a1aa', '91': '#f87171', '92': '#4ade80', '93': '#facc15',
    '94': '#818cf8', '95': '#c084fc', '96': '#22d3ee', '97': '#ffffff',
  }

  let html = text

  // Remove non-color ANSI escape sequences
  html = html.replace(/\x1b\[[0-9;]*[ABCDEFGHJKSTfnsu]/g, '')
  html = html.replace(/\x1b\[[0-9]*[JKPX@IL]/g, '')
  html = html.replace(/\x1b\[\?[0-9;]*[hl]/g, '')
  html = html.replace(/\x1b\][^\x07]*\x07/g, '')
  html = html.replace(/\x1b[()][AB012]/g, '')
  html = html.replace(/\x1b[>=]/g, '')
  html = html.replace(/\r/g, '')

  // HTML escape
  html = html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  // Handle color ANSI codes
  html = html.replace(/\x1b\[([0-9;]*)m/g, (_, codes) => {
    if (!codes || codes === '0') return '</span>'
    const codeList = codes.split(';')
    let style = ''
    for (const code of codeList) {
      if (code === '0') return '</span>'
      if (code === '1') style += 'font-weight:bold;'
      if (code === '2') style += 'opacity:0.7;'
      if (code === '3') style += 'font-style:italic;'
      if (code === '4') style += 'text-decoration:underline;'
      if (ansiColors[code]) style += `color:${ansiColors[code]};`
      // Background colors (40-47, 100-107)
      if (code >= '40' && code <= '47') {
        const fgCode = String(Number(code) - 10)
        if (ansiColors[fgCode]) style += `background-color:${ansiColors[fgCode]};`
      }
    }
    return style ? `<span style="${style}">` : ''
  })

  // Remove any remaining escape sequences
  html = html.replace(/\x1b\[[^m]*m/g, '')
  html = html.replace(/\x1b[^\[]/g, '')

  // Clean up unclosed spans
  const openSpans = (html.match(/<span/g) || []).length
  const closeSpans = (html.match(/<\/span>/g) || []).length
  for (let i = 0; i < openSpans - closeSpans; i++) {
    html += '</span>'
  }

  return html
}

export function TerminalPane({ terminal, isActive }: TerminalPaneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const xtermContainerRef = useRef<HTMLDivElement>(null)
  const xtermRef = useRef<Terminal | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const cleanupRef = useRef<(() => void) | null>(null)

  // Command blocks state
  const [blocks, setBlocks] = useState<CommandBlock[]>([])

  // Input state
  const [inputValue, setInputValue] = useState('')
  const [suggestion, setSuggestion] = useState<string | null>(null)
  const [commandHistory, setCommandHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)

  // Drag & drop state
  const [isDragOver, setIsDragOver] = useState(false)
  const dragCounterRef = useRef(0)

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current++
    if (e.dataTransfer.types.includes('Files')) {
      setIsDragOver(true)
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current--
    if (dragCounterRef.current === 0) {
      setIsDragOver(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current = 0
    setIsDragOver(false)
    if (e.dataTransfer.files.length > 0) {
      const pathString = formatDroppedPaths(e.dataTransfer.files)
      if (pathString) {
        setInputValue(prev => prev ? `${prev} ${pathString}` : pathString)
        inputRef.current?.focus()
      }
    }
  }, [])

  // Scroll to bottom when blocks change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [blocks])

  // Fetch suggestion from history
  const fetchSuggestion = async (value: string) => {
    if (!terminal) return
    const historyPath = terminal.repositories?.[0]
    if (!historyPath) return
    try {
      if (!value) {
        const lastCmd = await window.electronAPI.history.getLast(historyPath)
        setSuggestion(lastCmd)
      } else {
        const match = await window.electronAPI.history.getSuggestion(historyPath, value)
        setSuggestion(match)
      }
    } catch {
      setSuggestion(null)
    }
  }

  // Handle interrupt (Ctrl+C / Stop button)
  const handleInterrupt = useCallback(() => {
    if (!terminal) return
    window.electronAPI.terminal.write(terminal.id, '\x03')
  }, [terminal])

  // Handle input change
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setInputValue(value)
    setHistoryIndex(-1)
    fetchSuggestion(value)
  }, [])

  // Handle key down
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Tab' && suggestion) {
      e.preventDefault()
      setInputValue(suggestion)
      setSuggestion(null)
      return
    }

    if (e.key === 'Enter') {
      e.preventDefault()
      const command = inputValue.trim()

      if (command && terminal) {
        // Send to PTY - the block will be created by the preexec hook
        window.electronAPI.terminal.write(terminal.id, command + '\n')
        const historyPath = terminal.repositories?.[0]
        if (historyPath) {
          window.electronAPI.history.add(historyPath, command)
        }
        setCommandHistory(prev => [command, ...prev.slice(0, 99)])
      }

      setInputValue('')
      setSuggestion(null)
      setHistoryIndex(-1)
      setTimeout(() => fetchSuggestion(''), 100)
      return
    }

    if (e.key === 'Escape') {
      setInputValue('')
      setHistoryIndex(-1)
      fetchSuggestion('')
      return
    }

    if (e.key === 'c' && e.ctrlKey) {
      e.preventDefault()
      handleInterrupt()
      setInputValue('')
      setSuggestion(null)
      return
    }

    if (e.key === 'd' && e.ctrlKey) {
      e.preventDefault()
      window.electronAPI.terminal.write(terminal.id, '\x04')
      return
    }

    if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault()
      setBlocks([])
      return
    }

    // Cmd+K (Mac) to clear terminal
    if (e.key === 'k' && e.metaKey) {
      e.preventDefault()
      setBlocks([])
      return
    }

    // Arrow Up - navigate history
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (commandHistory.length > 0) {
        const newIndex = Math.min(historyIndex + 1, commandHistory.length - 1)
        setHistoryIndex(newIndex)
        setInputValue(commandHistory[newIndex])
        setSuggestion(null)
      } else if (!inputValue && suggestion) {
        setInputValue(suggestion)
        setSuggestion(null)
      }
      return
    }

    // Arrow Down - navigate history
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1
        setHistoryIndex(newIndex)
        setInputValue(commandHistory[newIndex])
      } else if (historyIndex === 0) {
        setHistoryIndex(-1)
        setInputValue('')
        fetchSuggestion('')
      }
      return
    }
  }

  // Initialize hidden xterm for PTY communication
  useEffect(() => {
    if (!xtermContainerRef.current || !terminal) return

    const xterm = new Terminal({
      cols: 120,
      rows: 30,
      allowTransparency: true,
      disableStdin: true,
    })

    const fitAddon = new FitAddon()
    xterm.loadAddon(fitAddon)
    xterm.open(xtermContainerRef.current)

    xtermRef.current = xterm
    fitAddonRef.current = fitAddon

    fitAddon.fit()
    const { cols, rows } = xterm
    window.electronAPI.terminal.resize(terminal.id, cols, rows)

    // Subscribe to PTY data - NO FILTERING, raw output
    const unsubscribe = window.electronAPI.terminal.onData(({ id, data }) => {
      if (id === terminal.id) {
        setBlocks(prev => {
          const currentBlock = prev.find(b => b.status === 'running')
          if (!currentBlock) return prev

          // Raw output - pre-compute HTML for rendering
          return prev.map(block => {
            if (block.id !== currentBlock.id) return block
            const newOutput = block.output + data
            return { ...block, output: newOutput, outputHtml: ansiToHtml(newOutput) }
          })
        })
      }
    })

    cleanupRef.current = unsubscribe
    fetchSuggestion('')

    return () => {
      if (cleanupRef.current) cleanupRef.current()
      xterm.dispose()
    }
  }, [terminal?.id])

  // Subscribe to shell hook events for command start/end
  useEffect(() => {
    if (!terminal) return

    const unsubStart = window.electronAPI.terminal.onCommandStart(({ id, command }) => {
      if (id !== terminal.id) return

      // Ignore "clear" command - don't create a block for it
      if (command.trim() === 'clear') {
        setBlocks([])
        return
      }

      // Mark any previous running block as completed (fallback)
      setBlocks(prev => prev.map(block =>
        block.status === 'running'
          ? { ...block, status: 'completed' as const }
          : block
      ))

      // Create the block when the preexec hook triggers
      const blockId = `block-${Date.now()}`
      setBlocks(prev => [...prev, {
        id: blockId,
        command,
        output: '',
        outputHtml: '',
        status: 'running' as const,
        timestamp: new Date(),
      }])
    })

    const unsubEnd = window.electronAPI.terminal.onCommandEnd(({ id, exitCode }) => {
      if (id !== terminal.id) return

      // Mark the running block as completed when precmd triggers
      setBlocks(prev => prev.map(block =>
        block.status === 'running'
          ? {
              ...block,
              status: exitCode === 0 ? 'completed' as const
                : exitCode === 130 ? 'interrupted' as const
                : 'error' as const,
              exitCode
            }
          : block
      ))
    })

    return () => {
      unsubStart()
      unsubEnd()
    }
  }, [terminal?.id])

  // Check if a command is currently running
  const isCommandRunning = blocks.some(block => block.status === 'running')

  // Global Ctrl+C handler when command is running
  useEffect(() => {
    if (!isCommandRunning || !terminal) return

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'c' && e.ctrlKey) {
        e.preventDefault()
        handleInterrupt()
      }
    }

    document.addEventListener('keydown', handleGlobalKeyDown)
    return () => document.removeEventListener('keydown', handleGlobalKeyDown)
  }, [isCommandRunning, terminal, handleInterrupt])

  // Global Cmd+K handler to clear terminal
  useEffect(() => {
    if (!isActive || !terminal) return

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'k' && e.metaKey) {
        e.preventDefault()
        setBlocks([])
      }
    }

    document.addEventListener('keydown', handleGlobalKeyDown)
    return () => document.removeEventListener('keydown', handleGlobalKeyDown)
  }, [isActive, terminal])

  // Focus input when pane becomes active and no command is running
  useEffect(() => {
    if (isActive && inputRef.current && !isCommandRunning) {
      inputRef.current.focus()
    }
  }, [isActive, isCommandRunning])

  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0

  const ghostCompletion = suggestion
    ? (inputValue ? (suggestion.startsWith(inputValue) ? suggestion.slice(inputValue.length) : null) : suggestion)
    : null

  return (
    <div
      className="relative h-full flex flex-col overflow-hidden bg-black/30 backdrop-blur-md"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Hidden xterm for PTY */}
      <div ref={xtermContainerRef} className="hidden" />

      {/* Command blocks area - Warp-inspired design */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-3 space-y-2"
      >
        {blocks.length === 0 ? (
          <div className="h-full flex items-center justify-center text-text-secondary text-sm">
            Type a command to get started
          </div>
        ) : (
          blocks.map((block) => (
            <div key={block.id} className="group relative">
              {/* Warp-style block with left accent bar */}
              <div className={`
                relative rounded-lg overflow-hidden transition-all
                ${block.status === 'running' ? 'bg-white/10' : 'hover:bg-white/5'}
              `}>
                {/* Left accent bar */}
                <div className={`
                  absolute left-0 top-0 bottom-0 w-1 rounded-l-lg
                  ${block.status === 'running'
                    ? 'bg-blue-500 animate-pulse'
                    : block.status === 'error'
                      ? 'bg-red-500'
                      : block.status === 'interrupted'
                        ? 'bg-yellow-500'
                        : 'bg-green-500'
                  }
                `} />

                {/* Command line header */}
                <div className="flex items-center gap-2 pl-4 pr-3 py-2 bg-white/5 rounded-t-lg">
                  {/* Status indicator */}
                  <div className="flex-shrink-0 w-4 h-4 flex items-center justify-center">
                    {block.status === 'running' ? (
                      <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin" />
                    ) : block.status === 'error' ? (
                      <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                    ) : block.status === 'interrupted' ? (
                      <Circle className="w-3.5 h-3.5 text-yellow-500" />
                    ) : (
                      <Check className="w-3.5 h-3.5 text-green-500" />
                    )}
                  </div>

                  {/* Prompt and command */}
                  <div className="flex-1 flex items-center gap-2 min-w-0">
                    <span className="text-text-secondary font-mono text-sm">$</span>
                    <code className="text-sm font-mono text-white truncate">{block.command}</code>
                  </div>

                  {/* Timestamp - shows on hover */}
                  <span className="text-[10px] text-text-secondary opacity-0 group-hover:opacity-100 transition-opacity">
                    {block.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>

                  {/* Stop button for running commands */}
                  {block.status === 'running' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleInterrupt()
                      }}
                      className="flex-shrink-0 p-1 text-red-500 hover:bg-red-500/20 rounded transition-colors"
                      title="Stop (Ctrl+C)"
                    >
                      <Square className="w-3 h-3 fill-current" />
                    </button>
                  )}
                </div>

                {/* Output - raw, unfiltered */}
                {block.outputHtml && (
                  <div className={`
                    pl-4 pr-3 py-2
                    ${block.status === 'error' ? 'text-red-400' : 'text-text-secondary'}
                  `}>
                    <pre
                      className="text-[13px] font-mono whitespace-pre-wrap overflow-x-auto leading-relaxed break-words"
                      dangerouslySetInnerHTML={{ __html: block.outputHtml }}
                    />
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Input bar at bottom */}
      <div className="border-t border-white/10 bg-white/5 shrink-0">
        {isCommandRunning ? (
          /* Running indicator - hide input during command execution */
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2 text-text-secondary text-sm">
              <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
              <span>Running...</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="px-1.5 py-0.5 text-xs bg-bg-tertiary rounded border border-border text-text-secondary">
                {isMac ? '⌃C' : 'Ctrl+C'}
              </kbd>
              <span className="text-xs text-text-secondary">to stop</span>
            </div>
          </div>
        ) : (
          /* Normal input bar */
          <div className="relative flex items-center">
            <span className="pl-4 text-green font-mono text-sm">$</span>
            <div className="flex-1 relative">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                className="w-full bg-transparent text-white font-mono text-sm px-2 py-3 outline-none focus-visible:outline-none"
                placeholder="Type a command..."
                autoFocus={isActive}
                spellCheck={false}
                autoComplete="off"
              />
              {ghostCompletion && (
                <div className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none font-mono text-sm text-white/30">
                  <span className="invisible">{inputValue}</span>
                  <span>{ghostCompletion}</span>
                </div>
              )}
            </div>
            {ghostCompletion && (
              <div className="pr-4 flex items-center gap-1 text-text-secondary">
                <kbd className="px-1.5 py-0.5 text-xs bg-bg-tertiary rounded border border-border">TAB</kbd>
              </div>
            )}
            {inputValue && !ghostCompletion && (
              <div className="pr-4">
                <CornerDownLeft className="w-4 h-4 text-text-secondary" />
              </div>
            )}
          </div>
        )}
      </div>
      {isDragOver && (
        <div className="absolute inset-0 drop-overlay border-2 border-dashed rounded-lg flex items-center justify-center pointer-events-none z-10">
          <span className="text-white/80 text-sm font-medium bg-black/50 px-4 py-2 rounded-lg backdrop-blur-sm">
            Drop files here
          </span>
        </div>
      )}
    </div>
  )
}
