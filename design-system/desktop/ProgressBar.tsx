import {
  PROGRESS_FILLS,
  PROGRESS_TEXT,
  progressTone,
  type ProgressThresholds,
  type ProgressTone,
} from './progressTones'

/**
 * A filled track — how much of something is used.
 *
 * It was five bars drawn by hand: the context gauge in the agent card, the plan
 * limits in three places, and the update download. Same shape every time —
 * `h-* w-full rounded-full bg-* overflow-hidden` wrapping a `rounded-full` fill on a
 * `style={{ width }}` — with two different sets of thresholds and two different
 * tracks, none of it stated anywhere the next bar could find it.
 *
 * GREEN BY DEFAULT, and green all the way to 100% unless you say otherwise. A bar
 * that reddens on its own is a bar with an opinion about what it is measuring, and
 * this one measures nothing in particular: a download at 90% is nearly done, not
 * nearly broken.
 */

/** The three heights the app draws, thinnest first. */
export type ProgressSize = 'xs' | 'sm' | 'md'

const SIZES: Record<ProgressSize, string> = {
  /** A sidebar mini-bar, squeezed beside a label and a number. */
  xs: 'h-1',
  /** The common one: the context gauge, the sidebar limits, the download. */
  sm: 'h-1.5',
  /** The agent sidebar's plan limits, where the bar is the row's subject. */
  md: 'h-2',
}

/**
 * The well the fill runs in.
 *
 * `surface` is a raised sliver, `sunken` a recess, `strong` the one in between. All
 * three are in the app, and the difference is not always decorative: the context
 * gauge keeps a well AT ALL TIMES because it is what makes the REMAINDER legible — a
 * fill floating on nothing says how much is used without saying of what.
 *
 * THREE IS PROBABLY ONE TOO MANY. `sunken` has a reason; `surface` against `strong`
 * is 6% against 10% and nobody wrote down why the sub-issue bar needed the heavier
 * one. They are all here because collapsing them silently would change how a screen
 * looks on the way to tidying a table — which is a decision for a person, not for a
 * migration.
 */
export type ProgressTrack = 'surface' | 'strong' | 'sunken'

const TRACKS: Record<ProgressTrack, string> = {
  surface: 'bg-surface',
  /** For a bar sitting ON a surface, where the default well disappears into it. */
  strong: 'bg-surface-strong',
  sunken: 'bg-surface-sunken',
}

export interface ProgressBarProps {
  /** 0 to 100. Clamped, so a caller doing its own arithmetic cannot overflow the track. */
  value: number
  /** The colour below the first threshold, or the only colour when there are none. */
  tone?: ProgressTone
  thresholds?: ProgressThresholds
  size?: ProgressSize
  track?: ProgressTrack
  /** What the bar is measuring, for a screen reader. Without it the bar is decorative. */
  label?: string
  /**
   * Whether the fill EASES between readings. On by default, and off for one reason:
   * the caller is already animating `value` itself.
   *
   * The easing exists because a gauge's value arrives every few seconds, and a bar
   * that jumped between two readings would read as a glitch. Turn it on a value that
   * changes every frame and it fights: each new value restarts a 500ms ease from
   * wherever the last one had got to, so the bar crawls behind the number and can end
   * up three times as full as the percentage beside it claims. Measured on the
   * marketing site's context illustration, which ramps 0 → 54 over two seconds: the
   * bar sat at 88% of its final width while the label read 26%.
   */
  transition?: boolean
  /** Width and margins. Not the height, the radius or either colour. */
  className?: string
}

export { PROGRESS_TEXT, progressTone }
export type { ProgressThresholds, ProgressTone }

export function ProgressBar({
  value,
  tone = 'success',
  thresholds,
  size = 'sm',
  track = 'surface',
  label,
  transition = true,
  className = '',
}: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, value))
  const fill = PROGRESS_FILLS[progressTone(pct, thresholds, tone)]

  return (
    <div
      role={label ? 'progressbar' : undefined}
      aria-label={label}
      aria-valuenow={label ? Math.round(pct) : undefined}
      aria-valuemin={label ? 0 : undefined}
      aria-valuemax={label ? 100 : undefined}
      className={`${SIZES[size]} ${TRACKS[track]} w-full rounded-full overflow-hidden ${className}`}
    >
      {/* The fill keeps its own `rounded-full`: at `h-1` the track's radius is larger
          than the fill is tall, and a square fill inside a round well is visible at the
          left edge. */}
      <div
        className={`h-full rounded-full ${fill} ${transition ? 'transition-all duration-500' : 'transition-colors duration-300'}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}
