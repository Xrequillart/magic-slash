import * as fs from 'fs'
import * as path from 'path'
import { randomUUID } from 'crypto'
import { CONFIG_DIR } from '../config/paths'
import type { HistoryEntry, SkillInvocationInput, SkillRunEndInput, UsageEventInput } from '../../types'
import { loadSession } from '../cloud/session-store'
import { readSpecFile } from './spec-file'
import { getStore } from './Store'

/**
 * A durable retry queue for the three append-only event tables.
 *
 * WHY THIS EXISTS
 * ---------------------------------------------------------------------------
 * activity_events, usage_events and skill_invocations were written fire-and-forget:
 * a failed insert was logged to the console and lost for good. Every one of the
 * ordinary reasons a desktop app cannot reach its backend — a closed laptop lid, a
 * train tunnel, a captive-portal wifi, a token refreshed a second too late — silently
 * deleted a row that a team later read as "nobody used the product that day". The
 * numbers were not noisy, they were biased: loss correlates with being offline, and
 * being offline correlates with working.
 *
 * There is no local mirror of these tables to reconcile against (Store.ts: the DB is
 * the single source of truth), so the queue holds the events themselves, on disk, and
 * replays them when a write succeeds again.
 *
 * IDEMPOTENCE IS THE WHOLE DESIGN
 * ---------------------------------------------------------------------------
 * A retry queue trades lost rows for duplicated ones unless replays are idempotent:
 * an insert whose COMMIT succeeded but whose response never came back looks exactly
 * like a failure from here. So every event carries a `clientEventId` minted ONCE at
 * emission (newClientEventId, called by the three writer modules), which is a unique
 * column on all three tables — the replay collides with the row it already wrote and
 * does nothing. Minting the id inside the store instead would defeat this: the retry
 * would carry a different one and insert a second row.
 *
 * STILL NOT A GENERAL-PURPOSE QUEUE
 * ---------------------------------------------------------------------------
 * It was telemetry only until `planSpec` joined it (#194), and the difference is
 * worth being explicit about, because it is the difference that decides what may be
 * queued here at all. A telemetry entry carries the WHOLE event; a `planSpec` entry
 * carries only the PATH of a spec file, which is re-read at replay. Two reasons, both
 * hard constraints rather than preferences:
 *
 *  - MAX_FILE_BYTES is a corruption guard that deletes the entire file, telemetry
 *    included (see readEntries). Entries of tens of kilobytes would reach it, so
 *    nothing whose size is user-controlled may be stored inline.
 *  - re-reading at replay IS the semantics a spec wants — the file as it stands when
 *    the upload finally happens, not as it stood when the network dropped.
 *
 * That also makes `planSpec` the first entry kind with an OWNER, hence the uid guard
 * in flushOutbox: a queue drains under whatever session happens to be open, which is
 * harmless for a row scoped by user_id and wrong for a document.
 *
 * Whatever the kind, this must never block, never throw into a caller, and never grow
 * without bound — an unreadable or oversized file is truncated rather than repaired,
 * because losing a queued entry is always preferable to breaking the app that
 * produced it.
 */

// Per-instance (CONFIG_DIR): two apps draining one queue replay each other's events.
const OUTBOX_FILE = path.join(CONFIG_DIR, 'outbox.ndjson')

/**
 * How many events the queue keeps. At roughly 200 bytes an entry this caps the file
 * near 1 MB — enough to cover days of offline work, small enough to read into memory
 * and rewrite in one go.
 */
const MAX_ENTRIES = 5000

/**
 * Compaction slack. Trimming to MAX_ENTRIES on the very first append past the cap
 * would rewrite the whole file on every subsequent append; letting it overshoot by
 * 10% makes the rewrite amortised instead.
 */
const COMPACT_AT = Math.floor(MAX_ENTRIES * 1.1)

/** Refuse to parse a file larger than this — it is corrupt, not a backlog. */
const MAX_FILE_BYTES = 8 * 1024 * 1024

/** The event kinds the queue can replay, each mapping to one Store method. */
export type OutboxKind = 'history' | 'usage' | 'skill' | 'skillEnd' | 'planSpec'

/**
 * A `/magic:plan` spec upload that could not be made. The PATH, not the markdown —
 * see the header — plus the account it belongs to, since this is the one entry kind
 * that must not be replayed under another user's session.
 */
interface PlanSpecEntry {
  specPath: string
  /** app agent id ("claude-…"). May no longer resolve by the time this replays. */
  agentId: string
  /** The owner at the time of the failed write; '' when no session was loaded. */
  uid: string
}

