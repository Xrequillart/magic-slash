import { useEffect, useState } from 'react'
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  CheckCircle2,
  Clock,
  GitMerge,
  GitPullRequest,
  GitPullRequestClosed,
  GitPullRequestDraft,
  Loader2,
  MessageSquare,
  MessagesSquare,
  MinusCircle,
  RefreshCw,
  Users,
  Wrench,
  XCircle,
} from 'lucide-react'
import { formatTimestamp } from './utils'
import { useT, type MessageKey, type Translate } from '../../i18n'
import { showToast } from '../Toast'
import type { PRChecksSummary, PRState, PRWatchError, RepositoryMetadata } from '../../../types'

interface PRWatchCardProps {
  /** The card exists as soon as this is set — never gated on `prReviews.enabled`. */
  prUrl: string
  /** Terminal id the slash commands are typed into. */
  agentId: string
  /**
   * Everything below is optional and frequently absent: `repositoryMetadata` lives
   * in a jsonb copied back verbatim, so rows written before this feature carry
   * `prUrl` and little else. Every branch here has to survive that.
   */
  metadata: RepositoryMetadata | undefined
}

const REVIEW_STATUS_LABELS: Record<NonNullable<RepositoryMetadata['prReviewStatus']>, MessageKey> = {
  approved: 'prReview.approved',
  'changes-requested': 'prReview.changesRequested',
  commented: 'prReview.commented',
  pending: 'prReview.pending',
}

const STATE_LABELS: Record<PRState, MessageKey> = {
  open: 'agentInfo.pr.state.open',
  draft: 'agentInfo.pr.state.draft',
  merged: 'agentInfo.pr.state.merged',
  closed: 'agentInfo.pr.state.closed',
}

// Badge colours, not a status colour scale: merged is purple on GitHub and the
// sidebar keeps that association so the state reads at a glance.
const STATE_BADGE: Record<PRState, string> = {
  open: 'bg-green/10 text-green',
  draft: 'bg-surface-strong text-text-secondary',
  merged: 'bg-purple/10 text-purple',
  closed: 'bg-red/10 text-red',
}

// Each failure names its own fix: an error with no remedy is the same dead end as
// the empty card this replaces.
const WATCH_ERROR_LABELS: Record<PRWatchError, { label: MessageKey; fix: MessageKey }> = {
  'no-token': { label: 'agentInfo.pr.error.noToken', fix: 'agentInfo.pr.error.noTokenFix' },
  'not-found': { label: 'agentInfo.pr.error.notFound', fix: 'agentInfo.pr.error.notFoundFix' },
  forbidden: { label: 'agentInfo.pr.error.forbidden', fix: 'agentInfo.pr.error.forbiddenFix' },
  'rate-limited': { label: 'agentInfo.pr.error.rateLimited', fix: 'agentInfo.pr.error.rateLimitedFix' },
  network: { label: 'agentInfo.pr.error.network', fix: 'agentInfo.pr.error.networkFix' },
}

// One row per bucket of the checks summary, rendered from the counts alone.
const CHECK_COUNTERS = [
  { key: 'passed', Icon: CheckCircle2, tone: 'text-green', label: 'agentInfo.pr.checkPassed', spin: false },
  { key: 'failed', Icon: XCircle, tone: 'text-red', label: 'agentInfo.pr.checkFailed', spin: false },
  { key: 'running', Icon: Loader2, tone: 'text-blue', label: 'agentInfo.pr.checkRunning', spin: true },
  { key: 'skipped', Icon: MinusCircle, tone: 'text-text-secondary/60', label: 'agentInfo.pr.checkSkipped', spin: false },
] as const satisfies readonly {
  key: keyof PRChecksSummary
  Icon: typeof CheckCircle2
  tone: string
  label: MessageKey
  spin: boolean
}[]

