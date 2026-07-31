'use client'

import { useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, ExternalLink, FolderGit2 } from 'lucide-react'
import type { TeamOverview } from '@/lib/team'
import { buildTeamRows, type RepoScope, type TeamAgent, type TeamRepoRow } from '@/lib/teamRows'
import { Badge, Card, SectionHeader, type BadgeTone } from '@/components/ui'
import { SkillStats } from '@/components/SkillStats'

/**
 * Workflow status → badge tone. Mirrors STATUS_CONFIG in the desktop's Team page
 * (renderer/pages/Dashboard/parts.tsx); an unrecognized status falls through to a
 * neutral pill rather than disappearing.
 */
const STATUS_TONES: Record<string, BadgeTone> = {
  'in progress': 'accent',
  committed: 'yellow',
  'ready for PR': 'neutral',
  'PR created': 'accent',
  'in review': 'purple',
  'changes requested': 'red',
  'Review addressed': 'green',
  'PR merged': 'green',
}

function agentCountLabel(count: number): string {
  if (count === 0) return 'no agent'
  return `${count} agent${count === 1 ? '' : 's'}`
}

function AgentRow({ agent, email }: { agent: TeamAgent; email?: string }) {
  return (
    <div className="flex items-center gap-3 border-t border-black/5 py-2.5 pl-11 pr-4">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-ink">{agent.label}</p>
        <p className="truncate text-xs text-muted">{email ?? agent.ownerId ?? 'Unassigned'}</p>
      </div>
      {agent.ticketId && (
        <span className="shrink-0 rounded bg-accent/10 px-2 py-0.5 text-[11px] text-accent">{agent.ticketId}</span>
      )}
      {agent.status && <Badge tone={STATUS_TONES[agent.status] ?? 'neutral'}>{agent.status}</Badge>}
      {agent.prUrl && (
        <a
          href={agent.prUrl}
          target="_blank"
          rel="noreferrer"
          title="Open the pull request"
          className="flex shrink-0 items-center gap-1 rounded-lg border border-black/10 px-2 py-1 text-xs font-medium text-muted transition-colors hover:bg-black/[0.03] hover:text-ink"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          <span>View PR</span>
        </a>
      )}
    </div>
  )
}

function RepoCard({
  row,
  emailByOwner,
}: {
  row: TeamRepoRow
  emailByOwner: Record<string, string>
}) {
  const [expanded, setExpanded] = useState(false)
  const hasAgents = row.agents.length > 0
  const Chevron = expanded ? ChevronDown : ChevronRight

  return (
    <Card className="overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        disabled={!hasAgents}
        className={`flex w-full items-center gap-3 px-4 py-3.5 text-left ${
          hasAgents ? 'transition-colors hover:bg-black/[0.02]' : 'cursor-default'
        }`}
      >
        <Chevron className={`h-4 w-4 shrink-0 text-muted ${hasAgents ? '' : 'opacity-0'}`} />
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: row.color }} />
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">{row.name}</span>
        <span className="shrink-0 text-xs text-muted">{agentCountLabel(row.agents.length)}</span>
        {row.prCount > 0 && <Badge tone="purple">{row.prCount} on a PR</Badge>}
      </button>
      {expanded &&
        row.agents.map((agent) => (
          <AgentRow key={agent.id} agent={agent} email={agent.ownerId ? emailByOwner[agent.ownerId] : undefined} />
        ))}
    </Card>
  )
}

/**
 * Who is working on what, per repository — one tab per organization, plus a
 * personal one. The web counterpart of the desktop app's Team page, reading the
 * same rows. Switching tabs is a view change and nothing else: there is no
 * active organization to set.
 */
export function TeamRepos({ overview }: { overview: TeamOverview | null }) {
  const [scope, setScope] = useState<RepoScope | undefined>(undefined)

  const tabs = useMemo(() => {
    if (!overview) return []
    const list: { scope: RepoScope; label: string }[] = overview.orgs.map((o) => ({
      scope: o.id,
      label: o.name,
    }))
    // Only offer the personal tab when there is something in it.
    const hasPersonal =
      overview.repos.some((r) => !r.orgId) || overview.agents.some((a) => !a.orgId)
    if (hasPersonal) list.push({ scope: null, label: 'Personal' })
    return list
  }, [overview])

  // Default to the first tab with agents in it, so a busy org is not hidden
  // behind a click just because it sorts second.
  const activeScope: RepoScope | undefined = useMemo(() => {
    if (scope !== undefined && tabs.some((t) => t.scope === scope)) return scope
    const busy = tabs.find((t) => overview?.agents.some((a) => (a.orgId ?? null) === t.scope))
    return busy?.scope ?? tabs[0]?.scope
  }, [scope, tabs, overview])

  const { rows, unmatched } = useMemo(() => {
    if (!overview || activeScope === undefined) return { rows: [], unmatched: 0 }
    return buildTeamRows(overview.agents, overview.repos, overview.localFolders, activeScope)
  }, [overview, activeScope])

  if (!overview) {
    return (
      <>
        <SectionHeader icon={FolderGit2} title="Repositories" />
        <Card className="p-8 text-center text-sm text-muted">Loading…</Card>
      </>
    )
  }

  const totalAgents = rows.reduce((n, r) => n + r.agents.length, 0)
  const totalPr = rows.reduce((n, r) => n + r.prCount, 0)

  return (
    <>
      {/* The tabs moved ABOVE both sections: they scope the skill stats as well as
          the repository list now, so they can no longer sit under the one section
          they happened to precede. */}
      {tabs.length > 1 && (
        <div className="mb-4 flex flex-wrap items-center gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.scope ?? 'personal'}
              onClick={() => setScope(tab.scope)}
              className={`rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                tab.scope === activeScope
                  ? 'border-accent/30 bg-accent/10 text-accent'
                  : 'border-black/10 bg-white text-muted hover:bg-black/[0.03] hover:text-ink'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* What this tab RUNS, before what it HAS. Every count below says how much work
          is in flight; this one says whether the cycle is being used at all.
          `activeScope` is passed WHOLE rather than coerced: null is the personal tab
          and undefined is "no tab resolved yet", and the two must not collapse. */}
      <SkillStats scope={activeScope} />

      <SectionHeader
        icon={FolderGit2}
        title="Repositories"
        action={
          rows.length > 0 ? (
            <span className="text-xs text-muted">
              {agentCountLabel(totalAgents)} · {totalPr} on a PR
            </span>
          ) : undefined
        }
      />

      {rows.length === 0 ? (
        <Card className="p-8 text-center">
          <FolderGit2 className="mx-auto mb-3 h-8 w-8 text-black/15" />
          {/* An empty tab is a different situation from having no repo at all,
              and only the latter deserves the "go share one" nudge. */}
          <p className="text-sm text-muted">
            {tabs.length > 1 ? 'No repository here yet.' : 'No repository shared with your team yet.'}
          </p>
          {tabs.length <= 1 && (
            <p className="mt-1 text-xs text-muted">
              Repos shared to an org from the desktop app appear here, with everyone working on them.
            </p>
          )}
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {rows.map((row) => (
            <RepoCard key={row.id} row={row} emailByOwner={overview.emailByOwner} />
          ))}
        </div>
      )}

      {unmatched > 0 && (
        <p className="mt-3 text-xs text-muted">
          {unmatched === 1
            ? '1 agent on a repository this view cannot resolve'
            : `${unmatched} agents on repositories this view cannot resolve`}
        </p>
      )}
    </>
  )
}
