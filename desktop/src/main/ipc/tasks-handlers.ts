import { ipcMain } from 'electron'
import type {
  GitHubTaskRepoGroup,
  JiraTaskRepoGroup,
  PRStatusError,
  RepositoryConfig,
  TaskIssueDetail,
  TaskRepoGroup,
  TasksSnapshot,
} from '../../types'
import { isPRStatusError } from '../../types'
import { resolveGitHubIssuesUrl, resolveJiraProject, resolveJiraSite, resolveTracker } from '../../tracker'
import { readConfig } from '../config/config'
import { getGitHubToken } from '../github'
import { fetchIssueDetail, fetchOpenIssues } from '../github-issues'
import { fetchSprintIssues, type AtlassianDeps } from '../jira/atlassian-api'
import { ATLASSIAN_API_BASE_URL, TOKEN_URL } from '../jira/constants'
import { getStatus as jiraStatus, reportUnauthorized, withFreshAccessToken } from '../jira/connect'
import {
  buildOpenSprintProbeJql,
  buildSprintJql,
  classifyUnexpected,
  mapSprintIssues,
  PROBE_PAGE_SIZE,
  SPRINT_FIELDS,
  SPRINT_PAGE_SIZE,
} from '../jira/sprint-issues'

/**
 * The Tasks page's one read: what is waiting on every configured repository, from
 * whichever tracker owns its tickets.
 *
 * TWO HALVES, and neither is allowed to speak for the other:
 *  • a repository whose RESOLVED tracker is GitHub contributes its open issues;
 *  • one that resolves to Jira contributes its project's ACTIVE SPRINT — the To Do
 *    column, plus the In Progress tickets, which the renderer then narrows to the
 *    ones an agent is actually on (it is the only side that knows).
 *
 * Resolved, not configured: `plan.tracker` is `ask` on most repositories, and the
 * ladder in `tracker.ts` is what turns that into an answer. A repo that resolves to
 * `ask` — a question a page cannot put to anybody — still gets no group at all,
 * because "no issues here" and "nobody has said where the issues are" are different
 * statements.
 *
 * WHY THE CONNECTION STATE IS PER SOURCE. This handler used to return
 * `{ githubConnected: false, groups: [] }` before it had even read the config, so a
 * user whose repositories are all in Jira and who has never installed `gh` was shown
 * a "GitHub is not connected" wall in place of their sprint. Each half now consults
 * only its own credential, and a source with nothing tracked on it is never
 * consulted at all.
 *
 * NO POLLER. The page reads on open and on an explicit reload, and nothing else:
 * a backlog is not a live object the way a PR under review is, and a poll on it
 * would spend GraphQL and Jira budget on a page nobody is looking at.
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

interface JiraRepo {
  configKey: string
  name: string
  projectKey: string
  /** The site the browse links are built on; `''` when the repo declares none. */
  siteUrl: string
}

/**
 * The Jira-tracked repositories that have somewhere to read FROM.
 *
 * Qualified on the PROJECT KEY, and on nothing else. The ticket asked for the Jira
 * site to be checked for an `atlassian.net` host, as `parseOwnerRepo` checks
 * github.com — but the two are not the same kind of value. `parseOwnerRepo`
 * extracts the API coordinates from the address, whereas every Jira read is
 * addressed to `api.atlassian.com/ex/jira/{cloudId}` and the site URL only ever
 * becomes a browse link. Qualifying on the host would refuse perfectly readable
 * projects (an Atlassian Cloud custom domain, or a repo that declares a key and no
 * site at all) and protect against nothing, since no request is built from it.
 *
 * The intent behind the ticket's rule is kept: a repository declared Jira without
 * coordinates must not produce a call. `resolveJiraProject` is the value the query
 * actually needs, so it is the value the guard is on — the same qualification
 * /magic:plan makes (skills/magic-plan/references/trackers.md §1).
 */
function jiraRepos(repositories: Record<string, RepositoryConfig>): JiraRepo[] {
  const result: JiraRepo[] = []
  for (const [configKey, repo] of Object.entries(repositories)) {
    if (resolveTracker(repo) !== 'jira') continue
    const projectKey = resolveJiraProject(repo)
    if (!projectKey) continue
    result.push({
      configKey,
      name: repo.name || configKey,
      projectKey,
      siteUrl: resolveJiraSite(repo),
    })
  }
  return result
}

