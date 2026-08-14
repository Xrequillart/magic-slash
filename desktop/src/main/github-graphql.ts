/**
 * The single GraphQL read behind the PR watcher.
 *
 * Kept in its own module — and importing nothing but `../types` and `./github` — on
 * purpose: the test suite runs on the ROOT node_modules, where `electron`, `node-pty`
 * and `@supabase/supabase-js` are absent. Anything reachable from here must resolve
 * without them, and `./github` only reaches `child_process`.
 *
 * One query replaces the three REST calls it used to take (PR, reviews, review
 * comments), and it also returns what REST could not without more round-trips:
 * checks, draft state, mergeability, and the conversation comments where Greptile and
 * Claude Code actually post.
 */
import type {
  GitHubReview,
  GitHubReviewComment,
} from './github'
import { aggregatePRStatus, clearGitHubTokenCache, getGitHubToken, githubHeaders } from './github'
import type {
  PRCheck,
  PRChecksSummary,
  PRCommentCounts,
  PRState,
  PRStatusError,
  PRStatusSnapshot,
  PRWatchError,
} from '../types'

const GITHUB_GRAPHQL_URL = 'https://api.github.com/graphql'

/** Deduped comment authors are capped here — the card shows a handful of avatars. */
const MAX_COMMENT_AUTHORS = 8

/**
 * Assumed remaining budget when `rateLimit` is somehow absent from a successful
 * response. The GraphQL pool is 5000 points/hour and is DISTINCT from the REST pool,
 * so this is "a full pool", not "unlimited": the watcher's floor still bites as soon
 * as GitHub tells us a real number.
 */
const GRAPHQL_POOL_SIZE = 5000

/**
 * `last:` everywhere on reviews/comments, never `first:`. `first:20` returns the
 * OLDEST twenty, and the bots we care about post late — reading the front of the list
 * is exactly the bug this query exists to fix.
 *
 * Reviews take the full page of 100 rather than a smaller slice, because
 * `aggregatePRStatus` derives a VERDICT from them: it keeps the latest review per
 * reviewer, so a reviewer whose approval falls off the window is not merely missing
 * from a count — the PR reads back as `pending` when it is actually approved. 100 is
 * GraphQL's per-page maximum; beyond that the oldest verdicts would need a second
 * page, which no real PR reaches (and which the REST path never did either — it
 * silently took the FIRST 30, i.e. the oldest, unpaginated).
 *
 * Counts are a different matter and come from `totalCount`, which is exact
 * regardless of how many nodes are returned.
 */
export const PR_STATUS_QUERY = `query($owner:String!,$repo:String!,$number:Int!){
  rateLimit { remaining }
  repository(owner:$owner,name:$repo){
    pullRequest(number:$number){
      state isDraft mergeable updatedAt
      author { login }
      headRefOid
      commits(last:1){ nodes { commit { statusCheckRollup { state contexts(last:100){ nodes {
        ... on CheckRun { name status conclusion detailsUrl }
        ... on StatusContext { context state targetUrl }
      } } } } } }
      reviews(last:100){ pageInfo { hasPreviousPage startCursor } nodes { author{login} state submittedAt body } }
      reviewThreads(last:50){ nodes { comments(first:1){ totalCount nodes { author{login} } } } }
      comments(last:20){ totalCount nodes { author{login} } }
    }
  }
}`

/**
 * Older pages of reviews only. Nothing else is re-fetched: the first response
 * already carries the checks, the counts and the PR itself, and asking for them
 * again would multiply the cost of the very PRs this path exists to serve.
 */
export const REVIEWS_PAGE_QUERY = `query($owner:String!,$repo:String!,$number:Int!,$before:String!){
  rateLimit { remaining }
  repository(owner:$owner,name:$repo){
    pullRequest(number:$number){
      reviews(last:100, before:$before){ pageInfo { hasPreviousPage startCursor } nodes { author{login} state submittedAt body } }
    }
  }
}`

/**
 * Ceiling on the extra pages walked, so a pathological PR cannot spin the tick.
 * 10 pages ≈ 1000 reviews on top of the first 100 — far past anything real, and a
 * hard stop is better than an unbounded loop against a rate-limited API.
 */
const MAX_REVIEW_PAGES = 10

