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
 * The two revisions a selection compares, older first — or null when nothing is selected.
 *
 *  * TWO selected: those two, in the order they happened, whichever was clicked first.
 *  * ONE selected: that revision against the one before it — "what did this change?" — or
 *    against nothing (`from: null`) when it is the first revision there is.
 *  * ONE selected, the oldest shown, while `olderRevisions` says the read stopped short:
 *    the one before it exists but was not read, so `olderHidden` is set and there is
 *    nothing to diff. Comparing it with nothing would show it as the plan's first text.
 *
 * `revisions` is the list as read, newest first. An id no longer in it (the history was
 * re-read and pruned) is ignored rather than asked for.
 */
export function revisionPair(
  revisions: readonly PlanRevision[],
  selected: readonly string[],
  olderRevisions = false,
): { from: string | null; to: string; olderHidden?: boolean } | null {
  const indexes = selected
    .map((id) => revisions.findIndex((revision) => revision.id === id))
    .filter((index) => index >= 0)
    .sort((a, b) => a - b)
  if (indexes.length === 0) return null
  if (indexes.length >= 2) {
    // Newest first: the smaller index is the newer revision.
    return { from: revisions[indexes[indexes.length - 1]].id, to: revisions[indexes[0]].id }
  }
  const previous = revisions[indexes[0] + 1]
  if (!previous && olderRevisions) return { from: null, to: revisions[indexes[0]].id, olderHidden: true }
  return { from: previous?.id ?? null, to: revisions[indexes[0]].id }
}

/**
 * The selection after a click: a click on a selected revision drops it; on another, adds it,
 * dropping the OLDEST pick when two are already held — the comparison follows the reader's
 * last two clicks.
 */
export function toggleRevision(selected: readonly string[], id: string): string[] {
  if (selected.includes(id)) return selected.filter((picked) => picked !== id)
  return [...selected.slice(-1), id]
}