/**
 * The transport for the sprint read.
 *
 * `connect.ts` binds its own copy for the OAuth legs and does not export it; a
 * second literal here is three lines against making the credential module's
 * internals public. `tokenUrl` is never used by this file's one call and is part of
 * the interface, so it is filled in rather than faked.
 */
const atlassianDeps: AtlassianDeps = {
  fetch: (url, init) => fetch(url, init),
  tokenUrl: TOKEN_URL,
  apiBaseUrl: ATLASSIAN_API_BASE_URL,
}

/**
 * How long a successful sprint read stands before another one is made.
 *
 * The floor `pr-review-watcher/scheduling.ts` puts on its poll
 * (`MIN_POLL_INTERVAL_MS`), for the same reason and with none of the machinery: the
 * page has no poller, but its Reload button does not rate-limit itself, and opening
 * and closing the modal three times must not be three round trips per project.
 *
 * ONLY SUCCESSES ARE CACHED. A failure is very often something the reader is in the
 * middle of fixing — a project key just corrected, an Atlassian account just
 * connected — and a Reload that answered from a thirty-second-old failure would
 * look like the fix had not worked.
 */
const JIRA_MIN_REFRESH_MS = 30_000

/**
 * The cache key: the repository AND the project it is currently pointed at.
 *
 * Changing a project key in Settings has to invalidate, and it is the one edit a
 * user makes precisely because the current answer is wrong.
 *
 * Joined on `\u0000` — the ESCAPE, never the byte itself, which is the separator
 * `renderer/utils/taskAgents.ts` already composes keys with. A literal NUL in the
 * source makes git treat the whole file as binary and grep skip it silently.
 */
function sprintKey(repo: JiraRepo): string {
  return `${repo.configKey}\u0000${repo.projectKey}`
}

/**
 * The Jira half of the snapshot, and the memory it keeps between reads.
 *
 * A factory rather than module-level maps, so the cache belongs to a HANDLER
 * REGISTRATION rather than to the process. `setupTasksHandlers()` is called once at
 * startup, so this changes nothing in production — and it means the state has an
 * owner, which module-level mutable maps never do.
 */
