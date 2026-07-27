// Gauge primitives for the Claude plan rate limits (Session 5h / Weekly 7d),
// shared by every surface that renders them: the agent info sidebar, the sidebar
// usage card and the Claude Code settings tab.

import { useT } from '../../i18n'
import type { Translate } from '../../i18n'

// Traffic-light color for a fill gauge: green → yellow → red as it fills up.
export function gaugeColors(pct: number): { bar: string; text: string } {
  if (pct >= 85) return { bar: 'bg-red', text: 'text-red' }
  if (pct >= 65) return { bar: 'bg-yellow', text: 'text-yellow' }
  return { bar: 'bg-green', text: 'text-green' }
}

// Compact "time until reset" from a unix-epoch-seconds timestamp: 45m, 2h14, 3d,
// soon. Takes a translator rather than reading one itself so it stays callable
// from a non-component context (and from a node-environment test).
export function formatReset(resetsAtSec: number, nowMs: number, t: Translate): string {
  const diffSec = Math.floor((resetsAtSec * 1000 - nowMs) / 1000)
  if (diffSec <= 0) return t('usage.reset.soon')
  const days = Math.floor(diffSec / 86_400)
  if (days >= 1) return t('usage.reset.days', { count: days })
  const hours = Math.floor(diffSec / 3_600)
  const minutes = Math.floor((diffSec % 3_600) / 60)
  if (hours >= 1) return t('usage.reset.hours', { hours, minutes: String(minutes).padStart(2, '0') })
  return t('usage.reset.minutes', { count: Math.max(1, minutes) })
}

// Full-width progress bar for one plan rate limit, sized for a settings card:
// name on the left, reset countdown + percentage on the right, bar underneath.
// The sidebar has its own narrower variant — this one is for wide containers.
export function RateLimitBar({ label, percent, resetsAt, now }: {
  label: string
  percent: number
  resetsAt?: number
  now: number
}) {
  const t = useT()
  const pct = Math.min(100, Math.max(0, percent))
  const colors = gaugeColors(pct)

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm">{label}</span>
        <span className="flex items-baseline gap-2">
          {typeof resetsAt === 'number' && (
            <span className="text-[11px] text-text-secondary/40">
              {t('usage.resetsIn', { time: formatReset(resetsAt, now, t) })}
            </span>
          )}
          <span className={`text-sm font-semibold tabular-nums ${colors.text}`}>{Math.round(pct)}%</span>
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-surface overflow-hidden">
        <div
          className={`h-full rounded-full ${colors.bar} transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
