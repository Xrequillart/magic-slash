/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    // The shared components spell their classes as literals precisely so this
    // glob can find them — see `design-system/README.md`. Left out, a `Banner`
    // renders with no ground at all.
    "../design-system/desktop/**/*.{ts,tsx}",
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
        /**
         * THE FIXED PAPER AND THE FIXED INK — the two surfaces in the app that do not
         * move when the theme does, and neither of them moves for the same reason.
         *
         * `LoginScreen` CANNOT follow it. It is drawn before anyone has signed in, which
         * is before the app knows whose theme to wear, so it opens on a fixed light
         * ground (`release-mesh` below) with a glass card on it — and the card is this
         * pair. `Input`'s `glass` variant and `ButtonIcon`'s `paper` tone are the two
         * components mixed from it.
         *
         * `WhatsNewDialog`'s COVER does not follow it BY CHOICE. Everything under that
         * band is a document and is typeset in the theme's own colours; the band itself
         * is a picture, drawn in black on white, and a picture that restated whichever of
         * the eight grounds the app happens to be wearing would be a picture saying
         * nothing. So the band is `release-paper` and the drawing on it is
         * `release-ink` — see the component, which states the split at length.
         *
         * THE INK IS CHANNELS AND THE PAPER IS A COLOUR, which is this table's own split:
         * the ink is asked for at several strengths — a placeholder at 40%, a field's
         * ground at 45%, a border at 60%, the cover's cross at 60% — and only the `R G B`
         * form keeps `/60` working. The paper is never modulated on the cover, and is at
         * `/35` and `/45` on the glass card, so it carries a modifier too.
         *
         * `10 10 11` is the `dark` theme's own window colour, which is the site's `ink`
         * to within a point. Not a variable: a value that followed the theme would be the
         * opposite of what this pair is for.
         */
        'release-paper': '#FFFFFF',
        'release-ink': 'rgb(10 10 11 / <alpha-value>)',
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
        // These two REPLACE Tailwind's own `cyan` and `teal` scales, which is the
        // point: `text-cyan-400` was being used for an agent status and ignored the
        // theme. Overriding the family means the numbered classes stop resolving, so
        // the old form fails loudly instead of quietly painting a fixed colour.
        cyan: 'rgb(var(--c-cyan) / <alpha-value>)',
        teal: 'rgb(var(--c-teal) / <alpha-value>)',
        border: 'rgb(var(--c-border) / <alpha-value>)',
        'text-secondary': 'rgb(var(--c-text-secondary) / <alpha-value>)',
        /** Primary text. What `text-white` meant before the app had themes. */
        ink: 'rgb(var(--c-ink) / <alpha-value>)',
        /** Text on a solid brand fill — stays legible whatever the theme. */
        'on-brand': 'rgb(var(--c-on-brand) / <alpha-value>)',
        /**
         * Icons, and only icons. Two opaque weights: `text-icon` for anything
         * that can be clicked or read, `text-icon-muted` for decoration. They
         * exist so an icon never needs an alpha modifier — `text-icon/50` is a
         * bug, not a shade. Text keeps using `ink` / `text-secondary`.
         */
        icon: {
          DEFAULT: 'rgb(var(--c-icon) / <alpha-value>)',
          muted: 'rgb(var(--c-icon-muted) / <alpha-value>)',
        },
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
        // Page switch inside a rail, used by SweepPane. Shorter and shallower
        // than fade-in, which is for something appearing over the app: moving
        // between pages should feel immediate, not like a panel opening. The
        // suffix is the way the content travels — picking an entry further down
        // the rail sweeps both the old and the new page up, going back up sweeps
        // them down. The horizontal pair is for opening and closing a sub-page
        // rather than moving along the rail: going in sweeps left, coming back
        // out sweeps right. The two halves run one after the other rather than
        // at once: SweepPane delays the entrance past the exit, and `both` is
        // what holds the incoming page hidden for the length of that delay.
        'sweep-in-up': 'sweepInUp 0.2s ease-out both',
        'sweep-in-down': 'sweepInDown 0.2s ease-out both',
        'sweep-in-left': 'sweepInLeft 0.2s ease-out both',
        'sweep-in-right': 'sweepInRight 0.2s ease-out both',
        'sweep-out-up': 'sweepOutUp 0.16s ease-in forwards',
        'sweep-out-down': 'sweepOutDown 0.16s ease-in forwards',
        'sweep-out-left': 'sweepOutLeft 0.16s ease-in forwards',
        'sweep-out-right': 'sweepOutRight 0.16s ease-in forwards',
        'slide-in': 'slideIn 0.3s ease',
        'slide-out': 'slideOut 0.3s ease forwards',
        'tada': 'tada 0.8s ease-in-out',
      },
      /**
       * THE RELEASE MESH — the one picture in this config, and the ground the sign-in
       * screen opens on.
       *
       * IT IS THE SITE'S `tone-sky`, VALUE FOR VALUE. That token is built in
       * `webapp/tailwind.config.ts` by a `mesh()` of six radial blooms over a flat wash,
       * from two stops (`SKY_LIGHT` / `SKY_DEEP`) that are a reference picture's own — it
       * is the ground `/features` sets the context card on. This is that function's output,
       * evaluated once and pasted, because the two halves of the design system share
       * nothing: `design-system/README.md` rule 1 forbids importing across them, and a
       * config is per app anyway. Regenerate it by building `bg-tone-sky` against the
       * webapp's config if those stops ever move.
       *
       * A TOKEN AND NOT A CLASS IN THE COMPONENT, which is rule 2's other half: a shared
       * component names a ROLE and never a value, so `LoginScreen` asks for
       * `bg-release-mesh` and the seven colours live here.
       *
       * IT DOES NOT FOLLOW THE THEME, and here that is not even a choice: this is the
       * ground the app shows BEFORE anyone has signed in, which is before it knows whose
       * theme to wear. Everything drawn on it takes `release-ink`, the fixed near-black
       * these stops were chosen to carry.
       */
      boxShadow: {
        /**
         * THE GLASS CARD'S LIFT — the sign-in card on the release mesh.
         *
         * css.glass's fourth ingredient, and the one that keeps a translucent card from
         * reading as a hole cut in the ground behind it: a blurred plate with no shadow
         * has no thickness, so the blur looks like a property of the background rather
         * than of an object in front of it.
         *
         * A TOKEN AND NOT AN ARBITRARY VALUE, which is the webapp's rule (its
         * `lib/designTokens.test.ts` refuses one) and is worth keeping on this side for
         * the same reason: the two halves draw the same card, one in the app and one in
         * `/design-system`, and a shadow spelled at a call site is one the other copy
         * cannot find.
         */
        glass: '0 4px 30px rgba(0, 0, 0, 0.12)',
      },
      backgroundImage: {
        'release-mesh': "radial-gradient(22% 52% at 34% 51%, #E2EEFCB3 0%, #E2EEFC98 25%, #E2EEFC59 50%, #E2EEFC1A 75%, #E2EEFC00 100%), radial-gradient(30% 40% at 67% 48%, #4D77EE3B 0%, #4D77EE32 25%, #4D77EE1D 50%, #4D77EE09 75%, #4D77EE00 100%), radial-gradient(30% 32% at 73% 85%, #61A7F4A6 0%, #61A7F48D 25%, #61A7F453 50%, #61A7F418 75%, #61A7F400 100%), radial-gradient(23% 68% at 51% 88%, #61A7F494 0%, #61A7F47E 25%, #61A7F44A 50%, #61A7F416 75%, #61A7F400 100%), radial-gradient(66% 43% at 10% 95%, #4D77EE9E 0%, #4D77EE87 25%, #4D77EE4F 50%, #4D77EE17 75%, #4D77EE00 100%), radial-gradient(49% 43% at 34% 78%, #4D77EEA1 0%, #4D77EE89 25%, #4D77EE50 50%, #4D77EE18 75%, #4D77EE00 100%), linear-gradient(#E2EEFC, #E2EEFC)",
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
        // 16px: enough to read the direction at a glance, small enough that a
        // settings tab still feels switched rather than animated.
        sweepInUp: {
          from: { opacity: 0, transform: 'translateY(16px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
        sweepInDown: {
          from: { opacity: 0, transform: 'translateY(-16px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
        sweepOutUp: {
          from: { opacity: 1, transform: 'translateY(0)' },
          to: { opacity: 0, transform: 'translateY(-16px)' },
        },
        sweepOutDown: {
          from: { opacity: 1, transform: 'translateY(0)' },
          to: { opacity: 0, transform: 'translateY(16px)' },
        },
        // Wider than the vertical pair: sideways travel stands for opening or
        // closing a page, so it is allowed to read as a gesture rather than as
        // the near-cut a tab switch gets.
        sweepInLeft: {
          from: { opacity: 0, transform: 'translateX(24px)' },
          to: { opacity: 1, transform: 'translateX(0)' },
        },
        sweepInRight: {
          from: { opacity: 0, transform: 'translateX(-24px)' },
          to: { opacity: 1, transform: 'translateX(0)' },
        },
        sweepOutLeft: {
          from: { opacity: 1, transform: 'translateX(0)' },
          to: { opacity: 0, transform: 'translateX(-24px)' },
        },
        sweepOutRight: {
          from: { opacity: 1, transform: 'translateX(0)' },
          to: { opacity: 0, transform: 'translateX(24px)' },
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
