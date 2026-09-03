import { useState, useEffect, useCallback, useRef } from 'react'
import type { ConnectivityStatus } from '../../preload'

export type GateStatus = ConnectivityStatus | 'checking'

/** Cadence of the probe while the backend answers. */
const POLL_INTERVAL_MS = 20_000
/** Cadence while a failure streak is running — recover fast, then slow down. */
export const RETRY_INTERVAL_MS = 5_000
/**
 * Consecutive failed probes before 'unreachable' is believed. One failed request
 * is not an outage: a token refresh, a wifi handover or a laptop waking up all
 * drop a single call, and reporting those as offline made the app flap for users
 * whose connection never actually went away.
 */
export const FAILURES_BEFORE_OFFLINE = 3

export interface GateState {
  status: GateStatus
  /**
   * Whether this session ever reached the backend. It tells a cold start with
   * nothing hydrated (hard block) from a running app that lost the connection
   * (keep rendering the caches, warn in a toast).
   */
  everOk: boolean
  /** Length of the current failure streak; 0 as soon as a probe answers. */
  failures: number
}

export const INITIAL_GATE: GateState = { status: 'checking', everOk: false, failures: 0 }

/**
 * Folds one probe result into the gate state. A failed probe only surfaces as
 * 'unreachable' once FAILURES_BEFORE_OFFLINE of them land in a row — a shorter
 * streak keeps the last known status, so a blip never reaches the interface.
 */
export function reduceGate(state: GateState, probe: ConnectivityStatus): GateState {
  if (probe === 'unreachable') {
    const failures = state.failures + 1
    return {
      ...state,
      failures,
      status: failures >= FAILURES_BEFORE_OFFLINE ? 'unreachable' : state.status,
    }
  }
  // 'unauthorized' un-hydrates: the main process resets the caches for the next
  // user, so a connection lost on the login screen must block rather than
  // re-render the signed-out app over empty caches.
  if (probe === 'unauthorized') return { status: probe, everOk: false, failures: 0 }
  return { status: probe, everOk: state.everOk || probe === 'ok', failures: 0 }
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
