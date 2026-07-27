import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { UserSettingsRow } from '../store/user-settings-mapper'

// Mock the authed client + session store so the module exercises only its own
// lifecycle logic (no network, no socket). Unlike the org-agents harness this one
// hands out a DISTINCT channel object per name, because the whole point here is
// that the two tables live on two independent channels.
const h = vi.hoisted(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const makeChannel = (name: string): any => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const channel: any = { name, on: vi.fn(), subscribe: vi.fn() }
    channel.on.mockReturnValue(channel)
    channel.subscribe.mockReturnValue(channel)
    return channel
  }

  const authSubscription = { unsubscribe: vi.fn() }
  const state = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    client: null as any,
    token: 'access-token' as string | undefined,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    channels: new Map<string, any>(),
  }

  const newClient = () => {
    state.channels = new Map()
    return {
      channel: vi.fn((name: string) => {
        const channel = makeChannel(name)
        state.channels.set(name, channel)
        return channel
      }),
      removeChannel: vi.fn().mockResolvedValue(undefined),
      realtime: { setAuth: vi.fn() },
      auth: { onAuthStateChange: vi.fn(() => ({ data: { subscription: authSubscription } })) },
    }
  }

  return { authSubscription, state, newClient }
})

vi.mock('./auth', () => ({
  getAuthedClient: vi.fn(async () => h.state.client),
}))

vi.mock('./session-store', () => ({
  loadSession: () => (h.state.token ? { access_token: h.state.token } : null),
}))

import {
  startUserSyncRealtime,
  stopUserSyncRealtime,
  getActiveSyncUserId,
  setUserSyncHandlers,
} from './settings-realtime'

let settingsRows: UserSettingsRow[]
let repositoriesChanges: number
let resubscribes: number

/** The status callback a given channel was subscribed with. */
const statusCb = (name: string): ((s: string) => void) =>
  h.state.channels.get(name).subscribe.mock.calls[0][0]

/** The postgres_changes handler a given channel registered. */
const changeCb = (name: string): ((payload: unknown) => void) =>
  h.state.channels.get(name).on.mock.calls[0][2]

/** Drive both channels to SUBSCRIBED, as a healthy join would. */
const subscribeBoth = (): void => {
  statusCb('user-settings')('SUBSCRIBED')
  statusCb('user-repositories')('SUBSCRIBED')
}

beforeEach(async () => {
  vi.clearAllMocks()
  h.state.client = h.newClient()
  h.state.token = 'access-token'
  settingsRows = []
  repositoriesChanges = 0
  resubscribes = 0
  setUserSyncHandlers({
    onSettingsRow: (row) => settingsRows.push(row),
    onRepositoriesChanged: () => { repositoriesChanges++ },
    onResubscribed: () => { resubscribes++ },
  })
  // Ensure clean channels between tests.
  await stopUserSyncRealtime()
})

describe('startUserSyncRealtime', () => {
  it('authorizes the socket then opens both channels with their bindings', async () => {
    await startUserSyncRealtime('user-1')

    expect(h.state.client.realtime.setAuth).toHaveBeenCalledWith('access-token')
    expect(h.state.client.channel).toHaveBeenCalledWith('user-settings')
    expect(h.state.client.channel).toHaveBeenCalledWith('user-repositories')

    // Settings are filtered to the caller's own row — a bandwidth optimization on
    // top of the own-rows RLS, not the security boundary.
    expect(h.state.channels.get('user-settings').on).toHaveBeenCalledWith(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'user_settings', filter: 'user_id=eq.user-1' },
      expect.any(Function),
    )
    // Repositories carry NO filter: none can express "personal OR any of my
    // orgs", which is exactly what the table's RLS already enforces.
    expect(h.state.channels.get('user-repositories').on).toHaveBeenCalledWith(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'repositories' },
      expect.any(Function),
    )
    expect(getActiveSyncUserId()).toBe('user-1')
  })

  it('authorizes the socket BEFORE subscribing (RLS would reject an anon socket)', async () => {
    const order: string[] = []
    h.state.client.realtime.setAuth.mockImplementation(() => order.push('setAuth'))
    h.state.client.channel.mockImplementation((name: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const channel: any = { name, on: vi.fn(), subscribe: vi.fn(() => { order.push(`subscribe:${name}`); return channel }) }
      channel.on.mockReturnValue(channel)
      h.state.channels.set(name, channel)
      return channel
    })

    await startUserSyncRealtime('user-1')

    expect(order[0]).toBe('setAuth')
    expect(order).toContain('subscribe:user-settings')
  })

  it('is a no-op when already subscribed for the same user', async () => {
    await startUserSyncRealtime('user-1')
    await startUserSyncRealtime('user-1')
    expect(h.state.client.channel).toHaveBeenCalledTimes(2) // two channels, once
  })

  it('serializes concurrent starts so no channel is orphaned', async () => {
    await Promise.all([
      startUserSyncRealtime('user-1'),
      startUserSyncRealtime('user-1'),
    ])
    expect(h.state.client.channel).toHaveBeenCalledTimes(2)
    expect(getActiveSyncUserId()).toBe('user-1')
  })

  it('does nothing when there is no session token', async () => {
    h.state.token = undefined
    await startUserSyncRealtime('user-1')
    expect(h.state.client.channel).not.toHaveBeenCalled()
    expect(getActiveSyncUserId()).toBeNull()
  })

  it('resubscribes for a different user (tears down first)', async () => {
    await startUserSyncRealtime('user-1')
    await startUserSyncRealtime('user-2')

    expect(h.state.client.removeChannel).toHaveBeenCalledTimes(2)
    expect(h.state.channels.get('user-settings').on).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({ filter: 'user_id=eq.user-2' }),
      expect.any(Function),
    )
    expect(getActiveSyncUserId()).toBe('user-2')
  })
})

