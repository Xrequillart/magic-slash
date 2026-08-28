import { memo, type KeyboardEvent } from 'react'
import { AlertTriangle, ChevronDown, ChevronRight, ExternalLink, Settings } from 'lucide-react'
import type {
  JiraStatusCategory,
  JiraTaskError,
  JiraTaskIssue,
  JiraTaskStatusError,
  PRWatchError,
  TaskIssue,
} from '../../../types'
import { rowKey, type TaskRow } from '../../utils/taskRows'
import { useStore } from '../../store'
import { normalizeTicketId } from '../../utils/taskAgents'
import { useT, type MessageKey, type Translate } from '../../i18n'
import { StatusPill, TicketBadge } from '../Dashboard/parts'
import { CopyLinkButton } from '../../components/CopyLinkButton'
import { TrackerTile } from '../../components/icons/TrackerIcons'

/**
 * One repository's card, in the shape the Team page's `RepoCard` established:
 * a collapsible header carrying the repo's colour dot and a count, and rows under
 * it. Same markup, same classes — two lists of "things grouped by repository" that
 * looked different would be a bug nobody could name.
 */

/**
 * The ticket the page has opened, as the pair that identifies it — DISCRIMINATED BY
 * TRACKER, because the two halves of this page do not agree on what a ticket's
 * identity is.
 *
 * A GitHub issue is a number, per repository. A Jira ticket is a key, `PROJ-123`,
 * and has no number at all. Folding them into one `{ configKey, id: string }` would
 * make every consumer re-derive which of the two reads to make from the shape of the
 * string — and the detail panel's two IPC channels, two error unions and two `hasAgent`
 * lookups all need the answer stated rather than sniffed.
 *
 * Lives here rather than in the page, because this is the component that produces
 * one; the page consumes it.
 */
export type TaskSelection =
  | { tracker: 'github'; configKey: string; number: number }
  | { tracker: 'jira'; configKey: string; key: string }

/**
 * Dedicated `tasks.error.*` copy, NOT the pull-request card's.
 *
 * `agentInfo.pr.error.notFound` reads "Pull request not found", which is simply
 * wrong on a repository group — the same five failures need their own sentences here.
 *
 * Private to this module: `TaskErrorLines` below is what the rest of the page uses.
 * Sharing the map alone would have guaranteed the two surfaces say the same words
 * while leaving them free to say them differently.
 */
const ERROR_KEYS: Record<PRWatchError, { title: MessageKey; fix: MessageKey }> = {
  'no-token':     { title: 'tasks.error.noToken',     fix: 'tasks.error.noTokenFix' },
  'not-found':    { title: 'tasks.error.notFound',    fix: 'tasks.error.notFoundFix' },
  forbidden:      { title: 'tasks.error.forbidden',   fix: 'tasks.error.forbiddenFix' },
  'rate-limited': { title: 'tasks.error.rateLimited', fix: 'tasks.error.rateLimitedFix' },
  network:        { title: 'tasks.error.network',     fix: 'tasks.error.networkFix' },
}

/**
 * The same, for the Jira half — a SECOND table rather than a widening of the one
 * above.
 *
 * `ERROR_KEYS` is a `Record<PRWatchError, …>`, and `TaskErrorLines` is consumed by
 * `TaskDetailPage.tsx` on the GitHub-only path: widening either would force the
 * issue page to compile against members it can never be handed. Nearly every
 * sentence differs too — "run `gh auth login`" is not advice about an Atlassian
 * account — so there is nothing to reuse but the typography, and that is what
 * `ErrorLines` below holds.
 *
 * The two exceptions are the FIXES that name no tracker at all: waiting out a quota
 * and checking a network connection are the same advice whoever refused the read, so
 * those two point at the GitHub table's keys rather than at a second copy of the same
 * English. The titles stay distinct — the reader still has to be told which of the
 * two sources is rate-limited.
 */
