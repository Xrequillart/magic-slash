'use client'

import { Eyebrow } from '@/components/ui'
import type { MessageKey } from '@/lib/i18n'
import { RichText } from '../RichText'

/**
 * The two pieces of structure every band on the homepage needs: the band itself, and
 * the heading at the top of it.
 *
 * WHY NOT `Section` FROM `ui.tsx`. That one is a SURFACE — a white `rounded-2xl` card
 * with `shadow-card`, a `text-lg` title and a 24px pad, which is what a settings group
 * in the signed-in app looks like. A marketing band is the opposite shape: full-bleed,
 * no fill of its own, and a headline three times that size. Wrapping the homepage in
 * `Section` would have put six white cards on a white page, so the two do not share a
 * component. What they DO share is where the values come from: nothing below invents a
 * colour, a radius or a shadow, and the heading's eyebrow is `ui.tsx`'s own `Eyebrow`.
 *
 * The vertical rhythm is the design brief's "breathe with space rather than with
 * borders": `py-20 md:py-28` on each band puts ~10rem of nothing between two of them,
 * ~14rem from `md` up, and not a rule anywhere.
 */

/**
 * The headline size every band on the page uses. Exported because the closing CTA needs
 * the same type at a different alignment and width, and `HomeHeading` cannot be reused
 * there: its `max-w-2xl` would argue with the CTA's own `max-w-md` and `text-center`,
 * which is exactly the conflict `components/ui.tsx`'s header warns about. One constant
 * is the shape that lets the two agree without one dressing the other.
 *
 * TWO INKS, AND IT HAS TO BE A SLOT rather than a `text-white` appended by the caller.
 * The closing band is on `bg-ink` now, and a `className="text-white"` over a recipe that
 * already says `text-ink` is a CONFLICTING utility — the same alphabetical race as the
 * hero's old `pt-32`, and this one would be decided by `.text-ink` versus `.text-white`
 * in the emitted sheet. The colour therefore leaves the base and each rung states it.
 */
const BAND_TITLE_TYPE = 'font-display text-3xl font-black leading-tight md:text-4xl'

/**
 * A WORD STRUCK THROUGH inside a headline — the `<em>` in `site.desktop.title` and in
 * `site.builtFor.title`, which are the two headlines on the site that name a thing in
 * order to correct it ("not remembering", "not only developers"). Both are rendered by
 * `RichText`, so the tag has to be styled from the outside; this is the recipe.
 *
 * `<em>` AND NOT `<s>`: `lib/i18n.test.ts` allows four inline tags in the site copy and
 * `<em>` is the one with no other job in a headline. It is stripped of its italics here.
 *
 * THE BAR IS AN `::after`, NOT `line-through`, and that is a correctness point rather
 * than a stylistic one: `text-decoration` has no interpolable value between "none" and
 * "line-through", so the strike could not be animated at all. A bar that GROWS from the
 * left reads as the pen moving; one that fades in has already crossed the word before
 * you see it. `animate-strike-in` in `tailwind.config.ts` sits beside the reveals and
 * waits out the headline's own entrance before it draws.
 */
export const STRUCK_WORD = [
  '[&_em]:relative [&_em]:not-italic [&_em]:text-muted',
  "[&_em]:after:absolute [&_em]:after:inset-x-0 [&_em]:after:top-[54%] [&_em]:after:h-[0.09em] [&_em]:after:origin-left [&_em]:after:rounded-sm [&_em]:after:bg-brand [&_em]:after:content-['']",
  '[&_em]:after:animate-strike-in [&_em]:after:motion-reduce:animate-none',
].join(' ')

export const BAND_TITLE = {
  /** Every band on the `canvas` page. */
  onLight: `${BAND_TITLE_TYPE} text-ink`,
  /** The closing band, which is a dark full-bleed sheet. */
  onDark: `${BAND_TITLE_TYPE} text-white`,
} as const

