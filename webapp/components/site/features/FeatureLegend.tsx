'use client'

import type { ReactNode } from 'react'
import type { MessageKey } from '@/lib/i18n'
import { useT } from '@/lib/i18n/useLanguage'

/**
 * The grid of notes that sits UNDER a drawing: a mark, a short name, and a sentence,
 * two to a row.
 *
 * WHAT IT IS FOR, which is narrower than "a grid of features". It is a LEGEND — it
 * belongs to the picture above it and reads as an annotation of it, not as a list of
 * capabilities standing on its own. The Agents drawing uses it for the four states an
 * agent can be in; the Tasks drawing uses it for the four things its screen does that a
 * still image cannot show. In both cases a reader has just looked at a screen and wants
 * the parts of it named.
 *
 * ONE BORDERED BLOCK, NO GUTTERS, and that is the whole reason this is a component
 * rather than markup copied twice. Four cards with gaps between them read as four
 * separate claims; one box with rules through it reads as one closed set, which is what
 * a legend is. The rule logic is the fiddly part — every cell but the first row carries a
 * top border, every left-hand cell carries a right border, and the second cell has to
 * have its top border removed again once the grid goes to two columns — and it is
 * exactly the kind of thing that gets fixed in one copy and not the other.
 *
 * `mt-8` AND NOT LESS. The box's own border is a hairline on white, so at a smaller gap
 * the eye reads the plate above and then the text, with nothing between them — the legend
 * looked welded to the bottom of the drawing rather than placed under it.
 *
 * `mark` IS A SLOT rather than an icon name, because the two callers put different things
 * in it: one draws a lucide glyph, the other draws the app's own animated state badges.
 * The tile around it belongs to the caller too — a state's tint is part of what the
 * legend is explaining.
 */
export interface LegendItem {
  /** React key, and nothing else. */
  id: string
  /** Whatever goes in the 32px slot: a glyph on a tinted tile, usually. */
  mark: ReactNode
  name: MessageKey
  description: MessageKey
}

export function FeatureLegend({ items }: { items: readonly LegendItem[] }) {
  const { t } = useT()

  return (
    <div className="mt-8 overflow-hidden rounded-2xl border border-hairline sm:grid sm:grid-cols-2">
      {items.map((item, index) => (
        <div
          key={item.id}
          className={`border-hairline p-6 ${index > 0 ? 'border-t' : ''} ${
            index % 2 === 0 ? 'sm:border-r' : ''
          } ${index === 1 ? 'sm:border-t-0' : ''}`}
        >
          <div className="flex items-center gap-3">
            {item.mark}
            <h4 className="font-display text-base font-bold text-ink">{t(item.name)}</h4>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-ink/60">{t(item.description)}</p>
        </div>
      ))}
    </div>
  )
}

/** The tile a legend's mark usually sits on — 32px, rounded, in the mark's own tint. */
export function LegendTile({ tone, children }: { tone: string; children: ReactNode }) {
  return (
    <span
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${tone}`}
    >
      {children}
    </span>
  )
}
