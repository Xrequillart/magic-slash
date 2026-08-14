import type { SkillHours } from '../../types'
import type { Translate } from '../i18n'

/**
 * Formatting for the Team page's hours card — the rules that turn seconds into a figure
 * a person recognises as theirs.
 *
 * PORTED from `webapp/lib/skillHours.ts`, where the same card lives on the dashboard, and
 * the rounding rules below are deliberately identical: someone who reads "453h" in the
 * app and "452h" on the web would be right to distrust both. Two copies rather than a
 * shared module for the same reason SkillStats keeps its own skill list — the desktop and
 * the webapp are separate builds with no code path between them. What holds them together
 * is the `skill_hours` RPC they both read.
 *
 * Pure: no IPC, no React. The read is `window.electronAPI.usage.getSkillHours()`.
 */

const MINUTE = 60
const HOUR = 60 * MINUTE

/** Nothing to show, as opposed to nothing measured — the card hides itself on this. */
export function hasNeverRun(hours: SkillHours): boolean {
  return hours.lastRunAt === null && hours.firstMeasuredAt === null
}

/**
 * "453h", "35h", "18 min", "0h".
 *
 * Hours are the unit the number is FOR — the whole point of the card is a figure big
 * enough to recognise a habit in — so anything past an hour is rounded to whole hours and
 * no minutes are printed beside them. At this magnitude a half hour is noise, and
 * "453h 12min" reads as a measurement rather than as a total.
 *
 * Under an hour it switches to minutes, because a first-week user rounding down to "0h"
 * would be told their work does not count. Anything above zero is at least "1 min" for
 * the same reason: a run measured in seconds is still a run, and zero is reserved for
 * having nothing at all.
 */
export function formatSkillTime(seconds: number, t: Translate): string {
  // Negative is not reachable — close_skill_run cannot end a run before it began — but a
  // floor here means a corrupt row degrades to "0h" instead of "-3h".
  const safe = Number.isFinite(seconds) && seconds > 0 ? seconds : 0

  if (safe === 0) return t('skillHours.hours', { count: 0 })
  if (safe < HOUR) return t('skillHours.minutes', { count: Math.max(1, Math.round(safe / MINUTE)) })
  return t('skillHours.hours', { count: Math.round(safe / HOUR) })
}

/**
 * "31 juillet 2026" / "July 31, 2026" — the date the measured period opens on.
 *
 * A MONTH WRITTEN OUT: it reads as prose here ("35h depuis le 31 juillet 2026") rather
 * than as a table cell. Formatted in the machine's timezone, like the week boundary the
 * RPC computed — a date rendered in UTC beside a week that started locally would
 * eventually disagree with it by a day.
 */
export function formatSkillSince(iso: string | null, locale: string): string {
  return formatDate(iso, locale, { year: 'numeric', month: 'long', day: 'numeric' })
}

/**
 * "12/06/2026" — the last use, all digits.
 *
 * Numeric because it sits under a heading that already says what it is, and next to two
 * durations: a written-out month there would be the longest thing on the card and read as
 * the most important. Day/month order follows the locale.
 */
export function formatLastUsed(iso: string | null, locale: string): string {
  return formatDate(iso, locale, { year: 'numeric', month: '2-digit', day: '2-digit' })
}

/**
 * Shared tail of both: an em dash for a date that is null or unparseable, which is the
 * honest label for "never".
 */
function formatDate(iso: string | null, locale: string, options: Intl.DateTimeFormatOptions): string {
  const at = iso === null ? Number.NaN : new Date(iso).getTime()
  if (Number.isNaN(at)) return '—'
  return new Date(at).toLocaleDateString(locale, options)
}
