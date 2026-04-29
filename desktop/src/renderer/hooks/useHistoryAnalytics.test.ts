import { describe, it, expect } from 'vitest'
import type { HistoryEntry } from '../../types'
import { computeHeatmapData } from './historyAnalytics'

function makeEntry(overrides: Partial<HistoryEntry> = {}): HistoryEntry {
  return {
    id: 'test-id',
    agentId: 'agent-1',
    agentName: 'Agent One',
    action: 'started',
    repositories: [],
    timestamp: Date.now(),
    ...overrides,
  }
}

describe('computeHeatmapData', () => {
  it('returns empty map for empty entries', () => {
    const result = computeHeatmapData([])
    expect(result.size).toBe(0)
  })

  it('buckets entries by day correctly', () => {
    const day1 = new Date(2025, 5, 10, 10, 0, 0).getTime()
    const day1b = new Date(2025, 5, 10, 14, 0, 0).getTime()
    const day2 = new Date(2025, 5, 11, 9, 0, 0).getTime()

    const entries = [
      makeEntry({ timestamp: day1 }),
      makeEntry({ timestamp: day1b }),
      makeEntry({ timestamp: day2 }),
    ]

    const result = computeHeatmapData(entries)
    expect(result.get('2025-06-10')).toBe(2)
    expect(result.get('2025-06-11')).toBe(1)
  })

  it('excludes entries older than 52 weeks', () => {
    const old = new Date()
    old.setDate(old.getDate() - 365 - 10)

    const entries = [makeEntry({ timestamp: old.getTime() })]
    const result = computeHeatmapData(entries)
    expect(result.size).toBe(0)
  })
})
