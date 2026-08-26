import { memo } from 'react'
import { AlertTriangle, ChevronDown, ChevronRight, ExternalLink } from 'lucide-react'
import type { PRWatchError, TaskIssue } from '../../../types'
import type { TaskRow } from '../../utils/taskRows'
import { useT, type MessageKey, type Translate } from '../../i18n'
import { StatusPill, TicketBadge } from '../Dashboard/parts'

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
 * A failed GitHub read, said the one way this page says it: what went wrong, then
 * what to do about it.
 *
 * Exported because the issue page reads through the same GraphQL error ladder, so
 * a private repository that fails on the list must not fail differently — nor look
 * different — when one of its issues is opened. The caller supplies the surrounding
 * box; this owns the words and their typography.
 */
export function TaskErrorLines({ error }: { error: { error: PRWatchError } }) {
  const t = useT()
  const keys = ERROR_KEYS[error.error]

  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <span className="text-sm text-ink">{t(keys.title)}</span>
      <span className="text-xs text-text-secondary/70">{t(keys.fix)}</span>
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
  t,
  hasAgent,
  onSelect,
}: {
  issue: TaskIssue
  openLabel: string
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
      {hasAgent && (
        // The repository dot's own idiom, in the accent: an issue somebody is
        // already on. The word is there because a bare coloured dot says nothing.
        // Kept on the first line, to the left of the button: it is the one piece of
        // metadata that changes what you would DO with the row.
        <span
          title={t('tasks.hasAgentHint')}
          className="flex items-center gap-1.5 text-xs text-text-secondary whitespace-nowrap flex-shrink-0"
        >
          <span className="w-2 h-2 rounded-full flex-shrink-0 bg-accent" />
          {t('tasks.hasAgent')}
        </span>
      )}
      <button
        onClick={(e) => {
          // The row underneath opens the issue's page; this button opens a
          // browser. Without this, one click would do both.
          e.stopPropagation()
          window.electronAPI.shell.openExternal(issue.url)
        }}
        title={openLabel}
        className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-text-secondary border border-line rounded-lg hover:bg-surface-strong hover:text-ink transition-colors flex-shrink-0"
      >
        <ExternalLink className="w-3.5 h-3.5" />
        <span>{openLabel}</span>
      </button>
    </div>
  )
}

/**
 * The failure of ONE repository, inside that repository's own card.
 *
 * Rendered here rather than as a page-level banner precisely so the other
 * repositories keep rendering: a token that cannot see one private repo is not a
 * reason to hide everyone else's backlog.
 */
function ErrorRow({ error }: { error: NonNullable<TaskRow['error']> }) {
  return (
    <div className="flex items-start gap-3 pl-9 pr-4 py-3 min-w-0 border-t border-line-subtle">
      <AlertTriangle className="w-4 h-4 text-orange flex-shrink-0 mt-0.5" />
      <div className="min-w-0">
        <TaskErrorLines error={error} />
      </div>
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
  const openLabel = t('tasks.openIssue')
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
        {row.error ? (
          <span className="text-xs px-2 py-0.5 rounded-full bg-orange/15 text-orange flex-shrink-0">
            {t('tasks.failed')}
          </span>
        ) : (
          <span className="text-xs text-text-secondary flex-shrink-0">
            {row.issues.length === 0
              ? t('tasks.noOpenIssues')
              : openCountLabel(row.issues.length, t, row.totalOpen)}
          </span>
        )}
      </button>

      {expanded && row.error && <ErrorRow error={row.error} />}
      {expanded && row.issues.map((issue) => (
        <IssueRow
          key={issue.number}
          issue={issue}
          openLabel={openLabel}
          t={t}
          hasAgent={agentedIssues.has(String(issue.number))}
          onSelect={(number) => onSelect(row.configKey, number)}
        />
      ))}
    </div>
  )
})
