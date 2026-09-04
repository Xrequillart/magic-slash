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

// One status line of the `/features` start card, as a keyframe.
//
// THE STAGGER IS IN HERE AND NOT IN AN `animation-delay`, and that is a correctness
// fix rather than a style choice. A delay on an `infinite` animation applies to the
// FIRST iteration only — every later cycle starts the instant the previous one ends.
// So five lines delayed 2.4s…6.4s each keep their own phase for ever: line one wraps
// back to hidden at 13.4s, line five at 17.4s, and `caret-type` (no delay) wraps at
// 11s. The command retypes itself while all five lines are still on screen, and the
// panel never actually resets.
//
// Baked into the keyframes, every element shares one duration and one start, so every
// cycle boundary lands on the same instant: the list clears and the command retypes
// together, which is what a session starting over looks like.
//
// `hidden` and `shown` are percentages of the shared 11s loop. Both ends are stated so
// the line holds hidden from 0 and holds shown to 100 — no fill mode required.
// One strike-through being drawn, as a keyframe: a bar whose WIDTH grows across the
// label it crosses.
//
// WIDTH AND NOT OPACITY, which is the whole effect. A line that fades in has already
// crossed the word before you see it; one that grows reads as the pen moving, which is
// what "struck through" looks like when it happens rather than when it is done. It costs
// a keyframe per row because the timing is per row, the same way the ticks are.
//
// `text-decoration: line-through` would have been the obvious tool and cannot be
// animated at all — there is no interpolable value between "none" and "line-through" —
// so the bar is an element.
const strikeAt = (at: number) => ({
  '0%': { width: '0%' },
  [`${at}%`]: { width: '0%' },
  [`${at + 4}%`]: { width: '100%' },
  '100%': { width: '100%' },
})

// One CI check settling, as a PAIR of keyframes — the spinner leaving and the tick
// arriving at the same instant.
//
// TWO AND NOT ONE, and it is not for want of trying to make it one. A lucide icon is a
// stroked SVG with a transparent middle, so stacking a tick under a spinner and fading
// only the spinner leaves both sets of strokes visible through each other for the whole
// crossfade — a smudge, not a transition. Each has to carry its own opacity.
//
// `at` is the percentage of the shared loop where the check resolves; the swap takes 4%
// of it. Both end on the settled state, so `motion-reduce:animate-none` shows a passed
// check rather than a frozen spinner — see the note on `statusIn` below for why the
// stagger lives in these percentages and not in an `animation-delay`.
const ciSettled = (at: number) => ({
  '0%': { opacity: '0' },
  [`${at}%`]: { opacity: '0' },
  [`${at + 4}%`]: { opacity: '1' },
  '100%': { opacity: '1' },
})

const ciPending = (at: number) => ({
  '0%': { opacity: '1' },
  [`${at}%`]: { opacity: '1' },
  [`${at + 4}%`]: { opacity: '0' },
  '100%': { opacity: '0' },
})

const statusIn = (hidden: number, shown: number) => ({
  '0%': { opacity: '0', translate: '0 0.25rem' },
  [`${hidden}%`]: { opacity: '0', translate: '0 0.25rem' },
  [`${shown}%`]: { opacity: '1', translate: '0 0' },
  '100%': { opacity: '1', translate: '0 0' },
})

