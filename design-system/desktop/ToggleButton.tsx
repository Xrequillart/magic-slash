import { BUTTON_ICON_SIZES, type ButtonIconSize } from './ButtonIcon'
import type { ComponentSize } from './componentSizes'
import { RoundFlag } from './Flag'
import { Icon } from './Icon'
import { Label } from './Label'
import { RAISED_PLATE, RAISED_PLATE_HOVER } from './plate'
import { Text, type TextSize } from './Text'
import type { IconComponent } from './types'

/**
 * A ROUND SWITCH WITH A MARK ON IT — macOS's Control Center tile, at this folder's scale.
 *
 * It is what a feature looks like when it can be turned on or off from a menu that has
 * no room for a sentence: a circle that is FILLED while the feature is on and a plate
 * while it is off, with the mark saying which feature and the word under it saying so
 * again for anyone the mark does not reach. Wi‑Fi, Bluetooth, AirDrop — here it is the
 * split view, Quick Launch, the PR watcher.
 *
 * WHAT IT IS NOT. Not a `Switch`: that is a track and a knob beside a line of settings
 * text, and it answers its row. This IS the row — the mark is the noun and the fill is
 * whether it applies — so it stands in a grid of its siblings, not beside a label. And
 * not a `ButtonIcon` with `active`: that lights the mark on a tinted plate because it
 * sits in a row of equal siblings where one is doing something. This fills the whole
 * circle, because every tile in the grid is a state and half of them are on at once —
 * a tint would leave the grid reading as four things hovered.
 *
 * `role="switch"` AND NOT `aria-pressed`, for the reason `Switch` gives: this is a
 * setting that is on or off and takes effect the moment you say so, and a screen reader
 * should say "switch, on" rather than "toggle button, pressed". Nothing here has a save
 * button behind it.
 *
 * THE OFF PLATE IS `RAISED_PLATE` — opaque, shared, see `plate.ts` — and not
 * `ButtonIcon`'s `ink/10`. A tile lives on `ControlCenter`'s sheet, whose ground is a
 * thin frost over the blurred app; a translucent plate on a translucent ground is a
 * plate at whatever the ground happens to be, and the tiles read as holes in the frost.
 * An opaque plate stands ON it, and the same plate under the card beside them is what
 * makes the sheet one family. The hover is a brightness step for the same reason: a
 * second translucent colour would be a second hole.
 *
 * THE LADDER IS `ButtonIcon`'s — the same table, so a tile and a round `SelectIcon` in
 * one row stand the same height. Only the radius differs, and it is always full: a
 * tile that was not a circle would be a `ButtonIcon` with a different colour.
 */

export type ToggleButtonSize = ComponentSize

/**
 * The word under the circle, keyed by the circle's rung.
 *
 * Two sizes and not seven: below `lg` a tile is too small to carry a word at all, so
 * the caption is simply not drawn — `Text`'s `2xs` under a 24px circle is a smudge and
 * not a label. From `lg` up it is 10px, then 12px from `xl`, which is what a 36 or 40px
 * circle has room for without the word growing wider than the thing it names.
 */
const CAPTIONS: Partial<Record<ToggleButtonSize, TextSize>> = {
  lg: '2xs',
  xl: 'xs',
  '2xl': 'xs',
}

export interface ToggleButtonProps {
  /** The mark. From `@ds/desktop/icons`. One of `icon` and `flag` is required. */
  icon?: IconComponent
  /**
   * A FLAG AS THE WHOLE TILE — a language code, `fr`, drawn by `RoundFlag` filling the
   * circle, the marketing site's disc flags as tiles.
   *
   * For the one grid where the tiles are not features but CHOICES of one thing: the
   * quick-settings sheet picks the app's language from a row of these, and a lucide
   * glyph has no way to say "French". The tile then reads as a radio: pressing the one
   * in force does nothing, and the caller lights whichever is chosen. There is no fill
   * to light, the flag IS the fill — so the one in force wears a ring of the accent and
   * the others stand back at half strength, in colour: a greyed flag is a wrong flag.
   */
  flag?: string
  /**
   * The mark while OFF, when turning the feature off changes what it is rather than
   * just its state — notifications become `BellOff`. Absent, the same glyph is drawn
   * in both positions and the fill alone says which.
   */
  offIcon?: IconComponent
  /**
   * WHAT OFF LOOKS LIKE. `neutral` is the plate, and is every tile but one: off is simply
   * not on. `danger` is for the feature whose absence is itself a state worth seeing —
   * notifications, where "off" means "nothing will reach you" and a grey circle among
   * grey circles says nothing of the kind. A red TINT and not a red fill: a filled circle
   * is what ON looks like, and a tile that was full in both positions would have no off.
   */
  offTone?: 'neutral' | 'danger'
  checked: boolean
  onChange: (next: boolean) => void
  /**
   * The name of the feature. REQUIRED: it is the tooltip, the accessible name, and
   * — from `lg` up — the caption drawn under the circle. One string for all three,
   * because a tile whose caption and whose accessible name disagreed would be lying
   * to one of its readers.
   */
  label: string
  /**
   * Whether the word is drawn under the circle at all. TRUE by default, because a grid
   * of marks with no words is a grid only its author can read; a caller with the word
   * already beside the tile turns it off.
   */
  caption?: boolean
  /** Which rung. `2xl` — 40px — because a tile is the subject of its grid, not a row's answer. */
  size?: ToggleButtonSize
  disabled?: boolean
  /** Margins and placement. Not the size, the fill or the radius. */
  className?: string
}

