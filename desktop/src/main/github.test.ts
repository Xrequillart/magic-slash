import { describe, it, expect, vi } from 'vitest'

// Mock child_process BEFORE importing the module under test so getGitHubToken()
// doesn't attempt to spawn `gh` during the test run.
vi.mock('child_process', () => ({
  execFileSync: () => '',
}))

import { parsePRUrl, aggregatePRStatus } from './github'

describe('parsePRUrl', () => {
  it('parses a standard PR URL', () => {
    expect(parsePRUrl('https://github.com/xrequillart/magic-slash/pull/42')).toEqual({
      owner: 'xrequillart',
      repo: 'magic-slash',
      number: 42,
    })
  })

  it('tolerates a trailing slash', () => {
    expect(parsePRUrl('https://github.com/xrequillart/magic-slash/pull/42/')).toEqual({
      owner: 'xrequillart',
      repo: 'magic-slash',
      number: 42,
    })
  })

  it('tolerates http', () => {
    expect(parsePRUrl('http://github.com/a/b/pull/1')).toEqual({ owner: 'a', repo: 'b', number: 1 })
  })

  it('tolerates a query string', () => {
    expect(parsePRUrl('https://github.com/a/b/pull/1?diff=split')).toEqual({ owner: 'a', repo: 'b', number: 1 })
  })

  it('returns null for non-PR URLs', () => {
    expect(parsePRUrl('https://github.com/xrequillart/magic-slash/issues/42')).toBeNull()
    expect(parsePRUrl('https://example.com/xrequillart/magic-slash/pull/42')).toBeNull()
    expect(parsePRUrl('not a url')).toBeNull()
    expect(parsePRUrl('')).toBeNull()
  })

  it('returns null for zero or invalid PR numbers', () => {
    expect(parsePRUrl('https://github.com/a/b/pull/0')).toBeNull()
    expect(parsePRUrl('https://github.com/a/b/pull/abc')).toBeNull()
  })
})

describe('aggregatePRStatus', () => {
  const pr = { state: 'open', merged: false, updated_at: '2025-01-01T10:00:00Z' }

  it('returns approved when the latest review is APPROVED', () => {
    const result = aggregatePRStatus(
      pr,
      [{ user: { login: 'alice' }, state: 'APPROVED' }],
      [],
    )
    expect(result.status).toBe('approved')
    expect(result.reviewers).toEqual(['alice'])
    expect(result.commentCount).toBe(0)
  })

  it('lets changes_requested win over approved from a different reviewer', () => {
    const result = aggregatePRStatus(
      pr,
      [
        { user: { login: 'alice' }, state: 'APPROVED' },
        { user: { login: 'bob' }, state: 'CHANGES_REQUESTED' },
      ],
      [],
    )
    expect(result.status).toBe('changes-requested')
    expect(result.reviewers).toEqual(expect.arrayContaining(['alice', 'bob']))
  })

  it('uses the latest review from the same reviewer', () => {
    const result = aggregatePRStatus(
      pr,
      [
        { user: { login: 'alice' }, state: 'CHANGES_REQUESTED' },
        { user: { login: 'alice' }, state: 'APPROVED' },
      ],
      [],
    )
    expect(result.status).toBe('approved')
  })

  it('returns commented when only inline comments exist', () => {
    const result = aggregatePRStatus(
      pr,
      [],
      [{ user: { login: 'carol' } }, { user: { login: 'carol' } }],
    )
    expect(result.status).toBe('commented')
    expect(result.commentCount).toBe(2)
  })

  it('returns pending when there are no reviews and no comments', () => {
    const result = aggregatePRStatus(pr, [], [])
    expect(result.status).toBe('pending')
    expect(result.reviewers).toEqual([])
  })

  it('ignores a DISMISSED review instead of letting it undo an approval', () => {
    // A dismissed review matches neither CHANGES_REQUESTED nor APPROVED: kept as
    // "the latest", it silently dropped an approved PR back to pending.
    const result = aggregatePRStatus(
      pr,
      [
        { user: { login: 'alice' }, state: 'APPROVED' },
        { user: { login: 'alice' }, state: 'DISMISSED' },
      ],
      [],
    )
    expect(result.status).toBe('approved')
    expect(result.reviewers).toEqual(['alice'])
  })

  it('ignores a reviewer whose only review is DISMISSED', () => {
    const result = aggregatePRStatus(pr, [{ user: { login: 'bob' }, state: 'DISMISSED' }], [])
    expect(result.status).toBe('pending')
    expect(result.reviewers).toEqual([])
  })

  it('ignores an unsubmitted PENDING review', () => {
    const result = aggregatePRStatus(
      pr,
      [
        { user: { login: 'alice' }, state: 'CHANGES_REQUESTED' },
        { user: { login: 'alice' }, state: 'PENDING' },
      ],
      [],
    )
    expect(result.status).toBe('changes-requested')
    expect(result.reviewers).toEqual(['alice'])
  })

  it('excludes the PR author’s own review when the author is known', () => {
    const reviews = [{ user: { login: 'xavier' }, state: 'APPROVED' }]
    const result = aggregatePRStatus(pr, reviews, [], 'xavier')
    expect(result.status).toBe('pending')
    expect(result.reviewers).toEqual([])
    // Without the 4th argument the three-argument callers keep their old behaviour.
    expect(aggregatePRStatus(pr, reviews, []).status).toBe('approved')
  })

  it('keeps other reviewers when the author also reviewed', () => {
    const result = aggregatePRStatus(
      pr,
      [
        { user: { login: 'xavier' }, state: 'APPROVED' },
        { user: { login: 'alice' }, state: 'CHANGES_REQUESTED' },
      ],
      [],
      'xavier',
    )
    expect(result.status).toBe('changes-requested')
    expect(result.reviewers).toEqual(['alice'])
  })

  it('propagates merged and closed flags', () => {
    const mergedPR = { state: 'closed', merged: true, updated_at: '2025-01-01T10:00:00Z' }
    const result = aggregatePRStatus(mergedPR, [{ user: { login: 'alice' }, state: 'APPROVED' }], [])
    expect(result.merged).toBe(true)
    expect(result.closed).toBe(true)
  })
})
