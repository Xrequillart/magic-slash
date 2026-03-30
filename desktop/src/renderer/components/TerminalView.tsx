import { useEffect, useRef, useState, useCallback } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import '@xterm/xterm/css/xterm.css'
import type { TerminalInfo } from '../../types'
import { formatDroppedPaths } from '../utils/formatDroppedPaths'

interface TerminalViewProps {
  terminal: TerminalInfo
  isVisible: boolean
  isFocused: boolean
  onFocusRequest?: () => void
}

export function TerminalView({ terminal, isVisible, isFocused, onFocusRequest }: TerminalViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const xtermRef = useRef<Terminal | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const cleanupRef = useRef<(() => void) | null>(null)
  const userScrolledUpRef = useRef(false)
  const inAlternateScreenRef = useRef(false)
  const [isDragOver, setIsDragOver] = useState(false)
  const [showScrollButton, setShowScrollButton] = useState(false)
  const needsResizeRef = useRef(false)
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
        black: '#52525b',
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
      fontSize: 14,
      lineHeight: 1.0,
      minimumContrastRatio: 4.5,
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
        const { offsetWidth, offsetHeight } = containerRef.current
        if (offsetWidth > 0 && offsetHeight > 0) {
          fitAddonRef.current.fit()
          const { cols, rows } = xtermRef.current
          window.electronAPI.terminal.resize(terminal.id, cols, rows)
        }
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
      userScrolledUpRef.current = false
      setShowScrollButton(false)
    })

    // Check if user is near the bottom of the terminal
    const isNearBottom = (t: Terminal): boolean => {
      const buf = t.buffer.active
      return buf.viewportY >= buf.baseY - 5
    }

    // Track whether user has scrolled away from bottom
    const scrollHandler = xterm.onScroll(() => {
      const scrolledUp = !isNearBottom(xterm)
      userScrolledUpRef.current = scrolledUp
      setShowScrollButton(scrolledUp)
    })

    // Register the live data listener ONCE, outside the buffer restore promise chain
    const prevChunkTailRef = { current: '' }
    const unsubscribe = window.electronAPI.terminal.onData(({ id, data }) => {
      if (id === terminal.id) {
        // Detect alternate screen buffer transitions (handle split sequences)
        const combined = prevChunkTailRef.current + data
        if (combined.includes('\x1b[?1049h') || combined.includes('\x1b[?47h')) {
          inAlternateScreenRef.current = true
        }
        if (combined.includes('\x1b[?1049l') || combined.includes('\x1b[?47l')) {
          inAlternateScreenRef.current = false
          userScrolledUpRef.current = false
          setShowScrollButton(false)
        }
        // Detect screen clear
        if (combined.includes('\x1b[2J')) {
          userScrolledUpRef.current = false
          setShowScrollButton(false)
        }
        prevChunkTailRef.current = data.slice(-20)

        xterm.write(data, () => {
          if (!userScrolledUpRef.current && !inAlternateScreenRef.current) {
            xterm.scrollToBottom()
          }
        })
      }
    })

    cleanupRef.current = () => {
      unsubscribe()
      scrollHandler.dispose()
    }

    // Restore the buffer asynchronously
    window.electronAPI.terminal.getBuffer(terminal.id).then((buffer) => {
      if (buffer && buffer.length > 0) {
        xterm.write(buffer, () => {
          xterm.scrollToBottom()
        })
      }
    }).catch((error) => {
      console.error('Failed to restore terminal buffer:', error)
    })

    // Handle copy to preserve trailing spaces
    const copyHandler = (e: ClipboardEvent) => {
      if (xterm.hasSelection()) {
        e.preventDefault()
        e.clipboardData?.setData('text/plain', xterm.getSelection())
      }
    }
    containerRef.current.addEventListener('copy', copyHandler)

    return () => {
      if (cleanupRef.current) {
        cleanupRef.current()
      }
      containerRef.current?.removeEventListener('copy', copyHandler)
      fitAddon.dispose()
      webLinksAddon.dispose()
      xterm.dispose()
    }
  }, [terminal.id])

  // Handle resize - use ResizeObserver to detect container size changes
  useEffect(() => {
    if (!containerRef.current) return

    // When not visible, mark that a resize check is needed when we become visible
    if (!isVisible) {
      needsResizeRef.current = true
      return
    }

    let resizeTimer: ReturnType<typeof setTimeout> | null = null

    const prevColsRef = { current: xtermRef.current?.cols ?? 0 }
    const prevRowsRef = { current: xtermRef.current?.rows ?? 0 }

    const handleResize = () => {
      if (fitAddonRef.current && xtermRef.current && containerRef.current) {
        const { offsetWidth, offsetHeight } = containerRef.current
        if (offsetWidth > 0 && offsetHeight > 0) {
          fitAddonRef.current.fit()
          const { cols, rows } = xtermRef.current
          // Only send resize to PTY if dimensions actually changed,
          // to avoid unnecessary SIGWINCH that causes Claude Code to re-render
          if (cols !== prevColsRef.current || rows !== prevRowsRef.current) {
            prevColsRef.current = cols
            prevRowsRef.current = rows
            window.electronAPI.terminal.resize(terminal.id, cols, rows)
          }
        }
      }
    }

    const debouncedResize = () => {
      if (resizeTimer) clearTimeout(resizeTimer)
      resizeTimer = setTimeout(handleResize, 200)
    }

    // Initial fit: double-RAF ensures browser has computed layout after visibility change
    // (single RAF can fire before visibility change layout is resolved)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!fitAddonRef.current || !xtermRef.current || !containerRef.current) return

        handleResize()

        // When terminal was hidden, force a repaint. The xterm buffer is
        // already up-to-date (onData listener writes even while visibility:hidden),
        // only the visual renderer may be stale.
        if (needsResizeRef.current) {
          xtermRef.current.refresh(0, xtermRef.current.rows - 1)
          xtermRef.current.scrollToBottom()
        }

        needsResizeRef.current = false
      })
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
  }, [isVisible, terminal.id])

  // Focus when focused
  useEffect(() => {
    if (isFocused && xtermRef.current) {
      xtermRef.current.focus()
    }
  }, [isFocused])

  return (
    <div
      className={`
        absolute inset-0
        ${isVisible ? '' : 'invisible pointer-events-none'}
      `}
      onMouseDown={onFocusRequest}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div
        ref={containerRef}
        className="w-full h-full bg-black/30 backdrop-blur-md p-2"
      />
      {showScrollButton && (
        <button
          onClick={() => {
            xtermRef.current?.scrollToBottom()
            userScrolledUpRef.current = false
            setShowScrollButton(false)
          }}
          className="absolute bottom-4 right-4 z-20 bg-white/10 hover:bg-white/20 text-white/70 px-3 py-1.5 rounded-full text-xs backdrop-blur-sm transition-all duration-200"
        >
          Scroll to bottom
        </button>
      )}
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
