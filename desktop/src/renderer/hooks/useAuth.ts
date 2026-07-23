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

  const requestPasswordReset = useCallback(
    (email: string) => window.electronAPI.auth.requestPasswordReset(email),
    [],
  )

  const confirmPasswordReset = useCallback(
    (email: string, code: string, newPassword: string) =>
      window.electronAPI.auth.confirmPasswordReset(email, code, newPassword),
    [],
  )

  const updatePassword = useCallback(
    (newPassword: string) => window.electronAPI.auth.updatePassword(newPassword),
    [],
  )

  const requestEmailChange = useCallback(
    (newEmail: string) => window.electronAPI.auth.requestEmailChange(newEmail),
    [],
  )

  const confirmEmailChange = useCallback(
    async (newEmail: string, code: string) => {
      const s = await window.electronAPI.auth.confirmEmailChange(newEmail, code)
      // statusChanged also fires from main, but refresh so this caller sees it too.
      await refresh()
      return s
    },
    [refresh],
  )

  const deleteAccount = useCallback(
    async () => {
      const s = await window.electronAPI.auth.deleteAccount()
      await refresh()
      return s
    },
    [refresh],
  )

  return {
    status,
    loading,
    refresh,
    login,
    signup,
    logout,
    requestPasswordReset,
    confirmPasswordReset,
    updatePassword,
    requestEmailChange,
    confirmEmailChange,
    deleteAccount,
  }
}
