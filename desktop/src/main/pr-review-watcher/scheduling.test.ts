import { describe, it, expect } from 'vitest'
import {
  nextInterval,
  nextBackoff,
  snapshotKey,
  isTerminalPR,
  clampPollInterval,
  MIN_POLL_INTERVAL_MS,
  MAX_POLL_INTERVAL_MS,
} from './scheduling'

describe('nextInterval', () => {
  it('accelerates to the floor while a check is running', () => {
    expect(nextInterval({ hasRunningChecks: true, isTerminal: false, configuredMs: 300_000 })).toBe(30_000)
  })

  it('uses the configured cadence when no check is running', () => {
    expect(nextInterval({ hasRunningChecks: false, isTerminal: false, configuredMs: 120_000 })).toBe(120_000)
  })

  it('never goes below the 30 s floor, even with a smaller configured interval', () => {
    // The floor is enforced in three other places (IPC validation, remote-sync
    // mirror, config UI). A 5 s config reaching the timer would violate all of them.
    expect(nextInterval({ hasRunningChecks: true, isTerminal: false, configuredMs: 5_000 })).toBe(MIN_POLL_INTERVAL_MS)
    expect(nextInterval({ hasRunningChecks: false, isTerminal: false, configuredMs: 5_000 })).toBe(MIN_POLL_INTERVAL_MS)
  })

  it('never goes above the 10 min ceiling', () => {
    expect(nextInterval({ hasRunningChecks: false, isTerminal: false, configuredMs: 3_600_000 })).toBe(MAX_POLL_INTERVAL_MS)
  })

  it('returns null once the PR is merged', () => {
    expect(nextInterval({ hasRunningChecks: false, isTerminal: true, configuredMs: 60_000 })).toBeNull()
  })

  it('returns null for a closed-but-unmerged PR', () => {
    // Same terminal decision: the status cannot change again either way.
    expect(nextInterval({ hasRunningChecks: true, isTerminal: true, configuredMs: 60_000 })).toBeNull()
  })

  it('falls back to a sane cadence when the configured value is garbage', () => {
    expect(nextInterval({ hasRunningChecks: false, isTerminal: false, configuredMs: Number.NaN })).toBe(60_000)
  })
})

describe('isTerminalPR', () => {
  it('is terminal when merged', () => {
    expect(isTerminalPR({ merged: true, closed: true })).toBe(true)
    expect(isTerminalPR({ state: 'merged', merged: false, closed: false })).toBe(true)
  })

  it('is terminal when closed without a merge', () => {
    expect(isTerminalPR({ merged: false, closed: true })).toBe(true)
    expect(isTerminalPR({ state: 'closed', merged: false, closed: false })).toBe(true)
  })

  it('is not terminal while open or draft', () => {
    expect(isTerminalPR({ state: 'open', merged: false, closed: false })).toBe(false)
    expect(isTerminalPR({ state: 'draft', merged: false, closed: false })).toBe(false)
  })
})

describe('nextBackoff', () => {
  it('climbs 30 s, 2 min, 5 min', () => {
    expect(nextBackoff(1)).toBe(30_000)
    expect(nextBackoff(2)).toBe(120_000)
    expect(nextBackoff(3)).toBe(300_000)
  })

  it('plateaus at 5 min', () => {
    expect(nextBackoff(4)).toBe(300_000)
    expect(nextBackoff(50)).toBe(300_000)
  })

  it('treats a zero or negative attempt as the first one', () => {
    expect(nextBackoff(0)).toBe(30_000)
    expect(nextBackoff(-3)).toBe(30_000)
  })

  it('honours Retry-After when the remaining wait is longer than the ladder step', () => {
    // GitHub knows when it will serve us again; retrying earlier just fails again.
    const now = 1_700_000_000_000
    expect(nextBackoff(1, now + 900_000, now)).toBe(900_000)
    expect(nextBackoff(3, now + 3_600_000, now)).toBe(3_600_000)
  })

  it('ignores a Retry-After whose remaining wait is shorter than the ladder step', () => {
    const now = 1_700_000_000_000
    expect(nextBackoff(3, now + 1_000, now)).toBe(300_000)
  })

  it('ignores a non-finite Retry-After', () => {
    expect(nextBackoff(1, Number.NaN)).toBe(30_000)
  })

  /**
   * The regression this signature exists to prevent: `retryAtMs` is an ABSOLUTE
   * epoch deadline (X-RateLimit-Reset is epoch seconds ×1000), so passing it through
   * as a duration produced a ~57-year backoff and the PR was never polled again.
   */
  it('reads an X-RateLimit-Reset deadline as an instant, not a duration', () => {
    const now = 1_700_000_000_000
    expect(nextBackoff(1, now + 45_000, now)).toBe(45_000)
    expect(nextBackoff(1, now + 45_000, now)).toBeLessThan(60_000)
  })

  it('falls back to the ladder step for a deadline already in the past', () => {
    const now = 1_700_000_000_000
    expect(nextBackoff(2, now - 10_000, now)).toBe(120_000)
  })
})

