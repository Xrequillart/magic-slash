import { useEffect, useState, type ReactNode } from 'react'
import {
  AlertTriangle,
  CheckCircle,
  CheckCircle2,
  ChevronDown,
  Circle,
  EyeOff,
  GitMerge,
  GitPullRequest,
  GitPullRequestClosed,
  GitPullRequestDraft,
  Loader2,
  MessagesSquare,
  MinusCircle,
  RefreshCw,
  Users,
  XCircle,
} from 'lucide-react'
import { formatTimestamp } from './utils'
import { useStore } from '../../store'
import { useT, type MessageKey, type Translate } from '../../i18n'
import { showToast } from '../Toast'
import type { PRCheck, PRState, PRWatchError, RepositoryMetadata } from '../../../types'

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
 * One line of the card's checklist — "is this box ticked, and if not, why".
 *
 * `done` drives the styling rather than the icon: a ticked line steps back to a
 * muted grey, an open one keeps its own tone, so scanning the card means landing
 * on what still needs doing rather than on what is already fine.
 */
interface ChecklistItem {
  Icon: typeof CheckCircle2
  tone: string
  label: string
  done: boolean
  /** For the one state that is genuinely in motion: checks still running. */
  spin?: boolean
}

/**
 * The review verdict as the header badge, in the slot the PR state used to hold.
 *
 * On an open PR the state is the one thing the reader already knows — the card is
 * there, so the PR is open — while "Changes requested" is what they opened the
 * sidebar to find out. Same tint scale as `STATE_BADGE`, so whichever of the two
 * ends up in the slot reads as the same badge.
 */
const REVIEW_BADGE: Record<
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

// One entry per state a single check can be in — the icons of the list inside the
// checks card, and the same vocabulary the card's own checks line is built from.
const CHECK_STATES = {
  passed: { Icon: CheckCircle2, tone: 'text-green', label: 'agentInfo.pr.checkPassed', spin: false },
  failed: { Icon: XCircle, tone: 'text-red', label: 'agentInfo.pr.checkFailed', spin: false },
  running: { Icon: Loader2, tone: 'text-blue', label: 'agentInfo.pr.checkRunning', spin: true },
  skipped: { Icon: MinusCircle, tone: 'text-text-secondary/60', label: 'agentInfo.pr.checkSkipped', spin: false },
} as const satisfies Record<
  PRCheck['state'],
  { Icon: typeof CheckCircle2; tone: string; label: MessageKey; spin: boolean }
>

// `undefined` is its own entry, not a missing one: GitHub answers UNKNOWN while it
// computes mergeability, and that must never render as "conflicts" — nor as a tick,
// which is why the unknown line gets an empty box rather than a check.
const MERGEABLE_ITEMS = {
  true: { Icon: CheckCircle2, tone: 'text-green', label: 'agentInfo.pr.mergeable', done: true },
  false: { Icon: AlertTriangle, tone: 'text-red', label: 'agentInfo.pr.conflicts', done: false },
  unknown: { Icon: Circle, tone: 'text-text-secondary/60', label: 'agentInfo.pr.mergeableUnknown', done: false },
} as const satisfies Record<string, Omit<ChecklistItem, 'label'> & { label: MessageKey }>

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
  'prCheckList',
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
 * The chip every item on this card is drawn in — a checklist line, the comments —
 * so the bands read as one grid rather than as separate treatments. The surface is
 * the commit-hash button's, one shade up from the card it sits on, where
 * `surface-sunken` punched a dark hole instead.
 */
function Chip({ children }: { children: ReactNode }) {
  return <div className="rounded-md border border-border/30 bg-surface px-2">{children}</div>
}

/**
 * A chip holding one item: an icon gutter, what the item is about, and an optional
 * detail pinned right.
 *
 * `min-h-7` rather than a fixed height: every single-line item lands on exactly the
 * same 28 px — a line carrying a button is no taller than one carrying a word, and a
 * checklist of ragged boxes stops reading as a list — while a line whose content
 * wraps is still allowed to grow.
 *
 * The icon is a flex item OF the header line, not centred in its own box beside it:
 * that box only lines up while the line happens to be exactly as tall as it is.
 *
 * `toggle` turns the header into a button and gates `children` behind it; `children`
 * is indented by hand to the same gutter, 16 px of icon plus the 8 px gap.
 */
