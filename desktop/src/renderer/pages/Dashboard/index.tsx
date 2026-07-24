import { useMemo } from 'react'
import { Users, Bot } from 'lucide-react'
import type { OrgAgent } from '../../../types'
import { useOrgAgents } from '../../hooks/useOrgAgents'
import { useOrg } from '../../hooks/useOrg'
import { LiveIndicator } from '../../components/LiveIndicator'

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

      {/* Body */}
      {loading && agents.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-text-secondary text-sm">
          Loading…
        </div>
      ) : agents.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-text-secondary text-sm gap-2">
          <Users className="w-8 h-8 opacity-30" />
          <p>No active agents in the organization yet.</p>
        </div>
      ) : (
        <div className="flex-1 overflow-auto flex flex-col gap-6">
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
  )
}
