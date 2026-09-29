import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js'
import type { PlanLiveChange, PlanPresence, PlanPresenceMember, RealtimeStatus } from '../../types'
import { getAuthedClient } from './auth'
import { loadSession } from './session-store'

// ---------------------------------------------------------------------------
// The open plan, live (main process, #306).
//
// When the Plans page opens a plan, the renderer asks for it here (`plans:live:open`) and
// this module joins two channels for it, relaying what they say over IPC through the
// emitters wired in connectivity-handlers. The renderer never talks to Supabase: the socket,
// the token and the policies all stay on this side of the bridge.
//
// ONE PLAN AT A TIME. The page shows one, and opening another replaces it: the channels of
// the plan left behind are torn down before those of the next are joined.
//
// TWO CHANNELS, for `settings-realtime.ts`'s reason: Realtime fails the whole JOIN when any
// binding is rejected, and these two are authorized by different things — a policy on
// `realtime.messages` for presence, the tables' RLS and publication for the changes. One
// failing must not take the other down with it.
//
//   'plan:<id>'          PRIVATE. Presence, keyed by user id: each reader `track`s
//                        { userId, email, joinedAt } and nothing heavier (no photo). Plus
//                        one broadcast, `comment-deleted`, sent by the reader who deleted
//                        one (see `announcePlanCommentDeleted`). Authorized at JOIN by
//                        `plan_topic_readable` (20260929110000).
//   'plan-changes:<id>'  postgres_changes on `plan_sessions` (id=eq.<id>) and
//                        `plan_comments` (session_id=eq.<id>, INSERT and UPDATE).
//                        Payload-blind: an event only says "re-read this".
//
// NO postgres_changes DELETE on comments. Its old image is the primary key alone, so no
// filter can scope it to a plan, and Realtime runs no RLS on a DELETE: the binding would hand
// every open plan the id of every comment deleted anywhere, across organizations. The desktop
// is the only client that deletes a comment, so the deleter says so on the plan's own
// private channel instead.
//
// The lifecycle is `realtime.ts`'s: every entry point serialized by a lock, the socket
// authorized with the user's JWT (and re-authorized on every refresh), a 15s deadline on the
// join, and a status that is `live` only when BOTH channels are SUBSCRIBED.
//
// The deadline is PER CHANNEL, and so is what it tears down. A presence JOIN refused for
// good (the migration not applied yet, Realtime Authorization off on the project, a policy
// that says no) must cost the reader the faces and nothing else: the changes channel keeps
// delivering, and `resumePlanLive` retries only the channel that is missing.
// ---------------------------------------------------------------------------

export interface PlanLiveEmitters {
  /** Who else has the plan open. Emitted on every presence sync, and `[]` on teardown. */
  presence: (presence: PlanPresence) => void
  /** Something moved on the plan: re-read it. */
  changed: (change: PlanLiveChange) => void
  /** Channel health, or `null` when no plan is open (LiveIndicator falls back to the org's). */
  status: (status: RealtimeStatus | null) => void
}

let emitters: PlanLiveEmitters | null = null

/** Wire the emitters that forward to the renderer. Pass null to clear (e.g. on teardown). */
export function setPlanLiveEmitters(next: PlanLiveEmitters | null): void {
  emitters = next
}

type ChannelName = 'presence' | 'changes'

/**
 * The plan the renderer has asked for, whether or not its channels are up. Kept apart from
 * `activeSessionId` because the two part company whenever the connection does: a watchdog
 * teardown, a sign-out, an offline open all leave the plan WANTED with nothing joined, and
 * `resumePlanLive` is how the connectivity poller puts it back.
 */
let wantedSessionId: string | null = null
/** The plan whose channels are currently claimed (joined or joining, one or both). */
let activeSessionId: string | null = null
/** Who the reader is on that plan, kept so a channel lost alone can be joined again. */
let activeReader: { userId: string; me: PlanPresenceMember } | null = null
let presenceChannel: RealtimeChannel | null = null
let changesChannel: RealtimeChannel | null = null
let activeClient: SupabaseClient | null = null
let authListenerUnsub: (() => void) | null = null
/** Channels currently SUBSCRIBED. */
const live = new Set<ChannelName>()
let lastStatus: RealtimeStatus | null = null
/**
 * What the last presence emit said (plan and members), so a sync that changes nobody is not
 * sent again. `''` when nothing is on screen.
 */
