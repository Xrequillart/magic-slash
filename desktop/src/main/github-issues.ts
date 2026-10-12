/**
 * The single GraphQL read behind the Tasks page: one repository's OPEN issues.
 *
 * A module of its own, next to `github-graphql.ts` rather than inside it, built on
 * the ladder helpers that module already exports.
 *
 * `readGraphQL` below and `postGraphQL` next door are the same ladder around
 * different payload paths, and collapsing them into one — `postGraphQL` becoming a
 * wrapper that selects `data.repository.pullRequest` — is the right end state.
 * It is not done here only because `github-graphql.ts` is outside this change, and
 * it is the ONE piece of duplication in this file that a later pass should remove.
 *
 * Same import discipline as its neighbour, and for the same reason: the test suite
 * runs on the ROOT node_modules, where `electron`, `node-pty` and
 * `@supabase/supabase-js` are absent. Nothing here reaches the config or Electron —
 * the handler above it does that and hands over an owner and a repo.
 */
import { getGitHubToken, githubHeaders } from './github'
import {
  GITHUB_GRAPHQL_URL,
  mapErrorType,
  mapHttpStatus,
  toError,
} from './github-graphql'
import { isPRStatusError } from '../types'
import type { PRStatusError, TaskIssue, TaskIssueDetail, TicketComment } from '../types'

/**
 * A CAP on a connection with no total asked for, and that is deliberate: the Done
 * column is a record of what just landed, not a census, so there is no "showing 30 of
 * 900" to say about it. The open half keeps its `totalCount` because a BACKLOG bigger
 * than its page is a fact somebody acts on.
 */
const CLOSED_PAGE_SIZE = 30

/**
 * How many OPEN issues one repository's board can hold — GitHub's own ceiling on a
 * connection, and the counterpart to `SPRINT_COLUMN_PAGE_SIZE` on the Jira half.
 *
 * 50 until the Tasks page became a board. The two halves were matched then and they
 * still are, but the number moved for a reason of its own: a `first:` above 100 is not
 * served, it is rejected, so 100 is the most a single page can ask for and there is no
 * argument for leaving rows on the table below it.
 *
 * WHAT THIS DOES NOT FIX is which issues a capped repository shows. They arrive ordered
 * by creation date, so a backlog of four hundred comes back as its hundred newest —
 * with `totalCount` beside them, which is the saving grace: the page prints "showing 100
 * of 412" rather than passing a cap off as a total. The Jira half cannot even say that
 * much (no total in a cursor-paginated response), which is why IT got a budget per
 * column and this did not: a number is a better admission than a `+`.
 */
const OPEN_PAGE_SIZE = 100

/**
 * `rateLimit` leads, as in every query here: it is the cheapest possible answer to
 * "why did this go quiet", and it costs nothing to ask for.
 *
 * `OPEN_PAGE_SIZE` and `CREATED_AT DESC`, not `last:` — an issue backlog is read from
 * the top, and the most recently OPENED issues are the ones a page can act on.
 * That is the opposite of the PR queries next door, where the tail is what matters
 * because bots post late; here the sort field decides, so `first:` takes the newest.
 *
 * Five labels per issue: the row renders two and the rest are noise on the wire.
 *
 * `author` is asked for as a login and nothing else — no `avatarUrl`. The renderer's
 * CSP is `default-src 'self'` with no `img-src`, so a remote avatar could only be
 * blocked; the row shows `@login`.
 *
 * `parent` and `subIssuesSummary` are GitHub's native issue hierarchy, and both
 * ride along in this same read — the row shows what an issue hangs off and how far
 * its own children have got without a second round trip. Deliberately NOT
 * `issueType`: Issue Types are an organisation-only feature and come back `null`
 * on a personal repository, so asking for them would buy an always-empty field.
 *
 * `totalCount` is asked for alongside the nodes because `first:` is a CAP, not a
 * total: a repository with four hundred open issues would otherwise be reported as
 * having a hundred. There is no pagination here — the page says "showing 100 of 412"
 * instead of quietly rounding the backlog down.
 *
 * A SECOND CONNECTION, aliased `closed`, for the board's Done column. One query and
 * not two calls: it is the same repository, the same token and the same rate-limit
 * budget, and a second round trip per repository on every reload would be paid for an
 * answer GitHub is willing to give in this one. It asks for `closedAt` — the field the
 * open half has no use for — because that is what `CLOSED_WINDOW_DAYS` is applied to.
 */
