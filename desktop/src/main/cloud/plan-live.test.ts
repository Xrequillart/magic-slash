import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the authed client + session store so the module exercises only its own lifecycle
// (no network, no socket), in `realtime.test.ts`'s style. Each `client.channel()` call hands
// out a FRESH fake, so a test can tell the presence channel from the changes channel, and
// the plan left behind from the one opened next.
interface FakeChannel {
  topic: string
  opts: unknown
  on: ReturnType<typeof vi.fn>
  subscribe: ReturnType<typeof vi.fn>
  track: ReturnType<typeof vi.fn>
  untrack: ReturnType<typeof vi.fn>
  presenceState: ReturnType<typeof vi.fn>
  send?: ReturnType<typeof vi.fn>
}

const h = vi.hoisted(() => {
  const state = {
    channels: [] as FakeChannel[],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    client: null as any,
    token: 'access-token' as string | undefined,
    userId: 'self-id' as string | undefined,
    username: 'me' as string | null,
  }
  return { state, authSubscription: { unsubscribe: vi.fn() } }
})

function fakeChannel(topic: string, opts: unknown): FakeChannel {
  const channel: FakeChannel = {
    topic,
    opts,
    on: vi.fn(),
    subscribe: vi.fn(),
    track: vi.fn().mockResolvedValue('ok'),
    untrack: vi.fn().mockResolvedValue('ok'),
    presenceState: vi.fn(() => ({})),
  }
  channel.on.mockReturnValue(channel)
  channel.subscribe.mockReturnValue(channel)
  return channel
}

function makeClient() {
  return {
    channel: vi.fn((topic: string, opts?: unknown) => {
      const channel = fakeChannel(topic, opts)
      h.state.channels.push(channel)
      return channel
    }),
    removeChannel: vi.fn().mockResolvedValue('ok'),
    realtime: { setAuth: vi.fn() },
    // The reader's own profile row, for the handle their presence carries.
    from: vi.fn(() => {
      const query = {
        select: () => query,
        eq: () => query,
        maybeSingle: async () => ({ data: { username: h.state.username }, error: null }),
      }
      return query
    }),
    auth: { onAuthStateChange: vi.fn(() => ({ data: { subscription: h.authSubscription } })) },
  }
}

vi.mock('./auth', () => ({
  getAuthedClient: vi.fn(async () => h.state.client),
}))

vi.mock('./session-store', () => ({
  loadSession: () => (h.state.token
    ? { access_token: h.state.token, user: h.state.userId ? { id: h.state.userId, email: 'me@example.com' } : undefined }
    : null),
}))

import {
  announcePlanCommentDeleted,
  closePlanLive,
  flattenPresence,
  getPlanLiveStatus,
  isPlanLiveActive,
  openPlanLive,
  resumePlanLive,
  setPlanLiveEmitters,
  suspendPlanLive,
} from './plan-live'
import type { PlanLiveChange, PlanPresence, RealtimeStatus } from '../../types'

const PLAN_A = 'e0000000-0000-0000-0000-00000000000a'
const PLAN_B = 'e0000000-0000-0000-0000-00000000000b'

let presences: PlanPresence[]
let changes: PlanLiveChange[]
let statuses: (RealtimeStatus | null)[]

/** The two channels of the Nth open (0-based), in the order the module creates them. */
function channelsOf(open = 0): { presence: FakeChannel; changes: FakeChannel } {
  return { presence: h.state.channels[open * 2], changes: h.state.channels[open * 2 + 1] }
}

function statusCb(channel: FakeChannel): (status: string) => void {
  return channel.subscribe.mock.calls[0][0] as (status: string) => void
}

function syncCb(channel: FakeChannel): () => void {
  const call = channel.on.mock.calls.find(([type]) => type === 'presence')
  return call![2] as () => void
}

function broadcastCb(channel: FakeChannel): () => void {
  const call = channel.on.mock.calls.find(([type]) => type === 'broadcast')
  return call![2] as () => void
}

/** Let the `track` acknowledgement (a resolved promise) reach the module. */
async function settle(): Promise<void> {
  for (let i = 0; i < 5; i++) await Promise.resolve()
}

function changeCb(channel: FakeChannel, table: string, event: string): (payload?: unknown) => void {
  const call = channel.on.mock.calls.find(([, filter]) => filter.table === table && filter.event === event)
  return call![2] as (payload?: unknown) => void
}

