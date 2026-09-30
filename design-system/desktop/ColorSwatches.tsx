/**
 * A ROW OF COLOURS TO PICK ONE FROM: a radio group whose options are their own colour.
 *
 * Made for a `SettingRow` (`kind: 'swatches'`), where a colour is a setting like any
 * other: the workflow editor's custom step picks its card's ground with it. Each swatch
 * is the colour itself, square, the picked one outlined. An OUTLINE and not a ring, for
 * the repository colour picker's reason: the 2px gap stays see-through, whatever the
 * ground behind it.
 *
 * `label` is the group's accessible name, and each swatch's is the label and its value
 * ("Colour #6366F1"): the values are hexes, which is also what a swatch's tooltip says.
 * Re-picking the colour already picked reports nothing.
 */

export interface ColorSwatchesProps {
  /** The colours offered, as CSS colours, in the order drawn. */
  colors: readonly string[]
  /** The one picked. Compared without case: `#ec4899` is `#EC4899`. */
  value?: string
  onChange: (color: string) => void
  /** The group's accessible name: "Colour". */
  label: string
  disabled?: boolean
  /** How many swatches a row holds before the next starts: a palette in tones reads as a grid. Absent: they wrap. */
  columns?: number
  /** Margins and placement. */
  className?: string
}

export function ColorSwatches({ colors, value, onChange, label, disabled = false, columns, className = '' }: ColorSwatchesProps) {
  const picked = value?.toUpperCase()
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={`${columns ? 'grid w-max gap-2' : 'flex flex-wrap gap-2.5'} py-0.5 ${className}`.trim()}
      style={columns ? { gridTemplateColumns: `repeat(${columns}, 1.5rem)` } : undefined}
    >
      {colors.map((color) => {
        const on = picked === color.toUpperCase()
        return (
          <button
            key={color}
            type="button"
            role="radio"
            aria-checked={on}
            aria-label={`${label} ${color}`}
            title={color}
            disabled={disabled}
            onClick={() => { if (!on) onChange(color) }}
            className={`h-6 w-6 rounded-lg transition-transform disabled:cursor-not-allowed disabled:opacity-60 ${
              on ? 'outline outline-2 outline-offset-2 outline-ink' : 'enabled:hover:scale-110'
            }`}
            style={{ backgroundColor: color }}
          />
        )
      })}
    </div>
  )
}
