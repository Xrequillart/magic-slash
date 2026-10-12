import { ProgressBar } from './ProgressBar'
import { Text } from './Text'
import type { ProgressTone } from './progressTones'

/**
 * A QUANTITY AGAINST ITS ALLOWANCE: the two figures, a bar, and the percentage they
 * come to — on a field's plate rather than a card's.
 *
 * WHAT IT SAYS AND `RateLimitBar` DOES NOT. That one reports a PROPORTION of something
 * the server owns — 62% of the week gone, resetting in two hours — and a proportion is
 * all it has; there is no "62 of 100 weeks" to print. This one is spending against a
 * number the reader can act on: 5 200 of 8 000 characters, where BOTH figures matter
 * because the interesting question is how much room is left, not what fraction is used.
 * The percentage is the afterthought here and the whole statement there, which is why
 * it sits quiet under the bar rather than bold above it.
 *
 * THE PLATE IS A FIELD'S AND NOT A CARD'S — `surface-subtle`, the ground the app gives
 * an inert readout rather than a panel. `Card` paints `bg-surface`, which is the raised
 * thing these sit INSIDE.
 *
 * NO OUTLINE, the same call `NoteCard` makes and for the same reason: the tint already
 * says where the plate ends, and a hairline around it answers that twice. It mattered
 * more here than anywhere, because these come in PAIRS side by side — two outlined
 * boxes with a 12px gutter between them read as a table of two cells, and the thing
 * worth comparing is the two bars, not the two frames.
 */

export interface BudgetMeterProps {
  /** What is being spent — "Characters", "Tokens". Translated. */
  label: string
  /** How much is spent. May exceed `max`; see `tone`. */
  value: number
  /** The allowance. */
  max: number
  /** The noun after the pair — "chars", "tokens". Translated. */
  unit: string
  /**
   * The locale the two figures are GROUPED in.
   *
   * IT HAS TO BE PASSED. A bare `toLocaleString()` follows the machine's locale, which
   * is not the language the app is showing — a French window on an English machine
   * groups with commas and reads as somebody else's number. This folder cannot reach
   * the app's i18n, so the caller hands the tag over. It is `Intl`'s own contract, not
   * a translation: nothing here is looked up.
   */
  locale: string
  /**
   * The colour while the reading is WITHIN the allowance. Past it the bar goes
   * `danger` whatever this says.
   *
   * OVER IS NOT A DARKER SHADE OF NEARLY-FULL. Past the line the thing measuring stops
   * working altogether — a listing past its budget is a listing with descriptions
   * dropped — and the bar is clamped at 100%, so "over" is not a width it could ever
   * show. It has to be a colour.
   */
  tone?: ProgressTone
  /** Margins and width. Not the plate, the padding or the radius. */
  className?: string
}

export function BudgetMeter({ label, value, max, unit, locale, tone = 'accent', className = '' }: BudgetMeterProps) {
  // `max` guards the caller that computed a budget of zero: a bar reading NaN% draws
  // nothing and says nothing about why.
  const percentage = max > 0 ? Math.min(Math.round((value / max) * 100), 100) : 0
  const shown: ProgressTone = value > max ? 'danger' : tone

  return (
    <div className={`px-4 py-3 rounded-xl bg-surface-subtle ${className}`.trim()}>
      <div className="flex items-center justify-between gap-3 mb-2">
        <Text tone="secondary" className="truncate">
          {label}
        </Text>
        {/* `tabular-nums` for `RateLimitBar`'s reason: this pair climbs while skills are
            read off disk, and proportional figures make the unit beside them walk. */}
        <Text tone="secondary" className="flex-shrink-0 tabular-nums">
          {`${value.toLocaleString(locale)} / ${max.toLocaleString(locale)} ${unit}`}
        </Text>
      </div>
      {/* NO SHIMMER, and it is not an oversight. The fill this replaced swept with
          `shimmer-sweep`, a keyframe declared in the desktop's stylesheet and nowhere
          else; the webapp compiles this same file and has none, so the design-system
          page would document a bar that moves in the app and sits still on the page. */}
      <ProgressBar value={percentage} tone={shown} size="md" label={label} />
      <Text size="2xs" tone="secondary" className="mt-1.5 block text-right opacity-60 tabular-nums">
        {`${percentage}%`}
      </Text>
    </div>
  )
}
