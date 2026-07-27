import { describe, it, expect } from 'vitest'
import { formatTimestamp, formatRelativeDate } from './utils'
import { t as translate, type MessageKey } from '../../../i18n'

// Both formatters take a translator; bind English so the expectations below stay
// the compact abbreviations the sidebar has always shown. The French catalogue is
// exercised by i18n.test.ts, which checks every key resolves in both languages.
const t = (key: MessageKey, vars?: Record<string, string | number>) => translate(key, 'en', vars)

describe('formatTimestamp', () => {
  const now = 1700000000000

  it('returns "now" for less than 60 seconds', () => {
    expect(formatTimestamp(now - 30_000, now, t)).toBe('now')
    expect(formatTimestamp(now - 59_999, now, t)).toBe('now')
  })

  it('returns minutes for less than 1 hour', () => {
    expect(formatTimestamp(now - 60_000, now, t)).toBe('1min')
    expect(formatTimestamp(now - 30 * 60_000, now, t)).toBe('30min')
  })

  it('returns hours for less than 1 day', () => {
    expect(formatTimestamp(now - 3_600_000, now, t)).toBe('1h')
    expect(formatTimestamp(now - 12 * 3_600_000, now, t)).toBe('12h')
  })

  it('returns days for less than 1 week', () => {
    expect(formatTimestamp(now - 86_400_000, now, t)).toBe('1d')
    expect(formatTimestamp(now - 6 * 86_400_000, now, t)).toBe('6d')
  })

  it('returns weeks for less than 5 weeks', () => {
    expect(formatTimestamp(now - 7 * 86_400_000, now, t)).toBe('1w')
    expect(formatTimestamp(now - 28 * 86_400_000, now, t)).toBe('4w')
  })

  it('returns months for less than 12 months', () => {
    expect(formatTimestamp(now - 60 * 86_400_000, now, t)).toBe('2mo')
  })

  it('returns years for 365+ days', () => {
    expect(formatTimestamp(now - 400 * 86_400_000, now, t)).toBe('1y')
  })

  it('follows the language it is given', () => {
    const fr = (key: MessageKey, vars?: Record<string, string | number>) => translate(key, 'fr', vars)
    expect(formatTimestamp(now - 30_000, now, fr)).toBe('à l’instant')
    expect(formatTimestamp(now - 2 * 86_400_000, now, fr)).toBe('2 j')
  })
})

describe('formatRelativeDate', () => {
  it('formats simple relative dates', () => {
    expect(formatRelativeDate('2 hours ago', t)).toBe('2h')
    expect(formatRelativeDate('5 minutes ago', t)).toBe('5min')
    expect(formatRelativeDate('1 day ago', t)).toBe('1d')
    expect(formatRelativeDate('3 weeks ago', t)).toBe('3w')
    expect(formatRelativeDate('1 month ago', t)).toBe('1mo')
    expect(formatRelativeDate('2 years ago', t)).toBe('2y')
  })

  it('formats compound relative dates', () => {
    expect(formatRelativeDate('1 month, 5 days ago', t)).toBe('1mo5d')
    expect(formatRelativeDate('2 months, 1 week ago', t)).toBe('2mo1w')
  })

  it('returns input unchanged if no match', () => {
    expect(formatRelativeDate('just now', t)).toBe('just now')
    expect(formatRelativeDate('', t)).toBe('')
  })
})