// THE CARD TONES. Eight gradients, declared here and used as `bg-tone-<name>`.
//
// Named and centralised for exactly the reason the elevation scale is: a
// `bg-[linear-gradient(135deg,#6366f1,#393BFF)]` pasted at a call site renders
// perfectly and passes every check, and what it costs is the ability to retune the
// family later — one card would carry a gradient nobody will find again.
// `lib/designTokens.test.ts` pins them all.
//
// FOUR OF THEM CYCLE, though eight cards use them. A tone is normally a SURFACE in a
// family, not an identity: cycling four across the eight skills gives the grid the
// light/dark rhythm it is built on without turning the palette into a legend the
// reader has to learn. It also means adding a ninth skill costs no new colour.
//
// THE OTHER FOUR ARE NAMED, never dealt: `mint`, `amber`, `rose` and `lemon` are asked
// for by name, so a card that carries one keeps it through a reorder. See the note on
// each, and `CARD_TONE_CYCLE` in `components/ui.tsx`.
//
// DECLARED HERE IS NOT THE SAME AS USED ON A PAGE, and the distinction is the thing to
// hold on to. This table is the design system's palette of grounds — what a card MAY be
// — and the tighter question is how many of them one grid is allowed to name at once.
// `/features` names exactly two of the four (amber on `/magic:start`, mint on
// `/magic:done` — the loop's bookends) and `features.test.ts` pins that as an exact
// list, because a third named ground in a grid of eight is where a rhythm turns into a
// legend the reader has to learn. `rose` and `lemon` are therefore available rather than
// unused: a ground a later page can ask for without inventing a gradient at a call site,
// which is the one thing this file exists to prevent.
//
// TWO LIGHT, TWO DARK, in that order, which is what makes the cycle work — a grid of
// four columns lands one of each per row, so no two neighbours are the same weight.
// The text colour that goes with each is NOT here: it belongs with the component
// that draws the card, so a tone and its ink can never be paired wrongly. See
// `CARD_TONES` in `components/ui.tsx`.
//
// 135deg — top-left to bottom-right — on all four, so a row of cards reads as one
// light source rather than four.
//
// The stops are spelled as literals because THIS is their declaration site, the same
// way `SHADOW_TINT` spells its rgba here. `mist` and `sky` open on `softblue`
// (#D9E8FF), the wash the hero already fades through; `indigo` runs the two blues
// the design system already owns, `accent` into `brand`; `midnight` runs `ink` into
// a deepened `brand` rather than into `brand` itself, which at full saturation would
// end the card brighter than the page it sits on.
const BRAND_DEEP = '#1B1C6B'

// The green tone's two stops.
//
// PALE, AND THAT IS THE POINT. This started saturated — a #2F9E68 into a near-black
// green, white type on it — and read as a warning rather than as a finish: a dark
// saturated green at the bottom of a grid of blues is the loudest thing on the page,
// and `/magic:done` is the quietest moment in the loop.
//
// So it is built like `mist` and `sky` instead: two pale stops, dark ink on top. That is
// what lets it be a different HUE without being a different volume — the card reads as
// green, and as the end of something, without shouting.
//
// `green` in the palette above (#22c55e) is a STATUS token — it means "this finished" on
// a check, a diff's additions, a passing gauge. These stops are not it, deliberately: a
// ground is not a status, and spending the status colour on decoration is how a green
// stops meaning "ok" anywhere.
const MINT_LIGHT = '#E4F6EB'
const MINT_DEEP = '#BCE3CD'

// The orange tone's two stops.
//
// BUILT LIKE `sky` AND NOT LIKE `mint`, which is the one decision in here. Both of those
// are light grounds under dark ink, and the difference between them is TRAVEL: `mint` is
// two pale stops eight points apart because `/magic:done` is the quietest moment in the
// loop, and `sky` opens wide on purpose because a flat wash beside `midnight` reads as a
// card someone forgot to fill. This tone dresses `/magic:start`, which is the loudest
// moment — it is the command somebody actually types to find out whether any of this is
// real — so it takes `sky`'s wide sweep rather than `mint`'s whisper, and the grid opens
// warm and closes green.
//
// STILL LIGHT ENOUGH FOR `text-ink` AT BOTH STOPS, which is the constraint that decides
// how far the deep end can go: #F9A96A against #0a0a0a is far past any contrast floor,
// and `lib/designTokens.test.ts`'s ink pairing is what keeps the two moving together if
// it is ever retuned.
//
// NOT `yellow` (#eab308) AND NOT `plate-claude`'s coral, and both near-misses are worth
// naming. `yellow` is a STATUS token — it means "changed" on a changelog dot and
// "watch this" on a gauge — and spending it on a ground is how a colour stops meaning
// anything, the same argument the note above `MINT_LIGHT` makes about `green`. Claude's
// coral (#D97757) belongs to the PLATES, which are somebody else's brand: an orange card
// close enough to it would read as "this is the Claude one", which is a claim about the
// card that is not true.
const AMBER_LIGHT = '#FFE4CC'
const AMBER_DEEP = '#F9A96A'

