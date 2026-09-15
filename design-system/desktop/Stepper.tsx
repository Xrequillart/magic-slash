import { BUTTON_ICON_SIZES, ButtonIcon, type ButtonIconSize } from './ButtonIcon'
import type { ComponentSize } from './componentSizes'
import { Minus, Plus } from './icons'
import { RAISED_PLATE } from './plate'
import { Text, type TextSize } from './Text'

/**
 * `(−) 100% (+)` — a value walked up and down in steps the caller owns.
 *
 * ONE PILL, and that is the whole of what this adds to two `ButtonIcon`s and a `Text`:
 * on the settings page the interface scale was three bordered squares and a number in
 * a row, four separate objects a reader had to group by proximity. Drawn on one plate
 * the value is visibly BETWEEN the two controls that change it, which is what a stepper
 * is — and the plate is what lets it stand in a row of round tiles as one of them.
 *
 * IT DOES NOT KNOW THE NUMBER. The value arrives as the string to draw — `100%`,
 * `1.25×`, `3 agents` — and the two arrows are two callbacks, because the steps are
 * never even: the zoom walks 0.8, 0.9, 1, 1.1, 1.25, 1.5 and a stepper that added one
 * would be wrong at every rung. What it does own is the SHAPE of the control and the
 * grammar of its limits: an arrow at the end of its range dims rather than disappears,
 * so the control keeps its width and the reader keeps their place.
 *
 * THE VALUE IS A BUTTON WHEN IT CAN BE — `onReset` given — and the platform's own
 * convention is what says so: tapping the readout on a stepper puts it back where it
 * started. It gets a tooltip because nothing on screen otherwise says the number is
 * pressable, and it dims like an arrow when already at the default.
 *
 * THE LADDER IS `ButtonIcon`'s. The pill is the rung's height, the two arrows are that
 * rung's `ghost` buttons drawn round, and the readout takes the rung's type — so a
 * stepper beside a `ToggleButton` at `2xl` is one row of 40px controls, not a 40px
 * circle beside a 28px bar.
 */

export type StepperSize = ComponentSize

/**
 * The readout's type and the room it is given, per rung.
 *
 * `minWidth` is what keeps the pill still while the number changes: `90%` and `125%`
 * are a glyph apart, and without a floor the two arrows would step towards each other
 * every time the value crossed 100. `tabular-nums` handles the glyphs; this handles
 * the count.
 */
const READOUTS: Record<StepperSize, { text: TextSize; minWidth: string }> = {
  '2xs': { text: '2xs', minWidth: 'min-w-7' },
  xs: { text: '2xs', minWidth: 'min-w-8' },
  sm: { text: 'xs', minWidth: 'min-w-9' },
  md: { text: 'xs', minWidth: 'min-w-10' },
  lg: { text: 'sm', minWidth: 'min-w-11' },
  xl: { text: 'sm', minWidth: 'min-w-12' },
  '2xl': { text: 'md', minWidth: 'min-w-14' },
}

export interface StepperProps {
  /** The readout, already formatted — `100%`. A string, so the caller decides the unit. */
  value: string
  onDecrement: () => void
  onIncrement: () => void
  /** FALSE at the bottom of the range: the arrow dims and stops. True unless said. */
  canDecrement?: boolean
  canIncrement?: boolean
  /** The two arrows' names. Translated, required — each is an icon-only control. */
  decrementTitle: string
  incrementTitle: string
  /**
   * Pressing the readout puts the value back. Given, the readout becomes a button
   * carrying `resetTitle`; absent, it is text.
   */
  onReset?: () => void
  /** The readout's tooltip and accessible name while it is a button. Translated. */
  resetTitle?: string
  /** FALSE when the value is already the default: the readout dims and stops. */
  canReset?: boolean
  /** Names the whole control for a screen reader — "Interface scale". Translated. */
  label: string
  /** Which rung. `2xl`, to stand beside a `ToggleButton` at rest. */
  size?: StepperSize
  disabled?: boolean
  /** Margins, placement and a fixed width — `w-44` beside two `SelectIcon`s given the same. Not the height, the ground or the radius. */
  className?: string
}

export function Stepper({
  value,
  onDecrement,
  onIncrement,
  canDecrement = true,
  canIncrement = true,
  decrementTitle,
  incrementTitle,
  onReset,
  resetTitle,
  canReset = true,
  label,
  size = '2xl',
  disabled = false,
  className = '',
}: StepperProps) {
  const shape = BUTTON_ICON_SIZES[size as ButtonIconSize]
  const readout = READOUTS[size]

  const readoutClass = `${readout.minWidth} px-1 text-center tabular-nums`

  return (
    <div
      role="group"
      aria-label={label}
      // The plate is `ToggleButton`'s OFF ground — `RAISED_PLATE`, opaque, for the
      // reason that file gives: on the frosted sheet a translucent plate is a hole — so
      // a stepper in a row of tiles reads as the same family at rest. The two arrows are
      // `ghost`, the tone for a button inside something that already has a plate.
      // `justify-between` costs nothing at the control's natural width and is what lets a
      // caller FIX the width — `className="w-44"` — with the arrows staying at the ends
      // and the readout centred between them, level with a `SelectIcon` given the same.
      className={`${shape.h} rounded-full ${RAISED_PLATE} inline-flex items-center justify-between flex-shrink-0 ${className}`}
    >
      <ButtonIcon
        icon={Minus}
        title={decrementTitle}
        onClick={onDecrement}
        tone="ghost"
        size={size as ButtonIconSize}
        round
        disabled={disabled || !canDecrement}
      />
      {onReset ? (
        <button
          type="button"
          onClick={onReset}
          title={resetTitle}
          aria-label={resetTitle}
          disabled={disabled || !canReset}
          className={`${readoutClass} border-none bg-transparent cursor-pointer rounded-md text-ink
            hover:text-accent transition-colors disabled:cursor-default disabled:text-ink`}
        >
          <Text size={readout.text} weight="medium" tone="inherit">
            {value}
          </Text>
        </button>
      ) : (
        <Text size={readout.text} weight="medium" className={readoutClass}>
          {value}
        </Text>
      )}
      <ButtonIcon
        icon={Plus}
        title={incrementTitle}
        onClick={onIncrement}
        tone="ghost"
        size={size as ButtonIconSize}
        round
        disabled={disabled || !canIncrement}
      />
    </div>
  )
}
