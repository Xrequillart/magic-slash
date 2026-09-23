import type { PlanHistoryRead, PlanLinkEvent, PlanRevision } from '../../types'

/**
 * The plan history's two lists as ONE timeline, and which two revisions a selection
 * compares. Pure, so the page stays a drawing and this stays testable.
 */

export type PlanTimelineEntry =
  | { kind: 'revision'; id: string; at: number; revision: PlanRevision }
  | { kind: 'link'; id: string; at: number; event: PlanLinkEvent }

/** A date the timeline can sort by. An unparseable one sinks to the bottom rather than throwing. */
function when(value: string): number {
  const at = Date.parse(value)
  return Number.isFinite(at) ? at : 0
}

/**
 * Revisions and link events interleaved, NEWEST FIRST.
 *
 * A revision is dated by its `updatedAt` — its latest save, since a revision written before
 * 20260923140000 may fold several — and an event by when it happened. On a tie the revision comes
 * first: a spec save and a link pinned in the same instant are rare, and a stable order
 * is what keeps the rows from swapping places between two reads.
 */
export function buildPlanTimeline(read: Pick<PlanHistoryRead, 'revisions' | 'linkEvents'>): PlanTimelineEntry[] {
  const entries: PlanTimelineEntry[] = [
    ...read.revisions.map((revision) => ({ kind: 'revision' as const, id: revision.id, at: when(revision.updatedAt), revision })),
    ...read.linkEvents.map((event) => ({ kind: 'link' as const, id: event.id, at: when(event.createdAt), event })),
  ]
  return entries.sort((a, b) => b.at - a.at || (a.kind === b.kind ? 0 : a.kind === 'revision' ? -1 : 1))
}

/**
 * The two revisions the selected one is compared across, older first — or null when nothing
 * is selected. ONE revision at a time: the selected one against the one before it — "what
 * did this change?" — or against what the plan held before its history began
 * (`from: null`) when it is the first revision there is.
 *
 * When it is the oldest shown and `olderRevisions` says the read stopped short, the one
 * before it exists but was not read, so `olderHidden` is set and there is nothing to diff.
 * Comparing it with nothing would show it as the plan's first text.
 *
 * `revisions` is the list as read, newest first. An id no longer in it (the history was
 * re-read and pruned) is ignored rather than asked for.
 */
export function revisionPair(
  revisions: readonly PlanRevision[],
  selected: string | null,
  olderRevisions = false,
): { from: string | null; to: string; olderHidden?: boolean } | null {
  const index = selected ? revisions.findIndex((revision) => revision.id === selected) : -1
  if (index < 0) return null
  const previous = revisions[index + 1]
  if (!previous && olderRevisions) return { from: null, to: revisions[index].id, olderHidden: true }
  return { from: previous?.id ?? null, to: revisions[index].id }
}

/**
 * The selection after a click: a click on the selected revision drops it, a click on
 * another replaces it. One revision is selected at a time.
 */
export function toggleRevision(selected: string | null, id: string): string | null {
  return selected === id ? null : id
}
