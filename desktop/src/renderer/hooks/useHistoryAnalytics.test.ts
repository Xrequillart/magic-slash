import { describe, it, expect } from 'vitest'
import type { HistoryEntry } from '../../types'
import {
  computeHeatmapData,
  computeWeeklyStats,
  computeCycleTime,
  formatDuration,
} from './historyAnalytics'

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

describe('computeWeeklyStats', () => {
  it('counts entries from current week', () => {
    const now = new Date()
    const day = now.getDay()
    const diffToMonday = day === 0 ? 6 : day - 1
    const monday = new Date(now)
    monday.setHours(12, 0, 0, 0)
    monday.setDate(monday.getDate() - diffToMonday)

    const entries = [
      makeEntry({ action: 'started', timestamp: monday.getTime() }),
      makeEntry({ action: 'committed', timestamp: monday.getTime() + 1000 }),
      makeEntry({ action: 'pr_created', timestamp: monday.getTime() + 2000 }),
      makeEntry({ action: 'merged', timestamp: monday.getTime() + 3000 }),
    ]

    const stats = computeWeeklyStats(entries)
    expect(stats.started).toBe(1)
    expect(stats.committed).toBe(1)
    expect(stats.prCreated).toBe(1)
    expect(stats.merged).toBe(1)
  })

  it('excludes entries from last week', () => {
    const now = new Date()
    const day = now.getDay()
    const diffToMonday = day === 0 ? 6 : day - 1
    const lastWeek = new Date(now)
    lastWeek.setDate(lastWeek.getDate() - diffToMonday - 1)
    lastWeek.setHours(12, 0, 0, 0)

    const entries = [
      makeEntry({ action: 'started', timestamp: lastWeek.getTime() }),
    ]

    const stats = computeWeeklyStats(entries)
    expect(stats.started).toBe(0)
  })
})

describe('computeCycleTime', () => {
  it('computes average dev and review times for a normal lifecycle', () => {
    const start = 1000000
    const prCreated = 1000000 + 3600000 * 4 // 4h later
    const merged = prCreated + 3600000 * 2   // 2h later

    const entries = [
      makeEntry({ ticketId: 'T-1', action: 'started', timestamp: start }),
      makeEntry({ ticketId: 'T-1', action: 'committed', timestamp: start + 1000 }),
      makeEntry({ ticketId: 'T-1', action: 'pr_created', timestamp: prCreated }),
      makeEntry({ ticketId: 'T-1', action: 'merged', timestamp: merged }),
    ]

    const result = computeCycleTime(entries)
    expect(result.avgDevTime).toBe(3600000 * 4)
    expect(result.avgReviewTime).toBe(3600000 * 2)
  })

  it('handles partial lifecycle (no merge)', () => {
    const start = 1000000
    const prCreated = 1000000 + 3600000 * 2

    const entries = [
      makeEntry({ ticketId: 'T-2', action: 'started', timestamp: start }),
      makeEntry({ ticketId: 'T-2', action: 'pr_created', timestamp: prCreated }),
    ]

    const result = computeCycleTime(entries)
    expect(result.avgDevTime).toBe(3600000 * 2)
    expect(result.avgReviewTime).toBeNull()
  })

  it('excludes entries without ticketId', () => {
    const entries = [
      makeEntry({ action: 'started', timestamp: 1000 }),
      makeEntry({ action: 'pr_created', timestamp: 5000 }),
    ]

    const result = computeCycleTime(entries)
    expect(result.avgDevTime).toBeNull()
    expect(result.avgReviewTime).toBeNull()
  })
})

describe('formatDuration', () => {
  it('returns dash for null', () => {
    expect(formatDuration(null)).toBe('—')
  })

  it('formats minutes for less than 1 hour', () => {
    expect(formatDuration(30 * 60 * 1000)).toBe('30min')
  })

  it('formats hours and minutes for less than 24 hours', () => {
    expect(formatDuration(3.25 * 3600 * 1000)).toBe('3h 15min')
  })

  it('formats days for 24+ hours', () => {
    expect(formatDuration(36 * 3600 * 1000)).toBe('1.5d')
  })
})
