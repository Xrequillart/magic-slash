import { execFileSync } from 'child_process'

export function getGitHubToken(): string | null {
  try {
    return execFileSync('gh', ['auth', 'token'], { encoding: 'utf-8' }).trim() || null
  } catch {
    return null
  }
}

export function githubHeaders(extra?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = { ...extra }
  const token = getGitHubToken()
  if (token) headers.Authorization = `Bearer ${token}`
  return headers
}

export interface ParsedPRUrl {
  owner: string
  repo: string
  number: number
}

/** Parses a GitHub PR URL. Returns null if the URL is not a valid PR URL. */
export function parsePRUrl(url: string): ParsedPRUrl | null {
  const match = url.match(/^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)\/?(?:[?#].*)?$/)
  if (!match) return null
  const [, owner, repo, numberStr] = match
  const number = parseInt(numberStr, 10)
  if (number <= 0) return null
  return { owner, repo, number }
}

interface GitHubReview {
  user?: { login?: string } | null
  state?: string
  submitted_at?: string
}

interface GitHubReviewComment {
  user?: { login?: string } | null
}

interface GitHubPullRequest {
  state?: string
  merged?: boolean
  head?: { sha?: string }
  updated_at?: string
}

export interface PRFetchResult<T> {
  data: T
  rateLimitRemaining: number
}

function parseRateLimitRemaining(res: Response): number {
  const header = res.headers.get('X-RateLimit-Remaining')
  const parsed = header ? parseInt(header, 10) : NaN
  return Number.isFinite(parsed) ? parsed : Number.POSITIVE_INFINITY
}

async function ghGet<T>(url: string): Promise<PRFetchResult<T>> {
  const res = await fetch(url, {
    headers: githubHeaders({ Accept: 'application/vnd.github+json' }),
  })
  if (!res.ok) {
    throw new Error(`GitHub API ${res.status} for ${url}`)
  }
  const data = (await res.json()) as T
  return { data, rateLimitRemaining: parseRateLimitRemaining(res) }
}

export async function fetchPullRequest(
  owner: string,
  repo: string,
  number: number,
): Promise<PRFetchResult<GitHubPullRequest>> {
  return ghGet<GitHubPullRequest>(`https://api.github.com/repos/${owner}/${repo}/pulls/${number}`)
}

export async function fetchPRReviews(
  owner: string,
  repo: string,
  number: number,
): Promise<PRFetchResult<GitHubReview[]>> {
  return ghGet<GitHubReview[]>(`https://api.github.com/repos/${owner}/${repo}/pulls/${number}/reviews`)
}

export async function fetchPRReviewComments(
  owner: string,
  repo: string,
  number: number,
): Promise<PRFetchResult<GitHubReviewComment[]>> {
  return ghGet<GitHubReviewComment[]>(`https://api.github.com/repos/${owner}/${repo}/pulls/${number}/comments`)
}

export type AggregatedReviewStatus = 'approved' | 'changes-requested' | 'commented' | 'pending'

export interface AggregatedPRStatus {
  status: AggregatedReviewStatus
  commentCount: number
  reviewers: string[]
  merged: boolean
  closed: boolean
  updatedAt: number
}

/**
 * Reduces a PR + its reviews + review comments into a single status snapshot.
 * Rule: keep the latest review per reviewer; changes_requested > approved > commented > pending.
 */
export function aggregatePRStatus(
  pr: GitHubPullRequest,
  reviews: GitHubReview[],
  comments: GitHubReviewComment[],
): AggregatedPRStatus {
  const latestByReviewer = new Map<string, GitHubReview>()
  for (const review of reviews) {
    const login = review.user?.login
    if (!login) continue
    // reviews come chronological; overwriting preserves the last one
    latestByReviewer.set(login, review)
  }

  const latestStates = Array.from(latestByReviewer.values()).map(r => (r.state || '').toUpperCase())

  let status: AggregatedReviewStatus
  if (latestStates.includes('CHANGES_REQUESTED')) {
    status = 'changes-requested'
  } else if (latestStates.includes('APPROVED')) {
    status = 'approved'
  } else if (latestStates.includes('COMMENTED') || comments.length > 0) {
    status = 'commented'
  } else {
    status = 'pending'
  }

  const reviewers = Array.from(latestByReviewer.entries())
    .filter(([, r]) => (r.state || '').toUpperCase() !== 'PENDING')
    .map(([login]) => login)

  const updatedAtMs = pr.updated_at ? new Date(pr.updated_at).getTime() : 0

  return {
    status,
    commentCount: comments.length,
    reviewers,
    merged: pr.merged === true,
    closed: pr.state === 'closed',
    updatedAt: Number.isFinite(updatedAtMs) ? updatedAtMs : 0,
  }
}

export interface PRStatusSnapshot extends AggregatedPRStatus {
  rateLimitRemaining: number
}

interface PRCacheEntry {
  lastSeenUpdatedAt: number
  snapshot: PRStatusSnapshot
}

const prCache = new Map<string, PRCacheEntry>()

/** Returns the cache entry for a PR URL (visible for testing/diagnostics). */
export function getCachedPRStatus(url: string): PRCacheEntry | undefined {
  return prCache.get(url)
}

/** Clears all cache entries (visible for testing). */
export function clearPRCache(): void {
  prCache.clear()
}

/**
 * Orchestrates the 3 fetches and aggregates. Returns null if the URL is invalid.
 * Uses an in-memory cache keyed by URL: if pr.updated_at matches the last snapshot,
 * returns the cached aggregation (still refreshes rateLimitRemaining).
 */
export async function fetchPRStatus(url: string): Promise<PRStatusSnapshot | null> {
  const parsed = parsePRUrl(url)
  if (!parsed) return null

  const { owner, repo, number } = parsed
  const [prRes, reviewsRes, commentsRes] = await Promise.all([
    fetchPullRequest(owner, repo, number),
    fetchPRReviews(owner, repo, number),
    fetchPRReviewComments(owner, repo, number),
  ])

  const rateLimitRemaining = Math.min(
    prRes.rateLimitRemaining,
    reviewsRes.rateLimitRemaining,
    commentsRes.rateLimitRemaining,
  )

  const prUpdatedAtMs = prRes.data.updated_at ? new Date(prRes.data.updated_at).getTime() : 0
  const cached = prCache.get(url)
  if (cached && cached.lastSeenUpdatedAt === prUpdatedAtMs && prUpdatedAtMs > 0) {
    return { ...cached.snapshot, rateLimitRemaining }
  }

  const aggregated = aggregatePRStatus(prRes.data, reviewsRes.data, commentsRes.data)
  const snapshot: PRStatusSnapshot = { ...aggregated, rateLimitRemaining }
  prCache.set(url, { lastSeenUpdatedAt: aggregated.updatedAt, snapshot })
  return snapshot
}