/**
 * Page failures worth one retry: a dropped connection or a transient 5xx is
 * usually gone by the next call. `no-token`, `forbidden`, `not-found` and
 * `rate-limited` are states, not blips — retrying them fails identically and
 * spends budget we were just told we do not have.
 */
const RETRYABLE_PAGE_ERRORS = new Set<PRWatchError>(['network'])

// --- Response shapes -------------------------------------------------------
// Everything is optional: a partial `data` alongside `errors` is a documented
// GitHub behaviour, and every reader below tolerates a hole.

interface GQLActor {
  login?: string | null
}

/** A `statusCheckRollup` context: either a CheckRun or a StatusContext. */
interface GQLCheckContext {
  // CheckRun
  name?: string | null
  status?: string | null
  conclusion?: string | null
  detailsUrl?: string | null
  // StatusContext
  context?: string | null
  state?: string | null
  targetUrl?: string | null
}

export interface GQLPullRequest {
  state?: string | null
  isDraft?: boolean | null
  mergeable?: string | null
  updatedAt?: string | null
  author?: GQLActor | null
  headRefOid?: string | null
  commits?: {
    nodes?: ({
      commit?: {
        statusCheckRollup?: {
          state?: string | null
          contexts?: { nodes?: (GQLCheckContext | null)[] | null } | null
        } | null
      } | null
    } | null)[] | null
  } | null
  reviews?: GQLReviewConnection | null
  reviewThreads?: {
    nodes?: ({
      comments?: { totalCount?: number; nodes?: ({ author?: GQLActor | null } | null)[] | null } | null
    } | null)[] | null
  } | null
  comments?: {
    totalCount?: number
    nodes?: ({ author?: GQLActor | null } | null)[] | null
  } | null
}

export interface GQLReviewNode {
  author?: GQLActor | null
  state?: string | null
  submittedAt?: string | null
  body?: string | null
}

/**
 * Paginated backwards (`last:` + `before:`), so the cursor of interest is
 * `startCursor` and the flag is `hasPreviousPage` — the mirror image of the usual
 * `first:`/`after:`/`endCursor` idiom.
 */
export interface GQLReviewConnection {
  nodes?: (GQLReviewNode | null)[] | null
  pageInfo?: { hasPreviousPage?: boolean | null; startCursor?: string | null } | null
}

interface GQLResponse {
  data?: {
    rateLimit?: { remaining?: number | null } | null
    repository?: { pullRequest?: GQLPullRequest | null } | null
  } | null
  errors?: ({ type?: string | null; message?: string | null } | null)[] | null
  message?: string
}

// --- Error mapping ---------------------------------------------------------

/**
 * GitHub GraphQL answers HTTP **200** with an `errors[]` array for NOT_FOUND
 * (including the very common "logged in, but the token has no `repo` scope"),
 * FORBIDDEN and RATE_LIMITED. Mapping HTTP codes alone left those cases as
 * `data.repository === null`, no exception, and a mute card.
 */
function mapErrorType(type: string | null | undefined): PRWatchError | null {
  switch ((type || '').toUpperCase()) {
    case 'NOT_FOUND':
      return 'not-found'
    case 'FORBIDDEN':
    case 'INSUFFICIENT_SCOPES':
      return 'forbidden'
    case 'RATE_LIMITED':
      return 'rate-limited'
    case 'UNAUTHORIZED':
      return 'no-token'
    default:
      return null
  }
}

function mapHttpStatus(status: number): PRWatchError {
  if (status === 401) return 'no-token'
  if (status === 403) return 'forbidden'
  if (status === 404) return 'not-found'
  if (status === 429) return 'rate-limited'
  return 'network'
}

/** Absolute epoch ms before which the caller should not retry, when GitHub says so. */
function parseRetryAtMs(headers: Headers, now: number): number | undefined {
  const retryAfter = headers.get('Retry-After')
  if (retryAfter) {
    const seconds = Number.parseInt(retryAfter, 10)
    if (Number.isFinite(seconds)) return now + seconds * 1000
  }

  // Secondary-rate-limit and budget responses carry the reset as epoch SECONDS.
  const reset = headers.get('X-RateLimit-Reset')
  if (reset) {
    const epochSeconds = Number.parseInt(reset, 10)
    if (Number.isFinite(epochSeconds)) return epochSeconds * 1000
  }

  return undefined
}