const JIRA_ERROR_KEYS: Record<JiraTaskError, { title: MessageKey; fix: MessageKey }> = {
  'not-connected':    { title: 'tasks.jira.error.notConnected',   fix: 'tasks.jira.error.notConnectedFix' },
  'no-active-sprint': { title: 'tasks.jira.error.noSprint',       fix: 'tasks.jira.error.noSprintFix' },
  unauthorized:       { title: 'tasks.jira.error.unauthorized',   fix: 'tasks.jira.error.unauthorizedFix' },
  forbidden:          { title: 'tasks.jira.error.forbidden',      fix: 'tasks.jira.error.forbiddenFix' },
  'not-found':        { title: 'tasks.jira.error.notFound',       fix: 'tasks.jira.error.notFoundFix' },
  'rate-limited':     { title: 'tasks.jira.error.rateLimited',    fix: 'tasks.error.rateLimitedFix' },
  offline:            { title: 'tasks.jira.error.offline',        fix: 'tasks.error.networkFix' },
  'server-error':     { title: 'tasks.jira.error.serverError',    fix: 'tasks.jira.error.serverErrorFix' },
  'invalid-query':    { title: 'tasks.jira.error.invalidQuery',   fix: 'tasks.jira.error.invalidQueryFix' },
}

/**
 * The rows of `JIRA_ERROR_KEYS` that mean something ELSE on one ticket's page than
 * they do on a repository card.
 *
 * Only one so far, and it is a genuine mis-statement rather than a nicety: on the
 * card a 404 is the PROJECT, and "check the project key" is the fix. On the detail
 * panel the project key is demonstrably right — the list read just used it to fetch
 * the row that was clicked — and the 404 is the ticket, deleted or moved. Sending
 * the reader to a settings field that is already correct is worse than saying
 * nothing.
 *
 * A partial override rather than a second full table: every other failure —
 * unauthorized, forbidden, offline, a rejected query — is the same fact and the
 * same fix wherever it is met, and a copy of the other eight rows would be eight
 * chances for the two surfaces to drift.
 */
const JIRA_DETAIL_ERROR_KEYS: Partial<Record<JiraTaskError, { title: MessageKey; fix: MessageKey }>> = {
  'not-found': { title: 'tasks.jira.detail.notFound', fix: 'tasks.jira.detail.notFoundFix' },
}

/**
 * The two Jira outcomes that are not failures, and the word each gets instead.
 *
 * "Could not be read" is wrong for both. A project with no sprint in progress has not
 * failed at anything — it is a state of the board — and neither has one whose
 * Atlassian account is simply not connected yet. A table rather than a chain of
 * comparisons so that the rule ("these are states, not failures") is stated once, and
 * a third one is an entry rather than another branch.
 */
const JIRA_NEUTRAL_BADGE: Partial<Record<JiraTaskError, MessageKey>> = {
  'no-active-sprint': 'tasks.jira.noSprintBadge',
  'not-connected': 'tasks.jira.notConnectedBadge',
}

/** What went wrong, then what to do about it. The shape both tables render into. */
function ErrorLines({ title, fix }: { title: MessageKey; fix: MessageKey }) {
  const t = useT()
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <span className="text-sm text-ink">{t(title)}</span>
      <span className="text-xs text-text-secondary/70">{t(fix)}</span>
    </div>
  )
}

/**
 * A failed GitHub read, said the one way this page says it.
 *
 * Exported because the issue page reads through the same GraphQL error ladder, so
 * a private repository that fails on the list must not fail differently — nor look
 * different — when one of its issues is opened. The caller supplies the surrounding
 * box; this owns the words and their typography.
 */
export function TaskErrorLines({ error }: { error: { error: PRWatchError } }) {
  return <ErrorLines {...ERROR_KEYS[error.error]} />
}

/**
 * A Jira group that could not be listed — and, when the reason is a missing
 * Atlassian account, the way out of it.
 *
 * The button is the point of the whole `not-connected` branch. Without an Atlassian
 * credential a Jira card would otherwise render as an empty backlog, which reads as
 * "this sprint has nothing in it"; with it, the card states the situation and hands
 * over the one screen that fixes it. Settings is a modal like this page, so opening
 * it replaces the Tasks overlay rather than stacking on top of it.
 */
