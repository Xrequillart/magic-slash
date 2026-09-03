'use client'

import Link from 'next/link'
import { ArrowRight, type LucideIcon } from 'lucide-react'
import { Card } from '@/components/ui'

/**
 * One tile in the homepage's features grid: an icon, a title, one line, and a link to
 * where the thing is written up.
 *
 * THE WHOLE CARD IS THE LINK, not a "learn more" the reader has to aim at. A `Link`
 * wrapping a `Card` rather than a `Card` containing a `Link`: the second shape gives a
 * card-sized hover target that does nothing, which is the tile pattern's classic bug.
 *
 * WHERE THE ELEVATION COMES FROM. `Card` carries its shadow through its `shadow` SLOT,
 * and this passes nothing — so it keeps `shadow-card`, the scale's quietest rung. The
 * hover lift is `shadow-button-hover`, and it is applied through the slot too
 * (`hover:` is part of the class, so the slot is where it has to go): a
 * `className="hover:shadow-button-hover"` would be a SECOND shadow utility on the same
 * element, and shadows do not compose — which of the two won would be decided by
 * Tailwind sorting the class names. See the note on the scale in `tailwind.config.ts`.
 *
 * THE BLUE IN HERE IS `accent`, NOT `brand`. Both are blues one step apart, and the
 * split between them is the whole reason either means anything: `brand` (#393BFF) is the
 * FILL OF THE PRIMARY BUTTON and nothing else on this page, `accent` (#6366f1) is every
 * non-CTA use — tints, selected states, focus rings, prose links. See the long note on
 * the two tokens in `tailwind.config.ts`.
 *
 * Both uses below are on the non-CTA side of that line, and neither is a close call.
 * The icon tile is DECORATION above the copy — the same shape as the `Modal` header
 * icon — and the "learn more" row is a LABEL for a link, not a control: the affordance
 * of this tile is the whole card being a `Link`, which is why the row is a `<span>` and
 * not a button. Wearing `brand` they read as two calls to action per tile, six of them
 * in the grid, competing with the one blue button the page actually has.
 *
 * `className` only ever carries additive layout — that is the rule for every component
 * in `ui.tsx`, and the reason is in that file's header.
 */
export function FeatureCard({
  icon: Icon,
  title,
  description,
  href,
  cta,
}: {
  icon: LucideIcon
  title: string
  description: string
  /**
   * An existing destination, and that is a constraint rather than a preference: a
   * documentation anchor (`/documentation#hooks`) or a section of this page
   * (`#commands`). `PUBLIC_PATHS` in `lib/hostRouting.ts` is `/`, `/story` and
   * `/documentation` — anything else 307s the reader to the app host.
   */
  href: string
  /** The link's wording. One shared string for the grid, passed in so it stays i18n. */
  cta: string
}) {
  return (
    <Link href={href} className="group block">
      <Card
        shadow="shadow-card group-hover:shadow-button-hover"
        className="flex h-full flex-col p-6 transition-shadow"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-button bg-accent/10">
          <Icon className="h-5 w-5 text-accent" aria-hidden />
        </span>
        <h3 className="mt-4 font-display text-base font-bold text-ink">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted">{description}</p>
        <span className="mt-4 inline-flex items-center gap-1.5 font-display text-sm font-medium text-accent">
          {cta}
          <ArrowRight
            className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
            aria-hidden
          />
        </span>
      </Card>
    </Link>
  )
}
