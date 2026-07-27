import { useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, ExternalLink, FolderGit2 } from 'lucide-react'
import type { OrgAgent } from '../../../types'
import { useConfig } from '../../hooks/useConfig'
import { useOrg } from '../../hooks/useOrg'
import { useOrgAgents } from '../../hooks/useOrgAgents'
import { buildRepoRows, type RepoRow } from '../../utils/repoRows'
import { useT, type Translate } from '../../i18n'
import { OwnerLabel, StatusPill, TicketBadge } from './parts'

/** The live PR of an agent, if it has one that is neither merged nor closed. */
function livePrUrl(agent: OrgAgent): string | undefined {
  return (agent.prReviews ?? []).find((r) => r.prUrl && !r.merged && !r.closed)?.prUrl
}

function agentCountLabel(count: number, t: Translate): string {
  if (count === 0) return t('dashboard.repos.noAgents')
  return t(count === 1 ? 'dashboard.repos.agentCount.one' : 'dashboard.repos.agentCount.other', { count })
}

function AgentRow({ agent, emailByOwner }: { agent: OrgAgent; emailByOwner: Map<string, string> }) {
  const t = useT()
  const prUrl = livePrUrl(agent)

  return (
    <div className="flex items-center gap-3 pl-9 pr-4 py-2 min-w-0 border-t border-line-subtle">
      <div className="flex flex-col min-w-0 flex-1">
        {/* The title says what the work is; the generated terminal name doesn't. */}
        <span className="text-sm text-ink truncate">{agent.title || agent.name}</span>
        <OwnerLabel agent={agent} emailByOwner={emailByOwner} />
      </div>
      <TicketBadge ticketId={agent.ticketId} />
      <StatusPill status={agent.status} />
      {prUrl && (
        <button
          onClick={() => window.electronAPI.shell.openExternal(prUrl)}
          title={t('dashboard.openPR')}
          className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-text-secondary border border-line rounded-lg hover:bg-surface-strong hover:text-ink transition-colors flex-shrink-0"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          <span>{t('dashboard.viewPR')}</span>
        </button>
      )}
    </div>
  )
}

function RepoCard({
  row,
  expanded,
  onToggle,
  emailByOwner,
}: {
  row: RepoRow
  expanded: boolean
  onToggle: () => void
  emailByOwner: Map<string, string>
}) {
  const t = useT()
  const Chevron = expanded ? ChevronDown : ChevronRight
  const hasAgents = row.agents.length > 0

  return (
    <div className="rounded-lg bg-surface-subtle border border-line-field overflow-hidden">
      <button
        onClick={onToggle}
        disabled={!hasAgents}
        className={`w-full flex items-center gap-3 px-4 py-3 min-w-0 text-left transition-colors ${
          hasAgents ? 'hover:bg-surface-strong' : 'cursor-default'
        }`}
      >
        <Chevron className={`w-4 h-4 flex-shrink-0 ${hasAgents ? 'text-text-secondary' : 'opacity-0'}`} />
        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: row.color }} />
        <span className="text-sm font-medium text-ink truncate flex-1">{row.name}</span>
        <span className="text-xs text-text-secondary flex-shrink-0">{agentCountLabel(row.agents.length, t)}</span>
        {row.prCount > 0 && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-purple/15 text-purple flex-shrink-0">
            {t('dashboard.repos.onPr', { count: row.prCount })}
          </span>
        )}
      </button>
      {expanded && row.agents.map((agent) => (
        <AgentRow key={agent.id} agent={agent} emailByOwner={emailByOwner} />
      ))}
    </div>
  )
}

/**
 * The Team page: how many agents are running on each of the organization's
 * repositories, and how many of them are on a pull request.
 *
 * Deliberately counted from `agent.status` — the value the /magic:* skills write
 * on every transition — rather than from the GitHub review state, which only
 * exists for agents whose terminal happens to be open on the owner's machine.
 */
export function RepoSection() {
  const { agents } = useOrgAgents()
  const { config } = useConfig()
  const { members } = useOrg()
  const t = useT()

  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  // owner_id → email, so agents show a readable member label.
  const emailByOwner = useMemo(() => {
    const map = new Map<string, string>()
    for (const m of members) {
      if (m.email) map.set(m.userId, m.email)
    }
    return map
  }, [members])

  const { rows, unmatched } = useMemo(
    () => buildRepoRows(agents, config?.repositories ?? {}),
    [agents, config?.repositories],
  )

  const totals = useMemo(
    () => ({
      agents: rows.reduce((n, r) => n + r.agents.length, 0),
      pr: rows.reduce((n, r) => n + r.prCount, 0),
    }),
    [rows],
  )

  const toggle = (name: string) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      if (!next.delete(name)) next.add(name)
      return next
    })

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 text-sm text-text-secondary">
        <FolderGit2 className="w-4 h-4" />
        <span>{t('dashboard.repos.section')}</span>
        {rows.length > 0 && (
          <span className="text-xs text-text-secondary/50 ml-auto">
            {agentCountLabel(totals.agents, t)} · {t('dashboard.repos.onPr', { count: totals.pr })}
          </span>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="py-10 flex flex-col items-center justify-center text-text-secondary text-sm gap-2 bg-surface-subtle border border-line-subtle rounded-xl">
          <FolderGit2 className="w-8 h-8 opacity-30" />
          <p>{t('dashboard.repos.noRepos')}</p>
          <p className="text-xs text-text-secondary/60 max-w-sm text-center">{t('dashboard.repos.noReposHint')}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {rows.map((row) => (
            <RepoCard
              key={row.name}
              row={row}
              expanded={expanded.has(row.name)}
              onToggle={() => toggle(row.name)}
              emailByOwner={emailByOwner}
            />
          ))}
        </div>
      )}

      {unmatched > 0 && (
        <p className="text-xs text-text-secondary/50">
          {t(unmatched === 1 ? 'dashboard.repos.unmatched.one' : 'dashboard.repos.unmatched.other', {
            count: unmatched,
          })}
        </p>
      )}
    </div>
  )
}