export function ToggleButton({
  icon,
  flag,
  offIcon,
  offTone = 'neutral',
  checked,
  onChange,
  label,
  caption = true,
  size = '2xl',
  disabled = false,
  className = '',
}: ToggleButtonProps) {
  const shape = BUTTON_ICON_SIZES[size as ButtonIconSize]
  const captionSize = caption ? CAPTIONS[size] : undefined
  const glyph = checked || !offIcon ? icon : offIcon
  // A flag fills the circle; a mark sits in it.
  const mark = flag
    ? <RoundFlag code={flag} className="h-full w-full" />
    : glyph
      ? <Icon glyph={glyph} size={shape.icon} tone="inherit" />
      : null
  // ON IS THE THEME'S ACCENT. The marketing site's brand blue was tried for a moment
  // and put back — the colour question is open, and until it is settled the tiles wear
  // what every other lit control in the app wears.
  const ground = flag
    ? checked
      ? 'ring-2 ring-accent ring-offset-2 ring-offset-bg'
      : 'opacity-50 hover:opacity-100'
    : checked
      ? 'bg-accent text-on-brand hover:bg-accent-hover'
      : offTone === 'danger'
        ? 'bg-red/20 text-red hover:bg-red/30'
        : `${RAISED_PLATE} text-icon ${RAISED_PLATE_HOVER} hover:text-ink`

  const circle = (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      // The native tooltip only where the tile has a caption to sit under; without one
      // the pill below is the tooltip, and two would be the name said twice.
      title={captionSize ? label : undefined}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      // `active:scale-95` is the press: a control this big with no travel and no knob
      // needs SOMETHING to happen under the finger, and a 5% dip is what every round
      // control on the platform does. `transition-[background-color,color,transform]`
      // rather than `transition-all`, so nothing else is ever caught easing.
      className={`${shape.h} ${shape.w} rounded-full inline-flex items-center justify-center
        border-none cursor-pointer flex-shrink-0 active:scale-95
        transition-[background-color,color,transform,opacity,box-shadow] duration-200
        disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100 ${ground}`}
    >
      {mark}
    </button>
  )

  if (!captionSize) {
    return (
      // NO CAPTION, SO A TOOLTIP — the word has to be somewhere a hand can find it, and
      // the native `title` arrives a second late and in the platform's own dress. This
      // one is a `Label` under the circle: mark-less, and on the tiles' own plate that
      // names things everywhere else in the app. HOVER ONLY. The first draft also showed it on
      // `focus-within`, and a pressed tile keeps the focus after the pointer has left —
      // so the pill stayed up over one tile while the pointer was on another, which is
      // the bug the product owner found. Keyboard readers have the `aria-label`. Out of
      // the way of the pointer (`pointer-events-none`), above the neighbours, and
      // `aria-hidden` so the name is not read twice.
      <span className={`relative inline-flex group ${className}`}>
        {circle}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-full z-10 mt-1.5 -translate-x-1/2
            opacity-0 transition-opacity duration-150 group-hover:opacity-100"
        >
          {/* `raised` AND NOT THE NEUTRAL PLATE. A tooltip hangs over the frost like the
              tile it names — `bg-ink/5` there is a plate at whatever the blur happens to
              be, which is the see-through pill the product owner could barely read — so it
              stands on `RAISED_PLATE`, opaque, the same plate the tile wears while off.
              No `backdrop-filter`: see `ControlCenter`, where that was measured and the
              window's blur moved to a plain `filter` on the app's body instead. */}
          <Label raised size="sm" className="whitespace-nowrap shadow-lg">{label}</Label>
        </span>
      </span>
    )
  }

  return (
    // The tile is a COLUMN — circle, then word — and it is as wide as the word needs,
    // capped so a long feature name wraps under the circle rather than widening the grid
    // cell. `w-16` at 40px leaves 12px each side of the circle, which is what makes a
    // grid of these read as tiles rather than as a row of buttons with captions.
    <div className={`inline-flex flex-col items-center gap-1.5 w-16 ${className}`}>
      {circle}
      <Text
        size={captionSize}
        tone={checked ? 'ink' : 'secondary'}
        className="text-center leading-tight line-clamp-2 transition-colors duration-200"
      >
        {label}
      </Text>
    </div>
  )
}
