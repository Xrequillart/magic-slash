import { useState, useCallback, useMemo, useEffect } from 'react'
import { useStreamJsonParser } from '../hooks/useStreamJsonParser'
import type { StreamEvent } from '../types/streamEvents'
import { ChatInput } from './friendly/ChatInput'
import { ConfirmDialog } from './friendly/ConfirmDialog'

const FAKE_CONFIRM_EVENT: StreamEvent = {
  type: 'system',
  subtype: 'tool_use_permission',
  message: 'Claude wants to execute Bash(rm -rf node_modules). Allow?',
}

interface FriendlyOverlayProps {
  terminalId: string | null
}

export function FriendlyOverlay({ terminalId }: FriendlyOverlayProps) {
  const { events } = useStreamJsonParser(terminalId)
  const [isConfirmationActive, setIsConfirmationActive] = useState(false)
  const [debugConfirm, setDebugConfirm] = useState(false)

  // Listen for debug trigger from UpdateOverlay debug menu
  useEffect(() => {
    const handler = () => setDebugConfirm(true)
    window.addEventListener('debug:confirm-dialog', handler)
    return () => window.removeEventListener('debug:confirm-dialog', handler)
  }, [])

  const confirmEvents = useMemo<StreamEvent[]>(
    () => (debugConfirm ? [...events, FAKE_CONFIRM_EVENT] : events),
    [events, debugConfirm],
  )

  const handleConfirmActiveChange = useCallback((active: boolean) => {
    setIsConfirmationActive(active)
    if (!active) setDebugConfirm(false)
  }, [])

  return (
    <div className="h-full flex flex-col bg-black/30 backdrop-blur-md overflow-hidden">
      {/* Scrollable conversation area */}
      <div className="flex-1 overflow-y-auto p-4">
        {events.length === 0 ? (
          <div className="h-full flex items-center justify-center text-text-secondary text-sm">
            Overlay mode — events will appear here
          </div>
        ) : (
          <div className="space-y-2">
            {events.map((event, i) => (
              <div key={i} className="text-sm text-text-secondary font-mono">
                <span className="text-white/40">[{event.type}]</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confirmation dialog (above input) */}
      <ConfirmDialog
        terminalId={terminalId}
        events={confirmEvents}
        onActiveChange={handleConfirmActiveChange}
      />

      {/* Chat input bar */}
      <ChatInput
        terminalId={terminalId}
        disabled={isConfirmationActive}
      />

    </div>
  )
}
