import * as crypto from 'crypto'
import * as fs from 'fs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// push.ts over the real identity store, remote mode, question store and crypto, with only the
// machine's edges faked: the keychain, the session, the Supabase client, the terminals and
// fetch. The phone is simulated with `openPush`, which the vectors pin to the Swift side.

const h = vi.hoisted(() => ({
  TEST_CONFIG_DIR: `${(process.env.TMPDIR || '/tmp').replace(/\/$/, '')}/magic-slash-remote-push-test`,
  userId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' as string | null,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client: null as any,
  terminals: new Map<string, unknown>(),
}))

vi.mock('electron', () => ({
  safeStorage: {
    isEncryptionAvailable: () => true,
    encryptString: (plain: string) => Buffer.from(`enc:${plain}`, 'utf-8'),
    decryptString: (blob: Buffer) => blob.toString('utf-8').replace(/^enc:/, ''),
  },
}))
vi.mock('../config/paths', () => ({ CONFIG_DIR: h.TEST_CONFIG_DIR }))
vi.mock('../cloud/auth', () => ({ getAuthedClient: vi.fn(async () => h.client) }))
vi.mock('../cloud/session-store', () => ({
  loadSession: () => (h.userId ? { access_token: 'stale', user: { id: h.userId } } : null),
}))
vi.mock('../pty/terminal-manager', () => ({ getTerminal: (id: string) => h.terminals.get(id) }))

import { openPush, pushAad, type PushPayload } from './crypto'
import { addDevice, loadOrCreateIdentity } from './identity-store'
import { clearRemotePushCooldown, __resetRemotePushForTests, sendRemotePush, truncateQuestion } from './push'
import { setRemoteModeEnabled } from './remote-mode'
import { clearTerminalOwners, recordTerminalOwner } from './terminal-owners'
import { clearAllPendingQuestions, setFromAskQuestion } from '../questions/pending-questions'

interface Phone {
  phoneId: string
  pairingId: string
  pushKey: Buffer
}

let macId: string
let phones: Phone[]
let fetchMock: ReturnType<typeof vi.fn>
let statuses: number[]

function makeClient() {
  return {
    auth: {
      getSession: vi.fn(async () => ({ data: { session: { access_token: 'access-token' } }, error: null })),
      refreshSession: vi.fn(async () => ({ data: { session: { access_token: 'fresh-token' } }, error: null })),
    },
  }
}

/** One phone with a push key and one without (paired before it sent one). */
function seed(): void {
  macId = loadOrCreateIdentity(h.userId!).macId
  phones = [0, 1].map(() => ({ phoneId: crypto.randomUUID(), pairingId: crypto.randomUUID(), pushKey: crypto.randomBytes(32) }))
  addDevice(h.userId!, { phoneId: phones[0].phoneId, name: 'iPhone', pub: 'BAAA', pairedAt: 1, pairingId: phones[0].pairingId, pushKey: phones[0].pushKey.toString('base64') })
  addDevice(h.userId!, { phoneId: phones[1].phoneId, name: 'Old iPhone', pub: 'BAAA', pairedAt: 1, pairingId: phones[1].pairingId })
}

/** The requests posted, parsed. */
function posted(): { url: string; auth: string; body: { phoneId: string; macId: string; kind: string; box: string } }[] {
  return fetchMock.mock.calls.map(([url, init]) => ({
    url,
    auth: init.headers.Authorization,
    body: JSON.parse(init.body),
  }))
}

/** What the phone's extension reads from a box. */
function openAs(phone: Phone, box: string, kind: 'waiting' | 'completed'): PushPayload | null {
  const plain = openPush(phone.pushKey, Buffer.from(box, 'base64'), pushAad({ macId, phoneId: phone.phoneId, pairingId: phone.pairingId, kind }))
  return plain && (JSON.parse(plain.toString('utf8')) as PushPayload)
}

const push = (id: string, kind: 'waiting' | 'completed') => sendRemotePush(id, kind, { fetch: fetchMock as unknown as typeof fetch, questionWaitMs: 0 })

beforeEach(() => {
  fs.rmSync(h.TEST_CONFIG_DIR, { recursive: true, force: true })
  h.userId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
  h.client = makeClient()
  h.terminals.clear()
  h.terminals.set('claude-1', { id: 'claude-1', name: 'Claude 1', metadata: { ticketId: 'PROJ-12', title: 'refunds' }, repositories: [] })
  clearTerminalOwners()
  recordTerminalOwner('claude-1', h.userId)
  clearAllPendingQuestions()
  __resetRemotePushForTests()
  statuses = []
  fetchMock = vi.fn(async () => ({ status: statuses.shift() ?? 200 }))
  setRemoteModeEnabled(true)
  seed()
})

afterEach(() => {
  fs.rmSync(h.TEST_CONFIG_DIR, { recursive: true, force: true })
})

