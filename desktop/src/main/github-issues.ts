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
import type { PRStatusError, TaskIssue, TaskIssueDetail } from '../types'

/**
 * `rateLimit` leads, as in every query here: it is the cheapest possible answer to
 * "why did this go quiet", and it costs nothing to ask for.
 *
 * `first: 50` and `CREATED_AT DESC`, not `last:` — an issue backlog is read from the
 * top, and the fifty most recently OPENED issues are the ones a page can act on.
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
 * `totalCount` is asked for alongside the nodes because `first: 50` is a CAP, not a
 * total: a repository with two hundred open issues would otherwise be reported as
 * having fifty. There is no pagination here — the page says "showing 50 of 214"
 * instead of quietly rounding the backlog down.
 */
export const OPEN_ISSUES_QUERY = `query($owner:String!,$repo:String!){
  rateLimit { remaining }
  repository(owner:$owner,name:$repo){
    issues(states: OPEN, first: 50, orderBy: {field: CREATED_AT, direction: DESC}){
      totalCount
      nodes {
        number title url createdAt
        author { login }
        labels(first: 5){ nodes { name } }
        parent { number title url }
        subIssuesSummary { total completed }
      }
    }
  }
}`

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
 * out an assignee's. `comments { totalCount }` and no nodes — the panel says how
 * many there are and sends the reader to GitHub to read them, so pulling the
 * bodies over would be paying for a thing nothing renders.
 */
export const ISSUE_DETAIL_QUERY = `query($owner:String!,$repo:String!,$number:Int!){
  rateLimit { remaining }
  repository(owner:$owner,name:$repo){
    issue(number:$number){
      state
      body
      assignees(first: 10){ nodes { login } }
      comments { totalCount }
    }
  }
}`

interface GQLIssueNode {
  number?: number | null
  title?: string | null
  url?: string | null
  createdAt?: string | null
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
    } | null
  } | null
}

interface GQLIssueDetailNode {
  state?: string | null
  body?: string | null
  assignees?: { nodes?: ({ login?: string | null } | null)[] | null } | null
  comments?: { totalCount?: number | null } | null
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
 * Reads one repository's open issues. Never throws: every failure comes back as a
 * named `PRStatusError` so the repository's card can say what is wrong instead of
 * disappearing from the page.
 */
export async function fetchOpenIssues(
  owner: string,
  repo: string,
): Promise<{ issues: TaskIssue[]; totalOpen: number } | PRStatusError> {
  // The whole connection, not its nodes: `totalCount` is read below, and an
  // `issues` object is what tells the ladder the repository was reachable at all.
  const connection = await readGraphQL(
    OPEN_ISSUES_QUERY,
    { owner, repo },
    (b: GQLIssuesResponse | null) => b?.data?.repository?.issues,
    `Repository ${owner}/${repo} was not found.`,
  )
  if (isPRStatusError(connection)) return connection

  const issues = mapIssues(connection.nodes ?? [])
  // Falls back to what was actually mapped rather than to 0: a missing `totalCount`
  // must not make a page of issues read as "showing 50 of 0".
  const reported = connection.totalCount
  const totalOpen = typeof reported === 'number' ? Math.max(reported, issues.length) : issues.length

  return { issues, totalOpen }
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
  const commentCount = node.comments?.totalCount
  return {
    body: node.body || '',
    state: node.state === 'CLOSED' ? 'CLOSED' : 'OPEN',
    assignees: (node.assignees?.nodes ?? [])
      .map((assignee) => assignee?.login)
      .filter((login): login is string => !!login),
    commentCount: typeof commentCount === 'number' ? commentCount : 0,
  }
}

/**
 * Reads ONE issue's body, state, assignees and comment count. Never throws, for
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
