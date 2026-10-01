import type { MessageKey } from './i18n'
import { THEME_IDS, type ThemeId } from './types'

/**
 * Every colour the app can paint, as a role rather than a value. Components use
 * these through Tailwind (`bg-surface`, `text-ink`, `border-line-strong`) and
 * never name a colour, so a new theme is this file only.
 *
 * Two shapes, for a reason:
 *  - `*Rgb` tokens hold bare `R G B` channels. Tailwind wraps them in
 *    `rgb(… / <alpha-value>)`, which is what keeps opacity modifiers working —
 *    `text-ink/80`, `bg-accent/15`, `text-text-secondary/50` are used all over.
 *  - the surface and line tokens are complete colours, translucency included.
 *    Their alpha is part of the design (a raised panel is white at 6% over the
 *    window's vibrancy, not an opaque grey), and it differs per theme: black on
 *    a light background needs more of it than white on a dark one to read the
 *    same. Nothing applies an opacity modifier on top of them.
 *
 * This sits at the shared level rather than under renderer/, next to the
 * THEME_IDS and THEME_APPEARANCE it is typed against, because the main process
 * reads it too: claude-theme.ts derives the palette handed to Claude Code in the
 * terminal from these very tokens. Duplicating the values there instead would be
 * two registries drifting apart one theme at a time. Nothing here touches the
 * DOM or React — it is data, and the renderer's theme/ module re-exports it so
 * components still import from '../theme' as before.
 */
export interface ThemeTokens {
  // Window and panels
  bgRgb: string
  bgSecondaryRgb: string
  bgTertiaryRgb: string
  /** Wash painted over the native window vibrancy by `body`. */
  windowWash: string

  // Text
  /** Primary text — what `text-white` used to be. */
  inkRgb: string
  textSecondaryRgb: string
  /** Text sitting on a solid brand fill (accent buttons, danger buttons). */
  onBrandRgb: string

  /**
   * Icons. Opaque on purpose — an icon never wears an alpha modifier in this
   * app. The transparent forms icons used to be given (`text-text-secondary/50`,
   * `opacity-30`) washed out over the window's vibrancy and drifted from theme
   * to theme, since the same 30% reads nothing alike over black and over white.
   * These are real colours instead, tuned per theme, and there are exactly two
   * of them: an icon is either present or quiet, never a third of something.
   */
  /** The default weight — a shade below secondary text, still fully legible. */
  iconRgb: string
  /** The quiet one: decorative empty-state glyphs, unset affordances. */
  iconMutedRgb: string

  // Surfaces, faintest to loudest
  surfaceSubtle: string
  surface: string
  surfaceStrong: string
  /**
   * Window chrome — title bar, sidebars, the terminal's own backdrop. These sit
   * BELOW the content rather than on top of it, so they darken in the dark theme
   * and stay a quiet grey in the light one. A raised surface cannot stand in:
   * lightening them would invert the app's depth.
   */
  surfaceSunken: string
  /** Same idea, one step quieter (the settings rail). */
  surfaceSunkenSoft: string

  // Borders, faintest to strongest
  lineSubtle: string
  /** Form controls: inputs, selects, textareas. */
  lineField: string
  line: string
  lineStrong: string
  /** Opaque divider (Tailwind's `border-border`). */
  borderRgb: string

  // Brand and status. Darker in light mode: the dark-mode values are tuned for
  // a black background and several of them (yellow above all) fail contrast on
  // white.
  accentRgb: string
  accentHoverRgb: string
  purpleRgb: string
  greenRgb: string
  redRgb: string
  yellowRgb: string
  blueRgb: string
  orangeRgb: string
  /**
   * Two more status colours than the six above, because the agent workflow has
   * nine statuses and ran out of palette. They were `cyan-400` / `teal-400`
   * straight from Tailwind — fixed values that ignore the theme, so `committed`
   * and `Review addressed` stayed pale blue on a white window and could not be
   * read. A status colour is a role like any other.
   */
  cyanRgb: string
  tealRgb: string

