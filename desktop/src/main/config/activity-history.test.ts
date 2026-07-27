import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { HistoryEntry, Config } from '../../types'
import type { Store } from '../store/Store'
import { setStore, NOOP_STORE } from '../store/Store'
import { addHistoryEntry } from './activity-history'
import { readConfig } from './config'

vi.mock('./config', () => ({ readConfig: vi.fn(() => ({} as Config)) }))

/** Set what readConfig() returns for the next addHistoryEntry call. */
function mockConfig(config: Partial<Config>): void {
  vi.mocked(readConfig).mockReturnValue(config as Config)
}

// Activity events live in the append-only Supabase `activity_events` table behind
// the Store. Write-only: there is no local history.json, no in-memory cache and no
// read-back — the personal History page that used to read one is gone.

let appended: HistoryEntry[] = []

function fakeStore(): Store {
  appended = []
  return {
    ...NOOP_STORE,
    appendHistory: async (e) => { appended.push(structuredClone(e)) },
  }
}

const PARAMS = { agentId: 'a1', agentName: 'Claude 1', action: 'started' as const, repositories: [] }

describe('addHistoryEntry', () => {
  beforeEach(() => {
    setStore(fakeStore())
    mockConfig({ usageLogsEnabled: true })
  })

  it('writes an event carrying all fields', async () => {
    addHistoryEntry({
      agentId: 'a1',
      agentName: 'Claude 1',
      action: 'started',
      ticketId: 'PROJ-123',
      description: 'Fix login',
      repositories: ['/repo1'],
    })
    await Promise.resolve()

    expect(appended).toHaveLength(1)
    expect(appended[0]).toMatchObject({
      agentId: 'a1',
      agentName: 'Claude 1',
      action: 'started',
      ticketId: 'PROJ-123',
      description: 'Fix login',
      repositories: ['/repo1'],
    })
    expect(appended[0].timestamp).toBeGreaterThan(0)
  })

  it('swallows a failed write instead of throwing into the caller', async () => {
    setStore({ ...NOOP_STORE, appendHistory: async () => { throw new Error('offline') } })
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => addHistoryEntry(PARAMS)).not.toThrow()
    await Promise.resolve()
    await Promise.resolve()

    expect(consoleError).toHaveBeenCalled()
    consoleError.mockRestore()
  })
})

describe('addHistoryEntry — usageLogsEnabled GDPR opt-in', () => {
  beforeEach(() => { setStore(fakeStore()) })

  it('records when usageLogsEnabled is true', async () => {
    mockConfig({ usageLogsEnabled: true })
    addHistoryEntry(PARAMS)
    await Promise.resolve()
    expect(appended).toHaveLength(1)
  })

  it('records nothing when usageLogsEnabled is absent (opt-in default is OFF)', async () => {
    mockConfig({})
    addHistoryEntry(PARAMS)
    await Promise.resolve()
    expect(appended).toEqual([])
  })

  it('records nothing when usageLogsEnabled is false', async () => {
    mockConfig({ usageLogsEnabled: false })
    addHistoryEntry(PARAMS)
    await Promise.resolve()
    expect(appended).toEqual([])
  })
})