describe('event forwarding', () => {
  const row = { history_enabled: false, launch_mode: 'plan' } as unknown as UserSettingsRow

  it('forwards the new settings row on INSERT and UPDATE', async () => {
    await startUserSyncRealtime('user-1')
    changeCb('user-settings')({ eventType: 'UPDATE', new: row })
    expect(settingsRows).toEqual([row])
  })

  it('ignores a settings DELETE (the account is going away; sign-out owns that)', async () => {
    await startUserSyncRealtime('user-1')
    changeCb('user-settings')({ eventType: 'DELETE', old: row })
    expect(settingsRows).toEqual([])
  })

  it('ignores a malformed settings payload', async () => {
    await startUserSyncRealtime('user-1')
    changeCb('user-settings')({ eventType: 'UPDATE', new: 'not-a-row' })
    changeCb('user-settings')(undefined)
    expect(settingsRows).toEqual([])
  })

  it('reports repository changes without inspecting the payload', async () => {
    await startUserSyncRealtime('user-1')
    changeCb('user-repositories')({ eventType: 'INSERT', new: { id: 'r1' } })
    changeCb('user-repositories')({ eventType: 'DELETE', old: { id: 'r1' } })
    expect(repositoriesChanges).toBe(2)
  })

  it('reports a resubscription per channel join, and not again while it stays up', async () => {
    await startUserSyncRealtime('user-1')
    subscribeBoth()
    expect(resubscribes).toBe(2)

    // A repeat SUBSCRIBED with no intervening drop is not a new join.
    statusCb('user-settings')('SUBSCRIBED')
    expect(resubscribes).toBe(2)

    // A drop and a genuine rejoin is: events during the outage were never
    // delivered, so the consumer has to reconcile.
    statusCb('user-settings')('CHANNEL_ERROR')
    statusCb('user-settings')('SUBSCRIBED')
    expect(resubscribes).toBe(3)
  })
})

describe('subscribe watchdog', () => {
  it('tears down when neither channel reports SUBSCRIBED within the deadline', async () => {
    vi.useFakeTimers()
    try {
      await startUserSyncRealtime('user-1')
      expect(getActiveSyncUserId()).toBe('user-1')

      await vi.advanceTimersByTimeAsync(15_000)
      expect(getActiveSyncUserId()).toBeNull()
      expect(h.state.client.removeChannel).toHaveBeenCalled()
    } finally {
      vi.useRealTimers()
    }
  })

  it('tears down when only ONE channel manages to subscribe', async () => {
    // Half a subscription is not a working sync: releasing the slot lets the next
    // connectivity check retry both, instead of leaving one table silently dead.
    vi.useFakeTimers()
    try {
      await startUserSyncRealtime('user-1')
      statusCb('user-settings')('SUBSCRIBED')

      await vi.advanceTimersByTimeAsync(15_000)
      expect(getActiveSyncUserId()).toBeNull()
    } finally {
      vi.useRealTimers()
    }
  })

  it('keeps both live channels past the deadline', async () => {
    vi.useFakeTimers()
    try {
      await startUserSyncRealtime('user-1')
      subscribeBoth()

      await vi.advanceTimersByTimeAsync(15_000)
      expect(getActiveSyncUserId()).toBe('user-1')
      expect(h.state.client.removeChannel).not.toHaveBeenCalled()
    } finally {
      vi.useRealTimers()
    }
  })

  it('releases the slot when subscribe() throws, so a later start retries', async () => {
    const failing = h.state.client.channel.getMockImplementation()
    h.state.client.channel.mockImplementationOnce((name: string) => {
      const channel = failing(name)
      channel.subscribe.mockImplementationOnce(() => {
        throw new Error('WebSocket not available')
      })
      return channel
    })

    await startUserSyncRealtime('user-1')
    expect(getActiveSyncUserId()).toBeNull()

    await startUserSyncRealtime('user-1')
    expect(getActiveSyncUserId()).toBe('user-1')
  })
})

describe('stopUserSyncRealtime', () => {
  it('removes both channels, unsubscribes the auth listener, and clears the user', async () => {
    await startUserSyncRealtime('user-1')
    await stopUserSyncRealtime()

    expect(h.state.client.removeChannel).toHaveBeenCalledTimes(2)
    expect(h.authSubscription.unsubscribe).toHaveBeenCalled()
    expect(getActiveSyncUserId()).toBeNull()
  })

  it('is safe to call when nothing is subscribed', async () => {
    await expect(stopUserSyncRealtime()).resolves.toBeUndefined()
  })
})
