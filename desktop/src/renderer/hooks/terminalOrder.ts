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
 * The repository an agent is filed under in `repository` mode — its FIRST matching
 * project, or `''` for the agents that belong to no configured repository.
 *
 * The single source of truth shared by the sort below and the sidebar's group
 * headers: the two cannot disagree about where a group starts if they both ask
 * this one question.
 */
export function groupKeyOf(terminal: TerminalWithRepos): string {
  return terminal.matchingProjects[0] ?? ''
}

/**
 * The same name as the sidebar's group header shows it: first letter up, the rest
 * left EXACTLY as configured — `poppins-pex` reads "Poppins-pex", `API` stays "API".
 *
 * Done here rather than with `text-transform` because CSS `capitalize` capitalises
 * after the hyphen too ("Poppins-Pex"), and the header deliberately drops the
 * `uppercase` its AGENTS sibling carries: a repo name is data, and shouting it makes
 * it harder to match against the name Settings shows.
 *
 * The rest is never lower-cased, for the same reason: `API` and `myRepo` are the names
 * the user typed, and every other repo view in the app shows them verbatim. Only the
 * first character is touched, and only when it is a letter.
 */
export function repoLabel(name: string): string {
  return name.charAt(0).toUpperCase() + name.slice(1)
}

/**
 * Whether the agent at `index` opens a new repository group in an ALREADY ORDERED
 * list — the first row, or the first row whose key differs from the row above it.
 *
 * Same source of truth as `groupKeyOf`, and the sidebar's only test for "does this
 * row need a header above it".
 */
export function isGroupStart(list: TerminalWithRepos[], index: number): boolean {
  return index === 0 || groupKeyOf(list[index]) !== groupKeyOf(list[index - 1])
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
      const nameA = groupKeyOf(a)
      const nameB = groupKeyOf(b)
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
