import * as fs from 'fs'
import * as path from 'path'
import type { PlanSpecInput } from '../../types'

/**
 * What may be read as a `/magic:plan` spec, and how.
 *
 * WHY THIS IS ITS OWN MODULE
 * ---------------------------------------------------------------------------
 * Two independent code paths open a spec file: `plan-sync.ts` when a ping fires, and
 * `outbox.ts` when a queued upload is replayed. They cannot share the check through
 * either of themselves — `plan-sync` already imports `outbox`, so the reverse import
 * would be a cycle. So the guard lives here, importing nothing at run time but `fs` and
 * `path` — the one other import is a type, erased before anything runs — and both callers
 * use it. A guard that only one of two read paths applies is not a guard.
 *
 * WHAT IT DEFENDS AGAINST
 * ---------------------------------------------------------------------------
 * `specPath` arrives over `GET /metadata?specPath=`, on a loopback server whose port
 * sits in a world-readable file, and whatever it names is read and uploaded into a
 * table the whole organization can select from. So the path is not trusted: it must
 * look like a spec this app wrote, AND it must still look like one after every symlink
 * in it has been resolved.
 */

/**
 * The largest spec that may be uploaded.
 *
 * A spec is a few tens of KB of markdown — that is the sizing the `text` column was
 * chosen on. The ceiling is not meant to be reached; it is there so that whatever ends
 * up behind `specPath` cannot be streamed into an org-readable row wholesale. Past it
 * the CONTENT stops syncing rather than uploading a truncated half, which would read as
 * complete to anyone opening the page.
 *
 * The SESSION still syncs, and carries `spec_oversize` so the page can say which of the
 * two silences this is. The ceiling being invisible was its own bug: a plan whose spec
 * was refused here opened on a blank panel worded as "not uploaded yet", which is a
 * promise that it is on its way.
 */
export const MAX_SPEC_BYTES = 1024 * 1024

/**
 * Whether a path is *shaped* like a spec this app wrote — a lexical test, no I/O.
 *
 * The skill's own naming (`references/spec-template.md`) is the whitelist: an absolute
 * path, inside a `.magic` directory, named `spec-*.md`.
 *
 * Lexical on purpose: this is the only check that can run before the file exists, and
 * it has to, because a session is recorded from the agent's first metadata write —
 * minutes before the spec is created. It is NOT sufficient on its own: see
 * `readSpecFile`, which re-applies it to the real path before reading a byte.
 */
export function isSpecPath(specPath: string): boolean {
  if (!path.isAbsolute(specPath)) return false
  const normalized = path.normalize(specPath)
  if (path.basename(path.dirname(normalized)) !== '.magic') return false
  const name = path.basename(normalized)
  return name.startsWith('spec-') && name.endsWith('.md') && name.length > 'spec-.md'.length
}

/**
 * What came of trying to read a spec, with the two refusals told apart.
 *
 * `oversize` EXISTS BECAUSE IT IS THE ONE REFUSAL A READER CAN BE TOLD ABOUT. A spec
 * that is not there yet is an ordinary early state of every session — the row is created
 * at the first metadata write, minutes before the file — and "not uploaded yet" is
 * already what an empty spec means. A spec past `MAX_SPEC_BYTES` is different: the
 * session is finished, the file is on the author's disk, and nothing will ever make it
 * arrive. Collapsing that into the same `undefined` is what made a colleague's plan open
 * on a blank page with no explanation for it.
 *
 * `missing` therefore covers every OTHER refusal — gone, never written, not a spec at
 * all, unreadable — because none of them is a thing the page can say more about than
 * "there is no spec here".
 */
export type SpecRead =
  | { kind: 'ok'; content: string }
  | { kind: 'oversize' }
  | { kind: 'missing' }

