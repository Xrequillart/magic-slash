import * as fs from 'fs'
import * as path from 'path'
import { CONFIG_DIR } from '../config/paths'
import { loadSession } from '../cloud/session-store'
import { getStore } from './Store'

/**
 * A write-ahead spool for the ONE agent write that has no second chance: the
 * archive stamp.
 *
 * WHY THIS EXISTS
 * ---------------------------------------------------------------------------
 * Archiving is a soft delete — `archived_at` is stamped, the row stays — and
 * `readAgentRows()` filters on `.is('archived_at', null)` while `restoreAgents()`
 * relaunches everything that filter returns. So a stamp that never lands is not a
 * missing timestamp: it is a closed agent that comes back on the next launch with a
 * freshly spawned PTY, in a roster the user already pruned. The write was
 * fire-and-forget, and every ordinary reason a desktop app cannot reach its backend
 * — a closed lid, a train tunnel, a token refreshed a second too late, the app being
 * quit right after the close — deleted it with nothing reported.
 *
 * WRITE-AHEAD, NOT A RETRY QUEUE
 * ---------------------------------------------------------------------------
 * The entry is on disk BEFORE the PATCH is issued, which is what covers the case no
 * `before-quit` hook can: Electron does not await that handler, so a flush there
 * would be decorative — the process is gone before the round-trip returns. An entry
 * that survives the process is replayed by the connectivity gate; one whose write
 * did land is resolved by the writer itself, right after the response.
 *
 * That ordering makes a duplicate replay harmless rather than merely unlikely: the
 * update matches on `archived_at is null`, so a second delivery of a stamp that
 * already committed matches nothing, and archiveAgentRow recognises that case as an
 * idempotent re-close instead of a loss (see CloudStore.archiveAgentRow).
 *
 * WHY EACH ENTRY CARRIES A uid
 * ---------------------------------------------------------------------------
 * The spool outlives a sign-out. Replaying another user's pending archive against
 * the session that happens to be open would send an update scoped by the WRONG
 * `owner_id` — harmless in the database (it matches nothing) but reported to the
 * current user as a failed write of an agent they never closed. The uid lets those
 * entries be SKIPPED — kept, not dropped: the row they refer to is still live, so
 * discarding them would destroy the only durable record of a close that still has to
 * happen, and the agent would be resurrected the moment its owner signs back in here.
 * Their owner's next flush settles them. Empty when the app had no session at the
 * moment of the close, which is not evidence of a foreign entry — those are replayed,
 * and the `owner_id` filter is what keeps that safe.
 */

// Per-instance (CONFIG_DIR), like the outbox and the session: two apps sharing this
// file would replay each other's archives, and the dev build's agents are not the
// installed build's.
const SPOOL_FILE = path.join(CONFIG_DIR, 'pending-archives.ndjson')

/**
 * How many pending archives the spool keeps.
 *
 * Small on purpose — one entry per agent the user closed while offline, which is a
 * handful, not a stream. It still needs a bound: with cloud disabled the flush is
 * never reached at all (connectivity-handlers only flushes on 'ok', i.e. reachable
 * AND authed), so nothing would ever remove an entry and the file would grow for the
 * life of the install.
 */
const MAX_ENTRIES = 1000

/**
 * Compaction slack. Trimming to MAX_ENTRIES on the very first append past the cap
 * would rewrite the whole file on every subsequent append; letting it overshoot by
 * 10% makes the rewrite amortised instead.
 */
const COMPACT_AT = Math.floor(MAX_ENTRIES * 1.1)

/** Refuse to parse a file larger than this — it is corrupt, not a backlog. */
const MAX_FILE_BYTES = 8 * 1024 * 1024

/** One archive that has not been confirmed by the backend yet. */
export interface PendingArchive {
  /** The app's own agent id (`claude-…`), the key everything else here matches on. */
  appId: string
  /** Who was signed in when the agent was closed. '' when nobody was. See the header. */
  uid: string
}

/** In-memory line count, so an append does not have to read the file to know the size. */
let cachedCount: number | null = null

