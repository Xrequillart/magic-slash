import { describe, it, expect } from 'vitest'
import type { UsageStatRow } from '../../types'
import type { Translate } from '../i18n'
import {
  aggregateUsageTotals,
  aggregateUsageByMember,
  aggregateUsageByModel,
  computeUsageHeatmap,
  formatUsageDuration,
  formatUsd,
} from './usageStats'

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

describe('aggregateUsageByModel', () => {
  it('returns no buckets for no rows', () => {
    expect(aggregateUsageByModel([])).toEqual([])
  })

  it('groups by model and sorts by cost descending', () => {
    const result = aggregateUsageByModel([
      row({ model: 'Claude Sonnet', costUsd: 1 }),
      row({ model: 'Claude Opus', costUsd: 5 }),
      row({ model: 'Claude Sonnet', costUsd: 2 }),
    ])
    expect(result).toHaveLength(2)
    expect(result[0].model).toBe('Claude Opus')
    expect(result[0].costUsd).toBe(5)
    expect(result[1].model).toBe('Claude Sonnet')
    expect(result[1].costUsd).toBe(3)
    expect(result[1].sessions).toBe(2)
  })

  it('accumulates lines and duration alongside the cost', () => {
    const result = aggregateUsageByModel([
      row({ model: 'Claude Opus', costUsd: 1.5, linesAdded: 10, linesRemoved: 3, durationMs: 1000 }),
      row({ model: 'Claude Opus', costUsd: 2.25, linesAdded: 4, linesRemoved: 1, durationMs: 2000 }),
    ])
    expect(result).toHaveLength(1)
    // 1.5 and 2.25 are both exact in binary floating point, so their sum is too.
    expect(result[0]).toEqual({
      model: 'Claude Opus', costUsd: 3.75, sessions: 2, linesAdded: 14, linesRemoved: 4, durationMs: 3000,
    })
  })

  it('buckets a null model under null rather than dropping the row', () => {
    // Sessions recorded before the statusLine hook landed carry no model. Dropping
    // them would make this split under-count the totals shown beside it.
    const result = aggregateUsageByModel([row({ model: null, costUsd: 2 })])
    expect(result).toEqual([{
      model: null, costUsd: 2, sessions: 1, linesAdded: 5, linesRemoved: 2, durationMs: 60000,
    }])
  })

  it('buckets an empty or whitespace-only model under null too', () => {
    const result = aggregateUsageByModel([
      row({ model: '', costUsd: 1 }),
      row({ model: '   ', costUsd: 1 }),
      row({ model: null, costUsd: 1 }),
    ])
    expect(result).toHaveLength(1)
    expect(result[0].model).toBeNull()
    expect(result[0].sessions).toBe(3)
  })

  it('keeps a model literally named "unknown" apart from the missing-model bucket', () => {
    // The reason the bucket is `null` and not the string 'unknown': a real name must
    // never be swallowed by the placeholder for an absent one.
    const result = aggregateUsageByModel([
      row({ model: 'unknown', costUsd: 3 }),
      row({ model: null, costUsd: 1 }),
    ])
    expect(result.map((m) => m.model)).toEqual(['unknown', null])
  })
})

describe('formatUsageDuration', () => {
  // Echoes the catalogue's shape without pulling it in — what matters here is which
  // key is picked and what is passed to it.
  const t = ((key: string, params?: Record<string, string | number>) =>
    `${key}:${JSON.stringify(params ?? {})}`) as unknown as Translate

  it('drops to hours and minutes past an hour', () => {
    expect(formatUsageDuration(3 * 3600_000 + 25 * 60_000, t)).toBe('duration.hoursMinutes:{"hours":3,"minutes":25}')
  })

  it('uses minutes and seconds under an hour', () => {
    expect(formatUsageDuration(5 * 60_000 + 30_000, t)).toBe('duration.minutesSeconds:{"minutes":5,"seconds":30}')
  })

  it('falls back to seconds under a minute', () => {
    expect(formatUsageDuration(42_000, t)).toBe('relative.seconds:{"count":42}')
  })

  it('reads zero as zero seconds rather than as no duration', () => {
    expect(formatUsageDuration(0, t)).toBe('relative.seconds:{"count":0}')
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

describe('formatUsd', () => {
  it('collapses sub-cent amounts and shows cents otherwise', () => {
    expect(formatUsd(0)).toBe('$0.00')
    expect(formatUsd(0.004)).toBe('<$0.01')
    expect(formatUsd(12.5)).toBe('$12.50')
  })

  it('groups thousands the way the active locale does', () => {
    // Not cosmetic: a French reader reads "$12,500" as twelve dollars fifty.
    // French uses a narrow no-break space (U+202F) as the group separator.
    expect(formatUsd(12_500, 'en-US')).toBe('$12,500')
    expect(formatUsd(12_500, 'fr-FR')).toBe('$12\u202f500')
  })

  it('defaults to en-US when no locale is passed', () => {
    expect(formatUsd(12_500)).toBe('$12,500')
  })
})
