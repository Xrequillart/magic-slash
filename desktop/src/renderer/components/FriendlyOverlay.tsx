import { useStreamJsonParser } from '../hooks/useStreamJsonParser'

interface FriendlyOverlayProps {
  terminalId: string | null
}

export function FriendlyOverlay({ terminalId }: FriendlyOverlayProps) {
  const { events } = useStreamJsonParser(terminalId)

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

      {/* Fixed input zone at bottom */}
      <div className="shrink-0 bg-white/5 mx-2 mb-4 px-4 py-3 rounded-lg">
        <span className="text-text-secondary text-sm">Input will be connected in a future sub-issue</span>
      </div>
    </div>
  )
}