function ItemCard({
  icon,
  header,
  detail,
  toggle,
  children,
}: {
  icon: ReactNode
  header: ReactNode
  /** Pinned right of the header line: a count, or a command. */
  detail?: ReactNode
  toggle?: { open: boolean; onToggle: () => void }
  children?: ReactNode
}) {
  const line = (
    <>
      <span className="w-4 flex-shrink-0 flex items-center justify-center">{icon}</span>
      <div className="min-w-0 flex-1">{header}</div>
      {detail !== undefined && <span className="flex-shrink-0">{detail}</span>}
      {toggle && (
        <ChevronDown
          className={`w-3 h-3 flex-shrink-0 text-text-secondary/50 group-hover:text-ink transition-all ${toggle.open ? '' : '-rotate-90'}`}
        />
      )}
    </>
  )

  return (
    <Chip>
      {toggle ? (
        <button onClick={toggle.onToggle} className="group w-full min-h-7 py-1 flex items-center gap-2 text-left">
          {line}
        </button>
      ) : (
        <div className="min-h-7 py-1 flex items-center gap-2">{line}</div>
      )}
      {children && (!toggle || toggle.open) && <div className="pb-2 pl-6">{children}</div>}
    </Chip>
  )
}

/**
 * One item of the checklist: the box, what it is about, and an optional detail.
 *
 * A card per item rather than one panel of rows, because each line here is a
 * separate question — green? mergeable? merged? — and giving each its own edge stops
 * them reading as one paragraph of status.
 */
function ChecklistRow({
  item,
  detail,
  toggle,
  children,
}: {
  item: ChecklistItem
  detail?: ReactNode
  toggle?: { open: boolean; onToggle: () => void }
  children?: ReactNode
}) {
  return (
    <ItemCard
      icon={<item.Icon className={`w-3.5 h-3.5 ${item.tone} ${item.spin ? 'animate-spin' : ''}`} />}
      header={(
        <span className={`block text-xs truncate ${item.done ? 'text-text-secondary/70' : `font-medium ${item.tone}`}`}>
          {item.label}
        </span>
      )}
      detail={detail}
      toggle={toggle}
    >
      {children}
    </ItemCard>
  )
}

