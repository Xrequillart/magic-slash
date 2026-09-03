import { describe, it, expect, beforeEach, beforeAll, afterAll, vi } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import type { Store } from './Store'
import { setStore, NOOP_STORE } from './Store'

// The spool resolves its file from os.homedir() at import time, so the mock has to be
// hoisted above it and the path has to be computable without touching the filesystem.
const h = vi.hoisted(() => ({
  TMP_HOME: `${process.env.TMPDIR ?? '/tmp'}/magic-slash-pending-archives-test-${process.pid}`,
  session: { user: { id: 'user-1' } } as { user: { id: string } } | null,
}))

vi.mock('os', async (importOriginal) => {
  const actual = await importOriginal<typeof import('os')>()
  return { ...actual, default: { ...actual, homedir: () => h.TMP_HOME }, homedir: () => h.TMP_HOME }
})

// Who is signed in decides which entries may be replayed at all. Mocked rather than
// stubbed through the store, and that also keeps the real session module — which
// imports electron's safeStorage — out of this suite.
vi.mock('../cloud/session-store', () => ({
  loadSession: () => h.session,
}))

import {
  enqueuePendingArchive,
  flushPendingArchives,
  pendingArchiveIds,
  resolvePendingArchive,
  resetPendingArchivesForTests,
} from './pending-archives'

const SPOOL_FILE = path.join(h.TMP_HOME, '.config', 'magic-slash', 'pending-archives.ndjson')
const UID = 'user-1'

let archived: string[]

/**
 * A store that behaves like CloudStore does: it settles the spool entry itself,
 * whatever the outcome — the write landed, the row was already archived, or the
 * update can never match. Only a transient failure (offline) throws with the entry
 * left in place, which is the one case the flush must keep.
 *
 * `deferred` is the fourth, and the odd one: with no session to write with,
 * archiveAgent returns quietly WITHOUT settling anything. Neither the return nor the
 * absence of a throw says a thing about whether the close was delivered.
 */
function fakeStore(outcome: (appId: string) => 'ok' | 'gone' | 'offline' | 'deferred' = () => 'ok'): Store {
  return {
    ...NOOP_STORE,
    archiveAgent: async (appId) => {
      archived.push(appId)
      const result = outcome(appId)
      if (result === 'offline') throw new Error('offline')
      if (result === 'deferred') return
      resolvePendingArchive(appId, h.session?.user?.id ?? '', result === 'gone' ? 'unmatched' : 'landed')
      if (result === 'gone') throw new Error(`archiveAgent failed: no agent row matched ${appId}`)
    },
  }
}

beforeAll(() => {
  fs.mkdirSync(path.dirname(SPOOL_FILE), { recursive: true })
})

afterAll(() => {
  fs.rmSync(h.TMP_HOME, { recursive: true, force: true })
})

beforeEach(() => {
  fs.rmSync(SPOOL_FILE, { force: true })
  resetPendingArchivesForTests()
  h.session = { user: { id: UID } }
  archived = []
  setStore(fakeStore())
})

