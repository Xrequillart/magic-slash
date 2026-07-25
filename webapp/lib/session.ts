'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Session } from '@supabase/supabase-js'
import { getSupabase } from './supabase'

/** Where each half of the guard sends people. */
export const LOGIN_PATH = '/'
export const HOME_PATH = '/dashboard'

/**
 * Tracks the current Supabase auth session in the browser. `loading` is true
 * until the initial session read resolves, so pages can avoid redirect flicker.
 */
export function useSession() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = getSupabase()
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  return { session, loading }
}

/**
 * Sends the visitor away when the session doesn't match what the page is for,
 * in either direction: signed-in pages bounce guests to the login page, and the
 * login page bounces signed-in users to the dashboard.
 *
 * `pending` covers both "still reading the session" and "redirect in flight", so
 * a caller that renders a placeholder while it is true never paints the wrong
 * page for a frame — no login form flashing at someone already signed in.
 */
function useSessionGuard(requireSession: boolean) {
  const router = useRouter()
  const { session, loading } = useSession()

  const mismatched = !loading && (requireSession ? !session : !!session)

  useEffect(() => {
    if (!mismatched) return
    router.replace(requireSession ? LOGIN_PATH : HOME_PATH)
  }, [mismatched, requireSession, router])

  return { session, pending: loading || mismatched }
}

/** Guard for signed-in pages: no session → off to the login page. */
export function useRequireSession() {
  return useSessionGuard(true)
}

/** Guard for the login page: already signed in → off to the dashboard. */
export function useRequireGuest() {
  return useSessionGuard(false)
}
