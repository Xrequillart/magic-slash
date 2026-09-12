import { useEffect, useRef, useState, type RefObject } from 'react'
import { AlertTriangle, CircleCheck, CircleDashed, Info, LoaderCircle, OctagonAlert } from '@ds/desktop/icons'
import type { RepositoryConfig } from '../../../types'
import { BOARD_COLUMNS, type BoardCard, type BoardColumn } from '../../utils/taskBoard'
import type { TaskRow } from '../../utils/taskRows'
import type { TaskSelection } from '../../utils/taskSelection'
import { useT, type MessageKey, type Translate } from '../../i18n'
import { JIRA_NEUTRAL_BADGE, JiraErrorLines, TaskErrorLines } from './parts'
import { TaskCard } from './TaskCard'

/**
 * The four columns, and the whole of what distinguishes one from another.
 *
 * A table rather than four blocks of markup, for the reason every other table on this
 * page exists: the columns differ in a heading, a glyph and a tint, and written out
 * four times those three would drift — a column whose count sat in a different place
 * from its neighbours reads as a bug nobody can name.
 *
 * BLOCKED is the only one tinted a colour that asks for attention. The other three are
 * states work passes through and colouring them would make the board a traffic light;
 * blocked is the one that has stopped and needs a person.
 */
const COLUMNS: Record<BoardColumn, { title: MessageKey; icon: typeof CircleDashed; className: string }> = {
  blocked: { title: 'tasks.board.blocked', icon: OctagonAlert, className: 'text-red' },
  backlog: { title: 'tasks.board.backlog', icon: CircleDashed, className: 'text-text-secondary' },
  progress: { title: 'tasks.board.progress', icon: LoaderCircle, className: 'text-text-secondary' },
  done: { title: 'tasks.board.done', icon: CircleCheck, className: 'text-text-secondary' },
}

/**
 * The board: one repository's tickets, dealt into four columns.
 *
 * THE PAGE SCROLLS, NOT THE COLUMNS, and that is a decision about the pane rather than
 * about boards. This page and the ticket it opens are two layers of one `SweepPane`
 * inside one scrolling pane (see `pages/Tasks/index.tsx`), and the outgoing layer is
 * positioned absolutely — so nothing in here has a definite height to size four
 * independently scrolling columns against. Columns of their own natural height, in a
 * grid aligned to the top, need none.
 *
 * What that would cost is the headings, which would scroll away and leave four unlabelled
 * stacks of cards; `sticky` buys them back, pinning each heading at the top of the pane
 * for exactly as long as its own column is on screen.
 *
 * The columns are equal width and never stack: at the modal's narrowest this is a tight
 * fit, and it is still the right one — a board whose columns stack is a list with
 * headings in it, which is precisely what this replaced.
 */
