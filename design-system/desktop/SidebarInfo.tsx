import type { ReactNode } from 'react'
import { TEXT_FACE } from './Text'

/**
 * THE RIGHT COLUMN, WHOLE — and, like the left one, it knows nothing.
 *
 * `Sidebar` is the agent list; this is what stands opposite it: everything the app
 * knows about the agent you are looking at. The account's usage, the ticket, the spec,
 * a card per attached repository, and a way to attach another — in that order, on the
 * app's own ground, in the app's own face.
 *
 * WHAT IT DOES NOT HAVE is a single fact of its own: no store, no translator, no idea
 * what a repository IS. Hand it nodes and it arranges them; hand it none and it draws
 * the empty line. That is the same bargain `Sidebar` strikes, and for the same reason —
 * the marketing site draws this column too, and a drawing that IS the component cannot
 * fall behind it.
 *
 * THE ORDER IS THE MEANING, as it is in `RepositoryCard`: it runs from the account down
 * to the work — what you are spending, what you are on, what you are writing, and the
 * repositories it all lands in. Named slots rather than `children`, so a caller cannot
 * put the spec above the ticket.
 *
 * TWO NESTED BOXES AND BOTH ARE LOAD-BEARING. The outer one animates its width to zero
 * to fold the column away; the inner one is pinned at the full width so the cards do
 * NOT reflow while that happens — text rewrapping through a 300ms collapse is the thing
 * this arrangement exists to prevent. Sliding shut rather than unmounting also keeps the
 * scroll position for when it comes back.
 *
 * THE FACE IS SET HERE, once, for everything inside. It is `Text`'s own — the app used
 * to spell it as an inline `fontFamily` on the scrolling container, which was the one
 * place in the renderer that named a font outside the design system.
 */

export interface SidebarInfoProps {
  /**
   * The column's width in pixels.
   *
   * A NUMBER FROM THE CALLER, not a constant of this file's, and that is the difference
   * from `Sidebar`: the left column is a fixed 230px by decree, this one is DERIVED —
   * the app takes a share of the viewport, floored and capped, and widens it again for
   * a planning agent whose spec needs the room. Which share, and where the bounds are,
   * is policy this column has no way to hold.
   */
  width: number
  /** Folded away: it slides shut by its own width rather than unmounting. */
  collapsed?: boolean
  /**
   * Whether a width change animates.
   *
   * A PROP BECAUSE THE COLUMN CANNOT TELL THE TWO KINDS OF WIDTH CHANGE APART, and they
   * want opposite things. Folding open or shut is a MOVE and should be seen: 300ms. A
   * width that changed because the window was resized, or because the agent switched to
   * one that wants a wider column, is not a move — it is where the column simply is now,
   * and easing into it lags the window edge the reader is dragging.
   *
   * So the caller switches it on around a fold and drops it again once the panel has
   * arrived. Only it knows which just happened.
   */
  animate?: boolean
  /** Nothing is selected. Drawn alone, when every slot below is empty. */
  emptyLabel?: string
  /** What the agent is spending — context, cost, model. */
  usage?: ReactNode
  /** What it is working on. */
  ticket?: ReactNode
  /** The spec being written, or read. */
  spec?: ReactNode
  /** One card per attached repository, already stacked. */
  repositories?: ReactNode
  /** Under the cards: attaching another repository. */
  footer?: ReactNode
  /**
   * THE SPEC FILLS THE COLUMN AND OWNS THE ONLY SCROLL REGION.
   *
   * So this one does not scroll, and there is never a scrollbar inside a scrollbar. It
   * is a layout mode rather than a style: the content box goes to `h-full` and its
   * children are laid out with a gap instead of stacked margins, because one child now
   * has to be allowed to grow.
   */
  fill?: boolean
  /** Margins. Not the width, the ground, or the order of the regions. */
  className?: string
}

export function SidebarInfo({
  width,
  collapsed = false,
  animate = false,
  emptyLabel,
  usage,
  ticket,
  spec,
  repositories,
  footer,
  fill = false,
  className = '',
}: SidebarInfoProps) {
  const empty = !usage && !ticket && !spec && !repositories && !footer

  return (
    <div
      className={`bg-surface-sunken flex flex-col h-full relative overflow-hidden ${
        animate ? 'transition-[width] duration-300 ease-in-out' : ''
      } ${className}`.trim()}
      style={{ width: collapsed ? 0 : width }}
    >
      {/* Pinned at the full width so nothing inside reflows while the box above it
          collapses. See the note on the two boxes. */}
      <div className={`flex flex-col h-full ${TEXT_FACE}`} style={{ width }}>
        <div className={`flex-1 min-h-0 ${fill ? 'overflow-hidden' : 'overflow-y-auto'}`}>
          {empty ? (
            emptyLabel && (
              <div className="px-4 py-8 text-center text-text-secondary text-xs">{emptyLabel}</div>
            )
          ) : (
            /* `gap-4` in fill mode and `space-y-4` otherwise, which is not a style
               choice: a gap needs a flex column, and a flex column is what lets the
               spec take the height left over. Outside that mode the stack is plain
               blocks and margins are all it needs. */
            <div className={fill ? 'p-4 flex flex-col gap-4 h-full min-h-0' : 'p-4 space-y-4'}>
              {usage}
              {ticket}
              {spec}
              {repositories}
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
