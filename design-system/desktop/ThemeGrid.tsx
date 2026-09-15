import { Card } from './Card'

/**
 * EIGHT THEMES TO LOOK AT, four to a line, the one in force ringed — the quick-settings
 * sheet's theme picker, and the reason it is not a `SelectIcon` with eight words in it: a
 * theme is a look, and a look is chosen by looking.
 *
 * IT KNOWS NO THEME. The registry lives in the app's main process as well as its
 * renderer and cannot move here; so each theme arrives as the FIVE COLOURS a swatch
 * needs, already resolved to CSS values, and this draws them. The swatch itself is a
 * private drawing of this file — 40 by 32, the floor, a strip of the panel surface down
 * the left, a line of the ink and a dot of the accent. The Appearance page's miniature
 * draws a whole window, and shrunk to this size it was a smear of six-pixel rectangles;
 * at this size a theme is four colours, and this shows four colours. It is not exported
 * and it will not be: it has no life outside this grid of four.
 *
 * ONE GRID CHILD spanning the row: the card is laid on `ControlCenterGroup`'s four-point
 * grid and takes all four points, so the grid decides its width and it decides nothing.
 */

/** The colours a swatch is made of, as CSS values — `rgb(10 10 11)`, `rgba(…)`. */
export interface ThemeSwatchColors {
  /** The window's floor. */
  floor: string
  /** A raised panel on it — the sidebar's surface. */
  panel: string
  /** The hairline round it. */
  line: string
  /** Primary text. */
  ink: string
  /** The accent. */
  accent: string
}

export interface ThemeGridOption {
  /** What `onSelect` hands back — 'dark', 'mist'. */
  id: string
  /** The theme's name: the swatch's tooltip and accessible name. Translated. */
  label: string
  colors: ThemeSwatchColors
}

export interface ThemeGridProps {
  themes: readonly ThemeGridOption[]
  /** The `id` in force, ringed in the accent. */
  value: string
  /** Pressing the one in force does nothing; this fires for the others. */
  onSelect: (id: string) => void
  /** Margins and placement. Not the ground, the padding or the radius. */
  className?: string
}

export function ThemeGrid({ themes, value, onSelect, className = '' }: ThemeGridProps) {
  return (
    <Card ground="raised" padding="tight" className={`col-span-4 w-full ${className}`}>
      <div role="radiogroup" className="grid grid-cols-4 gap-1.5">
        {themes.map((theme) => {
          const active = theme.id === value
          return (
            <button
              key={theme.id}
              type="button"
              role="radio"
              aria-checked={active}
              title={theme.label}
              aria-label={theme.label}
              onClick={() => { if (!active) onSelect(theme.id) }}
              className={`rounded-lg transition-[box-shadow,transform] active:scale-95 ${
                active ? 'ring-2 ring-accent' : 'hover:ring-2 hover:ring-ink/20'
              }`}
            >
              <Swatch colors={theme.colors} />
            </button>
          )
        })}
      </div>
    </Card>
  )
}

/** The private drawing — see the note at the top. Inline colours because they ARE the theme. */
function Swatch({ colors }: { colors: ThemeSwatchColors }) {
  return (
    <div
      className="flex h-8 w-full gap-1 overflow-hidden rounded-lg border p-1"
      style={{ backgroundColor: colors.floor, borderColor: colors.line }}
    >
      <div className="w-1/3 rounded-sm" style={{ backgroundColor: colors.panel }} />
      <div className="flex flex-1 flex-col justify-center gap-1">
        <span className="h-1 w-full rounded-full" style={{ backgroundColor: colors.ink }} />
        <span className="h-1.5 w-1/2 rounded-full" style={{ backgroundColor: colors.accent }} />
      </div>
    </div>
  )
}
