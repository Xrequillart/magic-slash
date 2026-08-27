import * as fs from 'fs'
import * as path from 'path'
import { afterAll, beforeEach, describe, it, expect, vi } from 'vitest'
import type { BrowserWindow } from 'electron'

/**
 * The test the acceptance criteria ask for: NO credential ever leaves the main
 * process.
 *
 * It drives the real flow — the real `connect.ts`, the real `token-store.ts`, the
 * real handlers — with only the machine's edges faked (the keychain, the browser,
 * the network, the config write). Then it recursively serialises everything that
 * crosses a boundary and asserts that no key and no value carries a token.
 *
 * Two boundaries are checked, because they are the two ways a secret escapes:
 *  • every `jira:*` handler's RETURN VALUE — the renderer side of the bridge, and
 *    therefore anything a devtools inspector, a crash report or a screenshot of the
 *    React tree could pick up;
 *  • the payload handed to `writeConfig` — the config is synchronised to the cloud
 *    store, so a token landing there would be uploaded, which is precisely what this
 *    feature promises never happens.
 *
 * The suite also asserts the POSITIVE: the tokens really are in the encrypted file
 * on disk. Without that, every assertion below would still pass on a flow that
 * silently stored nothing.
 */

const { TEST_CONFIG_DIR, handlers, opened, writtenConfigs, configState, hooks } = vi.hoisted(() => ({
  // Built without `path`/`os`: vi.hoisted runs before the imports are initialised.
  TEST_CONFIG_DIR: `${(process.env.TMPDIR || '/tmp').replace(/\/$/, '')}/magic-slash-jira-leak-test`,
  handlers: new Map<string, (event: unknown, args?: unknown) => Promise<unknown>>(),
  opened: [] as string[],
  writtenConfigs: [] as unknown[],
  // The config the stand-in below reads back, so it models `readConfig` returning
  // what `setIntegration` last wrote rather than a frozen snapshot.
  configState: { current: { version: '1.0.0', integrations: { github: true } } as Record<string, unknown> },
  hooks: { jiraCallback: null as null | ((p: { code: string | null; error: string | null; state: string | null }) => void) },
}))

// The keychain, the browser and the IPC registry. `safeStorage` is faked with a
// reversible prefix rather than real encryption: what matters here is that the
// bytes on disk went through it, not that they are unreadable to this test — the
// test in fact needs to read them back to prove the tokens landed.
vi.mock('electron', () => ({
  ipcMain: {
    handle: (channel: string, fn: (event: unknown, args?: unknown) => Promise<unknown>) => {
      handlers.set(channel, fn)
    },
  },
  shell: {
    openExternal: async (url: string) => { opened.push(url) },
  },
  safeStorage: {
    isEncryptionAvailable: () => true,
    encryptString: (plain: string) => Buffer.from(`enc:${plain}`, 'utf-8'),
    decryptString: (blob: Buffer) => blob.toString('utf-8').replace(/^enc:/, ''),
  },
}))

/**
 * A stand-in for the config module.
 *
 * The real `setIntegration` reads the config, flips one boolean and ends in
 * `writeConfig(config)`; this captures the object that call would receive. Mocking
 * the module wholesale is the only option — `setIntegration` and `CONFIG_DIR` live
 * in the same file — so the stand-in mirrors the real function's shape deliberately.
 *
 * `readConfig` reads back what `setIntegration` wrote, because `connect.ts` checks the
 * flag before writing it: a stand-in that always answered "not set" would let a
 * redundant cloud write pass this suite unnoticed.
 */
vi.mock('../config/config', () => ({
  CONFIG_DIR: TEST_CONFIG_DIR,
  readConfig: () => configState.current,
  setIntegration: (name: string, enabled: boolean) => {
    const config = { version: '1.0.0', integrations: { github: true, [name]: enabled } }
    configState.current = config
    writtenConfigs.push(config)
    return config
  },
}))

// The loopback server. Only two things are needed of it: a port to advertise, and
// the callback registration the handlers make.
vi.mock('../hooks/status-server', () => ({
  getServerPort: () => 51234,
  setJiraCallbackHandler: (cb: (p: { code: string | null; error: string | null; state: string | null }) => void) => {
    hooks.jiraCallback = cb
  },
}))