export function PRWatchCard({ prUrl, agentId, metadata }: PRWatchCardProps) {
  const t = useT()
  const [refreshing, setRefreshing] = useState(false)
  const [enabling, setEnabling] = useState(false)
  // `null` means nobody has touched it: until then the checks list follows the data
  // — a run with something failing or still moving opens itself, a clean one stays
  // folded — and after a click the reader's choice wins for the life of the card.
  const [checksExpanded, setChecksExpanded] = useState<boolean | null>(null)
  // Comments start folded, always: the count is the answer most of the time, and who
  // said it is the follow-up question.
  const [commentsOpen, setCommentsOpen] = useState(false)

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

  // What goes in the header badge. `open` is the one state worth giving up the slot
  // for: the card being there already says the PR is open, whereas the review
  // verdict is what someone opens the sidebar to learn. Draft, merged and closed
  // keep the slot — those say something the verdict cannot — and the state icon on
  // the left carries the state in every case.
  const reviewStatus = metadata?.prReviewStatus
  const badge =
    state === 'open' && reviewStatus
      ? { label: t(REVIEW_BADGE[reviewStatus].label), tone: REVIEW_BADGE[reviewStatus].tone }
      : state
        ? { label: t(STATE_LABELS[state]), tone: STATE_BADGE[state] }
        : reviewStatus
          ? { label: t(REVIEW_BADGE[reviewStatus].label), tone: REVIEW_BADGE[reviewStatus].tone }
          : undefined

  const checks = metadata?.prChecks
  // The named checks behind the counts. Rows written before `prCheckList` existed
  // carry the two capped name arrays instead, and only for the states that were
  // worth naming then — rebuilt into the same shape so there is one list to render
  // rather than two code paths, worst first either way.
  const checkList: PRCheck[] =
    metadata?.prCheckList ?? [
      ...(metadata?.prFailedChecks ?? []).map((name) => ({ name, state: 'failed' as const })),
      ...(metadata?.prRunningChecks ?? []).map((name) => ({ name, state: 'running' as const })),
    ]
  // Said out loud rather than silently dropped: the watcher caps the list, and a
  // card that shows 20 of 34 checks while saying "12/34" invites the wrong count.
  const hiddenChecks = Math.max(0, (checks?.total ?? 0) - checkList.length)
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

  // There is something to close out only once the PR is merged.
  const showDone = state === 'merged' || metadata?.prMerged === true

  // Legacy rows have no `prLastCheckedAt`; the review timestamp is the closest
  // honest answer, and "never" is better than a blank when neither exists.
  const checkedAt = metadata?.prLastCheckedAt ?? metadata?.prReviewUpdatedAt
  const checkedLabel = (() => {
    if (typeof checkedAt !== 'number') return t('agentInfo.pr.neverChecked')
    // A read that just landed is the normal outcome of pressing refresh, and
    // "checked now ago" is not a sentence — the "ago" wrapper is for ages, so it
    // is skipped inside the first minute. `now` ticks every 30 s, so a stamp
    // written this second can sit slightly ahead of it: that lands here too,
    // rather than in a negative age.
    const age = now - checkedAt
    const time = age < 60_000 ? t('relative.now') : t('relative.ago', { time: formatTimestamp(checkedAt, now, t) })
    return t('agentInfo.pr.lastChecked', { time })
  })()

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
  // The one number the comments line leads with. Summed from the buckets rather than
  // read from `prReviewCommentCount`, which predates the split and only ever counted
  // some of them.
  const commentTotal = counts
    ? counts.inline + counts.conversation + counts.reviewSummaries
    : legacyCommentCount

  // The checks line of the checklist: ticked only once the run is over AND nothing
  // in it failed — a run that is 9/10 green is still a red PR. A repo with no CI at
  // all gets an empty box rather than a tick: there is nothing to have passed.
  const checksItem: ChecklistItem | undefined =
    checks === undefined
      ? undefined
      : checks.total === 0
        ? { Icon: MinusCircle, tone: 'text-text-secondary/60', label: t('agentInfo.pr.noChecks'), done: false }
        : checks.failed > 0
          ? { Icon: XCircle, tone: 'text-red', label: t('agentInfo.pr.checksLabel'), done: false }
          : checks.running > 0
            ? { Icon: Loader2, tone: 'text-blue', label: t('agentInfo.pr.checksLabel'), done: false, spin: true }
            : { Icon: CheckCircle2, tone: 'text-green', label: t('agentInfo.pr.checksLabel'), done: true }

  const checksOpen = checksExpanded ?? (checks !== undefined && (checks.failed > 0 || checks.running > 0))

  // An empty `border-t` band reads as a rendering bug, so both middle bands are
  // gated on having a line to draw. Only the status bar is unconditional — the
  // freshness stamp and its button are meaningful even on a card that knows
  // nothing else yet.
  const showComments = commentRows.length > 0 || authors.length > 0
  const showChecklist =
    watchError !== undefined ||
    showComments ||
    checksItem !== undefined ||
    showMergeable ||
    showDone

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
          badge sits inside that target: it labels the PR, so clicking it should open
          the PR rather than land on dead space. The whole row is one
          generous hit area — the negative margin lets its hover surface reach past
          the container's padding to 4px from the card edge, while its own padding
          keeps the text off that edge. No external-link glyph: the title, the
          repo slug and the tooltip already say where this goes. */}
      <div className="flex items-center p-2">
        <button
          onClick={() => window.electronAPI.shell.openExternal(prUrl)}
          title={t('agentInfo.viewPullRequest')}
          className="group flex items-center gap-2 min-w-0 flex-1 text-left rounded-md -m-1 p-2 hover:bg-surface-strong transition-colors"
        >
          <span className="w-4 flex-shrink-0 flex items-center justify-center">
            {state ? <StateIcon state={state} /> : <GitPullRequest className="w-4 h-4 text-text-secondary" />}
          </span>
          <span className="min-w-0 flex-1">
            {/* Hover brightens the title to full white rather than tinting it: the
                surface lighting up is already the affordance, and the accent read as
                a state change on the PR itself. */}
            <span className="block text-xs font-medium text-ink/90 truncate group-hover:text-ink transition-colors">
              {prNumber ? t('agentInfo.pr.number', { number: prNumber }) : t('agentInfo.pr.title')}
            </span>
            {repoSlug && (
              <span className="block text-[10px] text-text-secondary/50 truncate" title={repoSlug}>
                {repoSlug}
              </span>
            )}
          </span>
          {badge && (
            // Not upper-cased any more: "CHANGES REQUESTED" is twice the width of
            // "Open" and would eat the title it sits next to.
            <span className={`flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] font-semibold ${badge.tone}`}>
              {badge.label}
            </span>
          )}
        </button>
      </div>

      {/* The setting, not a failure: the watcher is off, so nothing the card could
          show below would ever move again. Everything else is therefore replaced by
          this one prompt rather than stacked above a frozen snapshot presented as
          the state of the PR — and it carries its own fix, the same way each watch
          error names one. */}
      {watcherOff ? (
        <div className="border-t border-line-subtle p-2">
          <div className="flex items-start gap-2 rounded-md bg-surface-sunken px-2 py-1.5">
            <EyeOff className="w-3.5 h-3.5 text-text-secondary/60 flex-shrink-0 mt-px" />
            <div className="min-w-0 flex-1">
              <div className="text-[11px] text-ink/80 font-medium">{t('agentInfo.pr.watcherOff')}</div>
              <div className="text-[10px] text-text-secondary/70">
                {/* Two different situations behind one setting: a card that has a
                    snapshot hidden behind it is dated, one carrying only the link
                    is empty. */}
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
        </div>
      ) : (
        <>
        {/* The checklist — everything that has to be true before this PR can ship,
            one line each, ticked when it is. Straight under the header because it is
            the band that answers "can this ship", and a list rather than a stack of
            differently-shaped panels because the shape itself carries the meaning:
            same gutter, same box, so the open items are the ones that stand out.
            Rendered whenever any line has something to say. */}
        {showChecklist && <div className="border-t border-line-subtle p-2 space-y-1">
          {/* Why the watcher is blind, and how to fix it. Above the verdict on
              purpose: a stale verdict is worth less than the reason it is stale. */}
          {watchError && (
            <div className="flex items-start gap-2 rounded-md border border-red/20 bg-red/10 px-2 py-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-red flex-shrink-0 mt-px" />
              <div className="min-w-0">
                <div className="text-[11px] text-red font-medium">{t(WATCH_ERROR_LABELS[watchError].label)}</div>
                <div className="text-[10px] text-text-secondary/70">{t(WATCH_ERROR_LABELS[watchError].fix)}</div>
              </div>
            </div>
          )}

          {/* No review line here: the verdict is the header badge now, and stating
              it twice on one card made the checklist look longer than it is. */}

          {/* Comments — the count on the line, who wrote them behind the fold. Not a
              box to tick, so no `done` styling: it reports, it does not gate. First of
              the list because it is the one line that is about people rather than
              machinery, and the reason anyone opens this card mid-review. */}
          {showComments && (
            <ItemCard
              icon={<MessagesSquare className="w-3.5 h-3.5 text-blue" />}
              header={<span className="block text-xs truncate text-text-secondary/70">{t('agentInfo.pr.commentsLabel')}</span>}
              detail={commentTotal > 0 ? (
                <span className="text-[10px] text-text-secondary/60 tabular-nums">{commentTotal}</span>
              ) : undefined}
              toggle={{ open: commentsOpen, onToggle: () => setCommentsOpen(!commentsOpen) }}
            >
              <div className="space-y-1">
                {/* Where they were left, then who left them. Allowed to wrap here —
                    the fold is open because somebody asked for the detail. */}
                {commentRows.length > 0 && (
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] text-text-secondary/70">
                    {commentRows.map((row) => (
                      <span key={row.label} className="flex items-center gap-1">
                        <span className="text-ink/80 font-medium tabular-nums">{row.value}</span>
                        {t(row.label)}
                      </span>
                    ))}
                  </div>
                )}
                {authors.length > 0 && (
                  <div className="flex items-start gap-1.5 text-[10px] text-text-secondary/70">
                    <Users className="w-3 h-3 flex-shrink-0 mt-0.5 text-text-secondary/60" />
                    <span className="min-w-0">{authors.join(', ')}</span>
                  </div>
                )}
              </div>
            </ItemCard>
          )}

          {/* Checks — the count beside the label, and the checks themselves folded
              behind it, one line each with the icon of its own state. No progress
              bar: on a checklist the box already says whether this one is settled,
              "9/12" says how far along, and the names say which. The header is only
              a button when there is a list to unfold. */}
          {checksItem && (
            <ChecklistRow
              item={checksItem}
              detail={checks && checks.total > 0 ? (
                <span className="text-[10px] text-text-secondary/60 tabular-nums">
                  {t('agentInfo.pr.checksPassed', { passed: checks.passed, total: checks.total })}
                </span>
              ) : undefined}
              toggle={checkList.length > 0
                ? { open: checksOpen, onToggle: () => setChecksExpanded(!checksOpen) }
                : undefined}
            >
              {checkList.length > 0 && (
                <ul className="space-y-1">
                  {checkList.map((check) => {
                    const { Icon, tone, label, spin } = CHECK_STATES[check.state]
                    return (
                      <li key={`${check.state}:${check.name}`} className="flex items-center gap-1.5">
                        <span className="flex-shrink-0 flex" title={t(label)}>
                          <Icon className={`w-3 h-3 ${tone} ${spin ? 'animate-spin' : ''}`} />
                        </span>
                        <span className="min-w-0 text-[10px] font-mono text-text-secondary/70 truncate" title={check.name}>
                          {check.name}
                        </span>
                      </li>
                    )
                  })}
                  {hiddenChecks > 0 && (
                    <li className="pl-[18px] text-[10px] text-text-secondary/50">
                      {t('agentInfo.pr.checksMore', { count: hiddenChecks })}
                    </li>
                  )}
                </ul>
              )}
            </ChecklistRow>
          )}

          {/* Conflicts — absent means unknown, never a conflict */}
          {showMergeable && (() => {
            const { label, ...rest } = MERGEABLE_ITEMS[String(metadata?.prMergeable ?? 'unknown') as keyof typeof MERGEABLE_ITEMS]
            return <ChecklistRow item={{ ...rest, label: t(label) }} />
          })()}

          {/* The last box, and the only one with a command attached: merged, so all
              that is left is closing the ticket out. Never on the same list as the
              conflicts line — one needs an open PR, the other a merged one — and
              legacy rows carry `prMerged`, so it works without any of the new
              fields. Offered on a freshly opened PR it would be an affordance that
              lies, which is why it is gated at all. */}
          {showDone && (
            <ChecklistRow
              // Ticked box, merge colour: the shape says the work is done, the
              // purple keeps GitHub's association the header badge already uses.
              item={{ Icon: CheckCircle2, tone: 'text-purple', label: t('agentInfo.pr.state.merged'), done: true }}
              detail={(
                <button
                  onClick={() => runSlashCommand(agentId, '/magic:done', t)}
                  // Fixed 20 px so this chip is exactly as tall as the ones carrying
                  // a single word — the button is what used to make it the odd one.
                  className="flex h-5 items-center gap-1.5 px-2 bg-green/10 hover:bg-green/20 rounded-md text-green text-[11px] font-medium transition-colors"
                >
                  <CheckCircle className="w-3 h-3" />
                  {t('agentInfo.launchDone')}
                </button>
              )}
            />
          )}
        </div>}

        {/* Status bar — the card's footer, and the one band that is always there:
            how old everything above it is, and the button that makes it newer.
            Reading on the left, action on the right, so the button is where the eye
            already is when the stamp turns out to be stale. */}
        <div className="border-t border-line-subtle px-2 py-1.5 flex items-center gap-2">
          <span className="min-w-0 text-[10px] text-text-secondary/50 truncate">{checkedLabel}</span>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            title={t('agentInfo.pr.refresh')}
            className="ml-auto flex-shrink-0 flex items-center gap-1.5 px-2 py-1 rounded-md border border-line-subtle text-[11px] font-medium text-text-secondary hover:text-ink hover:bg-surface-strong hover:border-border transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
            {t('agentInfo.pr.refreshAction')}
          </button>
        </div>
        </>
      )}
    </div>
  )
}
