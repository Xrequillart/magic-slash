/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  // Deliberately off: `backdrop-filter` has to re-read and re-blur whatever sits
  // behind an element on every frame, which killed scroll performance (~53ms per
  // frame on the settings page vs ~10ms without). The frosted look is provided by
  // the native macOS window vibrancy instead. Writing `backdrop-blur-*` in a
  // className is a no-op — use an opaque or tinted background.
  corePlugins: {
    backdropBlur: false,
    backdropFilter: false,
  },
  theme: {
    extend: {
      // Every colour resolves against a CSS variable written by the renderer's
      // theme registry (src/renderer/theme/themes.ts) — that file is the only
      // place a value lives. Adding a theme touches nothing here.
      //
      // Two forms on purpose. Bare `R G B` channels wrapped in `<alpha-value>`
      // keep the opacity modifiers the app relies on (`text-ink/80`,
      // `bg-accent/15`). Surfaces and lines are complete colours instead: their
      // translucency is part of the design and has to differ per theme, since
      // black over a light window needs more of it than white over a dark one.
      colors: {
        bg: {
          DEFAULT: 'rgb(var(--c-bg) / <alpha-value>)',
          secondary: 'rgb(var(--c-bg-secondary) / <alpha-value>)',
          tertiary: 'rgb(var(--c-bg-tertiary) / <alpha-value>)',
        },
        accent: {
          DEFAULT: 'rgb(var(--c-accent) / <alpha-value>)',
          hover: 'rgb(var(--c-accent-hover) / <alpha-value>)',
        },
        purple: 'rgb(var(--c-purple) / <alpha-value>)',
        green: 'rgb(var(--c-green) / <alpha-value>)',
        red: 'rgb(var(--c-red) / <alpha-value>)',
        yellow: 'rgb(var(--c-yellow) / <alpha-value>)',
        blue: 'rgb(var(--c-blue) / <alpha-value>)',
        orange: 'rgb(var(--c-orange) / <alpha-value>)',
        border: 'rgb(var(--c-border) / <alpha-value>)',
        'text-secondary': 'rgb(var(--c-text-secondary) / <alpha-value>)',
        /** Primary text. What `text-white` meant before the app had themes. */
        ink: 'rgb(var(--c-ink) / <alpha-value>)',
        /** Text on a solid brand fill — stays legible whatever the theme. */
        'on-brand': 'rgb(var(--c-on-brand) / <alpha-value>)',
        surface: {
          subtle: 'var(--c-surface-subtle)',
          DEFAULT: 'var(--c-surface)',
          strong: 'var(--c-surface-strong)',
          sunken: 'var(--c-surface-sunken)',
          'sunken-soft': 'var(--c-surface-sunken-soft)',
        },
        line: {
          subtle: 'var(--c-line-subtle)',
          field: 'var(--c-line-field)',
          DEFAULT: 'var(--c-line)',
          strong: 'var(--c-line-strong)',
        },
      },
      fontFamily: {
        sans: ['Cera Pro', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['SF Mono', 'Monaco', 'monospace'],
      },
      animation: {
        'float-1': 'float1 10s ease-in-out infinite',
        'float-2': 'float2 12s ease-in-out infinite',
        'float-3': 'float3 11s ease-in-out infinite',
        'fade-in': 'fadeIn 0.2s ease',
        // Settings page switch: shorter and shallower than fade-in, which is
        // for something appearing over the app. Moving between pages should
        // feel immediate, not like a panel opening.
        'page-in': 'pageIn 0.18s ease-out',
        'slide-in': 'slideIn 0.3s ease',
        'slide-out': 'slideOut 0.3s ease forwards',
        'tada': 'tada 0.8s ease-in-out',
      },
      keyframes: {
        tada: {
          '0%': { transform: 'scale(1)' },
          '10%, 20%': { transform: 'scale(0.95) rotate(-3deg)' },
          '30%, 50%, 70%, 90%': { transform: 'scale(1.05) rotate(3deg)' },
          '40%, 60%, 80%': { transform: 'scale(1.05) rotate(-3deg)' },
          '100%': { transform: 'scale(1) rotate(0)' },
        },
        float1: {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '50%': { transform: 'translate(-30px, 30px) scale(1.05)' },
        },
        float2: {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '50%': { transform: 'translate(20px, -25px) scale(1.03)' },
        },
        float3: {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '50%': { transform: 'translate(-25px, -20px) scale(1.04)' },
        },
        fadeIn: {
          from: { opacity: 0, transform: 'translateY(10px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
        pageIn: {
          from: { opacity: 0, transform: 'translateY(6px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
        slideIn: {
          from: { transform: 'translateX(100%)', opacity: 0 },
          to: { transform: 'translateX(0)', opacity: 1 },
        },
        slideOut: {
          from: { transform: 'translateX(0)', opacity: 1 },
          to: { transform: 'translateX(100%)', opacity: 0 },
        },
      },
    },
  },
  plugins: [],
}
