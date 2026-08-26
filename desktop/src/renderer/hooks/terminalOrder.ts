import { DEFAULT_AGENT_SORT, type TerminalInfo, type TerminalState, type Config, type RepositoryConfig, type AgentSortMode } from '../../types'

export interface TerminalWithRepos extends TerminalInfo {
  matchingProjects: string[]
}

/**
 * Where each state sits when sorting by status, most demanding first.
 *
 * `waiting` leads because it is the only state that is blocked ON THE PERSON, and
 * `error` follows for the same reason — those two are what the attention banner
 * above the list counts. Then the ones still moving, then the ones that are done:
 * `completed` above `idle`, since a finished agent is a result to collect and an
 * idle one is a prompt waiting to be typed.
 *
 * A total record, so a new state cannot be added without deciding where it ranks.
 */
const STATE_RANK: Record<TerminalState, number> = {
  waiting: 0,
  error: 1,
  working: 2,
  completed: 3,
  idle: 4,
}

/** Newest first, the tie-break every mode falls back to. */
function byNewest(a: TerminalWithRepos, b: TerminalWithRepos): number {
  return (b.tsCreate ?? 0) - (a.tsCreate ?? 0)
}

/**
 * The sidebar order, in the mode the person picked (the control beside the "new
 * agent" button; the choice follows their account).
 *
 * `recent` — the default — is newest first and nothing else. It is deliberately
 * blind to workflow status: an agent that starts waiting for input, opens a PR or
 * gets merged keeps the exact row it had, because the state is already legible from
 * its badge and background, and a list that reorders itself under the cursor is the
 * one thing a sidebar should not do. The other two modes accept exactly that cost
 * in exchange for grouping, which is why they are opt-in rather than the default.
 *
 * The key is `tsCreate`, not the store's array order: terminals restored on boot
 * come back in whatever order the main process enumerates them. Entries with no
 * timestamp (older sessions) sort last, in their existing order, since `sort` is
 * stable — and every mode ends on that same comparison, so a group is always read
 * newest first too.
 */
export function orderTerminals(
  terminalList: TerminalInfo[],
  config: Config | null,
  sort: AgentSortMode = DEFAULT_AGENT_SORT,
): TerminalWithRepos[] {
  const enriched = terminalList.map((terminal): TerminalWithRepos => {
    const repos = terminal.repositories || []
    const matchingProjects: string[] = []

    if (config) {
      for (const [repoName, repoConfig] of Object.entries(config.repositories)) {
        if (repos.some(repo => repo.startsWith((repoConfig as RepositoryConfig).path))) {
          matchingProjects.push(repoName)
        }
      }
    }

    return { ...terminal, matchingProjects }
  })

  if (sort === 'status') {
    return enriched.sort((a, b) => STATE_RANK[a.state] - STATE_RANK[b.state] || byNewest(a, b))
  }

  if (sort === 'repository') {
    // Grouped by the FIRST matching project, alphabetically, and agents belonging to
    // no configured repository go last — an empty name would otherwise sort to the
    // top and open the list with the ones that have no group at all.
    return enriched.sort((a, b) => {
      const nameA = a.matchingProjects[0] ?? ''
      const nameB = b.matchingProjects[0] ?? ''
      if (nameA !== nameB) {
        if (!nameA) return 1
        if (!nameB) return -1
        return nameA.localeCompare(nameB)
      }
      return byNewest(a, b)
    })
  }

  return enriched.sort(byNewest)
}