let lastPresenceKey = ''

// Same reasoning as the org-agents watchdog: a join that never lands would hold the slot
// forever, and the connectivity poller's `resumePlanLive` would never retry. One per channel.
const SUBSCRIBE_DEADLINE_MS = 15_000
const subscribeWatchdogs = new Map<ChannelName, ReturnType<typeof setTimeout>>()

// Leaving the channel drops the presence server-side anyway; the untrack is the courteous
// half, and must never hold the lock for realtime-js's default 10s push timeout.
const UNTRACK_TIMEOUT_MS = 1_000

// A `track` the server did not acknowledge is tried again at this pace, for as long as the
// presence channel stays joined. The join's watchdog bounds it: a presence still not live at
// the deadline is left, and the connectivity poller joins it afresh.
const TRACK_RETRY_MS = 3_000
/**
 * Bumped on every status of the presence channel. A `track` loop runs for ONE join and stops
 * as soon as this moves: a rejoin starts its own, and a loss must not keep pushing onto a
 * channel that is not joined.
 */
let presenceJoin = 0

function clearSubscribeWatchdog(name: ChannelName): void {
  const timer = subscribeWatchdogs.get(name)
  if (timer) {
    clearTimeout(timer)
    subscribeWatchdogs.delete(name)
  }
}

function currentChannel(name: ChannelName): RealtimeChannel | null {
  return name === 'presence' ? presenceChannel : changesChannel
}

function armSubscribeWatchdog(name: ChannelName, channel: RealtimeChannel): void {
  clearSubscribeWatchdog(name)
  const timer = setTimeout(() => {
    subscribeWatchdogs.delete(name)
    void withLock(async () => {
      // Landed, or replaced (another plan, a rejoin)? Nothing to do.
      if (currentChannel(name) !== channel || live.has(name)) return
      console.warn(`[plan-live] ${name} channel never subscribed — leaving it so the next connectivity check retries it`)
      await leaveChannel(name)
      // Still wanted: the page is open and waiting on a connection, not closed.
      refreshStatus()
    })
  }, SUBSCRIBE_DEADLINE_MS)
  // Never hold the process open for the deadline (matters in tests/teardown).
  timer.unref?.()
  subscribeWatchdogs.set(name, timer)
}

function setStatus(next: RealtimeStatus | null): void {
  if (next === lastStatus) return
  lastStatus = next
  emitters?.status(next)
}

/** `live` when both channels are SUBSCRIBED; any loss on either reads as reconnecting. */
function refreshStatus(): void {
  setStatus(live.size === 2 ? 'live' : 'reconnecting')
}

/** Whether a plan's channels are currently claimed (subscribed or joining). */
export function isPlanLiveActive(): boolean {
  return activeSessionId !== null
}

/**
 * The open plan's channel health, or `null` when no plan is open. Lets a late-mounting
 * indicator seed itself instead of waiting for the next push.
 */
export function getPlanLiveStatus(): RealtimeStatus | null {
  return lastStatus
}

/**
 * Flatten a channel's presence state into one entry per colleague.
 *
 * realtime-js keys the state by presence key (the user id here) and holds a LIST under each:
 * one entry per socket, so a colleague with the plan open in two windows, or on two
 * machines, is two entries under one key. They are one person on the plan, and are drawn
 * once, with the earliest `joinedAt`. The reader themselves is removed HERE rather than in
 * the renderer, which would otherwise have to know its own id to read the list right.
 *
 * Entries that do not carry the three fields are dropped: the payload comes from other
 * readers' apps, and an older or a newer build must not be able to put a blank face on the
 * plan. Sorted by arrival, so the stack does not reshuffle as people come and go.
 */
