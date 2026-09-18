import { Check } from './icons'
import { Text } from './Text'
import type { ThemeSwatchColors } from './ThemeGrid'

/**
 * EVERY THEME AS A LITTLE WINDOW — four to a line, each with its name and what it is
 * for, the one in force washed in the accent.
 *
 * ── IT IS NOT `ThemeGrid`, AND THE DIFFERENCE IS THE ROOM ─────────────────────────
 *
 * `ThemeGrid` is the quick-settings sheet's picker: eight swatches of 40 by 32, four
 * colours each, in a sheet 256px wide. That file says why it draws a swatch and not a
 * window — "the Appearance page's miniature draws a whole window, and shrunk to this
 * size it was a smear of six-pixel rectangles". This is the other half of that sentence.
 * On a settings page there is room for the miniature, and a theme picked by looking
 * should be shown at the size where looking works.
 *
 * So there are two, deliberately, and neither is a variant of the other: one is a
 * colour, one is a drawing of the app. What they share is the rule below.
 *
 * ── IT KNOWS NO THEME ─────────────────────────────────────────────────────────────
 *
 * `ThemeGrid`'s rule, and for its reason: the registry lives in the app's main process
 * as well as its renderer and cannot move into this folder. Each theme arrives as the
 * colours a miniature is made of, already resolved to CSS values, and this draws them.
 *
 * ── NO EDGE ON THE TILE, AND THE MINIATURE KEEPS ITS OWN ──────────────────────────
 *
 * The tiles had a hairline each and the chosen one swapped it for an accent one, which
 * put two rectangles around every theme: the tile's, and the little window's inside it.
 * The inner one is the only one that MEANS something — it is the edge of the window
 * being drawn, in that theme's own line colour — so it stays and the outer one goes.
 *
 * WHAT MARKS THE CHOSEN ONE IS THE WASH AND THE TICK, which were already there under the
 * border doing the same job. A ring would have been the border again by another name.
 * The ground is what the tiles are told apart by at rest, and the hover lifts it a step:
 * with no edge, that step is the whole of the affordance.
 *
 * ── THE MINIATURE IS A DRAWING, NOT A SCREENSHOT ──────────────────────────────────
 *
 * A title bar with its three lights, a sidebar, two lines of text and a block of
 * accent. It is the fewest parts that still read as this app rather than as a gradient:
 * drop the lights and it is a rectangle, drop the accent and every theme looks alike.
 * Private to this file for `ThemeGrid`'s swatch's reason — it has no life outside the
 * grid it is laid in.
 */

/**
 * What a miniature is painted with: the swatch's five, plus the three a window has and
 * a colour patch has not.
 *
 * EXTENDING `ThemeSwatchColors` RATHER THAN RESTATING IT, so a caller that already
 * builds swatches for the sheet adds three fields instead of writing a second mapping —
 * and so the two pickers of one registry cannot end up disagreeing about which token is
 * "the panel".
 */
export interface ThemePreviewColors extends ThemeSwatchColors {
  /**
   * The band across the top of the window.
   *
   * A FIELD OF ITS OWN rather than a second reading of `panel`, which the swatch already
   * defines as the SIDEBAR's surface: a caller reusing its sheet mapping would otherwise
   * paint the title bar in the sidebar's colour and the drawing would lose a step.
   */
  bar: string
  /** The quieter line of text under the first. */
  textSecondary: string
  /** The three window lights, in their order — close, minimise, zoom. */
  lights: readonly [string, string, string]
}

export interface ThemePreviewOption {
  /** What `onSelect` hands back — 'dark', 'mist'. */
  id: string
  /** The theme's name. Translated. */
  label: string
  /** One line saying what it is for, under the name. Translated. */
  description?: string
  colors: ThemePreviewColors
}

export interface ThemePreviewGridProps {
  themes: readonly ThemePreviewOption[]
  /** The `id` in force: washed in the accent and ticked. */
  value: string
  /** Pressing the one in force does nothing; this fires for the others. */
  onSelect: (id: string) => void
  /** Margins and placement. Not the columns or the gap. */
  className?: string
}

/** One theme as a window, painted in its own colours rather than the one in use. */
function Miniature({ colors }: { colors: ThemePreviewColors }) {
  return (
    <div
      className="h-20 w-full overflow-hidden rounded-lg border"
      style={{ backgroundColor: colors.floor, borderColor: colors.line }}
    >
      <div className="flex items-center gap-1 px-2 py-1.5" style={{ backgroundColor: colors.bar }}>
        {colors.lights.map((light, index) => (
          // The index is the key because these are three fixed positions, not a list
          // that reorders: the first light is always the first light.
          <span key={index} className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: light }} />
        ))}
      </div>
      <div className="flex h-full gap-1.5 p-2">
        <div className="w-1/4 rounded" style={{ backgroundColor: colors.panel }} />
        <div className="flex flex-1 flex-col gap-1">
          <span className="h-1.5 w-3/4 rounded-full" style={{ backgroundColor: colors.ink }} />
          <span className="h-1.5 w-1/2 rounded-full" style={{ backgroundColor: colors.textSecondary }} />
          <span className="mt-1 h-2.5 w-2/5 rounded" style={{ backgroundColor: colors.accent }} />
        </div>
      </div>
    </div>
  )
}

export function ThemePreviewGrid({ themes, value, onSelect, className = '' }: ThemePreviewGridProps) {
  return (
    <div role="radiogroup" className={`grid grid-cols-4 gap-3 ${className}`.trim()}>
      {themes.map((theme) => {
        const active = theme.id === value
        return (
          <button
            key={theme.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => { if (!active) onSelect(theme.id) }}
            // The tile IS the card — a `Card` inside a button would be a plate inside a
            // plate, and the state belongs to the thing you press. A ground and no edge:
            // see the header.
            className={`rounded-xl p-2.5 text-left transition-all ${
              active ? 'bg-accent/10' : 'bg-surface hover:bg-surface-strong'
            }`}
          >
            <Miniature colors={theme.colors} />
            <div className="mt-2.5 flex items-center gap-1.5">
              {/* `min-w-0` and `truncate`: a longer theme name must not widen its column
                  and unbalance the row. */}
              <Text size="sm" weight="medium" className="min-w-0 truncate">
                {theme.label}
              </Text>
              {active && <Check className="h-3.5 w-3.5 shrink-0 text-accent" />}
            </div>
            {theme.description && (
              <Text size="xs" tone="secondary" className="mt-0.5 block opacity-50">
                {theme.description}
              </Text>
            )}
          </button>
        )
      })}
    </div>
  )
}