// The four functions below (read, write, compact, and the cap constants above) are
// the same NDJSON mechanics as store/outbox.ts, deliberately kept as a second copy:
// the two spools differ in policy, not in file handling. Fix one, look at the other.
function readEntries(): PendingArchive[] {
  try {
    if (!fs.existsSync(SPOOL_FILE)) return []
    if (fs.statSync(SPOOL_FILE).size > MAX_FILE_BYTES) {
      // Not recoverable by parsing: something else wrote here, or a partial write
      // ran away. Start clean rather than spend memory proving it is garbage.
      fs.rmSync(SPOOL_FILE, { force: true })
      return []
    }
    return fs
      .readFileSync(SPOOL_FILE, 'utf-8')
      .split('\n')
      .filter((line) => line.trim() !== '')
      .flatMap((line) => {
        // One torn line (a crash mid-append) must not discard the rest of the file.
        try {
          const entry = JSON.parse(line) as PendingArchive
          if (typeof entry?.appId !== 'string' || entry.appId === '') return []
          return [{ appId: entry.appId, uid: typeof entry.uid === 'string' ? entry.uid : '' }]
        } catch {
          return []
        }
      })
  } catch (error) {
    console.error('[pending-archives] Unreadable spool, starting empty:', error)
    return []
  }
}

/** Replace the file contents atomically, so a crash mid-write cannot truncate it. */
function writeEntries(entries: PendingArchive[]): void {
  try {
    fs.mkdirSync(path.dirname(SPOOL_FILE), { recursive: true })
    const tmp = `${SPOOL_FILE}.tmp`
    const body = entries.map((e) => JSON.stringify(e)).join('\n')
    fs.writeFileSync(tmp, body === '' ? '' : `${body}\n`, { encoding: 'utf-8', mode: 0o600 })
    fs.renameSync(tmp, SPOOL_FILE)
    cachedCount = entries.length
  } catch (error) {
    console.error('[pending-archives] Failed to rewrite the spool:', error)
    cachedCount = null
  }
}

/**
 * Drop the OLDEST entries past the cap.
 *
 * A dropped entry is an agent that may come back, so this is a real loss and not a
 * trim — but the newest closes are the ones a user would notice reappearing, and an
 * unbounded file is a worse failure than a stale one.
 */
function compactIfNeeded(): void {
  if ((cachedCount ?? 0) < COMPACT_AT) return
  const entries = readEntries()
  if (entries.length < COMPACT_AT) {
    cachedCount = entries.length
    return
  }
  const kept = entries.slice(entries.length - MAX_ENTRIES)
  console.warn(`[pending-archives] Spool full, dropped ${entries.length - kept.length} oldest archive(s)`)
  writeEntries(kept)
}

/**
 * Record ONE archive as pending, BEFORE its write goes out.
 *
 * Deduplicated on (app id, uid): closing the same agent twice must leave ONE entry,
 * or resolving it once would leave a phantom behind that hides the agent from every
 * later hydration.
 *
 * The uid is half of that identity, not decoration. App ids are `claude-${Date.now()}`
 * and the spool outlives a sign-out, so two accounts on one installation can hold the
 * same id. Keyed on the app id alone, the second account's close would match the
 * first's entry, be reported durable without ever being recorded, and then be settled
 * — or hidden from hydration — under the wrong owner. Both accounts get their own
 * entry, and each is settled only by the owner who can actually make its write.
 *
 * That is not an edge case but the normal path of a replay: flushPendingArchives()
 * goes back through CloudStore.archiveAgent, which records its write-ahead entry
 * before anything else, so every replayed entry re-enqueues itself. The dedupe makes
 * that a no-op — which is why the flush needs no guard of its own.
 *
 * Never throws. The caller is a write path whose failure mode this exists to fix —
 * making it fail differently would be no improvement.
 *
 * Returns whether the intent is now DURABLE: `true` when the entry is on disk (or
 * was already there), `false` when the write could not be made — a read-only, full
 * or inaccessible config dir. Swallowing that and answering nothing would be the
 * original bug wearing a new hat: the caller's whole right to stay quiet on a
 * deferred write rests on this file holding the intent, so a caller that is not told
 * the file does NOT hold it would defer into silence and lose the close for good.
 */
