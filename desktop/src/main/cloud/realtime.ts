import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js'
import type { OrgAgent, OrgAgentChange, OrgAgentPRReview, RealtimeStatus, RepositoryMetadata } from '../../types'
import { getAuthedClient } from './auth'
import { loadSession } from './session-store'

// ---------------------------------------------------------------------------
// Org-agents Realtime subscription (main process).
//
// Subscribes to postgres_changes on public.agents with NO filter: the app has
// no active organization, and no filter can express "every org I belong to".
// The socket is authorized with the user's JWT (realtime.setAuth) so the SAME
// RLS the REST path enforces also gates the stream — a member of org A never
// receives org B's events. Events are forwarded to the renderer via emitters
// (wired in connectivity-handlers to webContents.send). This module NEVER
// mutates the local config/agents cache — teammates' agents are read-only.
// ---------------------------------------------------------------------------

/** DB row shape for `agents` as delivered by REST select and Realtime payloads. */
export interface OrgAgentRow {
  id: string
  org_id?: string | null
  owner_id: string | null
  name: string
  ticket_id: string | null
  status: string | null
  repositories: unknown
  metadata?: {
    __app?: unknown
    title?: string
    ticketId?: string
    status?: string
    repositoryMetadata?: Record<string, RepositoryMetadata>
  } & Record<string, unknown>
  updated_at?: string | null
  /**
   * Set when the owner closed the agent. Absent from the REST selects (they
   * filter on it server-side); present on realtime payloads, which carry every
   * column — that is how an archive reaches the roster.
   */
  archived_at?: string | null
}

/**
 * Distill the org-wide PR review summary from a row's metadata.repositoryMetadata
 * (populated org-wide by the PRReviewWatcher). Keeps only repos that carry a PR,
 * so the Team page can link straight to a teammate's open pull request. Returns
 * undefined when no repo has a PR (keeps the OrgAgent shape lean).
 */
function extractPRReviews(repoMeta: Record<string, RepositoryMetadata> | undefined): OrgAgentPRReview[] | undefined {
  if (!repoMeta || typeof repoMeta !== 'object') return undefined
  const reviews: OrgAgentPRReview[] = []
  for (const [repo, meta] of Object.entries(repoMeta)) {
    if (!meta || typeof meta !== 'object') continue
    if (!meta.prUrl && !meta.prReviewStatus) continue
    reviews.push({
      repo,
      prUrl: meta.prUrl,
      status: meta.prReviewStatus,
      reviewers: meta.prReviewers,
      merged: meta.prMerged,
      closed: meta.prClosed,
    })
  }
  return reviews.length > 0 ? reviews : undefined
}

/** Map a raw `agents` DB row (REST or Realtime) to the roster-facing OrgAgent. */
export function mapOrgAgentRow(row: OrgAgentRow): OrgAgent {
  const meta = row.metadata ?? {}
  return {
    id: row.id,
    ownerId: row.owner_id ?? null,
    orgId: row.org_id ?? null,
    name: row.name,
    // Empty string is the unset default the app writes, so `||` not `??`.
    title: meta.title || undefined,
    ticketId: row.ticket_id ?? meta.ticketId ?? undefined,
    status: row.status ?? meta.status ?? undefined,
    repositories: Array.isArray(row.repositories) ? (row.repositories as string[]) : [],
    prReviews: extractPRReviews(meta.repositoryMetadata),
    updatedAt: row.updated_at ?? undefined,
  }
}

type ChangeEmitter = (change: OrgAgentChange) => void
type StatusEmitter = (status: RealtimeStatus) => void

let changeEmitter: ChangeEmitter | null = null
let statusEmitter: StatusEmitter | null = null

// Additional in-process subscribers to org-agent changes (e.g. the re-engagement
// notifier). Kept separate from the single renderer-forwarding `changeEmitter`
// (wired by connectivity-handlers) so a main-process module can observe the same
// stream without disturbing that forward. Each listener is isolated from the
// others: a throw in one never blocks the rest or the renderer forward.
type ChangeListener = (change: OrgAgentChange) => void
const changeListeners = new Set<ChangeListener>()

