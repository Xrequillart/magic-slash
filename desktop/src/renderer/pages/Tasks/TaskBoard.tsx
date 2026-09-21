import { useEffect, useRef, useState, type RefObject } from 'react'
import { BoardColumn, NoticeCard, type BoardColumnTone } from '@ds/desktop'
import { CircleCheck, CircleDashed, LoaderCircle, OctagonAlert, Settings } from '@ds/desktop/icons'
import type { RepositoryConfig } from '../../../types'
import { BOARD_COLUMNS, type BoardCard, type BoardColumn as BoardColumnKey } from '../../utils/taskBoard'
import type { TaskRow } from '../../utils/taskRows'
import type { TaskSelection } from '../../utils/taskSelection'
import { useStore } from '../../store'
import { useT, type MessageKey, type Translate } from '../../i18n'
import { JIRA_NEUTRAL_BADGE, jiraErrorCopy, taskErrorCopy } from './parts'
import { TaskCard } from './TaskCard'

/**
 * The four columns, and the whole of what distinguishes one from another.
 *
 * A table rather than four blocks of markup, for the reason every other table on this
 * page exists: the columns differ in a heading, a glyph and a tone, and written out
 * four times those three would drift — a column whose count sat in a different place
 * from its neighbours reads as a bug nobody can name.
 *
 * BLOCKED is the only one that asks for attention. The other three are states work
 * passes through and colouring them would make the board a traffic light; blocked is the
 * one that has stopped and needs a person. That pair is `BoardColumnTone`, which exists
 * because of this table and holds exactly the two values it needs.
 */
const COLUMNS: Record<BoardColumnKey, { title: MessageKey; icon: typeof CircleDashed; tone: BoardColumnTone }> = {
  blocked: { title: 'tasks.board.blocked', icon: OctagonAlert, tone: 'alert' },
  backlog: { title: 'tasks.board.backlog', icon: CircleDashed, tone: 'neutral' },
  progress: { title: 'tasks.board.progress', icon: LoaderCircle, tone: 'neutral' },
  done: { title: 'tasks.board.done', icon: CircleCheck, tone: 'neutral' },
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
 * stacks of cards; `sticky` buys them back, and `BoardColumn` owns everything about how —
 * the opaque backing a band needs, the top radius it drops once it has pinned. What stays
 * here is the two facts a column cannot know about itself: WHERE it pins, and WHETHER it
 * has.
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
  board: Record<BoardColumnKey, BoardCard[]>
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
  truncatedColumns: ReadonlySet<BoardColumnKey>
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
   * gap. So it is dropped for exactly as long as the band is pinned. `BoardColumn` draws
   * the consequence; this is where the question is answered.
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
          {failed.map((row) => <FailedRow key={`${row.tracker}:${row.configKey}`} row={row} t={t} />)}
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
        {BOARD_COLUMNS.map((column) => {
          const { title, icon, tone } = COLUMNS[column]
          const cards = board[column]
          const truncated = truncatedColumns.has(column)
          return (
            <BoardColumn
              key={column}
              title={t(title)}
              icon={icon}
              tone={tone}
              // The count, always, zero included: a column that showed nothing and said
              // nothing would be indistinguishable from one that failed to render.
              //
              // `100+` WHEN THE READ STOPPED AT THE BUDGET. Each column is read with a
              // page budget of its own, and a bare `100` over a column holding four
              // hundred tickets is not a count — it is a cap wearing a count's clothes,
              // and it is the most authoritative-looking thing on the board. The `+` is
              // the whole correction: this column has more, and Jira's cursor pagination
              // cannot say how many more (there is no `total` in the response), so a
              // ratio is a sentence this side cannot write.
              count={truncated ? t('tasks.board.cappedCount', { count: cards.length }) : cards.length}
              {...(truncated ? { countTitle: t('tasks.board.cappedHint') } : {})}
              // The same word in all four: what is interesting about an empty Blocked
              // column is that it is empty, and a column-specific sentence would make the
              // reader read four of them to find out that nothing is there.
              empty={t('tasks.board.empty')}
              headingTop={headingTop}
              pinned={pinned}
            >
              {cards.map((card) => (
                <TaskCard key={card.key} card={card} repoConfigs={repoConfigs} onSelect={onSelect} />
              ))}
            </BoardColumn>
          )
        })}
      </div>
    </div>
  )
}

/**
 * Why ONE of the repository's reads came back with nothing, above the board rather than
 * inside it.
 *
 * Rendered at all — rather than letting the read simply vanish — precisely because the
 * board shows one repository at a time: an unreadable source used to leave one card among
 * several saying so, and would now leave four empty columns and no explanation.
 *
 * A `NoticeCard`, which is the shape this was hand-building: a tinted band saying what
 * happened and what to do about it, over the evidence it happened to. The EVIDENCE is
 * which repositories could not be read — on a page showing one card per repository the
 * header answered that, and here the columns are shared, so the card has to name its own
 * subject. One row each rather than a joined string, because the tracker is a tag on the
 * row it belongs to.
 *
 * NOT ALWAYS A FAILURE, which is what the two variants are for. A project with no sprint
 * in progress has not failed at anything — it is a state of the board — and neither has
 * one whose Atlassian account is simply not connected yet. Those get `info`; an orange
 * warning over "this project has no active sprint" would send somebody looking for a
 * breakage that is not there. The table is `JIRA_NEUTRAL_BADGE`, shared with the copy
 * that words them.
 */
function FailedRow({ row, t }: { row: TaskRow; t: Translate }) {
  // Picked inside the tracker branch: `row` is a union whose two members carry two
  // different error types, and only the discriminant narrows `row.error` to one of them.
  const copy = row.tracker === 'jira'
    ? row.error && jiraErrorCopy(row.error, t)
    : row.error && taskErrorCopy(row.error, t)
  if (!copy) return null

  // Only the Jira half has outcomes that are not failures; every GitHub error is one, so
  // the lookup is skipped rather than given a table of its own.
  const neutral = row.tracker === 'jira' && row.error ? !!JIRA_NEUTRAL_BADGE[row.error.error] : false

  /**
   * The way out of the one failure that HAS one. Without an Atlassian credential a Jira
   * board renders as an empty backlog, which reads as "this sprint has nothing in it";
   * with this, the card states the situation and hands over the one screen that fixes
   * it. Settings is a modal like this page, so opening it replaces the Tasks overlay
   * rather than stacking on top of it.
   */
  const connect = row.tracker === 'jira' && row.error?.error === 'not-connected'
    ? [{
      label: t('tasks.jira.connect'),
      icon: Settings,
      primary: true,
      onClick: () => useStore.getState().setAccountTab('connections'),
    }]
    : undefined

  return (
    <NoticeCard
      variant={neutral ? 'info' : 'warning'}
      hint={copy.fix}
      actions={connect}
      rows={row.repos.map((repo) => ({
        id: repo.configKey,
        name: repo.name,
        ...(row.showTracker ? { tags: [{ label: row.tracker === 'jira' ? 'Jira' : 'GitHub' }] } : {}),
      }))}
    >
      {copy.title}
    </NoticeCard>
  )
}