describe('enqueuePendingArchive', () => {
  it('puts the close on disk, so it outlives the process that made it', () => {
    // The whole point: Electron does not await `before-quit`, so a close in flight
    // when the app dies can only be recovered from something already written.
    enqueuePendingArchive({ appId: 'claude-1', uid: UID })
    expect(fs.existsSync(SPOOL_FILE)).toBe(true)
    expect(JSON.parse(fs.readFileSync(SPOOL_FILE, 'utf-8').trim())).toEqual({ appId: 'claude-1', uid: UID })
  })

  it('keeps the spool private to the user', () => {
    // It names the agents someone worked on. 0600, like the outbox and the port file.
    enqueuePendingArchive({ appId: 'claude-1', uid: UID })
    expect(fs.statSync(SPOOL_FILE).mode & 0o777).toBe(0o600)
  })

  it('never records the same agent twice', () => {
    // A retry, or a replay re-entering through the store, must leave ONE entry:
    // resolving it once would otherwise leave a phantom that hides the agent from
    // every later hydration.
    enqueuePendingArchive({ appId: 'claude-1', uid: UID })
    enqueuePendingArchive({ appId: 'claude-1', uid: UID })
    enqueuePendingArchive({ appId: 'claude-2', uid: UID })

    expect(pendingArchiveIds()).toEqual(['claude-1', 'claude-2'])
  })

  it('says whether the intent is actually durable, instead of swallowing the failure', () => {
    // A read-only, full or inaccessible config dir. Answering nothing here would put
    // the original bug back: every caller that stays quiet about an unfinished
    // archive is entitled to do so ONLY because this file holds the intent, so one
    // that is not told the file does not hold it defers into silence and loses the
    // close for good.
    // A real failure rather than a stubbed one: a directory sitting where the spool
    // file belongs makes the append throw EISDIR, the same shape as the read-only
    // and out-of-space cases. (fs is an ESM namespace here, so it cannot be spied.)
    fs.mkdirSync(SPOOL_FILE, { recursive: true })
    // Still never throws — the caller is the write path this exists to protect.
    expect(enqueuePendingArchive({ appId: 'claude-1', uid: UID })).toBe(false)
    expect(pendingArchiveIds()).toEqual([])

    fs.rmdirSync(SPOOL_FILE)
    expect(enqueuePendingArchive({ appId: 'claude-1', uid: UID })).toBe(true)
    expect(pendingArchiveIds()).toEqual(['claude-1'])
  })

  it('reports an already-recorded close as durable, since it is', () => {
    // The dedupe path must answer true, not false: the replay re-enters through the
    // store on every pass, and a false there would make each one look unspoolable.
    enqueuePendingArchive({ appId: 'claude-1', uid: UID })
    expect(enqueuePendingArchive({ appId: 'claude-1', uid: UID })).toBe(true)
  })

  it('does not let one account\'s close stand in for another\'s on a colliding app id', () => {
    // App ids are `claude-${Date.now()}` and the spool outlives a sign-out, so two
    // accounts on one machine can hold the same one. Deduplicating on the app id
    // alone, the second close would match the first's entry and be reported durable
    // without ever being written — then settled, or hidden from hydration, under an
    // owner who cannot make its write. Both must exist independently.
    enqueuePendingArchive({ appId: 'claude-1', uid: 'user-2' })
    expect(enqueuePendingArchive({ appId: 'claude-1', uid: UID })).toBe(true)

    const entries = fs.readFileSync(SPOOL_FILE, 'utf-8').trim().split('\n').map((l) => JSON.parse(l))
    expect(entries).toEqual([
      { appId: 'claude-1', uid: 'user-2' },
      { appId: 'claude-1', uid: UID },
    ])
  })
})

