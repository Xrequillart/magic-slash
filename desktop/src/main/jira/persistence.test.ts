import * as fs from 'fs'
import * as path from 'path'
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest'
import type { JiraAuthStatus, JiraDisconnectReason } from '../../types'
import type { StoredJiraCredential } from './token-store'

/**
 * Acceptance criterion 2 — "the credential is stored on this machine only, survives a
 * restart, and Disconnect removes it from disk" — plus the one rule that criterion
 * quietly depends on: A DISCONNECT IS FINAL.
 *
 * ─── Why this file exists at all ────────────────────────────────────────────────
 * The other end-to-end suites here never execute `tokenStore.load()`. Every one of
 * them calls `disconnect()` in its `beforeEach` to clear the module-level cache, which
 * sets that cache to `null` — and `null` means "read, and there is nothing", so no
 * later `getStatus()` ever reaches the file. Both halves of the criterion were
 * therefore unproven: the restore was never exercised, and the removal was asserted
 * only as a flipped status, which the cache alone would satisfy even if `clear()` had
 * never run.
 *
 * So this suite resets the MODULE REGISTRY instead (`launch()` below). Every test
 * starts on a genuinely cold `connect.ts` — `credential` is `undefined`, exactly as it
 * is at app launch — and a "restart" is one more `launch()`, which can only answer from
 * the file.
 *
 * ─── The second half: a write must not outlive the disconnect that preceded it ──
 * Every write to the credential sits after an `await` on a network call. `disconnect()`
 * clears the pending attempt, the file and the cache, but it cannot call back a refresh
 * (or a site re-resolution, or a code exchange) that is already past its own await: the
 * old code went on to `tokenStore.save()` and `credential = updated`, putting a
 * credential the user had just removed back on disk AND back in memory — and, when the
 * user reconnected in the meantime, writing the OLD account's answer over the NEW
 * credential (a bogus "Atlassian refused this connection", a cloud id from the account
 * they unhooked). The generation counter in `connect.ts` is what closes that, and the
 * four tests below are what hold it closed.
 *
 * Driven end to end over the real `connect.ts`, `atlassian-api.ts` and `token-store.ts`
 * with only the machine's edges faked — the same shape as `revocation.test.ts`.
 */

const { TEST_CONFIG_DIR, opened, keychain } = vi.hoisted(() => ({
  // Built without `path`/`os`: vi.hoisted runs before the imports are initialised.
  TEST_CONFIG_DIR: `${(process.env.TMPDIR || '/tmp').replace(/\/$/, '')}/magic-slash-jira-persistence-test`,
  opened: [] as string[],
  keychain: { available: true },
}))

// A reversible prefix rather than real encryption: this suite reads the file back to
// prove WHAT landed, which real ciphertext would not allow.
vi.mock('electron', () => ({
  shell: { openExternal: async (url: string) => { opened.push(url) } },
  safeStorage: {
    isEncryptionAvailable: () => keychain.available,
    encryptString: (plain: string) => Buffer.from(`enc:${plain}`, 'utf-8'),
    decryptString: (blob: Buffer) => blob.toString('utf-8').replace(/^enc:/, ''),
  },
}))

vi.mock('../config/config', () => ({
  CONFIG_DIR: TEST_CONFIG_DIR,
  readConfig: () => ({ version: '1.0.0', integrations: { github: true, atlassian: true } }),
  setIntegration: () => ({ version: '1.0.0', integrations: { github: true, atlassian: true } }),
}))

vi.mock('../hooks/status-server', () => ({ getServerPort: () => 51234 }))

// A client id, so the flow is not short-circuited by `configured: false`.
vi.mock('./constants', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./constants')>()),
  ATLASSIAN_CLIENT_ID: 'test-client-id',
}))

const CREDENTIAL_FILE = path.join(TEST_CONFIG_DIR, 'jira-credential.enc')

