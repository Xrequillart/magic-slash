import type { JiraStatusCategory, JiraTaskIssue, JiraTaskStatusError } from '../../types'
import { AtlassianApiError } from './atlassian-api'

/**
 * Everything the sprint read DECIDES, with nothing it needs a machine for.
 *
 * PURE in `atlassian-api.ts`'s sense, and for the same reason: no `electron`, no
 * filesystem, no ambient `fetch` — and, importantly, no import of `connect.ts`,
 * which pulls in `electron` and (through `token-store.ts`) a `CONFIG_DIR` computed
 * at module load. This module therefore imports cleanly under plain Node, which is
 * what lets `sprint-issues.test.ts` cover the query, the mapping and the failure
 * ladder without a single mock.
 *
 * The three questions it answers:
 *
 *  1. WHAT TO ASK — one JQL query per project, and only one. `sprint in
 *     openSprints()` resolves the board itself, so nothing here needs a board id
 *     (we have none) nor the `/rest/agile` scope (we do not ask for one).
 *  2. WHAT CAME BACK — Jira's issue shape into `JiraTaskIssue`, dropping anything
 *     unusable rather than half-rendering it.
 *  3. WHY IT FAILED — an `AtlassianApiError` into one of the nine named failures
 *     the card can put a sentence and a fix against.
 */

/**
 * The fields the search asks for, and the reason each is there.
 *
 * `summary` is the row's title and `status` is what the page filters and colours
 * on. `created` looks optional and is not: `TaskIssue.createdAt` feeds
 * `sortIssues` (renderer/utils/taskRows.ts), which sinks anything without a
 * timestamp — so a sprint read without it would pile every Jira row at the bottom
 * of its own card in whatever order Jira happened to answer in.
 *
 * Nothing else. Every field named here is serialised for every ticket of every
 * Jira repository on every reload, and the detail panel (which would want a
 * description, an assignee, a comment count) is not this story.
 */
export const SPRINT_FIELDS = ['summary', 'status', 'created']

/**
 * How many tickets one repository's card can hold.
 *
 * Matched to `github-issues.ts`'s `first: 50` so the two halves of the page cap
 * alike. A single page, never a follow-up: an active sprint with more than fifty
 * open tickets is a planning problem, not a pagination one, and walking the cursor
 * would spend a round trip per page on rows nobody scrolls to.
 */
export const SPRINT_PAGE_SIZE = 50

/**
 * A JQL string literal.
 *
 * JQL escapes with a backslash, exactly as JSON does, and the project key reaches
 * here from a settings field that accepts free text. Unescaped, a key containing a
 * quote would not "inject" anything interesting — the rest of the query is fixed
 * and Jira's parser has no statement separator — but it WOULD produce a query that
 * no longer parses, reported as a mysterious 400 instead of an empty project.
 */
function quoteJql(value: string): string {
  return `"${value.replace(/[\\"]/g, (character) => `\\${character}`)}"`
}

/**
 * The one query this feature sends: everything in the project's open sprints.
 *
 * NO STATUS FILTER, deliberately. The page wants two answers from one call — the
 * To Do column, and the In Progress tickets an agent is on — and it also has to
 * tell "this project has no active sprint" from "the sprint has nothing left to
 * do". An empty result to THIS query means the first; a result with no To Do in it
 * means the second. Two filtered queries would double the latency and still not
 * separate those two cases without a third.
 *
 * Ordered by creation date so the cap, when it bites, keeps the oldest work rather
 * than an arbitrary slice — and so the rows arrive in the order the renderer sorts
 * them into anyway.
 */
export function buildSprintJql(projectKey: string): string {
  return `project = ${quoteJql(projectKey)} AND sprint in openSprints() ORDER BY created DESC`
}

/**
 * `https://acme.atlassian.net/browse/PROJ-123`, or `''` when there is no site to
 * build it from.
 *
 * The configured site is documented as a BROWSE BASE (`.../browse/`), while the
 * credential's `site_url` is the bare origin — so both trailing slashes and a
 * trailing `/browse` are stripped before one is appended. Getting this wrong
 * produces `…/browse/browse/PROJ-123`, which 404s in the user's browser rather
 * than failing anywhere we would see it.
 */
export function browseUrl(site: string, key: string): string {
  const base = site.trim().replace(/\/+$/, '').replace(/\/browse$/i, '')
  return base ? `${base}/browse/${encodeURIComponent(key)}` : ''
}

/** Jira's fixed category keys, as a lookup rather than three comparisons. */
const CATEGORIES: Record<string, JiraStatusCategory> = {
  new: 'new',
  indeterminate: 'indeterminate',
  done: 'done',
}

