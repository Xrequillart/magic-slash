import type { HistoryEntry } from '../../types'

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
