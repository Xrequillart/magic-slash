import type { ReactNode } from 'react'

/**
 * AN OPAQUE BAND PINNED TO THE TOP OF A SCROLLING PANE, whatever it happens to hold.
 *
 * IT WAS `FilterBar` FOR ONE COMMIT, which was the name of its first tenant rather than
 * the name of the thing. The Tasks board's row of pickers and that page's own trail bar —
 * a back link, the ticket's title once the heading has scrolled away, two buttons at the
 * far edge — are not two objects that resemble each other: they are one band with
 * different children, and the three hand-built copies in the app had already drifted on
 * the only part that is theirs, the edge.
 *
 * A CONTAINER, so it takes `children` — `BoardColumn`'s exception and `Card`'s. What
 * goes in a band is entirely the caller's. What is NOT the caller's is everything this
 * file holds.
 *
 * IT HAS TO BE OPAQUE, which is the one non-negotiable property of a pinned band: rows
 * slide under it, and every `surface-*` token in this folder is an ALPHA tint meant to
 * sit on a ground rather than to be one. `bg-bg-secondary` is the modal panel's own
 * colour — anything else reads as a floating toolbar rather than as part of the page.
 *
 * THE HEIGHT IS A NUMBER THE CALLER OWNS, and it is not a style preference. Whatever
 * pins BELOW this bar has to know exactly how tall it is, or the two bands stack at the
 * same offset and one hides the other; a height that fell out of the padding is a height
 * nobody else can read. `BoardColumn.headingTop` is the other half of that arrangement.
 *
 * ── THE EDGE IS A SHADOW AND NOT A HAIRLINE ───────────────────────────────────────
 *
 * It wore `border-b border-line` the moment it pinned. That rule did a real job — cards
 * sliding underneath dissolve into a band with no edge at all — but a 1px line across the
 * full width of a page is the loudest thing this design language has, and it was the last
 * border left on the board once the cards, the columns and the panels dropped theirs.
 *
 * A shadow says the same thing better: the band is ABOVE the page rather than ruled off
 * from it, which is exactly what has become true the moment it pins. And it says nothing
 * at all at rest, where a hairline under a bar with the list flush beneath it is a rule
 * across the page for no reason.
 */

export interface StickyBarProps {
  /**
   * The bar's height in pixels — its own box, not a minimum.
   *
   * Set rather than left to the content for the reason above: it is the offset everything
   * pinned under it has to use. The controls are centred in it.
   */
  height: number
  /**
   * Where it pins, in pixels from the top of the scrolling pane. 0 unless something else
   * is already pinned there — a mode band, a title bar.
   *
   * THE CALLER'S, and it cannot be otherwise: what is stacked above a band is a fact
   * about the page around it, which is the one thing this folder cannot know.
   */
  top?: number
  /**
   * Whether it HAS pinned there, which is the only thing that changes about it: it lifts
   * its shadow.
   *
   * The caller owns the question too. The sentinel that answers it has to sit where the
   * bar STARTS, and a band that has pinned itself somewhere else cannot report the
   * position it came from. There is no CSS for it on the Chromium this app ships —
   * `:stuck` and scroll-state queries both landed after it.
   */
  stuck?: boolean
  children: ReactNode
  /**
   * THE FULL-BLEED TRICK GOES HERE, and it is the one thing a caller must not forget:
   * what scrolls past has to go under an opaque band EDGE TO EDGE, so a bar inside a page
   * with a 24px inset needs `-mx-6 px-6` to reach past it. The number is the page's own
   * padding, which is why it cannot live in here.
   *
   * Margins and bleed only. Not the ground, the height or the shadow.
   */
  className?: string
}

export function StickyBar({ height, top = 0, stuck = false, children, className = '' }: StickyBarProps) {
  return (
    // `z-20` — above a `BoardColumn`'s headings at `z-10`, which pin UNDER this one and
    // must slide beneath it rather than over it. A mode band that pins above this takes
    // `z-30` at its own call site; that one is the page's, because only the page knows it
    // is there at all.
    <div
      className={`sticky z-20 flex items-center gap-2 min-w-0 bg-bg-secondary transition-shadow duration-200 ${
        stuck ? 'shadow-md' : ''
      } ${className}`.trim()}
      style={{ height, top }}
    >
      {children}
    </div>
  )
}