export function flattenPresence(state: Record<string, unknown[]>, selfId: string | undefined): PlanPresenceMember[] {
  const byUser = new Map<string, PlanPresenceMember>()
  for (const entries of Object.values(state ?? {})) {
    if (!Array.isArray(entries)) continue
    for (const entry of entries) {
      if (!entry || typeof entry !== 'object') continue
      const { userId, email, joinedAt } = entry as Record<string, unknown>
      if (typeof userId !== 'string' || typeof email !== 'string' || typeof joinedAt !== 'string') continue
      if (userId === selfId) continue
      const seen = byUser.get(userId)
      if (!seen || joinedAt < seen.joinedAt) byUser.set(userId, { userId, email, joinedAt })
    }
  }
  return [...byUser.values()].sort((a, b) => a.joinedAt.localeCompare(b.joinedAt) || a.userId.localeCompare(b.userId))
}

/** Presence re-syncs on every join and leave; only a change of who is there is sent. */
function emitPresence(sessionId: string, members: PlanPresenceMember[]): void {
  const key = members.length === 0 ? '' : `${sessionId}|${members.map((m) => `${m.userId}@${m.joinedAt}`).join('|')}`
  if (key === lastPresenceKey) return
  lastPresenceKey = key
  emitters?.presence({ sessionId, members })
}

/** Note a channel's status. Answers whether this SUBSCRIBED is a NEW join (not a repeat). */
function handleStatus(name: ChannelName, status: string): boolean {
  if (status !== 'SUBSCRIBED') {
    live.delete(name)
    refreshStatus()
    return false
  }
  if (live.has(name)) return false
  live.add(name)
  clearSubscribeWatchdog(name)
  refreshStatus()
  return true
}

/**
 * Re-apply the access token to the realtime socket whenever the SDK refreshes it: a private
 * channel re-authorized with the anon key would be refused on its next rejoin.
 */
function ensureTokenReapply(client: SupabaseClient): void {
  if (authListenerUnsub) return
  // Registered with the channels and unregistered by `teardown` with them, so a refresh
  // heard here always has channels to re-authorize.
  const { data } = client.auth.onAuthStateChange((_event, session) => {
    if (session?.access_token) client.realtime.setAuth(session.access_token)
  })
  authListenerUnsub = () => {
    try {
      data.subscription.unsubscribe()
    } catch (error) {
      console.error('[plan-live] failed to unsubscribe auth listener:', error)
    }
  }
}

// Serialize every open/close, for the reason the org-agents channel gives: each awaits
// before touching module state, and two interleaving across that await would orphan a
// channel — here, two plans open at once on one reader.
let opLock: Promise<void> = Promise.resolve()

function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = opLock.then(fn, fn)
  // Keep the chain alive and non-rejecting so one failed op can't wedge the lock.
  opLock = run.then(() => undefined, () => undefined)
  return run
}

/**
 * Join the channels of this plan, leaving any other first. Idempotent for the plan already
 * joined. Degrades to "reconnecting" (the plan stays wanted) when cloud is unavailable or
 * logged out, so the connectivity poller's `resumePlanLive` picks it up.
 */
export function openPlanLive(sessionId: string): Promise<void> {
  wantedSessionId = sessionId
  return withLock(() => openInternal(sessionId, false))
}

/**
 * Put the wanted plan's channels back where they are missing — after a watchdog left one
 * (or both), a sign-in, a connection that came back. Called by the connectivity poller on
 * every `ok`; a no-op when no plan is open or both its channels are claimed.
 */
export function resumePlanLive(): Promise<void> {
  const sessionId = wantedSessionId
  if (!sessionId || (activeSessionId === sessionId && presenceChannel && changesChannel)) return Promise.resolve()
  return withLock(() => openInternal(sessionId, true))
}

