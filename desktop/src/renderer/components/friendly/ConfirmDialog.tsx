import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { ShieldQuestion } from 'lucide-react'
import type { StreamEvent } from '../../hooks/useStreamJsonParser'

interface ConfirmDialogProps {
  terminalId: string | null
  events: StreamEvent[]
  onActiveChange: (active: boolean) => void
}

interface ConfirmationRequest {
  question: string
  options: string[]
}

// Only scan the last N events to detect confirmations — avoids O(n) growth
const SCAN_WINDOW = 20

// Detect when Claude Code is waiting for user confirmation from stream-json events.
function detectConfirmation(events: StreamEvent[]): ConfirmationRequest | null {
  const start = Math.max(0, events.length - SCAN_WINDOW)

  for (let i = events.length - 1; i >= start; i--) {
    const event = events[i]

    if (event.type === 'system' && event.subtype === 'tool_use_permission') {
      return {
        question: (event.message as string) || 'Claude wants to execute a tool. Allow?',
        options: ['Yes', 'No'],
      }
    }

    if (event.type === 'content_block_start' && event.content_block?.type === 'tool_use') {
      const toolName = event.content_block.name || 'a tool'

      // Check if a completion event follows within the remaining window
      let hasCompleted = false
      for (let j = i + 1; j < events.length; j++) {
        const e = events[j]
        if (e.type === 'message_stop' || (e.type === 'message_delta' && e.delta?.stop_reason)) {
          hasCompleted = true
          break
        }
      }
      if (!hasCompleted) {
        return {
          question: `Allow Claude to use ${toolName}?`,
          options: ['Yes', 'No'],
        }
      }
    }
  }

  return null
}

export function ConfirmDialog({ terminalId, events, onActiveChange }: ConfirmDialogProps) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [dismissed, setDismissed] = useState(false)
  const prevConfirmRef = useRef<ConfirmationRequest | null>(null)

  const confirmation = useMemo(() => detectConfirmation(events), [events])

  // Reset dismissed state when a new confirmation appears
  useEffect(() => {
    if (confirmation && confirmation !== prevConfirmRef.current) {
      prevConfirmRef.current = confirmation
      setDismissed(false)
      setSelectedIndex(0)
    }
  }, [confirmation])

  const isActive = confirmation !== null && !dismissed

  // Notify parent of active state changes
  useEffect(() => {
    onActiveChange(isActive)
  }, [isActive, onActiveChange])

  const respond = useCallback((option: string) => {
    if (!terminalId) return
    // Send the response as lowercase 'y' or 'n' for Yes/No
    const response = option.toLowerCase().startsWith('y') ? 'y' : 'n'
    window.electronAPI.terminal.write(terminalId, response + '\r')
    setDismissed(true)
  }, [terminalId])

  // Keyboard navigation
  useEffect(() => {
    if (!isActive || !confirmation) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault()
        setSelectedIndex(prev => {
          if (e.key === 'ArrowLeft') return Math.max(0, prev - 1)
          return Math.min(confirmation.options.length - 1, prev + 1)
        })
      }

      if (e.key === 'Enter') {
        e.preventDefault()
        respond(confirmation.options[selectedIndex])
      }

      // Quick shortcuts: y for Yes, n for No
      if (e.key === 'y' || e.key === 'Y') {
        e.preventDefault()
        respond('yes')
      }
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault()
        respond('no')
      }

      if (e.key === 'Escape') {
        e.preventDefault()
        respond('no')
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isActive, confirmation, selectedIndex, respond])

  if (!isActive || !confirmation) return null

  return (
    <div className="shrink-0 mx-2 mb-2 p-3 bg-white/5 border border-white/10 rounded-lg animate-fade-in">
      <div className="flex items-start gap-2.5">
        <ShieldQuestion className="w-4 h-4 text-yellow shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-white mb-2.5">{confirmation.question}</p>
          <div className="flex items-center gap-2">
            {confirmation.options.map((option, i) => (
              <button
                key={option}
                onClick={() => respond(option)}
                className={`
                  px-3 py-1 text-xs font-medium rounded-md transition-all
                  ${i === selectedIndex
                    ? option.toLowerCase().startsWith('y')
                      ? 'bg-green/20 text-green border border-green/30'
                      : 'bg-red/20 text-red border border-red/30'
                    : 'bg-white/5 text-text-secondary border border-white/10 hover:bg-white/10'
                  }
                `}
              >
                {option}
                <kbd className="ml-1.5 text-[10px] opacity-50">
                  {option.toLowerCase().startsWith('y') ? 'Y' : 'N'}
                </kbd>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
