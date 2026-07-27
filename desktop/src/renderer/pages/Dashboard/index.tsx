import { useMemo } from 'react'
import { AlertOctagon, ExternalLink, GitPullRequest } from 'lucide-react'
import type { OrgAgent, OrgAgentPRReview } from '../../../types'
import { useOrgAgents } from '../../hooks/useOrgAgents'
import { useOrg } from '../../hooks/useOrg'
import { useT } from '../../i18n'
import { FlowSection } from './FlowSection'
import { OwnerLabel, PR_STATUS_CONFIG, RepoTag, StatusPill, TicketBadge } from './parts'

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
      {/* Body — attention widgets + flow metrics share one scroll container.
          The title and the live indicator are rendered by the hosting modal. */}
      <div className="flex-1 overflow-auto p-6 flex flex-col gap-8">
        {/* Attention hooks: PRs awaiting review + blocked work (hidden when empty) */}
        <AwaitingReviewSection items={awaitingReview} emailByOwner={emailByOwner} />
        <BlockedSection agents={blocked} emailByOwner={emailByOwner} />

        {/* Flow metrics: where work is sitting, and how long each stage takes */}
        <FlowSection />
      </div>
    </div>
  )
}