describe('pendingArchiveIds', () => {
  it('reports what has not been confirmed yet, so hydration can hide it', () => {
    enqueuePendingArchive({ appId: 'claude-1', uid: UID })
    resetPendingArchivesForTests() // as after a restart: nothing cached, the file is all there is
    expect(pendingArchiveIds()).toEqual(['claude-1'])
  })

  it('reports nothing once the archive is settled', () => {
    enqueuePendingArchive({ appId: 'claude-1', uid: UID })
    resolvePendingArchive('claude-1', UID, 'landed')
    expect(pendingArchiveIds()).toEqual([])
  })

  it('settles only the owner\'s own entry, leaving a colliding one for its owner', () => {
    // Settlement scoped by owner, for the same reason the replay is: this account
    // proved something about ITS row and nothing about anyone else's, which is still
    // live and still needs archiving.
    enqueuePendingArchive({ appId: 'claude-1', uid: 'user-2' })
    enqueuePendingArchive({ appId: 'claude-1', uid: UID })

    resolvePendingArchive('claude-1', UID, 'landed')

    // Gone for this session…
    expect(pendingArchiveIds()).toEqual([])
    // …and still there for the account that owns it.
    h.session = { user: { id: 'user-2' } }
    expect(pendingArchiveIds()).toEqual(['claude-1'])
  })

  it('does not let a failed guess delete an unattributed close', () => {
    // A close made with no session loaded has uid ''. It is replayed under whoever
    // signs in next, because refusing to replay it would strand it forever — but that
    // replay is a GUESS about ownership. When it turns out wrong the update matches
    // nothing, and deleting the entry there would destroy the real owner's only
    // durable record: their live row stays unarchived and their agent comes back with
    // a fresh PTY. So an `unmatched` outcome may only remove an exact uid match.
    enqueuePendingArchive({ appId: 'claude-1', uid: '' })

    resolvePendingArchive('claude-1', UID, 'unmatched')
    expect(fs.readFileSync(SPOOL_FILE, 'utf-8')).toContain('claude-1')

    // A write that LANDED proves the guess was right, so it may claim the entry.
    resolvePendingArchive('claude-1', UID, 'landed')
    expect(pendingArchiveIds()).toEqual([])
  })

  it('hides an id from hydration only for the account that closed it', () => {
    // The roster hydration filters is already owner_id-scoped, so another account's
    // pending close must not hide a live agent this user never closed — the mirror
    // image of the resurrection bug, and just as invisible.
    enqueuePendingArchive({ appId: 'claude-1', uid: 'user-2' })
    expect(pendingArchiveIds()).toEqual([])

    h.session = { user: { id: 'user-2' } }
    expect(pendingArchiveIds()).toEqual(['claude-1'])
  })
})

