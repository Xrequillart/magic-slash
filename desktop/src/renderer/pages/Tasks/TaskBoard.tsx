import { AlertTriangle, CircleCheck, CircleDashed, Info, LoaderCircle, OctagonAlert } from 'lucide-react'
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
  onSelect: (selection: TaskSelection) => void
}) {
  const t = useT()
  const failed = rows.filter((row) => !!row.error)

  return (
    <div className="flex flex-col gap-3">
      {failed.length > 0 && (
        <div className="flex flex-col gap-2">
          {failed.map((row) => <FailedRow key={`${row.tracker}:${row.configKey}`} row={row} />)}
        </div>
      )}

      {/* `items-start` is what gives each column its own height — without it the grid
          stretches all four to the tallest, and three of them end in a field of empty
          card-coloured space. */}
      <div className="grid grid-cols-4 gap-3 items-start">
        {BOARD_COLUMNS.map((column) => (
          <Column key={column} column={column} cards={board[column]} repoConfigs={repoConfigs} onSelect={onSelect} t={t} />
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
 */
function Column({
  column,
  cards,
  repoConfigs,
  onSelect,
  t,
}: {
  column: BoardColumn
  cards: BoardCard[]
  repoConfigs: Record<string, RepositoryConfig | undefined>
  onSelect: (selection: TaskSelection) => void
  t: Translate
}) {
  const { title, icon: Icon, className } = COLUMNS[column]

  return (
    // NO `overflow-hidden` here, however much the rounded corners want it: `overflow`
    // makes an element a scroll container, and a `sticky` child then pins to THAT rather
    // than to the pane — which, on a box that does not scroll, means it never moves at
    // all. The heading rounds its own top corners instead.
    <div className="flex flex-col min-w-0 rounded-xl bg-surface-subtle border border-line-subtle">
      <div className="sticky top-0 z-10 rounded-t-xl bg-bg-secondary">
        <div className="flex items-center gap-2 px-2.5 py-2 rounded-t-xl bg-surface-subtle border-b border-line-subtle">
          <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${className}`} />
          <span className="text-xs font-medium text-ink truncate">{t(title)}</span>
          {/* The count, always, zero included: a column that showed nothing and said
              nothing would be indistinguishable from one that failed to render. */}
          <span className="ml-auto text-xs text-text-secondary/60 flex-shrink-0">{cards.length}</span>
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
