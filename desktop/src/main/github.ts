import { execFileSync } from 'child_process'
// These shapes are the shared contract (`src/types.ts`), not this module's own —
// they used to be declared here as well, and every importer now takes them from
// there directly.
import type { AggregatedPRStatus, AggregatedReviewStatus, PRStatusError, PRStatusSnapshot } from '../types'
import { fetchPRStatusGraphQL } from './github-graphql'

/**
 * The `gh auth token` result, memoised for the process lifetime.
 *
 * `execFileSync` spawns a subprocess, and this used to run on EVERY request — three
 * spawns per watched PR per tick. Only a real token is memoised: a null means "not
 * logged in yet", and someone who runs `gh auth login` while the app is open must be
 * picked up without a restart. Invalidated by `clearGitHubTokenCache()`, which the
 * GraphQL layer calls on a 401 so a rotated/revoked token is re-read once.
 */
let cachedToken: string | null = null

export function getGitHubToken(): string | null {
  if (cachedToken) return cachedToken
  try {
    cachedToken = execFileSync('gh', ['auth', 'token'], { encoding: 'utf-8' }).trim() || null
  } catch {
    cachedToken = null
  }
  return cachedToken
}

/** Drops the memoised token, so the next read re-runs `gh auth token`. */
export function clearGitHubTokenCache(): void {
  cachedToken = null
}

/** Extract the account handle from `gh auth status` output (either format). */
function parseGhAccount(text: string): string | undefined {
  return text.match(/account\s+(\S+)/i)?.[1] || text.match(/Logged in to \S+ as (\S+)/i)?.[1]
}

/**
 * Detects GitHub CLI auth status for DISPLAY only — no token is ever stored.
 * Parses `gh auth status`, which writes to stderr and includes a line like
 * "✓ Logged in to github.com account <user> (...)". Returns { loggedIn } and,
 * when available, the detected account handle.
 */
export function getGitHubAuthStatus(): { loggedIn: boolean; account?: string } {
  try {
    const output = execFileSync('gh', ['auth', 'status'], {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    return { loggedIn: true, account: parseGhAccount(output) }
  } catch {
    // gh exits non-zero when not logged in OR when the stored credentials are
    // invalid/expired. Either way the login is unusable, so report disconnected
    // even if an account handle still appears in the error output.
    return { loggedIn: false }
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

/**
 * REST-shaped review. The GraphQL layer normalises its own payload into this
 * (GraphQL says `author.login`, REST says `user.login`) rather than duplicating
 * the aggregation rules below.
 */
export interface GitHubReview {
  user?: { login?: string } | null
  state?: string
  submitted_at?: string
}

export interface GitHubReviewComment {
  user?: { login?: string } | null
}

interface GitHubPullRequest {
  state?: string
  merged?: boolean
  head?: { sha?: string }
  updated_at?: string
}

/** Reviews that say nothing about the PR's health and must never become its status. */
const IGNORED_REVIEW_STATES = new Set(['DISMISSED', 'PENDING'])

/**
 * Reduces a PR + its reviews + review comments into a single status snapshot.
 * Rule: keep the latest MEANINGFUL review per reviewer; changes_requested > approved
 * > commented > pending.
 *
 * DISMISSED and PENDING reviews are skipped outright rather than kept as "the latest":
 * a dismissed review matches neither CHANGES_REQUESTED nor APPROVED, so letting it win
 * dropped an approved PR back to `commented`/`pending`, and a PENDING one is a draft
 * nobody has submitted. Reviews written by `authorLogin` are skipped too — self-reviews
 * (and the "approved my own PR" case) are not feedback.
 *
 * `authorLogin` is optional so the three-argument callers keep working.
 */
export function aggregatePRStatus(
  pr: GitHubPullRequest,
  reviews: GitHubReview[],
  comments: GitHubReviewComment[],
  authorLogin?: string,
): AggregatedPRStatus {
  const latestByReviewer = new Map<string, GitHubReview>()
  for (const review of reviews) {
    const login = review.user?.login
    if (!login) continue
    if (authorLogin && login === authorLogin) continue
    if (IGNORED_REVIEW_STATES.has((review.state || '').toUpperCase())) continue
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

  const reviewers = Array.from(latestByReviewer.keys())

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

/**
 * Reads everything the watcher needs about a PR in ONE GraphQL query.
 *
 * Returns null for a URL that is not a PR URL, a `PRStatusError` for a failure the
 * card must be able to name (see `isPRStatusError`), and a snapshot otherwise.
 *
 * Deliberately NOT cached here: change detection belongs to the watcher, which keys
 * it on a composite (updatedAt + head sha + rollup state + counts). A cache keyed on
 * `updated_at` alone — which is what used to live here — hid every check going from
 * running to green, since a check flipping does not move the PR's updatedAt.
 */
export async function fetchPRStatus(url: string): Promise<PRStatusSnapshot | PRStatusError | null> {
  const parsed = parsePRUrl(url)
  if (!parsed) return null
  return fetchPRStatusGraphQL(parsed.owner, parsed.repo, parsed.number)
}
