import { useRef, useCallback, useEffect, useState } from 'react'
import { ArrowUp } from 'lucide-react'
import { MODE_CYCLE, type ClaudeMode } from './ModeLabel'

// PTY escape sequences for mode switching in Claude Code
// Shift+Tab sends the escape sequence that Claude Code interprets as mode cycle
const SHIFT_TAB_SEQUENCE = '\x1b[Z'

// Persist mode per terminal across remounts and refreshes
const STORAGE_KEY = 'magic-slash-terminal-modes'

function loadModes(): Map<string, ClaudeMode> {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    return raw ? new Map(JSON.parse(raw)) : new Map()
  } catch {
    return new Map()
  }
}

function saveModes(modes: Map<string, ClaudeMode>) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify([...modes]))
}

const terminalModes = loadModes()

const MODE_PILL: Record<ClaudeMode, { label: string; bg: string; text: string }> = {
  normal: { label: 'Normal', bg: 'bg-white/10', text: 'text-text-secondary' },
  'auto-accept': { label: 'Auto-accept', bg: 'bg-orange/20', text: 'text-orange' },
  plan: { label: 'Plan', bg: 'bg-purple/20', text: 'text-purple' },
}

interface ChatInputProps {
  terminalId: string | null
  disabled?: boolean
}

