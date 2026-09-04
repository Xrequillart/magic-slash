'use client'

import { useId, useState } from 'react'
import { ChevronDown, type LucideIcon } from 'lucide-react'
import { useT } from '@/lib/i18n/useLanguage'

/**
 * The shared visual vocabulary — and the only place any of it is defined. The
 * classes below started life duplicated across every page; nothing may copy them
 * back out. `lib/designTokens.test.ts` guards the parts a copy would break.
 *
 * ONE RULE governs every component below, and it is forced by there being no
 * `clsx` and no `tailwind-merge` in this repo: a caller's `className` is appended
 * to the recipe, but Tailwind picks the winner by STYLESHEET order — which it
 * decides itself, sorting the utilities by class name — not by the order of the
 * class attribute. So a `className` that CONFLICTS with a base class wins or
 * loses on an alphabetical accident nobody here chose.
 *
 * Additive layout — `mt-6`, `ml-auto`, `w-full`, `shrink-0` — is safe, and is
 * MOST of what call sites pass; it is not all of it. `app/plans/page.tsx` and
 * `ProfileSection` both hand a `Card` a `hover:border-black/10` that argues with
 * `SURFACE`'s `border-black/5` (it happens to land, since the two differ only in
 * the variant), and until `Card` grew a `shadow` slot `SkillHoursOptIn` handed it
 * a second shadow the same way. Anything that would fight the recipe belongs in a
 * slot inside it instead: `BUTTON_SIZES`, `Eyebrow`'s `spacing`, and `Card`'s
 * `shadow` are the three that exist.
 */

/** Drops the unset slots, so an absent option does not leave a double space. */
function cx(...parts: (string | undefined)[]) {
  return parts.filter(Boolean).join(' ')
}

// ── Buttons ──────────────────────────────────────────────────────────────────

/**
 * Geometry and type only. No colour, no fill, no elevation, and — since the
 * `size` option below owns it — no padding.
 *
 * `transition` rather than `transition-colors`: the primary button's hover is a
 * change of SHADOW, and `transition-colors` would snap it.
 *
 * The FOCUS RING is here rather than per-variant, and it is `ink`. In the base
 * because it is true of all four, and because the variant that needs it most is
 * `secondary`, which has the least to fall back on: a white face on a white card has no
 * fill for the UA's own outline to sit against, and the shadow that gives it a
 * silhouette at rest says nothing about which control the keyboard is on. `ink`
 * and not `brand` — a blue ring around a blue button is not a ring, and one neutral
 * ring for every rung means the keyboard focus reads the same wherever it lands.
 * Same shape as the console's own button base in
 * `components/regie/primitives.tsx`, which only differs in the hue.
 *
 * A LABEL NEVER WRAPS. `whitespace-nowrap` because a button that breaks its label
 * over two lines grows taller than the controls beside it, and a row of buttons
 * where one is double height reads as a layout bug rather than as a set of
 * choices — the label is the control's name, not prose. Paired with `shrink-0`,
 * since a button in a tight flex row would otherwise be squeezed narrower than
 * its own text and overflow it: the two together mean the button asks for the
 * width it needs and keeps it.
 *
 * That makes overflow the caller's problem in the one case where the width is
 * genuinely fixed — a `w-full` button whose label is longer than its container.
 * The `truncate` PROP handles it, and it has to be a prop rather than a class the
 * caller appends: `text-overflow` is not an inherited property, and a bare string
 * inside a flex container is an anonymous flex item, so a `truncate` on the button
 * itself clips the label without ever drawing the ellipsis. The label needs an
 * element of its own to be cut in. See `buttonContent`.
 *
 * The BORDER is here too, and only its colour is left to the variants. A border
 * changes the size of the box, so a variant without one is 2px narrower and 2px
 * shorter than a variant with one — and anywhere a button swaps variant on state
 * (a segmented control, a selected row, a toggling filter) the layout jumps by
 * that much on every click. Declaring `border` once and letting each variant pick
 * `border-transparent` or `border-hairline` makes every button the same box
 * whatever it is wearing, and means a new variant cannot forget to reserve it.
 *
 * `disabled:cursor-not-allowed` stays here because it is true of every variant.
 * `disabled:opacity-40` used to, and no longer can: a white button at 40% on a
 * white card is not a disabled button, it is an absent one. Each variant now
 * declares how it goes quiet.
 */
const BUTTON_BASE =
  'inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-button border font-display text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-not-allowed'

/**
 * Padding, as a slot rather than something a caller appends — a `className="px-4"`
 * would lose to the base's `px-5` (see the file header). The two paddings the app
 * actually needs, replacing the default instead of arguing with it.
 */
const BUTTON_SIZES = {
  /** The app default. */
  md: 'px-5 py-2.5',
  /** Taller, for a page whose button IS the page: sign-in, accept an invite. */
  lg: 'px-6 py-3',
} as const

/**
 * The same two rungs with the padding equalised, for a button whose entire label
 * is its icon. Selected automatically when `icon` arrives without children.
 *
 * A separate map rather than a modifier on the one above, because reusing `md`
 * would put a 40px-wide plate around a 16px glyph and the button would read as a
 * lozenge. Note that an icon button has no text to name it — the caller MUST pass
 * an `aria-label`, since the glyph is `aria-hidden` and there is nothing else left
 * for a screen reader to announce.
 */
const BUTTON_ICON_SIZES = {
  md: 'p-2.5',
  lg: 'p-3',
} as const

