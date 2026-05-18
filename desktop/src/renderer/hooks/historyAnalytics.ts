import type { HistoryEntry } from '../../types'

export function computeHeatmapData(entries: HistoryEntry[]): Map<string, number> {
  const map = new Map<string, number>()

  for (const entry of entries) {
    const d = new Date(entry.timestamp)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    map.set(key, (map.get(key) || 0) + 1)
  }

  return map
}