describe('sendRemotePush', () => {
  it('posts one box per phone with a push key, which only that phone opens, under that kind', async () => {
    await push('claude-1', 'completed')
    const requests = posted()
    expect(requests).toHaveLength(1)
    const [request] = requests
    expect(request.url).toBe('https://app.magic-slash.io/api/push')
    expect(request.auth).toBe('Bearer access-token')
    expect(request.body).toMatchObject({ phoneId: phones[0].phoneId, macId, kind: 'completed' })
    // Standard padded base64, never base64url.
    expect(request.body.box).toMatch(/^[A-Za-z0-9+/]+={0,2}$/)
    const payload = openAs(phones[0], request.body.box, 'completed')!
    expect(payload).toMatchObject({ kind: 'completed', appAgentId: 'claude-1' })
    expect(payload.body).toContain('PROJ-12')
    expect(typeof payload.sentAt).toBe('number')
    // Bound to its kind and its pairing: neither opens it.
    expect(openAs(phones[0], request.body.box, 'waiting')).toBeNull()
    expect(openAs({ ...phones[0], pairingId: crypto.randomUUID() }, request.body.box, 'completed')).toBeNull()
    // Nothing readable rides in clear.
    expect(JSON.stringify(request.body)).not.toContain('PROJ-12')
  })

  it('makes the pending question the body of a waiting push, cut short, the agent in the title', async () => {
    const long = `Which database should the refunds go to? ${'x'.repeat(300)}`
    setFromAskQuestion('claude-1', { hook_event_name: 'PreToolUse', tool_input: { questions: [{ question: long, options: [{ label: 'a' }, { label: 'b' }] }] } })
    await push('claude-1', 'waiting')
    const payload = openAs(phones[0], posted()[0].body.box, 'waiting')!
    expect(payload.title).toContain('PROJ-12')
    expect(payload.body.startsWith('Which database')).toBe(true)
    expect(Array.from(payload.body)).toHaveLength(180)
    expect(payload.body.endsWith('…')).toBe(true)
  })

  it('waits for a question that lands just after the state', async () => {
    setTimeout(() => setFromAskQuestion('claude-1', { hook_event_name: 'PreToolUse', tool_input: { questions: [{ question: 'Which branch?', options: [{ label: 'main' }] }] } }), 50)
    await sendRemotePush('claude-1', 'waiting', { fetch: fetchMock as unknown as typeof fetch, questionWaitMs: 1_000 })
    expect(openAs(phones[0], posted()[0].body.box, 'waiting')!.body).toBe('Which branch?')
  })

  it('falls back to the desktop sentence when no question comes', async () => {
    await push('claude-1', 'waiting')
    const payload = openAs(phones[0], posted()[0].body.box, 'waiting')!
    expect(payload.body).toContain('PROJ-12')
  })

  it('sends the same notification once per 30 s, per terminal and kind', async () => {
    await push('claude-1', 'waiting')
    await push('claude-1', 'waiting')
    await push('claude-1', 'completed')
    expect(posted().map((r) => r.body.kind)).toEqual(['waiting', 'completed'])
    const now = Date.now()
    vi.spyOn(Date, 'now').mockReturnValue(now + 30_000)
    try {
      await push('claude-1', 'waiting')
    } finally {
      vi.mocked(Date.now).mockRestore()
    }
    expect(posted()).toHaveLength(3)
  })

  it('rings again for a second question once the agent left waiting, even within 30 s', async () => {
    await push('claude-1', 'waiting')
    clearRemotePushCooldown('claude-1', 'waiting')
    await push('claude-1', 'waiting')
    expect(posted().map((r) => r.body.kind)).toEqual(['waiting', 'waiting'])
  })

  it('keeps no cooldown when nothing could go out for want of a session', async () => {
    const client = h.client
    h.client = null
    try {
      await push('claude-1', 'completed')
    } finally {
      h.client = client
    }
    await push('claude-1', 'completed')
    expect(posted()).toHaveLength(1)
  })

  it('retries once with a refreshed token on a 401, and no more', async () => {
    statuses = [401, 200]
    await push('claude-1', 'completed')
    expect(posted().map((r) => r.auth)).toEqual(['Bearer access-token', 'Bearer fresh-token'])
    expect(h.client.auth.refreshSession).toHaveBeenCalledTimes(1)

    __resetRemotePushForTests()
    fetchMock.mockClear()
    statuses = [401, 401]
    await push('claude-1', 'completed')
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('swallows a failure and logs no content', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      fetchMock.mockRejectedValueOnce(new TypeError('fetch failed'))
      await expect(push('claude-1', 'completed')).resolves.toBeUndefined()
      __resetRemotePushForTests()
      statuses = [502]
      await push('claude-1', 'completed')
      const logged = JSON.stringify(warn.mock.calls)
      expect(logged).toContain('502')
      expect(logged).not.toContain('PROJ-12')
    } finally {
      warn.mockRestore()
    }
  })

  it('sends nothing with remote mode off, signed out, for another account\'s terminal, or with no push key', async () => {
    setRemoteModeEnabled(false)
    await push('claude-1', 'completed')
    setRemoteModeEnabled(true)

    h.userId = null
    await push('claude-1', 'completed')
    h.userId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'

    recordTerminalOwner('claude-2', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb')
    await push('claude-2', 'completed')

    fs.rmSync(h.TEST_CONFIG_DIR, { recursive: true, force: true })
    setRemoteModeEnabled(true)
    loadOrCreateIdentity(h.userId)
    addDevice(h.userId, { phoneId: phones[1].phoneId, name: 'Old iPhone', pub: 'BAAA', pairedAt: 1, pairingId: phones[1].pairingId })
    await push('claude-1', 'completed')

    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('truncateQuestion', () => {
  it('keeps a short question, folds whitespace, and never splits an emoji', () => {
    expect(truncateQuestion('  Which\n branch? ')).toBe('Which branch?')
    expect(Array.from(truncateQuestion('🙂'.repeat(200)))).toHaveLength(180)
  })
})
