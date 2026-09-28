import { useEffect, useState } from 'react'
import { LivePill } from '@ds/desktop'
import type { RealtimeStatus } from '../../types'
import { useConnectivity } from '../hooks/useConnectivity'
import { useT } from '../i18n'

/**
 * Small live / reconnecting hint for a page that reads org-wide data. Combines the shared
 * connectivity gate state (from #125) with the org-agents realtime channel
 * health: only "live" when the backend is reachable AND the channel is
 * SUBSCRIBED. Any loss on either side reads as "Reconnecting…". Deliberately not
 * a blocking banner — the connectivity gate already owns hard offline states.
 */
export function LiveIndicator() {
  const t = useT()
  const { status: connectivity } = useConnectivity()
  const [realtime, setRealtime] = useState<RealtimeStatus>('reconnecting')

  useEffect(() => {
    // Seed from the current channel health so a dashboard mounted after the
    // channel already went SUBSCRIBED isn't stuck on "Reconnecting…" until the
    // next push. Then keep it fresh via the status events.
    let active = true
    window.electronAPI.org.getRealtimeStatus().then((status) => {
      if (active) setRealtime(status)
    }).catch(() => { /* stays at 'reconnecting' default */ })
    const unsubscribe = window.electronAPI.org.onRealtimeStatus(setRealtime)
    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  const isLive = connectivity === 'ok' && realtime === 'live'

  return (
    <LivePill
      tone={isLive ? 'live' : 'waiting'}
      label={isLive ? t('live.live') : t('live.reconnecting')}
      title={isLive ? t('live.liveTitle') : t('live.reconnectingTitle')}
    />
  )
}