type OutboxEntry =
  | { kind: 'history'; payload: HistoryEntry }
  | { kind: 'usage'; payload: UsageEventInput }
  | { kind: 'skill'; payload: SkillInvocationInput }
  /**
   * Closing a run needs no idempotence key: the RPC only ever matches a run that is
   * still open, so a second delivery finds nothing and changes nothing. The payload
   * carries the moment the skill FINISHED, so time spent in this queue does not end
   * up counted as time spent running.
   */
  | { kind: 'skillEnd'; payload: SkillRunEndInput }
  /**
   * No idempotence key either, and none is possible: the row is keyed on the spec
   * path, so a replay is an upsert onto the same row — a second delivery rewrites
   * what the first one wrote, which is the last-write-wins this whole path is built
   * on rather than a duplicate.
   */
  | { kind: 'planSpec'; payload: PlanSpecEntry }

/**
 * Mint the idempotence key for one event, at the moment it happens.
 *
 * Called by the writer modules and carried through both the first attempt and every
 * replay, so the two are the same row to the database. See the header.
 */
export function newClientEventId(): string {
  return randomUUID()
}

/**
 * Events dropped because the queue was full, since the app started. Surfaced by the
 * telemetry health check: a backlog that overflows is the one loss this design still
 * has, and it should be visible rather than inferred from a gap in the charts.
 */
let droppedSinceStart = 0

/** In-memory line count, so an append does not have to read the file to know the size. */
let cachedCount: number | null = null

function readEntries(): OutboxEntry[] {
  try {
    if (!fs.existsSync(OUTBOX_FILE)) return []
    if (fs.statSync(OUTBOX_FILE).size > MAX_FILE_BYTES) {
      // Not recoverable by parsing: something else wrote here, or a partial write
      // ran away. Start clean rather than spend memory proving it is garbage.
      fs.rmSync(OUTBOX_FILE, { force: true })
      return []
    }
    return fs
      .readFileSync(OUTBOX_FILE, 'utf-8')
      .split('\n')
      .filter((line) => line.trim() !== '')
      .flatMap((line) => {
        // One torn line (a crash mid-append) must not discard the rest of the file.
        try {
          return [JSON.parse(line) as OutboxEntry]
        } catch {
          return []
        }
      })
  } catch (error) {
    console.error('[outbox] Unreadable queue, starting empty:', error)
    return []
  }
}

/** Replace the file contents atomically, so a crash mid-write cannot truncate it. */
function writeEntries(entries: OutboxEntry[]): void {
  try {
    fs.mkdirSync(path.dirname(OUTBOX_FILE), { recursive: true })
    const tmp = `${OUTBOX_FILE}.tmp`
    const body = entries.map((e) => JSON.stringify(e)).join('\n')
    fs.writeFileSync(tmp, body === '' ? '' : `${body}\n`, { encoding: 'utf-8', mode: 0o600 })
    fs.renameSync(tmp, OUTBOX_FILE)
    cachedCount = entries.length
  } catch (error) {
    console.error('[outbox] Failed to rewrite the queue:', error)
    cachedCount = null
  }
}

/** Drop the OLDEST entries past the cap: recent activity is the more useful signal. */
function compactIfNeeded(): void {
  if ((cachedCount ?? 0) < COMPACT_AT) return
  const entries = readEntries()
  if (entries.length < COMPACT_AT) {
    cachedCount = entries.length
    return
  }
  const kept = entries.slice(entries.length - MAX_ENTRIES)
  droppedSinceStart += entries.length - kept.length
  console.warn(`[outbox] Queue full, dropped ${entries.length - kept.length} oldest events`)
  writeEntries(kept)
}

/**
 * Queue ONE event that failed to reach the backend. Never throws: the callers are
 * hook-driven handlers whose job is not to be correct about telemetry.
 */
export function enqueue(entry: OutboxEntry): void {
  try {
    fs.mkdirSync(path.dirname(OUTBOX_FILE), { recursive: true })
    fs.appendFileSync(OUTBOX_FILE, `${JSON.stringify(entry)}\n`, { encoding: 'utf-8', mode: 0o600 })
    cachedCount = cachedCount === null ? readEntries().length : cachedCount + 1
    compactIfNeeded()
  } catch (error) {
    console.error('[outbox] Failed to queue an event:', error)
  }
}

