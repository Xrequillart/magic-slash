import { useState, useEffect, useCallback, useRef } from 'react'
import type { ConnectivityStatus } from '../../preload'
import {
  FAILURES_BEFORE_OFFLINE,
  INITIAL_GATE,
  POLL_INTERVAL_MS,
  RETRY_INTERVAL_MS,
  reduceGate,
  type GateState,
  type GateStatus,
} from './connectivityGate'

/**
 * The gate's state, its cadences and its reducer moved to `./connectivityGate` —
 * a module with no runtime imports — and are re-exported here so existing callers
 * keep one import site.
 *
 * The move is not tidying: the root Vitest suite runs on the ROOT `node_modules`
 * and CI installs neither `desktop/node_modules` nor `webapp/node_modules`, so a
 * test importing the reducer FROM THIS FILE reached line 1 and died on
 * `Cannot find package 'react'` — every assertion passing, the run still red.
 * See the header of `./connectivityGate` for the full account.
 */
export {
  FAILURES_BEFORE_OFFLINE,
  INITIAL_GATE,
  RETRY_INTERVAL_MS,
  reduceGate,
  type GateState,
  type GateStatus,
}

/**
 * Drives the cloud gate. Polls the backend reachability probe on an interval AND
 * on window focus, and subscribes to push updates from the main process:
 *  - 'checking'     initial probe in flight → loading.
 *  - 'ok'           reachable + authed → app renders.
 *  - 'unauthorized' logged out / rejected session → auth wall.
 *  - 'unreachable'  backend down / offline, confirmed by a failure streak.
 *  - 'disabled'     Supabase not configured → "cloud not configured" block.
 */
export function useConnectivity() {
  const [gate, setGate] = useState<GateState>(INITIAL_GATE)
  // Mirror of the state the poll loop reads synchronously to pick its next delay.
  const gateRef = useRef<GateState>(INITIAL_GATE)
  const inFlight = useRef(false)

  // Funnels every probe — polled or pushed — through the streak, so a push from
  // the main process cannot bypass the grace the poll respects.
  const apply = useCallback((probe: ConnectivityStatus) => {
    gateRef.current = reduceGate(gateRef.current, probe)
    setGate(gateRef.current)
  }, [])

  const recheck = useCallback(async () => {
    if (inFlight.current) return
    inFlight.current = true
    try {
      apply(await window.electronAPI.connectivity.check())
    } catch {
      apply('unreachable')
    } finally {
      inFlight.current = false
    }
  }, [apply])

  // Initial probe, then a self-scheduling loop: the delay is picked after each
  // probe, so a streak retries at RETRY_INTERVAL_MS and a healthy link settles
  // back to POLL_INTERVAL_MS.
  useEffect(() => {
    let cancelled = false
    let timer: number | undefined
    const tick = async () => {
      await recheck()
      if (cancelled) return
      timer = window.setTimeout(tick, gateRef.current.failures > 0 ? RETRY_INTERVAL_MS : POLL_INTERVAL_MS)
    }
    void tick()
    return () => {
      cancelled = true
      if (timer !== undefined) window.clearTimeout(timer)
    }
  }, [recheck])

  // Re-check when the window regains focus.
  useEffect(() => {
    const onFocus = () => { void recheck() }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [recheck])

  // Push updates from the main process (e.g. after login/logout).
  useEffect(() => {
    const unsubscribe = window.electronAPI.connectivity.onStatusChanged(apply)
    return () => { unsubscribe() }
  }, [apply])

  return { status: gate.status, everOk: gate.everOk, recheck }
}