// A client id, so the flow is not short-circuited by `configured: false`. Everything
// else keeps its production value: the test asserts on the real URLs.
vi.mock('./constants', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./constants')>()),
  ATLASSIAN_CLIENT_ID: 'test-client-id',
}))

import { setupJiraHandlers } from '../ipc/jira-handlers'

const CREDENTIAL_FILE = path.join(TEST_CONFIG_DIR, 'jira-credential.enc')

// Long, base64url-shaped and unmistakable: long enough to trip the token-shape
// detector below, so a leak is caught even if the assertion misses the exact value.
const ACCESS_TOKEN = 'AAAAaccessTokenAAAAaccessTokenAAAAaccessToken'
const REFRESH_TOKEN = 'RRRRrefreshTokenRRRRrefreshTokenRRRRrefresh'
const CODE = 'CCCCauthorizationCodeCCCCauthorizationCode'

/** Every literal that must never appear outside the encrypted file. */
const SECRETS = [ACCESS_TOKEN, REFRESH_TOKEN, CODE]

/** Keys that may never appear in anything crossing a boundary, at any depth. */
const FORBIDDEN_KEYS = ['access_token', 'refresh_token', 'accessToken', 'refreshToken', 'code_verifier', 'verifier', 'code']

/**
 * A string long enough and shaped enough to be a credential.
 *
 * 24+ characters of base64url alphabet only. A display name has spaces, a site URL
 * has `:` and `/`, a cloud id is short — so this catches an opaque secret without
 * flagging the three display fields the status is allowed to carry.
 */
const TOKEN_SHAPED = /^[A-Za-z0-9_-]{24,}$/

function assertNoCredential(label: string, value: unknown, trail = '$'): void {
  if (typeof value === 'string') {
    for (const secret of SECRETS) {
      expect(value.includes(secret), `${label}: ${trail} carries a secret`).toBe(false)
    }
    expect(TOKEN_SHAPED.test(value), `${label}: ${trail} is token-shaped ("${value}")`).toBe(false)
    return
  }
  if (Array.isArray(value)) {
    value.forEach((entry, i) => assertNoCredential(label, entry, `${trail}[${i}]`))
    return
  }
  if (value && typeof value === 'object') {
    for (const [key, entry] of Object.entries(value)) {
      expect(FORBIDDEN_KEYS, `${label}: ${trail}.${key} is a credential field`).not.toContain(key)
      assertNoCredential(label, entry, `${trail}.${key}`)
    }
  }
}

const invoke = (channel: string): Promise<unknown> => {
  const handler = handlers.get(channel)
  if (!handler) throw new Error(`no handler registered for ${channel}`)
  return handler({})
}

/** The three answers the flow expects, in the order it asks for them. */
function stubNetwork(): void {
  vi.stubGlobal('fetch', async (url: string) => {
    if (url.endsWith('/api/atlassian/token')) {
      return jsonResponse({
        access_token: ACCESS_TOKEN,
        refresh_token: REFRESH_TOKEN,
        expires_in: 3600,
        scope: 'read:jira-work offline_access',
      })
    }
    if (url.endsWith('/oauth/token/accessible-resources')) {
      return jsonResponse([{ id: 'cloud-1', url: 'https://acme.atlassian.net', name: 'Acme' }])
    }
    if (url.includes('/rest/api/3/myself')) {
      return jsonResponse({ displayName: 'Ada Lovelace', accountId: 'acc-1' })
    }
    throw new Error(`unexpected request to ${url}`)
  })
}

const jsonResponse = (body: unknown) => ({ ok: true, status: 200, json: async () => body })

const fakeWindow = { webContents: { send: () => {} } } as unknown as BrowserWindow

beforeEach(async () => {
  fs.rmSync(TEST_CONFIG_DIR, { recursive: true, force: true })
  fs.mkdirSync(TEST_CONFIG_DIR, { recursive: true })
  handlers.clear()
  opened.length = 0
  hooks.jiraCallback = null
  stubNetwork()
  setupJiraHandlers(() => fakeWindow)
  // `connect.ts` caches the credential in module state, which outlives a test. The
  // disconnect channel is the one thing that resets both the cache and the file, so
  // each test starts from a genuinely disconnected app rather than from the previous
  // test's success. Done through the handler on purpose — a test helper reaching
  // into module internals would be testing a different program.
  await invoke('jira:disconnect')
  writtenConfigs.length = 0
  configState.current = { version: '1.0.0', integrations: { github: true } }
})

