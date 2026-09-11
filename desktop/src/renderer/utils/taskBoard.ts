import type { JiraTaskIssue, TaskIssue } from '../../types'
import { normalizeTicketId } from './taskAgents'
import { fold, type TaskRow } from './taskRows'

/**
 * The Tasks page as a board: four columns, and the rule that puts a ticket in one.
 *
 * Kept out of the components for `taskRows.ts`' reason — the suite runs in Node with
 * no jsdom, so a rule left inside a `useMemo` is a rule no test can reach. And these
 * are exactly the rules that go quietly wrong: "blocked" is a word, not a field, and
 * the two trackers disagree about almost everything else.
 */

/**
 * Left to right, and the order is the argument.
 *
 * BLOCKED leads rather than sitting where a workflow would put it (between backlog and
 * in progress), because it is the only column that asks something of the reader: a
 * blocked ticket is work that has stopped and needs a person, and a column nobody
 * scrolls to is a column that says nothing. Everything else then reads left to right as
 * the work moves.
 *
 * FOUR, and no more. Every Jira status that is neither To Do nor Done lands in
 * `progress` — "In Review", "QA", "Waiting for deploy", whatever a site calls its
 * middle columns — because the board is the answer to "what can I pick up", and
 * splitting work in flight into five columns nobody here can name is detail that
 * belongs on the Jira board it came from.
 */
export const BOARD_COLUMNS = ['blocked', 'backlog', 'progress', 'done'] as const

export type BoardColumn = typeof BOARD_COLUMNS[number]

/**
 * The words that mean "blocked", in the two languages this app is written in, folded
 * the way `fold` folds everything else.
 *
 * PREFIXES, tested against a status NAME with `includes`. A Jira status is a sentence
 * a team wrote — "Blocked", "Bloqué par le client", "Blocked / on hold" — so anything
 * stricter than a substring would match our own board and nobody else's.
 */
const BLOCKED_WORDS = ['block', 'bloqu']

/**
 * The same question asked of a GitHub LABEL, and asked more strictly.
 *
 * A whole-label match on a small set, where a Jira status gets a substring. Labels are
 * a flat namespace people put anything in, and `blocker` — which contains `block` — is
 * a severity on most repositories that use it, not a state: a substring rule would move
 * every urgent bug into a column that says nobody can work on it. So the label has to
 * BE one of these, once folded and stripped of the separators people spell labels with
 * (`blocked-by`, `on hold`, `on_hold`).
 */
const BLOCKED_LABELS = new Set(['blocked', 'blockedby', 'blocking', 'bloque', 'bloquee', 'onhold'])

/** A label as `BLOCKED_LABELS` spells its entries: folded, and separator-free. */
function labelToken(label: string): string {
  return fold(label).replace(/[^a-z0-9]/g, '')
}

/**
 * Whether a Jira status name says the ticket is blocked.
 *
 * The STATUS and not Jira's `Flagged` field, which is the other place a site can record
 * an impediment. Flagged is a custom field whose id differs per site and would have to
 * be resolved and asked for on every sprint read; the status is already on the ticket
 * and is what a board's own Blocked column is made of. A team that flags instead of
 * moving the ticket keeps the ticket in `progress`, which is where their board shows
 * it too.
 */
export function isBlockedStatus(statusName: string): boolean {
  const folded = fold(statusName)
  return BLOCKED_WORDS.some((word) => folded.includes(word))
}

/** Whether any of a GitHub issue's labels says it is blocked. See `BLOCKED_LABELS`. */
export function isBlockedLabel(labels: readonly string[]): boolean {
  return labels.some((label) => BLOCKED_LABELS.has(labelToken(label)))
}

/**
 * Where one GitHub issue goes.
 *
 * A GitHub issue has no status: it is open or closed, and everything else about it is a
 * label. So the column is read off the two facts that do exist — whether it is closed,
 * and whether somebody has an agent on it — plus the label rule above.
 *
 * THE AGENT IS WHAT PUTS IT IN PROGRESS, and that is the whole of the difference with
 * the Jira side. A Jira ticket has a column of its own on a board somebody maintains,
 * so its status is believed. A GitHub issue has nothing of the sort, and an agent
 * running on it is the only evidence this app has that the work has started — the same
 * evidence the card's own marker draws.
 *
 * Done is checked FIRST: an issue closed while an agent was still attached to it is
 * finished, whatever the roster still says.
 */
export function githubColumn(issue: TaskIssue, hasAgent: boolean): BoardColumn {
  if (issue.closedAt) return 'done'
  if (isBlockedLabel(issue.labels)) return 'blocked'
  return hasAgent ? 'progress' : 'backlog'
}

