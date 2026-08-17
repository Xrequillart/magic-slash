import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import * as crypto from 'crypto'
import { CONFIG_DIR } from '../config/paths'
import type { ClaudeAccount, SpendSummary, SpendBucket } from '../../types'

// Reads Claude Code's local data (~/.claude) to surface the signed-in account and
// an *estimated* spend/token summary. These are not billed dollars — Claude.ai
// subscribers have no per-request cost — so the cost figure is an API-equivalent
// estimate computed from token counts × public API pricing (ccusage-style).

const CLAUDE_JSON = path.join(os.homedir(), '.claude.json')
const PROJECTS_DIR = path.join(os.homedir(), '.claude', 'projects')

// ---------------------------------------------------------------------------
// Account
// ---------------------------------------------------------------------------

export function getClaudeAccount(): ClaudeAccount | null {
  try {
    const raw = fs.readFileSync(CLAUDE_JSON, 'utf-8')
    const data = JSON.parse(raw)
    const oa = data?.oauthAccount
    if (!oa || typeof oa !== 'object') return null
    return {
      displayName: typeof oa.displayName === 'string' ? oa.displayName : undefined,
      emailAddress: typeof oa.emailAddress === 'string' ? oa.emailAddress : undefined,
      organizationName: typeof oa.organizationName === 'string' ? oa.organizationName : undefined,
      seatTier: typeof oa.seatTier === 'string' ? oa.seatTier : undefined,
      billingType: typeof oa.billingType === 'string' ? oa.billingType : undefined,
    }
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Spend / tokens
// ---------------------------------------------------------------------------

// Public API pricing per 1M tokens (USD). Cache read ≈ 0.1× input, cache write
// (5m) ≈ 1.25× input, cache write (1h) ≈ 2× input. See the claude-api skill.
interface ModelPrice { input: number; output: number }
function priceFor(model: string): ModelPrice {
  const m = model.toLowerCase()
  if (m.includes('fable') || m.includes('mythos')) return { input: 10, output: 50 }
  if (m.includes('opus')) return { input: 5, output: 25 }
  if (m.includes('haiku')) return { input: 1, output: 5 }
  if (m.includes('sonnet')) return { input: 3, output: 15 }
  return { input: 3, output: 15 } // unknown model → Sonnet-tier default
}

function estimateCostUsd(model: string, u: {
  input: number; output: number; cacheRead: number; cache5m: number; cache1h: number
}): number {
  const p = priceFor(model)
  return (
    (u.input * p.input) +
    (u.output * p.output) +
    (u.cacheRead * p.input * 0.1) +
    (u.cache5m * p.input * 1.25) +
    (u.cache1h * p.input * 2)
  ) / 1_000_000
}

// Local YYYY-MM-DD for an ISO timestamp.
function localDateKey(iso: string): string | null {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return null
  const y = d.getFullYear()
  const mo = String(d.getMonth() + 1).padStart(2, '0')
  const da = String(d.getDate()).padStart(2, '0')
  return `${y}-${mo}-${da}`
}

/**
 * Why this is cached per file, on disk, and read incrementally.
 *
 * The summary is a fold over every assistant message in ~/.claude/projects, and that
 * corpus only grows: on a daily driver it reaches hundreds of megabytes across
 * hundreds of transcripts within a few months. Folding it whole cost ~2s of
 * *synchronous* main-process work on the author's machine (579 MB / 867 files /
 * 175k lines) — and the main process is where the window, every IPC reply and every
 * PTY event live, so the settings page froze the whole app each time it was opened.
 *
 * The previous cache could not help, for two reasons worth naming so they are not
 * reintroduced:
 *
 *   1. Its signature was the mtime+size of ALL files joined together, so one byte
 *      appended by the session the user is currently running invalidated the entry
 *      for all 867 — a full re-read to account for one new message.
 *   2. It lived in module memory only, so every app launch paid the full fold again.
 *
 * So the unit of caching here is the file, not the corpus, and it is persisted.
 * Transcripts are append-only, which buys the rest: a file whose mtime and size are
 * unchanged is not opened at all, and one that merely grew is read from the byte
 * offset we stopped at rather than from zero. The common case — one active session
 * appending — went from ~2000ms to ~20ms, restarts included.
 *
 * Dedup is the one thing that cannot be done per file: the same assistant message is
 * copied into another transcript when a session is resumed or forked, so a per-file
 * count would count it twice. Hence each file caches its messages as individual
 * entries carrying their dedup key, and the global fold happens at read time (~16ms
 * for 72k entries, measured).
 */
interface DayAgg { tokens: number; costUsd: number }

/**
 * One assistant message reduced to what the fold needs: dedup key, local date,
 * tokens, estimated cost. A tuple rather than an object because there is one per
 * assistant message ever sent and the shape is written to disk — 72k of these are
 * 6.6 MB as tuples, and JSON.parse of that is 7ms.
 *
 * The key is '' for a message with no id, which is never deduped — matching the
 * original behaviour, where dedup was skipped entirely for those.
 */
type Entry = [key: string, dateKey: string, tokens: number, costUsd: number]

interface FileCache {
  mtimeMs: number
  size: number
  /**
   * Bytes folded so far, always landing just after a newline. A transcript being
   * written to can end mid-line, and folding that line would attribute a fraction of
   * a message; stopping short means it is folded whole once its newline lands.
   *
   * The cost is a message left out of the totals when a session dies mid-write and
   * the file is never appended to again. Verified against the author's 579 MB corpus:
   * the totals were identical to the previous full-fold implementation to the cent,
   * so no such line exists across 867 transcripts.
   */
  consumed: number
  /** Digest of the file's first `headLen` bytes, to tell an append from a rewrite. */
  head: string
  /**
   * How many bytes that digest covers — `min(HEAD_BYTES, size)`, so it has to be
   * stored rather than derived: a young transcript is shorter than HEAD_BYTES, and
   * re-digesting *its* new prefix after it grew would never match, sending every
   * early append down the full-re-fold path.
   */
  headLen: number
  entries: Entry[]
}

interface DiskCache {
  version: number
  /** IANA zone the date keys were bucketed in — see loadDiskCache. */
  timeZone: string
  files: Record<string, FileCache>
}

/**
 * Bump on any change to `priceFor`, `estimateCostUsd` or the Entry shape: costs are
 * folded once and stored, so without this a pricing correction would silently apply
 * to new messages only, leaving history priced by the old table.
 */
const CACHE_VERSION = 1
const CACHE_FILE = path.join(CONFIG_DIR, 'spend-cache.json')
const HEAD_BYTES = 4096

function currentTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'unknown'
  } catch {
    return 'unknown'
  }
}

