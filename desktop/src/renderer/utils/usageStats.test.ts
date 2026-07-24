import { describe, it, expect } from 'vitest'
import type { UsageStatRow } from '../../types'
import { aggregateUsageTotals, aggregateUsageByMember, computeUsageHeatmap } from './usageStats'

function row(overrides: Partial<UsageStatRow> = {}): UsageStatRow {
  return {
    userId: 'u1',
    agentId: 'a1',
    model: 'Claude Opus',
    costUsd: 1,
    tokens: null,
    linesAdded: 5,
    linesRemoved: 2,
    durationMs: 60000,
    occurredAt: new Date(2026, 5, 10, 12, 0, 0).toISOString(),
    ...overrides,
  }
}

describe('aggregateUsageTotals', () => {
  it('returns zeroed totals for no rows', () => {
    expect(aggregateUsageTotals([])).toEqual({
      costUsd: 0, linesAdded: 0, linesRemoved: 0, durationMs: 0, sessions: 0,
    })
  })

  it('sums cost, lines and duration across rows', () => {
    const totals = aggregateUsageTotals([
      row({ costUsd: 1.5, linesAdded: 10, linesRemoved: 3, durationMs: 1000 }),
      row({ costUsd: 2.25, linesAdded: 4, linesRemoved: 1, durationMs: 2000 }),
    ])
    expect(totals.costUsd).toBeCloseTo(3.75)
    expect(totals.linesAdded).toBe(14)
    expect(totals.linesRemoved).toBe(4)
    expect(totals.durationMs).toBe(3000)
    expect(totals.sessions).toBe(2)
  })
})

describe('aggregateUsageByMember', () => {
  it('groups by user and sorts by cost descending', () => {
    const result = aggregateUsageByMember([
      row({ userId: 'u1', costUsd: 1 }),
      row({ userId: 'u2', costUsd: 5 }),
      row({ userId: 'u1', costUsd: 2 }),
    ])
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({ userId: 'u2', costUsd: 5, sessions: 1 })
    expect(result[1]).toEqual({ userId: 'u1', costUsd: 3, sessions: 2 })
  })

  it('groups null owners under an empty-string key', () => {
    const result = aggregateUsageByMember([row({ userId: null, costUsd: 1 })])
    expect(result[0].userId).toBe('')
  })
})

describe('computeUsageHeatmap', () => {
  it('buckets rows by local calendar day', () => {
    const map = computeUsageHeatmap([
      row({ occurredAt: new Date(2026, 5, 10, 9, 0, 0).toISOString() }),
      row({ occurredAt: new Date(2026, 5, 10, 18, 0, 0).toISOString() }),
      row({ occurredAt: new Date(2026, 5, 11, 9, 0, 0).toISOString() }),
    ])
    expect(map.get('2026-06-10')).toBe(2)
    expect(map.get('2026-06-11')).toBe(1)
  })

  it('skips rows with an unparseable timestamp', () => {
    const map = computeUsageHeatmap([row({ occurredAt: 'not-a-date' })])
    expect(map.size).toBe(0)
  })
})
