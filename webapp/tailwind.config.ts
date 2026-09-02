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
    },
  },
  plugins: [],
}

export default config
