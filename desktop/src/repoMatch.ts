import type { RepositoryConfig } from './types'

/**
 * Matching a working directory to a configured repository — the one
 * implementation, shared by the main process and the renderers (like types.ts
 * and claude-theme.ts).
 *
 * Two reasons a prefix comparison cannot do this job:
 *   * an OrgAgent's `repositories` are absolute paths on the OWNER's machine, so
 *     a teammate's path never shares a prefix with ours;
 *   * /magic:start moves the agent into a worktree at `../<repo>-<TICKET>`, a
 *     SIBLING of the repo, and replaces the agent's paths with it — so even our
 *     own agents stop matching their repo by prefix.
 *
 * The portable handle is the last path segment. Deliberately free of any node
 * import (`os`, `path`) so the renderer can use it: callers that need `~`
 * expansion pass their own `expand` function.
 */

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
 * True when `agentPath` belongs to the repository identified by `name` (its
 * config key) and, when the current user has bound it locally, `repoPath`.
 *
 * Worktrees count as the repo: /magic:start creates them at
 * `../${REPO_NAME}-${TICKET_ID}` (skills/magic-start/SKILL.md), so
 * `magic-slash-PER-5030` belongs to `magic-slash`. Both the config name and the
 * local folder name are tried, because a repo can be registered under a name
 * that differs from its directory. An empty repoPath is ignored — matching on it
 * would credit every agent to every repo with no local folder bound.
 */
export function pathBelongsToRepo(agentPath: string, name: string, repoPath?: string): boolean {
  if (!agentPath) return false
  const base = repoBasename(agentPath)
  if (!base) return false

  const candidates = [name, repoPath ? repoBasename(repoPath) : '']
  return candidates.some((c) => {
    if (c === '') return false
    if (base === c) return true
    return base.startsWith(`${c}-`) && TICKET_SUFFIX.test(base.slice(c.length + 1))
  })
}

/**
 * The ids of the configured repositories these working directories belong to.
 *
 * This is what turns an agent's paths into a real link to the `repositories`
 * table: `agent_repositories` rows, and from there the agent's organization.
 * Order follows `paths`, so the FIRST path decides which org an agent lands in
 * when it spans several.
 *
 * `expand` resolves `~` — the main process passes expandPath() from
 * main/config/validation.ts; the renderer has no such helper and leaves paths
 * as they are. A repo with no local folder bound is skipped: matching on an
 * empty path would credit every agent to it.
 */
export function resolveRepoIds(
  paths: string[],
  repositories: Record<string, RepositoryConfig>,
  expand: (p: string) => string = (p) => p,
): string[] {
  const ids: string[] = []
  for (const rawPath of paths) {
    const agentPath = expand(rawPath)
    for (const [name, repo] of Object.entries(repositories)) {
      if (!repo.id || ids.includes(repo.id)) continue
      if (pathBelongsToRepo(agentPath, name, repo.path ? expand(repo.path) : undefined)) {
        ids.push(repo.id)
      }
    }
  }
  return ids
}