/**
 * The spec markdown, or WHY there is none.
 *
 * Never throws — this runs behind a hook ping and behind a queue replay, and neither has
 * anywhere to put an exception.
 *
 * THE SYMLINK CASE IS WHY `isSpecPath` ALONE IS NOT ENOUGH.
 * `isSpecPath` reasons about the string. `fs.readFileSync` reasons about the
 * filesystem, and follows links. So `.magic/spec-notes.md` symlinked to `~/.ssh/id_rsa`
 * satisfies every lexical rule while delivering a private key to the reader — which
 * would then be uploaded to a row the user's whole organization can read. Resolving the
 * path first and re-applying the same shape test to the RESULT closes that: a link
 * pointing anywhere but at another `.magic/spec-*.md` no longer looks like a spec once
 * resolved, and is refused. `realpathSync` resolves links in the directory components
 * too, so a symlinked `.magic` or repository directory is handled by the same test.
 *
 * A REFUSED PATH IS `missing`, NEVER `oversize`, whatever its size. The distinction is
 * reported to readers as a fact about a real spec; a symlink to a private key that
 * happens to be 2 MiB must not make the app announce "this plan's spec is too large" —
 * it would be confirming that the file behind a rejected path exists, and how big it is.
 */
export function readSpecFile(specPath: string): SpecRead {
  if (!isSpecPath(specPath)) return { kind: 'missing' }
  try {
    // Resolve BEFORE any stat or read, and re-validate what came back: every
    // filesystem call below is made against the real path, never the supplied one.
    const real = fs.realpathSync(specPath)
    if (!isSpecPath(real)) return { kind: 'missing' }
    // stat before read: the point of the ceiling is to not pull the bytes in at all.
    if (fs.statSync(real).size > MAX_SPEC_BYTES) return { kind: 'oversize' }
    return { kind: 'ok', content: fs.readFileSync(real, 'utf-8') }
  } catch {
    return { kind: 'missing' }
  }
}

/**
 * A read, as the two fields an upsert carries it in.
 *
 * ONE PLACE THAT KNOWS HOW THE UNION BECOMES COLUMNS, because both writers — the
 * debounced upload in `plan-sync.ts` and the queue replay in `outbox.ts` — translate the
 * same three states into the same pair, and two spellings of that rule is how they come
 * to disagree about what an oversize spec sends. Spread into the input at both sites.
 *
 *  * `ok` sends the markdown AND `false`, which is what makes the flag self-correcting:
 *    a spec trimmed back under the ceiling clears it on its next ping.
 *  * `oversize` sends the flag alone. The session is as real as any other; only its
 *    content is withheld, and the flag is what lets a reader be told so.
 *  * `missing` sends NEITHER, which is the omit-rather-than-null rule the whole upsert is
 *    built on: a write with no opinion leaves the stored spec and the stored flag alone.
 */
export function specFields(read: SpecRead): Pick<PlanSpecInput, 'spec' | 'specOversize'> {
  if (read.kind === 'ok') return { spec: read.content, specOversize: false }
  if (read.kind === 'oversize') return { specOversize: true }
  return {}
}

/**
 * When an existing spec file may be REPLACED by an edit made in the app.
 *
 * The file is the author's working copy and it can hold work the cloud has never seen —
 * a section the agent wrote a second ago whose debounced upload has not fired yet, or a
 * whole afternoon written offline. Overwriting that with the cloud copy plus an edit
 * would destroy it silently. So a replacement is allowed only when the file provably holds
 * nothing the cloud lacks, which one of two facts establishes:
 *
 *  * `expectedContent` — the file holds, byte for byte, the spec the editor was opened
 *    on. The ordinary case: the author's own last upload, edited in the app.
 *  * `unchangedSince` — the file has not been modified since this instant (epoch ms), the
 *    row's `spec_synced_at`. The file is then the last thing uploaded, even if the cloud
 *    has moved on since (a colleague's edit), so it holds no local work either. The same
 *    comparison `reconcilePlanSpecs` uses to decide there is nothing to upload.
 */
export interface SpecReplaceGuard {
  expectedContent: string
  unchangedSince?: number
}

/**
 * Why an existing spec file was NOT rewritten.
 *
 *  * `missing`  — not there. An edit never CREATES a spec file: a path this machine has
 *                 no file at is another machine's plan, or a cleaned worktree, and a file
 *                 conjured into it would be a spec nobody's agent is writing.
 *  * `not_spec` — the path, or what it resolves to, is not shaped like a spec.
 *  * `diverged` — the file holds local work the cloud has not seen. See the guard.
 *  * `error`    — the filesystem refused.
 */
