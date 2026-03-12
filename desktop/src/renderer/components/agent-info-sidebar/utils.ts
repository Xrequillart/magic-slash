// Format a timestamp (ms) to compact relative time (now, 5min, 2h, 3d, 1w, 2mo, 1y)
export function formatTimestamp(tsCreate: number, now?: number): string {
  const current = now ?? Date.now()
  const diffMs = current - tsCreate
  if (diffMs < 60_000) return 'now'

  const minutes = Math.floor(diffMs / 60_000)
  if (minutes < 60) return `${minutes}min`

  const hours = Math.floor(diffMs / 3_600_000)
  if (hours < 24) return `${hours}h`

  const days = Math.floor(diffMs / 86_400_000)
  if (days < 7) return `${days}d`

  const weeks = Math.floor(days / 7)
  if (weeks < 5) return `${weeks}w`

  const months = Math.floor(days / 30)
  if (months < 12) return `${months}mo`

  const years = Math.floor(days / 365)
  return `${years}y`
}

// Format relative date to short format (15min, 3h, 1d, 15d, 1mo5d, etc.)
export function formatRelativeDate(relativeDate: string): string {
  // Parse git's relative date format (e.g., "2 hours ago", "3 days ago", "1 month, 2 weeks ago")
  const match = relativeDate.match(/(\d+)\s+(second|minute|hour|day|week|month|year)s?\s*(?:,\s*(\d+)\s+(day|week)s?)?/i)
  if (!match) return relativeDate

  const value = parseInt(match[1])
  const unit = match[2].toLowerCase()
  const subValue = match[3] ? parseInt(match[3]) : 0
  const subUnit = match[4]?.toLowerCase()

  const unitMap: Record<string, string> = {
    second: 's',
    minute: 'min',
    hour: 'h',
    day: 'd',
    week: 'w',
    month: 'mo',
    year: 'y'
  }

  let result = `${value}${unitMap[unit] || unit}`

  // Add sub-unit if present (e.g., "1 month, 5 days" -> "1mo5d")
  if (subValue && subUnit) {
    result += `${subValue}${unitMap[subUnit] || subUnit}`
  }

  return result
}
