import { useMemo } from 'react'
import { Coins, Plus, Minus, Clock, Activity, BarChart3, GitPullRequest, AlertOctagon, ExternalLink } from 'lucide-react'
import type { OrgAgent, OrgAgentPRReview } from '../../../types'
import { useOrgAgents } from '../../hooks/useOrgAgents'
import { useOrgUsageStats } from '../../hooks/useOrgUsageStats'
import { useOrg } from '../../hooks/useOrg'
import { ActivityHeatmap } from '../History/ActivityHeatmap'
import { aggregateUsageTotals, aggregateUsageByMember, computeUsageHeatmap, formatUsd } from '../../utils/usageStats'
import { useLocale, useT, type MessageKey, type Translate } from '../../i18n'

function formatDuration(ms: number, t: Translate): string {
  const totalMin = Math.round(ms / 60000)
  if (totalMin < 60) return t('duration.minutesShort', { count: totalMin })
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return m === 0 ? t('duration.hours', { count: h }) : t('duration.hoursMinutes', { hours: h, minutes: m })
}

function StatTile({ icon: Icon, label, value }: { icon: typeof Coins; label: string; value: string }) {
  return (
    <div className="bg-surface border border-line-field rounded-xl p-4 flex flex-col gap-1.5 min-w-0">
      <div className="flex items-center gap-1.5 text-xs text-text-secondary">
        <Icon className="w-3.5 h-3.5 flex-shrink-0" />
        <span className="truncate">{label}</span>
      </div>
      <div className="text-lg font-semibold text-ink truncate">{value}</div>
    </div>
  )
}

/**
 * Org-wide usage stats. Reading is open to any org member (the usage-logs opt-in
 * only gates WRITING your own data), so this always renders — with a clean empty
 * state when no member has opted in / produced data yet.
 */
