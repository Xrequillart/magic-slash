/**
 * The steps a progress fill can take, and where it takes them.
 *
 * A MODULE THAT IMPORTS NOTHING, for `avatarSizes.ts`'s and `palette.ts`'s reason:
 * the root Vitest suite runs on the ROOT `node_modules`, where React does not exist,
 * so anything reaching a `.tsx` is unreachable from it. `progressTone` is asserted by
 * `agent-info-sidebar/utils.test.ts` — the thresholds are a product decision worth a
 * test — and leaving it in `ProgressBar.tsx` took that whole test FILE down with it,
 * silently: the suite dropped 46 tests and still reported green.
 *
 * Keep it that way. The rule is not "prefer pure modules", it is "anything a test can
 * reach imports nothing".
 */

/**
 * Where the fill changes colour, if it does.
 *
 * Two numbers because there are two steps, and they are the caller's because the
 * same percentage means opposite things on different gauges: 60% of a weekly quota
 * is unremarkable, 60% of a context window is most of the way to a compaction. The
 * app's own two gauges disagreed by 25 points for exactly that reason, and both were
 * right.
 *
 * `warning` is ORANGE and `danger` RED, which is the rule `Banner` states: yellow is
 * what this app gives a PENDING state — a check running, a PR waiting — and a gauge
 * filling up is not a gauge waiting.
 */
export interface ProgressThresholds {
  /** At or above this, the fill turns orange. */
  warning: number
  /** At or above this, red. Wins over `warning`. */
  danger: number
}

/**
 * The fill, when thresholds have nothing to say — either because there are none or
 * because the value sits below the first one.
 *
 * `accent` is the odd one and it is not a severity: the update download is the app
 * reporting its own progress, where green would read as a verdict on something that
 * has not finished happening.
 */
export type ProgressTone = 'success' | 'warning' | 'danger' | 'accent'

export const PROGRESS_FILLS: Record<ProgressTone, string> = {
  success: 'bg-green',
  warning: 'bg-orange',
  danger: 'bg-red',
  accent: 'bg-accent',
}

/**
 * The same four as text, for the percentage a caller prints beside the bar.
 *
 * Exported because that label is not this component's — it sits outside the track,
 * in the caller's own row — and it has to agree with the fill. Every one of the five
 * bars had a number next to it in a matching colour, computed by the same function
 * that coloured the fill. `progressTone` is what keeps them in step now.
 */
export const PROGRESS_TEXT: Record<ProgressTone, string> = {
  success: 'text-green',
  warning: 'text-orange',
  danger: 'text-red',
  accent: 'text-accent',
}

/**
 * Which tone a value lands on. The caller uses it for the label; the bar uses it for
 * the fill.
 */
export function progressTone(value: number, thresholds?: ProgressThresholds, tone: ProgressTone = 'success'): ProgressTone {
  if (!thresholds) return tone
  if (value >= thresholds.danger) return 'danger'
  if (value >= thresholds.warning) return 'warning'
  return tone
}
