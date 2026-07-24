import type { UsageStatRow } from '../../types'

/** Format a USD amount for display: `<$0.01` under a cent, rounded thousands, else two decimals. */
export function formatUsd(n: number): string {
  if (n > 0 && n < 0.01) return '<$0.01'
  if (n >= 1000) return `$${Math.round(n).toLocaleString('en-US')}`
  return `$${n.toFixed(2)}`
}

export interface UsageTotals {
  costUsd: number
  linesAdded: number
  linesRemoved: number
  durationMs: number
  sessions: number
}

export interface MemberUsage {
  userId: string
  costUsd: number
  sessions: number
}

/** Sum the headline totals across all usage rows. */
export function aggregateUsageTotals(rows: UsageStatRow[]): UsageTotals {
  const totals: UsageTotals = { costUsd: 0, linesAdded: 0, linesRemoved: 0, durationMs: 0, sessions: rows.length }
  for (const r of rows) {
    totals.costUsd += r.costUsd
    totals.linesAdded += r.linesAdded
    totals.linesRemoved += r.linesRemoved
    totals.durationMs += r.durationMs
  }
  return totals
}

/** Per-member cost + session counts, sorted by cost descending. Rows with no owner are grouped under ''. */
export function aggregateUsageByMember(rows: UsageStatRow[]): MemberUsage[] {
  const byUser = new Map<string, MemberUsage>()
  for (const r of rows) {
    const userId = r.userId ?? ''
    const entry = byUser.get(userId) ?? { userId, costUsd: 0, sessions: 0 }
    entry.costUsd += r.costUsd
    entry.sessions += 1
    byUser.set(userId, entry)
  }
  return [...byUser.values()].sort((a, b) => b.costUsd - a.costUsd)
}

/**
 * Session count per calendar day, keyed as YYYY-MM-DD in local time — the exact
 * key shape ActivityHeatmap expects, so the heatmap can render usage over time.
 */
export function computeUsageHeatmap(rows: UsageStatRow[]): Map<string, number> {
  const map = new Map<string, number>()
  for (const r of rows) {
    const d = new Date(r.occurredAt)
    if (Number.isNaN(d.getTime())) continue
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    map.set(key, (map.get(key) || 0) + 1)
  }
  return map
}
