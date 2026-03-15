import { useEffect, useRef, useState, useCallback } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import '@xterm/xterm/css/xterm.css'
import type { TerminalInfo } from '../../types'
import { formatDroppedPaths } from '../utils/formatDroppedPaths'

interface TerminalViewProps {
  terminal: TerminalInfo
  isActive: boolean
}

export function TerminalView({ terminal, isActive }: TerminalViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const xtermRef = useRef<Terminal | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const cleanupRef = useRef<(() => void) | null>(null)
  const userScrolledUpRef = useRef(false)
  const writingRef = useRef(false)
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
        window.electronAPI.terminal.write(terminal.id, pathString)
      }
    }
  }, [terminal.id])

  // Initialize xterm
  useEffect(() => {
    if (!containerRef.current) return

    const xterm = new Terminal({
      theme: {
        background: 'transparent',
        foreground: '#ffffff',
        cursor: 'transparent', // Hide cursor - Claude Code manages its own
        cursorAccent: 'transparent',
        selectionBackground: '#6366f140',
        black: '#0a0a0b',
        red: '#ef4444',
        green: '#22c55e',
        yellow: '#eab308',
        blue: '#6366f1',
        magenta: '#a855f7',
        cyan: '#06b6d4',
        white: '#ffffff',
        brightBlack: '#a1a1aa',
        brightRed: '#f87171',
        brightGreen: '#4ade80',
        brightYellow: '#facc15',
        brightBlue: '#818cf8',
        brightMagenta: '#c084fc',
        brightCyan: '#22d3ee',
        brightWhite: '#ffffff',
      },
      fontFamily: "'Hack', monospace",
      fontSize: 13,
      lineHeight: 1.4,
      cursorBlink: false,
      cursorStyle: 'bar',
      scrollback: 10000,
      allowTransparency: true,
      scrollOnUserInput: true,
    })

    const fitAddon = new FitAddon()
    const webLinksAddon = new WebLinksAddon((_event, uri) => {
      window.electronAPI.shell.openExternal(uri)
    })

    xterm.loadAddon(fitAddon)
    xterm.loadAddon(webLinksAddon)

    xterm.open(containerRef.current)

    xtermRef.current = xterm
    fitAddonRef.current = fitAddon

    // Delay fit() to ensure xterm's renderer is fully initialized
    // Then notify main process of the calculated size
    requestAnimationFrame(() => {
      if (containerRef.current && fitAddonRef.current && xtermRef.current) {
        fitAddon.fit()
        const { cols, rows } = xtermRef.current
        window.electronAPI.terminal.resize(terminal.id, cols, rows)
      }
    })

    // Handle Shift+Enter to insert newline without sending
    xterm.attachCustomKeyEventHandler((event) => {
      if (event.key === 'Enter' && event.shiftKey) {
        if (event.type === 'keydown') {
          // Insert a literal newline (line feed) instead of carriage return
          // This allows multi-line input in Claude Code
          event.preventDefault()
          event.stopPropagation()
          window.electronAPI.terminal.write(terminal.id, '\n')
        }
        return false // Prevent xterm from processing Enter
      }
      return true // Allow all other keys
    })

    // Handle user input
    xterm.onData((data) => {
      window.electronAPI.terminal.write(terminal.id, data)
    })

    // Check if user is near the bottom of the terminal
    const isNearBottom = (t: Terminal): boolean => {
      const buf = t.buffer.active
      return buf.viewportY >= buf.baseY - 3
    }

    // Track whether user has scrolled away from bottom
    const scrollHandler = xterm.onScroll(() => {
      if (!writingRef.current) {
        userScrolledUpRef.current = !isNearBottom(xterm)
      }
    })

    // First, restore the buffer BEFORE attaching the live data listener
    // This ensures we get the historical data first, then live updates
    window.electronAPI.terminal.getBuffer(terminal.id).then((buffer) => {
      if (buffer && buffer.length > 0) {
        writingRef.current = true
        xterm.write(buffer, () => {
          writingRef.current = false
        })
        xterm.scrollToBottom() // Always scroll on initial restore
      }

      // Now attach the live data listener AFTER buffer is restored
      const unsubscribe = window.electronAPI.terminal.onData(({ id, data }) => {
        if (id === terminal.id) {
          writingRef.current = true
          xterm.write(data, () => {
            writingRef.current = false
          })
          if (!userScrolledUpRef.current) {
            xterm.scrollToBottom()
          }
        }
      })

      cleanupRef.current = () => {
        unsubscribe()
        scrollHandler.dispose()
      }
    }).catch((error) => {
      console.error('Failed to restore terminal buffer:', error)

      // Even if buffer fails, still attach the listener
      const unsubscribe = window.electronAPI.terminal.onData(({ id, data }) => {
        if (id === terminal.id) {
          writingRef.current = true
          xterm.write(data, () => {
            writingRef.current = false
          })
          if (!userScrolledUpRef.current) {
            xterm.scrollToBottom()
          }
        }
      })

      cleanupRef.current = () => {
        unsubscribe()
        scrollHandler.dispose()
      }
    })

    return () => {
      if (cleanupRef.current) {
        cleanupRef.current()
      }
      xterm.dispose()
    }
  }, [terminal.id])

  // Handle resize - use ResizeObserver to detect container size changes
  useEffect(() => {
    if (!isActive || !containerRef.current) return

    let resizeTimer: ReturnType<typeof setTimeout> | null = null

    const handleResize = () => {
      if (fitAddonRef.current && xtermRef.current && containerRef.current) {
        const { offsetWidth, offsetHeight } = containerRef.current
        if (offsetWidth > 0 && offsetHeight > 0) {
          fitAddonRef.current.fit()
          const { cols, rows } = xtermRef.current
          window.electronAPI.terminal.resize(terminal.id, cols, rows)
        }
      }
    }

    const debouncedResize = () => {
      if (resizeTimer) clearTimeout(resizeTimer)
      resizeTimer = setTimeout(handleResize, 100)
    }

    // Initial fit (non-debounced) to ensure correct sizing at mount
    requestAnimationFrame(() => {
      handleResize()
    })

    // Use ResizeObserver to detect container size changes (e.g., sidebar open/close)
    const resizeObserver = new ResizeObserver(() => {
      debouncedResize()
    })

    resizeObserver.observe(containerRef.current)

    // Also listen to window resize
    window.addEventListener('resize', debouncedResize)

    return () => {
      if (resizeTimer) clearTimeout(resizeTimer)
      resizeObserver.disconnect()
      window.removeEventListener('resize', debouncedResize)
    }
  }, [isActive, terminal.id])

  // Focus when active and scroll to bottom
  useEffect(() => {
    if (isActive && xtermRef.current) {
      xtermRef.current.focus()
      xtermRef.current.scrollToBottom()
      userScrolledUpRef.current = false
    }
  }, [isActive])

  // Listen for snippet events (only when active)
  useEffect(() => {
    if (!isActive) return

    const handleSnippet = (e: CustomEvent<string>) => {
      if (e.detail) {
        window.electronAPI.terminal.write(terminal.id, e.detail)
      }
    }

    window.addEventListener('send-snippet', handleSnippet as EventListener)
    return () => window.removeEventListener('send-snippet', handleSnippet as EventListener)
  }, [isActive, terminal.id])

  return (
    <div
      className={`
        relative w-full h-full
        ${isActive ? 'block' : 'hidden'}
      `}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div
        ref={containerRef}
        className="w-full h-full bg-black/30 backdrop-blur-md p-2"
      />
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
