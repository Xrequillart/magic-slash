import type { KeyboardEvent, ReactNode } from 'react'

/**
 * A ROW OF A LIST YOU SCAN, and the group of them that reads as one object.
 *
 * Two components and one idea: the rows are FLUSH. No gap between them, a hairline where
 * they meet, and a radius only where the stack begins and ends — so a list of eight reads
 * as one panel divided into eight, rather than as eight cards that happen to be near each
 * other. The Plans list drew it that way first; the repositories list drew eight separate
 * plates; and two lists of rows in one app, reached from the same tab strip, had two
 * answers to what a list of rows looks like.
 *
 * WHAT IT OWNS is exactly the chrome that has to be identical for that to hold: the
 * ground, the hover, the rule between rows, the radius at the two ends, the focus ring
 * and the padding. What it does NOT own is a single fact about what is in the row —
 * `PlanItem` and `RepositoryItem` both stand on this and share nothing else.
 *
 * THE RADIUS IS ON THE ROW AND NOT ON THE GROUP, which is worth stating because the
 * obvious spelling is the other one: `rounded-xl overflow-hidden` on the container clips
 * the corners and the rows can stay square. It is how the Plans list did it, and the
 * comment there had already noticed the cost — `overflow-hidden` clips a focus ring too,
 * so the ring had to be drawn INSET to survive, which is a weaker ring on the one
 * interaction that has nothing else to show for itself. `first:rounded-t-xl
 * last:rounded-b-xl` puts the shape on the rows, and then nothing has to be clipped.
 *
 * A CONSEQUENCE WORTH KNOWING: `:first-child` and `:last-child` count ELEMENTS, not
 * `Item`s. Anything else rendered inside the group takes one of the two ends — which is
 * why `ItemNote` exists rather than a caller reaching for a `<p>`.
 */

/** The ground, the rule and the two radii. One string, because one of them drifting is the bug. */
const ROW =
  'w-full text-left min-w-0 px-4 py-3 bg-surface-subtle border-t border-line-subtle ' +
  'first:border-t-0 first:rounded-t-xl last:rounded-b-xl transition-colors'

/**
 * WHAT THE POINTER DOES, and it is a step of ground rather than a second colour.
 *
 * `surface-strong` and not `surface-subtle`'s own next step down the scale: the rows sit
 * ON `surface-subtle`, so a hover that tinted to it would be no hover at all. This is the
 * app's most common hover ground, so pointing at a row lifts it here the way it does
 * everywhere else.
 *
 * THE FOCUS RING REPEATS THE HOVER'S GROUND deliberately. A ring alone on a row this wide
 * is a hairline around something the eye has to hunt for; the ground is what says WHICH
 * row, and the ring is what says it is the keyboard's. `focus-visible` rather than
 * `focus`, so a pointer click does not leave a ring behind that reads as a selection the
 * list does not have.
 */
const REACTIVE =
  'cursor-pointer hover:bg-surface-strong focus:outline-none focus-visible:bg-surface-strong ' +
  'focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-accent'

/**
 * How the row's own columns line up, and there are exactly two answers.
 *
 * `center` is a row of ONE line — a name, some chips, a chevron — where anything else
 * leaves the marks floating against the top of the box. `start` is a row of THREE, where
 * the status and the date at the right edge belong beside the TITLE and not beside the
 * middle of a stack that grew a second line of prose under it.
 */
const ALIGN = {
  center: 'items-center',
  start: 'items-start',
} as const

export type ItemAlign = keyof typeof ALIGN

interface ItemBase {
  /** The row's own content. `Card`'s arrangement: this draws a ground and holds a shape. */
  children: ReactNode
  /** `center` by default — see `ALIGN`. */
  align?: ItemAlign
  /** The gutter between the row's own columns. `gap-3` unless the caller says otherwise. */
  className?: string
}

/**
 * A ROW GOES SOMEWHERE, and the two ways of saying so are not interchangeable.
 *
 * `href` renders an `<a>`, which is what a row of a list navigating to a page IS: it
 * answers the middle button, it can be copied, and the keyboard half is the browser's.
 * `onClick` renders a `role="button"` div, for a row that opens something IN PLACE —
 * a modal, a detail pane — where there is no address to hand out.
 *
 * WHY NOT A `<button>` for the second: the row's content is stacked block-level boxes,
 * and a `<button>` may only contain phrasing content. Wrapping divs in one is invalid
 * markup, and the browser's fix-ups for it are not something a layout should rest on. The
 * cost is that the keyboard half becomes ours — see `onKeyDown` below — and it is paid
 * here, once, rather than by every list that wanted a row it could press.
 *
 * A UNION AND NOT TWO OPTIONAL PROPS, `Button`'s trick for its own pair: a row with both
 * is a link that also handles the click itself, which is two navigations racing, and a
 * row with neither is a plate that looks pressable and is not.
 */
export type ItemProps = ItemBase &
  (
    | { href: string; onClick?: never }
    | { onClick: () => void; href?: never }
  )

export function Item({ children, align = 'center', href, onClick, className = '' }: ItemProps) {
  const box = `group flex gap-3 ${ALIGN[align]} ${ROW} ${REACTIVE} ${className}`.trim()

  if (href !== undefined) {
    return (
      <a href={href} className={box}>
        {children}
      </a>
    )
  }

  /**
   * The two keys a `<button>` would have answered on its own.
   *
   * `preventDefault` because Space scrolls the pane otherwise, and these lists live
   * inside the one scrolling element of the page they are on.
   */
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    onClick?.()
  }

  return (
    <div role="button" tabIndex={0} onClick={onClick} onKeyDown={onKeyDown} className={box}>
      {children}
    </div>
  )
}

/**
 * THE STACK. It holds the rows and nothing else — no ground, no border, no padding.
 *
 * Every one of those is on the rows, which is what lets the first and the last carry the
 * shape. What is left here is the column and a place for the caller's margins, and that
 * is deliberately almost nothing: a group that painted a ground of its own would be a
 * second plate under a row that already has one, visible in the 1px the hairlines leave.
 *
 * NOT A `role="list"`. The rows are links and buttons, and an ARIA list whose items are
 * not `listitem`s is a list that announces the wrong number of things. A stack of
 * controls is what this is, and that is what it says.
 */
export function ItemGroup({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`flex flex-col ${className}`.trim()}>{children}</div>
}

/**
 * A SENTENCE ABOUT THE LIST, as its own last row.
 *
 * The Plans list needs one — a read that came back at its cap says so — and the note has
 * to be INSIDE the group: the sentence is about this list, and a line floating under the
 * stack would read as being about the page. Being inside means it takes the group's last
 * end, which is the whole reason it cannot be a bare `<p>` the caller writes: a `<p>`
 * there is the `:last-child`, so it would take the bottom radius while wearing no ground
 * and leave the last real row square.
 *
 * INERT — no hover, no pointer, nothing in the tab order. It is not a row you can open.
 */
export function ItemNote({ children, className = '' }: { children: string; className?: string }) {
  return (
    <p className={`${ROW} text-xs text-text-secondary/60 ${className}`.trim()}>{children}</p>
  )
}