describe('snapshotKey', () => {
  it('changes when only the rollup state moves', () => {
    // The whole point: a check turning green need not touch pr.updated_at, so an
    // updatedAt-only comparison would swallow the tick and the CI state would
    // never reach the card.
    const before = snapshotKey('abc123', 1_700_000_000_000, 'PENDING')
    const after = snapshotKey('abc123', 1_700_000_000_000, 'SUCCESS')
    expect(after).not.toBe(before)
  })

  it('changes when the head SHA moves (force-push)', () => {
    expect(snapshotKey('abc123', 1, 'SUCCESS')).not.toBe(snapshotKey('def456', 1, 'SUCCESS'))
  })

  it('changes when updatedAt moves', () => {
    expect(snapshotKey('abc123', 1, 'SUCCESS')).not.toBe(snapshotKey('abc123', 2, 'SUCCESS'))
  })

  it('is stable when nothing moved', () => {
    expect(snapshotKey('abc123', 42, 'SUCCESS')).toBe(snapshotKey('abc123', 42, 'SUCCESS'))
  })

  it('treats a missing rollup state as its own stable value', () => {
    expect(snapshotKey('abc123', 42, undefined)).toBe(snapshotKey('abc123', 42, undefined))
    expect(snapshotKey('abc123', 42, undefined)).not.toBe(snapshotKey('abc123', 42, 'SUCCESS'))
  })

  /**
   * Acceptance criterion: running Actions "flip to passed/failed without any manual
   * refresh". The rollup stays PENDING until the LAST job finishes, so on a
   * multi-job PR a rollup-only key freezes the card for the whole CI run.
   */
  it('changes when one check finishes while others still run', () => {
    const before = snapshotKey('abc123', 42, 'PENDING', { total: 3, passed: 0, failed: 0, running: 3, skipped: 0 })
    const after = snapshotKey('abc123', 42, 'PENDING', { total: 3, passed: 1, failed: 0, running: 2, skipped: 0 })
    expect(after).not.toBe(before)
  })

  it('changes when a bot posts a comment without touching updatedAt', () => {
    const checks = { total: 1, passed: 1, failed: 0, running: 0, skipped: 0 }
    const before = snapshotKey('abc123', 42, 'SUCCESS', checks, { inline: 0, conversation: 0, reviewSummaries: 0 })
    const after = snapshotKey('abc123', 42, 'SUCCESS', checks, { inline: 0, conversation: 1, reviewSummaries: 0 })
    expect(after).not.toBe(before)
  })

  it('is stable when checks and comments are unchanged', () => {
    const checks = { total: 2, passed: 1, failed: 0, running: 1, skipped: 0 }
    const comments = { inline: 3, conversation: 2, reviewSummaries: 1 }
    expect(snapshotKey('abc123', 42, 'PENDING', checks, comments))
      .toBe(snapshotKey('abc123', 42, 'PENDING', checks, comments))
  })

  /**
   * `mergeable` is computed asynchronously, so this transition lands on a later
   * tick with the same SHA, updatedAt and check counts. Outside the key, the
   * "conflicts" row would never reach the card.
   */
  it('changes when mergeability resolves from unknown to conflicting', () => {
    const checks = { total: 1, passed: 0, failed: 0, running: 1, skipped: 0 }
    const before = snapshotKey('abc123', 42, 'PENDING', checks, undefined, { mergeable: undefined })
    const after = snapshotKey('abc123', 42, 'PENDING', checks, undefined, { mergeable: false })
    expect(after).not.toBe(before)
  })

  /** An approval with an empty body moves no comment bucket at all. */
  it('changes when the review status moves without any comment', () => {
    const comments = { inline: 0, conversation: 0, reviewSummaries: 0 }
    const before = snapshotKey('abc123', 42, 'SUCCESS', undefined, comments, { status: 'pending' })
    const after = snapshotKey('abc123', 42, 'SUCCESS', undefined, comments, { status: 'approved' })
    expect(after).not.toBe(before)
  })

  it('changes when the reviewer list moves', () => {
    const before = snapshotKey('abc123', 42, 'SUCCESS', undefined, undefined, { reviewers: ['alice'] })
    const after = snapshotKey('abc123', 42, 'SUCCESS', undefined, undefined, { reviewers: ['alice', 'bob'] })
    expect(after).not.toBe(before)
  })

  it('changes when the PR state moves', () => {
    const before = snapshotKey('abc123', 42, 'SUCCESS', undefined, undefined, { state: 'open' })
    const after = snapshotKey('abc123', 42, 'SUCCESS', undefined, undefined, { state: 'merged' })
    expect(after).not.toBe(before)
  })
})

describe('clampPollInterval', () => {
  it('clamps both ends', () => {
    expect(clampPollInterval(1)).toBe(MIN_POLL_INTERVAL_MS)
    expect(clampPollInterval(999_999_999)).toBe(MAX_POLL_INTERVAL_MS)
    expect(clampPollInterval(90_000)).toBe(90_000)
  })
})