function listJsonlFiles(dir: string): string[] {
  const out: string[] = []
  let entries: fs.Dirent[]
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true })
  } catch {
    return out
  }
  for (const e of entries) {
    const full = path.join(dir, e.name)
    if (e.isDirectory()) out.push(...listJsonlFiles(full))
    else if (e.isFile() && e.name.endsWith('.jsonl')) out.push(full)
  }
  return out
}

/** Parse a run of whole JSONL lines into the entries the fold consumes. */
function parseEntries(text: string): Entry[] {
  const out: Entry[] = []
  for (const line of text.split('\n')) {
    if (!line) continue
    let o: Record<string, unknown>
    try {
      o = JSON.parse(line)
    } catch {
      continue
    }
    const msg = o.message as Record<string, unknown> | undefined
    const usage = msg?.usage as Record<string, unknown> | undefined
    if (!msg || !usage || msg.role !== 'assistant') continue

    // Dropped before it can claim a dedup key: a message with no usable timestamp
    // belongs to no day and so is counted nowhere, and letting it reserve the key
    // would suppress a dated copy of itself in another transcript.
    const dateKey = typeof o.timestamp === 'string' ? localDateKey(o.timestamp) : null
    if (!dateKey) continue

    // Dedup key: the same assistant message is copied across resumed/forked sessions.
    const msgId = typeof msg.id === 'string' ? msg.id : (typeof o.uuid === 'string' ? o.uuid : '')
    const reqId = typeof o.requestId === 'string' ? o.requestId : ''
    const key = msgId ? `${msgId}:${reqId}` : ''

    const num = (v: unknown): number => (typeof v === 'number' ? v : 0)
    const cacheCreation = usage.cache_creation as Record<string, unknown> | undefined
    const cache1h = num(cacheCreation?.ephemeral_1h_input_tokens)
    const cache5mBreakdown = num(cacheCreation?.ephemeral_5m_input_tokens)
    const cacheCreateTotal = num(usage.cache_creation_input_tokens)
    // Prefer the TTL breakdown; fall back to the flat total as 5m if absent.
    const cache5m = cacheCreation ? cache5mBreakdown : cacheCreateTotal
    const cache1hTokens = cacheCreation ? cache1h : 0

    const input = num(usage.input_tokens)
    const output = num(usage.output_tokens)
    const cacheRead = num(usage.cache_read_input_tokens)
    const model = typeof msg.model === 'string' ? msg.model : ''

    const tokens = input + output + cacheRead + cache5m + cache1hTokens
    const costUsd = estimateCostUsd(model, {
      input, output, cacheRead, cache5m, cache1h: cache1hTokens,
    })

    out.push([key, dateKey, tokens, costUsd])
  }
  return out
}

