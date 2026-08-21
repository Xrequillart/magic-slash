import * as fs from 'fs'
import * as path from 'path'

/**
 * What may be read as a `/magic:plan` spec, and how.
 *
 * WHY THIS IS ITS OWN MODULE
 * ---------------------------------------------------------------------------
 * Two independent code paths open a spec file: `plan-sync.ts` when a ping fires, and
 * `outbox.ts` when a queued upload is replayed. They cannot share the check through
 * either of themselves — `plan-sync` already imports `outbox`, so the reverse import
 * would be a cycle. So the guard lives here, importing nothing but `fs` and `path`,
 * and both callers use it. A guard that only one of two read paths applies is not a
 * guard.
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
 * the spec stops syncing rather than uploading a truncated half, which would read as
 * complete to anyone opening the page.
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
 * The spec markdown, or undefined when there is nothing this module will hand over.
 *
 * Undefined covers every refusal, and the caller treats them alike: the file is not
 * there (yet, or any more), it is too big, or it is not really a spec. Never throws —
 * this runs behind a hook ping and behind a queue replay, and neither has anywhere to
 * put an exception.
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
 */
export function readSpecFile(specPath: string): string | undefined {
  if (!isSpecPath(specPath)) return undefined
  try {
    // Resolve BEFORE any stat or read, and re-validate what came back: every
    // filesystem call below is made against the real path, never the supplied one.
    const real = fs.realpathSync(specPath)
    if (!isSpecPath(real)) return undefined
    // stat before read: the point of the ceiling is to not pull the bytes in at all.
    if (fs.statSync(real).size > MAX_SPEC_BYTES) return undefined
    return fs.readFileSync(real, 'utf-8')
  } catch {
    return undefined
  }
}