export const OPEN_ISSUES_QUERY = `query($owner:String!,$repo:String!){
  rateLimit { remaining }
  repository(owner:$owner,name:$repo){
    issues(states: OPEN, first: ${OPEN_PAGE_SIZE}, orderBy: {field: CREATED_AT, direction: DESC}){
      totalCount
      nodes {
        number title url createdAt
        author { login }
        labels(first: 5){ nodes { name } }
        parent { number title url }
        subIssuesSummary { total completed }
      }
    }
    closed: issues(states: CLOSED, first: ${CLOSED_PAGE_SIZE}, orderBy: {field: UPDATED_AT, direction: DESC}){
      nodes {
        number title url createdAt closedAt
        author { login }
        labels(first: 5){ nodes { name } }
        parent { number title url }
        subIssuesSummary { total completed }
      }
    }
  }
}`

/**
 * How far back the board's Done column looks, and why it looks back at all.
 *
 * A GitHub repository has no Done column — an issue is open or it is closed, and the
 * closed ones go back to the first commit. The board's Done column is the answer to
 * "what did we finish", which has a horizon: a fortnight, matched to the length of the
 * Jira sprint whose own Done column sits in the same four columns beside it. Without
 * one, a repository with nine hundred closed issues would fill the column with 2021.
 *
 * Applied HERE and not in the query because GitHub cannot order by `closedAt` — its
 * `IssueOrderField` is CREATED_AT, UPDATED_AT or COMMENTS. `UPDATED_AT DESC` is the
 * proxy the query uses (closing an issue updates it), and the window is what turns a
 * proxy into an answer.
 */
export const CLOSED_WINDOW_DAYS = 14


/**
 * The rest of ONE issue, asked for only when someone opens it.
 *
 * A second query rather than more fields on `OPEN_ISSUES_QUERY`, for the reason
 * `TaskIssueDetail` documents: the list is read fifty issues at a time for every
 * repository on every reload, this is read once for the issue on screen.
 *
 * `state` is asked for even though the list query filters on OPEN — this read
 * happens later and by number, so the issue may have been closed since.
 *
 * Ten assignees, logins only: the same CSP that rules out an author avatar rules
 * out an assignee's.
 *
 * `comments(last: 50)` with the BODIES, where this asked for `totalCount` alone and
 * sent the reader to github.com. The panel already renders a Jira ticket's thread
 * (`JiraTaskIssueDetail.comments`), and half a page that shows a conversation and
 * half that counts one is two designs for one screen. The cost is bounded the same
 * way Jira's is: this query is made once, for the single issue somebody opened —
 * never on the list read, which is what `TaskIssueDetail` exists to keep thin.
 *
 * `last:` and not `first:`, which is the one choice here worth arguing. A discussion
 * is read for where it GOT TO: on a hundred-comment issue the last fifty are the part
 * still being talked about, and the first fifty are the part that is settled. GitHub
 * returns a `last:` slice in chronological order, so the thread still reads top to
 * bottom — it simply starts later. `totalCount` rides alongside so the panel can say
 * so rather than presenting a page as the whole conversation.
 *
 * `lastEditedAt` is null until somebody actually edits, which is exactly the
 * `TicketComment.updatedAt` contract — no comparison with `createdAt` needed on this
 * side, unlike Jira's, which always sends an `updated`.
 */
export const ISSUE_DETAIL_QUERY = `query($owner:String!,$repo:String!,$number:Int!){
  rateLimit { remaining }
  repository(owner:$owner,name:$repo){
    issue(number:$number){
      state
      body
      assignees(first: 10){ nodes { login } }
      comments(last: 50){
        totalCount
        nodes { id createdAt lastEditedAt body author { login } }
      }
    }
  }
}`

interface GQLIssueNode {
  number?: number | null
  title?: string | null
  url?: string | null
  createdAt?: string | null
  /** Only ever asked for on the `closed` connection; absent on every open issue. */
  closedAt?: string | null
  author?: { login?: string | null } | null
  labels?: { nodes?: ({ name?: string | null } | null)[] | null } | null
  parent?: { number?: number | null; title?: string | null; url?: string | null } | null
  subIssuesSummary?: { total?: number | null; completed?: number | null } | null
}

/**
 * Everything a GraphQL response carries that the error ladder reads, and nothing
 * else. The two queries here disagree only on their `data`, so that is the one
 * part `readGraphQL` leaves to its caller.
 */
interface GQLEnvelope {
  errors?: ({ type?: string | null; message?: string | null } | null)[] | null
  message?: string
}

