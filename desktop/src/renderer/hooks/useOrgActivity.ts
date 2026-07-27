import { useState, useEffect, useCallback, useRef } from 'react'
import type { OrgActivity } from '../../types'
import { useStore } from '../store'

/** Full window fetched once; the Team page narrows to 7/30/90 days client-side. */
const WINDOW_MS = 90 * 24 * 60 * 60 * 1000

/**
 * An agent status change is exactly the moment a new activity event was written,
 * so it doubles as our "something happened" signal. The delay is trailing and
 * generous on purpose: metadata writes come in bursts during an active session,
 * and refetching per burst-member would hammer the DB for no added insight.
 */
const REFETCH_DEBOUNCE_MS = 20_000

/**
 * Org-wide activity events for the Team page's flow metrics. Loaded via
 * org.getActivity() and reloaded whenever the active org changes.
 *
 * Reading is open to any org member (the RLS select policy is scoped by org, not
 * by user), and unlike usage stats there is no opt-in gate at all — activity is
 * how the workflow is tracked.
 *
 * Deliberately NOT a second realtime subscription: adding activity_events to the
 * Realtime publication would need a migration and would fire on every event. The
 * debounced piggyback on the org-agents feed gets near-live numbers for free.
 */
export function useOrgActivity() {
  const activeOrgId = useStore((s) => s.activeOrg?.id)
  const [activity, setActivity] = useState<OrgActivity>({ events: [], capped: false, since: new Date(0).toISOString() })
  const [loading, setLoading] = useState(true)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setActivity(await window.electronAPI.org.getActivity(Date.now() - WINDOW_MS))
    } catch {
      setActivity({ events: [], capped: false, since: new Date(Date.now() - WINDOW_MS).toISOString() })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load, activeOrgId])

  useEffect(() => {
    const unsubscribe = window.electronAPI.org.onAgentsChanged(() => {
      // Trailing debounce: every change during a burst pushes the refetch back,
      // so one fetch lands once the burst has actually settled.
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        timerRef.current = null
        void load()
      }, REFETCH_DEBOUNCE_MS)
    })
    return () => {
      unsubscribe()
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [load])

  return { events: activity.events, capped: activity.capped, since: activity.since, loading, refresh: load }
}
