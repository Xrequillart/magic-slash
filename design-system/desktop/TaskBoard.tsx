import { useEffect, useState, type RefObject } from 'react'
import { BoardColumn, type BoardColumnTone } from './BoardColumn'
import { EmptyState, type EmptyStateProps } from './EmptyState'
import { FilterBar, FILTER_BAR_HEIGHT, type FilterBarProps } from './FilterBar'
import { NoticeCard, type NoticeCardProps } from './NoticeCard'
import { SectionHeader, type SectionHeaderProps } from './SectionHeader'
import { TicketCard, type TicketCardProps } from './TicketCard'
import type { IconComponent } from './types'

/**
 * A BOARD OF TICKETS AND THE PAGE AROUND IT: a heading, a pinned row of controls, the
 * bands that say a read did not come back, and columns of equal width holding stacks of
 * cards — or one sentence in their place when there is nothing to draw.
 *
 * ── WHY THE FOUR OF THEM ARE ONE COMPONENT ────────────────────────────────────────
 *
 * Because they cannot be assembled correctly from outside. The heading, the bar and the
 * columns are three bands stacked in one scrolling pane, and TWO OF THEM PIN: the bar at
 * the top, the column headings directly under it. That arrangement is arithmetic somebody
 * has to do — the columns pin at whatever is above the pane PLUS the bar's own height —
 * and every caller that did it was one refactor away from two opaque bands at the same
 * offset, which is one band hiding the other. It is done here now, once, and `top` is the
 * only number a caller owes: what is pinned above the whole pane.
 *
 * The same goes for the empty state. It replaces the COLUMNS and not the page: the heading
 * still says what the section is and the bar still holds the search that emptied it, so a
 * caller that swapped the whole component for an `EmptyState` would take away the one
 * control able to undo the narrowing. `empty` is drawn in the grid's place for that reason.
 *
 * ── WHAT IT HOLDS NOTHING OF ──────────────────────────────────────────────────────
 *
 * Jira, GitHub, sprints, epics, agents. Which columns there are, what puts a ticket in one,
 * which of them is the one that needs a person, what the controls narrow: all of it arrives
 * as data. The desktop's Tasks page has that vocabulary and the public site's picture of
 * the same screen has its own copy, and the two render this one file.
 *
 * ── DRIVEN BY DATA AND NOT BY CHILDREN ────────────────────────────────────────────
 *
 * Unlike `BoardColumn` and `Card`. A column takes children because what goes in one is
 * genuinely open; a board's cards are tickets, which is what `TicketCard` is for, and a
 * board that took nodes would be a grid with a sticky heading rather than a board.
 * `TicketCardProps` is spread verbatim, so everything that component can draw — the
 * priority mark, the agent tint, the copy button, the launch — is reachable from here
 * without this file naming any of it. `heading`, `filters`, `notices` and `empty` are the
 * same bargain with `SectionHeader`, `FilterBar`, `NoticeCard` and `EmptyState`.
 *
 * ── THE PAGE SCROLLS, NOT THE COLUMNS ─────────────────────────────────────────────
 *
 * Columns of their own natural height in a grid aligned to the top need no height of their
 * own, which is what lets a board live inside a pane it does not measure. `items-start` is
 * what buys it: without it the grid stretches every column to the tallest and the short
 * ones end in a field of empty column-coloured space.
 */

/** One ticket on the board. `id` is React's key; everything else is `TicketCard`'s. */
export interface TaskBoardCard extends TicketCardProps {
  /** Stable across renders and unique across the whole board, not across its column. */
  id: string
}

export interface TaskBoardColumn {
  /** Stable across renders — 'blocked', 'done'. Not an index. */
  id: string
  /** What the column is called, already translated. */
  title: string
  icon?: IconComponent
  tone?: BoardColumnTone
  /**
   * How many are in it, ALREADY WORDED — see `BoardColumn.count`. Usually `cards.length`,
   * and deliberately not read off it here: a column whose read stopped at a budget holds
   * fewer cards than it has tickets, and only the caller knows.
   */
  count: string | number
  countTitle?: string
  /** The sentence for a column with nothing in it, already translated. */
  empty?: string
  cards: TaskBoardCard[]
}

/** One band between the controls and the columns. `id` is React's key. */
export interface TaskBoardNotice extends NoticeCardProps {
  id: string
}

