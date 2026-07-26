import { THEME_IDS, type ThemeId } from '../../types'

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
  label: string
  /** One line, shown under the label in Settings → Appearance. */
  description: string
  tokens: ThemeTokens
}

/**
 * The dark theme's values are the ones the app shipped with, so switching the
 * codebase over to tokens changed nothing on screen. A handful of one-off alphas
 * were rounded onto the nearest token (at most 0.05 apart, invisible in place).
 */
export const THEMES: Record<ThemeId, Theme> = {
  dark: {
    label: 'Dark',
    description: 'The original, near-black.',
    tokens: {
      bgRgb: '10 10 11',
      bgSecondaryRgb: '20 20 22',
      bgTertiaryRgb: '28 28 31',
      windowWash: 'rgba(0, 0, 0, 0.3)',

      inkRgb: '255 255 255',
      textSecondaryRgb: '161 161 170',
      onBrandRgb: '255 255 255',

      surfaceSubtle: 'rgba(255, 255, 255, 0.04)',
      surface: 'rgba(255, 255, 255, 0.06)',
      surfaceStrong: 'rgba(255, 255, 255, 0.1)',
      surfaceSunken: 'rgba(0, 0, 0, 0.3)',
      surfaceSunkenSoft: 'rgba(0, 0, 0, 0.2)',

      lineSubtle: 'rgba(255, 255, 255, 0.05)',
      lineField: 'rgba(255, 255, 255, 0.08)',
      line: 'rgba(255, 255, 255, 0.1)',
      lineStrong: 'rgba(255, 255, 255, 0.15)',
      borderRgb: '39 39 42',

      accentRgb: '99 102 241',
      accentHoverRgb: '129 140 248',
      purpleRgb: '168 85 247',
      greenRgb: '34 197 94',
      redRgb: '239 68 68',
      yellowRgb: '234 179 8',
      blueRgb: '59 130 246',
      orangeRgb: '249 115 22',

      terminal: {
        foreground: '#ffffff',
        selectionBackground: '#eab30840',
        black: '#52525b',
        red: '#ef4444',
        green: '#22c55e',
        yellow: '#eab308',
        blue: '#6366f1',
        magenta: '#a855f7',
        cyan: '#06b6d4',
        white: '#ffffff',
        brightBlack: '#a1a1aa',
        brightRed: '#f87171',
        brightGreen: '#4ade80',
        brightYellow: '#facc15',
        brightBlue: '#818cf8',
        brightMagenta: '#c084fc',
        brightCyan: '#22d3ee',
        brightWhite: '#ffffff',
      },
    },
  },

  midnight: {
    label: 'Midnight',
    description: 'Dark, in deep blue.',
    tokens: {
      bgRgb: '11 16 32',
      bgSecondaryRgb: '17 23 43',
      bgTertiaryRgb: '23 30 54',
      windowWash: 'rgba(6, 10, 24, 0.45)',

      inkRgb: '237 240 252',
      textSecondaryRgb: '148 158 190',
      onBrandRgb: '255 255 255',

      // A blue window is lighter than a near-black one, so each level carries a
      // touch more alpha to keep the same separation.
      surfaceSubtle: 'rgba(255, 255, 255, 0.045)',
      surface: 'rgba(255, 255, 255, 0.07)',
      surfaceStrong: 'rgba(255, 255, 255, 0.12)',
      surfaceSunken: 'rgba(3, 6, 18, 0.35)',
      surfaceSunkenSoft: 'rgba(3, 6, 18, 0.22)',

      lineSubtle: 'rgba(255, 255, 255, 0.06)',
      lineField: 'rgba(255, 255, 255, 0.09)',
      line: 'rgba(255, 255, 255, 0.12)',
      lineStrong: 'rgba(255, 255, 255, 0.17)',
      borderRgb: '38 47 74',

      accentRgb: '129 140 248',
      accentHoverRgb: '165 180 252',
      purpleRgb: '192 132 252',
      greenRgb: '52 211 153',
      redRgb: '248 113 113',
      yellowRgb: '250 204 21',
      blueRgb: '96 165 250',
      orangeRgb: '251 146 60',

      terminal: {
        foreground: '#edf0fc',
        selectionBackground: '#818cf840',
        black: '#4c5578',
        red: '#f87171',
        green: '#34d399',
        yellow: '#fcd34d',
        blue: '#818cf8',
        magenta: '#c084fc',
        cyan: '#22d3ee',
        white: '#edf0fc',
        brightBlack: '#94a3b8',
        brightRed: '#fca5a5',
        brightGreen: '#6ee7b7',
        brightYellow: '#fde68a',
        brightBlue: '#a5b4fc',
        brightMagenta: '#d8b4fe',
        brightCyan: '#67e8f9',
        brightWhite: '#ffffff',
      },
    },
  },

  espresso: {
    label: 'Espresso',
    description: 'Warm brown-black.',
    tokens: {
      bgRgb: '26 21 18',
      bgSecondaryRgb: '35 28 24',
      bgTertiaryRgb: '45 36 30',
      windowWash: 'rgba(16, 12, 10, 0.4)',

      inkRgb: '245 238 230',
      textSecondaryRgb: '176 160 145',
      onBrandRgb: '255 255 255',

      // Tinted warm rather than pure white, so the shading belongs to the wood
      // rather than sitting on top of it as grey.
      surfaceSubtle: 'rgba(255, 245, 230, 0.045)',
      surface: 'rgba(255, 245, 230, 0.07)',
      surfaceStrong: 'rgba(255, 245, 230, 0.12)',
      surfaceSunken: 'rgba(12, 9, 7, 0.35)',
      surfaceSunkenSoft: 'rgba(12, 9, 7, 0.22)',

      lineSubtle: 'rgba(255, 240, 225, 0.06)',
      lineField: 'rgba(255, 240, 225, 0.09)',
      line: 'rgba(255, 240, 225, 0.12)',
      lineStrong: 'rgba(255, 240, 225, 0.17)',
      borderRgb: '61 49 41',

      accentRgb: '129 140 248',
      accentHoverRgb: '165 180 252',
      purpleRgb: '192 132 252',
      greenRgb: '52 211 153',
      redRgb: '248 113 113',
      yellowRgb: '251 191 36',
      blueRgb: '96 165 250',
      orangeRgb: '251 146 60',

      terminal: {
        foreground: '#f5eee6',
        selectionBackground: '#fbbf2440',
        black: '#6b5a4c',
        red: '#f87171',
        green: '#34d399',
        yellow: '#fbbf24',
        blue: '#818cf8',
        magenta: '#c084fc',
        cyan: '#2dd4bf',
        white: '#f5eee6',
        brightBlack: '#b0a091',
        brightRed: '#fca5a5',
        brightGreen: '#6ee7b7',
        brightYellow: '#fcd34d',
        brightBlue: '#a5b4fc',
        brightMagenta: '#d8b4fe',
        brightCyan: '#5eead4',
        brightWhite: '#fffaf3',
      },
    },
  },

  'high-contrast': {
    label: 'High contrast',
    description: 'White on black, hard edges.',
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

      accentRgb: '147 157 255',
      accentHoverRgb: '186 193 255',
      purpleRgb: '216 180 254',
      greenRgb: '74 222 128',
      redRgb: '255 123 123',
      yellowRgb: '253 224 71',
      blueRgb: '125 179 255',
      orangeRgb: '253 168 94',

      terminal: {
        foreground: '#ffffff',
        selectionBackground: '#fde04780',
        black: '#8c8c8c',
        red: '#ff7b7b',
        green: '#4ade80',
        yellow: '#fde047',
        blue: '#939dff',
        magenta: '#d8b4fe',
        cyan: '#67e8f9',
        white: '#ffffff',
        brightBlack: '#bfbfbf',
        brightRed: '#ffa8a8',
        brightGreen: '#86efac',
        brightYellow: '#fef08a',
        brightBlue: '#bac1ff',
        brightMagenta: '#e9d5ff',
        brightCyan: '#a5f3fc',
        brightWhite: '#ffffff',
      },
    },
  },

  light: {
    label: 'Light',
    description: 'Bright and neutral.',
    tokens: {
      bgRgb: '255 255 255',
      bgSecondaryRgb: '250 250 249',
      bgTertiaryRgb: '244 244 245',
      windowWash: 'rgba(255, 255, 255, 0.62)',

      inkRgb: '24 24 27',
      textSecondaryRgb: '82 82 91',
      onBrandRgb: '255 255 255',

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

      accentRgb: '79 70 229',
      accentHoverRgb: '67 56 202',
      purpleRgb: '147 51 234',
      greenRgb: '21 128 61',
      redRgb: '220 38 38',
      yellowRgb: '161 98 7',
      blueRgb: '37 99 235',
      orangeRgb: '194 65 12',

      terminal: {
        foreground: '#18181b',
        selectionBackground: '#a1620740',
        black: '#3f3f46',
        red: '#dc2626',
        green: '#15803d',
        yellow: '#a16207',
        blue: '#4f46e5',
        magenta: '#9333ea',
        cyan: '#0e7490',
        white: '#52525b',
        brightBlack: '#71717a',
        brightRed: '#b91c1c',
        brightGreen: '#166534',
        brightYellow: '#854d0e',
        brightBlue: '#4338ca',
        brightMagenta: '#7e22ce',
        brightCyan: '#155e75',
        brightWhite: '#27272a',
      },
    },
  },

  mist: {
    label: 'Mist',
    description: 'Cool blue-grey daylight.',
    tokens: {
      bgRgb: '244 247 251',
      bgSecondaryRgb: '250 252 254',
      bgTertiaryRgb: '237 242 249',
      windowWash: 'rgba(244, 247, 251, 0.72)',

      inkRgb: '15 23 42',
      textSecondaryRgb: '71 85 105',
      onBrandRgb: '255 255 255',

      surfaceSubtle: 'rgba(15, 23, 42, 0.035)',
      surface: 'rgba(15, 23, 42, 0.05)',
      surfaceStrong: 'rgba(15, 23, 42, 0.09)',
      surfaceSunken: 'rgba(15, 23, 42, 0.055)',
      surfaceSunkenSoft: 'rgba(15, 23, 42, 0.04)',

      lineSubtle: 'rgba(15, 23, 42, 0.08)',
      lineField: 'rgba(15, 23, 42, 0.13)',
      line: 'rgba(15, 23, 42, 0.15)',
      lineStrong: 'rgba(15, 23, 42, 0.21)',
      borderRgb: '203 213 225',

      accentRgb: '67 56 202',
      accentHoverRgb: '55 48 163',
      purpleRgb: '126 34 206',
      greenRgb: '21 128 61',
      redRgb: '220 38 38',
      yellowRgb: '161 98 7',
      blueRgb: '29 78 216',
      orangeRgb: '194 65 12',

      terminal: {
        foreground: '#0f172a',
        selectionBackground: '#4338ca40',
        black: '#475569',
        red: '#dc2626',
        green: '#15803d',
        yellow: '#a16207',
        blue: '#1d4ed8',
        magenta: '#7e22ce',
        cyan: '#0e7490',
        white: '#64748b',
        brightBlack: '#7c8ba1',
        brightRed: '#b91c1c',
        brightGreen: '#166534',
        brightYellow: '#854d0e',
        brightBlue: '#1e40af',
        brightMagenta: '#6b21a8',
        brightCyan: '#155e75',
        brightWhite: '#334155',
      },
    },
  },

  sepia: {
    label: 'Sepia',
    description: 'A warm ivory page.',
    tokens: {
      bgRgb: '250 246 238',
      bgSecondaryRgb: '246 240 229',
      bgTertiaryRgb: '240 232 217',
      windowWash: 'rgba(250, 246, 238, 0.72)',

      inkRgb: '43 35 26',
      textSecondaryRgb: '109 94 76',
      onBrandRgb: '255 255 255',

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
      accentRgb: '79 70 229',
      accentHoverRgb: '67 56 202',
      purpleRgb: '126 34 206',
      greenRgb: '21 115 71',
      redRgb: '185 28 28',
      yellowRgb: '146 64 14',
      blueRgb: '29 78 216',
      orangeRgb: '154 52 18',

      terminal: {
        foreground: '#2b231a',
        selectionBackground: '#92400e40',
        black: '#57534e',
        red: '#b91c1c',
        green: '#157347',
        yellow: '#92400e',
        blue: '#4f46e5',
        magenta: '#7e22ce',
        cyan: '#0f766e',
        white: '#78716c',
        brightBlack: '#8c837a',
        brightRed: '#dc2626',
        brightGreen: '#15803d',
        brightYellow: '#a16207',
        brightBlue: '#4338ca',
        brightMagenta: '#9333ea',
        brightCyan: '#0e7490',
        brightWhite: '#44403c',
      },
    },
  },

  daylight: {
    label: 'Daylight',
    description: 'Black on white, hard edges.',
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

      accentRgb: '49 46 129',
      accentHoverRgb: '30 27 75',
      purpleRgb: '88 28 135',
      greenRgb: '20 83 45',
      redRgb: '153 27 27',
      yellowRgb: '113 63 18',
      blueRgb: '30 58 138',
      orangeRgb: '124 45 18',

      terminal: {
        foreground: '#000000',
        selectionBackground: '#312e8140',
        black: '#3f3f46',
        red: '#991b1b',
        green: '#14532d',
        yellow: '#713f12',
        blue: '#1e3a8a',
        magenta: '#581c87',
        cyan: '#164e63',
        white: '#52525b',
        brightBlack: '#27272a',
        brightRed: '#7f1d1d',
        brightGreen: '#052e16',
        brightYellow: '#422006',
        brightBlue: '#172554',
        brightMagenta: '#3b0764',
        brightCyan: '#083344',
        brightWhite: '#000000',
      },
    },
  },
}

/** Re-exported so a component needs only one import to render the picker. */
export { THEME_IDS }
