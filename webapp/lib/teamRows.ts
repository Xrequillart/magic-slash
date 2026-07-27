/**
 * Grouping the org's agents by repository — the same view the desktop app shows
 * on its Team page (renderer/utils/repoRows.ts + repoMatch.ts).
 *
 * Deliberately free of any Supabase import so it stays a pure, testable module;
 * lib/team.ts does the fetching and hands the rows in.
 */

/**
 * Workflow statuses that mean "this agent has a live PR". Mirrors
 * PR_WORKFLOW_STATUSES in the desktop's hooks/groupedTerminals.ts. 'PR merged'
 * is deliberately out — the PR is no longer in flight.
 */
export const PR_WORKFLOW_STATUSES: readonly string[] = [
  'PR created',
  'in review',
  'changes requested',
  'Review addressed',
]

export interface TeamAgent {
  id: string
  orgId: string
  ownerId: string | null
  /** The owner's title for the agent, falling back to the terminal name. */
  label: string
  ticketId?: string
  status?: string
  /** Absolute paths on the OWNER's machine — never ours. */
  repositories: string[]
  /** A pull request that is neither merged nor closed, when the agent has one. */
  prUrl?: string
}

export interface TeamRepo {
  id: string
  orgId: string
  name: string
  color: string | null
}

export interface TeamRepoRow {
  id: string
  name: string
  color: string
  orgId: string
  agents: TeamAgent[]
  prCount: number
}

/** Project colors, same palette and order as the desktop sidebar. */
export const REPO_COLORS = [
  '#3B82F6', // blue
  '#10B981', // green
  '#F59E0B', // amber
  '#EF4444', // red
  '#8B5CF6', // purple
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#F97316', // orange
]

/** Last segment of a path, trailing slashes stripped ('/a/b/' → 'b'). */
export function repoBasename(p: string): string {
  const trimmed = p.replace(/[/\\]+$/, '')
  const segments = trimmed.split(/[/\\]/)
  return segments[segments.length - 1] ?? trimmed
}

/**
 * A worktree suffix: the ticket id /magic:start appends to the repo name — a
 * Jira-style key (PER-5030) or a bare issue number (456). Requiring this shape
 * rather than accepting any `name-…` suffix is what keeps a repo called `magic`
 * from swallowing the folder `magic-slash-ui`.
 */
const TICKET_SUFFIX = /^([A-Za-z][A-Za-z0-9]*-)?\d+$/

/**
 * True when `agentPath` belongs to the repository named `name`.
 *
 * Agent paths are absolute on their owner's machine, so a prefix comparison is
 * useless here — the only portable handle is the last path segment. Worktrees
 * count as the repo: /magic:start creates them at `../${REPO_NAME}-${TICKET_ID}`.
 * `localFolder` is the caller's own clone folder name when they have one bound,
 * because a repo can be registered under a name that differs from its directory.
 */
export function pathBelongsToRepo(agentPath: string, name: string, localFolder?: string): boolean {
  if (!agentPath) return false
  const base = repoBasename(agentPath)
  if (!base) return false

  return [name, localFolder ?? ''].some((candidate) => {
    if (candidate === '') return false
    if (base === candidate) return true
    return base.startsWith(`${candidate}-`) && TICKET_SUFFIX.test(base.slice(candidate.length + 1))
  })
}

/**
 * Group agents by team repository.
 *
 * An agent attached to two repos is counted in both rows — the same convention
 * as the desktop. Agents matching no repo are counted apart rather than dropped,
 * so the totals never look like they lost someone.
 *
 * `localFolderByRepoId` carries the caller's OWN path bindings (repository_paths
 * is own-rows-only, so a teammate's clone location is never visible here); it
 * only ever adds a second name to match on.
 */
export function buildTeamRows(
  agents: TeamAgent[],
  repos: TeamRepo[],
  localFolderByRepoId: Record<string, string> = {},
): { rows: TeamRepoRow[]; unmatched: number } {
  const belongs = (agent: TeamAgent, repo: TeamRepo) =>
    agent.repositories.some((p) => pathBelongsToRepo(p, repo.name, localFolderByRepoId[repo.id]))

  const rows: TeamRepoRow[] = repos.map((repo, index) => {
    const matched = agents.filter((agent) => belongs(agent, repo))
    return {
      id: repo.id,
      name: repo.name,
      color: repo.color || REPO_COLORS[index % REPO_COLORS.length],
      orgId: repo.orgId,
      agents: matched,
      prCount: matched.filter((a) => a.status && PR_WORKFLOW_STATUSES.includes(a.status)).length,
    }
  })

  const unmatched = agents.filter((agent) => !repos.some((repo) => belongs(agent, repo))).length

  // Busiest first, then alphabetical — an empty repo stays visible at the bottom
  // rather than disappearing, because "nobody is on it" is information too.
  rows.sort((a, b) => b.agents.length - a.agents.length || a.name.localeCompare(b.name))

  return { rows, unmatched }
}
