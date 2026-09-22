import * as fs from 'fs'
import type { PlanSpecFileSkip, PlanSpecUpdate, PlanSpecUpdateResult } from '../../types'
import { readAgents } from '../config/agents'
import { loadSession } from '../cloud/session-store'
import { readPlanSessionForEdit, updatePlanSpec } from '../cloud/plans'
import { ideaFrom, specKeyFor } from './plan-sync'
import { checkSpecReplaceable, MAX_SPEC_BYTES, writeSpecFile, type SpecReplaceGuard, type SpecWriteSkip } from './spec-file'

/**
 * Saving a spec edited in the app — the cloud row first, then this machine's file.
 *
 * THE CLOUD FIRST, ALWAYS. The row is the copy every reader shares, and the only one a
 * colleague's edit can reach: their `.magic/spec-*.md` is on their disk. So the edit is
 * the row, and the author's file following it is a courtesy to the author, attempted only
 * once the row has taken the write. The reverse order would leave a rewritten file behind
 * a save the database refused, and the next upload would push it anyway.
 *
 * EVERYTHING THE RENDERER DOES NOT GET TO SAY is read here, off the row: whose plan this
 * is, and which spec file it came from. The renderer sends an id, a spec and the
 * `updated_at` it opened the editor on — nothing that could point this at a file.
 *
 * THE FILE IS REWRITTEN ONLY WHEN IT HOLDS NOTHING THE CLOUD LACKS. See
 * `SpecReplaceGuard`: a spec the agent is still writing, or one written offline, is local
 * work, and an edit in the app must not destroy it. The cloud save stands either way;
 * the page is told the file did not follow.
 *
 * WHY `spec_synced_at` IS STAMPED ONLY WHEN THE FILE WILL FOLLOW. The stamp and the
 * file's mtime are what `reconcilePlanSpecs` compares at every launch. Stamping it on a
 * save whose file did NOT follow would make a diverged file look older than the row, and
 * the local work the guard just protected would never be uploaded. Not stamping it on a
 * save whose file did follow would make the rewritten file look newer, and the next launch
 * would re-upload it — over whatever a colleague saved in between.
 */

/** How the file's mtime is set against the stamp. See `stampFile`. */
const MTIME_BEFORE_STAMP_MS = 1

/**
 * The spec file on THIS machine that a session was uploaded from, if any.
 *
 * Found through the agents rather than kept anywhere: `spec_key` is a one-way hash of the
 * path (the row is org-readable and the path carries a home directory), so the only way
 * back to a path is to hash the ones this machine knows and compare. An archived agent, a
 * plan made on another laptop, a worktree since cleaned: no match, and the cloud copy is
 * the edit.
 */
function localSpecPathFor(specKey: string): string | undefined {
  for (const agent of readAgents()) {
    const specPath = agent.metadata?.specPath
    if (specPath && specKeyFor(specPath) === specKey) return specPath
  }
  return undefined
}

/**
 * The file's mtime set to just BEFORE the stamp the row now carries.
 *
 * `reconcilePlanSpecs` skips a spec when `Date.parse(spec_synced_at) >= mtimeMs`. Setting
 * the mtime to the stamp itself would be the intent, but it goes through a float of
 * seconds on the way to the filesystem and can come back a fraction of a millisecond
 * AFTER it — enough to re-upload the file at the next launch. One millisecond earlier is
 * unambiguous, and still later than any real edit made before the save.
 *
 * Best effort: a file whose mtime could not be set is uploaded once more at the next
 * launch, with the content the row already holds.
 */
function stampFile(realPath: string, syncedAt: string): void {
  const at = new Date(Date.parse(syncedAt) - MTIME_BEFORE_STAMP_MS)
  try {
    fs.utimesSync(realPath, at, at)
  } catch {
    // See above: the cost is one redundant upload.
  }
}

/** A refusal of the file, as the page's vocabulary. `missing` and `not_spec` read alike. */
function skipReason(reason: SpecWriteSkip): PlanSpecFileSkip {
  if (reason === 'diverged') return 'diverged'
  if (reason === 'error') return 'error'
  return 'no_file'
}

export async function saveEditedPlanSpec(input: PlanSpecUpdate): Promise<PlanSpecUpdateResult> {
  // The uploader's ceiling, applied on the way in as well: a spec the author's app would
  // refuse to upload from the file must not arrive through the editor instead.
  if (Buffer.byteLength(input.spec, 'utf-8') > MAX_SPEC_BYTES) return { status: 'failed' }

  const read = await readPlanSessionForEdit(input.id)
  if (read.failed) return { status: 'failed' }
  if (!read.session) return { status: 'denied' }
  const session = read.session

  // Settled before any write when the answer is already known. The UPDATE's own filter
  // would reach the same verdict; this spares it, and it is the same comparison — two
  // raw strings from the same serializer.
  if (session.updatedAt !== input.expectedUpdatedAt) return { status: 'conflict' }

  const isOwner = session.ownerId === loadSession()?.user?.id
  const specPath = isOwner ? localSpecPathFor(session.specKey) : undefined

  // The file's half is decided BEFORE the cloud write, because it decides the stamp. The
  // spec the editor was opened on is the row's as just read: same `updated_at`, same
  // content — and a row that moved since will fail the UPDATE's filter anyway.
  const syncedAtMs = session.specSyncedAt ? Date.parse(session.specSyncedAt) : NaN
  const guard: SpecReplaceGuard = {
    expectedContent: session.spec ?? '',
    unchangedSince: Number.isFinite(syncedAtMs) ? syncedAtMs : undefined,
  }
  const precheck = specPath ? checkSpecReplaceable(specPath, guard) : undefined
  const syncedAt = precheck?.ok ? new Date().toISOString() : undefined

  const saved = await updatePlanSpec({
    id: input.id,
    spec: input.spec,
    idea: ideaFrom(input.spec),
    expectedUpdatedAt: input.expectedUpdatedAt,
    syncedAt,
  })
  if (saved.status !== 'saved') return saved

  const done = { status: 'saved' as const, updatedAt: saved.updatedAt }
  if (!isOwner) return { ...done, fileWritten: false, fileSkipReason: 'not_owner' }
  if (!specPath || !precheck) return { ...done, fileWritten: false, fileSkipReason: 'no_file' }
  if (!precheck.ok) return { ...done, fileWritten: false, fileSkipReason: skipReason(precheck.reason) }

  const written = writeSpecFile(specPath, input.spec, guard)
  if (!written.written) return { ...done, fileWritten: false, fileSkipReason: skipReason(written.reason) }
  // `syncedAt` is set whenever the precheck passed, which it did to get here.
  if (syncedAt) stampFile(written.path, syncedAt)
  return { ...done, fileWritten: true }
}