async function openInternal(sessionId: string, resync: boolean): Promise<void> {
  // Superseded while waiting on the lock: the reader has closed it, or opened another.
  if (wantedSessionId !== sessionId) return
  if (activeSessionId === sessionId) {
    // Same plan, one channel lost alone: join that one again, leave the other be.
    rejoinMissing(sessionId)
    return
  }

  const client = await getAuthedClient()
  const stored = loadSession()
  const token = stored?.access_token
  const user = stored?.user
  // Internal (unlocked) teardown: we already hold the lock. Before the check below too:
  // offline or signed out, another plan's channels must not outlive the switch.
  await teardown()
  if (!client || !token || !user?.id) {
    setStatus('reconnecting')
    return
  }
  const userId = user.id

  // CRITICAL for a private channel and for RLS: authorize the socket before subscribing.
  client.realtime.setAuth(token)
  ensureTokenReapply(client)

  activeClient = client
  activeSessionId = sessionId
  // Once per open, not per join: a rejoin is the same visit, and must not move the reader
  // to the end of everyone else's stack.
  activeReader = { userId, me: { userId, email: user.email ?? '', joinedAt: new Date().toISOString() } }
  setStatus('reconnecting')

  try {
    joinPresence(client, sessionId)
    joinChanges(client, sessionId, resync)
  } catch (error) {
    // subscribe() throws when the socket can't even be created. Release the slot so the next
    // connectivity check retries, rather than leaving it claimed by channels that don't exist.
    console.error('[plan-live] failed to subscribe:', error)
    await teardown()
    setStatus('reconnecting')
  }
}

/** Join whichever of the open plan's channels a watchdog left. Lock held by the caller. */
function rejoinMissing(sessionId: string): void {
  const client = activeClient
  if (!client) return
  try {
    if (!presenceChannel) joinPresence(client, sessionId)
    // A changes channel joined again has missed whatever moved while it was gone.
    if (!changesChannel) joinChanges(client, sessionId, true)
  } catch (error) {
    // Left as it was: the channel still missing is retried on the next `ok`.
    console.error('[plan-live] failed to rejoin:', error)
  }
  refreshStatus()
}

function joinPresence(client: SupabaseClient, sessionId: string): void {
  const reader = activeReader
  if (!reader) return
  const presence = client.channel(`plan:${sessionId}`, {
    config: { private: true, presence: { key: reader.userId } },
  })
  presenceChannel = presence
  presence
    .on('presence', { event: 'sync' }, () => {
      // A late sync from a channel already torn down is about a plan nobody is looking at.
      if (presenceChannel !== presence) return
      emitPresence(sessionId, flattenPresence(presence.presenceState(), reader.userId))
    })
    .on('broadcast', { event: 'comment-deleted' }, () => {
      if (presenceChannel !== presence) return
      emitters?.changed({ sessionId, kind: 'comments' })
    })
    .subscribe((status: string) => {
      if (presenceChannel !== presence) return
      const join = ++presenceJoin
      if (status !== 'SUBSCRIBED') {
        handleStatus('presence', status)
        return
      }
      // On EVERY join, the first and each rejoin: realtime-js does not publish the
      // presence again after a rejoin, so a reader whose socket dropped would otherwise
      // come back to the plan invisible.
      void trackUntilLive(presence, reader.me, join)
    })
  armSubscribeWatchdog('presence', presence)
}

/**
 * Put the reader on the plan, and only THEN count the presence channel as live. Joined is not
 * enough: a reader whose `track` was refused or timed out is invisible to everyone else, and
 * an indicator saying Live over that would be the one lie this channel must not tell.
 * `track` resolves to 'ok' | 'timed out' | 'error' rather than rejecting, so the answer is read,
 * not caught.
 */
async function trackUntilLive(presence: RealtimeChannel, me: PlanPresenceMember, join: number): Promise<void> {
  if (presenceChannel !== presence || presenceJoin !== join) return
  const result = await presence.track(me).catch(() => 'error' as const)
  if (presenceChannel !== presence || presenceJoin !== join) return
  if (result === 'ok') {
    handleStatus('presence', 'SUBSCRIBED')
    return
  }
  console.warn(`[plan-live] presence track answered ${result}, retrying`)
  const retry = setTimeout(() => void trackUntilLive(presence, me, join), TRACK_RETRY_MS)
  retry.unref?.()
}

/**
 * The reader deleted a comment: tell the others on the plan, who have no other way to hear of
 * it (see the header). Called by the delete handler once the delete went through, and aimed at
 * the open plan, which is the only place a comment can be deleted from. A no-op while the
 * presence channel is not live: the colleagues then see the deletion on their next read.
 */
export function announcePlanCommentDeleted(): void {
  const presence = presenceChannel
  if (!presence || !live.has('presence')) return
  presence.send({ type: 'broadcast', event: 'comment-deleted', payload: {} })
    .catch((error: unknown) => console.error('[plan-live] failed to announce a deleted comment:', error))
}

