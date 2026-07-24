import { useMemo, useState } from 'react'
import { Users, Bot, Coins, Plus, Minus, Clock, Activity, BarChart3, GitPullRequest, AlertOctagon, ExternalLink, ArrowRightCircle } from 'lucide-react'
import type { OrgAgent, OrgAgentPRReview } from '../../../types'
import { useOrgAgents } from '../../hooks/useOrgAgents'
import { useOrgUsageStats } from '../../hooks/useOrgUsageStats'
import { useOrg } from '../../hooks/useOrg'
import { useAuth } from '../../hooks/useAuth'
import { useTerminals } from '../../hooks/useTerminals'
import { useStore } from '../../store'
import { LiveIndicator } from '../../components/LiveIndicator'
import { showToast } from '../../components/Toast'
import { ActivityHeatmap } from '../History/ActivityHeatmap'
import { aggregateUsageTotals, aggregateUsageByMember, computeUsageHeatmap, formatUsd } from '../../utils/usageStats'

function formatDuration(ms: number): string {
  const totalMin = Math.round(ms / 60000)
  if (totalMin < 60) return `${totalMin}m`
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

function StatTile({ icon: Icon, label, value }: { icon: typeof Coins; label: string; value: string }) {
  return (
    <div className="bg-white/[0.06] border border-white/[0.08] rounded-xl p-4 flex flex-col gap-1.5 min-w-0">
      <div className="flex items-center gap-1.5 text-xs text-text-secondary">
        <Icon className="w-3.5 h-3.5 flex-shrink-0" />
        <span className="truncate">{label}</span>
      </div>
      <div className="text-lg font-semibold text-white truncate">{value}</div>
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
        <span>Usage</span>
      </div>

      {loading && rows.length === 0 ? (
        <div className="py-10 flex items-center justify-center text-text-secondary text-sm">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="py-10 flex flex-col items-center justify-center text-text-secondary text-sm gap-2 bg-white/[0.03] border border-white/[0.06] rounded-xl">
          <BarChart3 className="w-8 h-8 opacity-30" />
          <p>No usage recorded yet.</p>
          <p className="text-xs text-text-secondary/60 max-w-sm text-center">
            Usage logging is opt-in. Members who enable it in Settings will have an aggregated snapshot recorded at the end of each session.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {/* Totals are aggregated from at most the newest 5000 sessions; warn when that cap is hit. */}
          {capped && (
            <div className="text-xs text-amber-400/80 bg-amber-400/10 border border-amber-400/20 rounded-lg px-3 py-2">
              Showing the most recent 5,000 sessions — totals below are partial and under-count older activity.
            </div>
          )}

          {/* Summary tiles */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <StatTile icon={Coins} label="Total cost" value={formatUsd(totals.costUsd)} />
            <StatTile icon={Activity} label="Sessions" value={totals.sessions.toLocaleString('en-US')} />
            <StatTile icon={Plus} label="Lines added" value={totals.linesAdded.toLocaleString('en-US')} />
            <StatTile icon={Minus} label="Lines removed" value={totals.linesRemoved.toLocaleString('en-US')} />
            <StatTile icon={Clock} label="Total duration" value={formatDuration(totals.durationMs)} />
          </div>

          {/* Sessions over time */}
          <ActivityHeatmap heatmapData={heatmap} />

          {/* Per-member breakdown (always non-empty in this branch — rows.length !== 0) */}
          <div className="bg-white/[0.06] border border-white/[0.08] rounded-xl p-4 flex flex-col gap-2">
            <div className="text-xs text-text-secondary mb-1">By member</div>
            {byMember.map((m) => (
              <div key={m.userId || '__unassigned__'} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-white truncate min-w-0">
                  {m.userId ? emailByOwner.get(m.userId) ?? m.userId : 'Unassigned'}
                </span>
                <div className="flex items-center gap-4 flex-shrink-0">
                  <span className="text-xs text-text-secondary/60">
                    {m.sessions} {m.sessions === 1 ? 'session' : 'sessions'}
                  </span>
                  <span className="text-white/90 font-medium tabular-nums">{formatUsd(m.costUsd)}</span>
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
const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  'in progress':        { label: 'In progress',      className: 'bg-accent/15 text-accent' },
  committed:            { label: 'Committed',         className: 'bg-yellow/15 text-yellow' },
  'ready for PR':       { label: 'Ready for PR',      className: 'bg-blue/15 text-blue' },
  'PR created':         { label: 'PR created',        className: 'bg-blue/15 text-blue' },
  'in review':          { label: 'In review',         className: 'bg-purple/15 text-purple' },
  'changes requested':  { label: 'Changes requested', className: 'bg-red/15 text-red' },
  'Review addressed':   { label: 'Review addressed',  className: 'bg-green/15 text-green' },
  'PR merged':          { label: 'PR merged',         className: 'bg-green/15 text-green' },
}

function StatusPill({ status }: { status?: string }) {
  if (!status) return null
  const config = STATUS_CONFIG[status]
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${config?.className ?? 'bg-white/[0.06] text-text-secondary'}`}>
      {config?.label ?? status}
    </span>
  )
}

// PR review status → label + badge color for the "awaiting review" widget.
const PR_STATUS_CONFIG: Record<NonNullable<OrgAgentPRReview['status']>, { label: string; className: string }> = {
  pending:              { label: 'Awaiting review',    className: 'bg-blue/15 text-blue' },
  commented:            { label: 'Commented',          className: 'bg-purple/15 text-purple' },
  'changes-requested':  { label: 'Changes requested',  className: 'bg-red/15 text-red' },
  approved:             { label: 'Approved',           className: 'bg-green/15 text-green' },
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
    <span className="text-xs text-text-secondary/60 bg-white/[0.04] border border-white/[0.06] px-1.5 py-0.5 rounded font-mono">
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

function AgentRow({
  agent,
  currentUserId,
  onPickUp,
  pickingUp,
}: {
  agent: OrgAgent
  currentUserId?: string
  onPickUp?: (agent: OrgAgent) => void
  pickingUp?: boolean
}) {
  // "Pick up" only makes sense for a teammate's ticketed agent (never your own).
  const canPickUp =
    !!onPickUp && !!agent.ticketId && !!agent.ownerId && agent.ownerId !== currentUserId

  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-white/[0.04] border border-white/[0.08] min-w-0">
      <Bot className="w-4 h-4 text-text-secondary/60 flex-shrink-0" />
      <span className="text-sm font-medium text-white truncate min-w-0 flex-1">
        {agent.name}
      </span>
      <TicketBadge ticketId={agent.ticketId} />
      {agent.repositories.slice(0, 2).map((repo) => (
        <RepoTag key={repo} repo={repo} />
      ))}
      {agent.repositories.length > 2 && (
        <span className="text-xs text-text-secondary/40 flex-shrink-0">+{agent.repositories.length - 2}</span>
      )}
      <StatusPill status={agent.status} />
      {canPickUp && (
        <button
          onClick={() => onPickUp!(agent)}
          disabled={pickingUp}
          title={`Launch a local agent on ${agent.ticketId} with /magic:continue`}
          className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-accent bg-accent/10 border border-accent/20 rounded-lg hover:bg-accent/20 transition-colors flex-shrink-0 disabled:opacity-50"
        >
          <ArrowRightCircle className="w-3.5 h-3.5" />
          <span>{pickingUp ? 'Picking up…' : 'Pick up'}</span>
        </button>
      )}
    </div>
  )
}

function OwnerLabel({ agent, emailByOwner }: { agent: OrgAgent; emailByOwner: Map<string, string> }) {
  const label = agent.ownerId ? emailByOwner.get(agent.ownerId) ?? agent.ownerId : 'Unassigned'
  return <span className="text-xs text-text-secondary/60 truncate">{label}</span>
}

/** "PRs awaiting review": teammates' live PRs whose review is still open. */
function AwaitingReviewSection({ items, emailByOwner }: { items: ReviewItem[]; emailByOwner: Map<string, string> }) {
  if (items.length === 0) return null
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 text-sm text-text-secondary">
        <GitPullRequest className="w-4 h-4" />
        <span>PRs awaiting review</span>
        <span className="text-xs text-text-secondary/50">{items.length}</span>
      </div>
      <div className="flex flex-col gap-2">
        {items.map(({ agent, review }) => {
          const pr = review.status ? PR_STATUS_CONFIG[review.status] : undefined
          return (
            <div
              key={`${agent.id}:${review.repo}`}
              className="flex items-center gap-3 px-4 py-3 rounded-lg bg-white/[0.04] border border-white/[0.08] min-w-0"
            >
              <GitPullRequest className="w-4 h-4 text-purple flex-shrink-0" />
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-sm font-medium text-white truncate">{agent.name}</span>
                <OwnerLabel agent={agent} emailByOwner={emailByOwner} />
              </div>
              <TicketBadge ticketId={agent.ticketId} />
              <RepoTag repo={review.repo} />
              {pr && (
                <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${pr.className}`}>{pr.label}</span>
              )}
              {review.prUrl && (
                <button
                  onClick={() => review.prUrl && window.electronAPI.shell.openExternal(review.prUrl)}
                  title="Open the pull request"
                  className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-text-secondary border border-white/10 rounded-lg hover:bg-white/10 hover:text-white transition-colors flex-shrink-0"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>View PR</span>
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
  if (agents.length === 0) return null
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 text-sm text-text-secondary">
        <AlertOctagon className="w-4 h-4" />
        <span>Blocked</span>
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
              <span className="text-sm font-medium text-white truncate">{agent.name}</span>
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

interface MemberGroup {
  key: string
  label: string
  agents: OrgAgent[]
}

export function DashboardPage() {
  const { agents, loading } = useOrgAgents()
  const { members } = useOrg()
  const { status: authStatus } = useAuth()
  const { launchClaudeTerminal, terminals } = useTerminals()
  const setCurrentPage = useStore((s) => s.setCurrentPage)
  const [pickingUpId, setPickingUpId] = useState<string | null>(null)
  const currentUserId = authStatus.user?.id

  // owner_id → email, so agents can be grouped under a readable member label.
  const emailByOwner = useMemo(() => {
    const map = new Map<string, string>()
    for (const m of members) {
      if (m.email) map.set(m.userId, m.email)
    }
    return map
  }, [members])

  const awaitingReview = useMemo(() => collectAwaitingReview(agents), [agents])
  const blocked = useMemo(() => collectBlocked(agents), [agents])

  // Pick up a colleague's task: resolve their repo(s) to a local cwd (main), then
  // launch a fresh local agent with /magic:continue to resume the ticket.
  const handlePickUp = async (agent: OrgAgent) => {
    if (!agent.ticketId) return
    setPickingUpId(agent.id)
    try {
      const { cwd, initialPrompt } = await window.electronAPI.org.pickUpTask(agent.ticketId, agent.repositories)
      const name = `Claude ${terminals.length + 1}`
      await launchClaudeTerminal(name, cwd, initialPrompt)
      setCurrentPage('terminals')
      showToast(`Picked up ${agent.ticketId}`, 'success')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to pick up task', 'error')
    } finally {
      setPickingUpId(null)
    }
  }

  // Group agents by owner (unassigned/unknown owners fall into a trailing group).
  const groups: MemberGroup[] = useMemo(() => {
    const byOwner = new Map<string, OrgAgent[]>()
    for (const agent of agents) {
      const key = agent.ownerId ?? '__unassigned__'
      if (!byOwner.has(key)) byOwner.set(key, [])
      byOwner.get(key)!.push(agent)
    }

    const result: MemberGroup[] = []
    for (const [key, list] of byOwner.entries()) {
      if (key === '__unassigned__') continue
      result.push({
        key,
        label: emailByOwner.get(key) ?? key,
        agents: list.sort((a, b) => a.name.localeCompare(b.name)),
      })
    }
    result.sort((a, b) => a.label.localeCompare(b.label))

    const unassigned = byOwner.get('__unassigned__')
    if (unassigned && unassigned.length > 0) {
      result.push({ key: '__unassigned__', label: 'Unassigned', agents: unassigned })
    }
    return result
  }, [agents, emailByOwner])

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple/10 rounded-lg">
            <Users className="w-5 h-5 text-purple" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-white">Team</h1>
            <p className="text-xs text-text-secondary">Who is working on what, in real time</p>
          </div>
        </div>
        <LiveIndicator />
      </div>

      {/* Body — attention widgets + usage stats + active agents share one scroll container */}
      <div className="flex-1 overflow-auto flex flex-col gap-8">
        {/* Attention hooks: PRs awaiting review + blocked work (hidden when empty) */}
        <AwaitingReviewSection items={awaitingReview} emailByOwner={emailByOwner} />
        <BlockedSection agents={blocked} emailByOwner={emailByOwner} />

        {/* Org usage stats (read is open to any member) */}
        <UsageStatsSection />

        {/* Active agents */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-sm text-text-secondary">
            <Bot className="w-4 h-4" />
            <span>Active agents</span>
          </div>
          {loading && agents.length === 0 ? (
            <div className="py-10 flex items-center justify-center text-text-secondary text-sm">
              Loading…
            </div>
          ) : agents.length === 0 ? (
            <div className="py-10 flex flex-col items-center justify-center text-text-secondary text-sm gap-2 bg-white/[0.03] border border-white/[0.06] rounded-xl">
              <Users className="w-8 h-8 opacity-30" />
              <p>No active agents in the organization yet.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {groups.map((group) => (
                <div key={group.key} className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 px-1">
                    <span className="text-sm font-medium text-white truncate">{group.label}</span>
                    <span className="text-xs text-text-secondary/50">{group.agents.length}</span>
                  </div>
                  <div className="flex flex-col gap-2">
                    {group.agents.map((agent) => (
                      <AgentRow
                        key={agent.id}
                        agent={agent}
                        currentUserId={currentUserId}
                        onPickUp={handlePickUp}
                        pickingUp={pickingUpId === agent.id}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