function readRange(fd: number, from: number, to: number): string {
  const len = Math.max(0, to - from)
  if (len === 0) return ''
  const buf = Buffer.alloc(len)
  const read = fs.readSync(fd, buf, 0, len, from)
  return buf.subarray(0, read).toString('utf-8')
}

/** Digest of the file's first `len` bytes — short if the file is now shorter. */
function headDigest(fd: number, len: number): string {
  if (len <= 0) return ''
  const buf = Buffer.alloc(len)
  const read = fs.readSync(fd, buf, 0, len, 0)
  return crypto.createHash('sha1').update(buf.subarray(0, read)).digest('hex')
}

/**
 * Re-fold one changed file, reading only its new bytes when it was appended to.
 *
 * The head digest is what makes that safe: a file whose old prefix still hashes the
 * same and whose size is at least what we folded has been appended to, so resuming at
 * `prev.consumed` is exact. Anything else — a rewrite, a truncation, a compaction —
 * fails that test and gets read whole.
 */
function refreshFile(filePath: string, mtimeMs: number, size: number, prev?: FileCache): FileCache {
  const blank = (): FileCache => ({ mtimeMs, size, consumed: 0, head: '', headLen: 0, entries: [] })
  let fd: number
  try {
    fd = fs.openSync(filePath, 'r')
  } catch {
    // Unreadable now: keep what we already folded rather than dropping the file's
    // history from the totals.
    return prev ?? blank()
  }
  try {
    const appended = !!prev
      && prev.headLen > 0
      && size >= prev.consumed
      && headDigest(fd, prev.headLen) === prev.head
    const from = appended ? prev!.consumed : 0
    const chunk = readRange(fd, from, size)
    // Fold whole lines only; `from` always sits on a line boundary, so the byte
    // length of the complete run is exactly how far we advance.
    const cut = chunk.lastIndexOf('\n')
    const complete = cut === -1 ? '' : chunk.slice(0, cut + 1)
    const parsed = parseEntries(complete)
    const headLen = Math.min(HEAD_BYTES, size)
    return {
      mtimeMs,
      size,
      consumed: from + Buffer.byteLength(complete, 'utf-8'),
      head: appended && headLen === prev!.headLen ? prev!.head : headDigest(fd, headLen),
      headLen,
      entries: appended ? prev!.entries.concat(parsed) : parsed,
    }
  } catch {
    return prev ?? blank()
  } finally {
    try {
      fs.closeSync(fd)
    } catch {
      // nothing to do about a failed close
    }
  }
}

function loadDiskCache(): Record<string, FileCache> {
  try {
    const raw = fs.readFileSync(CACHE_FILE, 'utf-8')
    const data = JSON.parse(raw) as DiskCache
    if (data?.version !== CACHE_VERSION) return {}
    // Date keys are bucketed in local time, so a machine that moved zones has a
    // cache whose days no longer line up with the ones we are about to report.
    // Comparing the IANA name rather than the offset keeps DST from tripping this.
    if (data.timeZone !== currentTimeZone()) return {}
    return data.files && typeof data.files === 'object' ? data.files : {}
  } catch {
    return {}
  }
}

