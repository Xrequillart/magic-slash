import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { UsageEventInput } from '../../types'
import type { Store } from '../store/Store'
import { setStore, NOOP_STORE } from '../store/Store'

// readConfig is mocked so we can flip the GDPR opt-in per test.
vi.mock('../config/config', () => ({ readConfig: vi.fn() }))
// The outbox is mocked here for two reasons: these tests are about the writer, not
// the queue (outbox.test.ts owns that), and a real enqueue would write to the
// developer's own ~/.config/magic-slash on every run.
vi.mock('../store/outbox', () => ({
  enqueue: vi.fn(),
  newClientEventId: () => 'event-id-1',
}))
import { readConfig } from '../config/config'
import { enqueue } from '../store/outbox'
import { recordUsageSnapshot } from './usage-events'

let appended: UsageEventInput[] = []

function fakeStore(overrides: Partial<Store> = {}): Store {
  return {
    ...NOOP_STORE,
    appendUsage: async (e) => { appended.push(structuredClone(e)) },
    ...overrides,
  }
}

const sample: UsageEventInput = {
  agentId: 'claude-1',
  model: 'Claude Opus',
  costUsd: 1.23,
  linesAdded: 10,
  linesRemoved: 4,
  durationMs: 5000,
  occurredAt: 1000,
}

beforeEach(() => {
  appended = []
  setStore(fakeStore())
  vi.mocked(readConfig).mockReset()
  vi.mocked(enqueue).mockClear()
})

describe('recordUsageSnapshot', () => {
  it('appends when usageLogsEnabled is not set — the default is ON', async () => {
    vi.mocked(readConfig).mockReturnValue({ version: 'x', repositories: {} })
    await recordUsageSnapshot(sample)
    expect(appended).toHaveLength(1)
  })

  it('does nothing when usageLogsEnabled is explicitly false', async () => {
    vi.mocked(readConfig).mockReturnValue({ version: 'x', repositories: {}, usageLogsEnabled: false })
    await recordUsageSnapshot(sample)
    expect(appended).toHaveLength(0)
  })

  it('appends the snapshot when usageLogsEnabled is true, stamped for idempotence', async () => {
    vi.mocked(readConfig).mockReturnValue({ version: 'x', repositories: {}, usageLogsEnabled: true })
    await recordUsageSnapshot(sample)
    expect(appended).toHaveLength(1)
    expect(appended[0]).toEqual({ ...sample, clientEventId: 'event-id-1' })
  })

  it('swallows store errors (never throws into the caller)', async () => {
    vi.mocked(readConfig).mockReturnValue({ version: 'x', repositories: {}, usageLogsEnabled: true })
    setStore(fakeStore({ appendUsage: async () => { throw new Error('boom') } }))
    await expect(recordUsageSnapshot(sample)).resolves.toBeUndefined()
  })

  // This snapshot fires exactly ONCE per session, at the end. Nothing later can be
  // used to reconstruct it, so dropping it loses a whole session's cost and churn.
  it('queues the snapshot when the store write fails, instead of dropping it', async () => {
    vi.mocked(readConfig).mockReturnValue({ version: 'x', repositories: {}, usageLogsEnabled: true })
    setStore(fakeStore({ appendUsage: async () => { throw new Error('offline') } }))
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

    await recordUsageSnapshot(sample)

    expect(enqueue).toHaveBeenCalledWith({
      kind: 'usage',
      payload: { ...sample, clientEventId: 'event-id-1' },
    })
    spy.mockRestore()
  })

  it('queues nothing when recording is off — the opt-in gates the queue too', async () => {
    vi.mocked(readConfig).mockReturnValue({ version: 'x', repositories: {}, usageLogsEnabled: false })
    setStore(fakeStore({ appendUsage: async () => { throw new Error('offline') } }))

    await recordUsageSnapshot(sample)

    expect(enqueue).not.toHaveBeenCalled()
  })
})
