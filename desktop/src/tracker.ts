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

/** Where a repository's tickets are filed, once every fallback has been walked. */
export type ResolvedTracker = 'github' | 'jira' | 'ask'

/** github.com, in either shape an address is stored in: an https URL, or an ssh remote. */
const ON_GITHUB_COM = /^(https?:\/\/(www\.)?github\.com\/|git@github\.com:)/i

/**
 * Whether this repo has GitHub coordinates at all — the qualification row 4 of the
 * ladder makes on the remote.
 *
 * BOTH addresses are qualified on being on github.com, the override included. A
 * non-github.com issues host — a GitHub Enterprise install, say — is not supported
 * by the Tasks page: `main/github-issues.ts` posts to `api.github.com` and nowhere
 * else, so calling such a repo `github` buys it a query against the wrong host and a
 * permanent, misleading "Repository not found" card. Leaving it to `ask` (or to
 * `jira`, when Jira coordinates are configured) is the honest answer, and the one
 * the ladder already knows how to give.
 *
 * A github.com override on a non-GitHub remote still counts: a separate tracker
 * repository is a real configuration, and that is what the key is for.
 */
function hasGitHubCoordinates(repo?: TrackerSource | null): boolean {
  return ON_GITHUB_COM.test(repo?.issues?.githubIssuesUrl || '')
    || ON_GITHUB_COM.test(repo?.remoteUrl || '')
}

/**
 * Which tracker receives this repository's tickets.
 *
 * The ladder is the one documented in skills/magic-plan/references/trackers.md §1.0,
 * restated here so the app and the skills cannot answer differently:
 *
 * | 1 | `plan.tracker` is `github` or `jira`            | that tracker            |
 * | 2 | `ask`, and only ONE side is configured          | the one that is         |
 * | 3 | `ask`, and both are                             | `ask`                   |
 * | 4 | `ask`, neither is, but the remote is on GitHub  | `github`                |
 * | 5 | nothing resolves                                | `ask`                   |
 *
 * Row 4 qualifies an address on being *on github.com* — the remote, or the
 * `issues.githubIssuesUrl` override — and that qualification is the whole of
 * `hasGitHubCoordinates` below. `resolveGitHubIssuesUrl` cannot stand in for it: it
 * appends `/issues` to ANY remote, so reading it as "has GitHub coordinates"
 * resolves a GitLab clone with no Jira config to `github`, queries github.com for a
 * repository that is not there, and leaves a permanent "repository not found" card
 * on the Tasks page.
 *
 * "Jira coordinates are configured" means the Jira project **or** the Jira site — a
 * repo with a site and no project key is still Jira-destined, and calling it GitHub
 * would file its tickets in the wrong backlog. Both are read through the resolve*
 * chains above, so the legacy keys count exactly as the current ones do.
 *
 * `ask` is a real answer, not a failure: it means the question needs a human. A
 * SURFACE that cannot ask it — the Tasks page lists what it can read, it does not
 * hold a conversation — must exclude `ask` rather than guess a side.
 */
export function resolveTracker(repo?: TrackerSource | null): ResolvedTracker {
  const configured = repo?.plan?.tracker
  if (configured === 'github' || configured === 'jira') return configured

  const hasJira = !!(resolveJiraProject(repo) || resolveJiraSite(repo))
  const hasGitHub = hasGitHubCoordinates(repo)

  if (hasJira) return hasGitHub ? 'ask' : 'jira'
  return hasGitHub ? 'github' : 'ask'
}

/**
 * Whether a repository's tickets can be READ from this tracker.
 *
 * A different question from `resolveTracker`, and deliberately so. That one answers
 * "where does a new ticket GO", and it has to name a single place: a skill about to
 * file a ticket cannot file it in two, so when both sides are configured it declines
 * and says `ask`. A LISTING surface is under no such constraint — it shows what is
 * there — and for it `ask` is not a refusal to answer but the case where both sides
 * have something to show. Excluding those repositories is what left the Tasks page
 * blank for a repo that had a GitHub remote and a Jira site and had simply never
 * been told which one wins.
 *
 * `ask` has TWO causes and conflating them is the trap here (see the ladder above):
 * rows 2-3, where both sides are configured, and row 5, where NEITHER is and there
 * is nothing to read anywhere. Only the first can be read from, so the coordinates
 * are re-checked rather than inferred from the word `ask` — otherwise a repository
 * with no remote and no Jira project would be queried on both.
 *
 * The reverse — a repo whose tracker is settled — is unchanged: a `github` answer
 * never reads Jira even with a project key sitting in its config, because that
 * setting is an explicit statement about where the tickets are.
 */
export function readsFrom(repo: TrackerSource | null | undefined, tracker: 'github' | 'jira'): boolean {
  const resolved = resolveTracker(repo)
  if (resolved === tracker) return true
  if (resolved !== 'ask') return false

  return tracker === 'jira'
    ? !!(resolveJiraProject(repo) || resolveJiraSite(repo))
    : hasGitHubCoordinates(repo)
}
