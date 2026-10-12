import { useEffect, useState } from 'react'
import { LivePill } from '@ds/desktop'
import type { RealtimeStatus } from '../../types'
import { useConnectivity } from '../hooks/useConnectivity'
import { useT } from '../i18n'

/**
 * Small live / reconnecting hint for a page that reads org-wide data. Combines the shared
 * connectivity gate state (from #125) with a realtime channel's health: only "live" when
 * the backend is reachable AND the channel is SUBSCRIBED. Any loss on either side reads as
 * "Reconnecting…". Deliberately not a blocking banner — the connectivity gate already owns
 * hard offline states.
 *
 * WHICH CHANNEL: the open plan's (#306) while a plan is open, since that is the one whose
 * health decides whether the faces and the edits on screen are current; the org-agents
 * channel otherwise (the plan list, which has no channel of its own). The plan's status is
 * `null` when no plan is open, and that is what makes the fallback.
 */
/**
 * A channel's health, seeded from its current value so an indicator mounted after the channel
 * already went SUBSCRIBED isn't stuck on "Reconnecting…" until the next push, then kept fresh
 * via the status events. A failed seed keeps `initial`. Subscribed once, at mount.
 */
function useChannelStatus<S>(
  get: () => Promise<S>,
  on: (callback: (status: S) => void) => () => void,
  initial: S,
): S {
  const [status, setStatus] = useState<S>(initial)
  useEffect(() => {
    let active = true
    get().then((next) => {
      if (active) setStatus(next)
    }).catch(() => { /* stays at the initial value */ })
    const unsubscribe = on(setStatus)
    return () => {
      active = false
      unsubscribe()
    }
  }, [])
  return status
}

export function LiveIndicator() {
  const t = useT()
  const { status: connectivity } = useConnectivity()
  const { org, plans } = window.electronAPI
  const realtime = useChannelStatus<RealtimeStatus>(org.getRealtimeStatus, org.onRealtimeStatus, 'reconnecting')
  // `null` when no plan is open: the org channel speaks then.
  const planLive = useChannelStatus<RealtimeStatus | null>(plans.live.getStatus, plans.live.onStatus, null)

  const isLive = connectivity === 'ok' && (planLive ?? realtime) === 'live'

  return (
    <LivePill
      tone={isLive ? 'live' : 'waiting'}
      label={isLive ? t('live.live') : t('live.reconnecting')}
      title={isLive ? t('live.liveTitle') : t('live.reconnectingTitle')}
    />
  )
}
