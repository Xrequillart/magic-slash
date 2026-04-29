import { useMemo } from 'react'
import type { HistoryGroup } from './useActivityHistory'
import {
  computeHeatmapData,
  computeWeeklyStats,
  computeCycleTime,
} from './historyAnalytics'

export type { WeeklyStats } from './historyAnalytics'

export function useHistoryAnalytics(groups: HistoryGroup[]) {
  const entries = useMemo(
    () => groups.flatMap(g => g.entries),
    [groups],
  )

  const heatmapData = useMemo(
    () => computeHeatmapData(entries),
    [entries],
  )

  const weeklyStats = useMemo(
    () => computeWeeklyStats(entries),
    [entries],
  )

  const { avgDevTime, avgReviewTime } = useMemo(
    () => computeCycleTime(entries),
    [entries],
  )

  return { heatmapData, weeklyStats, avgDevTime, avgReviewTime }
}
