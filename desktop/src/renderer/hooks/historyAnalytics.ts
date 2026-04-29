import type { HistoryEntry } from '../../types'

export interface WeeklyStats {
  started: number
  committed: number
  prCreated: number
  merged: number
}

export interface CycleTimeResult {
  avgDevTime: number | null
  avgReviewTime: number | null
}

export function computeHeatmapData(entries: HistoryEntry[]): Map<string, number> {
  const map = new Map<string, number>()
  const now = new Date()
  const cutoff = new Date(now)
  cutoff.setDate(cutoff.getDate() - 52 * 7)
  const cutoffTs = cutoff.getTime()

  for (const entry of entries) {
    if (entry.timestamp < cutoffTs) continue
    const d = new Date(entry.timestamp)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    map.set(key, (map.get(key) || 0) + 1)
  }

  return map
}

export function computeWeeklyStats(entries: HistoryEntry[]): WeeklyStats {
  const now = new Date()
  const day = now.getDay()
  // Monday = start of week (getDay: 0=Sun, 1=Mon, ..., 6=Sat)
  const diffToMonday = day === 0 ? 6 : day - 1
  const monday = new Date(now)
  monday.setHours(0, 0, 0, 0)
  monday.setDate(monday.getDate() - diffToMonday)
  const mondayTs = monday.getTime()

  const sunday = new Date(monday)
  sunday.setDate(sunday.getDate() + 7)
  const sundayTs = sunday.getTime()

  const stats: WeeklyStats = { started: 0, committed: 0, prCreated: 0, merged: 0 }

  for (const entry of entries) {
    if (entry.timestamp < mondayTs || entry.timestamp >= sundayTs) continue
    switch (entry.action) {
      case 'started':
        stats.started++
        break
      case 'committed':
        stats.committed++
        break
      case 'pr_created':
        stats.prCreated++
        break
      case 'merged':
        stats.merged++
        break
    }
  }

  return stats
}

export function computeCycleTime(entries: HistoryEntry[]): CycleTimeResult {
  // Group by ticketId
  const byTicket = new Map<string, HistoryEntry[]>()
  for (const entry of entries) {
    if (!entry.ticketId) continue
    if (!byTicket.has(entry.ticketId)) {
      byTicket.set(entry.ticketId, [])
    }
    byTicket.get(entry.ticketId)!.push(entry)
  }

  const devTimes: number[] = []
  const reviewTimes: number[] = []

  for (const ticketEntries of byTicket.values()) {
    const sorted = [...ticketEntries].sort((a, b) => a.timestamp - b.timestamp)

    const firstStarted = sorted.find(e => e.action === 'started')
    const prCreatedEntries = sorted.filter(e => e.action === 'pr_created')
    const mergedEntries = sorted.filter(e => e.action === 'merged')

    const lastPrCreated = prCreatedEntries.length > 0
      ? prCreatedEntries[prCreatedEntries.length - 1]
      : undefined
    const lastMerged = mergedEntries.length > 0
      ? mergedEntries[mergedEntries.length - 1]
      : undefined

    if (firstStarted && lastPrCreated) {
      devTimes.push(lastPrCreated.timestamp - firstStarted.timestamp)
    }

    if (lastPrCreated && lastMerged) {
      reviewTimes.push(lastMerged.timestamp - lastPrCreated.timestamp)
    }
  }

  return {
    avgDevTime: devTimes.length > 0
      ? devTimes.reduce((a, b) => a + b, 0) / devTimes.length
      : null,
    avgReviewTime: reviewTimes.length > 0
      ? reviewTimes.reduce((a, b) => a + b, 0) / reviewTimes.length
      : null,
  }
}

export function formatDuration(ms: number | null): string {
  if (ms === null) return '—'

  const minutes = Math.round(ms / 60_000)
  const hours = ms / 3_600_000

  if (hours < 1) {
    return `${minutes}min`
  }

  if (hours < 24) {
    const h = Math.floor(hours)
    const m = Math.round((hours - h) * 60)
    return m > 0 ? `${h}h ${m}min` : `${h}h`
  }

  const days = hours / 24
  // Round to 1 decimal
  const rounded = Math.round(days * 10) / 10
  return `${rounded}d`
}