interface GQLIssuesResponse extends GQLEnvelope {
  data?: {
    rateLimit?: { remaining?: number | null } | null
    repository?: {
      issues?: { totalCount?: number | null; nodes?: (GQLIssueNode | null)[] | null } | null
      /** The second connection of the same query — see `OPEN_ISSUES_QUERY`. No total. */
      closed?: { nodes?: (GQLIssueNode | null)[] | null } | null
    } | null
  } | null
}

interface GQLCommentNode {
  id?: string | null
  createdAt?: string | null
  lastEditedAt?: string | null
  body?: string | null
  author?: { login?: string | null } | null
}

interface GQLIssueDetailNode {
  state?: string | null
  body?: string | null
  assignees?: { nodes?: ({ login?: string | null } | null)[] | null } | null
  comments?: { totalCount?: number | null; nodes?: (GQLCommentNode | null)[] | null } | null
}

/**
 * The aliased state read's envelope. `repository` is an open bag of aliases rather than
 * named fields — the document is built from the caller's numbers, so there is no fixed
 * shape to declare and `mapIssueStates` reads the values rather than the keys.
 */
interface GQLIssueStatesResponse extends GQLEnvelope {
  data?: {
    rateLimit?: { remaining?: number | null } | null
    repository?: Record<string, unknown> | null
  } | null
}

interface GQLIssueDetailResponse extends GQLEnvelope {
  data?: {
    rateLimit?: { remaining?: number | null } | null
    repository?: { issue?: GQLIssueDetailNode | null } | null
  } | null
}

/**
 * The token check, the POST and the error ladder — shared by both reads in this
 * module, because they genuinely have the same one.
 *
 * `select` is what a caller answers instead of the ladder guessing: the list read
 * is satisfied by `repository.issues`, the detail read by `repository.issue`, and
 * "HTTP 200, no errors[], and still nothing" means not-found in both cases — which
 * is why `notFound` is a sentence the caller supplies rather than one written here
 * about a repository.
 *
 * It EXTRACTS rather than answering a boolean, so the payload path is written once.
 * A predicate would leave every caller to walk the same chain again afterwards,
 * with a non-null assertion apologising for a check that had already been made.
 *
 * `github-graphql.ts`'s `postGraphQL` is this same ladder around
 * `data.repository.pullRequest`, and folding the two together is the right end
 * state — it is left alone here only because that module is outside this change.
 */
async function readGraphQL<T extends GQLEnvelope, P>(
  query: string,
  variables: Record<string, unknown>,
  select: (body: T | null) => P | null | undefined,
  notFound: string,
): Promise<P | PRStatusError> {
  // Checked before the request, not after a 401: GraphQL has no anonymous access,
  // so an unauthenticated call can only fail, and this names the fix. Worded for
  // neither read in particular: both callers share it.
  if (!getGitHubToken()) {
    return { error: 'no-token', message: 'No GitHub token: run `gh auth login` to read from GitHub.' }
  }

  let res: Response
  try {
    res = await fetch(GITHUB_GRAPHQL_URL, {
      method: 'POST',
      headers: githubHeaders({ 'Content-Type': 'application/json', Accept: 'application/json' }),
      body: JSON.stringify({ query, variables }),
    })
  } catch (err) {
    return { error: 'network', message: `Could not reach GitHub: ${err instanceof Error ? err.message : String(err)}` }
  }

  let body: T | null = null
  try {
    body = (await res.json()) as T
  } catch {
    body = null
  }

  const payload = select(body)

  // errors[] FIRST: NOT_FOUND, FORBIDDEN and RATE_LIMITED all arrive with HTTP 200,
  // and a repo the token cannot see is the commonest of the three.
  const errors = (body?.errors ?? []).filter((e): e is NonNullable<typeof e> => !!e)
  if (errors.length > 0) {
    for (const err of errors) {
      const mapped = mapErrorType(err.type)
      if (mapped) return toError(mapped, err.message || mapped, res.headers)
    }
    if (payload == null) {
      return toError('network', errors[0].message || 'GitHub GraphQL returned an error', res.headers)
    }
    // Partial data with an unmapped error elsewhere: what was asked for is here.
  }

  if (!res.ok) {
    const mapped = mapHttpStatus(res.status)
    return toError(mapped, body?.message || `GitHub GraphQL responded ${res.status}`, res.headers)
  }

  if (payload == null) return { error: 'not-found', message: notFound }

  return payload
}

