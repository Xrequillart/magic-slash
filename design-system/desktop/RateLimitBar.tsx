import { ProgressBar, PROGRESS_TEXT, progressTone } from './ProgressBar'
import { Text } from './Text'

/**
 * ONE PLAN RATE LIMIT, FULL WIDTH: what it is, when it turns over, how much is gone.
 *
 * It was `components/agent-info-sidebar/LimitGauge.tsx` in the app, shared from there by
 * three surfaces — the agent sidebar, the sidebar usage card and the Claude Code tab. A
 * gauge three screens draw is a design system component that happened to be filed under
 * the first screen that needed it; `Card` says the same thing about its own name.
 *
 * ── WHERE IT TURNS ────────────────────────────────────────────────────────────────
 *
 * LATE, and that is the point: 65% of a weekly quota is a normal Wednesday. The context
 * gauge turns at 40 and 70 instead, because filling a context window is what triggers a
 * compaction. Two gauges, two honest answers, which is why the thresholds travel with
 * THIS component rather than living on `ProgressBar`.
 *
 * The warning step is ORANGE and was yellow. Nothing explained the yellow, and this app
 * gives yellow to a PENDING state — a check running, a PR waiting. A gauge filling up is
 * not a gauge waiting.
 *
 * ── THE COUNTDOWN ARRIVES AS A STRING ─────────────────────────────────────────────
 *
 * "resets in 2h14" is a sentence in somebody's language, built from a unix timestamp and
 * a clock that has to tick. Both are the app's: this folder cannot read a translation,
 * and a component that set its own interval would re-render three surfaces on a timer
 * none of them asked for. The app formats it and passes the words.
 */

/** Where a plan's rate limit turns. See the header for why it is late, and why it is here. */
export const LIMIT_THRESHOLDS = { warning: 65, danger: 85 }

export interface RateLimitBarProps {
  /** Which limit this is — "Session", "Weekly". Translated. */
  label: string
  /** How much of it is gone, 0 to 100. Clamped: a server may report 103. */
  percent: number
  /** "resets in 2h14", already built and translated. Omitted draws nothing. */
  resets?: string
  /** Margins and width. Not the bar, the type or the tones. */
  className?: string
}

export function RateLimitBar({ label, percent, resets, className = '' }: RateLimitBarProps) {
  const pct = Math.min(100, Math.max(0, percent))
  const tone = progressTone(pct, LIMIT_THRESHOLDS)

  return (
    <div className={`flex flex-col gap-1.5 ${className}`.trim()}>
      <div className="flex items-baseline justify-between gap-3">
        <Text size="sm">{label}</Text>
        <span className="flex items-baseline gap-2">
          {resets && (
            <Text size="2xs" tone="secondary" className="opacity-40">
              {resets}
            </Text>
          )}
          {/* `tabular-nums` so the figure does not jitter as it climbs: 8% and 88% have
              to occupy the same box, or the countdown beside it walks left and right
              every thirty seconds. */}
          <Text size="sm" weight="bold" tone="inherit" className={`tabular-nums ${PROGRESS_TEXT[tone]}`}>
            {`${Math.round(pct)}%`}
          </Text>
        </span>
      </div>
      <ProgressBar value={pct} thresholds={LIMIT_THRESHOLDS} size="md" label={label} />
    </div>
  )
}