export interface TaskBoardProps {
  /**
   * What the section is, how many are in it, and what can be done to the lot.
   *
   * `spacing` is forced to `none`: this component spaces its own bands with a `gap`, and a
   * heading that also carried a bottom margin would be spacing itself twice.
   */
  heading?: Omit<SectionHeaderProps, 'spacing'>
  /**
   * The pinned row of controls. `top` and `paneRef` are supplied from this component's
   * own — a bar cannot be told to pin somewhere other than where the board expects it,
   * because the columns pin directly underneath.
   */
  filters?: Omit<FilterBarProps, 'top' | 'paneRef'>
  /**
   * Bands between the controls and the columns: a repository whose read did not come back,
   * a tracker that is not connected.
   *
   * BETWEEN AND NOT ABOVE, which is where a fact about the CONTENTS belongs — the heading
   * names the section and the bar narrows it, and both are true whatever the read did.
   */
  notices?: TaskBoardNotice[]
  /**
   * One sentence INSTEAD OF THE COLUMNS. See the header: it replaces the grid, never the
   * page, so the control that emptied the board is still there to undo it.
   */
  empty?: EmptyStateProps
  columns: TaskBoardColumn[]
  /**
   * What is already pinned above the whole pane, in pixels — a mode banner, a title bar. 0
   * when nothing is.
   *
   * THE ONLY OFFSET A CALLER OWES. The bar pins here and the column headings pin at this
   * plus the bar's own height, which is arithmetic this component does rather than asks
   * for.
   */
  top?: number
  /**
   * The scrolling pane the bands pin inside.
   *
   * OMITTED MEANS NOTHING PINS, which is not a degraded mode but the honest one for a board
   * that is a PICTURE of a board: the public site draws this component inside a plate that
   * never scrolls, where an observer would have no root to watch and the bands would sit at
   * rest forever anyway. Saying so costs nothing and keeps the drawing from pretending to a
   * behaviour it has no way to show.
   */
  paneRef?: RefObject<HTMLElement>
  /** Margins and width. Not the grid, the gaps or the columns. */
  className?: string
}

export function TaskBoard({
  heading,
  filters,
  notices = [],
  empty,
  columns,
  top = 0,
  paneRef,
  className = '',
}: TaskBoardProps) {
  /**
   * Where the column headings pin: under the bar when there is one, at the top of the pane
   * when there is not. Both bands are opaque, so the second has to be told how tall the
   * first is — see `top`.
   */
  const headingTop = top + (filters ? filters.height ?? FILTER_BAR_HEIGHT : 0)

  /**
   * Whether the headings have pinned, which decides ONE thing: their rounded top corners,
   * and it has to be decided because a radius is a hole.
   *
   * A heading rounded at the top paints nothing in the 12px triangles either side of its
   * first rows — and a pinned heading has cards sliding directly behind it, so those two
   * corners read as a transparent slot with the board moving through it. At rest the radius
   * is right (it is the column's own top corner); pinned, it is a gap.
   *
   * ONE observer for all of them, because they all pin at the same instant: the columns are
   * grid items in one row, so they share a top edge, and the sentinel that marks it is that
   * row's.
   *
   * A SENTINEL AND NOT THE GRID ITSELF: `rootMargin` shrinks the root by exactly the offset
   * the headings pin at, and a zero-height mark at the row's top then leaves it at precisely
   * the scroll position where they do. The grid is hundreds of pixels tall and would still
   * be intersecting long after. There is no CSS for the question on the Chromium the desktop
   * ships — `:stuck` and scroll-state queries both landed after it.
   *
   * A CALLBACK REF, HELD IN STATE, because the sentinel comes and goes: `empty` takes the
   * grid out and puts it back (every change of repository does). With a plain ref the
   * effect never re-ran, kept observing the detached mark, which intersects nothing ever
   * again — and every column came back pinned, square-cornered at rest.
   */
  const [rowEl, setRowEl] = useState<HTMLDivElement | null>(null)
  const [pinned, setPinned] = useState(false)
  useEffect(() => {
    const pane = paneRef?.current
    if (!rowEl || !pane) return
    const observer = new IntersectionObserver(
      ([entry]) => setPinned(!entry.isIntersecting),
      { root: pane, rootMargin: `-${headingTop}px 0px 0px 0px` },
    )
    observer.observe(rowEl)
    return () => {
      observer.disconnect()
      setPinned(false)
    }
  }, [rowEl, paneRef, headingTop])

  return (
    <div className={`flex flex-col gap-3 ${className}`.trim()}>
      {heading && <SectionHeader {...heading} spacing="none" />}
      {filters && <FilterBar {...filters} top={top} {...(paneRef ? { paneRef } : {})} />}

      {notices.length > 0 && (
        // `gap-2` inside the column's `gap-3`: several bands about the same page read as one
        // block of bad news rather than as three unrelated announcements.
        <div className="flex flex-col gap-2">
          {notices.map(({ id, ...notice }) => <NoticeCard key={id} {...notice} />)}
        </div>
      )}

      {empty ? (
        <EmptyState {...empty} />
      ) : (
        // `relative` for the sentinel alone, which is ABSOLUTE and zero-sized on purpose: it
        // marks where the row of headings starts and must cost the layout nothing. In the
        // flow it would be a grid item, and hoisted above the grid it would take the
        // column's gap with it.
        //
        // THE COLUMNS NEVER STACK, at any width. At a modal's narrowest this is a tight fit
        // and it is still the right one: a board whose columns stack is a list with headings
        // in it, which is precisely what a board replaced.
        <div
          className="relative grid items-start gap-3"
          style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}
        >
          <div ref={setRowEl} className="absolute top-0 left-0 right-0 h-0" aria-hidden />
          {columns.map((column) => (
            <BoardColumn
              key={column.id}
              title={column.title}
              {...(column.icon ? { icon: column.icon } : {})}
              {...(column.tone ? { tone: column.tone } : {})}
              count={column.count}
              {...(column.countTitle ? { countTitle: column.countTitle } : {})}
              {...(column.empty ? { empty: column.empty } : {})}
              headingTop={headingTop}
              pinned={pinned}
            >
              {column.cards.map(({ id, ...card }) => <TicketCard key={id} {...card} />)}
            </BoardColumn>
          ))}
        </div>
      )}
    </div>
  )
}