/**
 * The parent, when GitHub reports one AND it is usable.
 *
 * `null` is the NORMAL answer here — most issues are top-level — so this is a
 * mapper, not a validation: anything without a number is dropped as silently as a
 * missing parent, because a badge reading `↳ #undefined` is worse than no badge.
 *
 * The number is the only field the parent cannot do without. A missing title falls
 * back to the number, and a missing `url` merely leaves the issue page's parent
 * block un-clickable — neither is a reason to drop a parent GitHub reported.
 */
function mapParent(node: GQLIssueNode): TaskIssue['parent'] {
  const parent = node.parent
  if (!parent || typeof parent.number !== 'number') return undefined
  const mapped: NonNullable<TaskIssue['parent']> = {
    number: parent.number,
    title: parent.title || `#${parent.number}`,
  }
  if (parent.url) mapped.url = parent.url
  return mapped
}

/**
 * The login that opened the issue, when GitHub reports one.
 *
 * `author` is NULLABLE: an issue opened by a since-deleted account comes back with
 * no author at all (GitHub renders it as "ghost"). Like `mapParent`, that is mapped
 * rather than validated — a missing login drops the field instead of putting a
 * `@undefined` on the row.
 */
function mapAuthor(node: GQLIssueNode): TaskIssue['author'] {
  const login = node.author?.login
  return login ? login : undefined
}

/**
 * The sub-issue progress, ONLY for an issue that actually has sub-issues.
 *
 * GitHub answers `{ total: 0, completed: 0 }` for every leaf issue, which is the
 * overwhelming majority of them. Storing that would put a "0 sub-issues · 0 done"
 * on every row, so the absence of children is expressed by the absence of the
 * field: `total` is never 0 in what this returns.
 */
function mapSubIssues(node: GQLIssueNode): TaskIssue['subIssues'] {
  const summary = node.subIssuesSummary
  const total = summary?.total
  if (typeof total !== 'number' || total <= 0) return undefined
  const completed = summary?.completed
  return { total, completed: typeof completed === 'number' ? completed : 0 }
}

/** Drops the holes GraphQL is allowed to return, and everything unusable without them. */
function mapIssues(nodes: (GQLIssueNode | null)[]): TaskIssue[] {
  const issues: TaskIssue[] = []
  for (const node of nodes) {
    // Without a number and a URL there is no row to draw and nothing to open.
    if (!node || typeof node.number !== 'number' || !node.url) continue
    const issue: TaskIssue = {
      number: node.number,
      title: node.title || `#${node.number}`,
      url: node.url,
      createdAt: node.createdAt || '',
      labels: (node.labels?.nodes ?? [])
        .map((label) => label?.name)
        .filter((name): name is string => !!name),
    }
    // Only the `closed` connection asks for it, so this is also what tells the two
    // halves apart downstream — see `TaskIssue.closedAt`. Assigned rather than spread
    // in as `undefined`, for the reason the three fields below give.
    if (typeof node.closedAt === 'string' && node.closedAt) issue.closedAt = node.closedAt
    // Assigned rather than spread in as `undefined`: the three fields are optional,
    // and a row without a parent must not carry a `parent: undefined` key that
    // every equality assertion downstream would then have to know about.
    const author = mapAuthor(node)
    if (author) issue.author = author
    const parent = mapParent(node)
    if (parent) issue.parent = parent
    const subIssues = mapSubIssues(node)
    if (subIssues) issue.subIssues = subIssues
    issues.push(issue)
  }
  return issues
}

/**
 * The closed issues young enough for the board's Done column, given the moment the
 * read happened.
 *
 * `now` is a parameter and not a `Date.now()` inside, for the usual reason: the rule
 * is the only interesting thing here and a rule that reads the clock is a rule no
 * test can pin down.
 *
 * An issue with NO `closedAt` is dropped rather than kept. It arrived on the `closed`
 * connection so it really is closed, but the board would have to place it on a date it
 * does not have — and the honest answer for "closed, at an unknown time" is not to
 * claim it was closed this fortnight.
 */
export function recentlyClosed(issues: TaskIssue[], now: number): TaskIssue[] {
  const horizon = now - CLOSED_WINDOW_DAYS * 24 * 60 * 60 * 1000
  return issues.filter((issue) => {
    if (!issue.closedAt) return false
    const closedAt = Date.parse(issue.closedAt)
    return Number.isFinite(closedAt) && closedAt >= horizon
  })
}