const ACCESS_TOKEN = 'access-token-1'
const REFRESH_TOKEN = 'refresh-token-1'
const CODE = 'authorization-code'
const ACCOUNT_NAME = 'Ada Lovelace'
const SITE = { id: 'cloud-1', url: 'https://acme.atlassian.net', name: 'Acme' }
const MOVED = { id: 'cloud-2', url: 'https://acme-eu.atlassian.net', name: 'Acme' }

/** What a credential looks like once stored, for the tests that plant one by hand. */
const FULL_CREDENTIAL: StoredJiraCredential = {
  refresh_token: REFRESH_TOKEN,
  access_token: ACCESS_TOKEN,
  expires_at: Date.now() + 3600 * 1000,
  cloud_id: SITE.id,
  site_url: SITE.url,
  account_name: ACCOUNT_NAME,
}

interface StubResponse {
  ok: boolean
  status: number
  json: () => Promise<unknown>
}

const ok = (body: unknown): StubResponse => ({ ok: true, status: 200, json: async () => body })

const happyToken = (access = ACCESS_TOKEN, refresh = REFRESH_TOKEN): StubResponse =>
  ok({ access_token: access, refresh_token: refresh, expires_in: 3600, scope: 'read:jira-work offline_access' })

/** How the two edges a test can hold open answer. Reassigned per test. */
let tokenRoute: () => StubResponse | Promise<StubResponse>
let accessibleResources: () => StubResponse | Promise<StubResponse>

/** Every request the fakes served, so a "no round trip" claim can be checked. */
let requests = 0

const emissions: { status: JiraAuthStatus; reason?: JiraDisconnectReason }[] = []

/** The stored credential, decrypted — the only way to prove what actually landed. */
function storedCredential(): Record<string, unknown> | null {
  if (!fs.existsSync(CREDENTIAL_FILE)) return null
  return JSON.parse(fs.readFileSync(CREDENTIAL_FILE, 'utf-8').replace(/^enc:/, ''))
}

type ConnectModule = typeof import('./connect')

/** The module under test, as the current "run of the app" holds it. */
let connect: ConnectModule

/**
 * A COLD start of `connect.ts` — the app launching, with nothing cached.
 *
 * This is the whole point of the suite: `vi.resetModules()` drops the module registry,
 * so the next import re-evaluates `connect.ts` with `credential === undefined` and the
 * first `getStatus()` has to go to the file. Calling `disconnect()` instead — what the
 * neighbouring suites do — would set the cache to `null` and `load()` would never run.
 */
async function launch(): Promise<ConnectModule> {
  vi.resetModules()
  const mod = await import('./connect')
  mod.setStatusListener((status, reason) => { emissions.push({ status, reason }) })
  return mod
}

/** A promise the test releases by hand, to hold a call in flight. */
function gate(): { wait: Promise<void>; open: () => void } {
  let open: () => void = () => {}
  const wait = new Promise<void>((resolve) => { open = () => resolve() })
  return { wait, open }
}

/** Let every already-scheduled callback run, so "in flight" means in flight. */
const settle = (): Promise<void> => new Promise((resolve) => { setImmediate(resolve) })

beforeEach(async () => {
  fs.rmSync(TEST_CONFIG_DIR, { recursive: true, force: true })
  fs.mkdirSync(TEST_CONFIG_DIR, { recursive: true })
  keychain.available = true
  opened.length = 0
  requests = 0
  tokenRoute = () => happyToken()
  accessibleResources = () => ok([SITE])

  vi.stubGlobal('fetch', async (url: string) => {
    requests += 1
    if (url.endsWith('/api/atlassian/token')) return tokenRoute()
    if (url.endsWith('/oauth/token/accessible-resources')) return accessibleResources()
    if (url.includes('/rest/api/3/myself')) return ok({ displayName: ACCOUNT_NAME, accountId: 'acc-1' })
    throw new Error(`unexpected request to ${url}`)
  })

  emissions.length = 0
  // No `disconnect()` here, deliberately: the directory above is empty, so this is a
  // first launch on a machine with nothing stored — and the cache stays "not read yet".
  connect = await launch()
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  fs.rmSync(TEST_CONFIG_DIR, { recursive: true, force: true })
})

