import * as fs from 'fs'
import * as path from 'path'
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest'
import type { JiraAuthStatus, JiraDisconnectReason } from '../../types'

/**
 * What a 401 or a refused refresh is allowed to conclude — driven END TO END, over
 * the real `connect.ts`, the real `atlassian-api.ts` and the real `token-store.ts`,
 * with only the machine's edges faked.
 *
 * Two invariants live here, and both were broken in ways a test of either half alone
 * could not see.
 *
 * ─── 1. A rate limit is not a revoked credential ────────────────────────────────
 * `atlassian-api.test.ts` already asserts that a 429 is not a rejected grant. It
 * passes, and it proves nothing on its own: the refresh does not reach Atlassian
 * directly. It goes through the webapp route that holds the client secret, and that
 * route used to fold EVERY 4xx into a 400 — so Atlassian's 429 arrived here as the
 * exact shape of a revoked refresh token and put "Atlassian refused this connection /
 * Reconnect" in front of a user whose account was fine. The invariant held in
 * isolation and was defeated over the hop.
 *
 * So `webappTokenFailure` below is the hop, and every classification test goes
 * through it rather than handing the desktop a status the desktop half would like.
 *
 * ─── 2. A 401 can mean the SITE moved ──────────────────────────────────────────
 * A stored `cloudId` is not forever, and a Jira read addressed to a stale one answers
 * 401 exactly like a revoked token. The ticket asks for it to be re-resolved before
 * anything is concluded — and for the credential to still be MARKED, never deleted,
 * whenever the re-resolution does not explain the 401.
 */

const { TEST_CONFIG_DIR, opened, configState, keychain } = vi.hoisted(() => ({
  // Built without `path`/`os`: vi.hoisted runs before the imports are initialised.
  TEST_CONFIG_DIR: `${(process.env.TMPDIR || '/tmp').replace(/\/$/, '')}/magic-slash-jira-revocation-test`,
  opened: [] as string[],
  configState: { current: { version: '1.0.0', integrations: { github: true } } as Record<string, unknown> },
  keychain: { available: true },
}))

// A reversible prefix rather than real encryption: this suite reads the file back to
// prove which cloud id ended up stored, which real ciphertext would not allow.
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
  readConfig: () => configState.current,
  setIntegration: (name: string, enabled: boolean) => {
    configState.current = { version: '1.0.0', integrations: { github: true, [name]: enabled } }
    return configState.current
  },
}))

vi.mock('../hooks/status-server', () => ({ getServerPort: () => 51234 }))

// A client id, so the flow is not short-circuited by `configured: false`.
vi.mock('./constants', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./constants')>()),
  ATLASSIAN_CLIENT_ID: 'test-client-id',
}))

import {
  beginConnect,
  completeConnect,
  disconnect,
  getStatus,
  reportUnauthorized,
  setStatusListener,
  withFreshAccessToken,
} from './connect'

const CREDENTIAL_FILE = path.join(TEST_CONFIG_DIR, 'jira-credential.enc')

const ACCESS_TOKEN = 'access-token-1'
const REFRESH_TOKEN = 'refresh-token-1'
const CODE = 'authorization-code'
const SITE = { id: 'cloud-1', url: 'https://acme.atlassian.net', name: 'Acme' }

interface StubResponse {
  ok: boolean
  status: number
  json: () => Promise<unknown>
}

const ok = (body: unknown): StubResponse => ({ ok: true, status: 200, json: async () => body })

/**
 * The webapp's token route, as the desktop sees a FAILURE from it.
 *
 * Mirrors `upstreamFailure` in `webapp/lib/atlassianState.ts`, which is where the rule
 * lives and where it is tested against the shipped code (`atlassianState.test.ts`).
 * Repeated here — six lines of it — because the two builds cannot import each other,
 * and a desktop test that made up its own idea of what the hop returns would be the
 * very mistake this file exists to catch.
 *
 * Note what the route ALWAYS does: it answers with a short code, falling back to
 * `atlassian_error` when the upstream body carries none, and it never forwards the
 * body itself.
 */
function webappTokenFailure(upstream: { status: number; body?: unknown }): StubResponse {
  const status =
    upstream.status === 429 ? 429 : upstream.status >= 400 && upstream.status < 500 ? 400 : 502
  const raw = (upstream.body as Record<string, unknown> | undefined)?.error
  const code = typeof raw === 'string' && /^[a-z_]{1,40}$/.test(raw) ? raw : null
  return { ok: false, status, json: async () => ({ error: code ?? 'atlassian_error' }) }
}