/**
 * FOUR RUNGS OF COMMITMENT, loudest first: `primary` commits, `secondary` is the
 * safe alternative beside it, `ghost` dismisses, `danger` destroys.
 *
 * `primary` is `brand` blue with white text. It was white with a drop shadow for
 * one iteration of this scale, and the white recipe did not go away — it became
 * `secondary`, unchanged, which is why the elevation and the hairline live down
 * there rather than here. The blue is a DELIBERATE reversal: see the note on
 * `brand` in `tailwind.config.ts`, which had declared the token non-CTA and no
 * longer does.
 *
 * What each variant has to work with:
 *   • `primary` — a saturated fill, so it needs nothing else to be found. Hover
 *     darkens the fill AND lifts the shadow; unlike a white face, this one has a
 *     fill left to darken.
 *   • `secondary` — no fill, so it needs all three of the others: a hairline for
 *     its silhouette on a white card, `shadow-button` to sit above that card
 *     rather than in it, and `text-ink` at full strength. Hover moves the shadow
 *     only.
 *   • `ghost` — no plate and no edge, so its text colour is the whole state.
 *   • `danger` — enough fill that dimming the whole thing still reads as a button.
 *
 * The RANKING is the point, not any one recipe. `primary` and its neighbour sit
 * side by side in every modal footer and settings row (`app/organization/page.tsx`,
 * `CloudAccountSection`, `ClaudeCodeSettings`, `app/application/repository/[id]`),
 * so the distance between them is what makes either legible. Give `ghost` an edge
 * or a plate of its own and it collapses into `secondary`; that is the failure this
 * ladder is arranged to prevent.
 */
const BUTTON_VARIANTS = {
  // Blue fill, white text — the one CTA in the product that carries the brand
  // colour. Shares the disabled recipe below rather than fading the blue: a
  // `bg-brand/40` would put white text on a pale periwinkle and lose the contrast
  // the fill exists to provide.
  primary:
    'border-transparent bg-brand text-white shadow-button hover:bg-brand/90 hover:shadow-button-hover disabled:bg-black/[0.04] disabled:text-muted disabled:shadow-none',
  // Disabled, for both filled and white: the shadow goes, the face turns to a flat
  // plate, the text drops to `muted`. Dropping the SHADOW is what carries it — a
  // button that is no longer raised is no longer pressable, and that reading
  // survives at any opacity.
  //
  // `muted` rather than something fainter on purpose. `globals.css` fades every
  // control inside a disabled `<fieldset>` to 0.5 (the read-only repository page),
  // and that multiplies whatever this says: a `text-black/30` would arrive there at
  // an effective 15% and disappear. See the note on that rule in `globals.css`.
  secondary:
    'border-hairline bg-white text-ink shadow-button hover:shadow-button-hover disabled:bg-black/[0.04] disabled:text-muted disabled:shadow-none',
  // Ghost has to go clearly lighter than the `muted` it rests at — but no fainter
  // than the same fieldset floor the note above sets, since 0.5 × this is what the
  // read-only repository page actually renders.
  //
  // Its border is TRANSPARENT, not absent: it reserves the same 1px `secondary`
  // spends visibly, so a control that toggles between the two does not shift. Make
  // it `border-hairline` and ghost stops being a rung — an edged white-on-nothing
  // button beside an edged white button is one button wearing two names.
  ghost:
    'border-transparent text-muted hover:bg-black/[0.04] hover:text-ink disabled:text-black/40',
  danger: 'border-transparent bg-red text-white hover:bg-red/90 disabled:opacity-40',
} as const

export type ButtonVariant = keyof typeof BUTTON_VARIANTS
type ButtonSize = keyof typeof BUTTON_SIZES

type ButtonShape = {
  variant?: ButtonVariant
  size?: ButtonSize
  /**
   * Rendered at 16px to the LEFT of the label — the only side it goes on, so that
   * a column of buttons has its glyphs on one axis.
   *
   * Passed WITHOUT children it makes an icon button: the padding squares up on its
   * own (`BUTTON_ICON_SIZES`) and there is no text left, so the caller has to name
   * the button with an `aria-label`.
   *
   * A prop rather than an icon handed in as a child, which already worked because
   * the base is a flex row with a `gap-2`. Two reasons it is worth a slot anyway:
   * the size and the `shrink-0` were being retyped at each call site (and a missing
   * `shrink-0` squashes the glyph in a `w-full` button with a long label), and only
   * the component can tell "icon plus label" from "icon alone" and pick the padding
   * to match. Mirrors `SectionHeader`, which takes its icon the same way.
   */
  icon?: LucideIcon
  /**
   * Cut the label with an ellipsis when the button is narrower than its text.
   *
   * For the button whose width is set by its container rather than by its label —
   * a `w-full` one in a narrow column. The button keeps its full width; only the
   * label gives way, and it gives way with three dots rather than by disappearing
   * at the edge.
   *
   * Off by default, because it wraps the label in an element and an icon handed in
   * as a CHILD (the trailing chevron in `ProfileWizard`) would be swept inside
   * that element and truncated along with the text. Buttons that size to their
   * own label never need it.
   */
  truncate?: boolean
  className?: string
}

/**
 * `children` reaches this only to decide the padding — an icon with a label is a
 * normal button, an icon alone is a square one.
 */
function buttonClass({
  variant = 'primary',
  size = 'md',
  icon,
  className,
  children,
}: ButtonShape & { children?: React.ReactNode }) {
  const iconOnly = icon !== undefined && (children === undefined || children === null || children === false)
  const padding = iconOnly ? BUTTON_ICON_SIZES[size] : BUTTON_SIZES[size]
  return cx(BUTTON_BASE, padding, BUTTON_VARIANTS[variant], className)
}

/**
 * `aria-hidden` on the glyph: the label names the button, and an icon button names
 * itself through its `aria-label`.
 *
 * `min-w-0` on the truncating span is the half that is easy to forget. A flex item's
 * automatic minimum size is its content, so without it the span refuses to become
 * narrower than the whole label and there is nothing left to cut.
 */
function buttonContent(icon: LucideIcon | undefined, children: React.ReactNode, truncate: boolean) {
  const label = truncate ? <span className="min-w-0 truncate">{children}</span> : children
  if (!icon) return label
  const Glyph = icon
  return (
    <>
      <Glyph className="h-4 w-4 shrink-0" aria-hidden />
      {label}
    </>
  )
}

