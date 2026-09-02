'use client'

import type { LucideIcon } from 'lucide-react'
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
