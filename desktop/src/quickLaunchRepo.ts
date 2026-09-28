import type { RepositoryConfig } from './types'

/**
 * WHICH REPOSITORY A QUICK LAUNCH OPENS IN, from the setting and the words typed.
 *
 * Pure and shared, like repoMatch.ts: the renderer decides it, the tests pin it.
 *
 * `first` is what Quick Launch always did: the first configured repository. `match` reads
 * the prompt for a repository's keywords, or its name, as whole words and ignoring case;
 * the repository with the most hits wins, a tie goes to the one listed first, and no hit
 * at all falls back to `first` — so a prompt that names nothing still opens somewhere
 * rather than being refused. Anything else is a repository NAME, a key of
 * `Config.repositories`; one that no longer exists falls back to `first` too.
 */
export type QuickLaunchRepoChoice = 'first' | 'match' | (string & {})

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function hits(prompt: string, name: string, repo: RepositoryConfig): number {
  const words = [name, ...(repo.keywords ?? [])].map((w) => w.trim()).filter(Boolean)
  return words.filter((w) => new RegExp(`(^|[^\\p{L}\\p{N}_-])${escapeRegExp(w)}($|[^\\p{L}\\p{N}_-])`, 'iu').test(prompt)).length
}

export function quickLaunchRepo(
  repositories: Record<string, RepositoryConfig> | undefined,
  choice: QuickLaunchRepoChoice | undefined,
  prompt: string,
): RepositoryConfig | undefined {
  const entries = Object.entries(repositories ?? {})
  const first = entries[0]?.[1]
  if (!choice || choice === 'first') return first
  if (choice === 'match') {
    let best: RepositoryConfig | undefined
    let bestHits = 0
    for (const [name, repo] of entries) {
      const n = hits(prompt, name, repo)
      if (n > bestHits) { best = repo; bestHits = n }
    }
    return best ?? first
  }
  return repositories?.[choice] ?? first
}