/**
 * A ticket's status, as the two values the page uses: the word to print, and the
 * category to branch on.
 *
 * Read together rather than one function each, because they come out of the same
 * object and would otherwise re-run the same "is this an object" narrowing twice —
 * and could disagree about what a malformed status means.
 *
 * The category defaults to `new`. Jira has a fourth category key — `undefined`, for
 * a status an admin never filed under one — and a workflow can be configured
 * entirely out of the standard three. Such a ticket is in the sprint and is not
 * finished, so `new` (the To Do column) is where it belongs: it is the one default
 * that neither hides real work nor claims an agent is on something.
 */
function readStatus(status: unknown): { name: string; category: JiraStatusCategory } {
  const fields = (status && typeof status === 'object' ? status : {}) as Record<string, unknown>
  const name = fields.name
  const category = fields.statusCategory
  const key = category && typeof category === 'object'
    ? (category as Record<string, unknown>).key
    : undefined
  return {
    name: typeof name === 'string' ? name : '',
    category: (typeof key === 'string' && CATEGORIES[key]) || 'new',
  }
}

/**
 * One Jira issue as the page lists it, or null when it cannot be listed.
 *
 * A MAPPER, not a validator: the only field a row cannot do without is the key —
 * it is the identity, the badge, the link and the value the agent cross-reference
 * joins on. Everything else degrades (a ticket with no summary shows its key, one
 * with no timestamp sinks to the bottom of the card) rather than costing the user
 * a row that really is in their sprint.
 */
export function mapIssue(raw: unknown, siteUrl: string): JiraTaskIssue | null {
  if (!raw || typeof raw !== 'object') return null
  const { key, fields } = raw as Record<string, unknown>
  if (typeof key !== 'string' || key === '') return null

  const issueFields = (fields && typeof fields === 'object' ? fields : {}) as Record<string, unknown>
  const summary = issueFields.summary
  const created = issueFields.created
  const status = readStatus(issueFields.status)

  return {
    key,
    title: typeof summary === 'string' && summary !== '' ? summary : key,
    url: browseUrl(siteUrl, key),
    createdAt: typeof created === 'string' ? created : '',
    statusName: status.name,
    statusCategory: status.category,
  }
}

/**
 * The sprint's tickets, minus the ones that are finished.
 *
 * `done` is dropped HERE rather than in the query, because the query has to come
 * back empty for a project with no active sprint and only for that (see
 * `buildSprintJql`). Dropping it here also keeps the two facts the caller needs
 * apart: `raw.length === 0` is "no active sprint", `result.length === 0` is "this
 * sprint has nothing left to do".
 *
 * In Progress is KEPT at this layer even though most of it will not be shown. Only
 * the renderer knows which tickets have an agent on them — the roster is cloud and
 * store state that never reaches the main process — so the filter that AC2 asks
 * for lives there, and this side must not pre-empt it.
 */
export function mapSprintIssues(raw: unknown[], siteUrl: string): JiraTaskIssue[] {
  return raw.flatMap((entry) => {
    const issue = mapIssue(entry, siteUrl)
    return issue && issue.statusCategory !== 'done' ? [issue] : []
  })
}

/**
 * A failed Atlassian call as one of the nine named failures the card renders.
 *
 * Takes the ERROR and not a bare status on purpose: `AtlassianApiError` is also
 * what a transport failure and an unreadable body arrive as (status 0 and the
 * original status respectively), so a status-only signature would have nowhere to
 * put either. The message is the error's own — an operation name and a status code,
 * never a response body — and it is for the log, not the screen.
 *
 * `not-connected` and `no-active-sprint` are NOT produced here: neither is a failed
 * call. The first is decided before any request is made, the second by an empty
 * successful answer. Both belong to the caller.
 *
 * The unmapped default is `server-error` rather than something more precise. It is
 * where a 200 with an unreadable body lands — Atlassian's SSO interstitial answers
 * exactly that — and "the site answered something we could not read" is the honest
 * reading of it.
 */
export function classify(error: AtlassianApiError): JiraTaskStatusError {
  return { error: codeFor(error.status), message: error.message }
}

/** A lookup rather than six comparisons, for `CATEGORIES`' reason. */
const CODES: Record<number, JiraTaskStatusError['error']> = {
  // 0 is `send()`'s normalisation of a transport failure — DNS, a refused
  // connection, a machine with no network at all.
  0: 'offline',
  400: 'invalid-query',
  401: 'unauthorized',
  403: 'forbidden',
  404: 'not-found',
  429: 'rate-limited',
}

function codeFor(status: number): JiraTaskStatusError['error'] {
  return CODES[status] ?? 'server-error'
}

/**
 * The same, for anything that reaches the read that is not an `AtlassianApiError`.
 *
 * A bug on our side, in other words — and one that must still land in a card rather
 * than reject a `Promise.all` into a blank page. Its message is deliberately the
 * thrown value's, because only our own code can produce this.
 */
export function classifyUnexpected(error: unknown): JiraTaskStatusError {
  if (error instanceof AtlassianApiError) return classify(error)
  return { error: 'server-error', message: error instanceof Error ? error.message : String(error) }
}
