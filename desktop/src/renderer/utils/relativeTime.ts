const STEPS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * 24 * 3600],
  ['month', 30 * 24 * 3600],
  ['week', 7 * 24 * 3600],
  ['day', 24 * 3600],
  ['hour', 3600],
  ['minute', 60],
]

/** "5 minutes ago", "yesterday", in the interface's language; "now" for no date at all. */
export function relativeTime(at: string | number | null, locale: string): string {
  const format = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
  if (at === null) return format.format(0, 'second')
  const seconds = (new Date(at).getTime() - Date.now()) / 1000
  for (const [unit, size] of STEPS) {
    if (Math.abs(seconds) >= size) return format.format(Math.round(seconds / size), unit)
  }
  return format.format(0, 'minute')
}