/**
 * Reads one repository's issues: every open one, plus the ones closed recently enough
 * to belong in the board's Done column. Never throws — every failure comes back as a
 * named `PRStatusError` so the repository's card can say what is wrong instead of
 * disappearing from the page.
 *
 * ONE ARRAY for the two connections, with `closedAt` marking which is which. The board
 * places a ticket by asking what column it is in, and two arrays would mean every
 * consumer downstream — the search, the sort, the counters, the selection — learning
 * to look in both. The name is kept as it was: it is still "the issues this repository
 * has open", plus the tail the Done column needs.
 */
export async function fetchOpenIssues(
  owner: string,
  repo: string,
): Promise<{ issues: TaskIssue[]; totalOpen: number } | PRStatusError> {
  // The whole REPOSITORY, not one connection's nodes: two connections are read out of
  // it below, and the object is what tells the ladder it was reachable at all. The
  // not-found sentence is unchanged — `repository` being absent is exactly what it
  // was reporting before, one level down.
  const repository = await readGraphQL(
    OPEN_ISSUES_QUERY,
    { owner, repo },
    (b: GQLIssuesResponse | null) => b?.data?.repository,
    `Repository ${owner}/${repo} was not found.`,
  )
  if (isPRStatusError(repository)) return repository

  const open = mapIssues(repository.issues?.nodes ?? [])
  const closed = recentlyClosed(mapIssues(repository.closed?.nodes ?? []), Date.now())
  // Falls back to what was actually mapped rather than to 0: a missing `totalCount`
  // must not make a page of issues read as "showing 50 of 0". Counted off the OPEN
  // half alone, which is what the word means — the closed tail is not backlog.
  const reported = repository.issues?.totalCount
  const totalOpen = typeof reported === 'number' ? Math.max(reported, open.length) : open.length

  return { issues: [...open, ...closed], totalOpen }
}

/**
 * The detail panel's fields, mapped the way the row's are: every hole GraphQL is
 * allowed to leave becomes the empty value, never `undefined`.
 *
 * `state` is narrowed rather than trusted. GitHub's `IssueState` is OPEN or CLOSED
 * today; anything else — a new enum member, a null — reads as OPEN, because the
 * panel was opened from a list of open issues and inventing a third state on the
 * strength of an unknown string would be worse than the assumption it came from.
 */
function mapIssueDetail(node: GQLIssueDetailNode): TaskIssueDetail {
  const comments = mapComments(node.comments?.nodes ?? [])
  const commentCount = node.comments?.totalCount
  return {
    body: node.body || '',
    state: node.state === 'CLOSED' ? 'CLOSED' : 'OPEN',
    assignees: (node.assignees?.nodes ?? [])
      .map((assignee) => assignee?.login)
      .filter((login): login is string => !!login),
    // Falls back to what was actually mapped rather than to 0, for the reason
    // `fetchOpenIssues` gives about `totalCount`: a missing count must not make a
    // thread that IS on screen read as "0 comments".
    commentCount: typeof commentCount === 'number' ? Math.max(commentCount, comments.length) : comments.length,
    comments,
  }
}

/**
 * The comment nodes as the panel renders them, dropping the holes GraphQL is allowed
 * to leave.
 *
 * `mapIssues`' discipline one level down: the id is the only field a comment cannot
 * be drawn without — it is the React key and nothing else has to be unique — and
 * everything else degrades. A missing author is the deleted-account case `mapAuthor`
 * describes and renders as an unattributed turn in the conversation; a missing body
 * is a comment whose whole content was an attachment or a reaction, and the panel
 * says so rather than drawing an empty box.
 *
 * `lastEditedAt` becomes `updatedAt` only when GitHub reports one — it is null on a
 * comment nobody has edited, which is `TicketComment.updatedAt`'s "absent otherwise".
 */
function mapComments(nodes: (GQLCommentNode | null)[]): TicketComment[] {
  const comments: TicketComment[] = []
  for (const node of nodes) {
    if (!node || typeof node.id !== 'string' || !node.id) continue
    const comment: TicketComment = {
      id: node.id,
      // `''` and not the field's absence, which is what `TicketComment.author`
      // documents: the panel treats an empty name as "omit the byline".
      author: node.author?.login || '',
      createdAt: node.createdAt || '',
      body: node.body || '',
    }
    if (node.lastEditedAt) comment.updatedAt = node.lastEditedAt
    comments.push(comment)
  }
  return comments
}

/**
 * Reads ONE issue's body, state, assignees and comments. Never throws, for
 * the same reason as `fetchOpenIssues`: the panel says what went wrong in place
 * rather than blanking.
 *
 * `not-found` covers an issue number that does not exist as well as a repository
 * that does not — from here the two are the same answer, and the panel is only
 * ever opened on a row that came from the list, so neither is a state a reader
 * can act on differently.
 */