function toError(
  error: PRWatchError,
  message: string,
  headers: Headers,
): PRStatusError {
  const result: PRStatusError = { error, message }
  if (error === 'rate-limited' || error === 'forbidden') {
    const retryAtMs = parseRetryAtMs(headers, Date.now())
    if (retryAtMs !== undefined) result.retryAtMs = retryAtMs
  }
  if (error === 'no-token') clearGitHubTokenCache()
  return result
}

// --- Mapping ---------------------------------------------------------------

const RUNNING_CHECK_STATUSES = new Set(['QUEUED', 'IN_PROGRESS', 'PENDING', 'WAITING', 'REQUESTED'])

const CHECK_CONCLUSIONS: Record<string, PRCheck['state']> = {
  SUCCESS: 'passed',
  NEUTRAL: 'passed',
  SKIPPED: 'skipped',
  FAILURE: 'failed',
  TIMED_OUT: 'failed',
  CANCELLED: 'failed',
  ACTION_REQUIRED: 'failed',
  STARTUP_FAILURE: 'failed',
  STALE: 'failed',
}

const STATUS_CONTEXT_STATES: Record<string, PRCheck['state']> = {
  SUCCESS: 'passed',
  PENDING: 'running',
  EXPECTED: 'running',
  FAILURE: 'failed',
  ERROR: 'failed',
}

/**
 * A context is a StatusContext when it carries `context` (its name), a CheckRun
 * otherwise — the query asks for no `__typename`, so the discrimination is structural.
 * An unrecognised state falls back to `running`: pretending an unknown check passed or
 * failed would be a lie in either direction, "still going" is merely early.
 */
function mapCheck(node: GQLCheckContext): PRCheck | null {
  if (typeof node.context === 'string') {
    const state = STATUS_CONTEXT_STATES[(node.state || '').toUpperCase()] || 'running'
    return { name: node.context, state, ...(node.targetUrl ? { url: node.targetUrl } : {}) }
  }

  if (typeof node.name !== 'string') return null

  const status = (node.status || '').toUpperCase()
  const state = RUNNING_CHECK_STATUSES.has(status)
    ? 'running'
    : CHECK_CONCLUSIONS[(node.conclusion || '').toUpperCase()] || 'running'

  return { name: node.name, state, ...(node.detailsUrl ? { url: node.detailsUrl } : {}) }
}

function summarise(checks: PRCheck[]): PRChecksSummary {
  const summary: PRChecksSummary = { total: checks.length, passed: 0, failed: 0, running: 0, skipped: 0 }
  for (const check of checks) summary[check.state] += 1
  return summary
}

function mapState(state: string | null | undefined, isDraft: boolean): PRState {
  switch ((state || '').toUpperCase()) {
    case 'MERGED':
      return 'merged'
    case 'CLOSED':
      return 'closed'
    default:
      return isDraft ? 'draft' : 'open'
  }
}

/**
 * `UNKNOWN` stays `undefined`, never `false`. GitHub computes mergeability lazily and
 * answers UNKNOWN on the first read after a push: calling that "conflicts" is wrong,
 * and letting it oscillate would move the watcher's cache key on every tick.
 */
function mapMergeable(mergeable: string | null | undefined): boolean | undefined {
  const value = (mergeable || '').toUpperCase()
  if (value === 'MERGEABLE') return true
  if (value === 'CONFLICTING') return false
  return undefined
}