export function Button({
  variant,
  size,
  icon,
  truncate = false,
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & ButtonShape) {
  return (
    <button className={buttonClass({ variant, size, icon, className, children })} {...props}>
      {buttonContent(icon, children, truncate)}
    </button>
  )
}

/** Anchor styled as a Button — for external links (downloads) that must stay <a>. */
export function ButtonLink({
  variant,
  size,
  icon,
  truncate = false,
  className,
  children,
  ...props
}: React.AnchorHTMLAttributes<HTMLAnchorElement> & ButtonShape) {
  return (
    <a className={buttonClass({ variant, size, icon, className, children })} {...props}>
      {buttonContent(icon, children, truncate)}
    </a>
  )
}

// ── Form controls ────────────────────────────────────────────────────────────

/** `border-hairline` is the token that replaced the hand-written `border-black/10`. */
const FIELD =
  'w-full rounded-xl border border-hairline bg-white px-3.5 py-2.5 text-sm text-ink outline-none transition-colors focus:border-accent'

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cx(FIELD, className)} {...props} />
}

export function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cx(FIELD, className)} {...props} />
}

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cx(FIELD, className)} {...props} />
}

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cx('mb-1.5 block text-xs font-medium text-muted', className)} {...props} />
}

// ── Surfaces ─────────────────────────────────────────────────────────────────

/**
 * The one surface recipe, shared by `Card` and `Section` — which were the same
 * string written twice, and drifted the moment either was touched.
 *
 * Shared as a CONSTANT and not by having `Section` render a `<Card>`: `Card` is a
 * `<div>` with no `as` prop, and a `Section` has to stay a `<section>`.
 *
 * The ELEVATION is not in this string. Shadows do not compose — a second
 * `shadow-*` on the same element replaces the first rather than stacking on it —
 * so a surface that bakes its shadow into the base leaves a caller who wants a
 * different rung no move except to append a conflicting class and hope Tailwind's
 * sort puts it later. It is a slot on `Card` instead, the way padding is a slot on
 * `Button` and the margin is one on `Eyebrow`: the caller REPLACES the rung
 * instead of racing it. `SkillHoursOptIn` is the only one that does.
 *
 * `rounded-2xl` rather than a token: the surface radius is already the convention
 * everywhere, and an alias for it would only be one more name to keep in sync.
 */
const SURFACE = 'rounded-2xl border border-black/5 bg-white'

/**
 * The rung every surface sits at unless it says otherwise — the quietest one in
 * the scale, on purpose. It lands on ~35 surfaces, and it has to stay under the
 * white button standing on top of it.
 */
const SURFACE_SHADOW = 'shadow-card'

export function Card({
  shadow = SURFACE_SHADOW,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  /**
   * The elevation rung, as a `shadow-<token>` class from the scale in
   * `tailwind.config.ts`. A slot and not a `className`, since it has to replace
   * `shadow-card` rather than argue with it.
   */
  shadow?: string
}) {
  return <div className={cx(SURFACE, shadow, className)} {...props} />
}

/**
 * THE COLOURED CARD. A gradient surface with a headline, a line under it and room
 * for a visual — the marketing pages' loud counterpart to `Card`, which is white and
 * deliberately quiet.
 *
 * WHY IT IS NOT A VARIANT OF `Card`. `Card` is the product's surface: white, a
 * hairline border, one shadow rung, and it appears on ~35 screens where the content
 * is what should be read. This one has no border and no shadow, its ground carries
 * the colour, and the copy inside it changes ink depending on that ground. A `tone`
 * prop on `Card` would have made every one of those 35 call sites able to reach for
 * a gradient, and made `Card`'s own recipe conditional on a prop it has no other use
 * for. Two components, one for each job.
 *
 * THE TONE IS A SLOT AND IT CARRIES ITS OWN INK. That pairing is the point of the
 * table below: `midnight` is near-black, so its title has to be white and its body
 * a white alpha, and `mist` is barely a tint, so the same card needs `ink`. Left to
 * a caller, that is two decisions that can disagree — a `text-ink` title on a
 * `midnight` ground is invisible, renders fine and passes every check. Here they
 * cannot come apart: naming the tone names the ink with it.
 *
 * `className` STAYS ADDITIVE, as everywhere in this file: layout only — a column
 * span, a min-height. Anything that would argue with the recipe (the ground, the
 * radius, the ink) is a slot or is not available.
 */
export const CARD_TONES = {
  mist: { surface: 'bg-tone-mist', title: 'text-ink', body: 'text-ink/60' },
  sky: { surface: 'bg-tone-sky', title: 'text-ink', body: 'text-ink/60' },
  // `onink-body` is the declared white-on-dark body alpha the footer plate already
  // uses, rather than a second `text-white/60` spelling of the same number.
  indigo: { surface: 'bg-tone-indigo', title: 'text-white', body: 'text-onink-body' },
  midnight: { surface: 'bg-tone-midnight', title: 'text-white', body: 'text-onink-body' },
  // Green, and the only tone outside the blue family. See the note on `tone-mint` in
  // `tailwind.config.ts` for why it is earned rather than added, why it is PALE rather
  // than the saturated green it started as, and why it is absent from the cycle below:
  // it MEANS something, so it is asked for by name.
  //
  // Light ground, so it takes the same dark ink `mist` and `sky` take. That pairing is
  // not a detail — it changed with the ground, and `lib/designTokens.test.ts` is what
  // makes sure the two moved together.
  mint: { surface: 'bg-tone-mint', title: 'text-ink', body: 'text-ink/60' },
  // Orange, and the second tone outside the blue family. Same standing as `mint` and
  // earned the same way: it dresses the card for `/magic:start`, where work ENTERS the
  // loop, so the grid opens warm and closes green. See the note on `tone-amber` in
  // `tailwind.config.ts` for why it sweeps as wide as `sky` rather than as gently as
  // `mint`, and for the two colours it is deliberately not — `yellow`, which is a
  // status, and Claude's coral, which is somebody else's brand.
  //
  // Light ground, so it takes the same dark ink `mist`, `sky` and `mint` take. Absent
  // from the cycle below, for `mint`'s reason: it MEANS something, so it is asked for by
  // name.
  amber: { surface: 'bg-tone-amber', title: 'text-ink', body: 'text-ink/60' },
  // Pink and yellow, and their standing is deliberately different from the two above:
  // `mint` and `amber` MEAN something on `/features`, these are grounds the palette
  // offers and nothing names yet. Declared rather than left out because the alternative
  // is a page inventing a gradient at a call site — see the note on `tone-rose` in
  // `tailwind.config.ts`, and on `yellow` there for why `lemon` is not the status token
  // of the same colour.
  //
  // Light grounds, so both take the dark ink every light tone here takes. Out of the
  // cycle below with `mint` and `amber`: the cycle is positional and deals four, and
  // widening it would change the rhythm of a grid neither of these is on.
  rose: { surface: 'bg-tone-rose', title: 'text-ink', body: 'text-ink/60' },
  lemon: { surface: 'bg-tone-lemon', title: 'text-ink', body: 'text-ink/60' },
} as const

