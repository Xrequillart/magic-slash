/**
 * Matching an agent's working directory to a configured repository.
 *
 * An OrgAgent's `repositories` are absolute paths on the OWNER's machine, so a
 * teammate's path never shares a prefix with ours — the prefix matching used for
 * local terminals (see hooks/groupedTerminals.ts) cannot work here. The only
 * portable handle is the last path segment, the same rule pickUpTask() applies
 * in main/cloud/org.ts.
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