export function enqueuePendingArchive(entry: PendingArchive): boolean {
  try {
    // A known-empty spool has nothing to deduplicate against, so the ordinary close
    // — every close made while the backend is reachable — touches the disk once, to
    // append. Only a spool that already holds something pays the read.
    const entries = cachedCount === 0 ? [] : readEntries()
    // Already recorded — by an earlier close of the same agent, or by the replay
    // that re-enters through the store. The intent is durable either way. Matched on
    // BOTH fields: another account's entry for a colliding app id is not this
    // close's, and treating it as one would answer "durable" for something never
    // written.
    if (entries.some((e) => e.appId === entry.appId && e.uid === entry.uid)) return true
    fs.mkdirSync(path.dirname(SPOOL_FILE), { recursive: true })
    fs.appendFileSync(SPOOL_FILE, `${JSON.stringify(entry)}\n`, { encoding: 'utf-8', mode: 0o600 })
    cachedCount = entries.length + 1
    compactIfNeeded()
    return true
  } catch (error) {
    console.error('[pending-archives] Failed to record a pending archive:', error)
    return false
  }
}

/**
 * Why removing an entry takes an OUTCOME and not just an owner.
 *
 * Entries recorded with no session carry `uid: ''` — the app was signed out at the
 * moment of the close, so who owned the agent is genuinely unknown. They are replayed
 * under whatever session appears next, because refusing to replay them at all would
 * strand them forever. But that replay is a GUESS about ownership, and the two ways it
 * can end are not symmetric:
 *
 * - `landed` — the update matched a row under this owner, or the probe found it already
 *   archived. That is proof the guess was right, so the unattributed entry may be
 *   claimed and removed.
 * - `unmatched` — nothing matched for this owner. That proves the opposite: the entry
 *   was someone else's. Removing it here would delete the only durable record of a
 *   close that still has to happen, and its owner's live agent would come back with a
 *   fresh PTY — the resurrection this whole file exists to prevent, reached through the
 *   very code meant to stop it.
 *
 * So an `unmatched` outcome only ever removes an entry whose uid matches EXACTLY.
 */
export type ArchiveOutcome = 'landed' | 'unmatched'

/**
 * Forget ONE pending archive — its outcome is settled.
 *
 * Called both when the stamp landed and when it provably never will for THIS owner
 * (the row is gone, or was already archived): an entry that cannot succeed must not
 * be retried forever, and must not keep hiding an app id from hydration.
 *
 * "Belongs to another account" is deliberately NOT such a case — that says nothing
 * about the row, which is still live and still needs archiving by whoever owns it.
 * The replay loop skips those entries instead of resolving them.
 *
 * Hence the `uid`: settling is scoped to the owner who actually made the write, so a
 * colliding app id belonging to someone else survives. See `ArchiveOutcome` for why
 * an unattributed entry follows the outcome rather than the owner.
 */
export function resolvePendingArchive(appId: string, uid: string, outcome: ArchiveOutcome): void {
  try {
    const entries = readEntries()
    const kept = entries.filter(
      (e) => !(e.appId === appId && (e.uid === uid || (outcome === 'landed' && e.uid === '')))
    )
    if (kept.length === entries.length) return
    writeEntries(kept)
  } catch (error) {
    console.error('[pending-archives] Failed to resolve a pending archive:', error)
  }
}

/**
 * The app ids whose archive has not been confirmed yet, FOR THE CURRENT SESSION.
 *
 * Scoped by owner for the same reason resolution is: the roster this hides ids from
 * is already `owner_id`-scoped, so another account's pending close says nothing about
 * what this one may see. Left unscoped, a colliding app id would hide a live agent
 * this user never closed — the mirror image of the resurrection bug, and just as
 * invisible. Entries with no uid are included: they were made by this installation
 * with no session loaded, and the replay treats them as the current session's too.
 *
 * Synchronous, because its one caller (hydrateAgents) has to decide what to put in
 * the cache in the same step it fills it. A known-empty spool costs no disk access.
 */