/**
 * Where one Jira ticket goes, off the board it already lives on.
 *
 * `statusCategory` and not `statusName`, everywhere except the blocked test: the three
 * categories are fixed by Jira and survive a site renaming every one of its columns,
 * which is the reason `JiraStatusCategory` exists. The name is read only for "blocked",
 * because Jira has no category for it.
 *
 * DONE WINS OVER BLOCKED. A site whose workflow ends in a status called something like
 * "Done (was blocked)" has finished the ticket, and a finished ticket in the Blocked
 * column would be asking the reader to unblock work that is over.
 *
 * The agent plays no part here, unlike on the GitHub side. A ticket in To Do that an
 * agent has just picked up stays in Backlog until the board it belongs to says
 * otherwise — the sprint board is the shared truth about where work is, and a column
 * that disagreed with it would make the two unreadable together. What the card shows
 * instead is its agent marker.
 */
export function jiraColumn(issue: JiraTaskIssue): BoardColumn {
  if (issue.statusCategory === 'done') return 'done'
  if (isBlockedStatus(issue.statusName)) return 'blocked'
  return issue.statusCategory === 'indeterminate' ? 'progress' : 'backlog'
}

/**
 * One ticket on the board, with everything a card needs and nothing it has to look up.
 *
 * A DISCRIMINATED UNION on the tracker, like `TaskSelection` and `TaskDetailPage`'s
 * props: the two issue shapes share three field names and differ in the one that
 * identifies them, so a card carrying `tracker` and `issue` as independent fields would
 * compile perfectly and then read a Jira key off a GitHub issue.
 *
 * `row` rides along because the card's actions need it — which repositories are behind
 * the ticket, and whether any of them can host an agent — and looking it up per card
 * would mean every card searching the same array.
 */
export type BoardCard = {
  /** `github:api#234` / `jira:api#PROJ-12` — React's key, and unique across the board. */
  key: string
  column: BoardColumn
  row: TaskRow
  /** The ticket's identity in the form the agent index is keyed by. See `buildAgentedIssues`. */
  id: string
  /** Whether somebody — the reader or a teammate — already has an agent on it. */
  hasAgent: boolean
} & (
  | { tracker: 'github'; issue: TaskIssue }
  | { tracker: 'jira'; issue: JiraTaskIssue }
)

/** An empty column for each of the four, in `BOARD_COLUMNS`' order. */
function emptyBoard(): Record<BoardColumn, BoardCard[]> {
  return { blocked: [], backlog: [], progress: [], done: [] }
}

/**
 * Every ticket of every row, dealt into the four columns.
 *
 * ORDER IS INHERITED, never re-established: the rows arrive sorted (by
 * `buildTaskRows`, then by whatever the sort control asked for in `sortTaskRows`), and
 * dealing preserves it within each column. That is what makes the sort control go on
 * meaning something on a board — switching to `priority` reorders every column at
 * once, because each column is a subsequence of a list that was already in that order.
 *
 * Rows are walked in the order they were given, so a card shared by two repositories
 * appears once, where its row is.
 */
export function buildBoard(rows: TaskRow[]): Record<BoardColumn, BoardCard[]> {
  const board = emptyBoard()
  for (const row of rows) {
    if (row.tracker === 'jira') {
      for (const issue of row.issues) {
        // Through the same normaliser the index was built with: Jira is
        // case-insensitive about keys, and an agent whose ticket was typed `per-1234`
        // is on `PER-1234`.
        const id = normalizeTicketId(issue.key)
        const column = jiraColumn(issue)
        board[column].push({
          key: `jira:${row.configKey}#${id}`,
          column,
          row,
          id,
          hasAgent: row.agentedIssues.has(id),
          tracker: 'jira',
          issue,
        })
      }
    } else {
      for (const issue of row.issues) {
        const id = String(issue.number)
        const hasAgent = row.agentedIssues.has(id)
        const column = githubColumn(issue, hasAgent)
        board[column].push({
          key: `github:${row.configKey}#${id}`,
          column,
          row,
          id,
          hasAgent,
          tracker: 'github',
          issue,
        })
      }
    }
  }
  return board
}

/**
 * How many cards the board is holding, across all four columns.
 *
 * Its own function rather than `countOpenIssues`, and they deliberately disagree: that
 * one counts what is WAITING and leaves the Done column out, which is what the header's
 * "N open" means. This one counts what is DRAWN, and is what tells an empty board from
 * one that is merely narrowed.
 */
export function countBoard(board: Record<BoardColumn, BoardCard[]>): number {
  return BOARD_COLUMNS.reduce((total, column) => total + board[column].length, 0)
}
