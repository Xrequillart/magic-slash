import { memo } from 'react'
import { AlertTriangle, ChevronDown, ChevronRight, ExternalLink, Settings } from 'lucide-react'
import type {
  JiraStatusCategory,
  JiraTaskError,
  JiraTaskIssue,
  JiraTaskStatusError,
  PRWatchError,
  TaskIssue,
} from '../../../types'
import type { TaskRow } from '../../utils/taskRows'
import { useStore } from '../../store'
import { normalizeTicketId } from '../../utils/taskAgents'
import { useT, type MessageKey, type Translate } from '../../i18n'
import { StatusPill, TicketBadge } from '../Dashboard/parts'
import { CopyLinkButton } from '../../components/CopyLinkButton'

/**
 * One repository's card, in the shape the Team page's `RepoCard` established:
 * a collapsible header carrying the repo's colour dot and a count, and rows under
 * it. Same markup, same classes — two lists of "things grouped by repository" that
 * looked different would be a bug nobody could name.
 */

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
function JiraErrorLines({ error }: { error: JiraTaskStatusError }) {
  const t = useT()
  return (
    <div className="flex flex-col gap-2 min-w-0">
      <ErrorLines {...JIRA_ERROR_KEYS[error.error]} />
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
 * `stopPropagation` is the one genuine difference: a GitHub row is itself a button
 * that opens the issue's page, so without it one click would do both. A Jira row is
 * a plain div and has nothing to stop.
 */
function RowLinks({
  url,
  openLabel,
  copyLabel,
  copiedLabel,
  stopPropagation,
}: {
  url: string
  openLabel: string
  copyLabel: string
  copiedLabel: string
  stopPropagation?: boolean
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
          if (stopPropagation) e.stopPropagation()
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
 * A div with a `role`, not a `<button>`: the row contains a button of its own,
 * and a button inside a button is invalid markup no amount of `stopPropagation`
 * fixes.
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
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(issue.number)}
      onKeyDown={(e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return
        e.preventDefault()
        onSelect(issue.number)
      }}
      className="flex items-center gap-3 pl-9 pr-4 py-2.5 min-w-0 border-t border-line-subtle cursor-pointer transition-colors hover:bg-surface"
    >
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
        stopPropagation
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

function JiraStatusPill({ issue }: { issue: JiraTaskIssue }) {
  // The whole second line, wrapper included, so the "has this site named a status?"
  // question is asked once. Returning a bare span would let it stretch to the width
  // of the flex column it sits in, and a rounded-full pill the width of the card is
  // not a pill.
  if (!issue.statusName) return null
  return (
    <div className="flex items-center gap-2 flex-wrap min-w-0">
      <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${JIRA_STATUS_CLASS[issue.statusCategory]}`}>
        {issue.statusName}
      </span>
    </div>
  )
}

/**
 * One sprint ticket, in `IssueRow`'s layout minus the parts Jira does not have.
 *
 * NOT CLICKABLE, and that is a scope decision rather than an oversight: the detail
 * panel and starting an agent are the next story, and the row identity every piece
 * of that plumbing is typed on is a `number` a Jira ticket does not have. A row that
 * opened a panel which could only say "not found" is worse than a row that does not
 * pretend to be a button — so this is a plain div, and the two buttons on it (copy,
 * open in Jira) are the whole of what it does.
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
}: {
  issue: JiraTaskIssue
  openLabel: string
  copyLabel: string
  copiedLabel: string
  t: Translate
  hasAgent: boolean
}) {
  return (
    <div className="flex items-center gap-3 pl-9 pr-4 py-2.5 min-w-0 border-t border-line-subtle">
      <div className="flex-1 min-w-0 flex flex-col gap-1">
        <div className="flex items-center gap-3 min-w-0">
          <TicketBadge ticketId={issue.key} />
          <span className="text-sm text-ink truncate">{issue.title}</span>
        </div>
        <JiraStatusPill issue={issue} />
      </div>
      {/* Not decoration on this half: the one In Progress ticket allowed on the page
          is the one somebody is on, so the marker is the reason the row is here. */}
      {hasAgent && <AgentMarker t={t} />}
      {/* Both buttons hang off a browse URL, which needs a Jira site to have been
          resolved. A repository that declares only a project key, read with a
          credential whose site URL is missing, has no link to offer — and a dead
          "Open" button is a worse answer than no button. */}
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
  onToggle: (configKey: string) => void
  /** Takes the config key as well as the number: an issue number alone is not an identity. */
  onSelect: (configKey: string, number: number) => void
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
        onClick={() => onToggle(row.configKey)}
        disabled={!hasRows}
        className={`w-full flex items-center gap-3 px-4 py-3 min-w-0 text-left transition-colors ${
          hasRows ? 'hover:bg-surface-strong' : 'cursor-default'
        }`}
      >
        <Chevron className={`w-4 h-4 flex-shrink-0 ${hasRows ? 'text-text-secondary' : 'opacity-0'}`} />
        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: row.color }} />
        <span className="text-sm font-medium text-ink truncate flex-1">{row.name}</span>
        <HeaderBadge row={row} t={t} />
      </button>

      {expanded && <ErrorRow row={row} />}
      {/* One branch per tracker, top to bottom, because the two rows share neither
          their identity (a number against a key) nor their affordances (a GitHub row
          opens a detail page; a Jira row cannot yet). */}
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
          onSelect={(number) => onSelect(row.configKey, number)}
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