export type SpecWriteSkip = 'missing' | 'not_spec' | 'diverged' | 'error'

export type SpecWrite =
  | { written: true; path: string }
  | { written: false; reason: SpecWriteSkip }

/**
 * Whether `specPath` may be replaced right now, and the REAL path to replace if so.
 *
 * `readSpecFile`'s discipline, for the write direction: the lexical test, then the
 * symlinks resolved and the test applied again to the result, and every filesystem call
 * after that made against the real path. A symlink from `.magic/spec-x.md` to
 * `~/.zshrc` would otherwise let an edit in the app — possibly a COLLEAGUE'S edit, since
 * this runs for the author's own plan whoever last wrote the cloud copy — rewrite a file
 * that is not a spec at all.
 *
 * Exported separately from the write because the caller needs the answer BEFORE saving to
 * the cloud: whether the file will follow decides whether the cloud write may stamp
 * `spec_synced_at`. See `main/store/plan-edit.ts`.
 *
 * Never throws.
 */
export function checkSpecReplaceable(
  specPath: string,
  guard: SpecReplaceGuard,
): { ok: true; real: string } | { ok: false; reason: SpecWriteSkip } {
  if (!isSpecPath(specPath)) return { ok: false, reason: 'not_spec' }
  let real: string
  try {
    real = fs.realpathSync(specPath)
  } catch {
    // ENOENT is the ordinary answer; anything else that stops a realpath is also a file
    // this edit cannot reach, and "not here" is all the caller can do anything with.
    return { ok: false, reason: 'missing' }
  }
  if (!isSpecPath(real)) return { ok: false, reason: 'not_spec' }
  try {
    const stat = fs.statSync(real)
    if (!stat.isFile()) return { ok: false, reason: 'not_spec' }
    if (guard.unchangedSince !== undefined && stat.mtimeMs <= guard.unchangedSince) {
      return { ok: true, real }
    }
    // The size first, for `readSpecFile`'s reason: a file past the ceiling cannot equal
    // any spec the cloud holds, and there is no point pulling its bytes in to learn it.
    if (stat.size > MAX_SPEC_BYTES) return { ok: false, reason: 'diverged' }
    const current = fs.readFileSync(real, 'utf-8')
    return current === guard.expectedContent ? { ok: true, real } : { ok: false, reason: 'diverged' }
  } catch {
    return { ok: false, reason: 'error' }
  }
}

/**
 * Replace an EXISTING spec file with `content`, if the guard allows it.
 *
 * The guard is re-checked here even when the caller has just run `checkSpecReplaceable`:
 * the cloud round trip sits between the two, and an agent writing the spec in the
 * meantime is exactly the local work the check exists to protect. The window left is the
 * few microseconds between this read and this write, which nothing here can close without
 * a lock the agent does not take.
 *
 * Never throws — the save it follows has already succeeded, and a failure here must come
 * back as a reason the page can print rather than as a rejected IPC call that would make
 * a saved edit look lost.
 */
export function writeSpecFile(specPath: string, content: string, guard: SpecReplaceGuard): SpecWrite {
  const check = checkSpecReplaceable(specPath, guard)
  if (!check.ok) return { written: false, reason: check.reason }
  // Written to a sibling, then RENAMED over the spec: a rename within one directory is
  // atomic, so the spec is either the old text or the new one, never a truncated half.
  // A half-written spec is the worst outcome here: its mtime is newer than the row's
  // `spec_synced_at`, so the next reconcile would upload the damage over the cloud copy
  // this save just wrote. The temp name is dot-prefixed so `isSpecPath` never matches it.
  const tmp = path.join(path.dirname(check.real), `.${path.basename(check.real)}.${process.pid}.tmp`)
  try {
    fs.writeFileSync(tmp, content, { encoding: 'utf-8', mode: fs.statSync(check.real).mode })
    fs.renameSync(tmp, check.real)
    return { written: true, path: check.real }
  } catch {
    try { fs.rmSync(tmp, { force: true }) } catch { /* nothing left to clean */ }
    return { written: false, reason: 'error' }
  }
}