export function TaskBoard({
  board,
  rows,
  repoConfigs,
  truncatedColumns,
  headingTop,
  paneRef,
  onSelect,
}: {
  board: Record<BoardColumn, BoardCard[]>
  /**
   * The rows the board was dealt from, for the failures among them.
   *
   * Kept separate from `board` on purpose: a row that failed has no tickets, so it
   * appears in no column — and a repository whose read did not come back is the one
   * thing on this page that asks something of the reader. It is reported ABOVE the
   * columns rather than inside one, because there is no column it belongs to.
   */
  rows: TaskRow[]
  repoConfigs: Record<string, RepositoryConfig | undefined>
  /**
   * The columns whose read stopped at its budget, so their count is a floor and not a
   * total. See `JiraTaskRepoGroup.truncatedColumns`.
   */
  truncatedColumns: ReadonlySet<BoardColumn>
  /**
   * Where a column heading pins, in pixels from the top of the pane.
   *
   * Not zero, because the filter bar pins there too and is opaque: at `top: 0` the
   * headings would slide under it and the board would scroll with four unlabelled
   * stacks of cards, which is the exact thing `sticky` is here to prevent. The page
   * passes the bar's own height (`FILTER_BAR_H`), or 0 on a board that has no bar —
   * see `narrowable` in `pages/Tasks/index.tsx`.
   */
  headingTop: number
  /**
   * The scrolling pane, for the one thing a heading cannot tell about itself: whether it
   * has pinned. See `pinned` below.
   */
  paneRef: RefObject<HTMLElement>
  onSelect: (selection: TaskSelection) => void
}) {
  const t = useT()
  const failed = rows.filter((row) => !!row.error)

  /**
   * Whether the headings have pinned, which decides ONE thing: their rounded top
   * corners, and it has to be decided because a radius is a hole.
   *
   * A heading rounded at the top paints nothing in the 12px triangles either side of
   * its first rows — and a pinned heading has cards sliding directly behind it, so
   * those two corners read as a transparent 1px slot with the board moving through it.
   * At rest the radius is right (it is the column's own top corner); pinned, it is a
   * gap. So it is dropped for exactly as long as the band is pinned.
   *
   * ONE observer for all four, because all four pin at the same instant: the columns
   * are grid items in one row, so they share a top edge, and the sentinel that marks it
   * is that row's. The state is per board rather than per column for the same reason.
   *
   * A sentinel and not the grid itself: `rootMargin` shrinks the root by exactly the
   * offset the headings pin at, and a zero-height mark at the row's top then leaves it
   * at precisely the scroll position where they do. The grid is hundreds of pixels tall
   * and would still be intersecting long after.
   */
  const rowRef = useRef<HTMLDivElement>(null)
  const [pinned, setPinned] = useState(false)
  useEffect(() => {
    const rowEl = rowRef.current
    const pane = paneRef.current
    if (!rowEl || !pane) return
    const observer = new IntersectionObserver(
      ([entry]) => setPinned(!entry.isIntersecting),
      { root: pane, rootMargin: `-${headingTop}px 0px 0px 0px` },
    )
    observer.observe(rowEl)
    return () => observer.disconnect()
  }, [paneRef, headingTop])

  return (
    <div className="flex flex-col gap-3">
      {failed.length > 0 && (
        <div className="flex flex-col gap-2">
          {failed.map((row) => <FailedRow key={`${row.tracker}:${row.configKey}`} row={row} />)}
        </div>
      )}

      {/* `items-start` is what gives each column its own height — without it the grid
          stretches all four to the tallest, and three of them end in a field of empty
          card-coloured space.

          `relative` for the sentinel alone, which is ABSOLUTE and zero-sized on purpose:
          it marks where the row of headings starts and must cost the layout nothing. In
          the flow it would be a grid item, and hoisted above the grid it would take the
          column's gap with it — which is what `-mt-3` cancels elsewhere on this page,
          and cannot here, since a board with no failed row above it has no gap to give
          back. */}
      <div className="relative grid grid-cols-4 gap-3 items-start">
        <div ref={rowRef} className="absolute top-0 left-0 right-0 h-0" aria-hidden />
        {BOARD_COLUMNS.map((column) => (
          <Column
            key={column}
            column={column}
            cards={board[column]}
            repoConfigs={repoConfigs}
            truncated={truncatedColumns.has(column)}
            headingTop={headingTop}
            pinned={pinned}
            onSelect={onSelect}
            t={t}
          />
        ))}
      </div>
    </div>
  )
}

/**
 * One column: a heading that stays with it, and the cards under it.
 *
 * THE HEADING IS TWO NESTED BOXES, and the reason is the one thing that has to be right
 * about a sticky band: cards slide under it as the page scrolls, so it has to be opaque.
 * Every `surface-*` token in this app is an ALPHA colour — `surfaceSubtle` is white or
 * black at 3–8% (see `themes.ts`) — because they are tints meant to sit on a ground, not
 * grounds themselves. A heading painted with one alone is 96% transparent, which is
 * exactly as much as it sounds like.
 *
 * So the outer box lays down the modal's own opaque ground (`bg-bg-secondary`, what
 * `PageModal` paints) and the inner one puts the column's tint back on top of it. The
 * result is the same colour as the column body, and nothing shows through it. `z-10` is
 * the other half, against the cards' borders.
 *
 * THE TOP RADIUS IS THE THIRD, and it only holds while the heading is at rest: a rounded
 * corner paints nothing outside its arc, so a pinned heading rounded at the top has two
 * 12px holes in its first rows with the board sliding behind them. See `pinned`.
 */