/**
 * THE PARAGRAPH UNDER A BAND'S HEADLINE, WHERE THE BAND ALSO CARRIES KEY POINTS —
 * `desktop/FactList`'s glyph-headline-paragraph rows, which is what `/desktop`'s two
 * closing bands and `/workflow`'s day band are built from.
 *
 * ONE SIZE, BECAUSE THE PRODUCT OWNER ASKED FOR ONE ("j'aimerai que le subtitle ait une
 * font-size aussi grande que les points clés"). The subtitle was `text-base` and the
 * paragraph inside every fact was `text-lg`, so the line that introduces the list read
 * as smaller than the list it introduces — a hierarchy the wrong way up. Both now come
 * from this recipe, which is the point of it being a recipe and not two literals: the
 * next change to the size lands on the pair or on neither.
 *
 * TWO INKS FOR THE SAME REASON `BAND_TITLE` HAS TWO. These bands come in a light tone and
 * a dark one, `muted` on white mirroring `onink-body` on `ink`, and a caller appending a
 * colour over a recipe that already states one is the conflicting-utility race the file
 * avoids everywhere else.
 */
const BAND_LEAD_TYPE = 'text-lg leading-relaxed'

export const BAND_LEAD = {
  /** A band on the white body. */
  onLight: `${BAND_LEAD_TYPE} text-muted`,
  /** A full-bleed `bg-ink` band. */
  onDark: `${BAND_LEAD_TYPE} text-onink-body`,
} as const

/**
 * `HomeHeading`'s subtitle, as a SLOT — the same shape `SECTION_PADDING` below has, and
 * for the same reason: `lead` REPLACES `text-base` rather than racing it in the emitted
 * sheet. `base` is what every band that carries a mockup keeps; `lead` is what the bands
 * with key points under them pass, so the introduction is set at the size of what it
 * introduces.
 */
const SUBTITLE_TYPE = {
  base: 'text-base leading-relaxed',
  lead: BAND_LEAD_TYPE,
} as const

/**
 * The band's vertical padding, as a SLOT rather than something a caller appends —
 * exactly the shape `BUTTON_SIZES` has in `components/ui.tsx`, and for the same reason.
 *
 * There is no `clsx` and no `tailwind-merge` here, so a `className` is APPENDED to the
 * recipe and Tailwind picks the winner by stylesheet order, which it derives from the
 * class NAME. The hero used to pass `pt-32 md:pt-40` through `className` against this
 * base's `py-20 md:py-28`: a conflicting utility, not additive layout, and it rendered
 * correctly only because `.pt-32` happens to be emitted after `.py-20`. A slot
 * REPLACES the value instead of racing it, so the padding is decided here rather than
 * alphabetically.
 *
 * Two options, because two are what the page has. Anything else a band needs from
 * `className` — the hero's own wash, for instance — is additive and still belongs there.
 */
const SECTION_PADDING = {
  /** Every band. ~10rem of nothing between two of them, ~14rem from `md` up. */
  band: 'py-20 md:py-28',
  /**
   * A page's FIRST band, whatever the page. The bar is `fixed` and flush at `h-16`, so
   * whatever opens a page owes it ~7rem before its own first line. The BOTTOM is a
   * band's bottom — only the top is taller — which is what the old `pt-32 md:pt-40`
   * over `py-20 md:py-28` amounted to once the cascade had settled, so this is the same
   * pixels by intent.
   *
   * Named `hero` because the homepage's hero was the only caller when it was extracted.
   * `/features` opens on it too now, and the name stayed rather than churning the two
   * call sites: what the slot means is "the band under the bar", which is what a hero is.
   */
  hero: 'pt-32 pb-20 md:pt-40 md:pb-28',
  /**
   * The band DIRECTLY UNDER a hero, when the hero is its own band. A hero's bottom is
   * already a band's bottom (5rem, 7rem from `md`), so the follower owes it only the
   * difference between that and the air a page wants between its opening and its first
   * content — `/features` puts 7rem (10rem from `md`) there, and this is the remainder.
   * Its bottom is a band's bottom.
   */
  follow: 'pt-8 pb-20 md:pt-12 md:pb-28',
  /**
   * The closing band. Taller than a band on both sides because it is not a band in a
   * stack — it is a dark sheet the page ends on, with one icon, one headline and one
   * button in the middle of it, and that composition needs room above and below to read
   * as deliberate rather than as a band that happens to be dark.
   */
  tall: 'py-28 md:py-36',
} as const