/** Maps a successful payload onto the shared snapshot shape. */
export function mapPullRequestToSnapshot(
  pr: GQLPullRequest,
  rateLimit: { remaining?: number | null } | null | undefined,
): PRStatusSnapshot {
  const authorLogin = pr.author?.login || undefined

  const rollup = pr.commits?.nodes?.[0]?.commit?.statusCheckRollup ?? null
  const checks: PRCheck[] = []
  for (const node of rollup?.contexts?.nodes ?? []) {
    if (!node) continue
    const check = mapCheck(node)
    if (check) checks.push(check)
  }

  const reviewNodes = (pr.reviews?.nodes ?? []).filter((n): n is NonNullable<typeof n> => !!n)
  const threadNodes = (pr.reviewThreads?.nodes ?? []).filter((n): n is NonNullable<typeof n> => !!n)
  const conversationNodes = (pr.comments?.nodes ?? []).filter((n): n is NonNullable<typeof n> => !!n)

  // There is no `reviewComments` connection on PullRequest: the inline count is the
  // sum of the review threads' own comment totals.
  const inline = threadNodes.reduce((sum, thread) => sum + (thread.comments?.totalCount ?? 0), 0)
  const commentCounts: PRCommentCounts = {
    inline,
    conversation: pr.comments?.totalCount ?? 0,
    reviewSummaries: reviewNodes.filter(r => (r.body || '').trim().length > 0).length,
  }

  // A Set is insertion-ordered, so it dedupes and preserves "who spoke first" at once.
  const authors = new Set<string>()
  const collect = (login: string | null | undefined): void => {
    if (login && authors.size < MAX_COMMENT_AUTHORS) authors.add(login)
  }
  for (const review of reviewNodes) collect(review.author?.login)
  for (const thread of threadNodes) {
    for (const comment of thread.comments?.nodes ?? []) collect(comment?.author?.login)
  }
  for (const comment of conversationNodes) collect(comment.author?.login)

  // Normalise to the REST-ish shapes aggregatePRStatus already knows, so the review
  // precedence rules live in exactly one place.
  const reviews: GitHubReview[] = reviewNodes.map(r => ({
    user: { login: r.author?.login || undefined },
    state: r.state || undefined,
    submitted_at: r.submittedAt || undefined,
  }))
  const comments: GitHubReviewComment[] = [
    ...threadNodes.flatMap(t => (t.comments?.nodes ?? []).map(c => ({ user: { login: c?.author?.login || undefined } }))),
    ...conversationNodes.map(c => ({ user: { login: c.author?.login || undefined } })),
  ]

  const state = mapState(pr.state, pr.isDraft === true)
  const aggregated = aggregatePRStatus(
    {
      state: state === 'merged' || state === 'closed' ? 'closed' : 'open',
      merged: state === 'merged',
      updated_at: pr.updatedAt || undefined,
    },
    reviews,
    comments,
    authorLogin,
  )

  const mergeable = mapMergeable(pr.mergeable)

  return {
    ...aggregated,
    // Backward compatible `prReviewCommentCount`: the three buckets summed, not the
    // handful of nodes the query happened to bring back.
    commentCount: commentCounts.inline + commentCounts.conversation + commentCounts.reviewSummaries,
    rateLimitRemaining: rateLimit?.remaining ?? GRAPHQL_POOL_SIZE,
    state,
    ...(mergeable === undefined ? {} : { mergeable }),
    checks,
    checksSummary: summarise(checks),
    commentCounts,
    commentAuthors: Array.from(authors),
    headSha: pr.headRefOid || '',
    ...(rollup?.state ? { rollupState: rollup.state } : {}),
  }
}

// --- Entry point -----------------------------------------------------------

/**
 * Reads one PR. Never throws: every failure comes back as a named `PRStatusError`
 * so the card can say what is wrong instead of going quiet.
 */
async function postGraphQL(
  query: string,
  variables: Record<string, unknown>,
  owner: string,
  repo: string,
  number: number,
): Promise<{ pullRequest: GQLPullRequest; rateLimit?: { remaining?: number | null } | null } | PRStatusError> {
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

  let body: GQLResponse | null = null
  try {
    body = (await res.json()) as GQLResponse
  } catch {
    body = null
  }

  // errors[] FIRST: the interesting failures arrive with HTTP 200.
  const errors = (body?.errors ?? []).filter((e): e is NonNullable<typeof e> => !!e)
  if (errors.length > 0) {
    for (const err of errors) {
      const mapped = mapErrorType(err.type)
      if (mapped) return toError(mapped, err.message || mapped, res.headers)
    }
    if (!body?.data?.repository?.pullRequest) {
      return toError('network', errors[0].message || 'GitHub GraphQL returned an error', res.headers)
    }
    // Partial data with an unmapped error on some other field: the PR itself is here.
  }

  if (!res.ok) {
    const mapped = mapHttpStatus(res.status)
    return toError(mapped, body?.message || `GitHub GraphQL responded ${res.status}`, res.headers)
  }

  const pullRequest = body?.data?.repository?.pullRequest
  if (!pullRequest) {
    // No errors[], HTTP 200, and still nothing: the repo or the PR is out of reach.
    return { error: 'not-found', message: `Pull request ${owner}/${repo}#${number} was not found.` }
  }

  return { pullRequest, rateLimit: body?.data?.rateLimit }
}

