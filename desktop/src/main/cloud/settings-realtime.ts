import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js'
import type { UserSettingsRow } from '../store/user-settings-mapper'
import { getAuthedClient } from './auth'
import { loadSession } from './session-store'

// ---------------------------------------------------------------------------
// User-scoped Realtime subscriptions (main process).
//
// Why this exists: the config cache is hydrated exactly ONCE per session
// (store/hydrate.ts), so a setting changed anywhere else — the web app, another
// machine — stayed invisible to a running app until its next launch. These
// channels close that gap.
//
// Two tables, and therefore TWO channels rather than one channel with two
// bindings. Realtime fails the whole JOIN when any binding is rejected, so a
// problem with one table (a migration not yet applied, a policy change) would
// otherwise take the other down with it — and the subscribe watchdog below would
// then tear down and retry forever, syncing neither. Separate channels degrade
// independently.
//
//   'user-settings'     public.user_settings, filter user_id=eq.<uid>
//   'user-repositories' public.repositories, NO filter
//
// The repositories channel is unfiltered because no filter can express what the
// app actually wants — "my personal repos OR those of any org I belong to". The
// table's RLS already expresses exactly that, and Realtime enforces the same
// policies on the socket, so the stream is correctly scoped without a filter;
// dropping the filter costs a few events for repos of a non-active org, which
// the config read filters out anyway (CloudStore.fetchRepositories).
//
// Both channels are USER-scoped, not org-scoped: they must survive an org switch,
// and they must work for a user with no membership at all.
// ---------------------------------------------------------------------------

/** What a subscriber needs to react to. Injected, like setRealtimeEmitters. */
export interface UserSyncHandlers {
  /** A settings row changed. Carries the full new row — no round trip needed. */
  onSettingsRow: (row: UserSettingsRow) => void
  /** A repository row changed. Carries nothing: the consumer reloads. */
  onRepositoriesChanged: () => void
  /**
   * A channel (re)reached SUBSCRIBED. Events that occurred while the socket was
   * down are NOT replayed, so this is the only signal that the local copy may
   * have drifted — after a sleep, a network drop, a token refresh.
   */
  onResubscribed: () => void
}

let handlers: UserSyncHandlers | null = null

/** Wire the handlers. Pass null to clear (e.g. on teardown). */
export function setUserSyncHandlers(next: UserSyncHandlers | null): void {
  handlers = next
}

let settingsChannel: RealtimeChannel | null = null
let repositoriesChannel: RealtimeChannel | null = null
let activeClient: SupabaseClient | null = null
let subscribedUserId: string | null = null
let authListenerUnsub: (() => void) | null = null

// Same reasoning as the org-agents watchdog: a channel that never reports
// SUBSCRIBED would hold `subscribedUserId` forever, and the connectivity
// poller's `!getActiveSyncUserId()` guard would never retry — settings would
// silently stop syncing for the rest of the session. Give the join a deadline
// and release the slot when it passes.
const SUBSCRIBE_DEADLINE_MS = 15_000
let subscribeWatchdog: ReturnType<typeof setTimeout> | null = null
/** Names of the channels that have reported SUBSCRIBED for the current user. */
const live = new Set<string>()

function clearSubscribeWatchdog(): void {
  if (subscribeWatchdog) {
    clearTimeout(subscribeWatchdog)
    subscribeWatchdog = null
  }
}

function armSubscribeWatchdog(userId: string): void {
  clearSubscribeWatchdog()
  subscribeWatchdog = setTimeout(() => {
    subscribeWatchdog = null
    // Both channels landed, or we already moved on to another user? Nothing to do.
    if (live.size === 2 || subscribedUserId !== userId) return
    console.warn('[settings-realtime] channels never fully subscribed — tearing down so the next connectivity check retries')
    void stopUserSyncRealtime()
  }, SUBSCRIBE_DEADLINE_MS)
  // Never hold the process open for the deadline (matters in tests/teardown).
  subscribeWatchdog.unref?.()
}

/** The user id the channels are currently subscribed for, or null when inactive. */
export function getActiveSyncUserId(): string | null {
  return subscribedUserId
}

/**
 * Re-apply the access token to the realtime socket whenever the SDK refreshes it,
 * so a long-lived channel never falls back to the anon key and breaks RLS —
 * which for these channels would mean receiving nothing at all.
 */
