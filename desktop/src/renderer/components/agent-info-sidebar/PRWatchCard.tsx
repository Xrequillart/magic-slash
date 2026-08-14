import { useEffect, useState, type ReactNode } from 'react'
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  CheckCircle2,
  Clock,
  EyeOff,
  ExternalLink,
  GitMerge,
  GitPullRequest,
  GitPullRequestClosed,
  GitPullRequestDraft,
  ListChecks,
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
import { useStore } from '../../store'
import { useT, type MessageKey, type Translate } from '../../i18n'
import { showToast } from '../Toast'
import type { PRChecksSummary, PRState, PRWatchError, RepositoryMetadata } from '../../../types'

interface PRWatchCardProps {
  /**
   * The card exists as soon as this is set — never gated on `prReviews.enabled`.
   * When the watcher IS off, the card says so and offers to switch it back on
   * rather than quietly showing a snapshot nothing will ever update.
   */
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

/**
 * The review verdict as a full-width band, the way GitHub itself leads with it.
 * Its tone is the card's headline: everything below is detail, and someone
 * scanning the sidebar should get the verdict from the colour alone.
 */
const REVIEW_STATUS_BANNERS: Record<
  NonNullable<RepositoryMetadata['prReviewStatus']>,
  { label: MessageKey; tone: string }
> = {
  approved: { label: 'prReview.approved', tone: 'bg-green/10 text-green' },
  'changes-requested': { label: 'prReview.changesRequested', tone: 'bg-red/10 text-red' },
  commented: { label: 'prReview.commented', tone: 'bg-blue/10 text-blue' },
  pending: { label: 'prReview.pending', tone: 'bg-yellow/10 text-yellow' },
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

// One counter per bucket of the checks summary, rendered from the counts alone.
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

/**
 * The fields only the watcher ever writes.
 *
 * `/magic:pr` posts `prUrl` and nothing else (`status-server.ts`), so a single one
 * of these being present is the proof that a read actually landed. Their total
 * absence means the card has never been anything but a link — and rows that state
 * a fact ("mergeability unknown") must stay out of that state rather than
 * describe a snapshot nobody ever took.
 */
const WATCHER_WRITTEN_FIELDS = [
  'prState',
  'prMerged',
  'prClosed',
  'prChecks',
  'prMergeable',
  'prReviewStatus',
  'prReviewCommentCount',
  'prCommentCounts',
  'prReviewers',
  'prCommentAuthors',
  'prReviewUpdatedAt',
  'prWatchError',
  'prLastCheckedAt',
] as const satisfies readonly Exclude<keyof RepositoryMetadata, 'prUrl'>[]

interface CommentRow {
  label: MessageKey
  value: number
}

function StateIcon({ state, className = 'w-4 h-4' }: { state: PRState; className?: string }) {
  switch (state) {
    case 'merged':
      return <GitMerge className={`${className} text-purple`} />
    case 'closed':
      return <GitPullRequestClosed className={`${className} text-red`} />
    case 'draft':
      return <GitPullRequestDraft className={`${className} text-text-secondary`} />
    case 'open':
      return <GitPullRequest className={`${className} text-green`} />
  }
}

function ReviewStatusIcon({ status }: { status: NonNullable<RepositoryMetadata['prReviewStatus']> }) {
  switch (status) {
    case 'approved':
      return <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
    case 'changes-requested':
      return <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
    case 'commented':
      return <MessageSquare className="w-3.5 h-3.5 flex-shrink-0" />
    case 'pending':
      return <Clock className="w-3.5 h-3.5 flex-shrink-0" />
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

/**
 * One row of the body: a fixed icon gutter on the left, content on the right.
 *
 * The gutter is what makes the card scannable — every row starts its text on the
 * same x, so the icons read as a column of row types rather than as decoration
 * glued to the front of a sentence. `items-start` because a row is allowed to grow
 * (check names, a long author list) while its icon stays on the first line.
 */
function Cell({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <span className="w-4 flex-shrink-0 flex items-center justify-center pt-px">{icon}</span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
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
  const [enabling, setEnabling] = useState(false)

  // Absent means ON — the same reading as the watcher, the IPC handlers and the
  // Settings toggle. Anything else here would show "switched off" on a fresh
  // install that has never touched the setting.
  const watcherOff = useStore((state) => state.config?.prReviews?.enabled) === false
  const setConfig = useStore((state) => state.setConfig)

  // The "checked X ago" label goes stale on its own; re-render every 30s like the
  // usage card does, rather than only when a poll happens to land.
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(id)
  }, [])

  const parsed = prUrl.match(/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/)
  const repoSlug = parsed ? `${parsed[1]}/${parsed[2]}` : undefined
  const prNumber = parsed?.[3]

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

  // Whether a read has ever landed on this PR. A card built from `prUrl` alone
  // knows nothing, and must say nothing.
  const hasSnapshot = metadata !== undefined && WATCHER_WRITTEN_FIELDS.some((field) => metadata[field] !== undefined)

  // A PR that is finished has nothing left to merge: the row would only ever say
  // "unknown" on the old rows and "no conflicts" on the new ones. Gated on
  // `hasSnapshot` too — before the first read, "mergeability unknown" is the only
  // row in the body, and it reads as a verdict about the PR when it is really a
  // statement about the watcher.
  const showMergeable = hasSnapshot && state !== 'merged' && state !== 'closed'

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

  // The bar answers "how far along" at a glance; the colour answers "is it going
  // well". Red the moment anything failed — a run that is 9/10 green is still a
  // red PR — blue while work is in flight, green only once nothing is outstanding.
  const checksTone =
    checks && checks.failed > 0 ? 'bg-red' : checks && checks.running > 0 ? 'bg-blue' : 'bg-green'
  const checksProgress = checks && checks.total > 0 ? Math.round((checks.passed / checks.total) * 100) : 0

  // The body is the only part that can end up with nothing to say: an empty
  // `border-t` band under the header reads as a rendering bug, so it is rendered
  // only once at least one cell will be.
  const showBody =
    watcherOff ||
    watchError !== undefined ||
    metadata?.prReviewStatus !== undefined ||
    checks !== undefined ||
    showMergeable ||
    commentRows.length > 0 ||
    authors.length > 0

  const handleEnableWatcher = async () => {
    setEnabling(true)
    try {
      // The main process starts the watcher with an immediate tick, so there is
      // nothing to refresh on top: a `refresh()` here would only meet the shared
      // 15 s throttle and warn about a read already on its way.
      setConfig(await window.electronAPI.prWatcher.setEnabled(true))
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('agentInfo.pr.enableWatcherFailed'), 'error')
    } finally {
      setEnabling(false)
    }
  }

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
    <div className="mt-2 bg-surface rounded-lg border border-line-subtle overflow-hidden">
      {/* Header — the card's identity IS the link to GitHub, which is why the
          separate "View pull request" button below the card could go away. The
          refresh control stays a sibling: a button inside a button is invalid. */}
      <div className="flex items-center gap-1.5 p-2">
        <button
          onClick={() => window.electronAPI.shell.openExternal(prUrl)}
          title={t('agentInfo.viewPullRequest')}
          className="group flex items-center gap-2 min-w-0 flex-1 text-left rounded-md -m-1 p-1 hover:bg-surface-strong transition-colors"
        >
          <span className="w-4 flex-shrink-0 flex items-center justify-center">
            {state ? <StateIcon state={state} /> : <GitPullRequest className="w-4 h-4 text-text-secondary" />}
          </span>
          <span className="min-w-0">
            <span className="flex items-center gap-1">
              <span className="text-xs font-medium text-ink/90 truncate group-hover:text-accent transition-colors">
                {prNumber ? t('agentInfo.pr.number', { number: prNumber }) : t('agentInfo.pr.title')}
              </span>
              <ExternalLink className="w-3 h-3 flex-shrink-0 text-text-secondary/40 group-hover:text-accent transition-colors" />
            </span>
            {repoSlug && (
              <span className="block text-[10px] text-text-secondary/50 truncate" title={repoSlug}>
                {repoSlug}
              </span>
            )}
          </span>
        </button>
        {state && (
          <span className={`flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide ${STATE_BADGE[state]}`}>
            {t(STATE_LABELS[state])}
          </span>
        )}
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          title={t('agentInfo.pr.refresh')}
          className="flex-shrink-0 p-1 rounded text-text-secondary/50 hover:text-ink hover:bg-surface-strong transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Body — one cell per signal, all sharing the same icon gutter */}
      {showBody && <div className="border-t border-line-subtle p-2 space-y-2">
        {/* The setting, not a failure: the watcher is off, so nothing below will
            ever move. Top of the body and above the errors — an error explains one
            failed read, this explains why there are no reads at all — and it
            carries its own fix, the same way each watch error names one. */}
        {watcherOff && (
          <div className="flex items-start gap-2 rounded-md bg-surface-sunken px-2 py-1.5">
            <EyeOff className="w-3.5 h-3.5 text-text-secondary/60 flex-shrink-0 mt-px" />
            <div className="min-w-0 flex-1">
              <div className="text-[11px] text-ink/80 font-medium">{t('agentInfo.pr.watcherOff')}</div>
              <div className="text-[10px] text-text-secondary/70">
                {/* Two different situations behind one setting: a card carrying a
                    snapshot is dated, one carrying only the link is empty. */}
                {t(hasSnapshot ? 'agentInfo.pr.watcherOffStale' : 'agentInfo.pr.watcherOffEmpty')}
              </div>
            </div>
            <button
              onClick={handleEnableWatcher}
              disabled={enabling}
              className="flex-shrink-0 px-2 py-1 rounded-md bg-accent/10 hover:bg-accent/20 text-accent text-[11px] font-medium transition-colors disabled:opacity-50"
            >
              {t('agentInfo.pr.enableWatcher')}
            </button>
          </div>
        )}

        {/* Why the watcher is blind, and how to fix it. Above the verdict on
            purpose: a stale verdict is worth less than the reason it is stale. */}
        {watchError && (
          <div className="flex items-start gap-2 rounded-md bg-red/10 px-2 py-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-red flex-shrink-0 mt-px" />
            <div className="min-w-0">
              <div className="text-[11px] text-red font-medium">{t(WATCH_ERROR_LABELS[watchError].label)}</div>
              <div className="text-[10px] text-text-secondary/70">{t(WATCH_ERROR_LABELS[watchError].fix)}</div>
            </div>
          </div>
        )}

        {/* The verdict, as a band rather than a row */}
        {metadata?.prReviewStatus && (() => {
          const { label, tone } = REVIEW_STATUS_BANNERS[metadata.prReviewStatus]
          return (
            <div className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium ${tone}`}>
              <ReviewStatusIcon status={metadata.prReviewStatus} />
              {t(label)}
            </div>
          )
        })()}

        {/* Checks — count, progress bar, then the per-bucket counters */}
        {checks && (
          <Cell icon={<ListChecks className="w-3.5 h-3.5 text-text-secondary/60" />}>
            {checks.total > 0 ? (
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs">
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
                </div>
                <div className="h-1 rounded-full bg-surface-strong overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${checksTone}`} style={{ width: `${checksProgress}%` }} />
                </div>
                {(runningChecks.length > 0 || failedChecks.length > 0) && (
                  <div className="rounded-md bg-surface-sunken p-1.5 space-y-1">
                    {runningChecks.length > 0 && (
                      <CheckNames names={runningChecks} tone="text-blue" label={t('agentInfo.pr.runningChecks')} />
                    )}
                    {failedChecks.length > 0 && (
                      <CheckNames names={failedChecks} tone="text-red" label={t('agentInfo.pr.failedChecks')} />
                    )}
                  </div>
                )}
              </div>
            ) : (
              <span className="text-xs text-text-secondary/50 italic">{t('agentInfo.pr.noChecks')}</span>
            )}
          </Cell>
        )}

        {/* Mergeability — absent means unknown, never a conflict */}
        {showMergeable && (() => {
          const { Icon, tone, label } = MERGEABLE_ROWS[String(metadata?.prMergeable ?? 'unknown') as keyof typeof MERGEABLE_ROWS]
          return (
            <Cell icon={<Icon className={`w-3.5 h-3.5 ${tone}`} />}>
              <span className={`text-xs ${tone}`}>{t(label)}</span>
            </Cell>
          )
        })()}

        {/* Comment counters, split by where they were left */}
        {commentRows.length > 0 && (
          <Cell icon={<MessagesSquare className="w-3.5 h-3.5 text-blue" />}>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-text-secondary/70">
              {commentRows.map((row) => (
                <span key={row.label} className="flex items-center gap-1">
                  <span className="text-ink/80 font-medium tabular-nums">{row.value}</span>
                  {t(row.label)}
                </span>
              ))}
            </div>
          </Cell>
        )}

        {/* Who said it */}
        {authors.length > 0 && (
          <Cell icon={<Users className="w-3.5 h-3.5 text-text-secondary/60" />}>
            <span className="block text-[11px] text-text-secondary/70 truncate" title={authors.join(', ')}>
              {t('agentInfo.pr.authors')} {authors.join(', ')}
            </span>
          </Cell>
        )}
      </div>}

      {/* Footer — the actions, with the freshness of everything above them.
          The commands keep the conditions that made them meaningful: offering
          "/magic:done" on a freshly opened PR, or "/magic:resolve" with no review
          to address, is an affordance that lies. Legacy rows carry
          `prReviewStatus` and `prMerged`, so both still work without any of the
          new fields. */}
      <div className="border-t border-line-subtle px-2 py-1.5 flex items-center gap-1.5">
        {showResolve && (
          <button
            onClick={() => runSlashCommand(agentId, '/magic:resolve', t)}
            className="flex items-center gap-1.5 px-2 py-1 bg-red/10 hover:bg-red/20 rounded-md text-red text-[11px] font-medium transition-colors"
          >
            <Wrench className="w-3 h-3" />
            {t('agentInfo.launchResolve')}
          </button>
        )}
        {showDone && (
          <button
            onClick={() => runSlashCommand(agentId, '/magic:done', t)}
            className="flex items-center gap-1.5 px-2 py-1 bg-green/10 hover:bg-green/20 rounded-md text-green text-[11px] font-medium transition-colors"
          >
            <CheckCircle className="w-3 h-3" />
            {t('agentInfo.launchDone')}
          </button>
        )}
        <span className="ml-auto text-[10px] text-text-secondary/50 truncate">{checkedLabel}</span>
      </div>
    </div>
  )
}
