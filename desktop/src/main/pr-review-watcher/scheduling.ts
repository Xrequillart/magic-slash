import type { PRChecksSummary, PRCommentCounts, PRState } from '../../types'

/**
 * Pure scheduling decisions for the PR review watcher.
 *
 * Lives in its own module, importing nothing but a type, for the same reason as
 * `merge-detection.ts`: `watcher.ts` pulls in `terminal-manager` (hence `node-pty`)
 * and `electron`, neither of which exists where only the ROOT dependencies are
 * installed — which is exactly where this suite runs. Keeping the cadence maths
 * here means it can be unit-tested without Electron and without a native build.
 */

/**
 * Hard floor on any poll cadence. NOT a preference: the same 30 s bound is
 * enforced on the IPC path (`ipc/pr-review-handlers.ts`) and on the remote-sync
 * mirror, and `PRReviewWatcher.setInterval()` does NOT re-validate what it is
 * handed. Clamping here is what keeps a 5 s config (or a 25 s "let's poll faster
 * during CI" idea) from ever reaching the timer.
 */
export const MIN_POLL_INTERVAL_MS = 30_000
export const MAX_POLL_INTERVAL_MS = 600_000
export const DEFAULT_POLL_INTERVAL_MS = 60_000

/**
 * Backoff ladder after a failed read: 30 s, then 2 min, then 5 min, and 5 min
 * for every attempt after that. Short enough that a `gh auth login` is picked up
 * quickly, long enough that a rate-limited or offline machine stops hammering.
 */
export const BACKOFF_STEPS_MS = [30_000, 120_000, 300_000] as const

/** Clamps any candidate cadence into the bounds the watcher is allowed to run at. */
export function clampPollInterval(ms: number): number {
  if (!Number.isFinite(ms)) return DEFAULT_POLL_INTERVAL_MS
  if (ms < MIN_POLL_INTERVAL_MS) return MIN_POLL_INTERVAL_MS
  if (ms > MAX_POLL_INTERVAL_MS) return MAX_POLL_INTERVAL_MS
  return ms
}

/** A PR whose status can no longer change: nothing left to poll for. */
export function isTerminalPR(input: { state?: PRState; merged: boolean; closed: boolean }): boolean {
  if (input.state === 'merged' || input.state === 'closed') return true
  return input.merged || input.closed
}

export interface NextIntervalInput {
  /** At least one check on the head commit is still running. */
  hasRunningChecks: boolean
  /** The PR is merged, or closed without merging. */
  isTerminal: boolean
  /** The user's configured cadence (already the watcher's current setting). */
  configuredMs: number
}

/**
 * How long to wait before reading this PR again.
 *
 * `null` means STOP polling it: a merged PR, or one closed without merging, is
 * final — every further read only burns GraphQL budget.
 *
 * A running CI is the one case worth tightening the cadence for, because that is
 * when the card changes most and when the user is actually watching it. The
 * tightening stops at the 30 s floor: going below it would break the bound the
 * rest of the codebase enforces, so "accelerated" means "as fast as we are ever
 * allowed to go", never faster than the configured cadence is slow.
 */
export function nextInterval({ hasRunningChecks, isTerminal, configuredMs }: NextIntervalInput): number | null {
  if (isTerminal) return null
  // `clampPollInterval` never returns less than the floor, so "accelerated" IS the
  // floor — there is no arithmetic left to do on this branch.
  return hasRunningChecks ? MIN_POLL_INTERVAL_MS : clampPollInterval(configuredMs)
}