export async function fetchIssueDetail(
  owner: string,
  repo: string,
  number: number,
): Promise<TaskIssueDetail | PRStatusError> {
  const node = await readGraphQL(
    ISSUE_DETAIL_QUERY,
    { owner, repo, number },
    (b: GQLIssueDetailResponse | null) => b?.data?.repository?.issue,
    `Issue ${owner}/${repo}#${number} was not found.`,
  )
  if (isPRStatusError(node)) return node

  return mapIssueDetail(node)
}


/**
 * How many issues one batched state read will ask about.
 *
 * A plan files an epic and a handful of stories, so this is a ceiling nothing realistic
 * reaches — it is here because the query is BUILT FROM THE CALLER'S ARRAY, and a query
 * document that grows with its input is the one shape GitHub rejects by size rather than
 * by content. Extra keys are dropped rather than split into a second call: the rows they
 * belong to simply carry no pill, which is a state the page already draws.
 */
export const ISSUE_STATES_LIMIT = 50

/**
 * One alias per issue, in one query — "are these still open?" for a whole plan.
 *
 * ALIASES RATHER THAN A CONNECTION, because there is no connection that takes a list of
 * numbers: `issues(filterBy:)` cannot, and `states: OPEN` would answer by OMISSION —
 * a number missing from the result would mean "closed" or "never existed" or "past the
 * page size", three different things the caller could not tell apart. Asked one by one,
 * every number gets its own answer or an explicit null.
 *
 * The alias is `i<number>`, which is a valid GraphQL name for every positive integer and
 * is what the response is read back by. The numbers are the caller's own, already
 * narrowed to integers by the handler's payload guard, so nothing user-typed reaches the
 * document — which is what makes building a query by concatenation safe here.
 *
 * Two fields and no more. This read happens for every ticket of a plan on every open;
 * it is not a detail read, and a body or a label set would make it one.
 */
export function buildIssueStatesQuery(numbers: number[]): string {
  const aliases = numbers
    .slice(0, ISSUE_STATES_LIMIT)
    .map((number) => `i${number}: issue(number: ${number}) { number state }`)
    .join('\n    ')
  return `query($owner:String!,$repo:String!){
  rateLimit { remaining }
  repository(owner:$owner,name:$repo){
    ${aliases}
  }
}`
}

/**
 * The aliased response as `number → state`, dropping every hole GraphQL may leave.
 *
 * A null alias — an issue deleted, transferred, or never filed — is simply ABSENT from
 * the map rather than defaulted to open: the caller renders a missing entry as "no
 * answer", and inventing OPEN for a ticket nobody can find would be the one wrong pill.
 * That is the opposite of `mapIssueDetail`'s narrowing, and deliberately so: there the
 * panel was opened FROM a list of open issues, so OPEN is the assumption it came in
 * with; here there is no such prior.
 */
function mapIssueStates(repository: Record<string, unknown>): Record<number, 'OPEN' | 'CLOSED'> {
  const states: Record<number, 'OPEN' | 'CLOSED'> = {}
  for (const value of Object.values(repository)) {
    if (!value || typeof value !== 'object') continue
    const { number, state } = value as { number?: unknown; state?: unknown }
    if (!Number.isInteger(number)) continue
    if (state !== 'OPEN' && state !== 'CLOSED') continue
    states[number as number] = state
  }
  return states
}

/**
 * The state of several issues of one repository, in ONE round trip.
 *
 * Never throws, like everything else here — but unlike its neighbours it does not return
 * a `PRStatusError` either: it answers an empty map. The caller draws no error state for
 * this read and has none to draw. It decorates rows that are already on screen, read out
 * of the cloud, and a plan whose statuses could not be fetched is a plan the reader can
 * still read in full. Collapsing "no token", "not found" and "network" into "no answer"
 * is therefore not information lost, it is information nothing consumes.
 */
export async function fetchIssueStates(
  owner: string,
  repo: string,
  numbers: number[],
): Promise<Record<number, 'OPEN' | 'CLOSED'>> {
  if (numbers.length === 0) return {}

  const repository = await readGraphQL(
    buildIssueStatesQuery(numbers),
    { owner, repo },
    (b: GQLIssueStatesResponse | null) => b?.data?.repository,
    `Repository ${owner}/${repo} was not found.`,
  )
  if (isPRStatusError(repository)) return {}

  return mapIssueStates(repository)
}