export type CardTone = keyof typeof CARD_TONES

/**
 * The tone order the grids cycle through, and it is an ORDER rather than a set: two
 * light then two dark, so a four-column row lands one of each and no two neighbours
 * carry the same weight. Exported because the cycling belongs to the caller — it
 * knows how many cards it has and how wide its grid is.
 *
 * FOUR OF THE EIGHT. The other four — `mint`, `amber`, `rose`, `lemon` — are asked for
 * by name and are never dealt to whichever card happens to land on their index. Two of
 * them mean something today (`amber` opens the loop on `/magic:start`, `mint` closes it
 * on `/magic:done`); the other two are grounds the palette offers and nothing names yet.
 *
 * WIDENING THE CYCLE IS NOT THE WAY TO USE THEM. Two light then two dark is what makes a
 * four-column row land one of each, so a fifth entry would put two neighbours on the
 * same weight — and dealing a MEANINGFUL ground positionally is exactly what naming one
 * was meant to stop.
 *
 * A card that names a tone simply does not consume its position here; the cards around
 * it keep theirs, because the index is the card's own and not a running counter. See
 * `FeaturesContent`.
 */
export const CARD_TONE_CYCLE: readonly CardTone[] = ['mist', 'sky', 'indigo', 'midnight']

/**
 * `rounded-2xl`, not a radius of its own. The Tailwind config says it outright —
 * "there is no `borderRadius.card` because `rounded-2xl` is already the surface
 * convention everywhere" — and a coloured card is still a surface. The reference
 * these were drawn from rounds a little harder; one surface convention is worth more
 * than the four pixels.
 *
 * `overflow-hidden` so a visual handed to `children` can bleed to the card's edges
 * and still be clipped to the corner. NO SHADOW: the ground is doing the separating,
 * and `shadow-card` under a saturated gradient reads as dirt rather than as lift.
 */
const TONE_SURFACE = 'relative overflow-hidden rounded-2xl'

/**
 * ONE HEIGHT FOR EVERY COLOURED CARD, and it lives here rather than at the call sites.
 *
 * A grid already equalises the cards in a ROW — that is what `items-stretch` does by
 * default — but not across rows, so a grid of eight came out as four different heights
 * and read as a wall rather than as a set. The eye reads unequal cards as unequal
 * IMPORTANCE, which is exactly the wrong thing to say about eight commands.
 *
 * `min-h-` AND NOT `h-`, which is the part worth writing down. A fixed height clips, and
 * what it clips first is the longest translation: French runs 15-20% longer than English
 * across these catalogues, so a height tuned on the English copy would cut a French
 * description on the one card that needed the room. A minimum equalises every card that
 * fits and lets the one that does not grow instead of losing a line — and since a grid
 * row stretches to its tallest member, one card growing takes its neighbour with it and
 * the set stays level.
 *
 * 20rem is measured against the tallest content the page actually has: a card carrying a
 * drawn visual (`p-7` of copy over a panel ~11rem tall). The copy-only cards then hold
 * their whitespace on purpose — the room under a two-line description is what makes the
 * grid read as a grid.
 */
const TONE_HEIGHT = 'min-h-80'

/**
 * How a card arranges its copy and its visual.
 *
 * `stacked` is the default and what a half-width card wants: copy at the top, visual
 * under it, both the full width of the card.
 *
 * `beside` is for a card wide enough that stacking wastes it — a full-row card whose
 * copy is two lines leaves a band of empty ground under it, and the visual pushed to the
 * bottom edge reads as an afterthought rather than as the point. Side by side, the copy
 * gets a column it can be read in and the visual gets the rest.
 *
 * IT STAYS STACKED BELOW `md` in either case. A 24rem copy column and a panel beside it
 * do not both fit on a phone, and the thing that gives way is the copy — so the row only
 * exists where there is width for it.
 */
export type ToneCardLayout = 'stacked' | 'beside'