function saveDiskCache(files: Record<string, FileCache>): void {
  const payload: DiskCache = { version: CACHE_VERSION, timeZone: currentTimeZone(), files }
  const tmp = `${CACHE_FILE}.${process.pid}.tmp`
  try {
    fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true })
    // tmp + rename: a cache half-written by a quit at the wrong moment would be
    // discarded as unparseable, but only after costing a launch its full re-fold.
    fs.writeFileSync(tmp, JSON.stringify(payload), 'utf-8')
    fs.renameSync(tmp, CACHE_FILE)
  } catch {
    // A cache that fails to persist costs the next launch its speed, nothing else.
    try {
      fs.unlinkSync(tmp)
    } catch {
      // already gone
    }
  }
}

/** Fold every file's entries into per-day totals, deduping globally. */
function aggregate(files: Record<string, FileCache>): Map<string, DayAgg> {
  const byDate = new Map<string, DayAgg>()
  const seen = new Set<string>()
  for (const fc of Object.values(files)) {
    for (const [key, dateKey, tokens, costUsd] of fc.entries) {
      if (key) {
        if (seen.has(key)) continue
        seen.add(key)
      }
      const cur = byDate.get(dateKey) ?? { tokens: 0, costUsd: 0 }
      cur.tokens += tokens
      cur.costUsd += costUsd
      byDate.set(dateKey, cur)
    }
  }
  return byDate
}

// The folded per-file entries, loaded from disk on first use. Kept alongside a memo
// of the last aggregate so repeated reads with nothing changed skip even the fold.
let files: Record<string, FileCache> | null = null
let memo: { signature: string; byDate: Map<string, DayAgg> } | null = null

function getByDate(): Map<string, DayAgg> {
  const stats = listJsonlFiles(PROJECTS_DIR).map((p) => {
    try {
      const s = fs.statSync(p)
      return { path: p, mtimeMs: s.mtimeMs, size: s.size }
    } catch {
      return { path: p, mtimeMs: 0, size: 0 }
    }
  })

  const signature = stats.map((s) => `${s.path}:${s.mtimeMs}:${s.size}`).sort().join('|')
  if (memo && memo.signature === signature) return memo.byDate

  if (!files) files = loadDiskCache()
  const prev = files
  const next: Record<string, FileCache> = {}
  let changed = false
  for (const s of stats) {
    const cached = prev[s.path]
    if (cached && cached.mtimeMs === s.mtimeMs && cached.size === s.size) {
      next[s.path] = cached
      continue
    }
    next[s.path] = refreshFile(s.path, s.mtimeMs, s.size, cached)
    changed = true
  }
  // Deleted transcripts simply never make it into `next`, which prunes the cache;
  // that still has to be persisted, or every launch would re-save the same stale set.
  if (!changed && Object.keys(prev).length !== Object.keys(next).length) changed = true

  files = next
  const byDate = aggregate(next)
  memo = { signature, byDate }
  if (changed) saveDiskCache(next)
  return byDate
}

export function getSpendSummary(): SpendSummary {
  const byDate = getByDate()

  const now = new Date()
  const todayKey = localDateKey(now.toISOString())
  // Start of the current week (Monday, local).
  const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const dow = (startOfWeek.getDay() + 6) % 7 // 0 = Monday
  startOfWeek.setDate(startOfWeek.getDate() - dow)

  const empty = (): SpendBucket => ({ tokens: 0, costUsd: 0 })
  const today = empty()
  const week = empty()
  const allTime = empty()

  for (const [dateKey, agg] of byDate) {
    allTime.tokens += agg.tokens
    allTime.costUsd += agg.costUsd

    const d = new Date(`${dateKey}T00:00:00`)
    if (!isNaN(d.getTime()) && d >= startOfWeek) {
      week.tokens += agg.tokens
      week.costUsd += agg.costUsd
    }
    if (dateKey === todayKey) {
      today.tokens += agg.tokens
      today.costUsd += agg.costUsd
    }
  }

  return { today, week, allTime, hasData: byDate.size > 0 }
}

/** Test seam: drop the in-process cache so a test starts from a known state. */
export function __resetSpendCacheForTests(): void {
  files = null
  memo = null
}