export function JiraErrorLines({
  error,
  surface = 'card',
}: {
  error: JiraTaskStatusError
  /**
   * Which page is asking, because one failure does not mean the same thing on both.
   * Named rather than handed in as a table of sentences: "the detail page words 404
   * differently" is a fact about the copy, so it belongs beside the copy — a caller
   * cannot get it subtly wrong, only pick the wrong one of two names.
   */
  surface?: 'card' | 'detail'
}) {
  const t = useT()
  const keys = (surface === 'detail' ? JIRA_DETAIL_ERROR_KEYS[error.error] : undefined)
    ?? JIRA_ERROR_KEYS[error.error]
  return (
    <div className="flex flex-col gap-2 min-w-0">
      <ErrorLines {...keys} />
      {error.error === 'not-connected' && (
        <button
          onClick={() => useStore.getState().openSettingsModal('account')}
          className="self-start flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-accent bg-accent/10 border border-accent/20 rounded-md hover:bg-accent/20 transition-colors"
        >
          <Settings className="w-3 h-3" />
          {t('tasks.jira.connect')}
        </button>
      )}
    </div>
  )
}

/**
 * "N open", picked on the same rule wherever it is shown — the cards here and the
 * page total above them. Exported so the two cannot drift apart the day a locale
 * needs a form English does not have.
 *
 * `totalOpen` is what the repository HAS; `count` is what this page could read,
 * capped at the query's `first: 50`. When they differ the label says so — "showing
 * 50 of 214" — because rendering the cap as the total is simply a wrong number.
 */
export function openCountLabel(count: number, t: Translate, totalOpen?: number): string {
  if (typeof totalOpen === 'number' && totalOpen > count) {
    return t('tasks.openCount.truncated', { count, total: totalOpen })
  }
  return t(count === 1 ? 'tasks.openCount.one' : 'tasks.openCount.other', { count })
}

/**
 * The same counter for a sprint, which can say "there is more" but never "of how
 * many".
 *
 * `/rest/api/3/search/jql` is paginated by cursor and returns no `total`, so the
 * "showing 50 of 214" form `openCountLabel` uses has no second number to put in it.
 * The honest reading of a next-page token is that the card is showing the first N,
 * and that is what this says.
 *
 * Only the truncated form is this function's own: an untruncated sprint is counted
 * by `openCountLabel`, so the plural pick lives in one place and a locale needing a
 * form English has not got is still a one-line change.
 */
function sprintCountLabel(count: number, t: Translate, truncated?: boolean): string {
  return truncated ? t('tasks.sprintCount.truncated', { count }) : openCountLabel(count, t)
}

/**
 * "N sub-issues · M done", picked the way `openCountLabel` picks its form: one
 * catalogue key per plural, never a suffix appended in code.
 *
 * Only ever reached for an issue that HAS sub-issues — the mapper omits the field
 * entirely otherwise — so `total` is 1 or more and `.one` never renders a zero.
 */
function subIssuesLabel(subIssues: NonNullable<TaskIssue['subIssues']>, t: Translate): string {
  return t(subIssues.total === 1 ? 'tasks.subIssues.one' : 'tasks.subIssues.other', {
    count: subIssues.total,
    completed: subIssues.completed,
  })
}

/**
 * "Somebody is already on this one", in the repository dot's own idiom.
 *
 * ONE definition for both rows. It means slightly different things on each — on a
 * GitHub row it is the piece of metadata that changes what you would do with the
 * ticket, on a Jira row it is the reason an In Progress ticket is on the page at all
 * — but it says it with the same dot and the same word, and a marker that drifted
 * between the two halves of one page would read as two different facts.
 */
function AgentMarker({ t }: { t: Translate }) {
  return (
    <span
      title={t('tasks.hasAgentHint')}
      className="flex items-center gap-1.5 text-xs text-text-secondary whitespace-nowrap flex-shrink-0"
    >
      <span className="w-2 h-2 rounded-full flex-shrink-0 bg-accent" />
      {t('tasks.hasAgent')}
    </span>
  )
}

/**
 * The two things every row does with its ticket's URL: copy it, or open it.
 *
 * Shared so the pair keeps its geometry. `CopyLinkButton` wears the Open button's
 * box minus the label's horizontal room — same border, same radius, same vertical
 * padding — so the two pills stand one height; spelled out per row, that invariant
 * held across four class strings and only one of them said why.
 *
 * The click is stopped UNCONDITIONALLY, as `CopyLinkButton` already stops its own:
 * every caller is a `role="button"` row that opens the ticket's page, so without it
 * one click on "Open" would both browse and open the panel. A flag here would be an
 * option with one value — a branch no caller can exercise and no test can cover.
 */