// `undefined` is its own entry, not a missing one: GitHub answers UNKNOWN while it
// computes mergeability, and that must never render as "conflicts".
const MERGEABLE_ROWS = {
  true: { Icon: GitMerge, tone: 'text-green', label: 'agentInfo.pr.mergeable' },
  false: { Icon: AlertTriangle, tone: 'text-red', label: 'agentInfo.pr.conflicts' },
  unknown: { Icon: CheckCircle, tone: 'text-text-secondary/60', label: 'agentInfo.pr.mergeableUnknown' },
} as const satisfies Record<string, { Icon: typeof GitMerge; tone: string; label: MessageKey }>

interface CommentRow {
  label: MessageKey
  value: number
}

function StateIcon({ state }: { state: PRState }) {
  switch (state) {
    case 'merged':
      return <GitMerge className="w-3.5 h-3.5 text-purple" />
    case 'closed':
      return <GitPullRequestClosed className="w-3.5 h-3.5 text-red" />
    case 'draft':
      return <GitPullRequestDraft className="w-3.5 h-3.5 text-text-secondary" />
    case 'open':
      return <GitPullRequest className="w-3.5 h-3.5 text-green" />
  }
}

function ReviewStatusIcon({ status }: { status: NonNullable<RepositoryMetadata['prReviewStatus']> }) {
  switch (status) {
    case 'approved':
      return <CheckCircle2 className="w-3.5 h-3.5 text-green" />
    case 'changes-requested':
      return <AlertCircle className="w-3.5 h-3.5 text-red" />
    case 'commented':
      return <MessageSquare className="w-3.5 h-3.5 text-blue" />
    case 'pending':
      return <Clock className="w-3.5 h-3.5 text-text-secondary" />
  }
}

async function runSlashCommand(terminalId: string, command: string, t: Translate) {
  try {
    const result = await window.electronAPI.prWatcher.sendCommand(terminalId, command)
    if (result.launched) {
      showToast(t('toast.commandSent', { command }), 'success')
    } else if (result.copied) {
      showToast(t('toast.commandCopied', { command }), 'warning')
    }
  } catch (err) {
    showToast(err instanceof Error ? err.message : t('toast.commandFailed'), 'error')
  }
}

/** A short list of check names, capped upstream at 5. */
function CheckNames({ names, tone, label }: { names: string[]; tone: string; label: string }) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      <span className="text-[10px] text-text-secondary/50">{label}</span>
      {names.map((name) => (
        <span
          key={name}
          className={`px-1.5 py-0.5 rounded bg-surface-strong text-[10px] font-mono truncate max-w-[140px] ${tone}`}
          title={name}
        >
          {name}
        </span>
      ))}
    </div>
  )
}