// The pink and the yellow, both on `sky`'s and `amber`'s construction: a pale top stop
// into a saturated-but-still-light bottom one, ~35 points of luminance apart, so the
// gradient TRAVELS visibly instead of reading as a card someone forgot to fill.
//
// Both stay light enough for `text-ink` at the deep end, which is the constraint that
// decides how far either can go — #F5A8C4 and #F5CE5A are both far past any contrast
// floor against #0a0a0a, and `lib/designTokens.test.ts`'s ink pairing is what keeps the
// ground and its ink moving together if either is retuned.
//
// `LEMON_DEEP` IS NOT `yellow` (#eab308), and the near-miss is the same one `AMBER_*`
// notes above: `yellow` is a STATUS token — "changed" on a changelog dot, "watch this"
// on a gauge — and a status spent on decoration is a status that stops meaning anything.
// This is a paler, warmer yellow chosen to be a surface, and it is deliberately far
// enough from `AMBER_DEEP` that the two do not read as one colour at two strengths.
//
// `ROSE_DEEP` likewise is not `red` (#ef4444) or `purple` (#a855f7), for the same
// reason and with an extra one: red is what this product draws a destructive action in,
// and a card that ships in it is a card that looks like a warning.
const ROSE_LIGHT = '#FFE1EC'
const ROSE_DEEP = '#F5A8C4'
const LEMON_LIGHT = '#FFF6D9'
const LEMON_DEEP = '#F5CE5A'

const TONES = {
  /** Palest of the four: barely a tint, for a card that carries a busy visual. */
  'tone-mist': `linear-gradient(135deg, #E8F0FF 0%, #F7FAFF 100%)`,
  /**
   * The soft blue deepening into a light indigo. Still dark-ink territory.
   *
   * THE SWEEP IS WIDER THAN IT WAS — #D9E8FF → #BDC5F7 originally, which is 8 points of
   * luminance and read as a flat wash rather than as a gradient. Beside `midnight`,
   * whose two stops are a black and a blue, the light cards looked like they had simply
   * been filled. Opening the top stop and deepening the bottom one gives this tone the
   * same VISIBLE travel the dark ones have, without changing what it is: both stops are
   * still light enough for `text-ink`, which is the constraint that decides how far this
   * can go and is checked by `lib/designTokens.test.ts`'s ink pairing.
   */
  'tone-sky': `linear-gradient(135deg, #E6F0FF 0%, #A3B2F0 100%)`,
  /** Saturated: the design system's own two blues, `accent` into `brand`. */
  'tone-indigo': `linear-gradient(135deg, #6366F1 0%, ${BRAND} 100%)`,
  /** The dark one. `ink` into a deepened brand, never into `brand` at full. */
  'tone-midnight': `linear-gradient(135deg, #0A0A0A 0%, ${BRAND_DEEP} 100%)`,
  /**
   * THE ONE TONE THAT IS NOT IN THE BLUE FAMILY, and it is earned rather than added:
   * it dresses the card for `/magic:done`, which is the end of the loop. Green is
   * already what this product says "finished" with — the check in the start card's
   * terminal, a diff's additions, a passing gauge — so the closing card being green is
   * the palette agreeing with itself, not a second accent.
   *
   * LIGHT, like `mist` and `sky`, and it takes the dark ink they take. See the note on
   * its stops above for why it is not the saturated green it started as.
   *
   * It is NOT in `CARD_TONE_CYCLE`. The cycle is positional and means nothing in
   * particular; this one means something, so it is asked for by name.
   */
  'tone-mint': `linear-gradient(135deg, ${MINT_LIGHT} 0%, ${MINT_DEEP} 100%)`,
  /**
   * THE SECOND TONE OUTSIDE THE BLUE FAMILY, and earned the same way `mint` is: it
   * dresses the card for `/magic:start`, which is where a piece of work ENTERS the loop.
   * The grid now opens warm and closes green, which says the shape of the thing before a
   * word of the copy is read — and it is a fact about the command, not about its
   * position, so reordering the eight leaves it where it belongs.
   *
   * Light, like `mist`, `sky` and `mint`, and it takes the dark ink they take. See the
   * note on its stops above for why it sweeps as wide as `sky` rather than as gently as
   * `mint`, and for the two colours it is deliberately not.
   *
   * It is NOT in `CARD_TONE_CYCLE`, for `mint`'s reason: the cycle is positional and
   * means nothing in particular, and this one means something.
   */
  'tone-amber': `linear-gradient(135deg, ${AMBER_LIGHT} 0%, ${AMBER_DEEP} 100%)`,
  /**
   * Pink. A named ground with no page asking for it yet, which is a different standing
   * from `mint` and `amber` and worth being straight about: those two MEAN something on
   * `/features`, this one is a surface the palette offers.
   *
   * That is not the same as unused. The failure this file exists to prevent is a
   * `bg-[linear-gradient(...)]` pasted at a call site — a colour nobody can find again
   * and nobody dares retune — and a declared ground is what a page reaches for instead.
   * Light, so it takes the dark ink the other light tones take. Not `red` and not
   * `purple`; see the note on its stops above.
   */
  'tone-rose': `linear-gradient(135deg, ${ROSE_LIGHT} 0%, ${ROSE_DEEP} 100%)`,
  /**
   * Yellow, on the same standing as `rose` above: declared and available, named by
   * nothing yet.
   *
   * IT IS NOT THE `yellow` IN THE PALETTE, which is the one thing to know about it. That
   * one is a status — see the note on its stops — and this is a ground. Kept far enough
   * from `amber` that a grid carrying both reads as two colours rather than as one at
   * two strengths, which is the risk with any two warm tones in one table.
   */
  'tone-lemon': `linear-gradient(135deg, ${LEMON_LIGHT} 0%, ${LEMON_DEEP} 100%)`,
}

