import type { AggregatedReviewStatus } from '../../types'
import type { MessageKey, Translate } from '../../i18n'

// ---------------------------------------------------------------------------
// The words a PR-review notification says.
//
// Split out of the watcher because two producers must say the same thing about
// the same event: PRReviewWatcher (polling GitHub for the agents on this machine)
// and the re-engagement listener (realtime, for the signed-in user's own PRs).
// They used to word it differently, and the watcher's version was a URL and a
// raw enum — `https://github.com/o/r/pull/204: changes-requested` — which is
// neither a sentence nor translated.
//
// Pure on purpose: no electron, no config, no network. It takes a bound `t` and
// plain data, so it is exercised from a node test, and so neither producer has to
// know which catalogue key belongs to which review status.
// ---------------------------------------------------------------------------

/** What the notification is about. Everything is optional but `status`. */
export interface PRReviewNotificationInput {
  status: AggregatedReviewStatus
  /**
   * Logins with a meaningful latest review, as aggregated by `aggregatePRStatus`.
   * A reviewer is NAMED only when there is exactly one: with several, the array
   * says who reviewed but not whose review decided `status`, so "approved by
   * alice" could credit the person who merely commented.
   */
  reviewers?: string[]
  /**
   * How the human names this work: the ticket id when there is one, otherwise the
   * agent's title. Never a URL, never a repository path.
   */
  label?: string
  /** PR number, from `parsePRUrl`. Absent when the URL could not be parsed. */
  prNumber?: number
}

interface StatusMessages {
  title: MessageKey
  /** Used when no single reviewer can be credited. Always defined. */
  body: MessageKey
  /** Used when exactly one reviewer is known. Absent where naming one makes no sense. */
  bodyNamed?: MessageKey
}

const MESSAGES: Record<AggregatedReviewStatus, StatusMessages> = {
  approved: {
    title: 'notification.prReview.approved.title',
    body: 'notification.prReview.approved.body',
    bodyNamed: 'notification.prReview.approved.bodyNamed',
  },
  'changes-requested': {
    title: 'notification.prReview.changesRequested.title',
    body: 'notification.prReview.changesRequested.body',
    bodyNamed: 'notification.prReview.changesRequested.bodyNamed',
  },
  commented: {
    title: 'notification.prReview.commented.title',
    body: 'notification.prReview.commented.body',
    bodyNamed: 'notification.prReview.commented.bodyNamed',
  },
  // No named form: `pending` is the absence of a review, so there is nobody to
  // credit even when GitHub lists requested reviewers.
  pending: {
    title: 'notification.prReview.pending.title',
    body: 'notification.prReview.pending.body',
  },
}

/**
 * The phrase that stands in for the pull request in a sentence — "MAGIC-202
 * (PR #204)". Falls back through what is actually known, and ends on a generic
 * phrase rather than an empty string: a body reading "  was approved" is worse
 * than one reading "your pull request was approved".
 */
export function prReviewSubject(t: Translate, label?: string, prNumber?: number): string {
  const trimmed = label?.trim()
  if (trimmed && prNumber) return t('notification.prReview.subject.withPr', { label: trimmed, number: prNumber })
  if (trimmed) return trimmed
  if (prNumber) return t('notification.prReview.subject.prOnly', { number: prNumber })
  return t('notification.prReview.subject.unknown')
}

/** Title and body for one review-status change, in the language `t` is bound to. */
export function prReviewNotification(
  t: Translate,
  { status, reviewers, label, prNumber }: PRReviewNotificationInput,
): { title: string; body: string } {
  const messages = MESSAGES[status] ?? MESSAGES.pending
  const subject = prReviewSubject(t, label, prNumber)
  const reviewer = reviewers?.length === 1 ? reviewers[0] : undefined
  const body = reviewer && messages.bodyNamed
    ? t(messages.bodyNamed, { subject, reviewer })
    : t(messages.body, { subject })
  return { title: t(messages.title), body }
}
