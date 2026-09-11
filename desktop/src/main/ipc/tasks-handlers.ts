import { ipcMain } from 'electron'
import type {
  GitHubTaskRepoGroup,
  JiraTaskIssue,
  JiraTaskIssueDetail,
  JiraTaskRepoGroup,
  JiraTaskStatusError,
  PlanTicketStates,
  PRStatusError,
  RepositoryConfig,
  TaskBoardColumn,
  TaskIssueDetail,
  TaskRepoGroup,
  TasksSnapshot,
} from '../../types'
import { isPRStatusError } from '../../types'
import { readsFrom, resolveGitHubIssuesUrl, resolveJiraProject, resolveJiraSite } from '../../tracker'
import { readConfig } from '../config/config'
import { getGitHubToken } from '../github'
import { fetchIssueDetail, fetchIssueStates, fetchOpenIssues } from '../github-issues'
import {
  fetchJiraFields,
  fetchJiraIssue,
  fetchProjectStatuses,
  fetchSprintIssues,
  type AtlassianDeps,
} from '../jira/atlassian-api'
import { ATLASSIAN_API_BASE_URL, TOKEN_URL } from '../jira/constants'
import { getStatus as jiraStatus, reportUnauthorized, withFreshAccessToken } from '../jira/connect'
import { DETAIL_FIELDS, mapIssueDetail as mapJiraIssueDetail } from '../jira/issue-detail'
import {
  applyEpicColors,
  buildEpicColorJql,
  buildKeyInJql,
  buildOpenSprintProbeJql,
  buildSprintBacklogJql,
  buildSprintBlockedJql,
  buildSprintProgressJql,
  buildSprintSearchJql,
  epicKeys,
  findEpicColorFieldIds,
  findSprintFieldId,
  mapEpicColors,
  pickSprintName,
  // `classifyUnexpected` and not `classify`: it delegates to it for an
  // `AtlassianApiError` and covers the throw that is a bug on our side, which must
  // still land in the panel rather than reject at the bridge.
  classifyUnexpected,
  dedupeByKey,
  mapSprintIssues,
  mapDoneSprintIssues,
  buildSprintDoneJql,
  PROBE_PAGE_SIZE,
  readProjectStatusNames,
  SPRINT_FIELDS,
  SPRINT_COLUMN_PAGE_SIZE,
  SPRINT_DONE_PAGE_SIZE,
  SPRINT_SEARCH_PAGE_SIZE,
  STATUS_FIELDS,
  JIRA_MAX_PAGE_SIZE,
  mapTicketStatuses,
} from '../jira/sprint-issues'
import { blockedStatusNames } from '../../blocked'

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
 * `ask` contributes to BOTH halves — see `readsFrom` in `tracker.ts`. It used to
 * contribute to neither, on the reasoning that a page cannot put the question to
 * anybody; the flaw in that is that it cannot ANSWER the question either, and the
 * silence read as "nothing open here" rather than "nobody has said where to look".
 * Showing both backlogs, each labelled with its tracker, says the true thing.
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
  /** `github:owner/repo`, lower-cased. See `TaskRepoGroupBase.sourceKey`. */
  sourceKey: string
}

/**
 * The two spellings of one GitHub target folded into one string.
 *
 * Lower-cased because GitHub is case-insensitive about both halves — `Poppins/PEX`
 * and `poppins/pex` are the same repository and the same issues — so two config
 * entries that differ only in casing must not read as two different backlogs.
 */
function githubSourceKey(owner: string, repo: string): string {
  return `github:${owner.toLowerCase()}/${repo.toLowerCase()}`
}

/**
 * The same for a Jira project: the site the tickets live on, and the project key.
 *
 * `credentialSiteUrl` is the fallback a repository that declares no site of its own
 * is actually read against (it is also what its browse links are built on), so it
 * is what makes such a repo fold onto a sibling that names the site explicitly.
 *
 * The site is normalised the way a URL typed by hand needs to be — case and a
 * trailing slash carry no meaning in a host — and the project key upper-cased,
 * since Jira resolves `per-1` and `PER-1` to one ticket.
 */
function jiraSourceKey(siteUrl: string, projectKey: string, credentialSiteUrl: string): string {
  const site = (siteUrl || credentialSiteUrl).trim().replace(/\/+$/, '').toLowerCase()
  return `jira:${site}|${projectKey.toUpperCase()}`
}

/**
 * The repositories whose issues can be read from GitHub, with an owner and a repo
 * parsed out of them.
 *
 * `readsFrom` and not `resolveTracker`, which is what makes an UNDECIDED repository
 * — GitHub remote and Jira site both configured, `plan.tracker` never set — appear
 * on this page at all. It contributes a group here AND one in `jiraRepos` below;
 * see the note there on why two groups for one repository is the honest answer.
 *
 * A repo whose target does not parse is skipped rather than reported: an
 * `issues.githubIssuesUrl` override is free text, and a card saying "this is not a
 * URL" belongs in the settings form that accepted it, not on a backlog page.
 */
