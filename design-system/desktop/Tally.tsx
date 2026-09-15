import type { ComponentSize } from './componentSizes'
import { Text, type TextSize } from './Text'

/**
 * Several named counts on one line — "4 inline · 2 conversation · 1 review".
 *
 * WHAT IT IS FOR: a total that has already been said, broken into the parts it is made
 * of. The pull request card's comments row leads with "7 comments" and unfolds this
 * underneath; the number above is the answer most of the time, and this is the
 * follow-up question. So it is a BREAKDOWN and never a headline — a Tally with one
 * entry in it is a sentence that would read better as a sentence.
 *
 * IT IS `DiffStat`'S SIBLING, and the split between them is the same one the app makes
 * everywhere: `DiffStat` is two numbers whose meaning is fixed — added and taken away,
 * green and red, forever — where this is any number of counts whose names the caller
 * brings. Neither is a generalisation of the other; a `DiffStat` built out of this
 * would have lost the two colours that are its whole point.
 *
 * THE NUMBER LEADS, and it carries the ink while its name stays secondary: a column of
 * these is scanned for the figures, and the words are what the figure turns out to
 * mean. `tabular-nums` so a stack of them lines up on the digit rather than on the
 * glyph — the one thing that makes several of these read as a table.
 *
 * IT WRAPS. It unfolds inside a sidebar, where three pairs do not fit across 288px,
 * and a row that wrapped would be one that was never allowed to. The gutters are
 * uneven on purpose — wide between pairs, tight within one — so a wrapped line still
 * reads as pairs rather than as six loose words.
 */

/** One count and what it counts. */
export interface TallyCount {
  /** What is being counted, already translated — this draws words, it never composes them. */
  label: string
  value: number
}

/**
 * The three rungs, which are `ComponentSize`'s and therefore `Label`'s.
 *
 * `sm` IS WHAT IT ALWAYS DREW. The pair used to be a hand-spelled `text-[10px]` with a
 * comment saying `Text` had no rung that small; now it does, and `sm` resolves to it.
 * Nothing on the pull request card moved.
 *
 * THE BOTTOM THREE ARE ONE TYPE SIZE AND THREE GUTTERS. 10px is the floor of the type
 * scale, so below `sm` there is nothing left to shrink but the SPACE between pairs —
 * which is the honest answer for a breakdown squeezed into a narrower column, and
 * better than a rung that silently draws the same thing as the one above it.
 *
 * ONE SIZE FOR BOTH HALVES OF A PAIR, stated once on the row so the number and its
 * name cannot end up at two sizes — they are one phrase. The rung only ever climbs
 * because the thing ABOVE the breakdown climbed: a tally under a 14px header takes
 * `md`, under a heading `lg`. It has no size of its own to choose, which is why there
 * is no rung here that is not one of `Text`'s.
 *
 * THE GUTTERS CLIMB WITH IT. A 14px pair on 12px of gutter reads as two columns that
 * collided; the ratio is what makes a wrapped line still read as pairs.
 */
const SIZES: Record<ComponentSize, { text: TextSize; gutter: string }> = {
  '2xs': { text: '2xs', gutter: 'gap-x-2 gap-y-0.5' },
  xs: { text: '2xs', gutter: 'gap-x-2.5 gap-y-0.5' },
  sm: { text: '2xs', gutter: 'gap-x-3 gap-y-0.5' },
  md: { text: 'xs', gutter: 'gap-x-3.5 gap-y-1' },
  lg: { text: 'sm', gutter: 'gap-x-4 gap-y-1' },
  xl: { text: 'md', gutter: 'gap-x-5 gap-y-1.5' },
  '2xl': { text: 'lg', gutter: 'gap-x-6 gap-y-2' },
}

export interface TallyProps {
  /**
   * The parts, in the order they should be read.
   *
   * ZEROES ARE THE CALLER'S TO DROP. "0 conversation" is a fact about a PR nobody asked
   * for, but WHICH zeroes are worth stating is a question about what the surface is for
   * — a usage breakdown may well want to show an untouched bucket — and this component
   * cannot answer it. It draws what it is given.
   */
  counts: TallyCount[]
  /** Which rung. `sm` is the fold it was built for; see `SIZES`. */
  size?: ComponentSize
  /** Margins and placement. Not the sizes, the gutters or either colour. */
  className?: string
}

export function Tally({ counts, size = 'sm', className = '' }: TallyProps) {
  const rung = SIZES[size]

  return (
    /* The two colours live on the WRAPPERS rather than inside the `Text`s: `Text` owns
       exactly two ink rungs and neither is an alpha, and passing one as a class would
       be a second spelling of a prop it already has — which of them won would come
       down to the order Tailwind emitted them in. `tone="inherit"` is the way out it
       provides, and these are the shades that way out exists for. */
    <div
      className={`flex flex-wrap items-center ${rung.gutter} text-text-secondary/70 ${className}`.trim()}
    >
      {counts.map((count) => (
        <span key={count.label} className="flex items-center gap-1">
          <span className="text-ink/80">
            {/* The number as a STRING: `Text` takes words, and a component that
                accepted a number would be one that accepted an object next. */}
            <Text size={rung.text} tone="inherit" className="tabular-nums">
              {String(count.value)}
            </Text>
          </span>
          <Text size={rung.text} tone="inherit">
            {count.label}
          </Text>
        </span>
      ))}
    </div>
  )
}
