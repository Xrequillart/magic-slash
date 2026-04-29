import { useMemo } from 'react'
import type { HistoryGroup } from './useActivityHistory'
import { computeHeatmapData } from './historyAnalytics'

export function useHistoryAnalytics(groups: HistoryGroup[]) {
  const entries = useMemo(
    () => groups.flatMap(g => g.entries),
    [groups],
  )

  const heatmapData = useMemo(
    () => computeHeatmapData(entries),
    [entries],
  )

  return { heatmapData }
}
