import * as fs from 'fs'
import * as path from 'path'
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest'
import type { JiraAuthStatus, JiraDisconnectReason } from '../../types'

/**
 * The outcomes of a connect attempt that does NOT end in a credential, and the two
 * rules that were wrong about them.
 *
 * ─── 1. An unattributable callback is not a cancellation ────────────────────────
 * The loopback server listens on 127.0.0.1 on a port any local process can reach — and
 * so can a page in the user's own browser walking the loopback range. A hit with no
 * `state`, or with someone else's, used to drop the pending attempt and push a failure:
 * a probe could kill a consent screen the user was halfway through. It must be IGNORED
 * — verifier kept, timer kept, nothing emitted — while the genuine cancellation (our own
 * nonce coming back with Atlassian's `error=`) keeps working exactly as before.
 *
 * ─── 2. A failure must not be contradicted five minutes later ───────────────────
 * `pending` and its 5-minute timer are armed BEFORE the browser is opened, so a
 * `shell.openExternal` that rejects used to leave both alive: the user was told the
 * sign-in page could not be opened, then told the browser never came back. The attempt
 * is rolled back instead.
 *
 * Also here, because they are the same "what does the user actually get told" surface:
 * `beginConnect` answering with a reason CODE rather than an English `Error` (the
 * renderer owns the wording — `i18n/en.ts` / `i18n/fr.ts`), and `markUnverified`
 * raising the reconnect prompt even when the keychain write behind it fails.
 *
 * Driven end to end over the real `connect.ts`, `atlassian-api.ts` and `token-store.ts`,
 * with only the machine's edges faked — the same shape as `revocation.test.ts`.
 */

const { TEST_CONFIG_DIR, opened, browser, clientId, keychain } = vi.hoisted(() => ({
  // Built without `path`/`os`: vi.hoisted runs before the imports are initialised.
  TEST_CONFIG_DIR: `${(process.env.TMPDIR || '/tmp').replace(/\/$/, '')}/magic-slash-jira-outcomes-test`,
  opened: [] as string[],
  // Whether `shell.openExternal` succeeds. The one edge two tests below move.
  browser: { opens: true },
  clientId: { current: 'test-client-id' },
  keychain: { available: true },
}))

vi.mock('electron', () => ({
  shell: {
    openExternal: async (url: string) => {
      if (!browser.opens) {
        // What Electron rejects with when no handler can take the URL. The message
        // deliberately quotes the URL, which is also why `connect.ts` reduces it to a
        // class name before logging it.
        throw new Error(`Failed to open path ${url}`)
      }
      opened.push(url)
    },
  },
  safeStorage: {
    isEncryptionAvailable: () => keychain.available,
    encryptString: (plain: string) => Buffer.from(`enc:${plain}`, 'utf-8'),
    decryptString: (blob: Buffer) => blob.toString('utf-8').replace(/^enc:/, ''),
  },
}))

vi.mock('../config/config', () => ({
  CONFIG_DIR: TEST_CONFIG_DIR,
  readConfig: () => ({ version: '1.0.0', integrations: { github: true } }),
  setIntegration: () => ({ version: '1.0.0', integrations: { github: true, atlassian: true } }),
}))

vi.mock('../hooks/status-server', () => ({ getServerPort: () => 51234 }))

/**
 * The client id, through a GETTER rather than a value.
 *
 * `isConfigured()` reads it on every call, so one test can take it away and assert the
 * "this build cannot connect" answer without a second copy of all the scaffolding above.
 */
vi.mock('./constants', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./constants')>()),
  get ATLASSIAN_CLIENT_ID() {
    return clientId.current
  },
}))

import {
  beginConnect,
  cancelConnect,
  completeConnect,
  disconnect,
  getStatus,
  setStatusListener,
  withFreshAccessToken,
} from './connect'

const CREDENTIAL_FILE = path.join(TEST_CONFIG_DIR, 'jira-credential.enc')

const ACCESS_TOKEN = 'access-token-1'
const REFRESH_TOKEN = 'refresh-token-1'
const CODE = 'authorization-code'
const SITE = { id: 'cloud-1', url: 'https://acme.atlassian.net', name: 'Acme' }

/** Long enough to satisfy the nonce shape, and unmistakably not one of ours. */
const FOREIGN_NONCE = 'AAAAAAAAAAAAAAAAAAAAAA'

interface StubResponse {
  ok: boolean
  status: number
  json: () => Promise<unknown>
}

const ok = (body: unknown): StubResponse => ({ ok: true, status: 200, json: async () => body })

/** How the webapp token route answers. Reassigned by the refresh tests. */
let tokenRoute: () => StubResponse | Promise<StubResponse>

const emissions: { status: JiraAuthStatus; reason?: JiraDisconnectReason }[] = []

function storedCredential(): Record<string, unknown> | null {
  if (!fs.existsSync(CREDENTIAL_FILE)) return null
  return JSON.parse(fs.readFileSync(CREDENTIAL_FILE, 'utf-8').replace(/^enc:/, ''))
}

