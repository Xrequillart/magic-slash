import type { Config } from 'tailwindcss'

// magic-slash product brand — dark theme + indigo accent. Mirrors
// desktop/tailwind.config.cjs so app.magic-slash.io matches the desktop app.
const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: '#0a0a0b',
          secondary: '#141416',
          tertiary: '#1c1c1f',
        },
        accent: {
          DEFAULT: '#6366f1',
          hover: '#818cf8',
        },
        purple: '#a855f7',
        green: '#22c55e',
        red: '#ef4444',
        yellow: '#eab308',
        blue: '#3b82f6',
        orange: '#f97316',
        border: '#27272a',
        'text-secondary': '#a1a1aa',
      },
    },
  },
  plugins: [],
}

export default config