export function ToneCard({
  tone = 'mist',
  layout = 'stacked',
  title,
  description,
  children,
  className,
}: {
  /** The ground, and with it the ink. See `CARD_TONES`. */
  tone?: CardTone
  /** Copy over visual, or copy beside it. See `ToneCardLayout`. */
  layout?: ToneCardLayout
  title: string
  description: string
  /**
   * The visual, if there is one. Rendered UNPADDED, so a caller can either pad it or let
   * it run to the card's edges — which is the difference between an icon sitting in the
   * card and a screenshot bleeding out of it.
   *
   * WHERE it sits is this component's business, not the visual's. A visual that placed
   * itself with `mt-auto` was a visual that had to know the card was a flex column, and
   * it silently stopped working the day the card became a row. The card owns the box; the
   * visual owns what is inside it.
   */
  children?: React.ReactNode
  /** Additive layout only: a column span. Never the ground, the ink, or the arrangement. */
  className?: string
}) {
  const { surface, title: titleInk, body } = CARD_TONES[tone]
  const beside = layout === 'beside'

  return (
    <div
      className={cx(
        TONE_SURFACE,
        TONE_HEIGHT,
        surface,
        // The direction is the component's, not the caller's — it used to arrive as a
        // `flex flex-col` in `className`, which is exactly the conflicting utility the
        // house rule keeps out of that prop: two arrangements racing, decided by
        // Tailwind sorting class names.
        beside ? 'flex flex-col md:flex-row' : 'flex flex-col',
        className,
      )}
    >
      {/* `p-7` rather than the `p-6` the white `Card` uses at its call sites: a coloured
          ground needs more margin before its own edge, or the type looks pinned to the
          corner. In a row the copy is capped so it stays a readable measure — a
          full-width card would otherwise set its description across 1000px. */}
      <div className={cx('p-7', beside ? 'md:max-w-sm md:shrink-0' : undefined)}>
        <h3 className={cx('font-display text-xl font-bold leading-tight', titleInk)}>{title}</h3>
        {/* `text-base` at `font-medium` — 16px, 500.
            
            The SIZE went up (from 14px) because this is the card's only prose: there is
            no third tier under it to crowd, so the size that would be too loud in a
            dense layout is simply the size one line wants.
            
            The WEIGHT went up only one step, not two. 400 was too thin — a coloured
            ground eats weight, and a light face loses more to a saturated background
            than a heavy one does, so the title and the description were drifting apart
            on `indigo` and `midnight` while looking right on `mist`. But 600 at 16px
            overcorrected: the description started competing with the `font-bold` title
            above it, and two headlines on a card is none. 500 is the step that fixes
            the thinness without picking a fight. */}
        <p className={cx('mt-2 text-base font-medium leading-relaxed', body)}>{description}</p>
      </div>

      {children ? (
        // Stacked: pushed to the bottom edge whatever the copy above it measures, so a
        // pair of cards in a grid row still line up.
        // Beside: takes the rest of the row and centres, because a panel aligned to the
        // bottom of a card taller than itself leaves a gap above it that reads as a
        // mistake. `min-w-0` because a flex item's automatic minimum is its content, and
        // these visuals are deliberately wider than their box.
        <div className={beside ? 'min-w-0 flex-1 md:self-center' : 'mt-auto'}>{children}</div>
      ) : null}
    </div>
  )
}

/**
 * THE PRODUCT PLATES, name → the ground declared for it in `tailwind.config.ts`.
 *
 * The same shape as `CARD_TONES` above and, deliberately, NOT the same table. A tone is
 * a surface in a family — four of them cycle across the skill cards because none of them
 * means anything in particular. A plate is a product's own hue: it means exactly one
 * thing and it is always asked for by name. Keeping them apart is what stops
 * `CARD_TONE_CYCLE` from ever dealing a card the GitHub grey.
 *
 * No ink travels with a plate, which is the other difference. A tone carries its title
 * and body colours because copy sits ON it; a plate carries a mark on a white tile and a
 * caption that is white on all five grounds, so there is no pairing to get wrong.
 */
export const PLATE_GROUNDS = {
  jira: 'bg-plate-jira',
  github: 'bg-plate-github',
  vscode: 'bg-plate-vscode',
  claude: 'bg-plate-claude',
  magic: 'bg-plate-magic',
} as const

export type PlateGround = keyof typeof PLATE_GROUNDS

/**
 * How a mark meets the tile it sits on. See the note on `LogoPlate` — it describes the
 * ARTWORK, not the plate: a bare glyph is inset, a finished app icon fills the tile.
 */
export type PlateFit = 'inset' | 'bleed'

/**
 * A product's mark, centred on its own coloured ground — the artwork half of a
 * `ShowcaseCard`, and the reason that card can hold five different logos without five
 * different treatments.
 *
 * THE WHITE TILE IS THE WHOLE TRICK. Marks arrive in whatever colour their owner drew
 * them in — VS Code's is blue, GitHub's is black — and no single ground can hold both.
 * A logo on a white tile on a coloured ground has that problem solved once: the plate is
 * then free to be the product's real, saturated hue, including VS Code blue under a VS
 * Code blue mark. It is also what an app icon looks like everywhere else on a screen, so
 * it reads as an object rather than as a sticker.
 *
 * `fit` IS THE ONE THING A CALLER HAS TO GET RIGHT, and it is a fact about the ARTWORK
 * rather than a taste about the plate. Marks come in two kinds:
 *
 *   `inset` — a bare glyph on transparency, which is most of them. It sits at 64px in
 *   the 96px tile, and the white margin around it is what makes the tile read as a tile.
 *
 *   `bleed` — a finished app icon that brings its own square ground, which Jira's mark
 *   and ours both do. Inset, those draw a coloured box inside a white box; filling the
 *   tile instead, the artwork simply BECOMES the tile and takes its corner.
 *
 * `overflow-hidden` on the tile is what makes `bleed` work: the sources are hard squares,
 * and the rounding is done here rather than in the artwork.
 *
 * NO CAPTION. There was one — a ticket key, a PR number — and it was a second thing to
 * read on a panel whose whole job is to be recognised without reading. The mark says
 * which product this is faster than a word under it can, and the card's title beside it
 * says what you get.
 *
 * `object-contain` for an inset glyph, because a mark is not guaranteed square.
 * `object-cover` for a bleeding one, because an app icon is.
 *
 * `alt=""` and not the product's name: the card's own title names it, and a screen reader
 * that hears "Jira" twice has learnt nothing the second time.
 */
export function LogoPlate({
  ground,
  src,
  fit = 'inset',
  className,
}: {
  /** Which product's ground. See `PLATE_GROUNDS`. */
  ground: PlateGround
  /** The mark, as a path under `public/`. */
  src: string
  /** How the mark meets the tile. See the note above — it is a fact about the artwork. */
  fit?: PlateFit
  /** Additive layout only. */
  className?: string
}) {
  return (
    <div
      className={cx(
        // `rounded-xl` inside the card's `rounded-2xl`: one step down, so the inner
        // corner looks concentric with the outer rather than parallel to it.
        //
        // `min-h-44` is what gives the plate a body when the copy beside it is two
        // lines. Without it a short row would draw a letterbox, and a column of rows
        // would have a different plate height each.
        'flex min-h-44 items-center justify-center rounded-xl p-6',
        PLATE_GROUNDS[ground],
        className,
      )}
    >
      {/* The tile. `shadow-lift` — the scale's loudest rung — because it is floating on
          a saturated ground, where `shadow-card` would be invisible. */}
      <span className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-lift">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt=""
          className={
            fit === 'bleed' ? 'h-full w-full object-cover' : 'h-16 w-16 object-contain'
          }
        />
      </span>
    </div>
  )
}

