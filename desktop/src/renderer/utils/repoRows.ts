import type { OrgAgent, RepositoryConfig } from '../../types'
import { PR_WORKFLOW_STATUSES } from '../hooks/groupedTerminals'
import { getProjectColorMap } from './projectColors'
import { pathBelongsToRepo } from './repoMatch'

export interface RepoRow {
  name: string
  color: string
  agents: OrgAgent[]
  /** Agents on this repo whose workflow status means a PR is in flight. */
  prCount: number
}

/**
 * Group the org-wide agent roster by team repository.
 *
 * Only repositories shared with the organization are listed (`orgId` set;
 * null/absent is a personal repo). An agent attached to two repos is counted in
 * both rows — the same convention as the repository list in Settings. Agents
 * matching no team repo are counted apart rather than dropped, so the totals
 * never look like they lost someone.
 *
 * The PR count reads `agent.status`, the value the /magic:* skills write on
 * every transition, not the GitHub review state — the latter only exists for
 * agents whose terminal happens to be open on their owner's machine.
 */
export function buildRepoRows(
  agents: OrgAgent[],
  repositories: Record<string, RepositoryConfig>,
): { rows: RepoRow[]; unmatched: number } {
  const teamRepos = Object.entries(repositories).filter(([, r]) => !!r.orgId)
  const colorMap = getProjectColorMap(teamRepos.map(([name]) => name), repositories)

  const belongs = (agent: OrgAgent, name: string, repo: RepositoryConfig) =>
    (agent.repositories ?? []).some((p) => pathBelongsToRepo(p, name, repo.path))

  const rows: RepoRow[] = teamRepos.map(([name, repo]) => {
    const matched = agents.filter((agent) => belongs(agent, name, repo))
    return {
      name,
      color: colorMap[name],
      agents: matched,
      prCount: matched.filter((a) => a.status && PR_WORKFLOW_STATUSES.includes(a.status)).length,
    }
  })

  const unmatched = agents.filter(
    (agent) => !teamRepos.some(([name, repo]) => belongs(agent, name, repo)),
  ).length

  // Busiest first, then alphabetical — an empty repo stays visible at the bottom
  // rather than disappearing, because "nobody is on it" is information too.
  rows.sort((a, b) => b.agents.length - a.agents.length || a.name.localeCompare(b.name))

  return { rows, unmatched }
}
