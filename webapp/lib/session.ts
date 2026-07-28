'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Session } from '@supabase/supabase-js'
import { isPlatformAdmin } from './admin'
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
 * The redirect half of every guard on this page, expressed once: when `ok` is
 * definitively false the visitor is sent to `destination`, and `pending` stays true
 * through the redirect so a caller rendering a placeholder never paints a frame of
 * the page it is about to leave — no login form flashing at someone already signed
 * in, no back-office chrome for someone on their way to the dashboard.
 *
 * `undefined` means "not known yet", which is why the condition is tri-state rather
 * than a boolean: "not an admin" and "we have not asked yet" both suppress the
 * page, but only one of them redirects.
 */
function useRedirectUnless(ok: boolean | undefined, destination: string) {
  const router = useRouter()
  const rejected = ok === false

  useEffect(() => {
    if (!rejected) return
    router.replace(destination)
  }, [rejected, destination, router])

  return ok === undefined || rejected
}

/**
 * Sends the visitor away when the session doesn't match what the page is for,
 * in either direction: signed-in pages bounce guests to the login page, and the
 * login page bounces signed-in users to the dashboard.
 */
function useSessionGuard(requireSession: boolean) {
  const { session, loading } = useSession()

  const matches = loading ? undefined : requireSession === !!session
  const pending = useRedirectUnless(matches, requireSession ? LOGIN_PATH : HOME_PATH)

  return { session, pending }
}

/** Guard for signed-in pages: no session → off to the login page. */
export function useRequireSession() {
  return useSessionGuard(true)
}

/** Guard for the login page: already signed in → off to the dashboard. */
export function useRequireGuest() {
  return useSessionGuard(false)
}

/**
 * Guard for the platform back-office: a session AND a `platform_admins` row.
 * Anyone else is sent to the dashboard — not to the login page, since they are
 * signed in perfectly legitimately, just not for this.
 *
 * Two checks, ONE `pending` flag. Exposing them separately would let a caller
 * render the page during the window where the session has resolved but the admin
 * answer has not, which is a frame of back-office chrome for someone who is about
 * to be redirected. `pending` stays true until both have landed.
 *
 * This is a discovery gate, not the access control. Every `admin_*` RPC re-checks
 * `is_platform_admin()` in the database and raises, so defeating this hook in the
 * console gets you an empty page and a row of errors — which is why it is safe to
 * decide it client-side at all.
 */
export function useRequirePlatformAdmin() {
  const { session, pending: sessionPending } = useRequireSession()
  // undefined = not asked yet (the question needs a session first).
  const [admin, setAdmin] = useState<boolean | undefined>(undefined)

  // Keyed on the user id, not the session object: a token refresh hands back a new
  // object for the same person, and re-asking on every refresh would be a round
  // trip for an answer that cannot have changed. A DIFFERENT id, on the other hand,
  // must drop the previous person's answer rather than render the page with it.
  const userId = session?.user.id

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    setAdmin(undefined)
    isPlatformAdmin().then((ok) => {
      if (!cancelled) setAdmin(ok)
    })
    return () => {
      cancelled = true
    }
  }, [userId])

  const adminPending = useRedirectUnless(admin, HOME_PATH)

  return { session, pending: sessionPending || adminPending }
}
