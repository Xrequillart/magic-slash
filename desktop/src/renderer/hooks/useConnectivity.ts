import { useState, useEffect, useCallback, useRef } from 'react'
import type { ConnectivityStatus } from '../../preload'

export type GateStatus = ConnectivityStatus | 'checking'

const RECHECK_INTERVAL_MS = 20_000

/**
 * Drives the mandatory cloud gate. Polls the backend reachability probe on an
 * interval AND on window focus, and subscribes to push updates from the main
 * process. The whole app stays blocked until this reports 'ok':
 *  - 'checking'     initial probe in flight → loading.
 *  - 'ok'           reachable + authed → app is allowed to render.
 *  - 'unauthorized' logged out / rejected session → auth wall.
 *  - 'unreachable'  backend down / offline → "connection lost" block (no grace).
 *  - 'disabled'     Supabase not configured → "cloud not configured" block.
 */
export function useConnectivity() {
  const [status, setStatus] = useState<GateStatus>('checking')
  const inFlight = useRef(false)

  const recheck = useCallback(async () => {
    if (inFlight.current) return
    inFlight.current = true
    try {
      const next = await window.electronAPI.connectivity.check()
      setStatus(next)
    } catch {
      setStatus('unreachable')
    } finally {
      inFlight.current = false
    }
  }, [])

  // Initial probe + interval.
  useEffect(() => {
    recheck()
    const timer = window.setInterval(recheck, RECHECK_INTERVAL_MS)
    return () => window.clearInterval(timer)
  }, [recheck])

  // Re-check when the window regains focus.
  useEffect(() => {
    const onFocus = () => recheck()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [recheck])

  // Push updates from the main process (e.g. after login/logout).
  useEffect(() => {
    const unsubscribe = window.electronAPI.connectivity.onStatusChanged(setStatus)
    return () => { unsubscribe() }
  }, [])

  return { status, recheck }
}
