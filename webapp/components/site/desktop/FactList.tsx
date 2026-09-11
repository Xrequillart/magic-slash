'use client'

import type { DesktopFact } from '@/lib/desktopPage'
import { titleOf } from '@/lib/features'
import { useT } from '@/lib/i18n/useLanguage'
import { BAND_LEAD } from '../home/Shell'
import { Reveal } from '../Reveal'
import { DESKTOP_ICONS } from './icons'

/**
 * THE PAGE'S LAST TWO BANDS, as one list: a glyph, a headline beside it, a paragraph
 * under the pair, two to a line from `md`.
 *
 * IT WAS THE "AROUND THE WINDOW" BAND'S MARKUP AND NOTHING ELSE'S. The guardrails below
 * it were a `FeatureLegend` — the bordered two-by-two `/features` uses for the permission
 * modes, with a 16px glyph on an `accent` tile and copy at `text-sm`. The product owner
 * asked for the two to match ("le même style que le block Conçue pour ne pas se mettre en
 * travers, un gros icon et le texte plus gros"), so the legend is gone from that band and
 * this component is what both of them render.
 *
 * WHICH IS ALSO WHY IT IS A COMPONENT AND NOT A COPY. Two bands drawing the same list
 * from two blocks of JSX is the arrangement that drifts: one gains a size, the other does
 * not, and nothing on screen says which was intended. `lib/desktopPage.ts` made the same
 * move on the data side — one `DesktopFact` where there were two row shapes.
 *
 * TWO TONES, AND THE LIGHT ONE IS A MIRROR OF THE DARK. `onink-body` is white at 60% on
 * the `ink` sheet, so the paragraph on white is `muted`, the value every light band on
 * this site sets its body copy at. Both come from `BAND_LEAD` in `home/Shell`, which is
 * ALSO what the subtitle over this list is set from now: the line introducing the facts
 * used to be a step smaller than the facts, and it is the same size as them here. The
 * glyph and the headline are `ink` — full black, as asked, and the same weight the white
 * version carries against its own ground.
 *
 * `md:col-span-2` ON A LAST ROW THAT WOULD BE ALONE. Five facts in two columns leave the
 * fifth by itself with an empty half beside it, which reads as a row that failed to
 * render rather than as a list of five. Spanning it makes it the band's closing line, and
 * the paragraph keeps its `max-w-lg` so the measure does not stretch with the box. An
 * even list never hits this branch.
 *
 * THE ENTRANCE IS PER FACT, as it was in the dark band: `Reveal` is the grid item — which
 * is why the span goes on it and not on the `li` — and `revealFrom` is where this list
 * starts in the band's queue, the heading having taken the numbers before it.
 */
export function DesktopFactList({
  facts,
  tone,
  revealFrom = 2,
  className,
}: {
  facts: readonly DesktopFact[]
  tone: 'dark' | 'light'
  revealFrom?: number
  className?: string
}) {
  const { t } = useT()
  const dark = tone === 'dark'
  const odd = facts.length % 2 === 1

  return (
    // `gap-x-16` between the columns and `gap-y-14` between the rows, wider than the
    // paragraph's own line-height, so the facts read as facts rather than as one column
    // of text.
    <ul className={`grid gap-x-16 gap-y-14 md:grid-cols-2 ${className ?? ''}`}>
      {facts.map((fact, index) => {
        const Icon = DESKTOP_ICONS[fact.icon]
        const last = odd && index === facts.length - 1

        return (
          <Reveal
            key={fact.id}
            order={revealFrom + index}
            className={last ? 'md:col-span-2' : undefined}
          >
            <li className="flex flex-col">
              <div className="flex items-center gap-3.5">
                <Icon
                  className={`h-7 w-7 shrink-0 ${dark ? 'text-white' : 'text-ink'}`}
                  strokeWidth={1.75}
                  aria-hidden
                />
                <h3
                  className={`font-display text-2xl font-bold leading-snug ${dark ? 'text-white' : 'text-ink'}`}
                >
                  {titleOf(fact.title, t)}
                </h3>
              </div>
              <p className={`mt-4 max-w-lg ${dark ? BAND_LEAD.onDark : BAND_LEAD.onLight}`}>
                {t(fact.description)}
              </p>
            </li>
          </Reveal>
        )
      })}
    </ul>
  )
}
