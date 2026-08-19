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

/**
 * Colour for the session context gauge: green, then orange from 40%, then red
 * from 70%. Deliberately not `gaugeColors` from LimitGauge — that one paints
 * the plan rate limits, where 60% of a weekly quota is unremarkable. A context
 * window is the opposite: filling it is what triggers a compaction, so the
 * warning has to arrive far earlier.
 *
 * Returns Tailwind classes rather than colours. `orange`, `red` and `green`
 * resolve against the per-theme tokens written by the theme registry
 * (src/themes.ts), so every theme supplies its own shade — the light ones need
 * a much darker orange to stay legible on white than the dark ones do.
 *
 * Lives here, next to the formatters, rather than in LimitGauge: that module
 * pulls in the i18n hook, which touches `window` at import and cannot be loaded
 * from a node-environment test.
 */
export function contextColors(pct: number): { bar: string; text: string } {
  if (pct >= 70) return { bar: 'bg-red', text: 'text-red' }
  if (pct >= 40) return { bar: 'bg-orange', text: 'text-orange' }
  return { bar: 'bg-green', text: 'text-green' }
}

/**
 * Which tracker a ticket ID belongs to, read from its shape alone.
 *
 * GitHub accepts the `#` or no `#`: `/magic:start` takes `^#?\d+$` from the person
 * and then uses the ID verbatim for the worktree directory and the branch name
 * (`magic-slash-196`, `feature/magic-slash-196-…`), so what it writes to
 * `/metadata` is the bare number. Requiring the `#` here is what left issues 196
 * and 197 with no mark and no link while Jira tickets beside them worked. The `#`
 * cannot simply be added upstream either: unencoded in a URL it opens a fragment,
 * so curl would drop it along with every parameter after it.
 *
 * Pure digits are unambiguous — a Jira key always carries its `ABC-` prefix.
 *
 * Returns null for anything else: a hand-typed reference is still a valid ticket
 * ID, and a wrong mark next to it would be worse than none.
 */
export function detectTicketProvider(ticketId: string | undefined): 'github' | 'jira' | null {
  if (!ticketId) return null
  if (/^#?\d+$/.test(ticketId)) return 'github'
  if (/^[A-Z]+-\d+$/.test(ticketId)) return 'jira'
  return null
}

/**
 * The tracker URL for a ticket ID, or null when none can be built — the ID is not
 * recognised, or the tracker it belongs to has no base URL configured.
 *
 * Deliberately separate from `detectTicketProvider`: the mark shows on shape alone,
 * so an unlinkable ID still says which tracker it came from.
 */
export function buildTicketLink(
  ticketId: string | undefined,
  urls: { jiraUrl?: string; githubIssuesUrl?: string },
): string | null {
  const provider = detectTicketProvider(ticketId)
  if (!ticketId || !provider) return null

  const base = provider === 'github' ? urls.githubIssuesUrl : urls.jiraUrl
  if (!base) return null

  // The `#` is display sugar, never part of the path.
  const segment = provider === 'github' ? ticketId.replace(/^#/, '') : ticketId
  return `${base.replace(/\/+$/, '')}/${segment}`
}
