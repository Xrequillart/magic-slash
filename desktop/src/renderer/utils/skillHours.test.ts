import { describe, expect, it } from 'vitest'
import type { SkillHours } from '../../types'
import { t as translate } from '../../i18n'
import type { LanguageId } from '../../types'
import { formatLastUsed, formatSkillSince, formatSkillTime, hasNeverRun } from './skillHours'

/**
 * The rounding rules the hours card is read through, checked against the REAL catalogue
 * rather than a stub translator — a unit that reads wrongly in French fails here rather
 * than on screen.
 *
 * These mirror `webapp/lib/skillHours.test.ts` deliberately: the two products show the
 * same figure to the same person, and someone who reads "453h" in the app and "452h" on
 * the web would be right to distrust both.
 */
const t = (lang: LanguageId) => (key: Parameters<typeof translate>[0], vars?: Record<string, string | number>) =>
  translate(key, lang, vars)

const HOUR = 3600

describe('formatSkillTime', () => {
  it('rounds anything past an hour to whole hours', () => {
    expect(formatSkillTime(453 * HOUR, t('en'))).toBe('453h')
    // 453h29 rounds down, 453h31 rounds up. No minutes are ever printed beside hours: the
    // card is a magnitude, not a measurement.
    expect(formatSkillTime(453 * HOUR + 29 * 60, t('en'))).toBe('453h')
    expect(formatSkillTime(453 * HOUR + 31 * 60, t('en'))).toBe('454h')
  })

  it('switches to minutes under an hour, so a first week is not reported as nothing', () => {
    expect(formatSkillTime(18 * 60, t('en'))).toBe('18 min')
    // Above zero is at least a minute: a run measured in seconds still happened.
    expect(formatSkillTime(4, t('en'))).toBe('1 min')
    expect(formatSkillTime(4, t('fr'))).toBe('1 min')
  })

  it('reserves zero for having nothing at all', () => {
    expect(formatSkillTime(0, t('en'))).toBe('0h')
    expect(formatSkillTime(0, t('fr'))).toBe('0h')
  })

  it('floors a corrupt value instead of printing it', () => {
    // Not reachable — close_skill_run cannot end a run before it began — but "-3h" on a
    // dashboard is worse than a zero.
    expect(formatSkillTime(-3 * HOUR, t('en'))).toBe('0h')
    expect(formatSkillTime(Number.NaN, t('en'))).toBe('0h')
  })
})

describe('formatSkillSince / formatLastUsed', () => {
  const ISO = '2026-07-31T12:00:00.000Z'

  it('writes the period’s opening month out, and the last use in digits', () => {
    // Prose under a figure ("35h since July 31, 2026") versus a date beside two
    // durations, where a written-out month would be the longest thing on the card.
    expect(formatSkillSince(ISO, 'en-US')).toBe('July 31, 2026')
    expect(formatSkillSince(ISO, 'fr-FR')).toBe('31 juillet 2026')
    expect(formatLastUsed(ISO, 'en-US')).toBe('07/31/2026')
    expect(formatLastUsed(ISO, 'fr-FR')).toBe('31/07/2026')
  })

  it('answers an em dash for a date that does not exist', () => {
    // The honest label for "never" — and NOT a loading state, which the card draws as a
    // placeholder block instead.
    expect(formatLastUsed(null, 'en-US')).toBe('—')
    expect(formatSkillSince('not a date', 'en-US')).toBe('—')
  })
})

describe('hasNeverRun', () => {
  const hours = (over: Partial<SkillHours>): SkillHours => ({
    totalSeconds: 0,
    weekSeconds: 0,
    firstMeasuredAt: null,
    lastRunAt: null,
    lastRunAgent: null,
    ...over,
  })

  it('is true only when there is nothing at all to show', () => {
    expect(hasNeverRun(hours({}))).toBe(true)
  })

  it('is false for a run that started and never closed', () => {
    // Zero measured seconds, but the person HAS used a skill — hiding the card would tell
    // someone who launched one an hour ago that they never have.
    expect(hasNeverRun(hours({ lastRunAt: '2026-08-13T17:30:00.000Z' }))).toBe(false)
  })
})