describe('flushPendingArchives', () => {
  it('replays every pending close through the store, oldest first', async () => {
    enqueuePendingArchive({ appId: 'claude-1', uid: UID })
    enqueuePendingArchive({ appId: 'claude-2', uid: UID })

    expect(await flushPendingArchives()).toBe(2)
    expect(archived).toEqual(['claude-1', 'claude-2'])
    expect(pendingArchiveIds()).toEqual([])
  })

  it('keeps a close whose replay failed for a transient reason', async () => {
    // Offline is the ordinary case, and the reason the spool exists: the entry must
    // survive the failed attempt or the retry has nothing to retry.
    enqueuePendingArchive({ appId: 'claude-1', uid: UID })
    setStore(fakeStore(() => 'offline'))

    expect(await flushPendingArchives()).toBe(0)
    expect(pendingArchiveIds()).toEqual(['claude-1'])
  })

  it('skips a close made by another account instead of replaying it', async () => {
    // The spool outlives a sign-out. Replaying someone else's close would send an
    // update scoped by the WRONG owner_id — it matches nothing in the database and
    // reads to this user as a failed write of an agent they never had.
    enqueuePendingArchive({ appId: 'claude-other', uid: 'user-2' })
    enqueuePendingArchive({ appId: 'claude-mine', uid: UID })

    await flushPendingArchives()

    expect(archived).toEqual(['claude-mine'])
  })

  it('keeps another account\'s close so its owner can still settle it', async () => {
    // Skipping is not dropping. The other account's row is still LIVE server-side —
    // this flush proved nothing about it, only that it is not ours to send. Delete
    // the entry and the last durable record of that close is gone: when its owner
    // signs back in on this machine, hydration loads the agent and restoreAgents()
    // hands it a fresh PTY. That is the resurrection the spool exists to prevent,
    // merely postponed to the next account switch.
    enqueuePendingArchive({ appId: 'claude-other', uid: 'user-2' })

    await flushPendingArchives()
    expect(archived).toEqual([])
    // Asserted on the file, not on pendingArchiveIds(): that one is owner-scoped, so
    // it rightly says nothing about another account's entry. The durable record is
    // what has to survive here.
    expect(fs.readFileSync(SPOOL_FILE, 'utf-8')).toContain('claude-other')

    // And the owner coming back settles it, which is why keeping it is bounded.
    h.session = { user: { id: 'user-2' } }
    await flushPendingArchives()
    expect(archived).toEqual(['claude-other'])
    expect(pendingArchiveIds()).toEqual([])
  })

  it('drops a close whose row can never be found rather than retrying it forever', async () => {
    // The store settles what it proves unmatchable, so the next flush has nothing to
    // send. An entry kept here would hide its app id from every hydration for good.
    enqueuePendingArchive({ appId: 'claude-1', uid: UID })
    setStore(fakeStore(() => 'gone'))

    await flushPendingArchives()
    expect(pendingArchiveIds()).toEqual([])

    archived = []
    await flushPendingArchives()
    expect(archived).toEqual([])
  })

  it('counts only the closes that actually left the spool, not the ones merely attempted', async () => {
    // A deferred write returns without throwing and without settling — that is the
    // deliberate no-session behaviour, and the entry rightly stays. Counting the
    // attempt would have this report the whole backlog as settled on every 20s tick
    // of a signed-out app, while nothing had been delivered at all.
    enqueuePendingArchive({ appId: 'claude-deferred', uid: UID })
    enqueuePendingArchive({ appId: 'claude-done', uid: UID })
    setStore(fakeStore((appId) => (appId === 'claude-deferred' ? 'deferred' : 'ok')))

    expect(await flushPendingArchives()).toBe(1)
    // And the deferred one is still there for the next pass, which is the point.
    expect(pendingArchiveIds()).toEqual(['claude-deferred'])
  })

  it('shares one run between concurrent callers', async () => {
    // The connectivity gate polls every 20s and on focus; two overlapping passes
    // would send every stamp twice.
    enqueuePendingArchive({ appId: 'claude-1', uid: UID })

    const [first, second] = await Promise.all([flushPendingArchives(), flushPendingArchives()])

    expect([first, second]).toEqual([1, 1])
    expect(archived).toEqual(['claude-1'])
  })

  it('is a no-op on an empty spool and does not create the file', async () => {
    expect(await flushPendingArchives()).toBe(0)
    expect(fs.existsSync(SPOOL_FILE)).toBe(false)
  })

  it('skips a torn line rather than discarding the whole backlog', async () => {
    // A crash mid-append leaves half a line. The other closes are still good.
    enqueuePendingArchive({ appId: 'claude-1', uid: UID })
    fs.appendFileSync(SPOOL_FILE, '{"appId":"claude-t\n')
    enqueuePendingArchive({ appId: 'claude-3', uid: UID })
    resetPendingArchivesForTests()

    await flushPendingArchives()

    expect(archived).toEqual(['claude-1', 'claude-3'])
  })
})

describe('overflow', () => {
  it('stays bounded, dropping the oldest closes past the cap', () => {
    // With cloud disabled the flush is never reached — the gate only flushes on a
    // reachable AND authed backend — so nothing would ever remove an entry and this
    // file would grow for the life of the install. Dropping is a real loss (that
    // agent may come back), which is why the newest closes are the ones kept: they
    // are the ones a user would notice reappearing.
    for (let i = 0; i < 1200; i++) enqueuePendingArchive({ appId: `claude-${i}`, uid: UID })

    const ids = pendingArchiveIds()
    // Trimming on the first append past the cap would rewrite the file on every
    // append after it, so the spool may overshoot by the 10% compaction slack and is
    // trimmed in one pass. The bound is what matters.
    expect(ids.length).toBeLessThanOrEqual(1100)
    expect(ids).toContain('claude-1199')
    expect(ids).not.toContain('claude-0')
    // Its own timeout, because this is the one test that drives the spool far outside
    // the regime it is written for. `enqueuePendingArchive` re-reads and re-parses the
    // whole spool on every call to deduplicate — cheap on the handful of entries
    // production ever holds, quadratic on the 1200 it takes to prove the bound. Under
    // a second on a developer's SSD, over the 5s default on the macOS CI runner, where
    // it failed on main. Raise the ceiling rather than weaken the assertion: the cap is
    // what this test exists for, and a cheaper file would no longer reach it.
  }, 30_000)
})