/** Click, browser, callback, exchange — the whole flow, over the real modules. */
async function connectFully(mod: ConnectModule = connect): Promise<void> {
  await mod.beginConnect()
  // The LAST authorize URL: some tests below run the flow more than once.
  const state = new URL(opened[opened.length - 1]).searchParams.get('state') ?? ''
  await mod.completeConnect({ code: CODE, state: state.split('.')[0] })
  expect(mod.getStatus().connected, 'the fixture connected').toBe(true)
  emissions.length = 0
}

/** The nonce of the attempt `beginConnect` just started, read off the authorize URL. */
function pendingNonce(): string {
  return (new URL(opened[opened.length - 1]).searchParams.get('state') ?? '').split('.')[0]
}

/** Move the wall clock past the access token's expiry, so the next read refreshes. */
function expireAccessToken(): void {
  vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 2 * 60 * 60 * 1000)
}

describe('the stored credential across a restart', () => {
  it('is read back on a cold start, with no round trip', async () => {
    // The restore half of the criterion, and the first test in the repo that actually
    // executes `tokenStore.load()`.
    await connectFully()
    expect(fs.existsSync(CREDENTIAL_FILE), 'the flow stored it').toBe(true)
    const requestsBeforeRestart = requests

    const restarted = await launch()
    const status = restarted.getStatus()

    // Everything Settings shows, straight off the disk — which is what makes the
    // section read "connected" the instant it opens rather than after a round trip.
    expect(status).toMatchObject({
      connected: true,
      configured: true,
      accountName: ACCOUNT_NAME,
      siteUrl: SITE.url,
    })
    expect(status.unverified).toBeUndefined()
    expect(requests, 'no network call was needed to answer').toBe(requestsBeforeRestart)
  })

  it('is absent on a cold start when there is nothing on disk', async () => {
    // The control for the test above: without it, a `getStatus()` hard-wired to
    // "connected" would pass, and so would one that never read the file at all.
    expect(fs.existsSync(CREDENTIAL_FILE)).toBe(false)

    expect((await launch()).getStatus()).toEqual({ connected: false, configured: true })
    expect(requests, 'and still nothing on the network').toBe(0)
  })

  it.each([
    ['an empty refresh token', { refresh_token: '' }],
    ['an empty cloud id', { cloud_id: '' }],
    // `JSON.stringify` drops an undefined value, so what lands on disk genuinely has no
    // `cloud_id` field — a credential written by an older build, or a truncated one.
    ['no cloud id at all', { cloud_id: undefined }],
  ])('is treated as absent rather than half-loaded when it has %s', async (_label, missing) => {
    // `load()`'s documented guard. A credential missing either of these two fields can
    // be used for NOTHING — every Jira path is keyed by the cloud id, and without the
    // refresh token the connection dies within the hour — so reporting it as connected
    // would put a "Disconnect" button where the user needs "Connect".
    const store = await import('./token-store')
    store.save({ ...FULL_CREDENTIAL, ...missing } as unknown as StoredJiraCredential)
    expect(fs.existsSync(CREDENTIAL_FILE), 'the file is there — the guard is what rejects it').toBe(true)

    const restarted = await launch()

    expect(restarted.getStatus()).toEqual({ connected: false, configured: true })
    expect((await import('./token-store')).load()).toBeNull()
  })
})

describe('disconnecting removes the credential from disk', () => {
  it('deletes the file, not just the cached copy', async () => {
    await connectFully()
    expect(fs.existsSync(CREDENTIAL_FILE)).toBe(true)

    // What `jira:disconnect` invokes — the handler is a one-liner over this.
    const status = connect.disconnect()

    expect(status).toEqual({ connected: false, configured: true })
    // THE FILE. `disconnect()` also sets the cache to `null`, so a status assertion on
    // its own would pass over a `tokenStore.clear()` that never ran.
    expect(fs.existsSync(CREDENTIAL_FILE), 'the credential is off the disk').toBe(false)

    // And it stays gone: a cold start has nothing cached, so this is the disk again.
    expect((await launch()).getStatus()).toEqual({ connected: false, configured: true })
  })
})