function ensureTokenReapply(client: SupabaseClient): void {
  if (authListenerUnsub) return
  const { data } = client.auth.onAuthStateChange((_event, session) => {
    if (session?.access_token && (settingsChannel || repositoriesChannel)) {
      client.realtime.setAuth(session.access_token)
    }
  })
  authListenerUnsub = () => {
    try {
      data.subscription.unsubscribe()
    } catch (error) {
      console.error('[settings-realtime] failed to unsubscribe auth listener:', error)
    }
  }
}

/** Note a channel's status and report a fresh SUBSCRIBED exactly once per join. */
function handleStatus(name: string, status: string): void {
  if (status !== 'SUBSCRIBED') {
    live.delete(name)
    return
  }
  if (live.has(name)) return
  live.add(name)
  if (live.size === 2) clearSubscribeWatchdog()
  // The socket is live and RLS-authorized: anything that changed while it was
  // down was never delivered, so ask the consumer to reconcile.
  handlers?.onResubscribed()
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function handleSettingsChange(payload: any): void {
  // Only INSERT/UPDATE carry a row worth applying. A DELETE means the account is
  // being torn down (the table cascades from auth.users), which the sign-out path
  // handles — reacting here would just fight it.
  const row = payload?.new as UserSettingsRow | undefined
  if (!row || typeof row !== 'object') return
  handlers?.onSettingsRow(row)
}

function handleRepositoriesChange(): void {
  // Deliberately payload-blind. A repo is keyed by NAME in the config, its local
  // path lives in another table, and a rename or an org move changes which repos
  // are visible at all — patching one row into the cache would be guesswork, so
  // the consumer reloads instead.
  handlers?.onRepositoriesChanged()
}

// Serialize all start/stop operations, for the same reason as the org-agents
// channel: several callers can trigger a start, and each awaits getAuthedClient
// before touching module state — without a lock two of them interleave across
// that await and orphan a WebSocket channel.
let opLock: Promise<void> = Promise.resolve()

function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = opLock.then(fn, fn)
  // Keep the chain alive and non-rejecting so one failed op can't wedge the lock.
  opLock = run.then(() => undefined, () => undefined)
  return run
}

/**
 * Subscribe to the signed-in user's settings and repository changes. Idempotent
 * for the same user; a different user tears the old channels down first. Degrades
 * to a no-op when cloud is unavailable / logged out. Serialized against every
 * other start/stop call (see withLock).
 */
export function startUserSyncRealtime(userId: string): Promise<void> {
  return withLock(() => startInternal(userId))
}

async function startInternal(userId: string): Promise<void> {
  if (settingsChannel && subscribedUserId === userId) return

  const client = await getAuthedClient()
  if (!client) return
  const token = loadSession()?.access_token
  if (!token) return

  // Different user (or a stale channel) → tear down before re-subscribing.
  // Internal (unlocked) teardown: we already hold the lock.
  await stopInternal()

  // CRITICAL for RLS: authorize the socket with the user's JWT before subscribe.
  client.realtime.setAuth(token)
  ensureTokenReapply(client)

  activeClient = client
  subscribedUserId = userId
  try {
    settingsChannel = client
      .channel('user-settings')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_settings', filter: `user_id=eq.${userId}` },
        handleSettingsChange,
      )
      .subscribe((status: string) => handleStatus('user-settings', status))

    repositoriesChannel = client
      .channel('user-repositories')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'repositories' },
        handleRepositoriesChange,
      )
      .subscribe((status: string) => handleStatus('user-repositories', status))

    armSubscribeWatchdog(userId)
  } catch (error) {
    // subscribe() throws when the socket can't even be created. Release the slot
    // (rather than leaving it claimed by channels that don't exist) so the next
    // connectivity check retries instead of never syncing again.
    console.error('[settings-realtime] failed to subscribe:', error)
    await stopInternal()
  }
}

/**
 * Tear the channels down (sign-out / unauthorized). Never throws. Serialized
 * against every other start/stop call (see withLock).
 */
export function stopUserSyncRealtime(): Promise<void> {
  return withLock(stopInternal)
}

async function stopInternal(): Promise<void> {
  subscribedUserId = null
  clearSubscribeWatchdog()
  live.clear()
  if (authListenerUnsub) {
    authListenerUnsub()
    authListenerUnsub = null
  }
  if (activeClient) {
    for (const channel of [settingsChannel, repositoriesChannel]) {
      if (!channel) continue
      try {
        await activeClient.removeChannel(channel)
      } catch (error) {
        console.error('[settings-realtime] failed to remove channel:', error)
      }
    }
  }
  settingsChannel = null
  repositoriesChannel = null
  activeClient = null
}