  /** Terminal: foreground plus the sixteen ANSI slots xterm expects. */
  terminal: {
    foreground: string
    selectionBackground: string
    black: string
    red: string
    green: string
    yellow: string
    blue: string
    magenta: string
    cyan: string
    white: string
    brightBlack: string
    brightRed: string
    brightGreen: string
    brightYellow: string
    brightBlue: string
    brightMagenta: string
    brightCyan: string
    brightWhite: string
  }
}

export interface Theme {
  /**
   * Catalogue keys, not labels: this registry is module scope, so a literal here
   * would be fixed at import time and pin the theme picker to the boot language.
   * AppearancePage resolves them through useT() in the render path.
   */
  labelKey: MessageKey
  /** One line, shown under the label in Settings → Appearance. */
  descriptionKey: MessageKey
  tokens: ThemeTokens
}

/**
 * The dark theme's values are the ones the app shipped with, so switching the
 * codebase over to tokens changed nothing on screen. A handful of one-off alphas
 * were rounded onto the nearest token (at most 0.05 apart, invisible in place).
 */
export const THEMES: Record<ThemeId, Theme> = {
  dark: {
    labelKey: 'theme.dark',
    descriptionKey: 'theme.dark.help',
    tokens: {
      bgRgb: '11 12 14',
      bgSecondaryRgb: '21 22 25',
      bgTertiaryRgb: '29 31 35',
      windowWash: 'rgba(0, 0, 0, 0.3)',

      inkRgb: '255 255 255',
      textSecondaryRgb: '160 164 174',
      onBrandRgb: '255 255 255',
      iconRgb: '137 141 151',
      iconMutedRgb: '100 104 113',

      surfaceSubtle: 'rgba(255, 255, 255, 0.04)',
      surface: 'rgba(255, 255, 255, 0.06)',
      surfaceStrong: 'rgba(255, 255, 255, 0.1)',
      surfaceSunken: 'rgba(0, 0, 0, 0.3)',
      surfaceSunkenSoft: 'rgba(0, 0, 0, 0.2)',

      lineSubtle: 'rgba(255, 255, 255, 0.05)',
      lineField: 'rgba(255, 255, 255, 0.08)',
      line: 'rgba(255, 255, 255, 0.1)',
      lineStrong: 'rgba(255, 255, 255, 0.15)',
      borderRgb: '40 42 47',

      accentRgb: '0 122 252',
      accentHoverRgb: '51 149 253',
      purpleRgb: '168 85 247',
      greenRgb: '34 197 94',
      redRgb: '239 68 68',
      yellowRgb: '234 179 8',
      blueRgb: '59 130 246',
      orangeRgb: '249 115 22',
      cyanRgb: '34 211 238',
      tealRgb: '45 212 191',

      terminal: {
        foreground: '#ffffff',
        selectionBackground: '#eab30840',
        black: '#52525b',
        red: '#ef4444',
        green: '#22c55e',
        yellow: '#eab308',
        blue: '#007afc',
        magenta: '#a855f7',
        cyan: '#06b6d4',
        white: '#ffffff',
        brightBlack: '#a1a1aa',
        brightRed: '#f87171',
        brightGreen: '#4ade80',
        brightYellow: '#facc15',
        brightBlue: '#3d9bff',
        brightMagenta: '#c084fc',
        brightCyan: '#22d3ee',
        brightWhite: '#ffffff',
      },
    },
  },

  midnight: {
    labelKey: 'theme.midnight',
    descriptionKey: 'theme.midnight.help',
    tokens: {
      bgRgb: '7 16 31',
      bgSecondaryRgb: '12 24 45',
      bgTertiaryRgb: '18 33 59',
      windowWash: 'rgba(4, 10, 22, 0.45)',

      inkRgb: '234 242 252',
      textSecondaryRgb: '142 162 192',
      onBrandRgb: '255 255 255',
      iconRgb: '122 141 170',
      iconMutedRgb: '88 106 134',

      // A blue window is lighter than a near-black one, so each level carries a
      // touch more alpha to keep the same separation.
      surfaceSubtle: 'rgba(255, 255, 255, 0.045)',
      surface: 'rgba(255, 255, 255, 0.07)',
      surfaceStrong: 'rgba(255, 255, 255, 0.12)',
      surfaceSunken: 'rgba(2, 7, 18, 0.35)',
      surfaceSunkenSoft: 'rgba(2, 7, 18, 0.22)',

      lineSubtle: 'rgba(255, 255, 255, 0.06)',
      lineField: 'rgba(255, 255, 255, 0.09)',
      line: 'rgba(255, 255, 255, 0.12)',
      lineStrong: 'rgba(255, 255, 255, 0.17)',
      borderRgb: '33 51 82',

      accentRgb: '0 122 252',
      accentHoverRgb: '51 149 253',
      purpleRgb: '192 132 252',
      greenRgb: '52 211 153',
      redRgb: '248 113 113',
      yellowRgb: '250 204 21',
      blueRgb: '96 165 250',
      orangeRgb: '251 146 60',
      cyanRgb: '34 211 238',
      tealRgb: '45 212 191',

      terminal: {
        foreground: '#eaf2fc',
        selectionBackground: '#3d9bff40',
        black: '#46597a',
        red: '#f87171',
        green: '#34d399',
        yellow: '#fcd34d',
        blue: '#3d9bff',
        magenta: '#c084fc',
        cyan: '#22d3ee',
        white: '#eaf2fc',
        brightBlack: '#94a3b8',
        brightRed: '#fca5a5',
        brightGreen: '#6ee7b7',
        brightYellow: '#fde68a',
        brightBlue: '#8cc4ff',
        brightMagenta: '#d8b4fe',
        brightCyan: '#67e8f9',
        brightWhite: '#ffffff',
      },
    },
  },

  espresso: {
    labelKey: 'theme.espresso',
    descriptionKey: 'theme.espresso.help',
    tokens: {
      bgRgb: '32 33 36',
      bgSecondaryRgb: '41 42 46',
      bgTertiaryRgb: '50 52 57',
      windowWash: 'rgba(24, 25, 27, 0.4)',

      inkRgb: '238 239 242',
      textSecondaryRgb: '172 175 183',
      onBrandRgb: '255 255 255',
      iconRgb: '148 151 159',
      iconMutedRgb: '112 115 123',

      // A lighter ground than the other dark themes, so each level carries a touch
      // more alpha to keep the same separation.
      surfaceSubtle: 'rgba(255, 255, 255, 0.045)',
      surface: 'rgba(255, 255, 255, 0.07)',
      surfaceStrong: 'rgba(255, 255, 255, 0.12)',
      surfaceSunken: 'rgba(18, 19, 21, 0.35)',
      surfaceSunkenSoft: 'rgba(18, 19, 21, 0.22)',

      lineSubtle: 'rgba(255, 255, 255, 0.06)',
      lineField: 'rgba(255, 255, 255, 0.09)',
      line: 'rgba(255, 255, 255, 0.12)',
      lineStrong: 'rgba(255, 255, 255, 0.17)',
      borderRgb: '63 65 71',

      accentRgb: '0 122 252',
      accentHoverRgb: '51 149 253',
      purpleRgb: '192 132 252',
      greenRgb: '52 211 153',
      redRgb: '248 113 113',
      yellowRgb: '250 204 21',
      blueRgb: '96 165 250',
      orangeRgb: '251 146 60',
      cyanRgb: '34 211 238',
      tealRgb: '45 212 191',

      terminal: {
        foreground: '#eeeff2',
        selectionBackground: '#3d9bff40',
        black: '#5c5f66',
        red: '#f87171',
        green: '#34d399',
        yellow: '#fcd34d',
        blue: '#3d9bff',
        magenta: '#c084fc',
        cyan: '#22d3ee',
        white: '#eeeff2',
        brightBlack: '#acafb7',
        brightRed: '#fca5a5',
        brightGreen: '#6ee7b7',
        brightYellow: '#fde68a',
        brightBlue: '#8cc4ff',
        brightMagenta: '#d8b4fe',
        brightCyan: '#67e8f9',
        brightWhite: '#ffffff',
      },
    },
  },

  'high-contrast': {
    labelKey: 'theme.highContrast',
    descriptionKey: 'theme.highContrast.help',
    tokens: {
      bgRgb: '0 0 0',
      bgSecondaryRgb: '0 0 0',
      bgTertiaryRgb: '18 18 18',
      // Nearly opaque: the window's vibrancy lets the desktop through, and
      // whatever is behind it eats exactly the contrast this theme exists for.
      windowWash: 'rgba(0, 0, 0, 0.92)',

      inkRgb: '255 255 255',
      // Not a muted grey: secondary text still has to clear a comfortable ratio.
      textSecondaryRgb: '224 224 224',
      // Every brand fill here is a bright colour, so its text is black.
      onBrandRgb: '0 0 0',
      // No dimming here: muting an icon is exactly the contrast this theme
      // exists to refuse, so both weights stay near secondary text.
      iconRgb: '224 224 224',
      iconMutedRgb: '176 176 176',

      surfaceSubtle: 'rgba(255, 255, 255, 0.08)',
      surface: 'rgba(255, 255, 255, 0.12)',
      surfaceStrong: 'rgba(255, 255, 255, 0.2)',
      surfaceSunken: 'rgba(0, 0, 0, 0.6)',
      surfaceSunkenSoft: 'rgba(0, 0, 0, 0.45)',

      // Borders are structure here, not decoration.
      lineSubtle: 'rgba(255, 255, 255, 0.35)',
      lineField: 'rgba(255, 255, 255, 0.55)',
      line: 'rgba(255, 255, 255, 0.65)',
      lineStrong: 'rgba(255, 255, 255, 0.85)',
      borderRgb: '212 212 216',

      accentRgb: '77 163 255',
      accentHoverRgb: '133 192 255',
      purpleRgb: '216 180 254',
      greenRgb: '74 222 128',
      redRgb: '255 123 123',
      yellowRgb: '253 224 71',
      blueRgb: '125 179 255',
      orangeRgb: '253 168 94',
      cyanRgb: '103 232 249',
      tealRgb: '94 234 212',

      terminal: {
        foreground: '#ffffff',
        selectionBackground: '#fde04780',
        black: '#8c8c8c',
        red: '#ff7b7b',
        green: '#4ade80',
        yellow: '#fde047',
        blue: '#4da3ff',
        magenta: '#d8b4fe',
        cyan: '#67e8f9',
        white: '#ffffff',
        brightBlack: '#bfbfbf',
        brightRed: '#ffa8a8',
        brightGreen: '#86efac',
        brightYellow: '#fef08a',
        brightBlue: '#85c0ff',
        brightMagenta: '#e9d5ff',
        brightCyan: '#a5f3fc',
        brightWhite: '#ffffff',
      },
    },
  },

  light: {
    labelKey: 'theme.light',
    descriptionKey: 'theme.light.help',
    tokens: {
      bgRgb: '255 255 255',
      bgSecondaryRgb: '250 250 249',
      bgTertiaryRgb: '244 244 245',
      windowWash: 'rgba(255, 255, 255, 0.62)',

      inkRgb: '24 24 27',
      textSecondaryRgb: '82 82 91',
      onBrandRgb: '255 255 255',
      iconRgb: '108 108 116',
      iconMutedRgb: '151 151 157',

      // Black over a bright window disappears at the dark theme's alphas, so
      // every level here is pitched to read the same, not to match the number.
      surfaceSubtle: 'rgba(0, 0, 0, 0.03)',
      surface: 'rgba(0, 0, 0, 0.045)',
      surfaceStrong: 'rgba(0, 0, 0, 0.08)',
      surfaceSunken: 'rgba(0, 0, 0, 0.05)',
      surfaceSunkenSoft: 'rgba(0, 0, 0, 0.035)',

      lineSubtle: 'rgba(0, 0, 0, 0.07)',
      lineField: 'rgba(0, 0, 0, 0.12)',
      line: 'rgba(0, 0, 0, 0.14)',
      lineStrong: 'rgba(0, 0, 0, 0.2)',
      borderRgb: '228 228 231',

      accentRgb: '0 122 252',
      accentHoverRgb: '0 104 214',
      purpleRgb: '147 51 234',
      greenRgb: '21 128 61',
      redRgb: '220 38 38',
      yellowRgb: '161 98 7',
      blueRgb: '37 99 235',
      orangeRgb: '194 65 12',
      cyanRgb: '12 99 121',
      tealRgb: '14 102 96',

      terminal: {
        foreground: '#18181b',
        selectionBackground: '#a1620740',
        black: '#3f3f46',
        red: '#dc2626',
        green: '#15803d',
        yellow: '#a16207',
        blue: '#0062cc',
        magenta: '#9333ea',
        cyan: '#0e7490',
        white: '#52525b',
        brightBlack: '#71717a',
        brightRed: '#b91c1c',
        brightGreen: '#166534',
        brightYellow: '#854d0e',
        brightBlue: '#007afc',
        brightMagenta: '#7e22ce',
        brightCyan: '#155e75',
        brightWhite: '#27272a',
      },
    },
  },

  mist: {
    labelKey: 'theme.mist',
    descriptionKey: 'theme.mist.help',
    tokens: {
      bgRgb: '238 246 255',
      bgSecondaryRgb: '246 250 255',
      bgTertiaryRgb: '228 239 252',
      windowWash: 'rgba(238, 246, 255, 0.72)',

      inkRgb: '12 27 48',
      textSecondaryRgb: '64 86 116',
      onBrandRgb: '255 255 255',
      iconRgb: '92 112 140',
      iconMutedRgb: '138 155 178',

      surfaceSubtle: 'rgba(12, 40, 80, 0.035)',
      surface: 'rgba(12, 40, 80, 0.05)',
      surfaceStrong: 'rgba(12, 40, 80, 0.09)',
      surfaceSunken: 'rgba(12, 40, 80, 0.055)',
      surfaceSunkenSoft: 'rgba(12, 40, 80, 0.04)',

      lineSubtle: 'rgba(12, 40, 80, 0.08)',
      lineField: 'rgba(12, 40, 80, 0.13)',
      line: 'rgba(12, 40, 80, 0.15)',
      lineStrong: 'rgba(12, 40, 80, 0.21)',
      borderRgb: '196 216 240',

      accentRgb: '0 122 252',
      accentHoverRgb: '0 104 214',
      purpleRgb: '126 34 206',
      greenRgb: '21 128 61',
      redRgb: '220 38 38',
      yellowRgb: '161 98 7',
      blueRgb: '29 78 216',
      orangeRgb: '194 65 12',
      cyanRgb: '21 94 117',
      tealRgb: '17 94 89',

      terminal: {
        foreground: '#0f172a',
        selectionBackground: '#4338ca40',
        black: '#475569',
        red: '#dc2626',
        green: '#15803d',
        yellow: '#a16207',
        blue: '#0062cc',
        magenta: '#7e22ce',
        cyan: '#0e7490',
        white: '#64748b',
        brightBlack: '#7c8ba1',
        brightRed: '#b91c1c',
        brightGreen: '#166534',
        brightYellow: '#854d0e',
        brightBlue: '#007afc',
        brightMagenta: '#6b21a8',
        brightCyan: '#155e75',
        brightWhite: '#334155',
      },
    },
  },

  sepia: {
    labelKey: 'theme.sepia',
    descriptionKey: 'theme.sepia.help',
    tokens: {
      bgRgb: '250 246 238',
      bgSecondaryRgb: '246 240 229',
      bgTertiaryRgb: '240 232 217',
      windowWash: 'rgba(250, 246, 238, 0.72)',

      inkRgb: '43 35 26',
      textSecondaryRgb: '109 94 76',
      onBrandRgb: '255 255 255',
      iconRgb: '130 117 100',
      iconMutedRgb: '165 155 141',

      // Warm-tinted rather than neutral black, so the shading matches the paper.
      surfaceSubtle: 'rgba(74, 54, 28, 0.035)',
      surface: 'rgba(74, 54, 28, 0.05)',
      surfaceStrong: 'rgba(74, 54, 28, 0.09)',
      surfaceSunken: 'rgba(74, 54, 28, 0.055)',
      surfaceSunkenSoft: 'rgba(74, 54, 28, 0.04)',

      lineSubtle: 'rgba(74, 54, 28, 0.09)',
      lineField: 'rgba(74, 54, 28, 0.14)',
      line: 'rgba(74, 54, 28, 0.16)',
      lineStrong: 'rgba(74, 54, 28, 0.22)',
      borderRgb: '226 214 195',

      // The accent stays the product's indigo: it is brand, not decoration.
      accentRgb: '0 122 252',
      accentHoverRgb: '0 104 214',
      purpleRgb: '126 34 206',
      greenRgb: '21 115 71',
      redRgb: '185 28 28',
      yellowRgb: '146 64 14',
      blueRgb: '29 78 216',
      orangeRgb: '154 52 18',
      cyanRgb: '21 94 117',
      tealRgb: '17 94 89',

      terminal: {
        foreground: '#2b231a',
        selectionBackground: '#92400e40',
        black: '#57534e',
        red: '#b91c1c',
        green: '#157347',
        yellow: '#92400e',
        blue: '#0062cc',
        magenta: '#7e22ce',
        cyan: '#0f766e',
        white: '#78716c',
        brightBlack: '#8c837a',
        brightRed: '#dc2626',
        brightGreen: '#15803d',
        brightYellow: '#a16207',
        brightBlue: '#007afc',
        brightMagenta: '#9333ea',
        brightCyan: '#0e7490',
        brightWhite: '#44403c',
      },
    },
  },

  daylight: {
    labelKey: 'theme.daylight',
    descriptionKey: 'theme.daylight.help',
    tokens: {
      bgRgb: '255 255 255',
      bgSecondaryRgb: '255 255 255',
      bgTertiaryRgb: '245 245 245',
      // Nearly opaque, like its dark counterpart: whatever the vibrancy lets
      // through eats exactly the contrast this theme exists for.
      windowWash: 'rgba(255, 255, 255, 0.95)',

      inkRgb: '0 0 0',
      // Near-black, not a muted grey: secondary text has to stay comfortable.
      textSecondaryRgb: '38 38 38',
      onBrandRgb: '255 255 255',
      iconRgb: '71 71 71',
      iconMutedRgb: '125 125 125',

      surfaceSubtle: 'rgba(0, 0, 0, 0.06)',
      surface: 'rgba(0, 0, 0, 0.09)',
      surfaceStrong: 'rgba(0, 0, 0, 0.14)',
      surfaceSunken: 'rgba(0, 0, 0, 0.07)',
      surfaceSunkenSoft: 'rgba(0, 0, 0, 0.05)',

      // Borders are structure here, not decoration.
      lineSubtle: 'rgba(0, 0, 0, 0.45)',
      lineField: 'rgba(0, 0, 0, 0.6)',
      line: 'rgba(0, 0, 0, 0.7)',
      lineStrong: 'rgba(0, 0, 0, 0.85)',
      borderRgb: '82 82 82',

      accentRgb: '0 88 184',
      accentHoverRgb: '0 65 138',
      purpleRgb: '88 28 135',
      greenRgb: '20 83 45',
      redRgb: '153 27 27',
      yellowRgb: '113 63 18',
      blueRgb: '30 58 138',
      orangeRgb: '124 45 18',
      cyanRgb: '22 78 99',
      tealRgb: '19 78 74',

      terminal: {
        foreground: '#000000',
        selectionBackground: '#312e8140',
        black: '#3f3f46',
        red: '#991b1b',
        green: '#14532d',
        yellow: '#713f12',
        blue: '#0058b8',
        magenta: '#581c87',
        cyan: '#164e63',
        white: '#52525b',
        brightBlack: '#27272a',
        brightRed: '#7f1d1d',
        brightGreen: '#052e16',
        brightYellow: '#422006',
        brightBlue: '#0062cc',
        brightMagenta: '#3b0764',
        brightCyan: '#083344',
        brightWhite: '#000000',
      },
    },
  },
}

/** Re-exported so a component needs only one import to render the picker. */
export { THEME_IDS }