function githubRepos(repositories: Record<string, RepositoryConfig>): GitHubRepo[] {
  const result: GitHubRepo[] = []
  for (const [configKey, repo] of Object.entries(repositories)) {
    if (!readsFrom(repo, 'github')) continue
    const parsed = parseOwnerRepo(resolveGitHubIssuesUrl(repo))
    if (!parsed) continue
    result.push({
      configKey,
      name: repo.name || configKey,
      ...parsed,
      sourceKey: githubSourceKey(parsed.owner, parsed.repo),
    })
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
    // `readsFrom`, so an UNDECIDED repository is read here as well as in
    // `githubRepos` above. The two groups it produces are not a duplicate: they are
    // two different backlogs that both belong to it, and the page labels each with
    // its tracker. Deciding for the reader is what this page must not do — it cannot
    // put the question to anybody, and picking one side silently would hide real
    // tickets behind a setting nobody knew existed.
    if (!readsFrom(repo, 'jira')) continue
    // The project key is still the qualification, and it is the whole of why an
    // undecided repo with a Jira SITE and no key produces a GitHub group only: there
    // is nothing to query. Silence rather than a card, deliberately — an empty Jira
    // card beside a full GitHub one reads as "the sprint is empty", which is a claim
    // this code cannot make.
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
 * What one sprint read produces, WITHOUT the repository it was read for.
 *
 * The split is the whole of how two repositories planned in one Jira project cost
 * one call instead of two: this half depends only on the project, so it is what the
 * cache below holds, while `configKey` and `name` are put back per repository by
 * `readSprintGroup`. Caching whole groups would hand the second repository the
 * first one's name.
 */
type SprintPayload = Omit<JiraTaskRepoGroup, 'tracker' | 'configKey' | 'name' | 'sourceKey'>

/**
 * The answer a column that was never asked for gives: no rows, and no further page.
 *
 * A resolved promise rather than a branch around the `Promise.all`, so the four columns
 * stay four positional results and nothing downstream has to know that one of them may
 * not have been a request. Shared, because it is immutable and a fresh object per read
 * would be allocation for nothing.
 */
const EMPTY_PAGE: Promise<{ issues: unknown[]; nextPageToken: string | null }> =
  Promise.resolve({ issues: [], nextPageToken: null })

/**
 * The Jira half of the snapshot, and the memory it keeps between reads.
 *
 * A factory rather than module-level maps, so the cache belongs to a HANDLER
 * REGISTRATION rather than to the process. `setupTasksHandlers()` is called once at
 * startup, so this changes nothing in production — and it means the state has an
 * owner, which module-level mutable maps never do.
 */
function createSprintReader() {
  /**
   * One PROJECT's last successful sprint read, and when it was made.
   *
   * Keyed by `sourceKey` — the site and the project — and not by the repository, so
   * two repositories planned in one Jira project answer from one read. They used to
   * be keyed by `(configKey, projectKey)`, which made the same query twice and
   * returned the same tickets under two names.
   *
   * A project key changed in Settings still invalidates: it is half of the key.
   */
  const sprintCache = new Map<string, { at: number; payload: SprintPayload }>()

  /**
   * The reads currently in flight, one entry per PROJECT.
   *
   * Shared rather than merely deduplicated over time: two overlapping page opens
   * (the modal reopened while the first read is still out) would otherwise send two
   * identical queries per project, and — with an expired access token — race each
   * other through `withFreshAccessToken`. That refresh is single-flighted on its own
   * side, so this is about the Jira call, not the credential.
   *
   * On the same key as the cache, which is what makes the two repositories of one
   * project share the FIRST page open as well as every later one.
   */
  const sprintInFlight = new Map<string, Promise<SprintPayload>>()

  /**
   * The custom-field ids this site gave the two things the page asks for by id.
   *
   * Both are CUSTOM fields, so their ids differ per site and a search returns them
   * only when named by that id — see `fetchJiraFields`. One `/rest/api/3/field` read
   * answers for both, which is why they are resolved together rather than by a lookup
   * each: the sprint name on the card header and the colour on an epic badge are two
   * captions, and neither is worth a call of its own.
   *
   * Keyed by cloud id because a user can reconnect to a different site without
   * restarting the app.
   */
  interface JiraFieldIds {
    /** The Sprint field, or `''` on a site with no Jira Software on it. */
    sprint: string
    /** The epic colour fields in preference order; empty on a site that has neither. */
    epicColors: string[]
  }

  /** What a site that answered nothing usable looks like, and what a failed lookup returns. */
  const NO_FIELD_IDS: JiraFieldIds = { sprint: '', epicColors: [] }

  /**
   * That lookup, resolved once and kept for the process.
   *
   * Cached as a PROMISE, so the several repositories that read their sprints in
   * parallel on the first page open share one lookup rather than making one each.
   * A lookup that FAILS is dropped from the map, so the next page open tries again
   * — the ids are not knowledge worth keeping a network blip's answer for.
   */
  const fieldIdsBySite = new Map<string, Promise<JiraFieldIds>>()

  function jiraFieldIds(accessToken: string, cloudId: string): Promise<JiraFieldIds> {
    const cached = fieldIdsBySite.get(cloudId)
    if (cached) return cached
    const attempt = fetchJiraFields(atlassianDeps, { accessToken, cloudId })
      .then((fields) => ({ sprint: findSprintFieldId(fields), epicColors: findEpicColorFieldIds(fields) }))
      // Never fatal, and never reported: the sprint's NAME is a caption on the card
      // header and an epic's colour is a dot on a badge, and a card that shows its
      // tickets without either is the whole feature working. Failing the read over
      // them would trade the page for the caption.
      .catch(() => {
        fieldIdsBySite.delete(cloudId)
        return NO_FIELD_IDS
      })
    fieldIdsBySite.set(cloudId, attempt)
    return attempt
  }

  /**
   * Which statuses THIS PROJECT calls blocked, resolved once and kept for the process.
   *
   * `jiraFieldIds`' twin one level down, and it makes the same trade for the same
   * reason: cached as a PROMISE so the repositories reading their sprints in parallel
   * share one lookup, and dropped from the map when it fails so the next page open
   * tries again.
   *
   * PER PROJECT, not per site, because the question is what THIS team calls blocked —
   * two projects on one site run different workflows, and pooling their status names
   * would put another team's word into this project's query.
   *
   * NEVER FATAL, and this is the important half. An empty list is a working board: the
   * three unfinished queries drop their status clause (see `statusClause`), Blocked
   * loses its own budget, and its tickets arrive inside the other two columns where the
   * renderer files them under Blocked by name anyway. Failing the sprint over a lookup
   * that only buys a budget would trade the board for the protection.
   */
  const blockedStatusesByProject = new Map<string, Promise<string[]>>()

  function blockedStatuses(accessToken: string, cloudId: string, projectKey: string): Promise<string[]> {
    const cacheKey = `${cloudId}:${projectKey}`
    const cached = blockedStatusesByProject.get(cacheKey)
    if (cached) return cached
    const attempt = fetchProjectStatuses(atlassianDeps, { accessToken, cloudId, projectKey })
      .then((raw) => blockedStatusNames(readProjectStatusNames(raw)))
      .catch(() => {
        blockedStatusesByProject.delete(cacheKey)
        return []
      })
    blockedStatusesByProject.set(cacheKey, attempt)
    return attempt
  }

  /**
   * The same tickets with their epics' colours filled in.
   *
   * ONE EXTRA SEARCH PER CARD, and only when there is something to ask about: a
   * sprint whose tickets hang off no epic, and a site with no colour field, both
   * return before any request is made. Where it does ask, it asks about the DISTINCT
   * epics — three or four for a sprint of fifty tickets (see `epicKeys`) — so the
   * cost is one round trip, not one per row.
   *
   * WHY IT CANNOT RIDE ALONG WITH THE SPRINT READ. Jira sends `parent` inline with
   * the key, the summary and the issue type, and no custom fields at all — so the
   * epic's colour is simply not in the response the rows come from, whatever is asked
   * for. The alternative to a second search is no colour.
   *
   * NEVER FATAL. The colour is a dot on a badge that already carries the epic's name;
   * a failure here leaves the badges uncoloured and the card otherwise complete,
   * which is strictly better than turning a readable sprint into an error row. That
   * is the same trade `jiraFieldIds` makes one level up.
   */
  async function colourEpics(
    issues: JiraTaskIssue[],
    fresh: { accessToken: string; cloudId: string },
    colorFieldIds: string[],
  ): Promise<JiraTaskIssue[]> {
    if (colorFieldIds.length === 0) return issues
    const keys = epicKeys(issues)
    if (keys.length === 0) return issues

    try {
      const page = await fetchSprintIssues(atlassianDeps, {
        accessToken: fresh.accessToken,
        cloudId: fresh.cloudId,
        jql: buildEpicColorJql(keys),
        fields: colorFieldIds,
        // Exactly what was asked about: the query is `key in (...)`, so a larger cap
        // could not return more and a smaller one would silently drop epics.
        maxResults: keys.length,
      })
      return applyEpicColors(issues, mapEpicColors(page.issues, colorFieldIds))
    } catch {
      return issues
    }
  }

  /**
   * One PROJECT's active sprint, as the half of a group that depends on nothing but
   * the project.
   *
   * Never throws: every failure — including one from our own code — comes back as a
   * named error on this project's own card, so the `Promise.all` below can never
   * reject the whole page over one bad project key (acceptance criterion 6).
   *
   * `key` is passed in rather than derived, because the site it names is resolved
   * against the connected account (see `jiraSourceKey`) and only the caller has it.
   */
  async function readSprint(repo: JiraRepo, credentialSiteUrl: string, key: string): Promise<SprintPayload> {
    const cached = sprintCache.get(key)
    if (cached && Date.now() - cached.at < JIRA_MIN_REFRESH_MS) return cached.payload
    const running = sprintInFlight.get(key)
    if (running) return running

    const attempt = (async (): Promise<SprintPayload> => {
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
        return { issues: [], error: { error: 'offline', message: 'No usable Atlassian access token for this read.' } }
      }

      try {
        // Asked for BEFORE the search rather than beside it: the id is what the
        // search has to name to get the sprint back, and it is one call for the
        // whole process (see `sprintFieldId`). `''` on a site with no Jira Software
        // on it, which asks for nothing extra and shows no sprint name.
        const fieldIds = await jiraFieldIds(fresh.accessToken, fresh.cloudId)
        const fieldId = fieldIds.sprint
        const fields = fieldId ? [...SPRINT_FIELDS, fieldId] : SPRINT_FIELDS

        // WHICH STATUSES THIS PROJECT CALLS BLOCKED, before the searches rather than
        // beside them: the three unfinished queries all name them — one to claim them,
        // two to exclude them — so there is nothing to run in parallel with. Cached for
        // the process, so this costs a round trip on the first read of a project and
        // nothing afterwards, and an empty answer is a working board (see
        // `blockedStatuses`).
        const blocked = await blockedStatuses(fresh.accessToken, fresh.cloudId, repo.projectKey)

        // ONE QUERY PER COLUMN, all four at once.
        //
        // The three unfinished ones used to be a single search sharing one 50-ticket
        // budget, and that shared budget was the bug: a four-hundred-ticket backlog
        // spent the page on To Do rows and left Blocked and In progress empty, on a
        // board that gave no sign anything was missing. Ordering the shared query by
        // status category bought In progress a reprieve; Blocked, which is a word in a
        // status name rather than a category, never had one.
        //
        // FOUR ROUND TRIPS AND NOT ONE, therefore — in parallel, so a board costs the
        // same wall clock it did, and each column only ever sends the rows it has. What
        // it buys is that no column can starve another, and that the page can say WHICH
        // column it had to cut short instead of hanging one caveat over everything.
        const [blockedPage, backlogPage, progressPage, donePage] = await Promise.all([
          // ASKED ONLY WHEN THERE IS SOMETHING TO ASK FOR. With no blocked status on
          // this project — none defined, or the status lookup failed — the clause is
          // empty, and a blocked query without it is `statusCategory != Done`: every
          // unfinished ticket, which is exactly what the other two queries already
          // fetch between them. A round trip for a third copy, on the majority of
          // projects, to fill a column the renderer fills from the other two anyway.
          blocked.length > 0
            ? fetchSprintIssues(atlassianDeps, {
              accessToken: fresh.accessToken,
              cloudId: fresh.cloudId,
              jql: buildSprintBlockedJql(repo.projectKey, blocked),
              fields,
              maxResults: SPRINT_COLUMN_PAGE_SIZE,
            })
            : EMPTY_PAGE,
          fetchSprintIssues(atlassianDeps, {
            accessToken: fresh.accessToken,
            cloudId: fresh.cloudId,
            jql: buildSprintBacklogJql(repo.projectKey, blocked),
            fields,
            maxResults: SPRINT_COLUMN_PAGE_SIZE,
          }),
          fetchSprintIssues(atlassianDeps, {
            accessToken: fresh.accessToken,
            cloudId: fresh.cloudId,
            jql: buildSprintProgressJql(repo.projectKey, blocked),
            fields,
            maxResults: SPRINT_COLUMN_PAGE_SIZE,
          }),
          fetchSprintIssues(atlassianDeps, {
            accessToken: fresh.accessToken,
            cloudId: fresh.cloudId,
            jql: buildSprintDoneJql(repo.projectKey),
            fields,
            maxResults: SPRINT_DONE_PAGE_SIZE,
          }),
        ])

        // The three unfinished pages as one list, in the order the columns are drawn.
        // They are three queries and one set of rows: `JiraTaskIssue` carries no column,
        // because the renderer decides that from the status (see `taskBoard.ts`) and a
        // column stamped here would be a second answer that could disagree with it.
        const unfinished = [...blockedPage.issues, ...backlogPage.issues, ...progressPage.issues]

        // The card is empty. That is two different sentences — "this project has no
        // sprint running" and "the sprint has nothing left to do" — and the unfinished
        // queries cannot tell them apart on their own, since they exclude the finished
        // tickets that would prove a sprint exists.
        //
        // The Done read answers it for free WHENEVER IT CAME BACK WITH SOMETHING: a
        // finished ticket in an open sprint is proof of an open sprint. So the probe is
        // now asked only when EVERY half is empty, which is the one case left where
        // nothing on hand can distinguish the two — and it is one round trip fewer than
        // before on a sprint that is simply finished.
        if (unfinished.length === 0 && donePage.issues.length === 0) {
          const probe = await fetchSprintIssues(atlassianDeps, {
            accessToken: fresh.accessToken,
            cloudId: fresh.cloudId,
            jql: buildOpenSprintProbeJql(repo.projectKey),
            fields,
            maxResults: PROBE_PAGE_SIZE,
          })
          if (probe.issues.length === 0) {
            return { issues: [], error: { error: 'no-active-sprint', message: `No open sprint in ${repo.projectKey}.` } }
          }
          // A sprint is running and this read can see nothing in it — every ticket is
          // done and older than the Done page could reach, or the workflow files them
          // somewhere these queries do not look. An empty group, not an error: the card
          // says "nothing to do", which is the truth, and it can still say WHICH sprint
          // off the probe's one row.
          const doneSprint = pickSprintName(probe.issues, fieldId)
          const done: SprintPayload = { issues: [], ...(doneSprint ? { sprintName: doneSprint } : {}) }
          sprintCache.set(key, { at: Date.now(), payload: done })
          return done
        }

        // Off the RAW pages, not the mapped issues: the sprint is a fact about the
        // card and not about any one row, so `JiraTaskIssue` carries no field for it
        // — one name per card rather than the same string on all fifty of them. The
        // Done page is the fallback, for the sprint whose every remaining ticket is
        // finished: it is the half that has rows to name it from.
        const sprintName = pickSprintName(unfinished, fieldId) || pickSprintName(donePage.issues, fieldId)

        // Coloured in ONE call for every column. `colourEpics` reads the epic colours
        // the tickets reference, so handing it the whole sprint at once is what stops a
        // Done ticket's epic being looked up a second time because it also appears in
        // the To Do column.
        const issues = await colourEpics(
          dedupeByKey([
            ...mapSprintIssues(unfinished, repo.siteUrl || credentialSiteUrl),
            ...mapDoneSprintIssues(donePage.issues, repo.siteUrl || credentialSiteUrl),
          ]),
          fresh,
          fieldIds.epicColors,
        )

        // WHICH columns were cut short, one cursor each. That per-column answer is the
        // whole point of having asked per column: the board marks the count on the
        // short column rather than printing one caveat over four.
        //
        // The Done column is reported like the others now. It was left out while it was
        // the only budget of its own — "a Done column that stops at 25 is showing what
        // it was asked for, not hiding work" — and that is still true of WHY it is
        // small, but not of whether the reader should be told: a `25` that is really
        // "25 of who knows" is the same misleading count on this column as on any other.
        const truncatedColumns: TaskBoardColumn[] = []
        if (blockedPage.nextPageToken) truncatedColumns.push('blocked')
        if (backlogPage.nextPageToken) truncatedColumns.push('backlog')
        if (progressPage.nextPageToken) truncatedColumns.push('progress')
        if (donePage.nextPageToken) truncatedColumns.push('done')

        const payload: SprintPayload = {
          issues,
          ...(sprintName ? { sprintName } : {}),
          ...(truncatedColumns.length > 0 ? { truncatedColumns } : {}),
        }
        sprintCache.set(key, { at: Date.now(), payload })
        return payload
      } catch (error) {
        return { issues: [], error: classifyUnexpected(error) }
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
   * One repository's card: the project's sprint, with the repository put back on it.
   *
   * The two halves are joined HERE and only here, which is what lets two
   * repositories share a read and still be told apart on screen — each gets its own
   * `configKey` and `name`, and they carry the same `sourceKey` so the renderer can
   * fold their identical cards into one.
   */
  async function readSprintGroup(repo: JiraRepo, credentialSiteUrl: string): Promise<JiraTaskRepoGroup> {
    const sourceKey = jiraSourceKey(repo.siteUrl, repo.projectKey, credentialSiteUrl)
    const payload = await readSprint(repo, credentialSiteUrl, sourceKey)
    return { tracker: 'jira', configKey: repo.configKey, name: repo.name, sourceKey, ...payload }
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
          // Named even here, so that two repositories on one project still fold into
          // one card while the account is disconnected: the reader would otherwise be
          // told the same thing twice, which is exactly what the merge exists to stop.
          // `status.siteUrl` is what a repo declaring no site of its own would be read
          // against, and it is `''` only when no credential has ever been stored — in
          // which case every group here shares that same fallback anyway.
          sourceKey: jiraSourceKey(repo.siteUrl, repo.projectKey, status.siteUrl ?? ''),
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

  /**
   * Search one project's OPEN SPRINT, past the budgets the board was read with.
   *
   * Lives in this closure and not beside its `ipcMain.handle` because of the two
   * things it borrows: `jiraFieldIds`, so a searched-up row carries the same sprint
   * field the board's rows do, and `colourEpics`, so its epic badge is coloured like
   * theirs. Both are memoised here; reaching them from outside would mean a second
   * field lookup per search and a colourless badge on every row the search added.
   *
   * NOT CACHED, where `readSprint` is. The sprint cache exists to stop a page open
   * re-reading four columns; a search is a different question every time it is asked,
   * and the renderer's debounce is where the round trips are actually saved.
   */
  async function searchSprint(
    configKey: string,
    query: string,
  ): Promise<{ issues: JiraTaskIssue[] } | JiraTaskStatusError> {
    // `unverified` counts as not connected here for `jiraGroups`' reason: Atlassian
    // refused this credential the last time it was used, and Settings is already
    // offering Reconnect.
    const status = jiraStatus()
    if (!status.connected || status.unverified) {
      return { error: 'not-connected', message: 'No verified Atlassian credential on this machine.' }
    }

    // BEFORE the token, as on every other read here: `readConfig()` is in memory,
    // where `withFreshAccessToken` can spend an OAuth round trip and rotate the stored
    // refresh token.
    const repo = jiraRepos(readConfig().repositories ?? {})
      .find((candidate) => candidate.configKey === configKey)
    if (!repo) {
      return { error: 'not-found', message: `No Jira-tracked repository is configured as ${configKey}.` }
    }

    // Before the credential refresh too: a query with no searchable term left in it is
    // a question answerable here for nothing. See `buildSprintSearchJql`.
    const jql = buildSprintSearchJql(repo.projectKey, query)
    if (!jql) return { issues: [] }

    const fresh = await withFreshAccessToken()
    if (!fresh) {
      return { error: 'offline', message: 'No usable Atlassian access token for this read.' }
    }

    try {
      const fieldIds = await jiraFieldIds(fresh.accessToken, fresh.cloudId)
      const fields = fieldIds.sprint ? [...SPRINT_FIELDS, fieldIds.sprint] : SPRINT_FIELDS
      const page = await fetchSprintIssues(atlassianDeps, {
        accessToken: fresh.accessToken,
        cloudId: fresh.cloudId,
        jql,
        fields,
        maxResults: SPRINT_SEARCH_PAGE_SIZE,
      })

      // BOTH mappers, because a search is not scoped to a category. It asks the whole
      // open sprint, so a finished ticket whose summary matches is a legitimate hit and
      // belongs in the Done column the board already draws — running only the unfinished
      // mapper would silently drop it.
      const site = repo.siteUrl || (status.siteUrl ?? '')
      const issues = dedupeByKey([
        ...mapSprintIssues(page.issues, site),
        ...mapDoneSprintIssues(page.issues, site),
      ])

      // Coloured like the board's own rows. Without it a searched-up ticket would draw a
      // colourless epic badge beside rows whose badges are coloured, which reads as the
      // ticket having a different kind of epic rather than a differently fetched one.
      return { issues: await colourEpics(issues, fresh, fieldIds.epicColors) }
    } catch (error) {
      const failure = classifyUnexpected(error)
      // The one repairable cause of a 401 (a cloud id that moved) is repaired here as it
      // is on the list read. Not awaited: the NEXT read is the one that benefits.
      if (failure.error === 'unauthorized') void reportUnauthorized()
      return failure
    }
  }

  return { readGroups: jiraGroups, searchSprint }
}

export function setupTasksHandlers(): void {
  const { readGroups: readJiraGroups, searchSprint } = createSprintReader()

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
    // One read per TARGET, not per repository: two config entries pointed at the same
    // GitHub repo hold the same issues, and asking twice would spend a second GraphQL
    // budget on an answer already in hand. Shared as the promise rather than awaited
    // in turn, so the two groups are still built in parallel with everything else.
    const issuesByTarget = new Map<string, ReturnType<typeof fetchOpenIssues>>()
    const openIssues = (repo: GitHubRepo) => {
      const running = issuesByTarget.get(repo.sourceKey)
      if (running) return running
      const attempt = fetchOpenIssues(repo.owner, repo.repo)
      issuesByTarget.set(repo.sourceKey, attempt)
      return attempt
    }

    const [githubGroupList, jira] = await Promise.all([
      Promise.all(github.map(async (repo): Promise<GitHubTaskRepoGroup> => {
        const base = {
          tracker: 'github' as const,
          configKey: repo.configKey,
          name: repo.name,
          sourceKey: repo.sourceKey,
        }
        try {
          const result = await openIssues(repo)
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

  /**
   * Whether an IPC payload really is a (config key, issue key) pair.
   *
   * `isIssueDetailArgs`' twin, and it exists for the same reason: the annotation on
   * the handler is erased at runtime, and the reads it feeds sit outside the
   * handler's try/catch.
   *
   * The KEY is checked against Jira's own shape rather than merely being a non-empty
   * string, because it lands in a URL path. `fetchJiraIssue` encodes it, so nothing
   * can reshape the address either way — but a key that cannot be one is a question
   * this handler cannot answer, and answering it here costs no round trip. The
   * pattern admits nothing but letters, digits, underscores and one hyphen, so
   * control characters, spaces and path separators are all out by construction.
   *
   * MUST TRACK `JIRA_KEY` in `renderer/utils/taskAgents.ts`, which asks the same
   * question on the other side of the bridge. The two cannot be shared today — that
   * one is renderer-only — but they must not disagree: if this one is the stricter,
   * the panel says "not found" about a ticket the list just drew, and the symptom
   * points at neither file.
   */
  const JIRA_KEY_PATTERN = /^[A-Za-z][A-Za-z0-9_]*-\d+$/

  const isJiraIssueDetailArgs = (args: unknown): args is { configKey: string; key: string } => {
    if (typeof args !== 'object' || args === null) return false
    const { configKey, key } = args as { configKey?: unknown; key?: unknown }
    return typeof configKey === 'string' && configKey !== ''
      && typeof key === 'string' && JIRA_KEY_PATTERN.test(key)
  }

  /**
   * ONE Jira ticket's description, status, people and labels — the half of a ticket
   * the sprint read deliberately leaves behind (see `JiraTaskIssue`). Called when
   * the detail panel opens on a sprint row, and only then.
   *
   * Takes the repository's CONFIG KEY for `tasks:getIssueDetail`'s reason: the site
   * and the cloud id are the main process's business, and a repository that stopped
   * being Jira-tracked between the list and the click answers "not found" rather
   * than being queried anyway.
   *
   * The failure ladder is the sprint read's, unchanged — `classify` and
   * `classifyUnexpected` are imported straight from `sprint-issues.ts`, so one Jira
   * failure has one name and one sentence wherever it is met.
   *
   * NOT CACHED, where the sprint read is. A description is what someone opens a
   * ticket to read, and the thirty-second window `JIRA_MIN_REFRESH_MS` buys the list
   * would only mean a panel showing a version of the ticket its own reader had just
   * edited in Jira. One read per open is what this costs.
   */
  ipcMain.handle(
    'tasks:getJiraIssueDetail',
    async (_event, args: unknown): Promise<JiraTaskIssueDetail | JiraTaskStatusError> => {
      // Before anything else, and before the credential: a payload this handler
      // cannot read is not a question about Jira at all. Reported as `not-found`
      // like the unknown-key branch below — from the panel's side the two are the
      // same failure, "this handler cannot say which ticket you mean".
      if (!isJiraIssueDetailArgs(args)) {
        return {
          error: 'not-found',
          message: 'Malformed tasks:getJiraIssueDetail payload: expected a config key and an issue key.',
        }
      }

      // `unverified` counts as not connected here for `jiraGroups`' reason:
      // Atlassian refused this credential the last time it was used, and the
      // Settings section is already offering Reconnect.
      const status = jiraStatus()
      if (!status.connected || status.unverified) {
        return { error: 'not-connected', message: 'No verified Atlassian credential on this machine.' }
      }

      // BEFORE the token, as on the GitHub side: `readConfig()` is an in-memory
      // read, where `withFreshAccessToken` can spend an OAuth round trip AND rotate
      // the stored refresh token. A repository that stopped being Jira-tracked
      // between the list and the click is a question we can already answer, so it
      // must not cost a credential refresh to answer it.
      const repo = jiraRepos(readConfig().repositories ?? {})
        .find((candidate) => candidate.configKey === args.configKey)
      if (!repo) {
        return { error: 'not-found', message: `No Jira-tracked repository is configured as ${args.configKey}.` }
      }

      // `offline`, NOT `not-connected`, and the distinction is the same one
      // `readSprintGroup` spells out: a null here is a missing credential, a refresh
      // that failed or a keychain that has gone away, and the check above has already
      // established that a verified credential is stored. So this is the machine or
      // the network, not the user's account — and telling someone to reconnect an
      // account that is fine is the failure this split exists to avoid.
      const fresh = await withFreshAccessToken()
      if (!fresh) {
        return { error: 'offline', message: 'No usable Atlassian access token for this read.' }
      }

      try {
        return mapJiraIssueDetail(await fetchJiraIssue(atlassianDeps, {
          accessToken: fresh.accessToken,
          cloudId: fresh.cloudId,
          key: args.key,
          fields: DETAIL_FIELDS,
        }))
      } catch (error) {
        const failure = classifyUnexpected(error)
        // The one repairable cause of a 401 (a cloud id that moved) is repaired
        // here as it is on the list read, and this is the only place allowed to
        // mark a credential unverified. Not awaited: it works in the background
        // and the NEXT read is the one that benefits.
        if (failure.error === 'unauthorized') void reportUnauthorized()
        return failure
      }
    },
  )

  /**
   * Whether an IPC payload really is a (config key, ticket keys) pair.
   *
   * The KEYS are not pattern-checked here, and that is on purpose: what each is allowed
   * to be is decided one level down, by the shape that sorts it into a tracker —
   * `#412`/`412` goes to GitHub as a parsed integer, `PROJ-1234` reaches JQL through
   * `quoteJql`, and anything matching neither is dropped without being asked about. A
   * regex here would be a third spelling of that rule, in the one place it cannot be
   * kept in step with the two that matter.
   *
   * The ARRAY is checked, because `plan_tickets` rows are written by another process on
   * another version, and a handler that iterates whatever arrived is the one that throws
   * where this promises an answer.
   */
  const isTicketStatusArgs = (args: unknown): args is { configKey: string; keys: string[] } => {
    if (typeof args !== 'object' || args === null) return false
    const { configKey, keys } = args as { configKey?: unknown; keys?: unknown }
    return typeof configKey === 'string' && configKey !== ''
      && Array.isArray(keys) && keys.every((key) => typeof key === 'string')
  }

  /**
   * A Jira key, normalised the way Jira itself resolves one: `per-5030` and `PER-5030`
   * are one ticket. Empty for anything that is not a key.
   *
   * `#` is stripped first for the GitHub test below, which shares this function: the
   * plan skill files `#412`, the migration's own example says `412`, and rows written by
   * either spelling sit in the same table.
   */
  const bareKey = (key: string): string => key.trim().replace(/^#/, '').trim()

  /**
   * The state of a plan's tickets, live off their trackers, batched into ONE call per
   * tracker.
   *
   * WHY THIS IS NOT A COLUMN ON `plan_tickets`. A plan is filed once; its tickets then
   * live for weeks. A status written at creation time would be right for an afternoon
   * and quietly wrong ever after, and nothing in the app would be in a position to
   * correct it — the tracker is the record, and this reads the record.
   *
   * WHY IT IS ONE CHANNEL AND NOT ONE PER TICKET. A plan's tickets are a handful, but
   * they are a handful on every open, and `tasks:getIssueDetail` drags a body and fifty
   * comments along for each. Both halves below answer a list in a single round trip —
   * GitHub through aliases, Jira through `key in (...)` — so the cost of the page is two
   * requests whatever the plan's size.
   *
   * WHY IT ANSWERS AN EMPTY MAP RATHER THAN A NAMED FAILURE. Everything that can go
   * wrong here — no credential, a repository this machine has never configured, a
   * tracker that is down, a ticket deleted since — renders identically: the row carries
   * no pill and the plan is still perfectly readable. That is not information lost, it
   * is information nothing consumes; see `PlanTicketStates`. It is also what makes a
   * TEAMMATE'S plan on an unconfigured repository open at full speed instead of paying
   * for two calls that could only fail.
   *
   * KEYED BY THE STRING THE CALLER SENT, never by the normalised form: the renderer
   * looks a row up by the key `plan_tickets` holds, and handing back `PER-5030` for a
   * row that says `per-5030` would be a map it cannot read.
   */
  ipcMain.handle(
    'tasks:ticketStatuses',
    async (_event, args: unknown): Promise<PlanTicketStates> => {
      if (!isTicketStatusArgs(args)) return {}

      // Sorted by SHAPE, not by the repository's configured tracker: one plan can file a
      // Jira epic and GitHub issues, and an `ask` repository reads from both. The keys
      // are carried alongside their normalised form so the answer can be filed back
      // under what the caller actually sent.
      const github: { key: string; number: number }[] = []
      const jira: { key: string; jiraKey: string }[] = []
      for (const key of args.keys) {
        const bare = bareKey(key)
        if (/^\d+$/.test(bare)) github.push({ key, number: Number(bare) })
        else if (JIRA_KEY_PATTERN.test(bare)) jira.push({ key, jiraKey: bare.toUpperCase() })
      }

      const states: PlanTicketStates = {}

      // Both trackers at once, each guarded on its own credential and its own config:
      // a repository tracked only in Jira must not wait on a GitHub call it will never
      // make, and a Jira site that is slow must not hold the GitHub half back.
      await Promise.all([
        (async () => {
          if (github.length === 0 || !getGitHubToken()) return
          const repo = githubRepos(readConfig().repositories ?? {})
            .find((candidate) => candidate.configKey === args.configKey)
          if (!repo) return
          const read = await fetchIssueStates(repo.owner, repo.repo, github.map((t) => t.number))
          for (const ticket of github) {
            const state = read[ticket.number]
            if (state) states[ticket.key] = { tracker: 'github', state }
          }
        })(),
        (async () => {
          if (jira.length === 0) return
          // `unverified` counts as not connected, exactly as on the two reads above:
          // Atlassian refused this credential last time and Settings is already
          // offering Reconnect.
          const status = jiraStatus()
          if (!status.connected || status.unverified) return
          // Before the token, for `tasks:getJiraIssueDetail`'s reason: `readConfig` is
          // an in-memory read where `withFreshAccessToken` can spend an OAuth round
          // trip and rotate the stored refresh token.
          const repo = jiraRepos(readConfig().repositories ?? {})
            .find((candidate) => candidate.configKey === args.configKey)
          if (!repo) return
          const fresh = await withFreshAccessToken()
          if (!fresh) return
          try {
            const page = await fetchSprintIssues(atlassianDeps, {
              accessToken: fresh.accessToken,
              cloudId: fresh.cloudId,
              // NOT scoped to the open sprint, unlike every other JQL in this file: a
              // plan's tickets are asked for BY KEY, and half of them are in the backlog
              // or were closed two sprints ago. `sprintScope` would answer for the ones
              // still in flight and stay silent about the rest, which is the shape of
              // answer this page must not give.
              jql: buildKeyInJql(jira.map((t) => t.jiraKey)),
              fields: STATUS_FIELDS,
              maxResults: JIRA_MAX_PAGE_SIZE,
            })
            const byKey = mapTicketStatuses(page.issues)
            for (const ticket of jira) {
              const status = byKey[ticket.jiraKey]
              if (status) {
                states[ticket.key] = { tracker: 'jira', name: status.name, category: status.category }
              }
            }
          } catch (error) {
            // Nothing is reported upward — the caller has no error state for this read —
            // but a 401 whose one repairable cause is a cloud id that moved is still
            // repaired, as it is on every other Jira read here.
            if (classifyUnexpected(error).error === 'unauthorized') void reportUnauthorized()
          }
        })(),
      ])

      return states
    },
  )

  /**
   * Whether an IPC payload really is a (config key, query) pair.
   *
   * The QUERY is not validated beyond being a string. It is a search box's contents —
   * anything a keyboard can produce is a legitimate thing to type — and what makes it
   * safe is not a pattern here but `searchTerms`, which reduces it to letters, digits
   * and spaces before it is ever allowed near JQL. A check here would refuse searches
   * that the query builder handles perfectly well.
   */
  const isSprintSearchArgs = (args: unknown): args is { configKey: string; query: string } => {
    if (typeof args !== 'object' || args === null) return false
    const { configKey, query } = args as { configKey?: unknown; query?: unknown }
    return typeof configKey === 'string' && configKey !== '' && typeof query === 'string'
  }

  /**
   * Search one project's open sprint, for the tickets the board's own budgets could
   * not reach.
   *
   * WHY A READ AT ALL, when the search box already filters instantly. Because that
   * filter runs over what is in memory, and on a column the cap cut short that is a
   * subset: a ticket past the budget is not on the board, so typing its title finds
   * nothing and the box gives no hint that it is looking at a fraction of the sprint.
   * This is the query that reaches past the budget. The renderer asks for it only when
   * a column actually reported itself short, so an ordinary board — every column whole
   * — still costs nothing on a keystroke.
   *
   * NOT CACHED, for `tasks:getJiraIssueDetail`'s reason turned around: the sprint cache
   * exists to stop a page open re-reading four columns, and a search is a different
   * question each time it is asked. The renderer debounces, which is where the round
   * trips are actually saved.
   *
   * An empty `issues` array is a legitimate answer, and so is one for a query that
   * reduced to nothing — `buildSprintSearchJql` returns `''` for a term made entirely
   * of punctuation, and spending a round trip to be told a site has no ticket called
   * `***` would be this handler's own fault.
   */
  ipcMain.handle(
    'tasks:searchSprint',
    async (_event, args: unknown): Promise<{ issues: JiraTaskIssue[] } | JiraTaskStatusError> => {
      if (!isSprintSearchArgs(args)) {
        return {
          error: 'not-found',
          message: 'Malformed tasks:searchSprint payload: expected a config key and a query.',
        }
      }

      return searchSprint(args.configKey, args.query)
    },
  )
}