/**
 * Subscribe a main-process listener to org-agent realtime changes. Returns an
 * unsubscribe function. Independent of the renderer-forwarding emitter.
 */
export function addOrgAgentChangeListener(listener: ChangeListener): () => void {
  changeListeners.add(listener)
  return () => {
    changeListeners.delete(listener)
  }
}

/**
 * Wire the emitters that forward realtime events + channel health to the
 * renderer. Pass (null, null) to clear (e.g. on teardown).
 */
export function setRealtimeEmitters(change: ChangeEmitter | null, status: StatusEmitter | null): void {
  changeEmitter = change
  statusEmitter = status
}

/** Fan a change out to the renderer forward AND every in-process listener. */
function dispatchChange(change: OrgAgentChange): void {
  changeEmitter?.(change)
  for (const listener of changeListeners) {
    try {
      listener(change)
    } catch (error) {
      console.error('[realtime] org-agent change listener failed:', error)
    }
  }
}

let channel: RealtimeChannel | null = null
let activeClient: SupabaseClient | null = null
let subscribed = false
let authListenerUnsub: (() => void) | null = null
let lastStatus: RealtimeStatus = 'reconnecting'

// A channel that never reports SUBSCRIBED (socket that won't connect, join push
// that never lands) would otherwise hold the slot forever, and the connectivity
// poller's `!isOrgAgentsRealtimeActive()` guard would never retry — the app
// stays on "Reconnecting…" for the rest of the session. Give the join a
// deadline and release the slot when it passes, so the next poll re-attempts.
const SUBSCRIBE_DEADLINE_MS = 15_000
let subscribeWatchdog: ReturnType<typeof setTimeout> | null = null

function clearSubscribeWatchdog(): void {
  if (subscribeWatchdog) {
    clearTimeout(subscribeWatchdog)
    subscribeWatchdog = null
  }
}

function armSubscribeWatchdog(): void {
  clearSubscribeWatchdog()
  subscribeWatchdog = setTimeout(() => {
    subscribeWatchdog = null
    // Still waiting on the same channel? Tear it down so a retry can happen.
    if (lastStatus === 'live' || !subscribed) return
    console.warn('[realtime] org-agents channel never subscribed — tearing down so the next connectivity check retries')
    void stopOrgAgentsRealtime()
  }, SUBSCRIBE_DEADLINE_MS)
  // Never hold the process open for the deadline (matters in tests/teardown).
  subscribeWatchdog.unref?.()
}

/** Whether the agents channel is currently claimed (subscribed or joining). */
export function isOrgAgentsRealtimeActive(): boolean {
  return subscribed
}

/**
 * Last known channel health. Lets a late-mounting renderer (e.g. opening the
 * dashboard after the channel already fired SUBSCRIBED) seed its indicator
 * instead of waiting for the next push, which may never come.
 */
export function getRealtimeStatus(): RealtimeStatus {
  return lastStatus
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function handleChange(payload: any): void {
  const eventType = payload?.eventType as OrgAgentChange['eventType']
  if (eventType === 'DELETE') {
    const id = (payload.old as OrgAgentRow | undefined)?.id
    if (id) dispatchChange({ eventType, id })
    return
  }
  const row = payload?.new as OrgAgentRow | undefined
  if (!row?.id) return
  // Closing an agent archives the row, so it arrives as an UPDATE — but every
  // consumer's contract for "this agent is gone" is DELETE, and archived agents
  // are invisible app-wide. Synthesising the removal here keeps that in one
  // place; it is the line to revisit if archives ever become browsable.
  if (row.archived_at) {
    dispatchChange({ eventType: 'DELETE', id: row.id })
    return
  }
  dispatchChange({ eventType, id: row.id, agent: mapOrgAgentRow(row) })
}

function mapChannelStatus(status: string): RealtimeStatus {
  // 'SUBSCRIBED' means the socket is live and RLS-authorized. Every other status
  // ('CHANNEL_ERROR', 'TIMED_OUT', 'CLOSED') is a transient loss → reconnecting.
  return status === 'SUBSCRIBED' ? 'live' : 'reconnecting'
}

/**
 * Re-apply the access token to the realtime socket whenever the SDK refreshes
 * it, so a long-lived channel never falls back to the anon key and breaks RLS.
 * Registered once per active channel; torn down in stopOrgAgentsRealtime.
 */
function ensureTokenReapply(client: SupabaseClient): void {
  if (authListenerUnsub) return
  const { data } = client.auth.onAuthStateChange((_event, session) => {
    if (session?.access_token && channel) {
      client.realtime.setAuth(session.access_token)
    }
  })
  authListenerUnsub = () => {
    try {
      data.subscription.unsubscribe()
    } catch (error) {
      console.error('[realtime] failed to unsubscribe auth listener:', error)
    }
  }
}

// Serialize all start/stop operations. The connectivity poller and a sign-in
// can both trigger a start, and each start awaits (getAuthedClient, teardown)
// — without serialization two of them could interleave across an await and
// orphan a WebSocket channel (the second `channel = client.channel(...)` would
// overwrite the first without removing it). Chaining every entrypoint onto the
// previous op means the idempotency guard below always sees a settled state.
let opLock: Promise<void> = Promise.resolve()

function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = opLock.then(fn, fn)
  // Keep the chain alive and non-rejecting so one failed op can't wedge the lock.
  opLock = run.then(() => undefined, () => undefined)
  return run
}