export function ChatInput({ terminalId, disabled = false }: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [value, setValue] = useState('')
  const [isMultiline, setIsMultiline] = useState(false)
  const [mode, setModeState] = useState<ClaudeMode>(
    () => (terminalId && terminalModes.get(terminalId)) || 'normal'
  )
  const [displayedMode, setDisplayedMode] = useState<ClaudeMode>(mode)
  const [slidePhase, setSlidePhase] = useState<'idle' | 'out' | 'in'>('idle')
  const [pillWidth, setPillWidth] = useState<number | undefined>(undefined)
  const measureRef = useRef<HTMLSpanElement>(null)
  const pillLabelRef = useRef<HTMLSpanElement>(null)

  // Measure initial width on mount
  useEffect(() => {
    if (pillLabelRef.current) {
      setPillWidth(pillLabelRef.current.offsetWidth)
    }
  }, [])

  // Animate mode label transition: slide-out-left → swap text → slide-in-right
  useEffect(() => {
    if (mode === displayedMode) return
    // Pre-measure target width via hidden span
    if (measureRef.current) {
      measureRef.current.textContent = MODE_PILL[mode].label
      setPillWidth(measureRef.current.offsetWidth)
    }
    setSlidePhase('out')
    const timer = setTimeout(() => {
      setDisplayedMode(mode)
      setSlidePhase('in')
      const timer2 = setTimeout(() => setSlidePhase('idle'), 200)
      return () => clearTimeout(timer2)
    }, 150)
    return () => clearTimeout(timer)
  }, [mode])

  // Wrap setMode to also persist to the Map
  const setMode = useCallback((updater: ClaudeMode | ((prev: ClaudeMode) => ClaudeMode)) => {
    setModeState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      if (terminalId) {
        terminalModes.set(terminalId, next)
        saveModes(terminalModes)
      }
      return next
    })
  }, [terminalId])

  // Restore mode when switching terminals
  useEffect(() => {
    if (terminalId) {
      setModeState(terminalModes.get(terminalId) || 'normal')
    }
  }, [terminalId])

  // Auto-resize textarea
  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    textarea.style.height = 'auto'
    const height = Math.min(textarea.scrollHeight, 200)
    textarea.style.height = `${height}px`
    setIsMultiline(textarea.scrollHeight > textarea.clientHeight || value.includes('\n'))
  }, [value])

  useEffect(() => {
    adjustHeight()
  }, [value, adjustHeight])

  // Focus input when enabled changes from disabled to enabled
  useEffect(() => {
    if (!disabled && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [disabled])

  const sendMessage = useCallback(() => {
    if (!terminalId || !value.trim()) return
    window.electronAPI.terminal.write(terminalId, value + '\r')
    setValue('')
  }, [terminalId, value])

  const cycleMode = useCallback(() => {
    if (!terminalId) return
    setMode(prev => MODE_CYCLE[(MODE_CYCLE.indexOf(prev) + 1) % MODE_CYCLE.length])
    window.electronAPI.terminal.write(terminalId, SHIFT_TAB_SEQUENCE)
  }, [terminalId])


  // Global Shift+Tab handler (works even when input is not focused)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab' && e.shiftKey) {
        e.preventDefault()
        cycleMode()
      }
    }

    document.addEventListener('keydown', handleGlobalKeyDown)
    return () => document.removeEventListener('keydown', handleGlobalKeyDown)
  }, [cycleMode])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Shift+Tab: handled globally, prevent default here too
    if (e.key === 'Tab' && e.shiftKey) {
      e.preventDefault()
      return
    }

    // Enter: send message (without shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
      return
    }

    // Escape: send to PTY (cancel current action)
    if (e.key === 'Escape') {
      e.preventDefault()
      if (terminalId) {
        window.electronAPI.terminal.write(terminalId, '\x1b')
      }
      setValue('')
      return
    }

    // Ctrl+C: interrupt
    if (e.key === 'c' && e.ctrlKey) {
      e.preventDefault()
      if (terminalId) {
        window.electronAPI.terminal.write(terminalId, '\x03')
      }
      setValue('')
      return
    }

    // Ctrl+D: EOF
    if (e.key === 'd' && e.ctrlKey) {
      e.preventDefault()
      if (terminalId) {
        window.electronAPI.terminal.write(terminalId, '\x04')
      }
      return
    }
  }, [terminalId, sendMessage, cycleMode])

  return (
    <div
      className={`shrink-0 bg-white/5 mx-3 mb-3 border ${
        mode === 'auto-accept'
          ? 'border-orange/30'
          : mode === 'plan'
            ? 'border-purple/30'
            : 'border-transparent'
      }`}
      style={{
        borderRadius: isMultiline ? '12px' : '9999px',
        transition: 'border-radius 300ms ease-in-out, box-shadow 200ms ease, border-color 200ms ease',
        boxShadow: mode === 'auto-accept'
          ? '0 0 12px 0 rgba(249, 115, 22, 0.3)'
          : mode === 'plan'
            ? '0 0 12px 0 rgba(168, 85, 247, 0.3)'
            : 'none',
      }}
    >
      <div className={`flex gap-2 pl-4 pr-3 py-2 ${isMultiline ? 'items-end' : 'items-center'}`}>
        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={disabled ? 'Waiting for response...' : 'Send a message...'}
          rows={1}
          spellCheck={false}
          className={`
            flex-1 bg-transparent text-white text-sm font-sans resize-none outline-none focus:ring-0 focus:outline-none
            placeholder:text-text-secondary py-1.5
            ${disabled ? 'opacity-40 cursor-not-allowed' : ''}
          `}
        />

        {/* Hidden span to measure target label width */}
        <span
          ref={measureRef}
          aria-hidden
          className="absolute invisible whitespace-nowrap text-[11px] font-medium"
        />

        {/* Active mode pill */}
        <button
          onClick={cycleMode}
          className={`shrink-0 h-[26px] rounded-full text-xs font-medium cursor-pointer overflow-hidden flex items-center justify-center ${MODE_PILL[mode].bg} ${MODE_PILL[mode].text}`}
          style={{
            width: pillWidth ? pillWidth + 20 : undefined,
            transition: 'width 250ms ease-in-out, background-color 200ms ease, color 200ms ease',
          }}
        >
          <span
            ref={pillLabelRef}
            className="inline-block"
            style={{
              transition: slidePhase === 'out'
                ? 'transform 150ms ease-in, opacity 150ms ease-in'
                : slidePhase === 'in'
                  ? 'none'
                  : 'none',
              transform: slidePhase === 'out' ? 'translateX(-100%)' : 'translateX(0)',
              opacity: slidePhase === 'out' ? 0 : 1,
              ...(slidePhase === 'in' && {
                animation: 'slideInFromRight 200ms ease-out forwards',
              }),
            }}
          >
            {MODE_PILL[displayedMode].label}
          </span>
        </button>

        {/* Send button */}
        <button
          onClick={sendMessage}
          disabled={disabled || !value.trim()}
          className={`
            shrink-0 w-[26px] h-[26px] flex items-center justify-center rounded-full transition-all
            ${value.trim() && !disabled
              ? 'bg-accent text-white hover:bg-accent-hover'
              : 'bg-bg-tertiary text-text-secondary cursor-not-allowed'
            }
          `}
        >
          <ArrowUp className="w-3.5 h-3.5" strokeWidth={2.5} />
        </button>
      </div>
    </div>
  )
}