function UsageStatsSection() {
  const { rows, capped, loading } = useOrgUsageStats()
  const { members } = useOrg()
  const locale = useLocale()
  const t = useT()

  const emailByOwner = useMemo(() => {
    const map = new Map<string, string>()
    for (const m of members) {
      if (m.email) map.set(m.userId, m.email)
    }
    return map
  }, [members])

  const totals = useMemo(() => aggregateUsageTotals(rows), [rows])
  const byMember = useMemo(() => aggregateUsageByMember(rows), [rows])
  const heatmap = useMemo(() => computeUsageHeatmap(rows), [rows])

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 text-sm text-text-secondary">
        <BarChart3 className="w-4 h-4" />
        <span>{t('dashboard.usage')}</span>
      </div>

      {loading && rows.length === 0 ? (
        <div className="py-10 flex items-center justify-center text-text-secondary text-sm">{t('common.loading')}</div>
      ) : rows.length === 0 ? (
        <div className="py-10 flex flex-col items-center justify-center text-text-secondary text-sm gap-2 bg-surface-subtle border border-line-subtle rounded-xl">
          <BarChart3 className="w-8 h-8 opacity-30" />
          <p>{t('dashboard.usageEmpty')}</p>
          <p className="text-xs text-text-secondary/60 max-w-sm text-center">
            {t('dashboard.usageEmptyHint')}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {/* Totals are aggregated from at most the newest 5000 sessions; warn when that cap is hit. */}
          {capped && (
            <div className="text-xs text-amber-400/80 bg-amber-400/10 border border-amber-400/20 rounded-lg px-3 py-2">
              {t('dashboard.capped')}
            </div>
          )}

          {/* Summary tiles */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <StatTile icon={Coins} label={t('dashboard.totalCost')} value={formatUsd(totals.costUsd, locale)} />
            <StatTile icon={Activity} label={t('dashboard.sessions')} value={totals.sessions.toLocaleString(locale)} />
            <StatTile icon={Plus} label={t('dashboard.linesAdded')} value={totals.linesAdded.toLocaleString(locale)} />
            <StatTile icon={Minus} label={t('dashboard.linesRemoved')} value={totals.linesRemoved.toLocaleString(locale)} />
            <StatTile icon={Clock} label={t('dashboard.totalDuration')} value={formatDuration(totals.durationMs, t)} />
          </div>

          {/* Sessions over time */}
          <ActivityHeatmap heatmapData={heatmap} />

          {/* Per-member breakdown (always non-empty in this branch — rows.length !== 0) */}
          <div className="bg-surface border border-line-field rounded-xl p-4 flex flex-col gap-2">
            <div className="text-xs text-text-secondary mb-1">{t('dashboard.byMember')}</div>
            {byMember.map((m) => (
              <div key={m.userId || '__unassigned__'} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-ink truncate min-w-0">
                  {m.userId ? emailByOwner.get(m.userId) ?? m.userId : t('dashboard.unassigned')}
                </span>
                <div className="flex items-center gap-4 flex-shrink-0">
                  <span className="text-xs text-text-secondary/60">
                    {t(m.sessions === 1 ? 'dashboard.sessionCount.one' : 'dashboard.sessionCount.other', { count: m.sessions })}
                  </span>
                  <span className="text-ink/90 font-medium tabular-nums">{formatUsd(m.costUsd, locale)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Workflow-status → label + badge color. Statuses mirror
// TerminalMetadata.status; anything unrecognized falls through to a neutral pill.
const STATUS_CONFIG: Record<string, { labelKey: MessageKey; className: string }> = {
  'in progress':        { labelKey: 'status.inProgress',       className: 'bg-accent/15 text-accent' },
  committed:            { labelKey: 'status.committed',        className: 'bg-yellow/15 text-yellow' },
  'ready for PR':       { labelKey: 'status.readyForPR',       className: 'bg-blue/15 text-blue' },
  'PR created':         { labelKey: 'status.prCreated',        className: 'bg-blue/15 text-blue' },
  'in review':          { labelKey: 'status.inReview',         className: 'bg-purple/15 text-purple' },
  'changes requested':  { labelKey: 'status.changesRequested', className: 'bg-red/15 text-red' },
  'Review addressed':   { labelKey: 'status.reviewAddressed',  className: 'bg-green/15 text-green' },
  'PR merged':          { labelKey: 'status.prMerged',         className: 'bg-green/15 text-green' },
}

function StatusPill({ status }: { status?: string }) {
  const t = useT()
  if (!status) return null
  const config = STATUS_CONFIG[status]
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${config?.className ?? 'bg-surface text-text-secondary'}`}>
      {config ? t(config.labelKey) : status}
    </span>
  )
}

// PR review status → label + badge color for the "awaiting review" widget.
const PR_STATUS_CONFIG: Record<NonNullable<OrgAgentPRReview['status']>, { labelKey: MessageKey; className: string }> = {
  pending:              { labelKey: 'prReview.pending',          className: 'bg-blue/15 text-blue' },
  commented:            { labelKey: 'prReview.commented',        className: 'bg-purple/15 text-purple' },
  'changes-requested':  { labelKey: 'prReview.changesRequested', className: 'bg-red/15 text-red' },
  approved:             { labelKey: 'prReview.approved',         className: 'bg-green/15 text-green' },
}

// "Awaiting review" = a live PR (not merged/closed) whose review is still open.
const AWAITING_REVIEW_STATUSES: ReadonlySet<string> = new Set(['pending', 'commented', 'changes-requested'])
// Workflow statuses that mean the author is blocked / must act next.
const BLOCKED_STATUSES: ReadonlySet<string> = new Set(['changes requested'])

interface ReviewItem {
  agent: OrgAgent
  review: OrgAgentPRReview
}

function collectAwaitingReview(agents: OrgAgent[]): ReviewItem[] {
  const items: ReviewItem[] = []
  for (const agent of agents) {
    for (const review of agent.prReviews ?? []) {
      if (review.merged || review.closed) continue
      if (review.status && AWAITING_REVIEW_STATUSES.has(review.status)) {
        items.push({ agent, review })
      }
    }
  }
  return items
}

function collectBlocked(agents: OrgAgent[]): OrgAgent[] {
  return agents.filter((a) => a.status && BLOCKED_STATUSES.has(a.status))
}

function RepoTag({ repo }: { repo: string }) {
  const name = repo.split('/').pop() ?? repo
  return (
    <span className="text-xs text-text-secondary/60 bg-surface-subtle border border-line-subtle px-1.5 py-0.5 rounded font-mono">
      {name}
    </span>
  )
}

function TicketBadge({ ticketId }: { ticketId?: string }) {
  if (!ticketId) return null
  return (
    <span className="text-xs text-accent/80 bg-accent/10 px-2 py-0.5 rounded flex-shrink-0">
      {ticketId}
    </span>
  )
}

function OwnerLabel({ agent, emailByOwner }: { agent: OrgAgent; emailByOwner: Map<string, string> }) {
  const t = useT()
  const label = agent.ownerId ? emailByOwner.get(agent.ownerId) ?? agent.ownerId : t('dashboard.unassigned')
  return <span className="text-xs text-text-secondary/60 truncate">{label}</span>
}

/** "PRs awaiting review": teammates' live PRs whose review is still open. */
function AwaitingReviewSection({ items, emailByOwner }: { items: ReviewItem[]; emailByOwner: Map<string, string> }) {
  const t = useT()
  if (items.length === 0) return null
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 text-sm text-text-secondary">
        <GitPullRequest className="w-4 h-4" />
        <span>{t('dashboard.awaitingReview')}</span>
        <span className="text-xs text-text-secondary/50">{items.length}</span>
      </div>
      <div className="flex flex-col gap-2">
        {items.map(({ agent, review }) => {
          const pr = review.status ? PR_STATUS_CONFIG[review.status] : undefined
          return (
            <div
              key={`${agent.id}:${review.repo}`}
              className="flex items-center gap-3 px-4 py-3 rounded-lg bg-surface-subtle border border-line-field min-w-0"
            >
              <GitPullRequest className="w-4 h-4 text-purple flex-shrink-0" />
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-sm font-medium text-ink truncate">{agent.name}</span>
                <OwnerLabel agent={agent} emailByOwner={emailByOwner} />
              </div>
              <TicketBadge ticketId={agent.ticketId} />
              <RepoTag repo={review.repo} />
              {pr && (
                <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${pr.className}`}>{t(pr.labelKey)}</span>
              )}
              {review.prUrl && (
                <button
                  onClick={() => review.prUrl && window.electronAPI.shell.openExternal(review.prUrl)}
                  title={t('dashboard.openPR')}
                  className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-text-secondary border border-line rounded-lg hover:bg-surface-strong hover:text-ink transition-colors flex-shrink-0"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>{t('dashboard.viewPR')}</span>
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/** "Blocked": agents whose workflow status means the author must act next. */
function BlockedSection({ agents, emailByOwner }: { agents: OrgAgent[]; emailByOwner: Map<string, string> }) {
  const t = useT()
  if (agents.length === 0) return null
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 text-sm text-text-secondary">
        <AlertOctagon className="w-4 h-4" />
        <span>{t('dashboard.blocked')}</span>
        <span className="text-xs text-text-secondary/50">{agents.length}</span>
      </div>
      <div className="flex flex-col gap-2">
        {agents.map((agent) => (
          <div
            key={agent.id}
            className="flex items-center gap-3 px-4 py-3 rounded-lg bg-red/[0.04] border border-red/[0.12] min-w-0"
          >
            <AlertOctagon className="w-4 h-4 text-red flex-shrink-0" />
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-sm font-medium text-ink truncate">{agent.name}</span>
              <OwnerLabel agent={agent} emailByOwner={emailByOwner} />
            </div>
            <TicketBadge ticketId={agent.ticketId} />
            {agent.repositories.slice(0, 2).map((repo) => (
              <RepoTag key={repo} repo={repo} />
            ))}
            <StatusPill status={agent.status} />
          </div>
        ))}
      </div>
    </div>
  )
}

export function DashboardPage() {
  const { agents } = useOrgAgents()
  const { members } = useOrg()

  // owner_id → email, so agents show a readable member label.
  const emailByOwner = useMemo(() => {
    const map = new Map<string, string>()
    for (const m of members) {
      if (m.email) map.set(m.userId, m.email)
    }
    return map
  }, [members])

  const awaitingReview = useMemo(() => collectAwaitingReview(agents), [agents])
  const blocked = useMemo(() => collectBlocked(agents), [agents])

  return (
    <div className="h-full flex flex-col">
      {/* Body — attention widgets + usage stats share one scroll container.
          The title and the live indicator are rendered by the hosting modal. */}
      <div className="flex-1 overflow-auto p-6 flex flex-col gap-8">
        {/* Attention hooks: PRs awaiting review + blocked work (hidden when empty) */}
        <AwaitingReviewSection items={awaitingReview} emailByOwner={emailByOwner} />
        <BlockedSection agents={blocked} emailByOwner={emailByOwner} />

        {/* Org usage stats (read is open to any member) */}
        <UsageStatsSection />
      </div>
    </div>
  )
}
