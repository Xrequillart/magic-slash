import { describe, it, expect } from 'vitest'
import { reviewNotificationEvent } from './review-notification'

const T0 = Date.parse('2026-09-24T09:00:00Z')
const T1 = Date.parse('2026-09-24T10:00:00Z')

describe('reviewNotificationEvent', () => {
  it('announces nothing on the first read of a PR, whatever GitHub reports', () => {
    expect(reviewNotificationEvent({}, {
      status: 'approved',
      latestFeedback: { at: T1, author: 'alice' },
    })).toBeNull()
  })

  it('announces a verdict change against the persisted status', () => {
    // The restart case: nothing in memory, but the row remembers `pending`.
    expect(reviewNotificationEvent(
      { prReviewStatus: 'pending', prLastFeedbackAt: 0 },
      { status: 'changes-requested', latestFeedback: { at: T1, author: 'alice' } },
    )).toEqual({ kind: 'status', status: 'changes-requested' })
  })

  it('announces a new comment when the verdict stays `commented`', () => {
    expect(reviewNotificationEvent(
      { prReviewStatus: 'commented', prLastFeedbackAt: T0 },
      { status: 'commented', latestFeedback: { at: T1, author: 'bob' } },
    )).toEqual({ kind: 'feedback', author: 'bob', at: T1 })
  })

  it('announces a new review round on a PR already in changes-requested', () => {
    expect(reviewNotificationEvent(
      { prReviewStatus: 'changes-requested', prLastFeedbackAt: T0 },
      { status: 'changes-requested', latestFeedback: { at: T1, author: 'alice' } },
    )).toEqual({ kind: 'feedback', author: 'alice', at: T1 })
  })

  it('announces the very first feedback on a PR that had none', () => {
    // 0 is "read, and nobody had spoken", distinct from absent.
    expect(reviewNotificationEvent(
      { prReviewStatus: 'commented', prLastFeedbackAt: 0 },
      { status: 'commented', latestFeedback: { at: T1, author: 'bob' } },
    )).toEqual({ kind: 'feedback', author: 'bob', at: T1 })
  })

  it('stays silent when the feedback is the one already recorded', () => {
    expect(reviewNotificationEvent(
      { prReviewStatus: 'commented', prLastFeedbackAt: T1 },
      { status: 'commented', latestFeedback: { at: T1, author: 'bob' } },
    )).toBeNull()
  })

  it('takes no feedback baseline from a row written by an older version', () => {
    // Upgrading must not announce every comment already on every open PR.
    expect(reviewNotificationEvent(
      { prReviewStatus: 'commented' },
      { status: 'commented', latestFeedback: { at: T1, author: 'bob' } },
    )).toBeNull()
  })
})