function RowLinks({
  url,
  openLabel,
  copyLabel,
  copiedLabel,
}: {
  url: string
  openLabel: string
  copyLabel: string
  copiedLabel: string
}) {
  return (
    <>
      <CopyLinkButton
        url={url}
        copyLabel={copyLabel}
        copiedLabel={copiedLabel}
        className="flex items-center px-2 py-1 text-text-secondary border border-line rounded-lg hover:bg-surface-strong hover:text-ink transition-colors flex-shrink-0"
      />
      <button
        onClick={(e) => {
          e.stopPropagation()
          window.electronAPI.shell.openExternal(url)
        }}
        title={openLabel}
        className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-text-secondary border border-line rounded-lg hover:bg-surface-strong hover:text-ink transition-colors flex-shrink-0"
      >
        <ExternalLink className="w-3.5 h-3.5" />
        <span>{openLabel}</span>
      </button>
    </>
  )
}

/**
 * What makes a row a row: the geometry, and the contract that it opens its ticket.
 *
 * A div with a `role`, not a `<button>`: the row contains buttons of its own, and a
 * button inside a button is invalid markup no amount of `stopPropagation` fixes.
 * That also means the keyboard half is ours to provide — a real button answers
 * Enter and Space for free, and a `role="button"` that only answers the mouse is
 * unreachable without one.
 *
 * ONE helper for both rows rather than the same ten lines twice: the two differ
 * only in what they identify a ticket by, and a keyboard contract that lives in two
 * places is one a later edit can fix in only one of them.
 */
function rowActivation(onActivate: () => void) {
  return {
    role: 'button',
    tabIndex: 0,
    onClick: onActivate,
    onKeyDown: (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key !== 'Enter' && e.key !== ' ') return
      e.preventDefault()
      onActivate()
    },
    className: 'flex items-center gap-3 pl-4 pr-4 py-2.5 min-w-0 border-t border-line-subtle'
      + ' cursor-pointer transition-colors hover:bg-surface',
  } as const
}

/**
 * One issue, on TWO lines: what it is, then what is known about it.
 *
 * Everything used to share the title's line, and the title was the only element
 * allowed to give up width — so a row with an author and two labels on it read as
 * a truncated sentence followed by a pile of metadata. The second line gives the
 * author and the labels a place of their own, the title gets the whole first line,
 * and the labels are no longer capped at the two that used to fit beside it.
 *
 * What stays on the first line is what you ACT on: the agent marker, and the
 * button to the right of it.
 *
 * `t` and the button's label arrive as props rather than from `useT()` here: this
 * component is rendered once per issue, and a hook per row would register a
 * catalogue listener per row to translate the very same two constants.
 *
 * The row's own shell — the geometry, the click and the keyboard — comes from
 * `rowActivation`, which is where the reason for the div-with-a-role is written.
 */
function IssueRow({
  issue,
  openLabel,
  copyLabel,
  copiedLabel,
  t,
  hasAgent,
  onSelect,
}: {
  issue: TaskIssue
  openLabel: string
  copyLabel: string
  copiedLabel: string
  t: Translate
  hasAgent: boolean
  onSelect: (number: number) => void
}) {
  return (
    <div {...rowActivation(() => onSelect(issue.number))}>
      {/* The tracker's tile, on the ROW rather than on the title's line: the row is
          two lines tall and the mark belongs to all of it, so it is centred against
          the whole card (`items-center` on the row) instead of riding the first line
          like a piece of the title. See `TrackerTile`. */}
      <TrackerTile tracker="github" size="sm" title="GitHub" />
      <div className="flex-1 min-w-0 flex flex-col gap-1">
        <div className="flex items-center gap-3 min-w-0">
          <TicketBadge ticketId={`#${issue.number}`} />
          {issue.parent && (
            // The `TicketBadge` shape, in `StatusPill`'s neutral tokens rather than
            // the accent ones: two accent badges in a row would read as two tickets.
            // The number is all that fits, so the parent's title goes in the hover
            // text.
            <span
              title={t('tasks.parentHint', { number: issue.parent.number, title: issue.parent.title })}
              className="text-xs text-text-secondary bg-surface px-2 py-0.5 rounded flex-shrink-0"
            >
              {t('tasks.parent', { number: issue.parent.number })}
            </span>
          )}
          <span className="text-sm text-ink truncate">{issue.title}</span>
        </div>
        {/* Rendered only when it has something on it: an empty second line would
            add a row's worth of height to every issue with no author, no children
            and no labels. */}
        {(issue.author || issue.subIssues || issue.labels.length > 0) && (
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            {issue.author && (
              <span
                title={t('tasks.authorHint', { login: issue.author })}
                className="text-xs text-text-secondary"
              >
                @{issue.author}
              </span>
            )}
            {issue.subIssues && (
              <span className="text-xs text-text-secondary">{subIssuesLabel(issue.subIssues, t)}</span>
            )}
            {issue.labels.map((label) => (
              <StatusPill key={label} status={label} />
            ))}
          </div>
        )}
      </div>
      {/* Kept on the first line, to the left of the buttons: it is the one piece of
          metadata that changes what you would DO with the row. */}
      {hasAgent && <AgentMarker t={t} />}
      <RowLinks
        url={issue.url}
        openLabel={openLabel}
        copyLabel={copyLabel}
        copiedLabel={copiedLabel}
      />
    </div>
  )
}