/**
 * A white card whose copy sits beside a piece of artwork: a title, a sentence or two
 * under it, and a panel on the right holding the picture.
 *
 * WHAT IT IS FOR, AND WHERE IT SITS BETWEEN THE OTHER TWO. `Card` is the product's plain
 * surface — white, a hairline, one shadow rung, and whatever you put in it. `ToneCard`
 * is the marketing counterpart, where the GROUND carries the colour and the copy has to
 * change ink with it. This is the third shape: the ground stays white and readable, and
 * the colour is spent on one artwork panel that is allowed to be as loud as it likes.
 * That is what makes it the right card for a row about somebody else's product — the
 * plate can be their brand without the page becoming it.
 *
 * `art` IS A SLOT, NOT A `LogoPlate`. The pairing is the common case and not the only
 * one: anything that wants to be a panel beside a paragraph goes in here, and the card
 * stays the one that knows how a card is arranged. Rendered UNPADDED for the same reason
 * `ToneCard`'s `children` is — the panel decides its own inset — except that here the
 * card supplies the frame's padding, since an artwork bleeding to a WHITE card's edge
 * would lose the border rather than escape it.
 *
 * IT STACKS BELOW `md`. A readable measure of copy and a panel beside it do not both fit
 * on a phone; stacked, the copy leads and the artwork follows, which is the reading
 * order either way.
 *
 * `md:items-stretch` so the plate matches the card's height rather than floating in the
 * middle of it — which is what makes a column of these read as a column.
 */
export function ShowcaseCard({
  title,
  description,
  art,
  className,
}: {
  title: string
  description: string
  /** The artwork panel. `LogoPlate` is the usual one. */
  art?: React.ReactNode
  /** Additive layout only: never the ground, the ink, or the arrangement. */
  className?: string
}) {
  return (
    <div
      className={cx(
        SURFACE,
        // NO SHADOW, unlike `Card`. `shadow-card` was tuned for a surface you are meant
        // to read INTO — a panel of settings, a list — where a whisper of lift says
        // "this is a thing on the page". This card is mostly one saturated plate, and a
        // lift under something already that loud reads as a smudge under it rather than
        // as elevation. The hairline is enough to hold it off a white ground, which is
        // the same call `ToneCard` makes for the same reason.
        'flex flex-col gap-0 overflow-hidden md:flex-row md:items-stretch',
        className,
      )}
    >
      {/* `md:basis-0 md:grow-[5]` against the panel's `grow-[4]`, so the copy takes a
          little more than half the row. A fixed `max-w` here would have left a band of
          empty white on a wide page; a share of the row scales with it.
          
          `justify-center` so a one-line description sits level with the plate's middle
          rather than pinned to the card's top edge. */}
      <div className="flex flex-col justify-center p-7 md:basis-0 md:grow-[5] md:p-9">
        <h3 className="font-display text-2xl font-bold leading-tight text-ink">{title}</h3>
        <p className="mt-3 text-base leading-relaxed text-ink/60">{description}</p>
      </div>
      {art ? (
        // `min-w-0` because a flex item's automatic minimum is its content, and a plate
        // is happy to be wider than its share if nothing stops it.
        <div className="min-w-0 p-4 md:basis-0 md:grow-[4] md:py-5 md:pl-0 md:pr-5">{art}</div>
      ) : null}
    </div>
  )
}

export function Section({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <section className={cx(SURFACE, SURFACE_SHADOW, 'p-6')}>
      <h2 className="font-display text-lg font-bold text-ink">{title}</h2>
      <p className="mt-1 text-sm text-muted">{description}</p>
      <div className="mt-5">{children}</div>
    </section>
  )
}

/**
 * Icon + title above a Card, optionally with a control on the right. Mirrors the
 * desktop app's SectionHeader, which is how its settings pages are structured.
 */
export function SectionHeader({
  icon: Icon,
  title,
  action,
}: {
  icon: LucideIcon
  title: string
  action?: React.ReactNode
}) {
  return (
    <div className="mb-3 flex items-center gap-2.5">
      <Icon className="h-4 w-4 shrink-0 text-muted" />
      <h2 className="font-display text-sm font-bold text-ink">{title}</h2>
      {action && <div className="ml-auto">{action}</div>}
    </div>
  )
}

// ── Badge ────────────────────────────────────────────────────────────────────

/**
 * A badge is a SHAPE, not a button: it keeps `rounded-full` while the button moves
 * to `rounded-button`, and the `accent` tone keeps its blue because nothing here is
 * clickable. Every tone already goes through a colour token; there is nothing to
 * migrate, only this note so the next pass does not migrate it anyway.
 */
const BADGE_TONES = {
  neutral: 'bg-black/[0.05] text-muted',
  accent: 'bg-accent/10 text-accent',
  green: 'bg-green/10 text-green',
  yellow: 'bg-yellow/10 text-yellow',
  red: 'bg-red/10 text-red',
  purple: 'bg-purple/10 text-purple',
} as const

export type BadgeTone = keyof typeof BADGE_TONES

export function Badge({
  tone = 'neutral',
  className,
  children,
}: {
  tone?: BadgeTone
  className?: string
  children: React.ReactNode
}) {
  return (
    <span className={cx('rounded-full px-2.5 py-0.5 text-[11px] font-medium', BADGE_TONES[tone], className)}>
      {children}
    </span>
  )
}

// ── Collapse ─────────────────────────────────────────────────────────────────

