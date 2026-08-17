import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

// Both the transcript dir and the cache file are resolved from os.homedir() at import
// time, so the mock has to be hoisted above it and the path computable without
// touching the filesystem. Redirecting home is also what keeps these tests off the
// developer's own ~/.claude — a full fold of that is seconds of work, and the cache
// they would overwrite is the real app's.
const { TMP_HOME } = vi.hoisted(() => ({
  TMP_HOME: `${process.env.TMPDIR ?? '/tmp'}/magic-slash-spend-test-${process.pid}`,
}))

vi.mock('os', async (importOriginal) => {
  const actual = await importOriginal<typeof import('os')>()
  return { ...actual, default: { ...actual, homedir: () => TMP_HOME }, homedir: () => TMP_HOME }
})

/**
 * What the module read, and from where. The whole point of the cache is which bytes
 * are NOT read, and an ESM namespace cannot be spied on after the fact — so fs is
 * wrapped at mock time and every open/read recorded, the real call still running.
 */
const { fsCalls } = vi.hoisted(() => ({
  fsCalls: { opened: [] as string[], reads: [] as { position: number | null; length: number }[] },
}))

vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>()
  // Only the positional forms the module uses are wrapped; the overloads taking an
  // options object would need a wider signature for no gain here.
  const openSync = (file: string, flags: string): number => {
    fsCalls.opened.push(file)
    return actual.openSync(file, flags)
  }
  const readSync = (
    fd: number,
    buffer: NodeJS.ArrayBufferView,
    offset: number,
    length: number,
    position: number | null,
  ): number => {
    fsCalls.reads.push({ position, length })
    return actual.readSync(fd, buffer, offset, length, position)
  }
  return { ...actual, openSync, readSync, default: { ...actual, openSync, readSync } }
})

const PROJECTS = path.join(TMP_HOME, '.claude', 'projects')
const CACHE_FILE = path.join(TMP_HOME, '.config', 'magic-slash', 'spend-cache.json')

let getSpendSummary: typeof import('./claude-account-usage').getSpendSummary
let resetCache: () => void

/** One assistant line, priced by the caller's model, stamped today. */
function line(id: string, tokens: { input?: number; output?: number }, model = 'claude-sonnet-5'): string {
  return JSON.stringify({
    timestamp: new Date().toISOString(),
    requestId: `req_${id}`,
    message: {
      id,
      role: 'assistant',
      model,
      usage: { input_tokens: tokens.input ?? 0, output_tokens: tokens.output ?? 0 },
    },
  }) + '\n'
}

function transcript(name: string, content: string): string {
  const dir = path.join(PROJECTS, '-Users-test-project')
  fs.mkdirSync(dir, { recursive: true })
  const file = path.join(dir, name)
  fs.writeFileSync(file, content, 'utf-8')
  return file
}

/**
 * mtime has a coarse resolution on some filesystems, so an append made within the
 * same tick can leave mtime AND size... size always changes, but the cache keys on
 * both — this makes the change unambiguous for the assertions either way.
 */
function append(file: string, content: string): void {
  fs.appendFileSync(file, content, 'utf-8')
  const now = new Date()
  fs.utimesSync(file, now, new Date(now.getTime() + 1000))
}