function createSprintReader() {
  /** One repository's last successful sprint read, and when it was made. */
  const sprintCache = new Map<string, { at: number; group: JiraTaskRepoGroup }>()

  /**
   * The reads currently in flight, one entry per repository.
   *
   * Shared rather than merely deduplicated over time: two overlapping page opens
   * (the modal reopened while the first read is still out) would otherwise send two
   * identical queries per project, and — with an expired access token — race each
   * other through `withFreshAccessToken`. That refresh is single-flighted on its own
   * side, so this is about the Jira call, not the credential.
   */
  const sprintInFlight = new Map<string, Promise<JiraTaskRepoGroup>>()

  /**
   * One repository's active sprint, as a group.
   *
   * Never throws: every failure — including one from our own code — comes back as a
   * named error on this repository's own card, so the `Promise.all` below can never
   * reject the whole page over one bad project key (acceptance criterion 6).
   */
  async function readSprintGroup(repo: JiraRepo, credentialSiteUrl: string): Promise<JiraTaskRepoGroup> {
    const base = { tracker: 'jira' as const, configKey: repo.configKey, name: repo.name }

    const key = sprintKey(repo)
    const cached = sprintCache.get(key)
    if (cached && Date.now() - cached.at < JIRA_MIN_REFRESH_MS) return cached.group
    const running = sprintInFlight.get(key)
    if (running) return running

    const attempt = (async (): Promise<JiraTaskRepoGroup> => {
      // Asked for AFTER the connection check the caller made, and separately, because
      // `withFreshAccessToken()` answers null for three different situations and only
      // one of them is "reconnect": a missing credential, a refresh that failed, and a
      // keychain that has gone away all return the same null (see its doc in
      // connect.ts). The caller has already established that a verified credential is
      // stored, so a null HERE is the machine or the network, not the user's account —
      // and telling someone to reconnect an account that is fine is the failure this
      // split exists to avoid.
      const fresh = await withFreshAccessToken()
      if (!fresh) {
        return { ...base, issues: [], error: { error: 'offline', message: 'No usable Atlassian access token for this read.' } }
      }

      try {
        const page = await fetchSprintIssues(atlassianDeps, {
          accessToken: fresh.accessToken,
          cloudId: fresh.cloudId,
          jql: buildSprintJql(repo.projectKey),
          fields: SPRINT_FIELDS,
          maxResults: SPRINT_PAGE_SIZE,
        })

        // The card is empty. That is two different sentences — "this project has no
        // sprint running" and "the sprint has nothing left to do" — and the filtered
        // query cannot tell them apart, since it excludes the finished tickets that
        // would prove a sprint exists. So ask, with one row, and only here: this
        // costs a round trip exactly when the card would otherwise say nothing
        // useful, and never on the common path (acceptance criterion 5).
        if (page.issues.length === 0) {
          const probe = await fetchSprintIssues(atlassianDeps, {
            accessToken: fresh.accessToken,
            cloudId: fresh.cloudId,
            jql: buildOpenSprintProbeJql(repo.projectKey),
            fields: SPRINT_FIELDS,
            maxResults: PROBE_PAGE_SIZE,
          })
          if (probe.issues.length === 0) {
            return { ...base, issues: [], error: { error: 'no-active-sprint', message: `No open sprint in ${repo.projectKey}.` } }
          }
          // A sprint is running and everything in it is done. An empty group, not an
          // error: the card says "nothing to do", which is the truth.
          const done: JiraTaskRepoGroup = { ...base, issues: [] }
          sprintCache.set(key, { at: Date.now(), group: done })
          return done
        }

        const group: JiraTaskRepoGroup = {
          ...base,
          issues: mapSprintIssues(page.issues, repo.siteUrl || credentialSiteUrl),
          ...(page.nextPageToken ? { truncated: true } : {}),
        }
        sprintCache.set(key, { at: Date.now(), group })
        return group
      } catch (error) {
        return { ...base, issues: [], error: classifyUnexpected(error) }
      }
    })().finally(() => {
      // Identity-checked for `withFreshAccessToken`'s reason: by the time this settles
      // a later caller may already have started its own attempt, and clearing the slot
      // blindly would let a third caller start a duplicate.
      if (sprintInFlight.get(key) === attempt) sprintInFlight.delete(key)
    })

    sprintInFlight.set(key, attempt)
    return attempt
  }

  /**
   * The Jira half of the snapshot: one group per Jira-tracked repository.
   *
   * A repository whose read cannot even be attempted gets its own `not-connected`
   * group rather than the page saying it once. That DIVERGES from the GitHub half
   * deliberately — acceptance criterion 4 asks that each Jira group say so and offer
   * the Settings route, which is only possible if each group exists — and it costs
   * nothing, because the alternative is a card that renders empty and reads as "this
   * sprint has nothing in it".
   */
  async function jiraGroups(repos: JiraRepo[]): Promise<{ connected: boolean; groups: JiraTaskRepoGroup[] }> {
    // The credential is read ONCE for the page, and only when a repository depends on
    // it: `getStatus()` touches the keychain on its first call, which a user with no
    // Jira repository has no reason to be prompted for.
    const status = jiraStatus()
    // `unverified` counts as not connected here: Atlassian refused this credential the
    // last time it was used, and the Settings section is already offering Reconnect.
    // Sending the read anyway would earn a 401 per repository and say nothing the user
    // has not been told.
    const connected = status.connected && !status.unverified

    if (!connected) {
      return {
        connected,
        groups: repos.map((repo) => ({
          tracker: 'jira',
          configKey: repo.configKey,
          name: repo.name,
          issues: [],
          error: { error: 'not-connected', message: 'No verified Atlassian credential on this machine.' },
        })),
      }
    }

    const groups = await Promise.all(repos.map((repo) => readSprintGroup(repo, status.siteUrl ?? '')))

    // Every 401 funnels through `reportUnauthorized` — it is the only thing that can
    // repair the one repairable cause (a cloud id that moved) and the only place
    // allowed to mark a credential unverified.
    //
    // ONCE for the page, not once per repository. A refused credential is a fact
    // about the account, so every Jira read above fails together — and
    // `reportUnauthorized` is not single-flighted: N calls would mean N
    // accessible-resources round trips, racing each other to decide whether the site
    // moved. The first to finish repairs it; the rest then see an unchanged site and
    // mark the credential unverified, putting a Reconnect prompt in front of an
    // account that was just fixed. Not awaited for its answer either way: it works in
    // the background and the NEXT read is the one that benefits.
    if (groups.some((group) => group.error?.error === 'unauthorized')) {
      void reportUnauthorized()
    }

    return { connected, groups }
  }

  return jiraGroups
}

