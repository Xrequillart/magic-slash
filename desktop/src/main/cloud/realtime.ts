import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js'
import type { OrgAgent, OrgAgentChange, RealtimeStatus } from '../../types'
import { getAuthedClient } from './auth'
import { loadSession } from './session-store'

// ---------------------------------------------------------------------------
// Org-agents Realtime subscription (main process).
//
// Subscribes to postgres_changes on public.agents, org-scoped via a
// `org_id=eq.<orgId>` filter AND the table's org-scoped RLS. The socket is
// authorized with the user's JWT (realtime.setAuth) so the SAME RLS the REST
// path enforces also gates the stream — a member of org A never receives org
// B's events (AC#3). Events are forwarded to the renderer via injected emitters
// (wired in connectivity-handlers to webContents.send). This module NEVER
// mutates the local config/agents cache — teammates' agents are read-only.
// ---------------------------------------------------------------------------

/** DB row shape for `agents` as delivered by REST select and Realtime payloads. */
export interface OrgAgentRow {
  id: string
  owner_id: string | null
  name: string
  ticket_id: string | null
  status: string | null
  repositories: unknown
  metadata?: { __app?: unknown; ticketId?: string; status?: string } & Record<string, unknown>
  updated_at?: string | null
}

/** Map a raw `agents` DB row (REST or Realtime) to the roster-facing OrgAgent. */
export function mapOrgAgentRow(row: OrgAgentRow): OrgAgent {
  const meta = row.metadata ?? {}
  return {
    id: row.id,
    ownerId: row.owner_id ?? null,
    name: row.name,
    ticketId: row.ticket_id ?? meta.ticketId ?? undefined,
    status: row.status ?? meta.status ?? undefined,
    repositories: Array.isArray(row.repositories) ? (row.repositories as string[]) : [],
    updatedAt: row.updated_at ?? undefined,
  }
}

type ChangeEmitter = (change: OrgAgentChange) => void
type StatusEmitter = (status: RealtimeStatus) => void

let changeEmitter: ChangeEmitter | null = null
let statusEmitter: StatusEmitter | null = null

/**
 * Wire the emitters that forward realtime events + channel health to the
 * renderer. Pass (null, null) to clear (e.g. on teardown).
 */
export function setRealtimeEmitters(change: ChangeEmitter | null, status: StatusEmitter | null): void {
  changeEmitter = change
  statusEmitter = status
}

let channel: RealtimeChannel | null = null
let activeClient: SupabaseClient | null = null
let subscribedOrgId: string | null = null
let authListenerUnsub: (() => void) | null = null
let lastStatus: RealtimeStatus = 'reconnecting'

/** The org id the channel is currently subscribed to, or null when inactive. */
export function getActiveRealtimeOrgId(): string | null {
  return subscribedOrgId
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
  if (!changeEmitter) return
  const eventType = payload?.eventType as OrgAgentChange['eventType']
  if (eventType === 'DELETE') {
    const id = (payload.old as OrgAgentRow | undefined)?.id
    if (id) changeEmitter({ eventType, id })
    return
  }
  const row = payload?.new as OrgAgentRow | undefined
  if (!row?.id) return
  changeEmitter({ eventType, id: row.id, agent: mapOrgAgentRow(row) })
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

// Serialize all start/stop operations. Both `switchOrg` and the connectivity
// poller can trigger a start, and each start awaits (getAuthedClient, teardown)
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
 * Subscribe to org-scoped agent changes. Idempotent for the same org (a repeat
 * call while already subscribed is a no-op). Switching orgs tears down the old
 * channel first. Degrades to a no-op when cloud is unavailable / logged out.
 * Serialized against every other start/stop call (see withLock).
 */
export function startOrgAgentsRealtime(orgId: string): Promise<void> {
  return withLock(() => startInternal(orgId))
}

async function startInternal(orgId: string): Promise<void> {
  if (channel && subscribedOrgId === orgId) return

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
  subscribedOrgId = orgId
  channel = client
    .channel('org-agents')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'agents', filter: `org_id=eq.${orgId}` },
      handleChange,
    )
    .subscribe((status: string) => {
      lastStatus = mapChannelStatus(status)
      statusEmitter?.(lastStatus)
    })
}

/**
 * Tear down the org-agents channel (sign-out / unauthorized / org switch).
 * Never throws. Serialized against every other start/stop call (see withLock).
 */
export function stopOrgAgentsRealtime(): Promise<void> {
  return withLock(stopInternal)
}

async function stopInternal(): Promise<void> {
  subscribedOrgId = null
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
