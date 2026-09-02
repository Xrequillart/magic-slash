import { useEffect, useLayoutEffect, useRef, useState, useCallback } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import '@xterm/xterm/css/xterm.css'
import type { TerminalInfo } from '../../types'
import { formatDroppedPaths } from '../utils/formatDroppedPaths'
import { useThemeTokens, type ThemeTokens } from '../theme'
import { useT } from '../i18n'

/**
 * xterm wants colour values, not classes, so the terminal reads the theme
 * registry directly. Background stays transparent in every theme — the window's
 * own vibrancy shows through — and only the ink and the sixteen ANSI slots move.
 */
function xtermTheme(tokens: ThemeTokens) {
  return {
    background: 'transparent',
    cursor: 'transparent', // Hidden — Claude Code draws its own.
    cursorAccent: 'transparent',
    ...tokens.terminal,
  }
}

interface TerminalViewProps {
  terminal: TerminalInfo
  isVisible: boolean
  isFocused: boolean
  onFocusRequest?: () => void
}

export function TerminalView({ terminal, isVisible, isFocused, onFocusRequest }: TerminalViewProps) {
  const t = useT()
  const containerRef = useRef<HTMLDivElement>(null)
  const xtermRef = useRef<Terminal | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const cleanupRef = useRef<(() => void) | null>(null)
  const userScrolledUpRef = useRef(false)
  const inAlternateScreenRef = useRef(false)
  const [isDragOver, setIsDragOver] = useState(false)
  const [showScrollButton, setShowScrollButton] = useState(false)
  const dragCounterRef = useRef(0)
  // Geometry the terminal was last fitted to, and the grid that fit produced.
  // Both are what make an agent switch free: a fit is skipped when the container
  // has not moved, and the PTY is told only when the grid genuinely changed.
  const lastFitRef = useRef({ width: 0, height: 0 })
  const lastGridRef = useRef({ cols: 0, rows: 0 })
  // Held in refs so the effects below can reach the current one without listing
  // it as a dependency: re-running them would tear down the xterm session.
  const fitNowRef = useRef<() => boolean>(() => false)
  // Cancels the mount-time retry loop above, so a dialog dismissed in its first second
  // does not leave a frame callback reaching for a disposed terminal.
  const cancelMountFitRef = useRef<(() => void) | null>(null)
  const cancelPendingFitRef = useRef<(() => void) | null>(null)
  // Whether this terminal has been hidden since it was last shown, i.e. whether
  // the repaint below is owed anything at all.
  const wasHiddenRef = useRef(false)

  const tokens = useThemeTokens()
  // Held in a ref for the creation effect below: depending on the tokens there
  // would tear the terminal down and lose the session on every theme change.
  const tokensRef = useRef(tokens)
  tokensRef.current = tokens

  /**
   * Fit the terminal to its container, once, right now. Answers whether the container
   * is now known to be fitted — false means "ask again", not "nothing to do".
   *
   * Three guards matter. An unchanged container costs nothing, so the frames where
   * only the visibility flipped do no work at all. The PTY hears about a resize only
   * when the grid actually moved: a SIGWINCH makes Claude Code repaint its entire UI
   * and re-wrap its history, so one that changes no dimension is pure jank.
   *
   * And the geometry is recorded only once the fit can ACTUALLY happen. `FitAddon`
   * gives up silently when the renderer has not measured a character cell yet — it
   * returns no dimensions and resizes nothing — which is the state a terminal is in
   * for the first frames after `open()`. Recording the container's size for a fit that
   * did nothing was self-poisoning: every later attempt saw the same size, took the
   * early return, and left the terminal at xterm's default 24 rows with the rest of
   * the box empty under it. Nothing corrected it either, because a ResizeObserver
   * watching a box that never changes has nothing to report.
   */
  const fitNow = useCallback((): boolean => {
    const container = containerRef.current
    const xterm = xtermRef.current
    const fitAddon = fitAddonRef.current
    if (!container || !xterm || !fitAddon) return false

    const { offsetWidth, offsetHeight } = container
    if (offsetWidth <= 0 || offsetHeight <= 0) return false
    if (offsetWidth === lastFitRef.current.width && offsetHeight === lastFitRef.current.height) return true

    const proposed = fitAddon.proposeDimensions()
    if (!proposed || !Number.isFinite(proposed.cols) || !Number.isFinite(proposed.rows)) return false

    lastFitRef.current = { width: offsetWidth, height: offsetHeight }

    fitAddon.fit()
    const { cols, rows } = xterm
    if (cols !== lastGridRef.current.cols || rows !== lastGridRef.current.rows) {
      lastGridRef.current = { cols, rows }
      window.electronAPI.terminal.resize(terminal.id, cols, rows)
    }
    return true
  }, [terminal.id])
  fitNowRef.current = fitNow

  // A live terminal is repainted in place instead.
  useEffect(() => {
    if (xtermRef.current) xtermRef.current.options.theme = xtermTheme(tokens)
  }, [tokens])
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
      theme: xtermTheme(tokensRef.current),
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

    // Two frames for the browser to compute the layout (sidebar, flex, dialog), then
    // as many more as it takes for xterm to have measured a character cell — until
    // then a fit resizes nothing, and there is no second event coming to catch it: a
    // terminal opened into a box that never changes size again (a dialog, above all)
    // would keep xterm's default 24 rows for as long as it stayed open. Bounded at a
    // second, because a terminal that cannot measure itself by then is not going to.
    let frames = 0
    let pendingFit = 0
    const fitWhenMeasurable = () => {
      if (fitNowRef.current() || ++frames > 60) return
      pendingFit = requestAnimationFrame(fitWhenMeasurable)
    }
    pendingFit = requestAnimationFrame(() => {
      pendingFit = requestAnimationFrame(fitWhenMeasurable)
    })
    cancelMountFitRef.current = () => cancelAnimationFrame(pendingFit)

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
      cancelMountFitRef.current?.()
      cancelMountFitRef.current = null
      containerRef.current?.removeEventListener('copy', copyHandler)
      fitAddon.dispose()
      webLinksAddon.dispose()
      xterm.dispose()
    }
  }, [terminal.id])

  // Handle resize — ResizeObserver on the container, debounced.
  //
  // The observer stays connected while the terminal is HIDDEN, which it did not
  // before. A background agent that ignored layout changes came back with a stale
  // grid, and the fit resolving that staleness landed its SIGWINCH — a full Claude
  // Code repaint — on the very frame the user switched to it. Tracking layout in
  // the background costs one debounced fit nobody is looking at, and is what makes
  // the switch itself free.
  useEffect(() => {
    if (!containerRef.current) return

    let resizeTimer: ReturnType<typeof setTimeout> | null = null

    const cancelPending = () => {
      if (resizeTimer) {
        clearTimeout(resizeTimer)
        resizeTimer = null
      }
    }

    const debouncedResize = () => {
      cancelPending()
      resizeTimer = setTimeout(() => fitNowRef.current(), 200)
    }

    const resizeObserver = new ResizeObserver(debouncedResize)
    resizeObserver.observe(containerRef.current)
    window.addEventListener('resize', debouncedResize)
    cancelPendingFitRef.current = cancelPending

    return () => {
      cancelPending()
      cancelPendingFitRef.current = null
      resizeObserver.disconnect()
      window.removeEventListener('resize', debouncedResize)
    }
  }, [terminal.id])

  // Becoming visible: fit in the same frame the switch commits.
  //
  // A layout effect, and not the pair of requestAnimationFrames this replaces:
  // the visibility flip and everything else the switch moved — the info sidebar
  // derives its width from the KIND of agent — are already committed by the time
  // this runs, so the geometry read here is the final one. The two frames it used
  // to wait were two frames of a terminal still sized for the agent just left,
  // and the 200ms debounce behind them was the rest of the lag.
  //
  // Any fit the observer queued for the same layout change is dropped: this one
  // has already covered it, and letting it fire would resize a second time.
  useLayoutEffect(() => {
    if (!isVisible) {
      wasHiddenRef.current = true
      return
    }
    cancelPendingFitRef.current?.()
    fitNow()

    if (!wasHiddenRef.current) return
    wasHiddenRef.current = false

    // Kept from the version this replaces, and kept SYNCHRONOUS. The buffer is
    // up to date either way — the data listener writes to a hidden terminal like
    // any other — but whether xterm's renderer keeps painting while the element
    // is `visibility: hidden` is not ours to decide: its pause is driven by an
    // IntersectionObserver, which watches geometry and not visibility, and a
    // renderer that never unpauses would show a stale screen on every switch.
    // One repaint of the visible rows is cheap insurance against that, and doing
    // it here rather than a frame later is what keeps the FIRST painted frame of
    // the switch the correct one.
    xtermRef.current?.refresh(0, xtermRef.current.rows - 1)
    // Only for someone who was already at the bottom: an agent left mid-scroll
    // comes back where it was left, which the unconditional jump this replaces
    // took away.
    if (!userScrolledUpRef.current) xtermRef.current?.scrollToBottom()
  }, [isVisible, fitNow])

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
        className="w-full h-full bg-surface-sunken p-2"
      />
      {showScrollButton && (
        <button
          onClick={() => {
            xtermRef.current?.scrollToBottom()
            userScrolledUpRef.current = false
            setShowScrollButton(false)
          }}
          className="absolute bottom-4 right-4 z-20 bg-ink/15 hover:bg-ink/25 text-ink/70 px-3 py-1.5 rounded-full text-xs transition-all duration-200"
        >
          {t('terminalView.scrollToBottom')}
        </button>
      )}
      {isDragOver && (
        <div className="absolute inset-0 drop-overlay border-2 border-dashed rounded-lg flex items-center justify-center pointer-events-none z-10">
          <span className="text-on-brand text-sm font-medium bg-black/70 px-4 py-2 rounded-lg">
            {t('terminalView.dropFiles')}
          </span>
        </div>
      )}
    </div>
  )
}
