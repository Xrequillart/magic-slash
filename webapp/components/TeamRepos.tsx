'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, ExternalLink, FolderGit2 } from 'lucide-react'
import type { TeamOverview } from '@/lib/team'
import type { TeamAgent, TeamRepoRow } from '@/lib/teamRows'
import { Badge, Card, SectionHeader, type BadgeTone } from '@/components/ui'

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
  orgName,
  emailByOwner,
}: {
  row: TeamRepoRow
  orgName?: string
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
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">
          {row.name}
          {orgName && <span className="ml-2 text-xs font-normal text-muted">{orgName}</span>}
        </span>
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
 * Who is working on what, per repository shared with your organization. The web
 * counterpart of the desktop app's Team page, reading the same rows.
 */
export function TeamRepos({ overview }: { overview: TeamOverview | null }) {
  if (!overview) {
    return (
      <>
        <SectionHeader icon={FolderGit2} title="Repositories" />
        <Card className="p-8 text-center text-sm text-muted">Loading…</Card>
      </>
    )
  }

  const totalAgents = overview.rows.reduce((n, r) => n + r.agents.length, 0)
  const totalPr = overview.rows.reduce((n, r) => n + r.prCount, 0)

  return (
    <>
      <SectionHeader
        icon={FolderGit2}
        title="Repositories"
        action={
          overview.rows.length > 0 ? (
            <span className="text-xs text-muted">
              {agentCountLabel(totalAgents)} · {totalPr} on a PR
            </span>
          ) : undefined
        }
      />

      {overview.rows.length === 0 ? (
        <Card className="p-8 text-center">
          <FolderGit2 className="mx-auto mb-3 h-8 w-8 text-black/15" />
          <p className="text-sm text-muted">No repository shared with your team yet.</p>
          <p className="mt-1 text-xs text-muted">
            Repos shared to an org from the desktop app appear here, with everyone working on them.
          </p>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {overview.rows.map((row) => (
            <RepoCard
              key={row.id}
              row={row}
              orgName={overview.multiOrg ? overview.orgNameById[row.orgId] : undefined}
              emailByOwner={overview.emailByOwner}
            />
          ))}
        </div>
      )}

      {overview.unmatched > 0 && (
        <p className="mt-3 text-xs text-muted">
          {overview.unmatched === 1
            ? '1 agent on a personal or unlinked repository'
            : `${overview.unmatched} agents on personal or unlinked repositories`}
        </p>
      )}
    </>
  )
}
