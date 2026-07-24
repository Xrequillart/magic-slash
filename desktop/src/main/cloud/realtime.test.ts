import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the authed client + session store so the realtime module exercises only
// its own lifecycle logic (no network, no socket). vi.hoisted shares mutable
// state the factories (hoisted above imports) can read per test.
const h = vi.hoisted(() => {
  const channel = {
    on: vi.fn(),
    subscribe: vi.fn(),
  }
  // `on` and `subscribe` return the channel for chaining.
  channel.on.mockReturnValue(channel)
  channel.subscribe.mockReturnValue(channel)

  const authSubscription = { unsubscribe: vi.fn() }
  const client = {
    channel: vi.fn(() => channel),
    removeChannel: vi.fn().mockResolvedValue(undefined),
    realtime: { setAuth: vi.fn() },
    auth: {
      onAuthStateChange: vi.fn(() => ({ data: { subscription: authSubscription } })),
    },
  }
  const state = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    client: client as any,
    token: 'access-token' as string | undefined,
  }
  return { channel, authSubscription, client, state }
})

vi.mock('./auth', () => ({
  getAuthedClient: vi.fn(async () => h.state.client),
}))

vi.mock('./session-store', () => ({
  loadSession: () => (h.state.token ? { access_token: h.state.token } : null),
}))

import {
  startOrgAgentsRealtime,
  stopOrgAgentsRealtime,
  getActiveRealtimeOrgId,
  setRealtimeEmitters,
  mapOrgAgentRow,
} from './realtime'

let changes: unknown[]
let statuses: unknown[]

beforeEach(async () => {
  vi.clearAllMocks()
  h.channel.on.mockReturnValue(h.channel)
  h.channel.subscribe.mockReturnValue(h.channel)
  h.state.client = {
    channel: vi.fn(() => h.channel),
    removeChannel: vi.fn().mockResolvedValue(undefined),
    realtime: { setAuth: vi.fn() },
    auth: { onAuthStateChange: vi.fn(() => ({ data: { subscription: h.authSubscription } })) },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any
  h.state.token = 'access-token'
  changes = []
  statuses = []
  setRealtimeEmitters(
    (c) => changes.push(c),
    (s) => statuses.push(s),
  )
  // Ensure a clean channel between tests.
  await stopOrgAgentsRealtime()
})

describe('startOrgAgentsRealtime', () => {
  it('authorizes the socket then subscribes with an org-scoped filter', async () => {
    await startOrgAgentsRealtime('org-1')

    expect(h.state.client.realtime.setAuth).toHaveBeenCalledWith('access-token')
    expect(h.state.client.channel).toHaveBeenCalledWith('org-agents')
    expect(h.channel.on).toHaveBeenCalledWith(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'agents', filter: 'org_id=eq.org-1' },
      expect.any(Function),
    )
    expect(h.channel.subscribe).toHaveBeenCalled()
    expect(getActiveRealtimeOrgId()).toBe('org-1')
  })

  it('is a no-op when already subscribed to the same org', async () => {
    await startOrgAgentsRealtime('org-1')
    await startOrgAgentsRealtime('org-1')
    expect(h.state.client.channel).toHaveBeenCalledTimes(1)
  })

  it('serializes concurrent starts so no channel is orphaned', async () => {
    // Both switchOrg and the connectivity poller can fire a start at once.
    // Without serialization they interleave across the getAuthedClient await
    // and each opens a channel, leaking the first. The lock must collapse these
    // into a single subscription.
    await Promise.all([
      startOrgAgentsRealtime('org-1'),
      startOrgAgentsRealtime('org-1'),
    ])
    expect(h.state.client.channel).toHaveBeenCalledTimes(1)
    expect(getActiveRealtimeOrgId()).toBe('org-1')
  })

  it('does nothing when there is no session token', async () => {
    h.state.token = undefined
    await startOrgAgentsRealtime('org-1')
    expect(h.state.client.channel).not.toHaveBeenCalled()
    expect(getActiveRealtimeOrgId()).toBeNull()
  })

  it('maps channel status to live / reconnecting', async () => {
    await startOrgAgentsRealtime('org-1')
    const statusCb = h.channel.subscribe.mock.calls[0][0] as (s: string) => void
    statusCb('SUBSCRIBED')
    statusCb('CHANNEL_ERROR')
    statusCb('TIMED_OUT')
    expect(statuses).toEqual(['live', 'reconnecting', 'reconnecting'])
  })

  it('forwards INSERT/UPDATE with a mapped agent and DELETE with the row id', async () => {
    await startOrgAgentsRealtime('org-1')
    const changeCb = h.channel.on.mock.calls[0][2] as (payload: unknown) => void

    changeCb({
      eventType: 'INSERT',
      new: { id: 'uuid-1', owner_id: 'u1', name: 'Agent A', ticket_id: 'T-1', status: 'in progress', repositories: ['/repo'], updated_at: '2026-07-24T00:00:00Z' },
    })
    changeCb({ eventType: 'DELETE', old: { id: 'uuid-1' } })

    expect(changes).toEqual([
      {
        eventType: 'INSERT',
        id: 'uuid-1',
        agent: {
          id: 'uuid-1',
          ownerId: 'u1',
          name: 'Agent A',
          ticketId: 'T-1',
          status: 'in progress',
          repositories: ['/repo'],
          updatedAt: '2026-07-24T00:00:00Z',
        },
      },
      { eventType: 'DELETE', id: 'uuid-1' },
    ])
  })

  it('resubscribes on org switch (tears down old channel, opens a new one)', async () => {
    await startOrgAgentsRealtime('org-1')
    await startOrgAgentsRealtime('org-2')

    expect(h.state.client.removeChannel).toHaveBeenCalledTimes(1)
    expect(h.channel.on).toHaveBeenLastCalledWith(
      'postgres_changes',
      expect.objectContaining({ filter: 'org_id=eq.org-2' }),
      expect.any(Function),
    )
    expect(getActiveRealtimeOrgId()).toBe('org-2')
  })
})

describe('stopOrgAgentsRealtime', () => {
  it('removes the channel, unsubscribes the auth listener, and clears the active org', async () => {
    await startOrgAgentsRealtime('org-1')
    await stopOrgAgentsRealtime()

    expect(h.state.client.removeChannel).toHaveBeenCalledWith(h.channel)
    expect(h.authSubscription.unsubscribe).toHaveBeenCalled()
    expect(getActiveRealtimeOrgId()).toBeNull()
  })

  it('is safe to call when nothing is subscribed', async () => {
    await expect(stopOrgAgentsRealtime()).resolves.toBeUndefined()
  })
})

describe('mapOrgAgentRow', () => {
  it('prefers top-level columns and falls back to metadata for ticket/status', () => {
    expect(
      mapOrgAgentRow({
        id: 'uuid-2',
        owner_id: null,
        name: 'B',
        ticket_id: null,
        status: null,
        repositories: 'not-an-array' as unknown as string[],
        metadata: { ticketId: 'T-9', status: 'committed' },
        updated_at: null,
      }),
    ).toEqual({
      id: 'uuid-2',
      ownerId: null,
      name: 'B',
      ticketId: 'T-9',
      status: 'committed',
      repositories: [],
      updatedAt: undefined,
    })
  })
})
