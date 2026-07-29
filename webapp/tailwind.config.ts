import type { Config } from 'tailwindcss'

// Light theme matching the /docs landing page: soft-blue canvas, black text,
// Cera Pro (display) + Avenir (body), indigo/brand-blue accents.
//
// The `regie` scale dresses /admin. It shares the app's blue family rather than
// opposing it — the back-office is a different ROOM, not a different building — so
// the demarcation is carried by structure instead of colour: a side nav where the
// user pages have a top bar, full-bleed width where they have a centered column,
// monospace for every value, and a brand badge that names the place.
//
// Namespaced so nothing leaks into the user pages by autocomplete, and so the two
// can be retuned independently.
const BRAND = '#393BFF'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0a0a0a',
        muted: '#52525b',
        softblue: '#D9E8FF',
        canvas: '#F4F7FE',
        accent: {
          DEFAULT: '#6366f1',
          hover: '#818cf8',
        },
        brand: BRAND,
        regie: {
          // A deeper tint of the app's own blue than the user canvas (#F4F7FE), so
          // white panels floating on it read as cards rather than as page. Between
          // `canvas` and `softblue` on purpose: `canvas` would be indistinguishable
          // from a user page, `softblue` is a login-screen wash and fights a dense
          // table for attention.
          ground: '#E9F0FF',
          panel: '#FFFFFF',
          // Cool-toned to sit on blue. Two weights: `rule` outlines a panel,
          // `rule-soft` separates rows — one weight for both makes a dense table
          // read as a grid of boxes instead of a list.
          rule: 'rgba(29, 42, 92, 0.12)',
          'rule-soft': 'rgba(29, 42, 92, 0.07)',
          // Blue-leaning secondary text, so labels feel part of the surface rather
          // than dropped on it. Still passes contrast on both ground and panel.
          dim: '#5a6684',
          // Row hover and the tinted fills. Kept as a token rather than a
          // `bg-brand/[0.04]` at each site so every hover in the console matches.
          tint: 'rgba(57, 59, 255, 0.05)',
          rail: BRAND,
        },
        purple: '#a855f7',
        green: '#22c55e',
        red: '#ef4444',
        yellow: '#eab308',
      },
      fontFamily: {
        sans: ['Avenir', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['"Cera Pro"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