/**
 * Subscribe to agent changes across every organization the user belongs to.
 * Idempotent (a repeat call while already subscribed is a no-op). Degrades to a
 * no-op when cloud is unavailable / logged out. Serialized against every other
 * start/stop call (see withLock).
 */
export function startOrgAgentsRealtime(): Promise<void> {
  return withLock(startInternal)
}

async function startInternal(): Promise<void> {
  if (channel && subscribed) return

  const client = await getAuthedClient()
  if (!client) return
  const token = loadSession()?.access_token
  if (!token) return

  // Switching org (or a stale channel) → tear down before re-subscribing.
  // Internal (unlocked) teardown: we already hold the lock.
  await stopInternal()

  // CRITICAL for RLS: authorize the socket with the user's JWT before subscribe.
  client.realtime.setAuth(token)
  ensureTokenReapply(client)

  activeClient = client
  subscribed = true
  try {
    channel = client
      .channel('org-agents')
      .on(
        // NO org filter. No filter can express "every org I belong to", and the
        // app no longer has one active org to narrow to. The table's RLS says
        // exactly that, and Realtime enforces the same policies on the socket —
        // the same reasoning as the user-repositories channel in
        // settings-realtime.ts.
        'postgres_changes',
        { event: '*', schema: 'public', table: 'agents' },
        handleChange,
      )
      .subscribe((status: string) => {
        lastStatus = mapChannelStatus(status)
        if (lastStatus === 'live') clearSubscribeWatchdog()
        statusEmitter?.(lastStatus)
      })
    armSubscribeWatchdog()
  } catch (error) {
    // subscribe() throws when the socket can't even be created. Release the slot
    // (rather than leaving it claimed by a channel that doesn't exist) so the
    // next connectivity check retries instead of wedging on "Reconnecting…".
    console.error('[realtime] failed to subscribe to org-agents:', error)
    channel = null
    activeClient = null
    subscribed = false
  }
}

/**
 * Tear down the org-agents channel (sign-out / unauthorized).
 * Never throws. Serialized against every other start/stop call (see withLock).
 */
export function stopOrgAgentsRealtime(): Promise<void> {
  return withLock(stopInternal)
}

async function stopInternal(): Promise<void> {
  subscribed = false
  clearSubscribeWatchdog()
  if (lastStatus !== 'reconnecting') {
    lastStatus = 'reconnecting'
    // Notify the renderer so a mounted LiveIndicator flips to "Reconnecting…"
    // immediately, rather than lingering on "Live" through the teardown/
    // resubscribe window (or indefinitely if the next channel never subscribes).
    statusEmitter?.(lastStatus)
  }
  if (authListenerUnsub) {
    authListenerUnsub()
    authListenerUnsub = null
  }
  if (channel && activeClient) {
    try {
      await activeClient.removeChannel(channel)
    } catch (error) {
      console.error('[realtime] failed to remove channel:', error)
    }
  }
  channel = null
  activeClient = null
}