/**
 * One band. `id` is an anchor target — the header, the footer and the features grid all
 * link into the page — which is why it comes with `scroll-mt-24`: the bar is `fixed`, so
 * a bare `#commands` would drop the section's first line underneath it.
 */
export function HomeSection({
  id,
  padding = 'band',
  backdrop,
  className,
  children,
}: {
  id?: string
  /** The vertical rhythm. See `SECTION_PADDING` for why it is not a `className`. */
  padding?: keyof typeof SECTION_PADDING
  /**
   * A FULL-BLEED layer behind the content, and the only way to get one.
   *
   * `children` land inside the `max-w-site` column, which is the whole point of this
   * component — but a decorative wash has to span the viewport, not the column, or it
   * reads as a 1100px rectangle with two hard edges. So a backdrop is rendered as a
   * direct child of the `section` instead, before the column, and the section turns
   * `relative` and clips itself only when one is passed: `overflow-hidden` on every band
   * would silently crop anything a future band wants to let hang out.
   *
   * The caller owns the layer's own positioning (`absolute inset-0`) and MUST mark it
   * `aria-hidden` — it is decoration, and there is nothing in it to announce.
   */
  backdrop?: React.ReactNode
  /** ADDITIVE layout only — a background, a gradient. Never a padding or a width. */
  className?: string
  children: React.ReactNode
}) {
  return (
    <section
      id={id}
      className={[
        'scroll-mt-24 px-6',
        SECTION_PADDING[padding],
        backdrop ? 'relative overflow-hidden' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {backdrop}
      <div className="relative mx-auto max-w-site">{children}</div>
    </section>
  )
}

/**
 * A band's heading: the monospace eyebrow, the display headline, one line under it.
 *
 * The headline is an `h2` in every band — the page has one `h1`, in the hero — so the
 * outline stays honest without the caller having to remember which level it is on.
 *
 * IT WENT ONE ROUND WITH NOTHING RENDERING IT, and that is why it is still here. Its one
 * consumer was the "how it works" band, cut from the homepage by the product owner — and
 * it was kept on the argument that this is the file's shared vocabulary rather than a
 * retired band's component, so the next band on the page would reach for it instead of
 * restating these four classes. `WorkflowSection` is that band, and it needed no change
 * here: `max-w-2xl`, left-aligned, an `h2` at the page's own headline size is exactly
 * what a heading with a button beside it wants.
 *
 * The two bands that do NOT use it both have a reason. The closing band draws on
 * `BAND_TITLE` because it needs the dark ink and its own width (see above), and
 * `desktop/DesktopHero` writes its headline out because its whole composition is a
 * centred axis — passing `text-center` into this would be a caller dressing a component.
 * (That was a band on this page until it moved to `/desktop`; the band that replaced it,
 * `AppSection`, is a split and uses `HomeHeading` like the rest.) See
 * `app/(marketing)/page.tsx` for the band that went.
 */
export function HomeHeading({
  eyebrow,
  title,
  titleKey,
  subtitle,
  subtitleSize = 'base',
}: {
  eyebrow?: string
  subtitle?: string
  /**
   * `lead` when the band's content under this heading is a list of key points rather
   * than a mockup — see `SUBTITLE_TYPE` above.
   */
  subtitleSize?: keyof typeof SUBTITLE_TYPE
} & (
  | { title: string; titleKey?: never }
  /**
   * THE MARKUP-BEARING HALF. A band whose headline carries an `<em>` cannot hand this
   * component a translated string — the tag would print as text — so it passes the KEY
   * and `RichText` renders it here, wearing `STRUCK_WORD` on top of the same type.
   * Exactly one of the two is required, which the union is what enforces: a caller
   * passing both, or neither, does not compile.
   */
  | { titleKey: MessageKey; title?: never }
)) {
  return (
    <div className="max-w-2xl">
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      {titleKey ? (
        <RichText k={titleKey} as="h2" className={`${BAND_TITLE.onLight} ${STRUCK_WORD}`} />
      ) : (
        <h2 className={BAND_TITLE.onLight}>{title}</h2>
      )}
      {subtitle && <p className={`mt-4 ${SUBTITLE_TYPE[subtitleSize]} text-muted`}>{subtitle}</p>}
    </div>
  )
}