beforeEach(() => {
  fs.rmSync(TEST_CONFIG_DIR, { recursive: true, force: true })
  fs.mkdirSync(TEST_CONFIG_DIR, { recursive: true })
  browser.opens = true
  clientId.current = 'test-client-id'
  keychain.available = true
  opened.length = 0
  tokenRoute = () => ok({
    access_token: ACCESS_TOKEN,
    refresh_token: REFRESH_TOKEN,
    expires_in: 3600,
    scope: 'read:jira-work offline_access',
  })

  vi.stubGlobal('fetch', async (url: string) => {
    if (url.endsWith('/api/atlassian/token')) return tokenRoute()
    if (url.endsWith('/oauth/token/accessible-resources')) return ok([SITE])
    if (url.includes('/rest/api/3/myself')) return ok({ displayName: 'Ada Lovelace', accountId: 'acc-1' })
    throw new Error(`unexpected request to ${url}`)
  })

  // `connect.ts` caches the credential in module state, which outlives a test.
  disconnect()
  setStatusListener((status, reason) => { emissions.push({ status, reason }) })
  emissions.length = 0
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  fs.rmSync(TEST_CONFIG_DIR, { recursive: true, force: true })
})

/** The nonce of the attempt `beginConnect` just started, read off the authorize URL. */
function pendingNonce(): string {
  const state = new URL(opened[opened.length - 1]).searchParams.get('state') ?? ''
  return state.split('.')[0]
}

async function connectFully(): Promise<void> {
  await beginConnect()
  await completeConnect({ code: CODE, state: pendingNonce() })
  expect(getStatus().connected, 'the fixture connected').toBe(true)
  emissions.length = 0
}

describe('a connect that cannot start answers with a reason code', () => {
  it('says so, rather than rejecting with an English sentence', async () => {
    // The renderer is the side that knows the user's language, so the main process
    // hands over a code and never a message. A rejection here would also reach the
    // renderer wrapped in Electron's own "Error invoking remote method" text.
    clientId.current = ''

    await expect(beginConnect()).resolves.toEqual({ started: false, failure: 'notConfigured' })
    expect(opened, 'no browser was opened').toEqual([])
    expect(emissions).toEqual([])
  })

  it('reports a browser that would not open, and rolls the attempt back', async () => {
    vi.useFakeTimers()
    browser.opens = false

    await expect(beginConnect()).resolves.toEqual({ started: false, failure: 'browser' })

    // The regression: `pending` and its 5-minute timer were armed before the browser
    // was opened, so the user got a second, contradictory "your browser never came
    // back" toast long after being told the page could not be opened.
    vi.advanceTimersByTime(10 * 60 * 1000)
    expect(emissions, 'no timeout push after the browser failed').toEqual([])
  })

  it('still expires an attempt whose browser DID open', async () => {
    // The control for the test above: rolling back on failure must not have disarmed
    // the timeout that a real abandoned attempt depends on.
    vi.useFakeTimers()

    await expect(beginConnect()).resolves.toMatchObject({ started: true })
    vi.advanceTimersByTime(5 * 60 * 1000)

    expect(emissions.map((e) => e.reason)).toEqual(['timeout'])
  })
})

describe('an unattributable callback is ignored, not treated as a cancellation', () => {
  it.each([
    ['no state at all', null],
    ['a state too short to be a nonce', 'abc'],
    ['a state outside the nonce charset', 'not-a-nonce!!!!!!!!!!!!!!'],
    ['a well-formed nonce from another attempt', FOREIGN_NONCE],
  ])('leaves the pending attempt alone for %s', async (_label, state) => {
    await beginConnect()
    const nonce = pendingNonce()

    const status = cancelConnect({ state, reason: 'failed' })

    // Nothing said to the user: there is no evidence anything went wrong.
    expect(status.connected).toBe(false)
    expect(emissions).toEqual([])

    // And the real attempt is still live — the whole point.
    await completeConnect({ code: CODE, state: nonce })
    expect(getStatus()).toMatchObject({ connected: true, siteUrl: SITE.url })
  })

  it('still cancels when Atlassian returns OUR nonce with an error', async () => {
    // The genuine path, unchanged: the user clicked Cancel on the consent screen.
    await beginConnect()
    const nonce = pendingNonce()

    const status = cancelConnect({ state: nonce, reason: 'cancelled' })

    expect(status.connected).toBe(false)
    expect(emissions.map((e) => e.reason)).toEqual(['cancelled'])

    // The verifier really was dropped: a code arriving afterwards redeems nothing.
    emissions.length = 0
    await completeConnect({ code: CODE, state: nonce })
    expect(getStatus().connected).toBe(false)
    expect(emissions.map((e) => e.reason)).toEqual(['failed'])
  })
})

describe('the reconnect prompt does not depend on a successful keychain write', () => {
  it('marks the credential unverified in memory even when it cannot be persisted', async () => {
    await connectFully()
    // The keychain goes away between the load and the write — a locked login keyring,
    // or a session that lost its secret service.
    keychain.available = false
    vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 2 * 60 * 60 * 1000)
    tokenRoute = () => ({ ok: false, status: 400, json: async () => ({ error: 'invalid_grant' }) })

    expect(await withFreshAccessToken()).toBeNull()

    // The mark is ADVISORY, and the prompt is the reason it exists: emitting an
    // unchanged status meant the user never learned the credential had been refused.
    expect(getStatus()).toMatchObject({ connected: true, unverified: true })
    expect(emissions.map((e) => e.status.unverified)).toEqual([true])

    // And the rule that outranks all of it: the credential is MARKED, never deleted.
    // The write failed, so what is on disk is simply the unmarked credential.
    expect(storedCredential()).toMatchObject({ refresh_token: REFRESH_TOKEN })
  })
})
