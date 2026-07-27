import type { Translate } from '../../i18n'

// Format a timestamp (ms) to compact relative time (now, 5min, 2h, 3d, 1w, 2mo, 1y).
// The translator is a parameter rather than a hook call: this stays a pure
// function, callable from a node-environment test and from a non-component path.
export function formatTimestamp(tsCreate: number, now: number | undefined, t: Translate): string {
  const current = now ?? Date.now()
  const diffMs = current - tsCreate
  if (diffMs < 60_000) return t('relative.now')

  const minutes = Math.floor(diffMs / 60_000)
  if (minutes < 60) return t('relative.minutes', { count: minutes })

  const hours = Math.floor(diffMs / 3_600_000)
  if (hours < 24) return t('relative.hours', { count: hours })

  const days = Math.floor(diffMs / 86_400_000)
  if (days < 7) return t('relative.days', { count: days })

  const weeks = Math.floor(days / 7)
  if (weeks < 5) return t('relative.weeks', { count: weeks })

  const months = Math.floor(days / 30)
  if (months < 12) return t('relative.months', { count: months })

  const years = Math.floor(days / 365)
  return t('relative.years', { count: years })
}

// git's relative dates arrive as English prose ("2 hours ago", "1 month, 2 weeks
// ago") whatever the interface language, because that is what the CLI emits. Only
// the unit is ours to translate, so the number is parsed out and re-rendered
// through the catalogue: "3 weeks ago" → "3w" in English, "3 sem" in French.
const RELATIVE_UNIT_KEYS = {
  second: 'relative.seconds',
  minute: 'relative.minutes',
  hour: 'relative.hours',
  day: 'relative.days',
  week: 'relative.weeks',
  month: 'relative.months',
  year: 'relative.years',
} as const

// Format relative date to short format (15min, 3h, 1d, 15d, 1mo5d, etc.)
export function formatRelativeDate(relativeDate: string, t: Translate): string {
  // Parse git's relative date format (e.g., "2 hours ago", "3 days ago", "1 month, 2 weeks ago")
  const match = relativeDate.match(/(\d+)\s+(second|minute|hour|day|week|month|year)s?\s*(?:,\s*(\d+)\s+(day|week)s?)?/i)
  if (!match) return relativeDate

  const value = parseInt(match[1])
  const unit = match[2].toLowerCase() as keyof typeof RELATIVE_UNIT_KEYS
  const subValue = match[3] ? parseInt(match[3]) : 0
  const subUnit = match[4]?.toLowerCase() as keyof typeof RELATIVE_UNIT_KEYS | undefined

  const unitKey = RELATIVE_UNIT_KEYS[unit]
  let result = unitKey ? t(unitKey, { count: value }) : `${value}${unit}`

  // Add sub-unit if present (e.g., "1 month, 5 days" -> "1mo5d")
  if (subValue && subUnit) {
    const subKey = RELATIVE_UNIT_KEYS[subUnit]
    result += subKey ? t(subKey, { count: subValue }) : `${subValue}${subUnit}`
  }

  return result
}