describe('a disconnect is final, even against a call already in flight', () => {
  it('is not undone by a refresh that was in flight when it landed', async () => {
    await connectFully()
    expireAccessToken()
    const held = gate()
    let tokenRequests = 0
    tokenRoute = async () => {
      tokenRequests += 1
      await held.wait
      // A rotated refresh token, as Atlassian really answers: the write this test is
      // about is not a no-op, it would land a DIFFERENT credential on disk.
      return happyToken('access-token-2', 'refresh-token-2')
    }

    const read = connect.withFreshAccessToken()
    await settle()
    expect(tokenRequests, 'the refresh is genuinely in flight').toBe(1)

    connect.disconnect()
    expect(fs.existsSync(CREDENTIAL_FILE), 'the disconnect removed it').toBe(false)

    // Now let Atlassian answer. The old code ran `tokenStore.save(updated)` and
    // `credential = updated` here — resurrecting, on disk and in memory, the credential
    // the user had just removed. Dropping the shared `refreshing` promise would not have
    // helped: this one was already past its own await.
    held.open()
    const token = await read

    expect(fs.existsSync(CREDENTIAL_FILE), 'and the refresh did not bring it back').toBe(false)
    expect(token, 'nor handed out a token for a credential that is gone').toBeNull()
    expect(connect.getStatus()).toEqual({ connected: false, configured: true })
    // A restart is the real test of the disk: nothing cached, nothing stored.
    expect((await launch()).getStatus().connected).toBe(false)
    // One push, the disconnect's own. The refresh has nothing to announce.
    expect(emissions.map((entry) => entry.status.connected)).toEqual([false])
  })

  it('is not undone by a code exchange that was in flight when it landed', async () => {
    // The window is narrow but real: the callback has already been consumed — its nonce
    // is gone, so `clearPending()` has nothing left to take away — and the exchange is
    // three round trips long. A Disconnect clicked during it must still win.
    await connectFully()
    const held = gate()
    let exchanges = 0
    tokenRoute = async () => {
      exchanges += 1
      await held.wait
      return happyToken('access-token-3', 'refresh-token-3')
    }

    await connect.beginConnect()
    const exchanging = connect.completeConnect({ code: CODE, state: pendingNonce() })
    await settle()
    expect(exchanges, 'the exchange is genuinely in flight').toBe(1)

    connect.disconnect()
    held.open()
    await exchanging

    expect(fs.existsSync(CREDENTIAL_FILE), 'nothing was committed after the disconnect').toBe(false)
    expect(connect.getStatus()).toEqual({ connected: false, configured: true })
    // And no contradictory "Connected" push on top of the disconnect the user asked for.
    expect(emissions.map((entry) => entry.status.connected)).toEqual([false])
  })

  it('does not let a refused grant from before it mark the account connected since', async () => {
    // The `markUnverified` path. The user disconnects and reconnects while the old
    // refresh is still out; its `invalid_grant` says nothing about the NEW credential,
    // and marking it would put "Atlassian refused this connection / Reconnect" in front
    // of a user whose brand-new connection is fine.
    await connectFully()
    expireAccessToken()
    const held = gate()
    let tokenRequests = 0
    tokenRoute = async () => {
      tokenRequests += 1
      // One-shot: the reconnect below needs the route working again.
      if (tokenRequests > 1) return happyToken('access-token-4', 'refresh-token-4')
      await held.wait
      return { ok: false, status: 400, json: async () => ({ error: 'invalid_grant' }) }
    }

    const read = connect.withFreshAccessToken()
    await settle()
    expect(tokenRequests).toBe(1)

    connect.disconnect()
    await connectFully()

    held.open()
    await expect(read).resolves.toBeNull()

    expect(connect.getStatus()).toMatchObject({ connected: true, siteUrl: SITE.url })
    expect(connect.getStatus().unverified, 'the new credential was never refused').toBeUndefined()
    expect(storedCredential()).toMatchObject({ refresh_token: 'refresh-token-4' })
    expect(storedCredential()?.unverified ?? false).toBe(false)
    expect(emissions, 'and nothing was pushed about it').toEqual([])
  })

  it('does not let a site re-resolution from before it move the account connected since', async () => {
    // The `reresolveSite` path, same shape. The sites the OLD credential could reach are
    // no evidence about the new one, and adopting one of them would point every
    // subsequent Jira read at a cloud id from the account the user unhooked.
    await connectFully()
    const held = gate()
    let resolutions = 0
    accessibleResources = async () => {
      resolutions += 1
      // One-shot again: `completeConnect` resolves the site too.
      if (resolutions > 1) return ok([SITE])
      await held.wait
      return ok([MOVED])
    }

    const reported = connect.reportUnauthorized()
    await settle()
    expect(resolutions, 'the re-resolution is genuinely in flight').toBe(1)

    connect.disconnect()
    await connectFully()

    held.open()
    await reported

    expect(connect.getStatus()).toMatchObject({ connected: true, siteUrl: SITE.url })
    expect(connect.getStatus().unverified).toBeUndefined()
    expect(storedCredential()).toMatchObject({ cloud_id: SITE.id, site_url: SITE.url })
    expect(emissions).toEqual([])
  })
})

