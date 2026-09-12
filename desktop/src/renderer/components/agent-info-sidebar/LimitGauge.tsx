// Gauge primitives for the Claude plan rate limits (Session 5h / Weekly 7d),
// shared by every surface that renders them: the agent info sidebar, the sidebar
// usage card and the Claude Code settings tab.

import { PROGRESS_TEXT, ProgressBar, progressTone } from '@ds/desktop'
import { useT } from '../../i18n'
import type { Translate } from '../../i18n'

/**
 * Where a plan's rate limit turns.
 *
 * LATE, and that is the point: 65% of a weekly quota is a normal Wednesday. The
 * context gauge in `UsageCard` turns at 40 and 70 instead, because filling a context
 * window is what triggers a compaction. Two gauges, two honest answers.
 *
 * The warning step is ORANGE now and was YELLOW. Nothing explained the yellow, and
 * this app gives yellow to a PENDING state — a check running, a PR waiting. A gauge
 * filling up is not a gauge waiting. See `ProgressBar`.
 */
export const LIMIT_THRESHOLDS = { warning: 65, danger: 85 }

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
  const tone = progressTone(pct, LIMIT_THRESHOLDS)

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
          <span className={`text-sm font-semibold tabular-nums ${PROGRESS_TEXT[tone]}`}>{Math.round(pct)}%</span>
        </span>
      </div>
      <ProgressBar value={pct} thresholds={LIMIT_THRESHOLDS} size="md" label={label} />
    </div>
  )
}