beforeEach(async () => {
  vi.clearAllMocks()
  h.state.channels = []
  h.state.client = makeClient()
  h.state.token = 'access-token'
  h.state.userId = 'self-id'
  presences = []
  changes = []
  statuses = []
  setPlanLiveEmitters(null)
  await closePlanLive()
  h.state.channels = []
  setPlanLiveEmitters({
    presence: (p) => presences.push(p),
    changed: (c) => changes.push(c),
    status: (s) => statuses.push(s),
  })
})

describe('openPlanLive', () => {
  it('authorizes the socket, then joins a private presence channel and a filtered changes channel', async () => {
    await openPlanLive(PLAN_A)

    expect(h.state.client.realtime.setAuth).toHaveBeenCalledWith('access-token')
    const { presence, changes: changesChannel } = channelsOf()
    expect(presence.topic).toBe(`plan:${PLAN_A}`)
    expect(presence.opts).toEqual({ config: { private: true, presence: { key: 'self-id' } } })
    expect(changesChannel.topic).toBe(`plan-changes:${PLAN_A}`)
    expect(changesChannel.on.mock.calls.map(([, filter]) => filter)).toEqual([
      { event: '*', schema: 'public', table: 'plan_sessions', filter: `id=eq.${PLAN_A}` },
      { event: 'INSERT', schema: 'public', table: 'plan_comments', filter: `session_id=eq.${PLAN_A}` },
      { event: 'UPDATE', schema: 'public', table: 'plan_comments', filter: `session_id=eq.${PLAN_A}` },
    ])
    // No DELETE binding: it cannot be scoped to a plan, so it would leak every org's ids.
    expect(changesChannel.on.mock.calls.some(([, filter]) => filter.event === 'DELETE')).toBe(false)
    expect(isPlanLiveActive()).toBe(true)
    expect(getPlanLiveStatus()).toBe('reconnecting')
  })

  it('is a no-op for the plan already open, and serializes concurrent opens', async () => {
    await Promise.all([openPlanLive(PLAN_A), openPlanLive(PLAN_A)])
    await openPlanLive(PLAN_A)
    expect(h.state.client.channel).toHaveBeenCalledTimes(2)
  })

  it('reports live only once BOTH channels are subscribed', async () => {
    await openPlanLive(PLAN_A)
    const { presence, changes: changesChannel } = channelsOf()

    statusCb(presence)('SUBSCRIBED')
    await settle()
    expect(getPlanLiveStatus()).toBe('reconnecting')
    statusCb(changesChannel)('SUBSCRIBED')
    expect(getPlanLiveStatus()).toBe('live')
    statusCb(changesChannel)('CHANNEL_ERROR')
    expect(getPlanLiveStatus()).toBe('reconnecting')
    expect(statuses).toEqual(['reconnecting', 'live', 'reconnecting'])
  })

  it('tracks the reader on every join, rejoins included', async () => {
    await openPlanLive(PLAN_A)
    const { presence } = channelsOf()

    statusCb(presence)('SUBSCRIBED')
    expect(presence.track).toHaveBeenCalledTimes(1)
    const payload = presence.track.mock.calls[0][0]
    expect(payload).toEqual({ userId: 'self-id', email: 'me@example.com', username: 'me', joinedAt: expect.any(String) })
    // Exactly the four fields: nothing heavier travels on presence.
    expect(Object.keys(payload).sort()).toEqual(['email', 'joinedAt', 'userId', 'username'])

    // The socket drops and comes back: realtime-js does not re-publish presence itself.
    statusCb(presence)('CHANNEL_ERROR')
    statusCb(presence)('SUBSCRIBED')
    expect(presence.track).toHaveBeenCalledTimes(2)
    // Same visit, same arrival time.
    expect(presence.track.mock.calls[1][0].joinedAt).toBe(payload.joinedAt)
  })

  it('forwards presence syncs without the reader, one entry per colleague', async () => {
    await openPlanLive(PLAN_A)
    const { presence } = channelsOf()
    presence.presenceState.mockReturnValue({
      'self-id': [{ userId: 'self-id', email: 'me@example.com', joinedAt: '2026-09-29T10:00:00Z' }],
      'u2': [{ userId: 'u2', email: 'u2@example.com', joinedAt: '2026-09-29T10:01:00Z' }],
    })
    syncCb(presence)()

    expect(presences).toEqual([
      { sessionId: PLAN_A, members: [{ userId: 'u2', email: 'u2@example.com', username: null, joinedAt: '2026-09-29T10:01:00Z' }] },
    ])
  })

  it('forwards changes payload-blind, a deletion heard on the plan\'s own channel', async () => {
    await openPlanLive(PLAN_A)
    const { presence, changes: changesChannel } = channelsOf()

    changeCb(changesChannel, 'plan_sessions', '*')({ new: { spec: 'a whole spec' } })
    changeCb(changesChannel, 'plan_comments', 'INSERT')({ new: { id: 'c1' } })
    broadcastCb(presence)()

    expect(changes).toEqual([
      { sessionId: PLAN_A, kind: 'spec' },
      { sessionId: PLAN_A, kind: 'comments' },
      { sessionId: PLAN_A, kind: 'comments' },
    ])
    expect(presence.on.mock.calls.find(([type]) => type === 'broadcast')![1]).toEqual({ event: 'comment-deleted' })
  })

  it('announces a deletion on the presence channel only once it is live', async () => {
    await openPlanLive(PLAN_A)
    const { presence } = channelsOf()
    presence.send = vi.fn().mockResolvedValue('ok')

    announcePlanCommentDeleted(PLAN_A)
    expect(presence.send).not.toHaveBeenCalled()

    statusCb(presence)('SUBSCRIBED')
    await settle()
    announcePlanCommentDeleted(PLAN_A)
    expect(presence.send).toHaveBeenCalledWith({ type: 'broadcast', event: 'comment-deleted', payload: {} })
  })

  it('announces a deletion only on the plan it was made on', async () => {
    await openPlanLive(PLAN_A)
    await openPlanLive(PLAN_B)
    const { presence } = channelsOf(1)
    presence.send = vi.fn().mockResolvedValue('ok')
    statusCb(presence)('SUBSCRIBED')
    await settle()

    // Deleted on A, answered after the reader opened B: B's readers must hear nothing.
    announcePlanCommentDeleted(PLAN_A)
    expect(presence.send).not.toHaveBeenCalled()
  })

  it('re-reads the comments when the presence channel REJOINS, a missed deletion included', async () => {
    await openPlanLive(PLAN_A)
    const { presence } = channelsOf()

    statusCb(presence)('SUBSCRIBED')
    expect(changes).toEqual([])

    statusCb(presence)('CHANNEL_ERROR')
    statusCb(presence)('SUBSCRIBED')
    expect(changes).toEqual([{ sessionId: PLAN_A, kind: 'comments' }])
  })

  it('counts the presence live only once the server took the track, retrying one it refused', async () => {
    vi.useFakeTimers()
    try {
      await openPlanLive(PLAN_A)
      const { presence, changes: changesChannel } = channelsOf()
      statusCb(changesChannel)('SUBSCRIBED')
      presence.track.mockResolvedValueOnce('timed out')

      statusCb(presence)('SUBSCRIBED')
      await settle()
      // Joined, but invisible to the others: not live.
      expect(getPlanLiveStatus()).toBe('reconnecting')

      await vi.advanceTimersByTimeAsync(3_000)
      expect(presence.track).toHaveBeenCalledTimes(2)
      expect(getPlanLiveStatus()).toBe('live')
    } finally {
      vi.useRealTimers()
    }
  })

  it('stops retrying a track once the join it belonged to is gone', async () => {
    vi.useFakeTimers()
    try {
      await openPlanLive(PLAN_A)
      const { presence } = channelsOf()
      presence.track.mockResolvedValueOnce('error')
      statusCb(presence)('SUBSCRIBED')
      await settle()
      statusCb(presence)('CHANNEL_ERROR')

      await vi.advanceTimersByTimeAsync(3_000)
      expect(presence.track).toHaveBeenCalledTimes(1)
    } finally {
      vi.useRealTimers()
    }
  })

  it('asks for a re-read when the changes channel REJOINS, not on its first join', async () => {
    await openPlanLive(PLAN_A)
    const { changes: changesChannel } = channelsOf()

    statusCb(changesChannel)('SUBSCRIBED')
    expect(changes).toEqual([])

    statusCb(changesChannel)('TIMED_OUT')
    statusCb(changesChannel)('SUBSCRIBED')
    expect(changes).toEqual([
      { sessionId: PLAN_A, kind: 'spec' },
      { sessionId: PLAN_A, kind: 'comments' },
    ])
  })

  it('leaves the previous plan before joining the next', async () => {
    await openPlanLive(PLAN_A)
    const first = channelsOf(0)
    statusCb(first.presence)('SUBSCRIBED')
    first.presence.presenceState.mockReturnValue({ u2: [{ userId: 'u2', email: 'u2@example.com', joinedAt: 't' }] })
    syncCb(first.presence)()

    await openPlanLive(PLAN_B)

    expect(first.presence.untrack).toHaveBeenCalled()
    expect(h.state.client.removeChannel).toHaveBeenCalledWith(first.presence)
    expect(h.state.client.removeChannel).toHaveBeenCalledWith(first.changes)
    // The faces of the plan left behind are withdrawn.
    expect(presences.at(-1)).toEqual({ sessionId: PLAN_A, members: [] })
    expect(channelsOf(1).presence.topic).toBe(`plan:${PLAN_B}`)

    // A late callback from the channel torn down reports nothing.
    const before = statuses.length
    statusCb(first.changes)('SUBSCRIBED')
    changeCb(first.changes, 'plan_sessions', '*')()
    expect(statuses.length).toBe(before)
    expect(changes).toEqual([])
  })

  it('degrades to reconnecting with no session, and resumes once there is one', async () => {
    h.state.token = undefined
    await openPlanLive(PLAN_A)
    expect(h.state.client.channel).not.toHaveBeenCalled()
    expect(isPlanLiveActive()).toBe(false)
    expect(getPlanLiveStatus()).toBe('reconnecting')

    h.state.token = 'access-token'
    await resumePlanLive()
    expect(channelsOf().presence.topic).toBe(`plan:${PLAN_A}`)
    // Resumed, not freshly opened: whatever changed in between was never delivered.
    statusCb(channelsOf().changes)('SUBSCRIBED')
    expect(changes).toEqual([
      { sessionId: PLAN_A, kind: 'spec' },
      { sessionId: PLAN_A, kind: 'comments' },
    ])
  })

  it('releases the slot when subscribe() throws, so a resume retries', async () => {
    h.state.client.channel.mockImplementationOnce(() => {
      throw new Error('WebSocket not available')
    })
    await openPlanLive(PLAN_A)
    expect(isPlanLiveActive()).toBe(false)

    await resumePlanLive()
    expect(isPlanLiveActive()).toBe(true)
  })

  it('leaves only the channel that missed the deadline, and keeps the other delivering', async () => {
    vi.useFakeTimers()
    try {
      await openPlanLive(PLAN_A)
      const { presence, changes: changesChannel } = channelsOf()
      statusCb(changesChannel)('SUBSCRIBED')

      await vi.advanceTimersByTimeAsync(15_000)
      // The refused presence goes; the changes channel stays up and keeps nudging the page.
      expect(h.state.client.removeChannel).toHaveBeenCalledTimes(1)
      expect(h.state.client.removeChannel).toHaveBeenCalledWith(presence)
      expect(isPlanLiveActive()).toBe(true)
      expect(getPlanLiveStatus()).toBe('reconnecting')
      changeCb(changesChannel, 'plan_sessions', '*')()
      expect(changes).toEqual([{ sessionId: PLAN_A, kind: 'spec' }])
    } finally {
      vi.useRealTimers()
    }
  })

  it('rejoins only the missing channel on resume, and reports live once it lands', async () => {
    vi.useFakeTimers()
    try {
      await openPlanLive(PLAN_A)
      const { changes: changesChannel } = channelsOf()
      statusCb(changesChannel)('SUBSCRIBED')
      await vi.advanceTimersByTimeAsync(15_000)

      await resumePlanLive()
      // One new channel, the presence one: the changes channel was never left.
      expect(h.state.channels).toHaveLength(3)
      const rejoined = h.state.channels[2]
      expect(rejoined.topic).toBe(`plan:${PLAN_A}`)
      statusCb(rejoined)('SUBSCRIBED')
      await settle()
      expect(rejoined.track).toHaveBeenCalledTimes(1)
      expect(getPlanLiveStatus()).toBe('live')
      // The changes channel did not rejoin, so the spec is not re-read; the comments are, as
      // a deletion announced while presence was down would otherwise be missed.
      expect(changes).toEqual([{ sessionId: PLAN_A, kind: 'comments' }])
    } finally {
      vi.useRealTimers()
    }
  })

  it('asks for a re-read when a changes channel left by the watchdog is joined again', async () => {
    vi.useFakeTimers()
    try {
      await openPlanLive(PLAN_A)
      statusCb(channelsOf().presence)('SUBSCRIBED')
      await vi.advanceTimersByTimeAsync(15_000)
      expect(h.state.client.removeChannel).toHaveBeenCalledWith(channelsOf().changes)

      await resumePlanLive()
      const rejoined = h.state.channels[2]
      expect(rejoined.topic).toBe(`plan-changes:${PLAN_A}`)
      statusCb(rejoined)('SUBSCRIBED')
      expect(changes).toEqual([
        { sessionId: PLAN_A, kind: 'spec' },
        { sessionId: PLAN_A, kind: 'comments' },
      ])
    } finally {
      vi.useRealTimers()
    }
  })

  it('leaves both channels when neither subscribes within the deadline', async () => {
    vi.useFakeTimers()
    try {
      await openPlanLive(PLAN_A)
      await vi.advanceTimersByTimeAsync(15_000)
      expect(h.state.client.removeChannel).toHaveBeenCalledTimes(2)
      expect(getPlanLiveStatus()).toBe('reconnecting')

      await resumePlanLive()
      expect(h.state.channels).toHaveLength(4)
    } finally {
      vi.useRealTimers()
    }
  })

  it('keeps live channels past the deadline', async () => {
    vi.useFakeTimers()
    try {
      await openPlanLive(PLAN_A)
      statusCb(channelsOf().presence)('SUBSCRIBED')
      statusCb(channelsOf().changes)('SUBSCRIBED')

      await vi.advanceTimersByTimeAsync(15_000)
      expect(isPlanLiveActive()).toBe(true)
      expect(h.state.client.removeChannel).not.toHaveBeenCalled()
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('closePlanLive', () => {
  it('untracks, removes both channels, unsubscribes the auth listener and reports no plan', async () => {
    await openPlanLive(PLAN_A)
    const { presence, changes: changesChannel } = channelsOf()
    statusCb(presence)('SUBSCRIBED')
    await settle()
    await closePlanLive(PLAN_A)

    expect(presence.untrack).toHaveBeenCalled()
    expect(h.state.client.removeChannel).toHaveBeenCalledWith(presence)
    expect(h.state.client.removeChannel).toHaveBeenCalledWith(changesChannel)
    expect(h.authSubscription.unsubscribe).toHaveBeenCalled()
    expect(isPlanLiveActive()).toBe(false)
    expect(getPlanLiveStatus()).toBeNull()
    expect(statuses.at(-1)).toBeNull()
  })

  it('ignores a close about a plan the reader has already left', async () => {
    await openPlanLive(PLAN_A)
    await openPlanLive(PLAN_B)
    await closePlanLive(PLAN_A)
    expect(isPlanLiveActive()).toBe(true)
    expect(channelsOf(1).presence.topic).toBe(`plan:${PLAN_B}`)
  })

  it('is safe to call when nothing is open', async () => {
    await expect(closePlanLive()).resolves.toBeUndefined()
  })
})

describe('suspendPlanLive', () => {
  it('tears down but keeps the plan wanted, so the next resume rejoins it', async () => {
    await openPlanLive(PLAN_A)
    await suspendPlanLive()
    expect(isPlanLiveActive()).toBe(false)
    expect(getPlanLiveStatus()).toBe('reconnecting')

    await resumePlanLive()
    expect(isPlanLiveActive()).toBe(true)
    expect(channelsOf(1).presence.topic).toBe(`plan:${PLAN_A}`)
  })
})

describe('flattenPresence', () => {
  it('collapses a colleague on two sockets into one entry, keeping the earliest arrival', () => {
    expect(flattenPresence({
      u2: [
        { userId: 'u2', email: 'u2@example.com', joinedAt: '2026-09-29T10:05:00Z' },
        { userId: 'u2', email: 'u2@example.com', joinedAt: '2026-09-29T10:01:00Z' },
      ],
    }, 'self-id')).toEqual([{ userId: 'u2', email: 'u2@example.com', username: null, joinedAt: '2026-09-29T10:01:00Z' }])
  })

  it('carries a colleague\'s handle, and reads a missing or blank one as none', () => {
    expect(flattenPresence({
      u2: [{ userId: 'u2', email: 'u2@example.com', username: 'camille', joinedAt: '2026-09-29T10:01:00Z' }],
      u3: [{ userId: 'u3', email: 'u3@example.com', username: '', joinedAt: '2026-09-29T10:02:00Z' }],
      u4: [{ userId: 'u4', email: 'u4@example.com', username: 42, joinedAt: '2026-09-29T10:03:00Z' }],
    }, 'self-id').map((m) => m.username)).toEqual(['camille', null, null])
  })

  it('drops the reader and malformed entries, and orders by arrival', () => {
    expect(flattenPresence({
      'self-id': [{ userId: 'self-id', email: 'me@example.com', joinedAt: '2026-09-29T09:00:00Z' }],
      u3: [{ userId: 'u3', email: 'u3@example.com', joinedAt: '2026-09-29T10:02:00Z' }],
      u2: [{ userId: 'u2', email: 'u2@example.com', joinedAt: '2026-09-29T10:01:00Z' }],
      bad: [{ userId: 'bad' }, null, 'nope'],
    }, 'self-id').map((m) => m.userId)).toEqual(['u2', 'u3'])
  })
})