export function setupTasksHandlers(): void {
  const readJiraGroups = createSprintReader()

  // Every failure is captured into its own group: a repository whose read fails is
  // reported as failed and the others still render. The try/catch is not redundant
  // with fetchOpenIssues' error return — it covers the unexpected throw, which a
  // Promise.all would otherwise turn into a blank page.
  ipcMain.handle('tasks:listOpenIssues', async (): Promise<TasksSnapshot> => {
    const repositories = readConfig().repositories ?? {}

    // Asked once, for the GitHub half as a whole: with no token every GitHub group
    // would carry the same `no-token` error, which is a connection state and
    // deserves saying once. What it no longer does is short-circuit the PAGE — the
    // Jira half below has its own credential and its own answer.
    const githubConnected = !!getGitHubToken()
    const github = githubConnected ? githubRepos(repositories) : []

    // Both halves at once. A slow Jira site must not hold the GitHub cards back, and
    // vice versa; each repository's failure is already confined to its own group.
    const [githubGroupList, jira] = await Promise.all([
      Promise.all(github.map(async (repo): Promise<GitHubTaskRepoGroup> => {
        const base = { tracker: 'github' as const, configKey: repo.configKey, name: repo.name }
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
      })),
      readJiraGroups(jiraRepos(repositories)),
    ])

    const groups: TaskRepoGroup[] = [...githubGroupList, ...jira.groups]
    return { connected: { github: githubConnected, jira: jira.connected }, groups }
  })

  /**
   * Whether an IPC payload really is a (config key, issue number) pair.
   *
   * The handler below used to say `args: { configKey: string; number: number }` and
   * leave it at that — a compile-time claim about a value that arrives over the
   * bridge at RUNTIME, where the annotation is erased. The two reads it feeds sit
   * outside the handler's try/catch, so an `args` that was not there at all threw
   * where that handler promises a named failure, and a `number` that was not one
   * rode down to api.github.com to be rejected there instead of here.
   *
   * `Number.isInteger` rather than `typeof === 'number'`: the number reaches GitHub
   * as an `Int!`, and `NaN`, `Infinity` and `3.5` are all of type number. A blank
   * key is rejected too — it can only ever miss.
   */
  const isIssueDetailArgs = (args: unknown): args is { configKey: string; number: number } => {
    if (typeof args !== 'object' || args === null) return false
    const { configKey, number } = args as { configKey?: unknown; number?: unknown }
    return typeof configKey === 'string' && configKey !== '' && Number.isInteger(number)
  }

  /**
   * ONE issue's body, state, assignees and comment count — the half of an issue the
   * list read deliberately leaves behind (see `TaskIssue`). Called when the detail
   * panel opens on a row, and only then.
   *
   * Takes the repository's CONFIG KEY, not an owner and a repo: the renderer holds
   * the group it drew the row from, and re-parsing the issue URL there would put a
   * second copy of `parseOwnerRepo` on the other side of the bridge — one the
   * renderer could then get wrong, or be handed a URL to any host at all. Resolving
   * the key through `githubRepos` also means a repository that stopped being
   * GitHub-tracked between the list and the click answers "not found" rather than
   * being queried against api.github.com anyway.
   */
  ipcMain.handle(
    'tasks:getIssueDetail',
    async (_event, args: unknown): Promise<TaskIssueDetail | PRStatusError> => {
      // Before anything else, and before the token check: a payload this handler
      // cannot read is not a question about GitHub at all. Reported as `not-found`
      // like the unknown-key branch below — the two failures are the same one from
      // the panel's side, "this handler cannot say which issue you mean" — and the
      // message carries what actually happened, since only our own renderer can
      // produce this.
      if (!isIssueDetailArgs(args)) {
        return {
          error: 'not-found',
          message: 'Malformed tasks:getIssueDetail payload: expected a config key and an issue number.',
        }
      }

      if (!getGitHubToken()) {
        return { error: 'no-token', message: 'No GitHub token: run `gh auth login` to read this issue.' }
      }

      const repo = githubRepos(readConfig().repositories ?? {})
        .find((candidate) => candidate.configKey === args.configKey)
      if (!repo) {
        return { error: 'not-found', message: `No GitHub-tracked repository is configured as ${args.configKey}.` }
      }

      // Same reason as the group loop above: an unexpected throw must come back as
      // a named failure the panel can render, not reject into an empty frame.
      try {
        return await fetchIssueDetail(repo.owner, repo.repo, args.number)
      } catch (err) {
        return { error: 'network', message: err instanceof Error ? err.message : String(err) }
      }
    },
  )
}
