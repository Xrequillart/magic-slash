import { useMemo } from 'react'
import type { HistoryEntry } from '../../types'
import { computeHeatmapData } from './historyAnalytics'

export function useHistoryAnalytics(entries: HistoryEntry[]) {
  const heatmapData = useMemo(
    () => computeHeatmapData(entries),
    [entries],
  )

  return { heatmapData }
}
