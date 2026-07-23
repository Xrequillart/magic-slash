import type { Session, SupabaseClient } from '@supabase/supabase-js'
import type { AuthStatus } from '../../types'
import { getSupabaseClient, isCloudEnabled } from './supabase-client'
import { saveSession, loadSession, clearSession, type StoredSession } from './session-store'

const DISABLED: AuthStatus = { enabled: false, loggedIn: false }

function toStored(session: Session): StoredSession {
  return {
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_at: session.expires_at,
    user: session.user ? { id: session.user.id, email: session.user.email } : undefined,
  }
}

function toStatus(stored: StoredSession): AuthStatus {
  return {
    enabled: true,
    loggedIn: true,
    user: stored.user ? { id: stored.user.id, email: stored.user.email } : undefined,
  }
}

/**
 * Returns a Supabase client with the persisted session applied, or null when
 * cloud is disabled or there is no session. Never throws. Restoring the session
 * lets the SDK refresh the access token transparently for org queries.
 */
export async function getAuthedClient(): Promise<SupabaseClient | null> {
  const client = getSupabaseClient()
  if (!client) return null

  const stored = loadSession()
  if (!stored) return null

  try {
    const { data, error } = await client.auth.setSession({
      access_token: stored.access_token,
      refresh_token: stored.refresh_token,
    })
    if (error) {
      // The refresh token was rejected (expired/revoked). Drop the stale session
      // so getStatus() stops reporting a signed-in state the app can't act on.
      console.warn('[cloud] stored session rejected, clearing:', error.message)
      clearSession()
      return null
    }
    if (!data.session) return null
    // The token may have been refreshed — persist the latest.
    saveSession(toStored(data.session))
    return client
  } catch (error) {
    // Transient failure (e.g. offline): keep the session so the user stays
    // logged in and can retry once connectivity is back.
    console.error('[cloud] Failed to restore session:', error)
    return null
  }
}

/** Current auth status derived from the persisted session. Never throws. */
export async function getStatus(): Promise<AuthStatus> {
  if (!isCloudEnabled()) return DISABLED
  const stored = loadSession()
  if (!stored) return { enabled: true, loggedIn: false }
  return toStatus(stored)
}

export async function signIn(email: string, password: string): Promise<AuthStatus> {
  const client = getSupabaseClient()
  if (!client) throw new Error('Cloud features are not available')

  const { data, error } = await client.auth.signInWithPassword({ email, password })
  if (error) throw new Error(error.message)
  if (!data.session) throw new Error('Sign-in did not return a session')

  const stored = toStored(data.session)
  saveSession(stored)
  return toStatus(stored)
}

interface SignUpOptions {
  orgName?: string
  invitationToken?: string
}

/**
 * Sign up with email/password. Two branches:
 *  - normal sign-up: creates a personal org via the create_organization RPC.
 *  - invitation sign-up (invitationToken present): does NOT create a personal
 *    org — the invitee joins the inviting org via acceptInvitation afterwards.
 *
 * When email confirmation is enabled in Supabase, sign-up returns no session; in
 * that case we surface loggedIn:false so the UI can prompt the user to confirm.
 */
export async function signUp(email: string, password: string, options: SignUpOptions = {}): Promise<AuthStatus> {
  const client = getSupabaseClient()
  if (!client) throw new Error('Cloud features are not available')

  const { data, error } = await client.auth.signUp({ email, password })
  if (error) throw new Error(error.message)

  // No session → email confirmation required. Nothing to persist yet.
  if (!data.session) {
    return { enabled: true, loggedIn: false }
  }

  const stored = toStored(data.session)
  saveSession(stored)

  // Normal sign-up creates a personal org. Invitation sign-up skips this: the
  // invitee joins the existing org through accept_invitation.
  if (!options.invitationToken) {
    const orgName = options.orgName?.trim() || `${email.split('@')[0]}'s org`
    const { error: rpcError } = await client.rpc('create_organization', { org_name: orgName })
    if (rpcError) {
      // Surface the failure but keep the session — the user is still signed in.
      console.error('[cloud] create_organization failed:', rpcError)
      throw new Error(`Account created but org setup failed: ${rpcError.message}`)
    }
  }

  return toStatus(stored)
}

export async function signOut(): Promise<AuthStatus> {
  const client = getSupabaseClient()
  if (client) {
    try {
      await client.auth.signOut()
    } catch (error) {
      console.error('[cloud] signOut error (ignored):', error)
    }
  }
  clearSession()
  return isCloudEnabled() ? { enabled: true, loggedIn: false } : DISABLED
}
