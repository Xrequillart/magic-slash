import { THEMES } from './themes'
import { THEME_APPEARANCE, type ThemeId } from './types'

/**
 * The theme handed to Claude Code running inside a terminal pane.
 *
 * Claude Code reads user themes from `<claude config dir>/themes/<slug>.json`
 * and activates one through a `theme` setting of `custom:<slug>`. The file is a
 * built-in theme plus a patch: `base` names one of Claude's own palettes and
 * `overrides` replaces individual entries in it. Keys the base does not define
 * are dropped silently, so an override list can be generous without risk.
 *
 * Only the NEUTRALS are mapped: the text, the muted greys, the prompt border and
 * the message backgrounds. Those are the ones that go white-on-white when the
 * app is in a light theme and Claude Code is still painting for a dark one, and
 * they carry no meaning beyond "foreground" and "background".
 *
 * Everything else is deliberately left to the base — Claude's orange, the
 * permission blue, plan mode, and above all success / error / the four diff
 * colours. Those are semantic (green is an addition, red is a removal) and
 * Anthropic tuned their contrast against their own backgrounds; substituting the
 * app's generic greenRgb and redRgb would look tidier in a screenshot and read
 * worse in an actual diff.
 */

export const CLAUDE_THEME_SLUG = 'magic-slash'

/** The value the `theme` setting must carry for Claude Code to pick the file up. */
export const CLAUDE_THEME_REF = `custom:${CLAUDE_THEME_SLUG}`

/**
 * The Claude built-in the generated theme patches.
 *
 * The light/dark half follows the app. The variant half follows whatever the
 * user already chose for their own Claude Code: someone reading in
 * `dark-daltonized` picked a colourblind-friendly palette, and flipping them
 * onto plain `dark` to match the app would quietly undo an accessibility
 * setting. The `-ansi` variants are not here on purpose — they mean "use the
 * terminal's own sixteen colours, no truecolor", which is a request this whole
 * feature would violate. main/claude-theme.ts declines to sync for those.
 */
export type ClaudeThemeVariant = '' | '-daltonized'

export interface ClaudeThemeFile {
  name: string
  base: string
  overrides: Record<string, string>
}

type Rgb = readonly [number, number, number]

/** A colour plus its alpha, however the registry happened to spell it. */
interface Colour {
  rgb: Rgb
  alpha: number
}

/** `'10 10 11'` — the bare-channel form Tailwind wraps in `rgb(… / <alpha>)`. */
function fromChannels(token: string): Rgb {
  const [r, g, b] = token.trim().split(/\s+/).map(Number)
  return [r, g, b]
}

/**
 * Parses the two spellings the registry actually uses: `rgba(r, g, b, a)` for
 * the surface and line tokens, and `#rrggbb` / `#rrggbbaa` for the terminal
 * palette (`selectionBackground` carries an alpha suffix).
 */
function parseColour(value: string): Colour {
  const rgba = value.match(/^rgba?\(([^)]+)\)$/)
  if (rgba) {
    const parts = rgba[1].split(',').map((p) => Number(p.trim()))
    return { rgb: [parts[0], parts[1], parts[2]], alpha: parts[3] ?? 1 }
  }

  const hex = value.replace('#', '')
  const pair = (i: number) => parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  return {
    rgb: [pair(0), pair(1), pair(2)],
    alpha: hex.length === 8 ? pair(3) / 255 : 1,
  }
}

/**
 * Composite a translucent colour onto an opaque one.
 *
 * Claude Code's colour validator takes `rgb()`, `#rrggbb`, `ansi:<name>` and
 * `ansi256(n)` — never an alpha channel. The app's surfaces are translucent by
 * design (a raised panel is white at 6% over the window's vibrancy), so they
 * have to be flattened against something. The theme's own background is the
 * honest choice: it is what the terminal pane sits on.
 */
function flatten(colour: Colour, background: Rgb): Rgb {
  return [0, 1, 2].map((i) =>
    Math.round(colour.rgb[i] * colour.alpha + background[i] * (1 - colour.alpha)),
  ) as unknown as Rgb
}

/** `amount` of the way from `from` to `to`. */
function mix(from: Rgb, to: Rgb, amount: number): Rgb {
  return [0, 1, 2].map((i) =>
    Math.round(from[i] + (to[i] - from[i]) * amount),
  ) as unknown as Rgb
}

function hex(rgb: Rgb): string {
  return `#${rgb.map((c) => Math.max(0, Math.min(255, c)).toString(16).padStart(2, '0')).join('')}`
}

/**
 * The theme file for one of the app's appearances.
 *
 * The muted greys are derived by mixing rather than picked from the terminal
 * palette, because "quieter" is a different direction in each family: on the
 * dark themes it means darker, on the light ones lighter. Mixing the secondary
 * text towards the background gets that right in both without a per-theme table.
 */
export function claudeThemeFile(id: ThemeId, variant: ClaudeThemeVariant = ''): ClaudeThemeFile {
  const { tokens } = THEMES[id]

  const background = fromChannels(tokens.bgRgb)
  const ink = fromChannels(tokens.inkRgb)
  const secondary = fromChannels(tokens.textSecondaryRgb)
  const over = (value: string) => hex(flatten(parseColour(value), background))
  const quieter = (amount: number) => hex(mix(secondary, background, amount))

  return {
    name: `Magic Slash — ${id}`,
    base: `${THEME_APPEARANCE[id]}${variant}`,
    overrides: {
      // Foreground
      text: hex(ink),
      inverseText: hex(background),
      inactive: hex(secondary),
      inactiveShimmer: hex(mix(secondary, ink, 0.4)),
      subtle: quieter(0.35),

      // The composer's frame, and the brighter pass it shimmers to
      promptBorder: quieter(0.55),
      promptBorderShimmer: quieter(0.25),

      // Blocks that paint their own background. `background` itself is left
      // alone: the xterm pane is transparent over the window in every theme, so
      // giving Claude Code an opaque one would punch a rectangle through it.
      selectionBg: over(tokens.terminal.selectionBackground),
      userMessageBackground: over(tokens.surface),
      userMessageBackgroundHover: over(tokens.surfaceStrong),
      composerSidebarBackground: over(tokens.surfaceSunkenSoft),
      bashMessageBackgroundColor: over(tokens.surfaceSubtle),
      memoryBackgroundColor: over(tokens.surfaceSubtle),
    },
  }
}