beforeEach(async () => {
  fs.rmSync(path.join(TMP_HOME, '.claude'), { recursive: true, force: true })
  fs.rmSync(path.join(TMP_HOME, '.config'), { recursive: true, force: true })
  fs.mkdirSync(PROJECTS, { recursive: true })
  fsCalls.opened = []
  fsCalls.reads = []
  vi.resetModules()
  const mod = await import('./claude-account-usage')
  getSpendSummary = mod.getSpendSummary
  resetCache = mod.__resetSpendCacheForTests
  resetCache()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('getSpendSummary', () => {
  it('reports nothing when there are no transcripts', () => {
    const s = getSpendSummary()
    expect(s.hasData).toBe(false)
    expect(s.allTime).toEqual({ tokens: 0, costUsd: 0 })
  })

  it('sums tokens and prices them per model', () => {
    transcript('a.jsonl', line('msg_1', { input: 1_000_000, output: 1_000_000 }))
    const s = getSpendSummary()
    expect(s.allTime.tokens).toBe(2_000_000)
    // Sonnet: $3/M in + $15/M out.
    expect(s.allTime.costUsd).toBeCloseTo(18, 6)
    expect(s.today.tokens).toBe(2_000_000)
    expect(s.hasData).toBe(true)
  })

  it('counts a message copied into another transcript once', () => {
    // What a resumed or forked session does to the corpus, and the reason dedup
    // cannot be folded into the per-file cache.
    const dup = line('msg_dup', { input: 500 })
    transcript('a.jsonl', dup)
    transcript('b.jsonl', dup)
    expect(getSpendSummary().allTime.tokens).toBe(500)
  })
})

describe('incremental folding', () => {
  it('reads only the appended bytes of a transcript that grew', () => {
    const file = transcript('a.jsonl', line('msg_1', { input: 100 }))
    expect(getSpendSummary().allTime.tokens).toBe(100)

    resetCache()
    append(file, line('msg_2', { input: 400 }))
    fsCalls.reads = []

    expect(getSpendSummary().allTime.tokens).toBe(500)

    // Two reads and no more: the head digest that proves this was an append, and the
    // appended bytes themselves. A full re-fold would instead read from 0 to EOF.
    const tailReads = fsCalls.reads.filter((r) => r.position !== 0)
    expect(tailReads).toHaveLength(1)
    expect(tailReads[0].position).toBeGreaterThan(0)
    expect(tailReads[0].length).toBeLessThan(fs.statSync(file).size)
  })

  it('does not open a transcript whose mtime and size are unchanged', () => {
    transcript('a.jsonl', line('msg_1', { input: 100 }))
    expect(getSpendSummary().allTime.tokens).toBe(100)

    // Second read of an untouched corpus: the totals come from the cache, and the
    // fold is skipped outright by the signature memo.
    fsCalls.opened = []
    expect(getSpendSummary().allTime.tokens).toBe(100)
    expect(fsCalls.opened).toEqual([])
  })

  it('re-folds a transcript from zero when it was rewritten rather than appended', () => {
    const file = transcript('a.jsonl', line('msg_1', { input: 100 }))
    expect(getSpendSummary().allTime.tokens).toBe(100)

    resetCache()
    // Same growth in size, entirely different content: resuming at the old offset
    // would keep msg_1's tokens, which no longer exist in this file.
    fs.writeFileSync(file, line('msg_9', { input: 700 }) + line('msg_10', { input: 1 }), 'utf-8')
    expect(getSpendSummary().allTime.tokens).toBe(701)
  })

  it('re-reads a line that was only half written', () => {
    const file = transcript('a.jsonl', line('msg_1', { input: 100 }))
    const partial = line('msg_2', { input: 400 })
    append(file, partial.slice(0, 20)) // no trailing newline: a write in flight
    expect(getSpendSummary().allTime.tokens).toBe(100)

    resetCache()
    append(file, partial.slice(20)) // the rest lands
    expect(getSpendSummary().allTime.tokens).toBe(500)
  })

  it('drops a deleted transcript from the totals', () => {
    const file = transcript('a.jsonl', line('msg_1', { input: 100 }))
    transcript('b.jsonl', line('msg_2', { input: 400 }))
    expect(getSpendSummary().allTime.tokens).toBe(500)

    resetCache()
    fs.rmSync(file)
    expect(getSpendSummary().allTime.tokens).toBe(400)
  })
})

describe('persisted cache', () => {
  it('answers from disk after a restart, without reading the transcripts', async () => {
    transcript('a.jsonl', line('msg_1', { input: 100 }) + line('msg_2', { input: 400 }))
    expect(getSpendSummary().allTime.tokens).toBe(500)
    expect(fs.existsSync(CACHE_FILE)).toBe(true)

    // A fresh module instance is what an app launch looks like: no in-memory state,
    // only the file on disk.
    vi.resetModules()
    const fresh = await import('./claude-account-usage')
    fsCalls.opened = []
    expect(fresh.getSpendSummary().allTime.tokens).toBe(500)
    expect(fsCalls.opened).toEqual([])
  })

  it('ignores a cache written under another pricing version', async () => {
    transcript('a.jsonl', line('msg_1', { input: 1_000_000 }))
    getSpendSummary()

    const cache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'))
    cache.version = 999
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache), 'utf-8')

    vi.resetModules()
    const fresh = await import('./claude-account-usage')
    // Re-folded from the transcripts, so the total is right rather than doubled or
    // dropped — the point being that a stale cache is discarded, not merged.
    expect(fresh.getSpendSummary().allTime.tokens).toBe(1_000_000)
  })

  it('ignores a cache bucketed in another time zone', async () => {
    transcript('a.jsonl', line('msg_1', { input: 100 }))
    getSpendSummary()

    const cache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'))
    cache.timeZone = 'Antarctica/Troll'
    cache.files = {} // if the zone check fails to fire, the total comes back as 0
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache), 'utf-8')

    vi.resetModules()
    const fresh = await import('./claude-account-usage')
    expect(fresh.getSpendSummary().allTime.tokens).toBe(100)
  })

  it('survives an unparseable cache file', async () => {
    transcript('a.jsonl', line('msg_1', { input: 100 }))
    fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true })
    fs.writeFileSync(CACHE_FILE, '{ truncated', 'utf-8')

    vi.resetModules()
    const fresh = await import('./claude-account-usage')
    expect(fresh.getSpendSummary().allTime.tokens).toBe(100)
  })
})