/**
 * A Jira status category as a pill.
 *
 * Deliberately NOT `StatusPill`: that component reads `STATUS_CONFIG`, whose keys
 * are the `/magic:*` workflow's own statuses ("in review", "PR created"). A Jira
 * status is a site's word for a column, so every one of them would miss and render
 * neutral — including the In Progress rows this page exists to distinguish.
 *
 * Coloured by CATEGORY and labelled by NAME, which is the split `JiraStatusCategory`
 * exists for: the category is fixed by Jira and can be branched on, the name is what
 * the reader knows their board by and is the only thing worth showing.
 */
const JIRA_STATUS_CLASS: Record<JiraStatusCategory, string> = {
  new: 'bg-surface text-text-secondary',
  indeterminate: 'bg-accent/15 text-accent',
  // Never reached today — the main process drops finished tickets — but a card that
  // silently mis-coloured one would be worse than a table with three rows in it.
  done: 'bg-green/15 text-green',
}

export function JiraStatusPill({ name, category }: { name: string; category: JiraStatusCategory }) {
  // The two VALUES rather than the ticket they came from, because the detail panel
  // feeds it the status of its own read: that page re-asks Jira for the status
  // precisely so a ticket transitioned since the list was drawn stops showing the
  // stale word, and a pill typed on `JiraTaskIssue` could only be handed the stale
  // one back.
  //
  // JUST THE PILL. It owned the whole second line of the row until that line grew a
  // reporter and a set of labels to share with — so the flex wrapper moved out to the
  // row, which is the side that knows what else is on it. `flex-shrink-0` is what
  // keeps a bare span from stretching to the column it sits in, which is what the
  // wrapper used to be for.
  if (!name) return null
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${JIRA_STATUS_CLASS[category]}`}>
      {name}
    </span>
  )
}

/**
 * One sprint ticket, in `IssueRow`'s layout — the same two lines, filled with Jira's
 * own facts.
 *
 * It used to be that layout MINUS most of it: a key, a title and a status pill,
 * against a GitHub row carrying an author and its labels. The asymmetry was not a
 * design, it was what the sprint query happened to ask for, and on a page that now
 * shows both trackers side by side it read as Jira being the poorer half. The query
 * asks for the labels and the reporter as of this story (see `SPRINT_FIELDS`), and
 * the row puts them where their GitHub counterparts sit.
 *
 * CLICKABLE, exactly as its GitHub twin is, and opening the same page. It was
 * deliberately not, one story ago, because the panel behind it was typed on an issue
 * NUMBER and could only have said "not found" about a ticket — the selection is
 * discriminated by tracker now, and `tasks:getJiraIssueDetail` is what answers on
 * this side.
 *
 * Its shell is `IssueRow`'s, through `rowActivation` — one keyboard contract and one
 * set of row classes for both trackers.
 *
 * `t` arrives as a prop for `IssueRow`'s reason: one catalogue listener per ticket
 * to translate the same two constants is a listener per ticket too many.
 */
function JiraIssueRow({
  issue,
  openLabel,
  copyLabel,
  copiedLabel,
  t,
  hasAgent,
  onSelect,
}: {
  issue: JiraTaskIssue
  openLabel: string
  copyLabel: string
  copiedLabel: string
  t: Translate
  hasAgent: boolean
  onSelect: (key: string) => void
}) {
  return (
    <div {...rowActivation(() => onSelect(issue.key))}>
      {/* On the row and not on the title's line, for `IssueRow`'s reason. */}
      <TrackerTile tracker="jira" size="sm" title="Jira" />
      <div className="flex-1 min-w-0 flex flex-col gap-1">
        <div className="flex items-center gap-3 min-w-0">
          <TicketBadge ticketId={issue.key} />
          <span className="text-sm text-ink truncate">{issue.title}</span>
        </div>
        {/* `IssueRow`'s second line, with Jira's own three facts on it. The status
            leads because it is the one this page filters on; the reporter and the
            labels then sit exactly where the GitHub row puts its author and its
            labels, so a mixed page reads down one column rather than two.

            Guarded as a whole, for the GitHub row's reason: an empty second line
            would add a row's worth of height to every ticket that has none of the
            three. */}
        {(issue.statusName || issue.reporter || issue.labels.length > 0) && (
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <JiraStatusPill name={issue.statusName} category={issue.statusCategory} />
            {issue.reporter && (
              // The display name bare, where the GitHub row prefixes a login with `@`:
              // "Ada Lovelace" is a name and not a handle, and `@Ada Lovelace` reads as
              // a mention of an account that does not exist.
              <span
                title={t('tasks.jira.reporterHint', { name: issue.reporter })}
                className="text-xs text-text-secondary truncate max-w-[16rem]"
              >
                {issue.reporter}
              </span>
            )}
            {issue.labels.map((label) => (
              <StatusPill key={label} status={label} />
            ))}
          </div>
        )}
      </div>
      {/* Not decoration on this half: the one In Progress ticket allowed on the page
          is the one somebody is on, so the marker is the reason the row is here. */}
      {hasAgent && <AgentMarker t={t} />}
      {/* Both buttons hang off a browse URL, which needs a Jira site to have been
          resolved. A repository that declares only a project key, read with a
          credential whose site URL is missing, has no link to offer — and a dead
          "Open" button is a worse answer than no button. The row itself still opens
          the panel, which needs no site at all. */}
      {issue.url && (
        <RowLinks
          url={issue.url}
          openLabel={openLabel}
          copyLabel={copyLabel}
          copiedLabel={copiedLabel}
        />
      )}
    </div>
  )
}

/**
 * The failure of ONE repository, inside that repository's own card.
 *
 * Rendered here rather than as a page-level banner precisely so the other
 * repositories keep rendering: a token that cannot see one private repo is not a
 * reason to hide everyone else's backlog, and one project key that no longer exists
 * is not a reason to hide the sprints that do.
 */
function ErrorRow({ row }: { row: TaskRow }) {
  // Picked before the box is drawn, and inside the tracker branch: `row` is a union
  // whose two members carry two different error types, and only the discriminant
  // narrows `row.error` to one of them.
  const lines = row.tracker === 'jira'
    ? row.error && <JiraErrorLines error={row.error} />
    : row.error && <TaskErrorLines error={row.error} />
  if (!lines) return null

  return (
    <div className="flex items-start gap-3 pl-9 pr-4 py-3 min-w-0 border-t border-line-subtle">
      <AlertTriangle className="w-4 h-4 text-orange flex-shrink-0 mt-0.5" />
      <div className="min-w-0">{lines}</div>
    </div>
  )
}

/**
 * Memoised, and handed a `onToggle` that takes the key rather than a closure over
 * it: folding one card must not re-render every other card's rows, and with a
 * stable callback plus the memoised `row` it no longer does.
 */
export const TasksRepoSection = memo(function TasksRepoSection({
  row,
  expanded,
  onToggle,
  onSelect,
  agentedIssues,
}: {
  row: TaskRow
  expanded: boolean
  /**
   * Takes the ROW key — repository and tracker — not the config key. An undecided
   * repository has two cards, and keyed on the repository alone one chevron folded
   * both of them.
   */
  onToggle: (key: string) => void
  /** What the page opens on. See `TaskSelection`. */
  onSelect: (selection: TaskSelection) => void
  /** Ticket ids of this repository's issues that already have an agent. Built once for the page. */
  agentedIssues: ReadonlySet<string>
}) {
  const t = useT()
  const openLabel = t(row.tracker === 'jira' ? 'tasks.jira.openIssue' : 'tasks.openIssue')
  const copyLabel = t('tasks.copyLink')
  const copiedLabel = t('tasks.copyLinkDone')
  const Chevron = expanded ? ChevronDown : ChevronRight
  // A failed group has no issues and still has something to unfold: the reason.
  const hasRows = row.issues.length > 0 || !!row.error

  return (
    <div className="rounded-lg bg-surface-subtle border border-line-field overflow-hidden">
      <button
        onClick={() => onToggle(rowKey(row))}
        disabled={!hasRows}
        className={`w-full flex items-center gap-3 px-4 py-3 min-w-0 text-left transition-colors ${
          hasRows ? 'hover:bg-surface-strong' : 'cursor-default'
        }`}
      >
        <Chevron className={`w-4 h-4 flex-shrink-0 ${hasRows ? 'text-text-secondary' : 'opacity-0'}`} />
        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: row.color }} />
        {/* Name and tracker in one flexing box rather than as two siblings of the
            header: the tracker has to sit NEXT TO the name, and the name is what
            gives way when the row is narrow. `min-w-0` so `truncate` can actually
            shrink it — a flex item's automatic minimum is its content otherwise. */}
        <span className="flex-1 min-w-0 flex items-baseline gap-1.5">
          <span className="text-sm font-medium text-ink truncate">{row.name}</span>
          {/* Only when this repository has a twin card — see `TaskRow.showTracker`.
              Untranslated on purpose: "GitHub" and "Jira" are product names, and a
              catalogue entry per language would only offer somewhere for them to be
              spelled wrong. */}
          {row.showTracker && (
            <span className="text-xs text-text-secondary/60 flex-shrink-0">
              · {row.tracker === 'jira' ? 'Jira' : 'GitHub'}
            </span>
          )}
        </span>
        <HeaderBadge row={row} t={t} />
      </button>

      {expanded && <ErrorRow row={row} />}
      {/* One branch per tracker, top to bottom, because the two rows do not share
          their identity — a number against a key — and that is exactly what
          `TaskSelection` is discriminated on. The affordances are the same now: both
          open the detail page. */}
      {expanded && row.tracker === 'jira' && row.issues.map((issue) => (
        <JiraIssueRow
          key={issue.key}
          issue={issue}
          openLabel={openLabel}
          copyLabel={copyLabel}
          copiedLabel={copiedLabel}
          t={t}
          // Through the same normaliser the index was built with: Jira is
          // case-insensitive about keys, and an agent whose ticket was typed
          // `per-1234` is on `PER-1234`.
          hasAgent={agentedIssues.has(normalizeTicketId(issue.key))}
          onSelect={(key) => onSelect({ tracker: 'jira', configKey: row.configKey, key })}
        />
      ))}
      {expanded && row.tracker === 'github' && row.issues.map((issue) => (
        <IssueRow
          key={issue.number}
          issue={issue}
          openLabel={openLabel}
          copyLabel={copyLabel}
          copiedLabel={copiedLabel}
          t={t}
          hasAgent={agentedIssues.has(String(issue.number))}
          onSelect={(number) => onSelect({ tracker: 'github', configKey: row.configKey, number })}
        />
      ))}
    </div>
  )
})

/**
 * The card header's right-hand word: a count, or why there is not one.
 *
 * The two Jira outcomes that are states rather than failures get their own word and
 * a neutral pill (see `JIRA_NEUTRAL_BADGE`), so the reader can tell them from a
 * project key that no longer resolves without unfolding the card.
 */
function HeaderBadge({ row, t }: { row: TaskRow; t: Translate }) {
  if (row.error) {
    // Only the Jira half has outcomes that are not failures; every GitHub error is
    // one, so the lookup is skipped rather than given a table of its own.
    const neutral = row.tracker === 'jira' ? JIRA_NEUTRAL_BADGE[row.error.error] : undefined
    return (
      <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
        neutral ? 'bg-surface text-text-secondary' : 'bg-orange/15 text-orange'
      }`}>
        {t(neutral ?? 'tasks.failed')}
      </span>
    )
  }

  return (
    <span className="text-xs text-text-secondary flex-shrink-0">
      {row.issues.length === 0
        ? t('tasks.noOpenIssues')
        : row.tracker === 'jira'
          ? sprintCountLabel(row.issues.length, t, row.truncated)
          : openCountLabel(row.issues.length, t, row.totalOpen)}
    </span>
  )
}
