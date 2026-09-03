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

// Every shadow in the scale is cast in the same desaturated indigo rather than in
// black. On the blue canvas (#F4F7FE) a neutral-black shadow reads as grey soot
// under the card; tinted towards the page it reads as depth. The value comes from
// the one hand-tuned shadow the codebase already had — the leaning illustration in
// `SkillHoursOptIn`, now `shadow-lift` — so the scale is an extension of a shadow
// that was already approved in a browser, not a fresh invention.
const SHADOW_TINT = (alpha: number) => `rgba(19, 16, 48, ${alpha})`

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0a0a0a',
        muted: '#52525b',
        softblue: '#D9E8FF',
        canvas: '#F4F7FE',
        // The hairline. One weight, `ink` at 8% — between the 5% that outlines a
        // surface and the 10% that outlined a field, both of which were written as
        // `border-black/{5,10}` at each site. It exists because the `secondary`
        // button is white on white: without an edge it has no silhouette, and an
        // edge a shade too dark reads as a box drawn around the label rather than
        // as the button's own outline. `primary` reserves the same 1px in
        // `border-transparent`, so the two are the same box — see `BUTTON_BASE`.
        hairline: 'rgba(10, 10, 10, 0.08)',
        // Text and the filet on a DARK ground — the inverse of `ink` / `muted` /
        // `hairline` above, for the one surface on the public site that inverts: the
        // `bg-ink` footer plate, and the language picker in the `footer` dress it wears
        // down there (`components/site/SiteFooter.tsx`,
        // `components/site/LanguageMenu.tsx`). A light footer under a light page has
        // nothing to end the page with, so that plate is dark and everything on it
        // needs its own ladder; `muted` on `#0a0a0a` is unreadable.
        //
        // It exists because those two files were spelling that ladder out at every call
        // site — `text-white/60`, `text-white/50`, `text-white/40`, `border-white/10`,
        // `bg-white/10`, `hover:bg-white/5` — which is the same failure an arbitrary
        // `shadow-[…]` is: six alphas repeated across ten call sites, with nothing
        // saying which of them is a link row and which is a heading, and no way to
        // retune the footer without finding all ten.
        //
        // Three text rungs, loudest first, named by ROLE the way `regie.dim` is rather
        // than by weight: `body` is a link row and the picker's own label, `dim` is the
        // tagline and the GitHub glyph beside it, `faint` is a column heading and the
        // copyright. Full-strength white stays Tailwind's own `text-white` — it is the
        // hover target of all three and needs no name of its own.
        //
        // `rule` and not `hairline`: the light ground's filet is 8% ink and this one is
        // 10% white, so they are two different values, and `lib/designTokens.test.ts`
        // anchors on a line beginning `hairline:` — a second key by that name would
        // satisfy that guard from in HERE and let the real token be deleted in silence.
        // `regie.rule` is the precedent for a namespaced filet.
        //
        // `tint` is the hover fill under a language option and `selected` the plate
        // under the chosen one. `selected` carries `rule`'s value today and is still
        // its own key: one is an edge, the other is a surface. Two spellings of one
        // number rather than a link, on purpose — the same call the `button` radius
        // makes further down.
        onink: {
          body: 'rgba(255, 255, 255, 0.6)',
          dim: 'rgba(255, 255, 255, 0.5)',
          faint: 'rgba(255, 255, 255, 0.4)',
          rule: 'rgba(255, 255, 255, 0.1)',
          tint: 'rgba(255, 255, 255, 0.05)',
          selected: 'rgba(255, 255, 255, 0.1)',
        },
        // ── `brand` IS the primary CTA. `accent` is NON-CTA ONLY ─────────────
        //
        // This reversed once, and the note is kept in that shape on purpose so the
        // next reader does not have to guess which way round it went.
        //
        // `brand` (#393BFF) is the fill of the `primary` button — `BUTTON_VARIANTS`
        // in `components/ui.tsx`, the single definition. For one iteration of this
        // scale it was banned from every CTA and the primary button was white; that
        // white recipe is still here, as `secondary`, and the ban is lifted. So a
        // blue button in the signed-in product is now the INTENDED primary action,
        // not the regression this note used to call it.
        //
        // `accent` (#6366f1 / #818cf8) did NOT come along. It stays non-CTA: it is
        // the selected-state and focus-ring blue, one step off `brand` and never a
        // fill you press. Two blues doing one job is how a palette stops meaning
        // anything — if a CTA is wearing `accent`, that is the bug.
        //
        // The loud affirmative in the `/admin` console remains `ink` (it is a
        // confirm step, not the page's primary action) and destructive remains `red`.
        //
        // What the blues are for OUTSIDE the primary button, and where they
        // legitimately survive:
        //   • selected states — `border-accent bg-accent/[0.06]` in `ProfileWizard`,
        //     `AppearanceSettings`, `LanguageSwitcher`, `Dropdown`
        //   • tints and washes — the `bg-accent/10` badge behind an icon, the band
        //     under the leaning card in `SkillHoursOptIn`
        //   • focus rings — `focus:border-accent` on every field
        //   • typography — the `Eyebrow` slash-command signature, an org name
        //   • the `/admin` chrome — `regie.rail`, `regie.tint`, `Pill tone="brand"`,
        //     the `Modal` header icon
        //
        // Including the three tinted shadows, which STAY: `shadow-brand/[0.04]` on
        // the console panel and input (`components/regie/primitives.tsx`) and
        // `shadow-brand/[0.06]` on the app-version tile
        // (`app/admin/users/[userId]/page.tsx`). They tint a back-office surface
        // towards the blue it floats on. None of them is a button.
        //
        // AND THE INTERACTIVE CASES — the ones the list above misses, because it
        // sorts by category and every category in it sounds inert. Blue still fills
        // and tints controls a user operates, and that is not a contradiction: a CTA
        // is what you click to COMMIT to the page's primary action (submit the form,
        // accept the invite, turn the recording on), and it is the `primary` button.
        // An interactive element that is not a CTA carries no such
        // commitment — it reports a state, measures progress, or hints that a row is
        // clickable — and these all stay exactly as they are:
        //   • a toggle's CHECKED state — `peer-checked:bg-brand` and the
        //     `peer-focus-visible:ring-accent` next to it on the switch in
        //     `components/SettingRow.tsx` (l. 112). The blue is the control's VALUE;
        //     what you press to keep it is the `primary` button below the section.
        //     Same hue as that button now, which is the one place this note has to
        //     be read carefully: a switch is a value you set, not an action you fire.
        //   • a PROGRESS fill — `bg-brand` on the step bar in
        //     `components/ProfileWizard.tsx` (l. 179) and on the bar in
        //     `app/admin/stats/page.tsx` (l. 48). A measurement, with nothing to click.
        //   • a HOVER tint on a navigation row — the `group-hover:text-brand`
        //     chevrons and step badges in `components/GettingStarted.tsx` (eight
        //     `text-brand` / `bg-brand/*` between them), and the same chevron over the
        //     `bg-brand/10` icon tile in `components/OrganizationCard.tsx`
        //     (l. 165-166, 275). Those rows disclose or navigate; they do not commit.
        //   • a PROSE link — `[&_a]:text-accent` in `components/Markdown.tsx` (l. 44),
        //     which is what a link has looked like since long before this palette.
        //   • a dialog's HEADER icon — `bg-brand/10` / `text-brand` in
        //     `components/Modal.tsx` (l. 64, 66). Decoration above the copy; the
        //     modal's CTA is the `Button` in its footer.
        // Left as they are rather than retoned. When `brand` was banned from CTAs
        // this was the "documented as non-CTA" route the acceptance criterion
        // allowed; now that `brand` is the CTA fill, the list above is no longer an
        // exemption to justify but simply an inventory of where blue means state,
        // measurement or decoration instead of action.
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
      // The elevation scale. Four rungs, deliberately few: a white-on-white
      // interface separates things by space and by a whisper of a shadow, and a
      // seven-step ramp only invites two neighbouring surfaces to differ by an
      // amount nobody can see.
      //
      // Every one of them is declared HERE and used as `shadow-<token>`. An
      // arbitrary `shadow-[0_1px_2px_…]` at a call site is the failure this scale
      // exists to prevent, and `lib/designTokens.test.ts` fails the build on one.
      boxShadow: {
        // The primary button at rest. Two layers because one cannot do both jobs:
        // the 1px contact shadow gives the white face an edge to sit on, the wide
        // soft one lifts it off the card. Small numbers on purpose — a button that
        // floats too far reads as a modal.
        button: `0 1px 2px ${SHADOW_TINT(0.06)}, 0 2px 8px -2px ${SHADOW_TINT(0.1)}`,
        // Hover. The contact layer barely moves; the diffuse one roughly doubles.
        // The button appears to rise without changing colour, which is the only
        // affordance a white button has left once the fill is gone.
        'button-hover': `0 1px 2px ${SHADOW_TINT(0.07)}, 0 6px 16px -4px ${SHADOW_TINT(0.16)}`,
        // Surfaces (`Card`, `Section`). Quieter than the button by design: this one
        // lands on ~35 elements, and a card that competes with the button it
        // contains inverts the hierarchy of the whole page.
        card: `0 1px 2px ${SHADOW_TINT(0.04)}, 0 8px 24px -12px ${SHADOW_TINT(0.1)}`,
        // The one dramatic shadow, for something genuinely off the page: the tilted
        // illustration in `SkillHoursOptIn`. Transplanted verbatim from the
        // arbitrary class it replaces, so the pixels are unchanged.
        //
        // Shadows do not compose: a second `shadow-*` on an element REPLACES the
        // first rather than stacking on it. The illustration is a `Card`, so
        // `shadow-lift` has to displace the `shadow-card` that surface carries —
        // and it does so through `Card`'s `shadow` SLOT (`components/ui.tsx`),
        // which substitutes the class instead of appending a rival to it. Nothing
        // here rides on a specificity or ordering race, and the position of this
        // key in the object decides nothing: Tailwind emits `boxShadow` utilities
        // sorted by class NAME, not in declaration order, so any comment promising
        // that "declared last wins" was describing an alphabetical coincidence.
        lift: `0 16px 36px -18px ${SHADOW_TINT(0.4)}`,
      },
      borderRadius: {
        // The soft radius of the button. `rounded-xl` (0.75rem) rather than the
        // `rounded-full` pill it replaces, and named rather than used directly so
        // the button's corner can be retuned without auditing every `rounded-xl`
        // in the app.
        //
        // 0.75rem is also what `FIELD` spells as `rounded-xl` in `components/ui.tsx`,
        // so a button and the field beside it share a corner today. Two spellings of
        // one number rather than a link, on purpose: retuning this token moves the
        // button alone, which is the whole point of it having a name.
        //
        // Pills, badges, avatars and switches keep `rounded-full`: they are shapes,
        // not buttons, and there is no `borderRadius.card` because `rounded-2xl` is
        // already the surface convention everywhere.
        button: '0.75rem',
      },
      // The public site's column. One number, 1100px, and it was written by hand in
      // three files before it had a name — the header pill, the footer plate and every
      // band of the homepage (`components/site/home/Shell.tsx`) each carried their own
      // `max-w-[1100px]`, which is the same failure an arbitrary `shadow-[…]` is: the
      // width of the site cannot be retuned without finding all three, and a fourth
      // structural component would be a coin toss between 1100 and 1120.
      //
      // Named `site` rather than `container` because it is not Tailwind's `container`
      // (that one is a component with its own breakpoint map and centring behaviour,
      // and shadowing the name would make `max-w-container` read as a reference to it)
      // and not `page` because `/admin` is full-bleed on purpose — see the `regie`
      // note above. This is the width of the MARKETING column specifically.
      //
      // The signed-in product does not use it: its pages are on `max-w-*` sizes from
      // Tailwind's own scale, tuned per page, and nothing here changes them.
      maxWidth: {
        site: '1100px',
      },
      // THE ENTRANCE OF THE PUBLIC SITE'S FIRST SCREEN — the header bar, and each
      // element of the hero staggered behind it by an `animation-delay`. Named here and
      // used only through `components/site/Reveal.tsx`; read the note at the top of
      // that file for why the resting state is the ABSENCE of these classes.
      //
      // AN ANIMATION AND NOT A TRANSITION, which is the whole reason the entrance is
      // in the config at all instead of being two utility classes at the call site. A
      // transition needs its from-state to be in the markup and resolved by the browser
      // before the to-state lands — and the only state the server may emit is the
      // resting one, because the page has to be readable without JavaScript. Driving
      // that from React means rendering a from-state and then a to-state and trusting
      // the browser to resolve a style between two commits React is free to batch;
      // measured, it does not, and the entrance silently never plays. These frames
      // carry their own from-state, so adding the class is enough.
      //
      // `translate` — the individual transform property — and NOT `transform`: the
      // header centres itself with `-translate-x-1/2`, and a keyframe writing
      // `transform` would replace that for the length of the animation and throw the
      // bar half its own width to the right. `translate` composes with `transform`
      // rather than overwriting it.
      //
      // `--reveal-from` is how far, and which way. Unset, an element rises 12px, which
      // is the `translate-y-3` the hero used to spell out; the bar drops in from 20px
      // above and asks for that with `[--reveal-from:-1.25rem]` at its own call site.
      //
      // TWO NAMES, IDENTICAL FRAMES, and the duplication is load-bearing rather than a
      // copy-paste: the entrance REPLAYS on a language change (the copy is what it
      // introduces, so new copy earns a new entrance) and the only thing that restarts
      // a CSS animation is a change of `animation-name`. `Reveal` alternates between
      // the two. Do not "clean this up" into one.
      keyframes: {
        'reveal-a': {
          from: { opacity: '0', translate: '0 var(--reveal-from, 0.75rem)' },
          to: { opacity: '1', translate: '0 0' },
        },
        'reveal-b': {
          from: { opacity: '0', translate: '0 var(--reveal-from, 0.75rem)' },
          to: { opacity: '1', translate: '0 0' },
        },
      },
      // `backwards` and not `both`: the fill has to hold the FROM state through the
      // stagger's delay, but once the animation is over the element belongs to the
      // cascade again — an end state pinned by `both` would keep `translate: 0 0` on
      // the bar for the life of the page and quietly outrank anything that wanted to
      // move it later.
      animation: {
        'reveal-a': 'reveal-a 600ms ease-out backwards',
        'reveal-b': 'reveal-b 600ms ease-out backwards',
      },
    },
  },
  plugins: [],
}

export default config