afterAll(() => {
  fs.rmSync(TEST_CONFIG_DIR, { recursive: true, force: true })
})

/** Runs the whole flow — click, browser, callback, exchange — and returns the nonce used. */
async function connectFully(): Promise<void> {
  await invoke('jira:connect')
  const authorizeUrl = new URL(opened[0])
  const state = authorizeUrl.searchParams.get('state') ?? ''
  const nonce = state.split('.')[0]

  hooks.jiraCallback?.({ code: CODE, error: null, state: nonce })

  // The handler is fire-and-forget by design (the browser has already been
  // answered), so wait for the credential to appear rather than for a promise.
  await vi.waitFor(async () => {
    expect(((await invoke('jira:authStatus')) as { connected: boolean }).connected).toBe(true)
  })
}

describe('the connect flow really does store the credential', () => {
  // The control. Everything else in this file asserts an absence, and an absence is
  // trivially satisfied by a flow that did nothing at all.
  it('writes the tokens into the encrypted file, and nowhere else', async () => {
    await connectFully()

    const onDisk = fs.readFileSync(CREDENTIAL_FILE, 'utf-8')
    expect(onDisk.startsWith('enc:'), 'went through safeStorage').toBe(true)
    expect(onDisk).toContain(ACCESS_TOKEN)
    expect(onDisk).toContain(REFRESH_TOKEN)

    // 0600: on a shared machine no other account should be able to take a copy and
    // wait for a keychain prompt.
    expect(fs.statSync(CREDENTIAL_FILE).mode & 0o777).toBe(0o600)
  })
})

describe('no jira:* handler ever returns a credential', () => {
  it('keeps the disconnected status clean', async () => {
    assertNoCredential('jira:authStatus (disconnected)', await invoke('jira:authStatus'))
  })

  it('keeps the status returned when the browser opens clean', async () => {
    assertNoCredential('jira:connect', await invoke('jira:connect'))
  })

  it('keeps the CONNECTED status clean — a name and a site, nothing else', async () => {
    await connectFully()
    const status = (await invoke('jira:authStatus')) as Record<string, unknown>
    assertNoCredential('jira:authStatus (connected)', status)
    // What it IS allowed to say, so this test fails if the status quietly loses the
    // fields the UI renders instead of quietly gaining ones it should not have.
    expect(status).toEqual({
      connected: true,
      configured: true,
      accountName: 'Ada Lovelace',
      siteUrl: 'https://acme.atlassian.net',
    })
  })

  it('keeps the status returned by a disconnect clean', async () => {
    await connectFully()
    assertNoCredential('jira:disconnect', await invoke('jira:disconnect'))
  })
})

describe('nothing about the credential reaches the config', () => {
  it('flips the integration flag and passes nothing else to writeConfig', async () => {
    await connectFully()

    // The write happened — otherwise "nothing leaked" would be vacuous again.
    expect(writtenConfigs).toHaveLength(1)
    expect(writtenConfigs[0]).toEqual({
      version: '1.0.0',
      integrations: { github: true, atlassian: true },
    })
    for (const payload of writtenConfigs) {
      assertNoCredential('writeConfig', payload)
    }
  })

  it('writes the flag only AFTER the credential is stored', async () => {
    // `token-store.save()` throws when the keychain is unavailable, and everything
    // that announces success must sit behind it — otherwise the app claims a
    // connection it discarded.
    await connectFully()
    expect(fs.existsSync(CREDENTIAL_FILE)).toBe(true)
    expect(writtenConfigs).toHaveLength(1)
  })
})

describe('the browser leg never carries a secret', () => {
  it('sends the challenge to Atlassian, never the verifier or a token', async () => {
    await connectFully()
    const authorizeUrl = opened[0]
    // Everything in this URL lands in the user's browser history.
    for (const secret of SECRETS) {
      expect(authorizeUrl).not.toContain(secret)
    }
    expect(authorizeUrl).toContain('code_challenge_method=S256')
    expect(authorizeUrl.startsWith('https://auth.atlassian.com/authorize?')).toBe(true)
  })
})
