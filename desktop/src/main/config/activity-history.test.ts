import { describe, it, expect, beforeEach } from 'vitest'
import type { HistoryEntry } from '../../types'
import type { Store } from '../store/Store'
import { setStore, NOOP_STORE } from '../store/Store'
import { readHistory, addHistoryEntry, hydrateHistory } from './activity-history'

// History lives in the append-only Supabase `activity_events` table behind the
// Store — there is no local history.json and no clear operation (dropped: the
// table is append-only; a read limit replaces the old purge).

let appended: HistoryEntry[] = []

function fakeStore(initial: HistoryEntry[] = []): Store {
  appended = structuredClone(initial)
  return {
    ...NOOP_STORE,
    loadHistory: async (limit) => structuredClone(appended).slice(-limit),
    appendHistory: async (e) => { appended.push(structuredClone(e)) },
  }
}

async function seed(initial: HistoryEntry[] = []): Promise<void> {
  setStore(fakeStore(initial))
  await hydrateHistory()
}

describe('hydrateHistory / readHistory', () => {
  it('returns [] when the store has no history', async () => {
    await seed([])
    expect(readHistory()).toEqual([])
  })

  it('returns the entries loaded from the store', async () => {
    await seed([
      { id: '1', agentId: 'a1', agentName: 'Claude 1', action: 'started', repositories: [], timestamp: 1000 },
    ])
    const result = readHistory()
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('1')
  })
})

describe('addHistoryEntry', () => {
  beforeEach(async () => { await seed([]) })

  it('creates an entry with all fields', () => {
    const entry = addHistoryEntry({
      agentId: 'a1',
      agentName: 'Claude 1',
      action: 'started',
      ticketId: 'PROJ-123',
      description: 'Fix login',
      repositories: ['/repo1'],
    })
    expect(entry.id).toBeDefined()
    expect(entry.agentId).toBe('a1')
    expect(entry.agentName).toBe('Claude 1')
    expect(entry.action).toBe('started')
    expect(entry.ticketId).toBe('PROJ-123')
    expect(entry.description).toBe('Fix login')
    expect(entry.repositories).toEqual(['/repo1'])
    expect(entry.timestamp).toBeGreaterThan(0)
  })

  it('appends to the in-memory cache', () => {
    addHistoryEntry({ agentId: 'a1', agentName: 'Claude 1', action: 'committed', repositories: [] })
    expect(readHistory()).toHaveLength(1)
  })

  it('writes through to the store', async () => {
    addHistoryEntry({ agentId: 'a1', agentName: 'Claude 1', action: 'committed', repositories: [] })
    await Promise.resolve()
    expect(appended).toHaveLength(1)
  })

  it('appends after existing entries', async () => {
    await seed([
      { id: 'existing', agentId: 'a0', agentName: 'Old', action: 'started', repositories: [], timestamp: 1000 },
    ])
    addHistoryEntry({ agentId: 'a1', agentName: 'Claude 1', action: 'committed', repositories: [] })
    const result = readHistory()
    expect(result).toHaveLength(2)
    expect(result[0].id).toBe('existing')
  })

  it('caps the in-memory cache at the read limit (500)', async () => {
    const existing: HistoryEntry[] = Array.from({ length: 500 }, (_, i) => ({
      id: `entry-${i}`,
      agentId: 'a1',
      agentName: 'Claude',
      action: 'started',
      repositories: [],
      timestamp: i,
    }))
    await seed(existing)

    addHistoryEntry({ agentId: 'a2', agentName: 'Claude 2', action: 'committed', repositories: [] })

    const result = readHistory()
    expect(result).toHaveLength(500)
    expect(result[0].id).toBe('entry-1')
    expect(result[result.length - 1].agentName).toBe('Claude 2')
  })
})