export function PRWatchCard({ prUrl, agentId, metadata }: PRWatchCardProps) {
  const t = useT()
  const [refreshing, setRefreshing] = useState(false)

  // The "checked X ago" label goes stale on its own; re-render every 30s like the
  // usage card does, rather than only when a poll happens to land.
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(id)
  }, [])

  const prNumber = prUrl.match(/\/pull\/(\d+)/)?.[1]

  // `prState` is the field to trust, but it is absent from every row written
  // before this feature — those only ever carried the two booleans. Falling back
  // to them keeps a merged PR readable instead of unlabelled, and when nothing at
  // all is known the badge is dropped rather than guessed as "open".
  const state: PRState | undefined =
    metadata?.prState ??
    (metadata?.prMerged === true ? 'merged' : metadata?.prClosed === true ? 'closed' : undefined)

  const checks = metadata?.prChecks
  const runningChecks = metadata?.prRunningChecks ?? []
  const failedChecks = metadata?.prFailedChecks ?? []
  const counts = metadata?.prCommentCounts
  const authors = metadata?.prCommentAuthors ?? metadata?.prReviewers ?? []
  const watchError = metadata?.prWatchError

  // A PR that is finished has nothing left to merge: the row would only ever say
  // "unknown" on the old rows and "no conflicts" on the new ones.
  const showMergeable = state !== 'merged' && state !== 'closed'

  // There is something to address only once a reviewer has actually spoken, and
  // something to close out only once the PR is merged.
  const showResolve =
    metadata?.prReviewStatus === 'changes-requested' || metadata?.prReviewStatus === 'commented'
  const showDone = state === 'merged' || metadata?.prMerged === true

  // Legacy rows have no `prLastCheckedAt`; the review timestamp is the closest
  // honest answer, and "never" is better than a blank when neither exists.
  const checkedAt = metadata?.prLastCheckedAt ?? metadata?.prReviewUpdatedAt
  const checkedLabel =
    typeof checkedAt === 'number'
      ? t('agentInfo.pr.lastChecked', { time: t('relative.ago', { time: formatTimestamp(checkedAt, now, t) }) })
      : t('agentInfo.pr.neverChecked')

  // Counters are only worth a row once one of them is non-zero. The pre-split
  // total is the fallback for rows written before the buckets existed.
  const legacyCommentCount = metadata?.prReviewCommentCount ?? 0
  const splitRows: CommentRow[] = counts
    ? [
      { label: 'agentInfo.pr.commentsInline', value: counts.inline },
      { label: 'agentInfo.pr.commentsConversation', value: counts.conversation },
      { label: 'agentInfo.pr.commentsReviews', value: counts.reviewSummaries },
    ]
    : legacyCommentCount > 0
      ? [{ label: 'agentInfo.pr.comments', value: legacyCommentCount }]
      : []
  const commentRows = splitRows.filter((row) => row.value > 0)

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      // `refreshed: false` means the shared 15 s throttle swallowed the call and no
      // request was made. Silently ignoring it gives a spinner flash and unchanged
      // data with no explanation, which reads as "the button is broken" — say so
      // instead. Not an error, so it goes out as a warning rather than an error toast.
      const { refreshed } = await window.electronAPI.prWatcher.refresh(prUrl)
      if (!refreshed) showToast(t('agentInfo.pr.refreshThrottled'), 'warning')
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('agentInfo.pr.refreshFailed'), 'error')
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <div className="mt-2 bg-surface rounded-md p-2 space-y-2 border border-line-subtle">
      {/* Header — PR number, state badge, freshness and a manual poll */}
      <div className="flex items-center gap-1.5 text-xs">
        {state ? <StateIcon state={state} /> : <GitPullRequest className="w-3.5 h-3.5 text-text-secondary" />}
        <span className="text-ink/80 font-medium">
          {prNumber ? t('agentInfo.pr.number', { number: prNumber }) : t('agentInfo.pr.title')}
        </span>
        {state && (
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide ${STATE_BADGE[state]}`}>
            {t(STATE_LABELS[state])}
          </span>
        )}
        <span className="ml-auto flex items-center gap-1">
          <span className="text-[10px] text-text-secondary/50">{checkedLabel}</span>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            title={t('agentInfo.pr.refresh')}
            className="p-1 rounded text-text-secondary/50 hover:text-ink hover:bg-surface-strong transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </span>
      </div>

      {/* Why the watcher is blind, and how to fix it */}
      {watchError && (
        <div className="flex items-start gap-1.5 rounded bg-red/10 border border-red/20 p-1.5">
          <AlertTriangle className="w-3.5 h-3.5 text-red flex-shrink-0 mt-px" />
          <div className="min-w-0">
            <div className="text-[11px] text-red font-medium">{t(WATCH_ERROR_LABELS[watchError].label)}</div>
            <div className="text-[10px] text-text-secondary/70">{t(WATCH_ERROR_LABELS[watchError].fix)}</div>
          </div>
        </div>
      )}

      {/* Review status — the one signal the oldest rows do carry */}
      {metadata?.prReviewStatus && (
        <div className="flex items-center gap-1.5 text-xs">
          <ReviewStatusIcon status={metadata.prReviewStatus} />
          <span className="text-ink/80">{t(REVIEW_STATUS_LABELS[metadata.prReviewStatus])}</span>
        </div>
      )}

      {/* Checks */}
      {checks && (
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-text-secondary/70">{t('agentInfo.pr.checks')}</span>
            {checks.total > 0 ? (
              <>
                <span className="text-ink/80 font-medium tabular-nums">
                  {t('agentInfo.pr.checksPassed', { passed: checks.passed, total: checks.total })}
                </span>
                <span className="ml-auto flex items-center gap-1.5 text-[10px] tabular-nums">
                  {CHECK_COUNTERS.filter((counter) => checks[counter.key] > 0).map(({ key, Icon, tone, label, spin }) => (
                    <span key={key} className={`flex items-center gap-0.5 ${tone}`} title={t(label)}>
                      <Icon className={`w-3 h-3 ${spin ? 'animate-spin' : ''}`} />
                      {checks[key]}
                    </span>
                  ))}
                </span>
              </>
            ) : (
              <span className="text-text-secondary/50 italic">{t('agentInfo.pr.noChecks')}</span>
            )}
          </div>
          {runningChecks.length > 0 && (
            <CheckNames names={runningChecks} tone="text-blue" label={t('agentInfo.pr.runningChecks')} />
          )}
          {failedChecks.length > 0 && (
            <CheckNames names={failedChecks} tone="text-red" label={t('agentInfo.pr.failedChecks')} />
          )}
        </div>
      )}

      {/* Mergeability — absent means unknown, never a conflict */}
      {showMergeable && (() => {
        const { Icon, tone, label } = MERGEABLE_ROWS[String(metadata?.prMergeable ?? 'unknown') as keyof typeof MERGEABLE_ROWS]
        return (
          <div className="flex items-center gap-1.5 text-xs">
            <Icon className={`w-3.5 h-3.5 ${tone}`} />
            <span className={tone}>{t(label)}</span>
          </div>
        )
      })()}

      {/* Comment counters, split by where they were left */}
      {commentRows.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-text-secondary/70">
          <MessagesSquare className="w-3.5 h-3.5 text-blue" />
          {commentRows.map((row) => (
            <span key={row.label} className="flex items-center gap-1">
              <span className="text-ink/80 font-medium tabular-nums">{row.value}</span>
              {t(row.label)}
            </span>
          ))}
        </div>
      )}

      {/* Who said it */}
      {authors.length > 0 && (
        <div className="flex items-center gap-1.5 text-[10px] text-text-secondary/60 min-w-0">
          <Users className="w-3 h-3 flex-shrink-0" />
          <span className="truncate" title={authors.join(', ')}>
            {t('agentInfo.pr.authors')} {authors.join(', ')}
          </span>
        </div>
      )}

      {/* The commands move into the card, but they keep the conditions that made
          them meaningful: offering "/magic:done" on a freshly opened PR, or
          "/magic:resolve" with no review to address, is an affordance that lies.
          Legacy rows carry `prReviewStatus` and `prMerged`, so both still work
          without any of the new fields. */}
      {(showResolve || showDone) && (
        <div className="flex items-center gap-1.5 pt-0.5">
          {showResolve && (
            <button
              onClick={() => runSlashCommand(agentId, '/magic:resolve', t)}
              className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 bg-red/10 hover:bg-red/20 border border-red/20 rounded-md text-red text-xs font-medium transition-colors"
            >
              <Wrench className="w-3 h-3" />
              {t('agentInfo.launchResolve')}
            </button>
          )}
          {showDone && (
            <button
              onClick={() => runSlashCommand(agentId, '/magic:done', t)}
              className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 bg-green/10 hover:bg-green/20 border border-green/20 rounded-md text-green text-xs font-medium transition-colors"
            >
              <CheckCircle className="w-3 h-3" />
              {t('agentInfo.launchDone')}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