/**
 * `resync`: whether the channel's first SUBSCRIBED is already a REJOIN — the plan was put
 * back by `resumePlanLive` with the page open all along. Events that occurred while nothing
 * was joined are NOT replayed, and that is the only signal the page may have fallen behind.
 */
function joinChanges(client: SupabaseClient, sessionId: string, resync: boolean): void {
  let joined = resync
  const changes = client.channel(`plan-changes:${sessionId}`)
  changesChannel = changes
  // Every callback checks it is still the live channel: a late one from a channel already
  // torn down is about a plan nobody is looking at.
  const emitChange = (change: Omit<PlanLiveChange, 'sessionId'>) => {
    if (changesChannel === changes) emitters?.changed({ sessionId, ...change })
  }
  const nudge = (kind: PlanLiveChange['kind']) => () => emitChange({ kind })
  changes
    .on('postgres_changes', { event: '*', schema: 'public', table: 'plan_sessions', filter: `id=eq.${sessionId}` }, nudge('spec'))
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'plan_comments', filter: `session_id=eq.${sessionId}` }, nudge('comments'))
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'plan_comments', filter: `session_id=eq.${sessionId}` }, nudge('comments'))
    .subscribe((status: string) => {
      if (changesChannel !== changes || !handleStatus('changes', status)) return
      // Nothing is replayed after a loss: a rejoin reads both halves of the page again.
      const rejoin = joined
      joined = true
      if (rejoin) {
        emitChange({ kind: 'spec' })
        emitChange({ kind: 'comments' })
      }
    })
  armSubscribeWatchdog('changes', changes)
}

/**
 * Leave the plan the reader closed. `sessionId`, when given, must be the plan still wanted:
 * a close that arrives after the reader opened the next plan is about the one they left, and
 * must not take the new one down. Never throws.
 */
export function closePlanLive(sessionId?: string): Promise<void> {
  if (sessionId !== undefined && wantedSessionId !== sessionId) return Promise.resolve()
  wantedSessionId = null
  return withLock(async () => {
    // Re-opened while this waited on the lock: the open queued behind it owns the slot.
    if (wantedSessionId !== null) return
    await teardown()
    setStatus(null)
  })
}

/**
 * Tear the channels down but keep the plan WANTED — the session is gone (unauthorized), and
 * the page may still be on screen behind the sign-in gate. The next `ok` resumes it.
 */
export function suspendPlanLive(): Promise<void> {
  return withLock(async () => {
    const wasOpen = activeSessionId !== null || wantedSessionId !== null
    await teardown()
    if (wasOpen) setStatus('reconnecting')
  })
}

/**
 * Leave one of the open plan's channels, keeping the plan and the other channel. Released
 * BEFORE the awaits: removeChannel fires the channel's CLOSED callback, and it must find
 * nothing to report on.
 */
async function leaveChannel(name: ChannelName): Promise<void> {
  const channel = currentChannel(name)
  const client = activeClient
  const sessionId = activeSessionId
  const wasLive = live.has(name)
  if (name === 'presence') presenceChannel = null
  else changesChannel = null
  live.delete(name)
  clearSubscribeWatchdog(name)

  if (client && channel) {
    // The untrack goes ahead of the leave, and is the courteous half only (see its timeout).
    if (name === 'presence' && wasLive) {
      await channel.untrack({ timeout: UNTRACK_TIMEOUT_MS })
        .catch((error: unknown) => console.error('[plan-live] failed to untrack presence:', error))
    }
    await client.removeChannel(channel)
      .catch((error: unknown) => console.error('[plan-live] failed to remove channel:', error))
  }

  // Whoever was on the plan is unknown from here: the page must not keep drawing faces the
  // channel can no longer vouch for.
  if (name === 'presence' && sessionId) emitPresence(sessionId, [])
}

async function teardown(): Promise<void> {
  if (authListenerUnsub) {
    authListenerUnsub()
    authListenerUnsub = null
  }
  // The two leaves run side by side: each waits on a server reply, and the lock is held for
  // the longest, not their sum. The slot is released only once both have let go of it.
  await Promise.all([leaveChannel('presence'), leaveChannel('changes')])
  activeClient = null
  activeSessionId = null
  activeReader = null
}
