import { describe, it, expect } from 'vitest'
import { formatTimestamp, formatRelativeDate } from './utils'

describe('formatTimestamp', () => {
  const now = 1700000000000

  it('returns "now" for less than 60 seconds', () => {
    expect(formatTimestamp(now - 30_000, now)).toBe('now')
    expect(formatTimestamp(now - 59_999, now)).toBe('now')
  })

  it('returns minutes for less than 1 hour', () => {
    expect(formatTimestamp(now - 60_000, now)).toBe('1min')
    expect(formatTimestamp(now - 30 * 60_000, now)).toBe('30min')
  })

  it('returns hours for less than 1 day', () => {
    expect(formatTimestamp(now - 3_600_000, now)).toBe('1h')
    expect(formatTimestamp(now - 12 * 3_600_000, now)).toBe('12h')
  })

  it('returns days for less than 1 week', () => {
    expect(formatTimestamp(now - 86_400_000, now)).toBe('1d')
    expect(formatTimestamp(now - 6 * 86_400_000, now)).toBe('6d')
  })

  it('returns weeks for less than 5 weeks', () => {
    expect(formatTimestamp(now - 7 * 86_400_000, now)).toBe('1w')
    expect(formatTimestamp(now - 28 * 86_400_000, now)).toBe('4w')
  })

  it('returns months for less than 12 months', () => {
    expect(formatTimestamp(now - 60 * 86_400_000, now)).toBe('2mo')
  })

  it('returns years for 365+ days', () => {
    expect(formatTimestamp(now - 400 * 86_400_000, now)).toBe('1y')
  })
})

describe('formatRelativeDate', () => {
  it('formats simple relative dates', () => {
    expect(formatRelativeDate('2 hours ago')).toBe('2h')
    expect(formatRelativeDate('5 minutes ago')).toBe('5min')
    expect(formatRelativeDate('1 day ago')).toBe('1d')
    expect(formatRelativeDate('3 weeks ago')).toBe('3w')
    expect(formatRelativeDate('1 month ago')).toBe('1mo')
    expect(formatRelativeDate('2 years ago')).toBe('2y')
  })

  it('formats compound relative dates', () => {
    expect(formatRelativeDate('1 month, 5 days ago')).toBe('1mo5d')
    expect(formatRelativeDate('2 months, 1 week ago')).toBe('2mo1w')
  })

  it('returns input unchanged if no match', () => {
    expect(formatRelativeDate('just now')).toBe('just now')
    expect(formatRelativeDate('')).toBe('')
  })
})