/**
 * The mirror of the block above, and the half that was missing.
 *
 * `disconnect()` has always bumped the generation; `beginConnect()` only called
 * `clearPending()`. But `clearPending()` discards a verifier still WAITING for a
 * browser — it says nothing to an operation already past its own await. So an exchange,
 * a refresh or a site re-resolution belonging to the previous credential still matched
 * the generation it had captured, sailed through `superseded()`, and landed AFTER the
 * new credential: the user connects account B and is left holding account A's tokens,
 * or A's cloud id, under B's name. Starting over is the same event as disconnecting,
 * seen from the other side, and it has to end the old credential's claim the same way.
 */
describe('a fresh connect is final, even against a call already in flight', () => {
  it('is not undone by a code exchange that was in flight when it started', async () => {
    const held = gate()
    let exchanges = 0
    tokenRoute = async () => {
      exchanges += 1
      if (exchanges > 1) return happyToken('access-token-b', 'refresh-token-b')
      await held.wait
      return happyToken('access-token-a', 'refresh-token-a')
    }

    // Attempt A gets its callback and stalls mid-exchange. Its nonce is already
    // consumed, so there is nothing left for `clearPending()` to take away — which is
    // exactly why the generation has to do the work.
    await connect.beginConnect()
    const exchangingA = connect.completeConnect({ code: CODE, state: pendingNonce() })
    await settle()
    expect(exchanges, 'A is genuinely in flight').toBe(1)

    // The user starts over and goes all the way through.
    await connectFully()
    expect(storedCredential()).toMatchObject({ access_token: 'access-token-b' })

    // Only now does A come back.
    held.open()
    await exchangingA

    expect(storedCredential(), 'B survived A landing late').toMatchObject({
      access_token: 'access-token-b',
      refresh_token: 'refresh-token-b',
    })
    expect(connect.getStatus().connected).toBe(true)
  })

  it('is not undone by a refresh that was in flight when it started', async () => {
    // The rotating-token path. A refresh for the OLD credential must not write its
    // rotated pair over the new one — that would leave the file holding a refresh token
    // Atlassian has already spent for an account the user is no longer on.
    await connectFully()
    expireAccessToken()

    const held = gate()
    let calls = 0
    tokenRoute = async () => {
      calls += 1
      if (calls > 1) return happyToken('access-token-b', 'refresh-token-b')
      await held.wait
      return happyToken('access-token-a2', 'refresh-token-a2')
    }

    const refreshing = connect.withFreshAccessToken()
    await settle()
    expect(calls, 'the refresh is genuinely in flight').toBe(1)

    await connectFully()
    expect(storedCredential()).toMatchObject({ access_token: 'access-token-b' })

    held.open()
    expect(await refreshing, 'a superseded refresh hands back no token').toBeNull()

    expect(storedCredential(), 'B survived the old refresh landing late').toMatchObject({
      access_token: 'access-token-b',
      refresh_token: 'refresh-token-b',
    })
  })
})
