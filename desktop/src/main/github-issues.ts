/**
 * The single GraphQL read behind the Tasks page: one repository's OPEN issues.
 *
 * A module of its own, next to `github-graphql.ts` rather than inside it. The two
 * reads share an error ladder and nothing else: `postGraphQL` is deliberately NOT
 * generic — its own ladder inspects `data.repository.pullRequest`, and four live
 * PR-watcher call sites depend on that shape. Making the transport generic to save
 * thirty lines here would put every one of them at risk, so the ladder is rebuilt
 * on the helpers it already exports.
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
import type { PRStatusError, TaskIssue } from '../types'

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
        parent { number title }
        subIssuesSummary { total completed }
      }
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
  parent?: { number?: number | null; title?: string | null } | null
  subIssuesSummary?: { total?: number | null; completed?: number | null } | null
}

interface GQLIssuesResponse {
  data?: {
    rateLimit?: { remaining?: number | null } | null
    repository?: {
      issues?: { totalCount?: number | null; nodes?: (GQLIssueNode | null)[] | null } | null
    } | null
  } | null
  errors?: ({ type?: string | null; message?: string | null } | null)[] | null
  message?: string
}

/**
 * The parent, when GitHub reports one AND it is usable.
 *
 * `null` is the NORMAL answer here — most issues are top-level — so this is a
 * mapper, not a validation: anything without a number is dropped as silently as a
 * missing parent, because a badge reading `↳ #undefined` is worse than no badge.
 */
function mapParent(node: GQLIssueNode): TaskIssue['parent'] {
  const parent = node.parent
  if (!parent || typeof parent.number !== 'number') return undefined
  return { number: parent.number, title: parent.title || `#${parent.number}` }
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
  // Checked before the request, not after a 401: GraphQL has no anonymous access,
  // so an unauthenticated call can only fail, and this names the fix.
  if (!getGitHubToken()) {
    return { error: 'no-token', message: 'No GitHub token: run `gh auth login` to read open issues.' }
  }

  let res: Response
  try {
    res = await fetch(GITHUB_GRAPHQL_URL, {
      method: 'POST',
      headers: githubHeaders({ 'Content-Type': 'application/json', Accept: 'application/json' }),
      body: JSON.stringify({ query: OPEN_ISSUES_QUERY, variables: { owner, repo } }),
    })
  } catch (err) {
    return { error: 'network', message: `Could not reach GitHub: ${err instanceof Error ? err.message : String(err)}` }
  }

  let body: GQLIssuesResponse | null = null
  try {
    body = (await res.json()) as GQLIssuesResponse
  } catch {
    body = null
  }

  // errors[] FIRST: NOT_FOUND, FORBIDDEN and RATE_LIMITED all arrive with HTTP 200,
  // and a repo the token cannot see is the commonest of the three.
  const errors = (body?.errors ?? []).filter((e): e is NonNullable<typeof e> => !!e)
  if (errors.length > 0) {
    for (const err of errors) {
      const mapped = mapErrorType(err.type)
      if (mapped) return toError(mapped, err.message || mapped, res.headers)
    }
    if (!body?.data?.repository?.issues) {
      return toError('network', errors[0].message || 'GitHub GraphQL returned an error', res.headers)
    }
    // Partial data with an unmapped error elsewhere: the issues themselves are here.
  }

  if (!res.ok) {
    const mapped = mapHttpStatus(res.status)
    return toError(mapped, body?.message || `GitHub GraphQL responded ${res.status}`, res.headers)
  }

  const nodes = body?.data?.repository?.issues?.nodes
  if (!nodes) {
    // No errors[], HTTP 200, and still nothing: the repository is out of reach.
    return { error: 'not-found', message: `Repository ${owner}/${repo} was not found.` }
  }

  const issues = mapIssues(nodes)
  // Falls back to what was actually mapped rather than to 0: a missing `totalCount`
  // must not make a page of issues read as "showing 50 of 0".
  const reported = body?.data?.repository?.issues?.totalCount
  const totalOpen = typeof reported === 'number' ? Math.max(reported, issues.length) : issues.length

  return { issues, totalOpen }
}