export function pendingArchiveIds(): string[] {
  if (cachedCount === 0) return []
  const entries = readEntries()
  cachedCount = entries.length
  const uid = loadSession()?.user?.id ?? ''
  return entries.filter((e) => e.uid === '' || uid === '' || e.uid === uid).map((e) => e.appId)
}

let flushing: Promise<number> | null = null

/**
 * Replay every pending archive, oldest first. Returns how many entries left the spool.
 *
 * The entries are NOT removed here: each replay goes back through the store, which
 * owns the distinction between "landed", "already archived" and "will never match" —
 * and resolves the entry itself in all three cases. This loop only removes what it
 * refuses to send at all.
 *
 * Stops at the FIRST failure, like the outbox: the failure is almost always "the
 * backend is unreachable", and walking the whole spool to learn that once per entry
 * would hammer a network that is already down. An entry the store dropped on its way
 * out still stops this pass, and that costs one gate tick — the next flush starts
 * after it, since it is no longer in the file.
 *
 * Concurrent calls share one run: the connectivity gate polls every 20 seconds and on
 * focus, and two overlapping passes would send every stamp twice.
 */
export function flushPendingArchives(): Promise<number> {
  if (flushing) return flushing
  if (cachedCount === 0) return Promise.resolve(0)

  flushing = (async () => {
    const entries = readEntries()
    cachedCount = entries.length
    if (entries.length === 0) return 0

    const uid = loadSession()?.user?.id ?? ''

    for (const entry of entries) {
      // Another account's close. Not ours to replay: the update would be scoped by
      // the current owner_id, match nothing, and be reported to this user as a
      // failed write of an agent they never had.
      //
      // SKIPPED, not resolved. Dropping it would destroy the only durable record
      // that this close ever happened: the row is still live server-side, so once
      // its owner signs back in on this machine, hydration would load the agent and
      // restoreAgents() would hand it a fresh PTY — the exact resurrection this
      // spool exists to prevent, just deferred until the next account switch. The
      // entry costs one line and is bounded by MAX_ENTRIES; the owner's next flush
      // settles it. Only an outcome that is PROVEN (landed, already archived, or
      // unmatchable for this owner) may resolve an entry, and "belongs to someone
      // else" proves nothing about the row.
      if (entry.uid !== '' && uid !== '' && entry.uid !== uid) continue

      try {
        await getStore().archiveAgent(entry.appId)
      } catch (error) {
        // Whether this entry survives is the store's call, not this loop's: it has
        // already settled the ones it proved unmatchable. All that is decided here
        // is that the rest of the backlog waits for the next tick.
        console.error('[pending-archives] Replay failed, stopping this pass:', error)
        break
      }
    }

    // What settled is what LEFT the spool, and the file is the only thing that knows
    // which entries those are. Counting the replays that came back without throwing
    // would be counting something else: with no session to write with, archiveAgent
    // DEFERS — it keeps the entry and stays quiet, deliberately — so a signed-out app
    // would report its whole backlog as settled on every gate tick while nothing at
    // all had been delivered. A rewrite that itself failed leaves its entry in place
    // and is likewise not counted, which is the truth about it.
    const remaining = new Set(readEntries().map((e) => e.appId))
    const settled = entries.filter((e) => !remaining.has(e.appId)).length

    if (settled > 0) console.log(`[pending-archives] Settled ${settled} pending archive(s)`)
    return settled
  })()
    .catch((error) => {
      console.error('[pending-archives] Flush failed:', error)
      return 0
    })
    .finally(() => {
      flushing = null
    })

  return flushing
}

/** Test seam: forget the cached count so a fresh temp file is read from disk. */
export function resetPendingArchivesForTests(): void {
  cachedCount = null
  flushing = null
}
