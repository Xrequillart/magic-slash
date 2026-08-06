import type { OrgAgent, RepositoryConfig } from '../../types'
import { pathBelongsToRepo } from '../../repoMatch'
import { PR_WORKFLOW_STATUSES } from './prStatuses'
import { getProjectColorMap } from './projectColors'

export interface RepoRow {
  name: string
  color: string
  agents: OrgAgent[]
  /** Agents on this repo whose workflow status means a PR is in flight. */
  prCount: number
}

/**
 * Which scope a Team-page tab shows: one organization, or the user's personal
 * repositories (`null`, the repos with no org).
 */
export type RepoScope = string | null

/**
 * Group the agents of one scope by repository.
 *
 * `scope` is an organization id, or null for personal repositories. An agent
 * attached to two repos is counted in both rows — the same convention as the
 * repository list in Settings. Agents matching none of the scope's repos are
 * counted apart rather than dropped, so the totals never look like they lost
 * someone.
 *
 * The PR count reads `agent.status`, the value the /magic:* skills write on
 * every transition, not the GitHub review state — the latter only exists for
 * agents whose terminal happens to be open on their owner's machine.
 */
export function buildRepoRows(
  agents: OrgAgent[],
  repositories: Record<string, RepositoryConfig>,
  scope: RepoScope,
): { rows: RepoRow[]; unmatched: number } {
  const scopeRepos = Object.entries(repositories).filter(([, r]) => (r.orgId ?? null) === scope)
  const colorMap = getProjectColorMap(scopeRepos.map(([name]) => name), repositories)

  /**
   * The link by id is authoritative: it is what the backend derives the agent's
   * organization from. Path matching stays as a fallback for agents saved by an
   * app version that predates agent_repositories, and for the ones the backfill
   * could not resolve — without it they would silently vanish from the page.
   */
  const belongs = (agent: OrgAgent, name: string, repo: RepositoryConfig) => {
    if (agent.repositoryIds && agent.repositoryIds.length > 0) {
      return !!repo.id && agent.repositoryIds.includes(repo.id)
    }
    return (agent.repositories ?? []).some((p) => pathBelongsToRepo(p, name, repo.path))
  }

  // Only the agents of this scope. An agent's org is derived by the backend from
  // its repositories, so this is the same partition the tabs present.
  const scoped = agents.filter((a) => (a.orgId ?? null) === scope)

  const rows: RepoRow[] = scopeRepos.map(([name, repo]) => {
    const matched = scoped.filter((agent) => belongs(agent, name, repo))
    return {
      name,
      color: colorMap[name],
      agents: matched,
      prCount: matched.filter((a) => a.status && PR_WORKFLOW_STATUSES.includes(a.status)).length,
    }
  })

  const unmatched = scoped.filter(
    (agent) => !scopeRepos.some(([name, repo]) => belongs(agent, name, repo)),
  ).length

  // Busiest first, then alphabetical — an empty repo stays visible at the bottom
  // rather than disappearing, because "nobody is on it" is information too.
  rows.sort((a, b) => b.agents.length - a.agents.length || a.name.localeCompare(b.name))

  return { rows, unmatched }
}
