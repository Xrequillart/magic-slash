import type { Session, SupabaseClient } from '@supabase/supabase-js'
import type { AuthStatus } from '../../types'
import { getSupabaseClient, isCloudEnabled } from './supabase-client'
import { saveSession, loadSession, clearSession, type StoredSession } from './session-store'

const DISABLED: AuthStatus = { enabled: false, loggedIn: false }
const LOGGED_OUT: AuthStatus = { enabled: true, loggedIn: false }

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
 * Best-effort server-side sign-out. Local teardown (clearSession) is the
 * caller's responsibility; a failure here is logged and swallowed so it never
 * blocks the local state change.
 */
async function signOutQuietly(client: SupabaseClient, context: string): Promise<void> {
  try {
    await client.auth.signOut()
  } catch (error) {
    console.error(`[cloud] signOut ${context} (ignored):`, error)
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

/**
 * Current auth status derived from the persisted session. Never throws.
 *
 * When the stored access token has expired, we attempt a transparent refresh via
 * getAuthedClient() (which applies the session and persists the refreshed token).
 * getAuthedClient is offline-safe: it clears the session ONLY on an actual
 * refresh-token rejection (returns null after clearing) and returns null WITHOUT
 * clearing on a transient/offline error. So here we re-read the session after the
 * refresh attempt and report logged-out only when it is genuinely gone — a network
 * blip keeps the user logged in (local-first).
 */
export async function getStatus(): Promise<AuthStatus> {
  if (!isCloudEnabled()) return DISABLED
  const stored = loadSession()
  if (!stored) return LOGGED_OUT

  // Access token still valid (with a small skew) → report as-is, no network hit.
  if (!isExpired(stored.expires_at)) return toStatus(stored)

  // Expired → try a transparent refresh. Never clears on offline (see above).
  await getAuthedClient()
  const refreshed = loadSession()
  if (!refreshed) return LOGGED_OUT
  return toStatus(refreshed)
}

// Treat a session as expired a little early so we refresh before a request would
// fail on a just-expired token. expires_at is unix epoch seconds (Supabase).
const EXPIRY_SKEW_SECONDS = 30
function isExpired(expiresAt?: number): boolean {
  if (!expiresAt) return false
  return expiresAt <= Math.floor(Date.now() / 1000) + EXPIRY_SKEW_SECONDS
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
    return LOGGED_OUT
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
  if (client) await signOutQuietly(client, 'error')
  clearSession()
  return isCloudEnabled() ? LOGGED_OUT : DISABLED
}

// ---------------------------------------------------------------------------
// Password reset (OTP recovery flow — no deep links)
// ---------------------------------------------------------------------------
// The user is NOT signed in during a reset, so these use the raw client (not
// getAuthedClient). Supabase emails a 6-digit recovery code (the template must
// include {{ .Token }}); the user types it back into the app.

/** Send a password-recovery email carrying a 6-digit code. Never throws for the
 *  cloud-disabled case — surfaces a clear error only on a genuine send failure. */
export async function requestPasswordReset(email: string): Promise<void> {
  const client = getSupabaseClient()
  if (!client) throw new Error('Cloud features are not available')

  const { error } = await client.auth.resetPasswordForEmail(email.trim())
  if (error) throw new Error(error.message)
}

/**
 * Confirm a password reset: verify the recovery code (which establishes a
 * short-lived session), then set the new password. We do NOT persist this
 * recovery session — the user signs in normally afterwards — so we clear it.
 */
export async function confirmPasswordReset(email: string, code: string, newPassword: string): Promise<void> {
  const client = getSupabaseClient()
  if (!client) throw new Error('Cloud features are not available')

  const { error: verifyError } = await client.auth.verifyOtp({
    email: email.trim(),
    token: code.trim(),
    type: 'recovery',
  })
  if (verifyError) throw new Error(verifyError.message)

  const { error: updateError } = await client.auth.updateUser({ password: newPassword })
  if (updateError) throw new Error(updateError.message)

  // Recovery session is transient — drop it so the user logs in cleanly.
  await signOutQuietly(client, 'after password reset')
  clearSession()
}

// ---------------------------------------------------------------------------
// Account settings (signed-in: change password / email)
// ---------------------------------------------------------------------------

/** Change the signed-in user's password. Requires a live session. */
export async function updatePassword(newPassword: string): Promise<void> {
  const client = await getAuthedClient()
  if (!client) throw new Error('You must be signed in to change your password')

  const { error } = await client.auth.updateUser({ password: newPassword })
  if (error) throw new Error(error.message)
}

/**
 * Request an email change. Triggers Supabase to email a 6-digit confirmation
 * code to the new address. The project runs with double_confirm_changes = false
 * (see config.toml), so confirming that single code applies the change — no
 * second confirmation on the old address is required. The change is NOT applied
 * until confirmEmailChange verifies the code.
 */
export async function requestEmailChange(newEmail: string): Promise<void> {
  const client = await getAuthedClient()
  if (!client) throw new Error('You must be signed in to change your email')

  const { error } = await client.auth.updateUser({ email: newEmail.trim() })
  if (error) throw new Error(error.message)
}

/**
 * Confirm an email change with the 6-digit code sent to the new address. On
 * success Supabase returns an updated session — persist it so the stored user
 * email reflects the change. Returns the refreshed status.
 *
 * We only report success once the returned session actually carries the new
 * email. If the project were configured with double_confirm_changes = true, this
 * single-code verification would leave the change pending (the old address must
 * also confirm); guarding on the email here means the UI never falsely reports
 * success in that case — it surfaces a clear "still pending" error instead.
 */
export async function confirmEmailChange(newEmail: string, code: string): Promise<AuthStatus> {
  const client = getSupabaseClient()
  if (!client) throw new Error('Cloud features are not available')

  const trimmedEmail = newEmail.trim()
  const { data, error } = await client.auth.verifyOtp({
    email: trimmedEmail,
    token: code.trim(),
    type: 'email_change',
  })
  if (error) throw new Error(error.message)
  if (!data.session) throw new Error('Email change did not return a session')

  const confirmedEmail = data.session.user?.email ?? data.user?.email
  if ((confirmedEmail ?? '').toLowerCase() !== trimmedEmail.toLowerCase()) {
    throw new Error(
      'Email change is still pending confirmation. Please check your inbox and confirm from the other address, then try again.',
    )
  }

  const stored = toStored(data.session)
  saveSession(stored)
  return toStatus(stored)
}

// ---------------------------------------------------------------------------
// Account deletion (GDPR)
// ---------------------------------------------------------------------------

/**
 * Permanently delete the signed-in user's account and personal data. The
 * delete_account() RPC removes the auth.users row (app tables cascade via FK)
 * and the caller's memberships. We then sign out locally and clear the stored
 * session so the cloud UI returns to a logged-out state.
 */
export async function deleteAccount(): Promise<AuthStatus> {
  const client = await getAuthedClient()
  if (!client) throw new Error('You must be signed in to delete your account')

  const { error } = await client.rpc('delete_account')
  if (error) throw new Error(error.message)

  // The account no longer exists — tear down the local session unconditionally.
  await signOutQuietly(client, 'after account deletion')
  clearSession()
  return isCloudEnabled() ? LOGGED_OUT : DISABLED
}
