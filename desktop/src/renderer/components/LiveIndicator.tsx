import { useEffect, useState } from 'react'
import type { RealtimeStatus } from '../../types'
import { useConnectivity } from '../hooks/useConnectivity'

/**
 * Small live / reconnecting hint for the team dashboard. Combines the shared
 * connectivity gate state (from #125) with the org-agents realtime channel
 * health: only "live" when the backend is reachable AND the channel is
 * SUBSCRIBED. Any loss on either side reads as "Reconnecting…". Deliberately not
 * a blocking banner — the connectivity gate already owns hard offline states.
 */
export function LiveIndicator() {
  const { status: connectivity } = useConnectivity()
  const [realtime, setRealtime] = useState<RealtimeStatus>('reconnecting')

  useEffect(() => {
    // Seed from the current channel health so a dashboard mounted after the
    // channel already went SUBSCRIBED isn't stuck on "Reconnecting…" until the
    // next push. Then keep it fresh via the status events.
    let active = true
    window.electronAPI.org.getRealtimeStatus().then((status) => {
      if (active) setRealtime(status)
    })
    const unsubscribe = window.electronAPI.org.onRealtimeStatus(setRealtime)
    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  const isLive = connectivity === 'ok' && realtime === 'live'

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${
        isLive ? 'bg-green/10 text-green' : 'bg-yellow/10 text-yellow'
      }`}
      title={isLive ? 'Real-time updates' : 'Reconnecting to the real-time feed…'}
    >
      <span className="relative flex w-2 h-2">
        {isLive && (
          <span className="absolute inline-flex w-full h-full rounded-full bg-green opacity-75 animate-ping" />
        )}
        <span className={`relative inline-flex w-2 h-2 rounded-full ${isLive ? 'bg-green' : 'bg-yellow'}`} />
      </span>
      {isLive ? 'Live' : 'Reconnecting…'}
    </span>
  )
}