/**
 * One disclosure row: a question you press, and the answer that opens under it.
 *
 * ── THE DRESS IS CLEANSHOT'S, MEASURED OFF `cleanshot.com/faq` ──────────────────────
 *
 * Their `.question` is a ROUNDED PLATE and not a ruled row, which is the whole character
 * of the thing and the easiest part to get wrong. Read off their stylesheet:
 *
 *   • `border-radius: 10px; padding: 15px; margin-bottom: 5px` — a stack of soft tiles
 *     with a hairline of air between them. NO borders and NO dividers anywhere.
 *   • `background: #1616180d` on `:hover` AND on `.-active` — the same 5% ink wash for
 *     "you are pointing at this" and "this is open". One state, two causes.
 *   • title `18px / 600 / line-height 1.67`, laid out `space-between` with the marker,
 *     `user-select: none`.
 *   • marker: a 20px chevron, `margin-left: 20px`, `transition: all .3s`, and
 *     `transform: rotate(180deg)` while open.
 *   • answer `15px / 450 / 1.6`, full ink rather than a greyed-down rung, `max-height: 0`
 *     with `overflow: hidden`, and `margin-top: 24px` once open.
 *
 * Translated into this system rather than transcribed: `rounded-xl` is 12px against
 * their 10 and `p-4` is 16px against their 15, because those are the DECLARED radius and
 * spacing rungs and a 10px corner would be an arbitrary value on a page whose whole
 * point is that there are none. Their 15px of plate padding is therefore spent as the
 * trigger's `p-4` plus the answer's `px-4 pb-4` — see the note at the button, which is
 * about which element owns it rather than about the number. `bg-ink/5` is their wash — `ink` is #0a0a0a where theirs
 * is #161618, which is the same decision one notch cooler. `text-lg` is exactly their
 * 18px and `text-[15px]` exactly their 15px, the latter already established by
 * `ChangelogContent.tsx`. Weight 450 does not exist in our two families, so the answer
 * takes `font-normal` and the plate carries the hierarchy the half-step would have.
 *
 * THE ANSWER IS FULL `text-ink`, which looks like an oversight beside `/changelog`'s
 * `text-ink/70` entries and is not: on a row with no rule under it, the ONLY thing
 * separating the answer from the question above it is 24px of air and a weight step. Fade
 * the answer and the row stops reading as one block of text and starts reading as a
 * heading with a caption. It is their call and it is right.
 *
 * TWO THINGS DELIBERATELY NOT COPIED, both of them their bugs rather than their design:
 *
 *   1. `max-height` FOR THE ANIMATION. It only works against a number, and a number no
 *      content reaches means the transition eases towards a height that is never used —
 *      so a short answer finishes early and snaps, and one longer than the cap is simply
 *      cut off. `grid-template-rows: 0fr → 1fr` opens to the CONTENT's own height with
 *      no number in it at all. It is the one technique that does; the alternative is
 *      reading `scrollHeight` in an effect, which is a layout read per row on mount and
 *      goes stale on every language switch — and `useT()` re-renders these with French in
 *      them. The grid needs THREE elements and each is load-bearing: the track (which
 *      transitions), an `overflow-hidden` clipper (a grid item at `0fr` is zero-height
 *      but does not hide what spills out of it), and the content. Collapsing the middle
 *      one into either neighbour breaks it.
 *
 *   2. A `div` FOR THE TRIGGER, which is what theirs is — no role, no `aria-expanded`, no
 *      keyboard. Here it is a real `button` inside an `h3`: pressed with Space as well as
 *      Enter, announced as expanded or collapsed, and giving a screen reader a list of
 *      headings to navigate rather than eleven unnamed rows. The `h3` wraps the button
 *      instead of replacing it, which is what the ARIA accordion pattern asks for and
 *      costs an element with no styles on it.
 *
 * ── WHY NOT `<details>`/`<summary>` ─────────────────────────────────────────────────
 *
 * The same widget with none of the code, and it loses on the animation: a native
 * `details` SNAPS open, its height is not animatable, and the ways round that
 * (`::details-content`, `interpolate-size`) are new enough that the transition would be
 * present in some of the browsers reading the page and absent in the rest. Its marker is
 * also awkward to replace consistently across engines, and `summary`'s implicit role does
 * not take the `aria-expanded` this needs.
 *
 * ── SPACING BETWEEN ROWS BELONGS TO THE CALLER ──────────────────────────────────────
 *
 * CleanShot puts `margin-bottom: 5px` on the row itself with a `:last-of-type` rule to
 * take it back off. This carries no margin at all: a group is `flex flex-col gap-1`,
 * which is the same 4px of air with no exception to state and no margin on a lone row
 * that has nothing under it. `motion-reduce:transition-none` throughout, because all of
 * this is decoration on a state change.
 *
 * ── CONTROLLED OR NOT ───────────────────────────────────────────────────────────────
 *
 * Pass `open` and `onToggle` for an accordion that closes its siblings; pass neither and
 * the row owns its own state, which is what a FAQ wants — see the note in
 * `FaqContent.tsx` on why comparing two answers beats one-at-a-time.
 */
