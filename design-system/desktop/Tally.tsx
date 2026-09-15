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
  /** Margins and placement. Not the sizes, the gutters or either colour. */
  className?: string
}

export function Tally({ counts, className = '' }: TallyProps) {
  return (
    /* `text-[10px]` rather than a `Text` rung, for `PullRequestCard`'s reason: the
       smallest thing on the scale is 12px, and this is detail unfolded UNDER a 12px
       label that already said the total. Stated once on the row so both halves of every
       pair inherit it — the number and its name are one phrase and must not be able to
       end up at two sizes. */
    <div
      className={`flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] text-text-secondary/70 ${className}`.trim()}
    >
      {counts.map((count) => (
        <span key={count.label} className="flex items-center gap-1">
          <span className="text-ink/80 font-medium tabular-nums">{count.value}</span>
          {count.label}
        </span>
      ))}
    </div>
  )
}