// THE PRODUCT PLATES. One gradient per integration, declared here and used as
// `bg-plate-<name>` by `LogoPlate` in `components/ui.tsx`.
//
// A SECOND NAMESPACE RATHER THAN FIVE MORE `TONES`, and the split is the point. A tone
// is a SURFACE IN A FAMILY — four of them cycle across eight skill cards precisely
// because none of them means anything, and a ninth skill costs no new colour. A plate
// is the opposite: it is a product's own hue, it means exactly one thing, and it is
// asked for by name. Mixing the two would have made `CARD_TONE_CYCLE` able to deal a
// card the GitHub grey.
//
// COLOURS BORROWED FROM SOMEBODY ELSE'S BRAND, so the same rule the retired `vendor`
// namespace was written under applies: nothing outside a plate may reach for these, and
// a `bg-[linear-gradient(...)]` at a call site is the unfindable value this file exists
// to prevent. `lib/designTokens.test.ts` pins the five.
//
// 135deg on all five, like the tones, so a column of plates reads as one light source.
//
// WHY THEY CAN ALL BE SATURATED. Every mark that lands on one sits on a white tile —
// see `LogoPlate` — so the plate never has to be light enough for a logo to survive on
// it. That is what lets `plate-vscode` be VS Code's own blue under VS Code's own blue
// mark, which drawn directly on the ground would have been a mark you could not see.
//
// `plate-magic` is OURS and not a borrowed one: it dresses the row about the app setting
// itself up. It runs `brand` into `BRAND_DEEP` rather than reusing `tone-indigo`'s
// `accent → brand`, so the two are a different gradient rather than one value spelled
// twice.
const PLATES = {
  /** Atlassian blue, light into deep. */
  'plate-jira': `linear-gradient(135deg, #2684FF 0%, #0747A6 100%)`,
  /** GitHub's own greys, which are very nearly its black. */
  'plate-github': `linear-gradient(135deg, #3D444D 0%, #0D1117 100%)`,
  /** VS Code blue. */
  'plate-vscode': `linear-gradient(135deg, #3AA0DE 0%, #0065A9 100%)`,
  /** Claude's coral, the hue `claudecode-color.png` is drawn in (#D97757). */
  'plate-claude': `linear-gradient(135deg, #E08A6B 0%, #A8452A 100%)`,
  /** Ours. `brand` into the deepened brand the midnight tone ends on. */
  'plate-magic': `linear-gradient(135deg, ${BRAND} 0%, ${BRAND_DEEP} 100%)`,
}

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
        // macOS'S NOTIFICATION BANNER, sampled from a real one, for the drawing beside
        // the Notifications row on `/features`.
        //
        // Somebody else's UI, so the same rule the product plates are under: a borrowed
        // value pasted at a call site is the one nobody dares retune later because nobody
        // can tell whether it was chosen or copied. These three were read off a screenshot
        // of the actual banner in dark mode — a neutral #3A3A3A ground with #E1E1E1 for
        // BOTH the title and the body (the title is semibold, not brighter) and a dimmer
        // #B1B1B1 for the age in the corner.
        //
        // Neutral greys, not this site's blue-tinted ink: Apple does not tint them, and a
        // banner in our ink would be a banner from a different operating system.
        macos: {
          /** The banner's ground, dark mode. */
          notification: '#3A3A3A',
          /** Its title and its body — the same value for both. */
          'notification-ink': '#E1E1E1',
          /** The age in its corner. */
          'notification-dim': '#B1B1B1',
        },
        // THE DESKTOP APP'S OWN TWO INKS, for the reproductions on `/features`.
        //
        // SOLID, AND THAT IS THE WHOLE POINT. The `onink` ramp above is white at an
        // alpha, which is right for the footer plate it was built for — one surface, one
        // known ground. A drawing of the app is not that: it stacks a panel on a panel on
        // a window, so a glyph at 50% white takes its colour from whatever happens to be
        // behind it and comes out a different grey in each. Magnified, that reads as
        // washed out rather than as quiet.
        //
        // These are the values `desktop/src/themes.ts` actually declares — `textSecondary`
        // (161 161 170) and `icon` (138 138 146) — so a reproduction using them is not
        // merely more solid, it is more accurate. Nothing outside a mockup may reach for
        // them; the site's own dark ground is `onink`.
        appink: {
          /** `text-text-secondary`: a row's label, and a list's rows. */
          DEFAULT: '#A1A1AA',
          /** `text-icon`: the glyph in an icon-only control. */
          icon: '#8A8A92',
          /** `text-icon-muted`: decoration — the pencil beside an editable field. */
          muted: '#65656A',
        },
        purple: '#a855f7',
        green: '#22c55e',
        red: '#ef4444',
        yellow: '#eab308',
        // TWO MORE OF THE APP'S TONES, for the two info-sidebar cards on `/features`.
        // `orange` is the context gauge between 40% and 70%, and that turn is the
        // picture; `blue` is the "in review" status pill. Both are `themes.ts`'s values.
        // Nothing outside a mockup may reach for them.
        orange: '#f97316',
        blue: '#3b82f6',
        // Two more for the status table under the ticket card: `planned`/`committed` wear
        // cyan, `review addressed` teal. `themes.ts`'s values, like the two above.
        cyan: '#22d3ee',
        teal: '#2dd4bf',
        // THE APP'S THREE BACKGROUNDS AND ITS BORDER, `themes.ts`'s dark values, for the
        // menus and pills the repository and PR cards on `/features` reproduce. Solid,
        // for the reason `appink` is: a menu floats over a card over a panel, and an
        // alpha would come out a different grey on each.
        appbg: {
          DEFAULT: '#0a0a0b',
          secondary: '#141416',
          tertiary: '#1c1c1f',
        },
        appline: '#27272a',
      },
      fontFamily: {
        sans: ['Avenir', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['"Cera Pro"', 'system-ui', 'sans-serif'],
      },
      // Spread rather than written out twice: `TONES` and `PLATES` above are the
      // declarations and their comments, and a second copy here is the copy that would
      // go stale. Two objects and not one merged constant, because they are two
      // different KINDS of ground — see the note on `PLATES`.
      backgroundImage: { ...TONES, ...PLATES },
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
        // `lift` on the mint tone: the same shape, tinted with a green two steps deeper
        // than the plate's own — a grey shadow on a green ground reads as dirt, a green one
        // as depth. For the usage card's panel and nothing else.
        'lift-mint': '0 12px 32px -8px rgba(21, 94, 58, 0.45), 0 2px 6px -2px rgba(21, 94, 58, 0.3)',
        // THE ONLY RUNG THAT CASTS SIDEWAYS, and it exists because the other four
        // cannot: every one of them is a DOWNWARD shadow with a negative spread, which
        // is right for a card sitting on a page and useless for a panel whose only
        // visible boundary is a vertical edge.
        //
        // That is exactly the Agents drawing on `/features`: the application is cut by
        // its frame on three sides, so the one edge with a boundary to sell is the left
        // one, against the plate's blue band. `lift` there resolved to nothing — 16px
        // down and 18px in contracts to zero horizontally — and a shadow you cannot see
        // is a shadow nobody can tell was asked for.
        //
        // Two layers, for `button`'s reason: the wide soft one is the depth, the tight
        // one gives the edge something to sit on so the panel does not float free of the
        // ground it is cut against.
        //
        // THE OFFSET HAS TO BEAT THE SPREAD, which is the one number worth checking if
        // this is ever retuned. A negative spread pulls the shadow's box in from every
        // side, so an offset smaller than it leaves nothing to spill past the edge — the
        // first attempt here was `-6px 0 20px -6px` and rendered, correctly, as almost
        // nothing at all.
        edge: `-10px 0 24px -4px ${SHADOW_TINT(0.25)}, -1px 0 2px ${SHADOW_TINT(0.1)}`,
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
        // ── The `/features` start card's terminal ────────────────────────────────
        //
        // A LOOP, unlike the two above, which play once on entry. This one is the
        // visual inside a card in a grid: a reader arrives at it by scrolling, at a
        // moment nothing can predict, so a run that had already finished would be a
        // still image. It restarts instead, and the long tail on each keyframe is
        // what keeps that from reading as a GIF stuck on repeat.
        //
        // ELEVEN SECONDS, and the whole sequence is timed against that one number:
        // typing, then five lines arriving in order, then the panel scrolling the
        // prompt away as the last of them lands. Change the duration in the
        // `animation` block below and every percentage here moves with it.
        //
        // `caret-type` drives a `max-width` in ch units on the command, so the reveal
        // is per character without a JS scheduler. It only reads as typing because
        // the text is monospace: `steps()` over a proportional face would jump by
        // uneven amounts. TWENTY-ONE CHARACTERS — `/magic:start PROJ-142` — so both
        // the `ch` and the `steps()` below are that number, and both have to change
        // together if the command does.
        'caret-type': {
          '0%': { maxWidth: '0ch' },
          // ~1.9s of the 11s loop for 21 characters: around 11 a second, a person
          // typing a command they know.
          '17%, 100%': { maxWidth: '21ch' },
        },
        'caret-blink': {
          '0%, 45%': { opacity: '1' },
          '50%, 95%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        // Five keyframes, one per line, and the order lives in their percentages —
        // see `statusIn` at the top of this file for why it cannot live in a delay.
        //
        // The arrival times are ~2.4s, 3.3s, 4.2s, 5.2s and 6.4s of the 11s loop.
        // Each holds hidden until just before its turn and shown for the rest of the
        // loop, so the finished list is what the card shows most of the time.
        'status-1': statusIn(21, 27),
        'status-2': statusIn(29, 35),
        'status-3': statusIn(37, 43),
        'status-4': statusIn(46, 52),
        // The last one is the step still running when the loop rests, so it gets a
        // longer beat after the fourth than the others get between them — the pause
        // before work starts is the one this sequence is about.
        'status-5': statusIn(57, 63),
        // ── The `/features` PR card's checks ─────────────────────────────────────
        //
        // Three checks resolving in order over an 8s loop, at 30%, 48% and 66% — a
        // beat and a half apart, because CI jobs do not finish together and three
        // ticks landing at once would read as a progress bar reaching the end.
        'ci-pending-1': ciPending(30),
        'ci-settled-1': ciSettled(30),
        'ci-pending-2': ciPending(48),
        'ci-settled-2': ciSettled(48),
        'ci-pending-3': ciPending(66),
        'ci-settled-3': ciSettled(66),
        // ── The `/features` Agents sidebar ───────────────────────────────────────
        //
        // TWO ANIMATIONS LIFTED FROM THE APP'S OWN `index.css`, keyframe for keyframe,
        // because the sidebar drawing beside them is a reproduction and a state that
        // moves differently there is a state the reader will not recognise.
        //
        // `wave-bar` is `WaveLoader`: three parallel bars scaled on the Y axis, the
        // middle one tallest, 1.2s, with the three copies 0.15s apart. The stagger is an
        // `animation-delay` at the call site rather than three keyframes here, exactly as
        // the app does it.
        'wave-bar': {
          '0%, 100%': { transform: 'scaleY(1)' },
          '35%': { transform: 'scaleY(0.55)' },
          '70%': { transform: 'scaleY(1.1)' },
        },
        // `ask-arrive` is the `waiting` badge: the question bubble ARRIVES rather than
        // gestures — a small lift with a tilt into it, a settle back past level, then
        // rest — because that state is the agent asking you something, not the agent
        // being slow. One arrival per 3s loop, and the rest is most of it. The lift is a
        // PERCENTAGE of the glyph's own height, so it reads the same at any size.
        'ask-arrive': {
          '0%, 44%, 100%': { transform: 'translateY(0) rotate(0deg)' },
          '14%': { transform: 'translateY(-14%) rotate(-5deg)' },
          '30%': { transform: 'translateY(0) rotate(2deg)' },
        },
        // ── The `/features` done card's checklist ────────────────────────────────
        //
        // Five boxes ticking 400ms apart on a 5s loop, so each is 8% further in: 8, 16,
        // 24, 32, 40. `statusIn`'s 2% ramp is 100ms at this duration, which is what
        // makes them read as ticking rather than fading.
        'done-1': statusIn(6, 8),
        'done-2': statusIn(14, 16),
        'done-3': statusIn(22, 24),
        'done-4': statusIn(30, 32),
        'done-5': statusIn(38, 40),
        // The strike-throughs, on the same five beats as the ticks above so a line is
        // drawn as its box is filled.
        'strike-1': strikeAt(6),
        'strike-2': strikeAt(14),
        'strike-3': strikeAt(22),
        'strike-4': strikeAt(30),
        'strike-5': strikeAt(38),
      },
      // `backwards` and not `both`: the fill has to hold the FROM state through the
      // stagger's delay, but once the animation is over the element belongs to the
      // cascade again — an end state pinned by `both` would keep `translate: 0 0` on
      // the bar for the life of the page and quietly outrank anything that wanted to
      // move it later.
      animation: {
        'reveal-a': 'reveal-a 600ms ease-out backwards',
        'reveal-b': 'reveal-b 600ms ease-out backwards',
        // The start card's run: one 11s loop, and EVERY animation in it shares that
        // duration with no delay on any of them. That is what keeps them in phase —
        // see `statusIn` at the top of this file. The order the lines arrive in is in
        // their keyframes, not out here.
        //
        // `steps(21)` for the twenty-one characters of `/magic:start PROJ-142`.
        // `linear` on the lines: an eased status line arriving looks like it is being
        // placed, and these are meant to look like they are landing.
        //
        // No `backwards` anywhere any more. It was there to hold the from-state
        // through a delay, and there is no delay left to hold.
        'caret-type': 'caret-type 11s steps(21, end) infinite',
        'caret-blink': 'caret-blink 1.1s step-end infinite',
        'status-1': 'status-1 11s linear infinite',
        'status-2': 'status-2 11s linear infinite',
        'status-3': 'status-3 11s linear infinite',
        'status-4': 'status-4 11s linear infinite',
        'status-5': 'status-5 11s linear infinite',
        // The PR card's checks: one 8s loop, no delay on any of them, the order in the
        // keyframes. Same discipline as the five status lines above, and for the same
        // reason — a delay on an `infinite` animation applies to the first iteration
        // only, so delayed siblings drift out of phase for ever.
        'ci-pending-1': 'ci-pending-1 8s linear infinite',
        'ci-settled-1': 'ci-settled-1 8s linear infinite',
        'ci-pending-2': 'ci-pending-2 8s linear infinite',
        'ci-settled-2': 'ci-settled-2 8s linear infinite',
        'ci-pending-3': 'ci-pending-3 8s linear infinite',
        'ci-settled-3': 'ci-settled-3 8s linear infinite',
        // The sidebar's two states. The wave's stagger is a delay at the call site, so
        // one animation serves all three bars.
        'wave-bar': 'wave-bar 1.2s ease-in-out infinite',
        'ask-arrive': 'ask-arrive 3s ease-in-out infinite',
        // The done checklist: 400ms between ticks means a 5s loop and 8% steps.
        'done-1': 'done-1 5s linear infinite',
        'done-2': 'done-2 5s linear infinite',
        'done-3': 'done-3 5s linear infinite',
        'done-4': 'done-4 5s linear infinite',
        'done-5': 'done-5 5s linear infinite',
        'strike-1': 'strike-1 5s linear infinite',
        'strike-2': 'strike-2 5s linear infinite',
        'strike-3': 'strike-3 5s linear infinite',
        'strike-4': 'strike-4 5s linear infinite',
        'strike-5': 'strike-5 5s linear infinite',
      },
    },
  },
  plugins: [],
}

export default config
