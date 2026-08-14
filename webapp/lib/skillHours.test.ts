import { describe, expect, it } from 'vitest'
import {
  formatLastUsed,
  formatSkillSince,
  formatSkillTime,
  hasNeverRun,
  toSkillHours,
} from './skillHours'
import { t as translate } from './i18n'
import type { LanguageId } from './i18n/languages'

/**
 * Runs in the ROOT vitest suite, on the root node_modules — which is why
 * `skillHours.ts` holds the rounding and `skills.ts` holds the Supabase read. The
 * assertions go through the REAL catalogue rather than a stub translator, so a unit
 * that reads wrongly in French fails here rather than on screen.
 */

const t = (lang: LanguageId) => (key: Parameters<typeof translate>[0], vars?: Record<string, string | number>) =>
  translate(key, lang, vars)

const HOUR = 3600

describe('formatSkillTime', () => {
  it('rounds anything past an hour to whole hours', () => {
    expect(formatSkillTime(453 * HOUR, t('en'))).toBe('453h')
    // 453h29 rounds down, 453h31 rounds up. No minutes are ever printed beside hours:
    // the banner is a magnitude, not a measurement.
    expect(formatSkillTime(453 * HOUR + 29 * 60, t('en'))).toBe('453h')
    expect(formatSkillTime(453 * HOUR + 31 * 60, t('en'))).toBe('454h')
  })

  it('switches to minutes under an hour, so a first week is not reported as nothing', () => {
    expect(formatSkillTime(18 * 60, t('en'))).toBe('18 min')
    expect(formatSkillTime(59 * 60 + 59, t('en'))).toBe('60 min')
    // Above zero is at least a minute: a run measured in seconds still happened.
    expect(formatSkillTime(4, t('en'))).toBe('1 min')
  })

  it('reserves zero for having nothing at all', () => {
    expect(formatSkillTime(0, t('en'))).toBe('0h')
  })

  it('degrades a corrupt duration to zero rather than printing NaN or a negative', () => {
    // Not reachable through close_skill_run, which cannot end a run before it began —
    // but the banner spans the page, and "-3h" there is worse than a missing number.
    expect(formatSkillTime(-90 * 60, t('en'))).toBe('0h')
    expect(formatSkillTime(Number.NaN, t('en'))).toBe('0h')
    expect(formatSkillTime(Number.POSITIVE_INFINITY, t('en'))).toBe('0h')
  })

  it('reads the same in French', () => {
    expect(formatSkillTime(35 * HOUR, t('fr'))).toBe('35h')
    expect(formatSkillTime(18 * 60, t('fr'))).toBe('18 min')
  })
})

/**
 * Both date formatters render in the LOCAL zone, so the fixtures below are stamped at
 * midday UTC: any plausible machine zone keeps them on the same calendar day, and the
 * assertion is about the FORM of the date rather than about the offset.
 */
describe('formatSkillSince', () => {
  it('writes the month out — it reads as prose, not as a table cell', () => {
    expect(formatSkillSince('2026-07-31T12:00:00Z', 'fr')).toBe('31 juillet 2026')
    expect(formatSkillSince('2026-07-31T12:00:00Z', 'en')).toBe('July 31, 2026')
  })

  it('renders a missing date as an em dash rather than as an epoch', () => {
    expect(formatSkillSince(null, 'fr')).toBe('—')
    expect(formatSkillSince('not a date', 'fr')).toBe('—')
  })
})

describe('formatLastUsed', () => {
  it('is all digits, in the order the locale writes them', () => {
    expect(formatLastUsed('2026-06-12T12:00:00Z', 'fr')).toBe('12/06/2026')
    expect(formatLastUsed('2026-06-12T12:00:00Z', 'en')).toBe('06/12/2026')
  })

  it('pads to two digits, so the column does not change width day to day', () => {
    expect(formatLastUsed('2026-01-05T12:00:00Z', 'fr')).toBe('05/01/2026')
  })

  it('renders a missing date as an em dash', () => {
    expect(formatLastUsed(null, 'en')).toBe('—')
  })
})

describe('toSkillHours', () => {
  it('carries the four fields across', () => {
    expect(
      toSkillHours({
        total_seconds: 1_630_800,
        week_seconds: 126_000,
        first_measured_at: '2026-01-12T08:00:00Z',
        last_run_at: '2026-06-12T09:30:00Z',
      }),
    ).toEqual({
      totalSeconds: 1_630_800,
      weekSeconds: 126_000,
      firstMeasuredAt: '2026-01-12T08:00:00Z',
      lastRunAt: '2026-06-12T09:30:00Z',
    })
  })

  it('keeps a null date null — it is how "nothing measured yet" arrives', () => {
    const hours = toSkillHours({
      total_seconds: 0,
      week_seconds: 0,
      first_measured_at: null,
      last_run_at: null,
    })
    expect(hours.firstMeasuredAt).toBeNull()
    expect(hours.lastRunAt).toBeNull()
    expect(hours.totalSeconds).toBe(0)
  })

  it('degrades a missing count to zero rather than undefined', () => {
    // The RPC always sends numbers; a hand-rolled or cached payload might not, and
    // `undefined` would reach the formatter and print across the card.
    const hours = toSkillHours({} as never)
    expect(hours).toEqual({
      totalSeconds: 0,
      weekSeconds: 0,
      firstMeasuredAt: null,
      lastRunAt: null,
    })
  })
})

describe('hasNeverRun', () => {
  it('is true only when there is no run of any kind', () => {
    expect(
      hasNeverRun({ totalSeconds: 0, weekSeconds: 0, firstMeasuredAt: null, lastRunAt: null }),
    ).toBe(true)
  })

  it('is false for a run that never closed — the card can still date the last use', () => {
    // The state of anyone whose runs all predate the closing signal: no measured hours,
    // but a real last-use date. Hiding the card there would lose the one figure it has.
    expect(
      hasNeverRun({
        totalSeconds: 0,
        weekSeconds: 0,
        firstMeasuredAt: null,
        lastRunAt: '2026-06-12T09:30:00Z',
      }),
    ).toBe(false)
  })
})
