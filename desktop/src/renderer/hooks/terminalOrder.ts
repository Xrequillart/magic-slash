import type { TerminalInfo, Config, RepositoryConfig } from '../../types'

export interface TerminalWithRepos extends TerminalInfo {
  matchingProjects: string[]
}

/**
 * The sidebar order: newest agent first, and nothing else.
 *
 * Deliberately not grouped or ranked by workflow status. An agent that starts
 * waiting for input, opens a PR or gets merged keeps the exact row it had —
 * the state is already legible from its badge and background, and a list that
 * reorders itself under the cursor is the one thing a sidebar must never do.
 *
 * The key is `tsCreate`, not the store's array order: terminals restored on
 * boot come back in whatever order the main process enumerates them. Entries
 * with no timestamp (older sessions) sort last, in their existing order, since
 * `sort` is stable.
 */
export function orderTerminals(terminalList: TerminalInfo[], config: Config | null): TerminalWithRepos[] {
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

  return enriched.sort((a, b) => (b.tsCreate ?? 0) - (a.tsCreate ?? 0))
}
