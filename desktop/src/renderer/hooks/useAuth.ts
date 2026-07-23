import { useState, useEffect, useCallback } from 'react'
import type { AuthStatus } from '../../types'

const INITIAL: AuthStatus = { enabled: false, loggedIn: false }

/**
 * Optional cloud auth state. Subscribes to auth:statusChanged so login/logout in
 * one place propagates everywhere. The app is fully functional when logged out —
 * consumers should treat `enabled: false` as "cloud simply hidden".
 */
export function useAuth() {
  const [status, setStatus] = useState<AuthStatus>(INITIAL)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const s = await window.electronAPI.auth.status()
      setStatus(s)
    } catch {
      setStatus(INITIAL)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    const unsubscribe = window.electronAPI.auth.onStatusChanged(setStatus)
    return () => { unsubscribe() }
  }, [])

  const login = useCallback(
    (email: string, password: string) => window.electronAPI.auth.login(email, password),
    [],
  )

  const signup = useCallback(
    (email: string, password: string, opts?: { orgName?: string; invitationToken?: string }) =>
      window.electronAPI.auth.signup(email, password, opts),
    [],
  )

  const logout = useCallback(() => window.electronAPI.auth.logout(), [])

  return { status, loading, refresh, login, signup, logout }
}
