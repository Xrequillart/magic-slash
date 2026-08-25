import { ipcMain } from 'electron'
import type { RepositoryConfig, TaskRepoGroup, TasksSnapshot } from '../../types'
import { isPRStatusError } from '../../types'
import { resolveGitHubIssuesUrl, resolveTracker } from '../../tracker'
import { readConfig } from '../config/config'
import { getGitHubToken } from '../github'
import { fetchOpenIssues } from '../github-issues'

/**
 * The Tasks page's one read: the OPEN issues of every configured repository whose
 * RESOLVED tracker is GitHub.
 *
 * Resolved, not configured: `plan.tracker` is `ask` on most repositories, and the
 * ladder in `tracker.ts` is what turns that into an answer. A repo that resolves to
 * `jira` — or to `ask`, which a page cannot put to anybody — gets no group at all
 * rather than an empty one, because "no issues here" and "issues are somewhere else"
 * are different statements.
 *
 * NO POLLER. The page reads on open and on an explicit reload, and nothing else:
 * a backlog is not a live object the way a PR under review is, and a poll on it
 * would spend GraphQL budget on a page nobody is looking at.
 */

/**
 * `https://github.com/owner/repo/issues` → `{ owner, repo }`, or null if it is not one.
 *
 * The host is part of what makes it one. `fetchOpenIssues` posts to api.github.com
 * and nowhere else, so an address on any other host has no answer here — and
 * `resolveTracker` cannot be relied on to have filtered it out: row 1 of its ladder
 * returns `github` from an explicit `plan.tracker` alone, without ever consulting
 * `hasGitHubCoordinates`. A repository deliberately set to `github` with a GitLab,
 * Bitbucket or GitHub Enterprise remote reaches this function, and without the host
 * check it would be queried against the wrong API and earn a permanent, misleading
 * "Repository not found" card. Skipping it is the honest outcome.
 */
function parseOwnerRepo(issuesUrl: string): { owner: string; repo: string } | null {
  const trimmed = issuesUrl.trim().replace(/\/+$/, '')
  const match = /^https?:\/\/(?:www\.)?github\.com\/([^/]+)\/([^/]+?)(?:\/issues)?$/i.exec(trimmed)
  if (!match) return null
  return { owner: match[1], repo: match[2].replace(/\.git$/, '') }
}

interface GitHubRepo {
  configKey: string
  name: string
  owner: string
  repo: string
}

/**
 * The GitHub-tracked repositories, with an owner and a repo parsed out of them.
 *
 * A repo whose target does not parse is skipped rather than reported: an
 * `issues.githubIssuesUrl` override is free text, and a card saying "this is not a
 * URL" belongs in the settings form that accepted it, not on a backlog page.
 */
function githubRepos(repositories: Record<string, RepositoryConfig>): GitHubRepo[] {
  const result: GitHubRepo[] = []
  for (const [configKey, repo] of Object.entries(repositories)) {
    if (resolveTracker(repo) !== 'github') continue
    const parsed = parseOwnerRepo(resolveGitHubIssuesUrl(repo))
    if (!parsed) continue
    result.push({ configKey, name: repo.name || configKey, ...parsed })
  }
  return result
}

export function setupTasksHandlers(): void {
  // Every failure is captured into its own group: a repository whose read fails is
  // reported as failed and the others still render. The try/catch is not redundant
  // with fetchOpenIssues' error return — it covers the unexpected throw, which a
  // Promise.all would otherwise turn into a blank page.
  ipcMain.handle('tasks:listOpenIssues', async (): Promise<TasksSnapshot> => {
    // Asked once, for the page as a whole, and BEFORE the config is walked: with no
    // token every group would carry the same `no-token` error, which is a connection
    // state and deserves saying once — and resolving every repository's tracker only
    // to throw the answer away is work the logged-out path does not owe anybody.
    if (!getGitHubToken()) return { githubConnected: false, groups: [] }

    const repos = githubRepos(readConfig().repositories ?? {})

    const groups = await Promise.all(repos.map(async (repo): Promise<TaskRepoGroup> => {
      const base = { configKey: repo.configKey, name: repo.name }
      try {
        const result = await fetchOpenIssues(repo.owner, repo.repo)
        if (isPRStatusError(result)) return { ...base, issues: [], error: result }
        return { ...base, issues: result.issues, totalOpen: result.totalOpen }
      } catch (err) {
        return {
          ...base,
          issues: [],
          error: { error: 'network', message: err instanceof Error ? err.message : String(err) },
        }
      }
    }))

    return { githubConnected: true, groups }
  })
}
