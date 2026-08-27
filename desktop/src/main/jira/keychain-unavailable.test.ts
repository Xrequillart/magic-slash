import * as fs from 'fs'
import * as path from 'path'
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest'
import type { JiraAuthStatus, JiraDisconnectReason } from '../../types'

/**
 * Acceptance criterion 4, end to end: "when the OS keychain is unavailable, connecting
 * fails with a STATED REASON and the UI never claims to be connected".
 *
 * Both halves are asserted here, and they fail differently. The second half is about
 * ORDER — `token-store.save()` throws, and everything that announces success sits
 * behind it — and `no-token-leak.test.ts` covers the happy side of that ordering. This
 * file covers the unhappy side, which is the only one where the ordering can be
 * observed at all: nothing on disk, nothing in the config, no `connected: true`.
 *
 * The first half is about the reason CODE. A keychain that is locked or missing is a
 * fact about this machine, and the user can act on it; folded into the generic
 * `failed` it becomes "Could not connect your Atlassian account", which sends them
 * looking through their Atlassian settings for a problem that is not there. So the
 * suite also pins the OTHER outcome — a genuine flow failure still reads `failed` —
 * because a reason code that is always `keychain` would satisfy the first assertion
 * and say nothing.
 */

const { TEST_CONFIG_DIR, opened, writtenConfigs, keychain } = vi.hoisted(() => ({
  // Built without `path`/`os`: vi.hoisted runs before the imports are initialised.
  TEST_CONFIG_DIR: `${(process.env.TMPDIR || '/tmp').replace(/\/$/, '')}/magic-slash-jira-keychain-test`,
  opened: [] as string[],
  writtenConfigs: [] as unknown[],
  keychain: { available: true },
}))

vi.mock('electron', () => ({
  shell: { openExternal: async (url: string) => { opened.push(url) } },
  safeStorage: {
    // The one edge this suite moves. `encryptString` still works, so a regression that
    // dropped the availability check would be caught by the assertions rather than by
    // an incidental crash.
    isEncryptionAvailable: () => keychain.available,
    encryptString: (plain: string) => Buffer.from(`enc:${plain}`, 'utf-8'),
    decryptString: (blob: Buffer) => blob.toString('utf-8').replace(/^enc:/, ''),
  },
}))

vi.mock('../config/config', () => ({
  CONFIG_DIR: TEST_CONFIG_DIR,
  readConfig: () => ({ version: '1.0.0', integrations: { github: true } }),
  setIntegration: (name: string, enabled: boolean) => {
    const config = { version: '1.0.0', integrations: { github: true, [name]: enabled } }
    writtenConfigs.push(config)
    return config
  },
}))

vi.mock('../hooks/status-server', () => ({ getServerPort: () => 51234 }))

vi.mock('./constants', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./constants')>()),
  ATLASSIAN_CLIENT_ID: 'test-client-id',
}))

import { beginConnect, completeConnect, disconnect, getStatus, setStatusListener } from './connect'

const CREDENTIAL_FILE = path.join(TEST_CONFIG_DIR, 'jira-credential.enc')

const ACCESS_TOKEN = 'access-token-1'
const REFRESH_TOKEN = 'refresh-token-1'
const SITE = { id: 'cloud-1', url: 'https://acme.atlassian.net', name: 'Acme' }

const ok = (body: unknown) => ({ ok: true, status: 200, json: async () => body })

/** The sites Atlassian reports. Emptied by the one test that needs a generic failure. */
let sites: unknown[] = [SITE]

const emissions: { status: JiraAuthStatus; reason?: JiraDisconnectReason }[] = []

beforeEach(() => {
  fs.rmSync(TEST_CONFIG_DIR, { recursive: true, force: true })
  fs.mkdirSync(TEST_CONFIG_DIR, { recursive: true })
  keychain.available = true
  opened.length = 0
  writtenConfigs.length = 0
  sites = [SITE]

  vi.stubGlobal('fetch', async (url: string) => {
    if (url.endsWith('/api/atlassian/token')) {
      return ok({ access_token: ACCESS_TOKEN, refresh_token: REFRESH_TOKEN, expires_in: 3600 })
    }
    if (url.endsWith('/oauth/token/accessible-resources')) return ok(sites)
    if (url.includes('/rest/api/3/myself')) return ok({ displayName: 'Ada Lovelace', accountId: 'acc-1' })
    throw new Error(`unexpected request to ${url}`)
  })

  // `connect.ts` caches the credential in module state, which outlives a test.
  disconnect()
  setStatusListener((status, reason) => { emissions.push({ status, reason }) })
  emissions.length = 0
})

afterEach(() => {
  fs.rmSync(TEST_CONFIG_DIR, { recursive: true, force: true })
})

/** Click, browser, callback, exchange — the real flow, however it ends. */
async function runConnectFlow(): Promise<void> {
  await beginConnect()
  const state = new URL(opened[opened.length - 1]).searchParams.get('state') ?? ''
  await completeConnect({ code: 'authorization-code', state: state.split('.')[0] })
}

describe('connecting with no OS keychain', () => {
  it('fails with the keychain reason, claims nothing, and stores nothing', async () => {
    keychain.available = false

    await runConnectFlow()

    // The stated reason: its own code, so the renderer can say what is actually wrong.
    expect(emissions).toHaveLength(1)
    expect(emissions[0].reason).toBe('keychain')

    // And the UI never claims to be connected — in the push, and in the status any
    // later read of Settings would get.
    expect(emissions[0].status.connected).toBe(false)
    expect(getStatus().connected).toBe(false)

    // Nothing was written: no credential file, and no `integrations.atlassian` flag
    // (which is synchronised to the cloud store, so it would outlive the failure).
    expect(fs.existsSync(CREDENTIAL_FILE), 'no credential on disk').toBe(false)
    expect(writtenConfigs).toEqual([])
  })

  it('is told apart from a generic failure', async () => {
    // Same flow, same failure point in the sense that nothing gets stored — but the
    // cause is the Atlassian account, not this machine, and the message must differ.
    sites = []

    await runConnectFlow()

    expect(emissions).toHaveLength(1)
    expect(emissions[0].reason).toBe('failed')
    expect(emissions[0].status.connected).toBe(false)
    expect(fs.existsSync(CREDENTIAL_FILE)).toBe(false)
  })

  it('connects normally as soon as the keychain is back', async () => {
    // The control: without it, everything above would still pass on a flow that had
    // stopped working entirely.
    keychain.available = false
    await runConnectFlow()
    keychain.available = true
    emissions.length = 0

    await runConnectFlow()

    expect(getStatus()).toMatchObject({ connected: true, siteUrl: SITE.url })
    expect(emissions.map((e) => e.reason)).toEqual([undefined])
    expect(fs.existsSync(CREDENTIAL_FILE)).toBe(true)
  })
})
