import type { AggregatedReviewStatus, PRStatusSnapshot, RepositoryMetadata } from '../../types'

/**
 * What a watcher read has to announce about a PR's reviews, if anything.
 *
 * - `status`: the verdict moved (approved, changes requested, …). Named first
 *   because it is the stronger news, and it usually arrives WITH new feedback.
 * - `feedback`: somebody other than the author reviewed or commented again,
 *   while the verdict stayed put — the second comment on a `commented` PR, a new
 *   round on a `changes-requested` one. The verdict alone never saw these, which
 *   is why the watcher used to stay silent through most of a review.
 *
 * Both are measured against what is PERSISTED in the agent's repositoryMetadata,
 * not against the watcher's in-memory map. That map is empty after every launch,
 * so a review that landed overnight was taken as the starting point and never
 * announced. The persisted record survives the restart, and a field it does not
 * carry yet (a PR never read, a row from an older version) means "no baseline",
 * which announces nothing: the app never looked, so nothing is known to have
 * changed.
 *
 * Its own module, importing only types, for the reason `merge-detection.ts`
 * gives: `watcher.ts` reaches `node-pty`, and this is the part worth a unit test.
 */
export type ReviewNotificationEvent =
  | { kind: 'status'; status: AggregatedReviewStatus }
  | { kind: 'feedback'; author: string; at: number }

export function reviewNotificationEvent(
  existing: Pick<RepositoryMetadata, 'prReviewStatus' | 'prLastFeedbackAt'>,
  snapshot: Pick<PRStatusSnapshot, 'status' | 'latestFeedback'>,
): ReviewNotificationEvent | null {
  if (existing.prReviewStatus !== undefined && existing.prReviewStatus !== snapshot.status) {
    return { kind: 'status', status: snapshot.status }
  }
  const latest = snapshot.latestFeedback
  if (existing.prLastFeedbackAt !== undefined && latest && latest.at > existing.prLastFeedbackAt) {
    return { kind: 'feedback', author: latest.author, at: latest.at }
  }
  return null
}