/**
 * Walks older pages of reviews until the connection is exhausted.
 *
 * Only reached when the first page reports `hasPreviousPage`, i.e. the PR has more
 * than 100 reviews — so the normal tick remains exactly one request, and this cost
 * is paid solely by PRs that would otherwise report the wrong verdict. Bots submit
 * a review per push, so the threshold is reachable on a long-lived PR.
 *
 * A failure here is deliberately NOT fatal: an incomplete review history still
 * yields a usable snapshot, and returning an error would blank a card over an
 * edge case. The caller keeps whatever pages were collected.
 *
 * Giving up is not free either, though — an abandoned page can drop a reviewer's
 * latest verdict, so the card would show `pending` for an approved PR. Since the
 * likeliest cause is a transient blip on one request, each page gets ONE retry
 * before the walk stops; a rate-limit or auth failure gives up immediately,
 * because retrying those is guaranteed to fail again and only burns budget.
 */
async function fetchOlderReviews(
  owner: string,
  repo: string,
  number: number,
  firstPage: GQLReviewConnection,
): Promise<GQLReviewNode[]> {
  const collected: GQLReviewNode[] = []
  let cursor = firstPage.pageInfo?.startCursor
  let hasMore = firstPage.pageInfo?.hasPreviousPage === true

  for (let page = 0; page < MAX_REVIEW_PAGES && hasMore && cursor; page += 1) {
    const variables = { owner, repo, number, before: cursor }
    let result = await postGraphQL(REVIEWS_PAGE_QUERY, variables, owner, repo, number)

    if ('error' in result && RETRYABLE_PAGE_ERRORS.has(result.error)) {
      result = await postGraphQL(REVIEWS_PAGE_QUERY, variables, owner, repo, number)
    }

    if ('error' in result) {
      console.warn(
        `[github-graphql] Review history for ${owner}/${repo}#${number} is incomplete: ` +
        `older page failed (${result.error}). The verdict is derived from the ${collected.length + 100} newest reviews.`,
      )
      break
    }

    const connection = result.pullRequest.reviews
    const nodes = (connection?.nodes ?? []).filter((n): n is GQLReviewNode => !!n)
    // Older pages go in FRONT: aggregatePRStatus relies on chronological order,
    // overwriting each reviewer's entry so the last one wins.
    collected.unshift(...nodes)

    cursor = connection?.pageInfo?.startCursor
    hasMore = connection?.pageInfo?.hasPreviousPage === true
  }

  return collected
}

/**
 * Reads one PR. Never throws: every failure comes back as a named `PRStatusError`
 * so the card can say what is wrong instead of going quiet.
 */
export async function fetchPRStatusGraphQL(
  owner: string,
  repo: string,
  number: number,
): Promise<PRStatusSnapshot | PRStatusError> {
  const token = getGitHubToken()
  // GraphQL has no anonymous access at all — no point spending a request to learn it.
  if (!token) {
    return { error: 'no-token', message: 'No GitHub token: run `gh auth login` to watch pull requests.' }
  }

  const result = await postGraphQL(PR_STATUS_QUERY, { owner, repo, number }, owner, repo, number)
  if ('error' in result) return result

  const { pullRequest, rateLimit } = result

  // Reviews decide the VERDICT, so a truncated list is not a smaller answer — it is
  // a wrong one. Everything else in the query is either a total or a bounded window.
  if (pullRequest.reviews?.pageInfo?.hasPreviousPage === true) {
    const older = await fetchOlderReviews(owner, repo, number, pullRequest.reviews)
    if (older.length > 0) {
      pullRequest.reviews = {
        ...pullRequest.reviews,
        nodes: [...older, ...(pullRequest.reviews.nodes ?? [])],
      }
    }
  }

  return mapPullRequestToSnapshot(pullRequest, rateLimit)
}
