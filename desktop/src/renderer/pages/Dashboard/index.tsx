import { useMemo } from 'react'
import { Users, Bot, Coins, Plus, Minus, Clock, Activity, BarChart3 } from 'lucide-react'
import type { OrgAgent } from '../../../types'
import { useOrgAgents } from '../../hooks/useOrgAgents'
import { useOrgUsageStats } from '../../hooks/useOrgUsageStats'
import { useOrg } from '../../hooks/useOrg'
import { LiveIndicator } from '../../components/LiveIndicator'
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
  const { rows, loading } = useOrgUsageStats()
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

function RepoTag({ repo }: { repo: string }) {
  const name = repo.split('/').pop() ?? repo
  return (
    <span className="text-xs text-text-secondary/60 bg-white/[0.04] border border-white/[0.06] px-1.5 py-0.5 rounded font-mono">
      {name}
    </span>
  )
}

function AgentRow({ agent }: { agent: OrgAgent }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-white/[0.04] border border-white/[0.08] min-w-0">
      <Bot className="w-4 h-4 text-text-secondary/60 flex-shrink-0" />
      <span className="text-sm font-medium text-white truncate min-w-0 flex-1">
        {agent.name}
      </span>
      {agent.ticketId && (
        <span className="text-xs text-accent/80 bg-accent/10 px-2 py-0.5 rounded flex-shrink-0">
          {agent.ticketId}
        </span>
      )}
      {agent.repositories.slice(0, 2).map((repo) => (
        <RepoTag key={repo} repo={repo} />
      ))}
      {agent.repositories.length > 2 && (
        <span className="text-xs text-text-secondary/40 flex-shrink-0">+{agent.repositories.length - 2}</span>
      )}
      <StatusPill status={agent.status} />
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

  // owner_id → email, so agents can be grouped under a readable member label.
  const emailByOwner = useMemo(() => {
    const map = new Map<string, string>()
    for (const m of members) {
      if (m.email) map.set(m.userId, m.email)
    }
    return map
  }, [members])

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

      {/* Body — usage stats + active agents share one scroll container */}
      <div className="flex-1 overflow-auto flex flex-col gap-8">
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
                      <AgentRow key={agent.id} agent={agent} />
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