/** How the loopback/keychain-free edges answer. Reassigned per test. */
let tokenRoute: () => StubResponse | Promise<StubResponse>
let accessibleResources: () => StubResponse | Promise<StubResponse>

const emissions: { status: JiraAuthStatus; reason?: JiraDisconnectReason }[] = []

/** The stored credential, decrypted — the only way to prove what actually landed. */
function storedCredential(): Record<string, unknown> | null {
  if (!fs.existsSync(CREDENTIAL_FILE)) return null
  return JSON.parse(fs.readFileSync(CREDENTIAL_FILE, 'utf-8').replace(/^enc:/, ''))
}

beforeEach(async () => {
  fs.rmSync(TEST_CONFIG_DIR, { recursive: true, force: true })
  fs.mkdirSync(TEST_CONFIG_DIR, { recursive: true })
  keychain.available = true
  opened.length = 0
  configState.current = { version: '1.0.0', integrations: { github: true } }
  resetStubs()

  vi.stubGlobal('fetch', async (url: string) => {
    if (url.endsWith('/api/atlassian/token')) return tokenRoute()
    if (url.endsWith('/oauth/token/accessible-resources')) return accessibleResources()
    if (url.includes('/rest/api/3/myself')) return ok({ displayName: 'Ada Lovelace', accountId: 'acc-1' })
    throw new Error(`unexpected request to ${url}`)
  })

  // `connect.ts` caches the credential in module state, which outlives a test.
  disconnect()
  setStatusListener((status, reason) => { emissions.push({ status, reason }) })
  emissions.length = 0
})

afterEach(() => {
  vi.restoreAllMocks()
  fs.rmSync(TEST_CONFIG_DIR, { recursive: true, force: true })
})

/** The answers a HAPPY flow needs. What each test then breaks is one of these two. */
function resetStubs(): void {
  tokenRoute = () => ok({
    access_token: ACCESS_TOKEN,
    refresh_token: REFRESH_TOKEN,
    expires_in: 3600,
    scope: 'read:jira-work offline_access',
  })
  accessibleResources = () => ok([SITE])
}

/**
 * Click, browser, callback, exchange — the whole flow, over the real modules.
 *
 * Starts from the happy stubs, so a test that runs the fixture twice (a table of
 * failures, below) does not have the previous iteration's broken edge under it.
 */
async function connectFully(): Promise<void> {
  resetStubs()
  await beginConnect()
  // The LAST authorize URL: a couple of tests below run the flow more than once.
  const state = new URL(opened[opened.length - 1]).searchParams.get('state') ?? ''
  await completeConnect({ code: CODE, state: state.split('.')[0] })
  expect(getStatus().connected, 'the fixture connected').toBe(true)
  emissions.length = 0
}

/** Move the wall clock past the access token's expiry, so the next read refreshes. */
function expireAccessToken(): void {
  const later = Date.now() + 2 * 60 * 60 * 1000
  vi.spyOn(Date, 'now').mockReturnValue(later)
}