function Column({
  column,
  cards,
  repoConfigs,
  truncated,
  headingTop,
  pinned,
  onSelect,
  t,
}: {
  column: BoardColumn
  cards: BoardCard[]
  repoConfigs: Record<string, RepositoryConfig | undefined>
  /** Whether this column's read stopped at its budget. See the count below. */
  truncated: boolean
  /** Where this heading pins. See `TaskBoard`. */
  headingTop: number
  /** Whether it has pinned there, which is what its top corners turn on. See `TaskBoard`. */
  pinned: boolean
  onSelect: (selection: TaskSelection) => void
  t: Translate
}) {
  const { title, icon: Icon, className } = COLUMNS[column]
  // Both boxes lose it together: the outer is the opaque ground, and rounding the inner
  // alone would cut two dark notches out of the band instead of two see-through ones.
  const headRadius = pinned ? '' : 'rounded-t-xl'

  return (
    // NO `overflow-hidden` here, however much the rounded corners want it: `overflow`
    // makes an element a scroll container, and a `sticky` child then pins to THAT rather
    // than to the pane — which, on a box that does not scroll, means it never moves at
    // all. The heading rounds its own top corners instead.
    <div className="flex flex-col min-w-0 rounded-xl bg-surface-subtle border border-line-subtle">
      {/* `top` from the page and not `top-0`: the filter bar pins there, and it is
          opaque. See `headingTop`. */}
      <div className={`sticky z-10 bg-bg-secondary ${headRadius}`} style={{ top: headingTop }}>
        <div className={`flex items-center gap-2 px-2.5 py-2 bg-surface-subtle border-b border-line-subtle ${headRadius}`}>
          <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${className}`} />
          <span className="text-xs font-medium text-ink truncate">{t(title)}</span>
          {/* The count, always, zero included: a column that showed nothing and said
              nothing would be indistinguishable from one that failed to render.

              `100+` WHEN THE READ STOPPED AT THE BUDGET, and this is the half that was
              missing. Each column is now read with a page budget of its own, and a bare
              `100` over a column holding four hundred tickets is not a count — it is a
              cap wearing a count's clothes, and it is the most authoritative-looking
              thing on the board. The `+` is the whole correction: this column has more,
              and Jira's cursor pagination cannot say how many more (there is no `total`
              in the response), so a ratio is a sentence this side cannot write. */}
          <span
            className="ml-auto text-xs text-text-secondary/60 flex-shrink-0"
            {...(truncated ? { title: t('tasks.board.cappedHint') } : {})}
          >
            {truncated ? t('tasks.board.cappedCount', { count: cards.length }) : cards.length}
          </span>
        </div>
      </div>

      {/* The column's own inset is deliberately thin. Four columns share the modal's
          width, so every pixel spent here is taken from the card's line length — which
          is the one dimension a ticket title actually needs. The cards keep their own
          padding; it is what makes them read as cards rather than as a striped list. */}
      <div className="p-1.5 flex flex-col gap-1.5">
        {cards.length === 0 ? (
          // A word rather than an empty box, and the same word in all four: what is
          // interesting about an empty Blocked column is that it is empty, and a
          // column-specific sentence would make the reader read four of them to find
          // out that nothing is there.
          <p className="px-1 py-5 text-center text-xs text-text-secondary/40">{t('tasks.board.empty')}</p>
        ) : (
          cards.map((card) => (
            <TaskCard key={card.key} card={card} repoConfigs={repoConfigs} onSelect={onSelect} />
          ))
        )}
      </div>
    </div>
  )
}

/**
 * Why ONE of the repository's reads came back with nothing, above the board rather than
 * inside it.
 *
 * Rendered at all — rather than letting the read simply vanish — precisely because the
 * board now shows one repository at a time: an unreadable source used to leave one card
 * among several saying so, and would now leave four empty columns and no explanation.
 *
 * NOT ALWAYS A FAILURE, which is what the two tones are for. A project with no sprint in
 * progress has not failed at anything — it is a state of the board — and neither has one
 * whose Atlassian account is simply not connected yet. Those get a neutral glyph; an
 * orange warning triangle over "this project has no active sprint" would send somebody
 * looking for a breakage that is not there. The table is `JIRA_NEUTRAL_BADGE`, shared
 * with the copy that words them.
 */
function FailedRow({ row }: { row: TaskRow }) {
  // Picked inside the tracker branch: `row` is a union whose two members carry two
  // different error types, and only the discriminant narrows `row.error` to one of them.
  const lines = row.tracker === 'jira'
    ? row.error && <JiraErrorLines error={row.error} />
    : row.error && <TaskErrorLines error={row.error} />
  if (!lines) return null

  // Only the Jira half has outcomes that are not failures; every GitHub error is one, so
  // the lookup is skipped rather than given a table of its own.
  const neutral = row.tracker === 'jira' && row.error ? !!JIRA_NEUTRAL_BADGE[row.error.error] : false
  const Icon = neutral ? Info : AlertTriangle

  return (
    <div className="flex items-start gap-3 px-4 py-3 min-w-0 rounded-xl bg-surface-subtle border border-line-subtle">
      <Icon className={`w-4 h-4 flex-shrink-0 mt-0.5 ${neutral ? 'text-icon-muted' : 'text-orange'}`} />
      <div className="min-w-0 flex flex-col gap-0.5">
        {/* WHICH repository could not be read. On a page showing one card per repository
            the header answered that; here the columns are shared, so the sentence has to
            name its own subject. */}
        <span className="text-xs text-text-secondary/60">
          {row.repos.map((repo) => repo.name).join(' · ')}
          {row.showTracker && ` · ${row.tracker === 'jira' ? 'Jira' : 'GitHub'}`}
        </span>
        {lines}
      </div>
    </div>
  )
}
