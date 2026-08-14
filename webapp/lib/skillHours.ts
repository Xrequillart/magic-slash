import { localeOf, type Translate } from './i18n'
import { DEFAULT_LANGUAGE, type LanguageId } from './i18n/languages'

/**
 * Skill TIME, as opposed to the skill COUNTS in `skills.ts`: how long the signed-in
 * user has actually spent inside the /magic:* skills, all time and this week.
 *
 * Pure on purpose — no Supabase client at any depth. The root vitest suite covers
 * `webapp/lib/**` with the ROOT node_modules and CI never installs the webapp's own
 * dependencies, so the rounding rules below are testable only while this module
 * imports nothing but the i18n types. The read itself is `fetchSkillHours` in
 * `skills.ts`, next to the other rollup readers; the DATE is formatted by the caller
 * with `formatAbsoluteDate`, which lives on the other side of that line.
 */

/** One row of `skill_hours()`, as PostgREST serialises it. */
export interface SkillHoursRow {
  /** Sum over closed runs, in seconds. A bigint, which PostgREST sends as a number. */
  total_seconds: number
  /** The same sum restricted to the current Monday-to-Sunday week. */
  week_seconds: number
  /** First run that HAS a duration, or null when nothing has been measured yet. */
  first_measured_at: string | null
  /** Last run of ANY kind, closed or not. Null when there has never been one. */
  last_run_at: string | null
}

export interface SkillHours {
  totalSeconds: number
  weekSeconds: number
  /**
   * ISO date of the first MEASURED run — not the first run. Null means nothing has
   * been measured, which is the one state the banner cannot phrase as a duration
   * since it has no period to phrase it over.
   */
  firstMeasuredAt: string | null
  /**
   * ISO date of the last run STARTED, whether or not it reported finishing — which is
   * what "last used" means and why this one is not restricted to closed runs like the
   * durations are. It can therefore be more recent than the period the hours cover.
   */
  lastRunAt: string | null
}

const MINUTE = 60
const HOUR = 60 * MINUTE

export function toSkillHours(row: SkillHoursRow): SkillHours {
  return {
    // `?? 0` rather than trusting the row: the RPC always sends a number, but a
    // caller reading a cached or hand-rolled payload should degrade to zero rather
    // than print NaN across the banner.
    totalSeconds: row.total_seconds ?? 0,
    weekSeconds: row.week_seconds ?? 0,
    firstMeasuredAt: row.first_measured_at ?? null,
    lastRunAt: row.last_run_at ?? null,
  }
}

/** Nothing to show, as opposed to nothing measured — the card hides itself on this. */
export function hasNeverRun(hours: SkillHours): boolean {
  return hours.lastRunAt === null && hours.firstMeasuredAt === null
}

/**
 * "453h", "35h", "18 min", "0h".
 *
 * Hours are the unit the number is FOR — the whole point of the banner is a figure
 * big enough to recognise a habit in — so anything past an hour is rounded to whole
 * hours and no minutes are printed beside them. At this magnitude a half hour is
 * noise, and "453h 12min" reads as a measurement rather than as a total.
 *
 * Under an hour it switches to minutes, because a first-week user rounding down to
 * "0h" would be told their work does not count. Anything above zero is at least
 * "1 min" for the same reason: a run measured in seconds is still a run, and zero is
 * reserved for having nothing at all.
 */
export function formatSkillTime(seconds: number, t: Translate): string {
  // Negative is not reachable — close_skill_run cannot end a run before it began —
  // but a floor here means a corrupt row degrades to "0h" instead of "-3h".
  const safe = Number.isFinite(seconds) && seconds > 0 ? seconds : 0

  if (safe === 0) return t('skillHours.hours', { count: 0 })
  if (safe < HOUR) return t('skillHours.minutes', { count: Math.max(1, Math.round(safe / MINUTE)) })
  return t('skillHours.hours', { count: Math.round(safe / HOUR) })
}

/**
 * "31 juillet 2026" / "July 31, 2026" — the date the measured period opens on.
 *
 * A MONTH WRITTEN OUT, unlike `formatAbsoluteDate`'s "31 juill. 2026", and that is the
 * one place this file breaks the app's single-absolute-date-format rule. It reads as
 * prose here ("35h depuis le 31 juillet 2026") rather than as a table cell, which is
 * where the shortened form belongs and where it stays.
 *
 * Formats in the BROWSER's timezone, like the week boundary the RPC computed — a date
 * rendered in UTC beside a week that started locally would eventually disagree with it
 * by a day.
 */
export function formatSkillSince(iso: string | null, lang: LanguageId = DEFAULT_LANGUAGE): string {
  return formatDate(iso, lang, { year: 'numeric', month: 'long', day: 'numeric' })
}

/**
 * "12/06/2026" — the last use, all digits.
 *
 * Numeric because it sits under a heading that already says what it is, and next to two
 * durations: a written-out month there would be the longest thing on the card and read
 * as the most important. Day/month order follows the locale, so it is 06/12/2026 in
 * English.
 */
export function formatLastUsed(iso: string | null, lang: LanguageId = DEFAULT_LANGUAGE): string {
  return formatDate(iso, lang, { year: 'numeric', month: '2-digit', day: '2-digit' })
}

/**
 * Shared tail of both: an em dash for a date that is null or unparseable, which is the
 * honest label for "never" and matches `formatAbsoluteDate`'s handling of the same case.
 */
function formatDate(
  iso: string | null,
  lang: LanguageId,
  options: Intl.DateTimeFormatOptions,
): string {
  const at = iso === null ? Number.NaN : new Date(iso).getTime()
  if (Number.isNaN(at)) return '—'
  return new Date(at).toLocaleDateString(localeOf(lang), options)
}
