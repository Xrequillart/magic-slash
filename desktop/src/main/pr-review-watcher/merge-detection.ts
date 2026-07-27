import type { RepositoryMetadata } from '../../types'

/**
 * Whether a watcher tick should append a `merged` activity event.
 *
 * Lives in its own module, importing nothing but a type, for two reasons. It is
 * the one piece of the watcher worth unit-testing — a silent double-count or a
 * dropped merge would both corrupt every flow metric downstream — and `watcher.ts`
 * pulls in `terminal-manager`, hence `node-pty`, a native module absent wherever
 * only the root dependencies are installed. Keeping the decision here means the
 * test needs no Electron and no native build.
 *
 * The two guards defend against different failures:
 *
 * - `existing.prMerged` is the DURABLE marker. It is persisted in the terminal's
 *   repositoryMetadata alongside the emission, so it survives an app restart —
 *   which the watcher's in-memory map does not.
 * - `previous.merged` covers repeat ticks inside a single run.
 *
 * Callers must NOT gate this on a review-status transition: a PR that is approved
 * and then merged keeps `status === 'approved'`, so a status-change guard would
 * drop the merge event entirely.
 */
export function shouldEmitMerged(
  previous: { merged: boolean } | undefined,
  snapshot: { merged: boolean },
  existing: Pick<RepositoryMetadata, 'prMerged'>,
): boolean {
  if (!snapshot.merged) return false
  if (existing.prMerged === true) return false
  if (previous?.merged === true) return false
  return true
}