/** Send one queued event through the store. Throws so flush can keep it on failure. */
async function replay(entry: OutboxEntry): Promise<void> {
  const store = getStore()
  switch (entry.kind) {
    case 'history':
      return store.appendHistory(entry.payload)
    case 'usage':
      return store.appendUsage(entry.payload)
    case 'skill':
      return store.recordSkillInvocation(entry.payload)
    case 'skillEnd':
      // Discard the boolean: "no matching open run" is a normal answer here, not a
      // reason to keep retrying a close that will never find its run.
      await store.closeSkillRun(entry.payload)
      return
    case 'planSpec': {
      // Through the shared guard, not `fs` directly: this is the SECOND path that
      // opens a spec file, and it is as exposed as the first. `readSpecFile` re-applies
      // the `.magic/spec-*.md` shape test to the REAL path, so a queued entry whose
      // file has since become a symlink to something private cannot deliver it here.
      const spec = readSpecFile(entry.payload.specPath)
      if (spec === undefined) {
        // Nothing to send: the spec is gone (a deleted worktree, a renamed repository),
        // too large, or no longer a spec at all. RETURNING is the point in every one of
        // those cases — it counts as delivered, so the entry LEAVES the queue. Throwing
        // instead would head-of-line the whole backlog forever, since flushOutbox stops
        // at the first failure and this one can never stop failing.
        return
      }
      // agent_id may resolve to nothing by now — replay happens after the agent was
      // archived, which releases its app id. The session keeps its owner regardless.
      return store.savePlanSpec({ agentId: entry.payload.agentId, specPath: entry.payload.specPath, spec })
    }
  }
}

/**
 * Whether an entry with an owner may be replayed under the session that is open.
 *
 * DELIBERATELY STRICTER THAN flushPendingArchives, and the difference is the point.
 * There, an empty uid on either side means "unknown", and treating unknown as a match
 * is safe: the worst case is settling an archive flag. Here the payload is a DOCUMENT
 * that gets published to an organization, so "unknown" must never resolve to "yours".
 *
 * Two accounts on one OS profile is the case this exists for. An upload that failed
 * while signed out is queued with `uid: ''`; the loose rule would then hand it to
 * whoever signs in next, uploading the previous user's plan under the new user's
 * identity and their repositories' visibility. So both sides must be present AND
 * equal. An entry that can never match is kept, not dropped — its owner may sign back
 * in, and flushOutbox skips rather than deletes.
 */
function replayableBy(entryUid: string, sessionUid: string): boolean {
  return entryUid !== '' && sessionUid !== '' && entryUid === sessionUid
}

let flushing: Promise<number> | null = null

/**
 * Replay the queue, oldest first, and keep whatever still fails — or whatever is not
 * this session's to send (see the uid guard below).
 *
 * Stops at the FIRST failure instead of trying every entry: the failure is almost
 * always "the backend is unreachable", and walking a 5000-entry backlog to learn that
 * 5000 times would hammer a network that is already down. Order is preserved for the
 * same reason it is preserved in the file — these rows carry timestamps a reader
 * treats as a sequence.
 *
 * Concurrent calls share one run. Returns how many events were delivered.
 *
 * Called from the connectivity gate, which polls every 20 seconds and on focus, so
 * the empty case must cost nothing: a known-empty queue returns without touching the
 * disk. `cachedCount` is only null before the first read of this process.
 */
export function flushOutbox(): Promise<number> {
  if (flushing) return flushing
  if (cachedCount === 0) return Promise.resolve(0)

  flushing = (async () => {
    const entries = readEntries()
    if (entries.length === 0) {
      cachedCount = 0
      return 0
    }

    const uid = loadSession()?.user?.id ?? ''
    // What survives this pass, in order. Not `entries.slice(delivered)` any more: an
    // entry may now be kept from the MIDDLE of the queue (another account's spec),
    // so the remainder is no longer a suffix.
    const kept: OutboxEntry[] = []
    let delivered = 0
    let stopped = false

    for (const entry of entries) {
      if (stopped) {
        kept.push(entry)
        continue
      }
      // Another account's spec upload. Not ours to replay — the row is scoped by
      // owner_id, so this session would either write it under the wrong owner or be
      // refused — and not ours to drop either: the file is still on this disk, and
      // the entry is the only record that it was never uploaded. Its owner's next
      // flush settles it. SKIPPED, so the rest of the backlog still drains.
      if (entry.kind === 'planSpec' && !replayableBy(entry.payload.uid, uid)) {
        kept.push(entry)
        continue
      }
      try {
        await replay(entry)
        delivered++
      } catch {
        kept.push(entry)
        stopped = true
      }
    }

    if (kept.length !== entries.length) {
      writeEntries(kept)
      console.log(`[outbox] Delivered ${delivered} queued event(s), ${kept.length} remaining`)
    }
    return delivered
  })()
    .catch((error) => {
      console.error('[outbox] Flush failed:', error)
      return 0
    })
    .finally(() => {
      flushing = null
    })

  return flushing
}

/** Queue depth and overflow count, for the telemetry health check. */
export function outboxStats(): { pending: number; droppedSinceStart: number } {
  if (cachedCount === null) cachedCount = readEntries().length
  return { pending: cachedCount, droppedSinceStart }
}

/** Test seam: forget the cached count so a fresh temp file is read from disk. */
export function resetOutboxCacheForTests(): void {
  cachedCount = null
  droppedSinceStart = 0
  flushing = null
}
