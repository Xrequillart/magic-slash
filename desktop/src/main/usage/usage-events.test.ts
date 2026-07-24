import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { UsageEventInput } from '../../types'
import type { Store } from '../store/Store'
import { setStore, NOOP_STORE } from '../store/Store'

// readConfig is mocked so we can flip the GDPR opt-in per test.
vi.mock('../config/config', () => ({ readConfig: vi.fn() }))
import { readConfig } from '../config/config'
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
})

describe('recordUsageSnapshot', () => {
  it('does nothing when usageLogsEnabled is not set (default OFF)', async () => {
    vi.mocked(readConfig).mockReturnValue({ version: 'x', repositories: {} })
    await recordUsageSnapshot(sample)
    expect(appended).toHaveLength(0)
  })

  it('does nothing when usageLogsEnabled is explicitly false', async () => {
    vi.mocked(readConfig).mockReturnValue({ version: 'x', repositories: {}, usageLogsEnabled: false })
    await recordUsageSnapshot(sample)
    expect(appended).toHaveLength(0)
  })

  it('appends the snapshot when usageLogsEnabled is true', async () => {
    vi.mocked(readConfig).mockReturnValue({ version: 'x', repositories: {}, usageLogsEnabled: true })
    await recordUsageSnapshot(sample)
    expect(appended).toHaveLength(1)
    expect(appended[0]).toEqual(sample)
  })

  it('swallows store errors (never throws into the caller)', async () => {
    vi.mocked(readConfig).mockReturnValue({ version: 'x', repositories: {}, usageLogsEnabled: true })
    setStore(fakeStore({ appendUsage: async () => { throw new Error('boom') } }))
    await expect(recordUsageSnapshot(sample)).resolves.toBeUndefined()
  })
})
