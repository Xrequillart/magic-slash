import type { RepositoryConfig } from './types'

/**
 * Resolving WHERE a repository's tickets live.
 *
 * WHY A MODULE
 * ---------------------------------------------------------------------------
 * Every one of these answers is a fallback CHAIN, not a stored value, and a chain
 * read inline is a chain each caller gets subtly wrong. Two forces put them here:
 *
 * 1. The Jira coordinates moved into their own `jira` block (see
 *    supabase/migrations/20260820090000_repositories_jira.sql). The keys they came
 *    from — `issues.jiraUrl`, `plan.jiraProject` — are still read so a repo
 *    configured before the move keeps working, and are never written again. That
 *    is expressible as `jira.siteUrl || issues.jiraUrl`, and it has to read the
 *    same way everywhere or the two ends of the chain start disagreeing.
 *
 * 2. `issues.githubIssuesUrl` is an OVERRIDE that almost nobody fills in, while
 *    the repo already knows its own address in `remoteUrl`. The derivation used to
 *    live inline in the agent sidebar, which is why a GitHub issue rendered as dead
 *    text anywhere else that read the raw key.
 *
 * Sits next to `types.ts` rather than under `main/config/`, for languages.ts's
 * reason: both processes need it. The settings forms must display the EFFECTIVE
 * value — showing a blank next to a chain that resolves to a real URL is the bug
 * this module exists to prevent — and the main process resolves it for the status
 * server the /magic:* skills read.
 *
 * Empty strings are treated as unset throughout. They are what a settings form
 * writes when a field is cleared, and the config is jsonb the webapp writes
 * wholesale, so '' arriving here is a question of when, not if — and '' winning a
 * chain produces a link to nowhere.
 */

/** The blocks a tracker answer is assembled from. All optional: callers pass a repo. */
type TrackerSource = Pick<RepositoryConfig, 'jira' | 'issues' | 'plan' | 'remoteUrl'>

/**
 * The Jira site as a browse base URL (`https://acme.atlassian.net/browse/`), or ''
 * when this repo has no Jira site: `jira.siteUrl`, else the legacy
 * `issues.jiraUrl`.
 *
 * Only decides whether a BROWSE LINK can be shown. A write needs the project key
 * instead, which is why /magic:plan qualifies Jira on resolveJiraProject() alone
 * (skills/magic-plan/references/trackers.md §1).
 */
export function resolveJiraSite(repo?: TrackerSource | null): string {
  return repo?.jira?.siteUrl || repo?.issues?.jiraUrl || ''
}

/**
 * The Jira project key tickets are filed under (`PROJ`), or '' when this repo has
 * none: `jira.projectKey`, else the legacy `plan.jiraProject`.
 *
 * This is the value that decides whether Jira can receive a ticket at all.
 */
export function resolveJiraProject(repo?: TrackerSource | null): string {
  return repo?.jira?.projectKey || repo?.plan?.jiraProject || ''
}

/**
 * The GitHub issues base URL, or '' when nothing can be built:
 * `issues.githubIssuesUrl` if set, else derived from `remoteUrl`.
 *
 * The configured key wins because it means "the issues are NOT in the repo the
 * code lives in" — a separate tracker repository is a real configuration, and
 * deriving from the remote would file into the wrong place. It is no longer asked
 * for in the settings forms, where it only duplicated the remote for everyone
 * else; existing overrides keep working precisely because this order is preserved.
 *
 * Returned without a trailing slash. Consumers append `/{number}`.
 */
export function resolveGitHubIssuesUrl(repo?: TrackerSource | null): string {
  const base = repo?.issues?.githubIssuesUrl || (repo?.remoteUrl ? `${repo.remoteUrl}/issues` : '')
  return base.replace(/\/+$/, '')
}