export function Collapse({
  title,
  open,
  onToggle,
  defaultOpen = false,
  id,
  className,
  children,
}: {
  /** The pressable line. A string in every current call site; `ReactNode` so a row can carry a badge. */
  title: React.ReactNode
  /** Controlled state. Omit both this and `onToggle` to let the row keep its own. */
  open?: boolean
  onToggle?: (open: boolean) => void
  /** Uncontrolled only — ignored when `open` is passed. */
  defaultOpen?: boolean
  /** An anchor target on the row, so `#credentials` addresses one question. */
  id?: string
  /** ADDITIVE layout only. See the rule at the top of this file. */
  className?: string
  children: React.ReactNode
}) {
  const [ownOpen, setOwnOpen] = useState(defaultOpen)
  const isOpen = open ?? ownOpen

  const panelId = useId()
  const triggerId = useId()

  const toggle = () => {
    // Both, always: a controlled caller gets its callback, an uncontrolled row moves its
    // own state. Branching on which mode we are in would mean a caller that passes
    // `onToggle` alone (to log the press, say) silently loses the toggle.
    onToggle?.(!isOpen)
    if (open === undefined) setOwnOpen((was) => !was)
  }

  return (
    // THE PLATE. `bg-ink/5` while open and on hover — their one wash for two states — and
    // `bg-transparent` at rest, stated rather than left off so the transition has
    // something to leave from. `group` is what lets the marker inside react to a hover on
    // the whole row.
    //
    // `scroll-mt-24` for the reason `HomeSection` carries one: the site's bar is `fixed`
    // and 64px tall, so a bare fragment would drop the question underneath it.
    <div
      id={id}
      className={cx(
        'group scroll-mt-24 rounded-xl transition-colors duration-150 motion-reduce:transition-none',
        isOpen ? 'bg-ink/5' : 'bg-transparent hover:bg-ink/5',
        className,
      )}
    >
      <h3>
        {/* THE PADDING IS ON THE BUTTON, NOT ON THE PLATE, and that is a correctness fix
            rather than a preference. With `p-4` on the plate the trigger only covers the
            line of text, so the 16px of plate around it looks pressable and is not; and
            the obvious repair — `-m-4 p-4` to stretch the button back out — makes the
            16px ABOVE THE ANSWER part of the button, so a click near the first line of an
            open answer collapses the row. Padding the trigger gives the closed plate the
            reference's 16px on every side with the whole of it pressable, and leaves the
            answer's own edges to the answer.

            `text-left` because a `button` centres its text by default and these are
            sentences; `select-none` because a row you press should not be picking up a
            text selection when someone double-clicks it — their call too. The focus ring
            is `ink`, the same neutral one `BUTTON_BASE` uses; see the note up there for
            why it is not `brand`. `rounded-xl` on the button as well so the ring follows
            the plate's corner rather than cutting across it. */}
        <button
          type="button"
          id={triggerId}
          aria-expanded={isOpen}
          aria-controls={panelId}
          onClick={toggle}
          className="flex w-full select-none items-center justify-between gap-5 rounded-xl p-4 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          <span className="font-display text-lg font-semibold leading-relaxed text-ink">
            {title}
          </span>
          {/* The marker TURNS, it does not swap. A plus that becomes a minus is two
              glyphs and a frame where neither is right; a chevron rotating 180° is one
              element the whole way through, and the rotation itself says which direction
              the row is going. Their 20px, their 300ms, their 180°.

              `text-ink/40` at rest and full ink under the row's hover, which is what the
              `group` on the plate is for: the marker is the only thing on the row that
              reacts to the pointer beyond the wash, since darkening the question would
              read as the question changing rather than as the control lighting up.

              `gap-5` above is their `margin-left: 20px`, moved onto the flex row so the
              marker cannot end up flush against a question long enough to fill the line. */}
          <ChevronDown
            aria-hidden
            className={cx(
              'h-5 w-5 shrink-0 text-ink/40 transition-transform duration-300 ease-out group-hover:text-ink motion-reduce:transition-none',
              isOpen ? 'rotate-180' : '',
            )}
          />
        </button>
      </h3>

      <div
        className={cx(
          'grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none',
          isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
        )}
      >
        {/* THE CLIPPER. Not decoration: a grid item in a `0fr` track has zero height but
            its content still paints outside it. */}
        <div className="overflow-hidden">
          <div
            id={panelId}
            role="region"
            aria-labelledby={triggerId}
            // `inert` is a boolean attribute, so its PRESENCE is what counts — hence the
            // empty string when closed and nothing at all when open. It is what pays for
            // keeping the content in the DOM: a closed row is invisible but still laid
            // out, so anything focusable inside would be a tab into nothing. This takes
            // the subtree out of the tab order and out of the accessibility tree, which
            // is what `aria-expanded={false}` on the trigger has already promised.
            //
            // Cast because React 18's `HTMLAttributes` has no `inert` (React 19 added it,
            // and this app is on 18.3). The alternative is a module augmentation for one
            // attribute on one element, which is a bigger footprint than a cast with a
            // comment on it. Drop both the spread and this note when React 19 lands.
            {...((isOpen ? {} : { inert: '' }) as React.HTMLAttributes<HTMLDivElement>)}
            // THE REFERENCE'S 24px BETWEEN QUESTION AND ANSWER, spent in two parts
            // because the trigger above already owns the first 16 of it as its own
            // bottom padding — so `mt-2` is the remaining 8, not a number picked by eye.
            // `px-4 pb-4` are the plate's other three edges, which the trigger cannot
            // provide for a box that is not inside it.
            //
            // ALL OF IT INSIDE THE COLLAPSING TRACK, margin included: put the margin on
            // the track and a closed row keeps 8px of empty space under its question.
            //
            // `pr-9` rather than `pr-4` on the right: the marker's column is 20px plus
            // the trigger's `gap-5`, and matching it lands the answer's right edge on the
            // same vertical as the question's rather than under the chevron.
            className="mt-2 px-4 pb-4 pr-9 text-[15px] font-normal leading-relaxed text-ink"
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Misc ─────────────────────────────────────────────────────────────────────

/**
 * Whole-viewport placeholder shown while a page decides whether you belong on it.
 * `tone` matches the background of the page it stands in for, so resolving the
 * session doesn't flash a different colour.
 */
export function FullPageLoader({ tone = 'app' }: { tone?: 'app' | 'login' }) {
  const { t } = useT()
  return (
    <div
      className={cx(
        'flex min-h-screen items-center justify-center text-muted',
        tone === 'login' ? 'bg-softblue' : 'bg-canvas',
      )}
    >
      {t('common.loading')}
    </div>
  )
}

/**
 * Monospace slash-command eyebrow — the through-line signature across pages. It is
 * typography, never a control, which is why it keeps `brand`.
 *
 * `spacing` is a slot for the same reason the button's padding is: the margin is
 * the one thing a call site needs to change, and it cannot be appended. Keeping it
 * OUT of the base string is what lets the slot be empty — the page that wanted a
 * top margin can have one without inheriting a bottom margin it has to fight.
 */
export function Eyebrow({ spacing = 'mb-3', children }: { spacing?: string; children: React.ReactNode }) {
  return <div className={cx('font-mono text-xs font-medium tracking-tight text-brand', spacing)}>{children}</div>
}