/**
 * Delay before retrying a PR whose last read failed.
 *
 * `attempt` is 1-based (1 = the failure that just happened).
 *
 * `retryAtMs` is an ABSOLUTE epoch deadline, not a duration — that is what
 * `PRStatusError.retryAtMs` carries, because `Retry-After` and
 * `X-RateLimit-Reset` describe a moment GitHub will serve us again, and the two
 * headers disagree about units (delta-seconds vs epoch seconds) so the parser
 * normalises them to an instant. Passing it straight through as a delay is how a
 * single `X-RateLimit-Reset` response turns into a ~57-year backoff and the PR is
 * never polled again — hence `now` is a parameter and the conversion happens here,
 * once, where both units are visible.
 *
 * The remaining wait always wins when it is LONGER than the ladder step: retrying
 * before the deadline is a guaranteed second failure. It is not capped here (a
 * secondary-rate-limit window can legitimately exceed 5 min); the watcher's timer
 * still clamps the wake-up to `MAX_POLL_INTERVAL_MS`, so a distant deadline costs
 * one wasted read at the ceiling rather than a stalled watcher.
 */
export function nextBackoff(attempt: number, retryAtMs?: number, now: number = Date.now()): number {
  const index = Math.min(Math.max(Math.trunc(attempt), 1), BACKOFF_STEPS_MS.length) - 1
  const step = BACKOFF_STEPS_MS[index]
  if (typeof retryAtMs !== 'number' || !Number.isFinite(retryAtMs)) return step
  const remaining = retryAtMs - now
  return remaining > step ? remaining : step
}

/**
 * Identity of a PR snapshot, used to decide whether anything actually moved.
 *
 * `updated_at` ALONE is not enough, and that is the bug this replaces: a check
 * turning green does not necessarily touch `pr.updated_at`, so an `updatedAt`
 * comparison would `continue` past the tick and the CI state would never reach
 * the UI. The head SHA covers a force-push, the rollup state covers the CI going
 * from pending to green.
 *
 * The rollup is not sufficient either, which is why the per-bucket counts are in
 * here too. The rollup stays `PENDING` for as long as ANY check is unfinished, so
 * on a PR with several jobs each individual one landing leaves it untouched — the
 * card would freeze on the first snapshot and only catch up when the last job
 * finished, defeating "they flip to passed/failed without any manual refresh".
 * The counts move on every individual transition. Comment counts ride along for
 * the same reason: a bot posting does not always bump `updated_at`.
 *
 * `extras` closes the same class of freeze for everything else the card renders.
 * Each of these can move while every field above stays put:
 *  - `mergeable` is computed asynchronously, so `UNKNOWN → CONFLICTING` lands on a
 *    later tick with the same SHA, the same `updatedAt` and the same check counts;
 *    without it the "conflicts" row never appears.
 *  - `status` / `reviewers` move on an approval with an empty body, which touches
 *    no comment bucket at all — and that path also feeds the history entry and the
 *    desktop notification, so swallowing it loses more than a label.
 *  - `checkStates` covers the counts staying put while the checks behind them
 *    change: one job going green as another goes red leaves `2 passed, 1 failed`
 *    identical, and the card now names the individual checks, so without their
 *    identity in here it would keep listing the one that recovered and never show
 *    the one that broke.
 *
 * The rule this encodes: everything derived from the snapshot and shown to the
 * user belongs in the key, or it can be silently withheld from them.
 */
export function snapshotKey(
  headSha: string,
  updatedAt: number,
  rollupState?: string,
  checks?: PRChecksSummary,
  comments?: PRCommentCounts,
  extras?: {
    status?: string
    state?: PRState
    mergeable?: boolean
    reviewers?: string[]
    /** One `name:state` per check on the head commit. */
    checkStates?: string[]
  },
): string {
  const c = checks ? `${checks.total}/${checks.passed}/${checks.failed}/${checks.running}/${checks.skipped}` : ''
  const m = comments ? `${comments.inline}/${comments.conversation}/${comments.reviewSummaries}` : ''
  const e = extras
    ? [
      extras.status ?? '',
      extras.state ?? '',
      String(extras.mergeable),
      (extras.reviewers ?? []).join(','),
      (extras.checkStates ?? []).join(','),
    ].join('/')
    : ''
  return `${headSha}|${updatedAt}|${rollupState ?? ''}|${c}|${m}|${e}`
}