describe('a refused refresh, classified over the webapp hop', () => {
  it('does NOT mark the credential unverified when Atlassian is rate limiting us', async () => {
    // The regression, end to end: Atlassian answers 429, the webapp sanitises it, and
    // the desktop must read "come back later", not "the user revoked us".
    await connectFully()
    expireAccessToken()
    tokenRoute = () => webappTokenFailure({ status: 429, body: { error: 'rate_limit_exceeded' } })

    expect(await withFreshAccessToken()).toBeNull()
    expect(getStatus().unverified).toBeUndefined()
    expect(storedCredential()?.unverified ?? false, 'nothing was written to disk').toBe(false)
    // No push at all: there is nothing to tell the user about a throttled refresh.
    expect(emissions).toEqual([])
  })

  it('still does not mark it when the hop hides the 429 behind a 400', async () => {
    // The belt to the braces. If a deployment of the webapp folded 4xx into 400 again,
    // the status would be indistinguishable from `invalid_grant` — and the decision
    // would still be right, because it rests on the forwarded error CODE. The route
    // sends one on every failure (`atlassian_error` when the upstream body has none),
    // so this holds for a 429 with an empty body too.
    for (const body of [{ error: 'rate_limit_exceeded' }, {}]) {
      await connectFully()
      expireAccessToken()
      tokenRoute = () => ({ ...webappTokenFailure({ status: 429, body }), status: 400 })

      expect(await withFreshAccessToken()).toBeNull()
      expect(getStatus().unverified, JSON.stringify(body)).toBeUndefined()
      vi.restoreAllMocks()
      disconnect()
    }
  })

  it('does not mark it over an outage either', async () => {
    await connectFully()
    expireAccessToken()
    tokenRoute = () => webappTokenFailure({ status: 503, body: {} })

    expect(await withFreshAccessToken()).toBeNull()
    expect(getStatus().unverified).toBeUndefined()
  })

  it('DOES mark it when the refresh token was genuinely revoked', async () => {
    // The other side of the invariant: the acceptance criterion asks for a reconnect
    // prompt here, and a test that only proved "429 is harmless" would also pass on an
    // implementation that never marked anything.
    await connectFully()
    expireAccessToken()
    tokenRoute = () => webappTokenFailure({ status: 400, body: { error: 'invalid_grant' } })

    expect(await withFreshAccessToken()).toBeNull()
    expect(getStatus()).toMatchObject({ connected: true, unverified: true })
    // Marked, never deleted — the refresh token survives so a reconnect is one click.
    expect(storedCredential()).toMatchObject({ unverified: true, refresh_token: REFRESH_TOKEN })
    expect(emissions.map((e) => e.status.unverified)).toEqual([true])
  })
})

describe('a 401 re-resolves the site before it concludes anything', () => {
  it('adopts the new cloud id when the site moved, and marks nothing', async () => {
    await connectFully()
    const moved = { id: 'cloud-2', url: 'https://acme-eu.atlassian.net', name: 'Acme' }
    accessibleResources = () => ok([moved])

    await reportUnauthorized()

    // The 401 is explained AND repaired: the next read simply works.
    expect(getStatus()).toMatchObject({ connected: true, siteUrl: moved.url })
    expect(getStatus().unverified).toBeUndefined()
    expect(storedCredential()).toMatchObject({ cloud_id: moved.id, site_url: moved.url })
    // The site URL is on screen, so the move is pushed rather than left stale.
    expect(emissions.map((e) => e.status.siteUrl)).toEqual([moved.url])
  })

  it('keeps the site it already knows when Atlassian still lists it', async () => {
    // Several sites, ours among them, and no picker in scope: the stored one wins.
    await connectFully()
    accessibleResources = () => ok([{ id: 'cloud-9', url: 'https://other.atlassian.net', name: 'Other' }, SITE])

    await reportUnauthorized()

    expect(storedCredential()).toMatchObject({ cloud_id: SITE.id, site_url: SITE.url })
  })

  it('marks the credential when the site did not move — the 401 is unexplained', async () => {
    // A site outage answers 401 too. Nothing was repaired, so the user still gets the
    // reconnect prompt, exactly as before this path existed.
    await connectFully()

    await reportUnauthorized()

    expect(getStatus()).toMatchObject({ connected: true, unverified: true })
    expect(storedCredential()).toMatchObject({ unverified: true, cloud_id: SITE.id })
  })

  it('falls back to marking when the re-resolution itself fails', async () => {
    const answers = [
      // The credential is refused by Atlassian outright — the re-resolution is itself
      // evidence, and it says the 401 was not about the cloud id.
      () => ({ ok: false, status: 401, json: async () => ({}) }) as StubResponse,
      // An outage on the way to finding out.
      () => ({ ok: false, status: 503, json: async () => ({}) }) as StubResponse,
      // Reachable, but the account can no longer read any site.
      () => ok([]),
    ]
    for (const [index, answer] of answers.entries()) {
      await connectFully()
      accessibleResources = answer

      await reportUnauthorized()

      expect(getStatus().unverified, `answer #${index}`).toBe(true)
      // Never deleted, whatever happened.
      expect(storedCredential()).toMatchObject({ refresh_token: REFRESH_TOKEN })
      disconnect()
    }
  })

  it('is a no-op on a credential already marked, however many reads fail', async () => {
    await connectFully()
    await reportUnauthorized()
    emissions.length = 0
    let resolutions = 0
    accessibleResources = () => { resolutions += 1; return ok([SITE]) }

    await reportUnauthorized()
    await reportUnauthorized()

    expect(resolutions, 'no keychain write and no probe once marked').toBe(0)
    expect(emissions).toEqual([])
  })
})
