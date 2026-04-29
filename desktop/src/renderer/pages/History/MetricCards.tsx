import { Play, GitCommit, GitPullRequest, GitMerge, Clock, Eye } from 'lucide-react'
import type { WeeklyStats } from '../../hooks/useHistoryAnalytics'
import { formatDuration } from '../../hooks/historyAnalytics'

interface MetricCardsProps {
  weeklyStats: WeeklyStats
  avgDevTime: number | null
  avgReviewTime: number | null
}

const cards = [
  { key: 'started', label: 'Started', color: 'green', Icon: Play },
  { key: 'committed', label: 'Commits', color: 'yellow', Icon: GitCommit },
  { key: 'prCreated', label: 'PRs created', color: 'blue', Icon: GitPullRequest },
  { key: 'merged', label: 'Merged', color: 'green', Icon: GitMerge },
  { key: 'devTime', label: 'Dev time', color: 'blue', Icon: Clock },
  { key: 'reviewTime', label: 'Review time', color: 'purple', Icon: Eye },
] as const

const colorMap: Record<string, { bg: string; text: string }> = {
  green: { bg: 'bg-green/10', text: 'text-green' },
  yellow: { bg: 'bg-yellow/10', text: 'text-yellow' },
  blue: { bg: 'bg-blue/10', text: 'text-blue' },
  purple: { bg: 'bg-purple/10', text: 'text-purple' },
}

export function MetricCards({ weeklyStats, avgDevTime, avgReviewTime }: MetricCardsProps) {
  function getValue(key: string): string {
    switch (key) {
      case 'started':
        return String(weeklyStats.started)
      case 'committed':
        return String(weeklyStats.committed)
      case 'prCreated':
        return String(weeklyStats.prCreated)
      case 'merged':
        return String(weeklyStats.merged)
      case 'devTime':
        return formatDuration(avgDevTime)
      case 'reviewTime':
        return formatDuration(avgReviewTime)
      default:
        return '—'
    }
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {cards.map(({ key, label, color, Icon }) => {
        const colors = colorMap[color]
        return (
          <div
            key={key}
            className="bg-white/[0.06] rounded-xl p-4"
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 ${colors.bg} rounded-lg`}>
                <Icon className={`w-4 h-4 ${colors.text}`} />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{getValue(key)}</div>
                <div className="text-xs text-text-secondary mt-1">{label}</div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
