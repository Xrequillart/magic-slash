import * as crypto from 'crypto'
import * as fs from 'fs'
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest'

// The relay end to end over the real crypto, envelope, pairing, snapshot and identity store,
// with only the machine's edges faked: the keychain, the Supabase client and its channel (in
// plan-live.test.ts's style), the session and the terminals. The phones are simulated with
// crypto.ts, which the vectors pin to the Swift side.

interface FakeChannel {
  topic: string
  opts: unknown
  on: ReturnType<typeof vi.fn>
  subscribe: ReturnType<typeof vi.fn>
  track: ReturnType<typeof vi.fn>
  untrack: ReturnType<typeof vi.fn>
  send: ReturnType<typeof vi.fn>
}

const h = vi.hoisted(() => ({
  TEST_CONFIG_DIR: `${(process.env.TMPDIR || '/tmp').replace(/\/$/, '')}/magic-slash-remote-relay-test`,
  channels: [] as FakeChannel[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client: null as any,
  userId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' as string | null,
  blockers: new Set<number>(),
  nextBlocker: 1,
  terminals: [] as unknown[],
  keychain: true,
  chats: new Map<string, unknown>(),
}))

vi.mock('electron', () => ({
  safeStorage: {
    isEncryptionAvailable: () => h.keychain,
    encryptString: (plain: string) => Buffer.from(`enc:${plain}`, 'utf-8'),
    decryptString: (blob: Buffer) => blob.toString('utf-8').replace(/^enc:/, ''),
  },
  powerSaveBlocker: {
    start: vi.fn(() => {
      const id = h.nextBlocker++
      h.blockers.add(id)
      return id
    }),
    stop: vi.fn((id: number) => h.blockers.delete(id)),
    isStarted: (id: number) => h.blockers.has(id),
  },
}))
vi.mock('../config/paths', () => ({ CONFIG_DIR: h.TEST_CONFIG_DIR }))
vi.mock('../cloud/auth', () => ({ getAuthedClient: vi.fn(async () => h.client) }))
vi.mock('../cloud/session-store', () => ({
  loadSession: () => (h.userId ? { access_token: 'access-token', user: { id: h.userId } } : null),
}))
vi.mock('../pty/terminal-manager', () => ({ getAllTerminals: () => h.terminals }))
vi.mock('../chat/transcript-watcher', () => ({
  getChatSnapshot: (id: string) => h.chats.get(id) ?? { entries: [], queue: [], background: [] },
}))

import { deriveKey, generateKeyPair, sign, type RelayKeyPair } from './crypto'
import { answerPendingQuestion } from '../questions/answer-question'
import {
  answerHeld,
  clearAllPendingQuestions,
  clearPendingQuestion,
  getPendingQuestion,
  holdAsk,
  setFromAskQuestion,
  setFromNotification,
} from '../questions/pending-questions'
import { openEnvelope, sealEnvelope, type RelayEnvelope } from './envelope'
import { addDevice, listDevices, loadIdentity, loadOrCreateIdentity, saveIdentity } from './identity-store'
import {
  __resetRemoteRelayForTests,
  approveRemotePairing,
  cancelRemotePairing,
  getRemoteState,
  notifyRemoteChat,
  notifyRemoteState,
  resumeRemoteRelay,
  revokeRemoteDevice,
  setRemoteAnswerer,
  setRemoteEmitters,
  setRemoteEnabled,
  setRemotePrompter,
  setRemoteStopper,
  startRemotePairing,
  suspendRemoteRelay,
  type RemoteAnswerer,
  type RemotePrompter,
  type RemoteStopper,
} from './relay'
import { runRemotePrompt, runRemoteStop } from './agent-control'
import { setRemoteModeEnabled } from './remote-mode'
import { clearTerminalOwners, recordTerminalOwner } from './terminal-owners'
import type { RemotePairing, TerminalState } from '../../types'

function fakeChannel(topic: string, opts: unknown): FakeChannel {
  const channel: FakeChannel = {
    topic,
    opts,
    on: vi.fn(),
    subscribe: vi.fn(),
    track: vi.fn().mockResolvedValue('ok'),
    untrack: vi.fn().mockResolvedValue('ok'),
    send: vi.fn().mockResolvedValue('ok'),
  }
  channel.on.mockReturnValue(channel)
  channel.subscribe.mockReturnValue(channel)
  return channel
}

function makeClient() {
  return {
    channel: vi.fn((topic: string, opts?: unknown) => {
      const channel = fakeChannel(topic, opts)
      h.channels.push(channel)
      return channel
    }),
    removeChannel: vi.fn().mockResolvedValue('ok'),
    realtime: { setAuth: vi.fn() },
    auth: { onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })) },
  }
}

interface Phone {
  id: string
  keys: RelayKeyPair
}

interface PairedPhone extends Phone {
  pairingId: string
  /** The phone's command-signing key (§3). */
  signing: RelayKeyPair
}

/** A snapshot as the phone reads it once opened (§5). */
interface OpenedSnapshot {
  pairingId: string
  generation: number
  bootId: string
  sentAt: number
  agents: { appAgentId: string; question: { token: string; kind: string; unsupported: boolean; questions: unknown[] } | null }[]
}

const tick = () => new Promise((resolve) => setTimeout(resolve, 5))

/** Every envelope broadcast on a channel. */
function sentOn(channel: FakeChannel): RelayEnvelope[] {
  return channel.send.mock.calls.map(([message]) => {
    expect(message).toMatchObject({ type: 'broadcast', event: 'relay' })
    return message.payload as RelayEnvelope
  })
}

/** Join the channel the relay asked for and acknowledge its presence. */
async function goLive(channel: FakeChannel): Promise<void> {
  const status = channel.subscribe.mock.calls[0][0] as (s: string) => void
  status('SUBSCRIBED')
  await tick()
}

function broadcast(channel: FakeChannel, payload: unknown): void {
  const call = channel.on.mock.calls.find(([type, filter]) => type === 'broadcast' && filter.event === 'relay')
  ;(call![2] as (m: { payload: unknown }) => void)({ payload })
}

/** The phone's own view: the key it derives from its private key and the Mac's public one. */
function phoneKey(phone: Phone, macId: string, macPub: Buffer): Buffer {
  return deriveKey(phone.keys.privateKey, macPub, macId, phone.id)
}

let pairings: (RemotePairing | null)[]
/** What the answer path typed, terminal by terminal, as main/index.ts's `writeToTerminal` would. */
let typed: [string, string][]
let answerer: Mock<RemoteAnswerer>
let prompter: Mock<RemotePrompter>
let stopper: Mock<RemoteStopper>
/** What the prompt path submitted, and the drafts a stop handed back, as main/index.ts would. */
let submitted: [string, string][]
let restored: [string, string][]
/** What `interruptTerminal` answers: the prompt Claude Code took back, if any. */
let takenBack: string | null

beforeEach(async () => {
  fs.rmSync(h.TEST_CONFIG_DIR, { recursive: true, force: true })
  h.channels = []
  h.client = makeClient()
  h.userId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
  h.keychain = true
  h.chats.clear()
  h.terminals = [
    { id: 'claude-1', name: 'Agent 1', state: 'working', metadata: { title: 'PROJ-12: refunds' } },
    { id: 'script-dev', name: 'dev', state: 'working', metadata: {} },
  ]
  clearTerminalOwners()
  recordTerminalOwner('claude-1', h.userId)
  pairings = []
  typed = []
  clearAllPendingQuestions()
  // main/index.ts's `answerQuestion`, over the real store and answer path; only the PTY is fake.
  answerer = vi.fn<RemoteAnswerer>((id, token, choice) =>
    answerPendingQuestion(id, token, choice, {
      getQuestion: getPendingQuestion,
      answerHeld,
      write: (terminal, keys) => {
        typed.push([terminal, keys])
        return true
      },
      clear: clearPendingQuestion,
      wait: () => Promise.resolve(),
    }))
  setRemoteAnswerer(answerer)
  // main/index.ts's `promptFromRemote` and `stopFromRemote`, over the real rules; only the
  // terminals are fake.
  submitted = []
  restored = []
  takenBack = null
  const stateOf = (id: string) => (h.terminals as { id: string; state: TerminalState }[]).find((t) => t.id === id)?.state
  prompter = vi.fn<RemotePrompter>((id, text, stillWanted) =>
    runRemotePrompt(id, text, {
      state: stateOf,
      hasQuestion: (terminal) => getPendingQuestion(terminal) !== undefined,
      submit: async (terminal, bytes, wanted) => {
        if (!wanted()) return false
        submitted.push([terminal, bytes])
        return true
      },
    }, stillWanted))
  stopper = vi.fn<RemoteStopper>((id) =>
    runRemoteStop(id, {
      state: stateOf,
      interrupt: async (terminal) => {
        typed.push([terminal, '\x1b'])
        return { draft: takenBack }
      },
      clearQuestion: clearPendingQuestion,
      restoreDraft: (terminal, text) => restored.push([terminal, text]),
    }))
  setRemotePrompter(prompter)
  setRemoteStopper(stopper)
  setRemoteEmitters(null)
  await __resetRemoteRelayForTests()
  h.blockers.clear()
  setRemoteEmitters({ state: () => {}, pairing: (p) => pairings.push(p) })
})

afterEach(async () => {
  await __resetRemoteRelayForTests()
  fs.rmSync(h.TEST_CONFIG_DIR, { recursive: true, force: true })
})

/** Two phones already paired with this Mac's (pre-created) identity. */
function seedPairedPhones(): { macId: string; macPub: Buffer; phones: PairedPhone[] } {
  const identity = loadOrCreateIdentity(h.userId!)
  const phones = [0, 1].map(() => ({
    id: crypto.randomUUID(),
    keys: generateKeyPair(),
    pairingId: crypto.randomUUID(),
    signing: generateKeyPair(),
  }))
  for (const phone of phones) {
    addDevice(h.userId!, {
      phoneId: phone.id,
      name: `iPhone ${phone.id.slice(0, 4)}`,
      pub: phone.keys.publicRaw.toString('base64'),
      pairedAt: 1,
      pairingId: phone.pairingId,
      signPub: phone.signing.publicRaw.toString('base64'),
    })
  }
  const ecdh = crypto.createECDH('prime256v1')
  ecdh.setPrivateKey(Buffer.from(identity.macPrivate, 'hex'))
  return { macId: identity.macId, macPub: ecdh.getPublicKey(), phones }
}

describe('remote mode off', () => {
  it('joins nothing, offers no QR and sends nothing', async () => {
    seedPairedPhones()
    await resumeRemoteRelay()
    notifyRemoteState()
    await tick()
    expect(await startRemotePairing()).toBeNull()
    expect(h.client.channel).not.toHaveBeenCalled()
    expect(h.client.realtime.setAuth).not.toHaveBeenCalled()
    expect(getRemoteState()).toMatchObject({ enabled: false, status: 'off' })
    expect(h.blockers.size).toBe(0)
  })

  it('a live channel that drops and stays down is left, so the next check joins again', async () => {
    await setRemoteEnabled(true)
    await goLive(h.channels[0])
    vi.useFakeTimers()
    try {
      ;(h.channels[0].subscribe.mock.calls[0][0] as (s: string) => void)('CLOSED')
      expect(getRemoteState().status).toBe('reconnecting')
      await vi.advanceTimersByTimeAsync(15_000)
      expect(h.client.removeChannel).toHaveBeenCalledWith(h.channels[0])
      await resumeRemoteRelay()
      expect(h.client.channel).toHaveBeenCalledTimes(2)
    } finally {
      vi.useRealTimers()
    }
  })

  it('switching it off leaves the channel and lets the power blocker go', async () => {
    await setRemoteEnabled(true)
    expect(h.blockers.size).toBe(1)
    await goLive(h.channels[0])
    await setRemoteEnabled(false)
    expect(h.client.removeChannel).toHaveBeenCalledWith(h.channels[0])
    expect(h.blockers.size).toBe(0)
    expect(getRemoteState().status).toBe('off')
  })
})

describe('remote mode on', () => {
  it('joins the private relay channel with the mac presence key, authorized first', async () => {
    const { macId } = seedPairedPhones()
    await setRemoteEnabled(true)
    expect(h.client.realtime.setAuth).toHaveBeenCalledWith('access-token')
    expect(h.channels).toHaveLength(1)
    expect(h.channels[0].topic).toBe(`relay:${h.userId}`)
    expect(h.channels[0].opts).toEqual({ config: { private: true, presence: { key: `mac:${macId}` }, broadcast: { self: false } } })
    expect(getRemoteState().status).toBe('reconnecting')
    await goLive(h.channels[0])
    expect(h.channels[0].track).toHaveBeenCalledWith({})
    expect(getRemoteState()).toMatchObject({ enabled: true, status: 'live' })
    expect(getRemoteState().devices).toHaveLength(2)
  })

  it('seals one snapshot per paired phone, each openable only with that phone\'s key', async () => {
    const { macId, macPub, phones } = seedPairedPhones()
    await setRemoteEnabled(true)
    await goLive(h.channels[0])
    const envelopes = sentOn(h.channels[0])
    expect(envelopes.map((e) => e.to).sort()).toEqual(phones.map((p) => p.id).sort())
    expect(envelopes.map((e) => e.seq)).toEqual([1, 2])
    expect(new Set(envelopes.map((e) => e.epoch)).size).toBe(1)
    for (const envelope of envelopes) {
      expect(envelope).toMatchObject({ v: 1, type: 'state', from: macId })
      const mine = phones.find((p) => p.id === envelope.to)!
      const other = phones.find((p) => p.id !== envelope.to)!
      const snapshot = openEnvelope(envelope, phoneKey(mine, macId, macPub)) as OpenedSnapshot
      expect(snapshot.agents.map((a) => a.appAgentId)).toEqual(['claude-1'])
      // Named by that phone's pairing, and ordered by the relay's generation (§5, §6).
      expect(snapshot.pairingId).toBe(mine.pairingId)
      expect(snapshot.generation).toBe(1)
      // This launch's, which a `prompt` or `stop` quotes (§10).
      expect(snapshot.bootId).toMatch(/^[0-9a-f-]{36}$/)
      expect(typeof snapshot.sentAt).toBe('number')
      expect(openEnvelope(envelope, deriveKey(other.keys.privateKey, macPub, macId, envelope.to))).toBeNull()
      // Nothing readable rides in clear.
      expect(JSON.stringify(envelope)).not.toContain('PROJ-12')
    }
  })

  it('sends a state change at once', async () => {
    seedPairedPhones()
    await setRemoteEnabled(true)
    await goLive(h.channels[0])
    h.channels[0].send.mockClear()
    notifyRemoteState()
    await tick()
    expect(h.channels[0].send).toHaveBeenCalledTimes(2)
  })

  it('a revoked phone is sent `revoked`, then nothing further', async () => {
    const { macId, macPub, phones } = seedPairedPhones()
    const [revoked, kept] = phones
    await setRemoteEnabled(true)
    await goLive(h.channels[0])
    h.channels[0].send.mockClear()

    const state = await revokeRemoteDevice(revoked.id)
    expect(state.devices.map((d) => d.phoneId)).toEqual([kept.id])
    const [goodbye] = sentOn(h.channels[0])
    expect(goodbye).toMatchObject({ type: 'revoked', to: revoked.id, from: macId })
    // Names the pairing it ends (§8): the phone drops a `revoked` for any other one.
    expect(openEnvelope(goodbye, phoneKey(revoked, macId, macPub))).toEqual({ pairingId: revoked.pairingId })

    h.channels[0].send.mockClear()
    notifyRemoteState()
    await tick()
    expect(sentOn(h.channels[0]).map((e) => e.to)).toEqual([kept.id])
    // And after a restart, from the file.
    await __resetRemoteRelayForTests()
    expect(getRemoteState().devices.map((d) => d.phoneId)).toEqual([kept.id])
  })

  it('pairs through the channel, ignoring envelopes addressed to another Mac', async () => {
    await setRemoteEnabled(true)
    const channel = h.channels[0]
    await goLive(channel)
    const pairing = await startRemotePairing()
    expect(pairing?.phase).toBe('waiting')
    const qr = JSON.parse(pairing!.qr!) as { macId: string; pub: string; token: string }
    const macPub = Buffer.from(qr.pub, 'base64')
    const phone = { id: crypto.randomUUID(), keys: generateKeyPair() }
    const key = phoneKey(phone, qr.macId, macPub)
    const request = (to: string) => ({
      ...sealEnvelope({ type: 'pair-request', from: phone.id, to, epoch: crypto.randomUUID(), seq: 1 }, key, { token: qr.token, name: 'iPhone' }),
      phonePub: phone.keys.publicRaw.toString('base64'),
    })

    broadcast(channel, request('22222222-2222-4222-8222-222222222222'))
    broadcast(channel, { garbage: true })
    expect(pairings.at(-1)?.phase).toBe('waiting')

    const req = request(qr.macId)
    broadcast(channel, req)
    expect(pairings.at(-1)).toMatchObject({ phase: 'confirm', deviceName: 'iPhone' })
    channel.send.mockClear()
    await approveRemotePairing()
    await tick()
    const [accepted, state] = sentOn(channel)
    expect(accepted).toMatchObject({ type: 'pair-accepted', to: phone.id, from: qr.macId })
    const [stored] = listDevices(h.userId!)
    expect(stored.pairingId).toMatch(/^[0-9a-f-]{36}$/)
    expect(openEnvelope(accepted, key)).toEqual({ macName: getRemoteState().macName, requestEpoch: req.epoch, pairingId: stored.pairingId })
    expect(state).toMatchObject({ type: 'state', to: phone.id })
    expect((openEnvelope(state, key) as OpenedSnapshot).pairingId).toBe(stored.pairingId)
    expect(state.seq).toBeGreaterThan(accepted.seq)
    expect(getRemoteState().devices.map((d) => d.phoneId)).toEqual([phone.id])
  })

  it('offers no QR while the relay is not live', async () => {
    await setRemoteEnabled(true)
    expect(getRemoteState().status).toBe('reconnecting')
    expect(await startRemotePairing()).toBeNull()
    expect(pairings).toEqual([])
  })

  /** A pairing brought to its confirmation on a live channel. */
  async function confirmPairing(): Promise<{ channel: FakeChannel; phoneId: string }> {
    await setRemoteEnabled(true)
    const channel = h.channels[0]
    await goLive(channel)
    const pairing = await startRemotePairing()
    const qr = JSON.parse(pairing!.qr!) as { macId: string; pub: string; token: string }
    const phone = { id: crypto.randomUUID(), keys: generateKeyPair() }
    const key = phoneKey(phone, qr.macId, Buffer.from(qr.pub, 'base64'))
    broadcast(channel, {
      ...sealEnvelope({ type: 'pair-request', from: phone.id, to: qr.macId, epoch: crypto.randomUUID(), seq: 1 }, key, { token: qr.token, name: 'iPhone' }),
      phonePub: phone.keys.publicRaw.toString('base64'),
    })
    expect(pairings.at(-1)?.phase).toBe('confirm')
    return { channel, phoneId: phone.id }
  }

  it('an approval whose pair-accepted is refused keeps no device and stays on the confirmation', async () => {
    const { channel, phoneId } = await confirmPairing()
    channel.send.mockClear()
    channel.send.mockResolvedValueOnce('error')
    await expect(approveRemotePairing()).rejects.toThrow('could not be reached')
    expect(sentOn(channel)).toMatchObject([{ type: 'pair-accepted', to: phoneId }])
    expect(getRemoteState().devices).toEqual([])
    expect(pairings.at(-1)?.phase).toBe('confirm')
    // And on disk, after a restart.
    await __resetRemoteRelayForTests()
    expect(getRemoteState().devices).toEqual([])
  })

  it('an approval after the relay dropped sends nothing and keeps no device', async () => {
    const { channel } = await confirmPairing()
    channel.send.mockClear()
    ;(channel.subscribe.mock.calls[0][0] as (s: string) => void)('CHANNEL_ERROR')
    expect(getRemoteState().status).toBe('reconnecting')
    await expect(approveRemotePairing()).rejects.toThrow('could not be reached')
    expect(channel.send).not.toHaveBeenCalled()
    expect(getRemoteState().devices).toEqual([])
    expect(pairings.at(-1)?.phase).toBe('confirm')
  })

  it('a sign-out leaves the channel and forgets the account', async () => {
    seedPairedPhones()
    await setRemoteEnabled(true)
    await goLive(h.channels[0])
    h.userId = null
    await suspendRemoteRelay()
    expect(h.client.removeChannel).toHaveBeenCalledWith(h.channels[0])
    expect(h.channels[0].untrack).toHaveBeenCalled()
    expect(getRemoteState()).toMatchObject({ status: 'signed-out', devices: [] })
    expect(await startRemotePairing()).toBeNull()
  })

  it('another account joins its own topic, without the previous account\'s phones', async () => {
    seedPairedPhones()
    await setRemoteEnabled(true)
    await goLive(h.channels[0])
    h.userId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
    await resumeRemoteRelay()
    expect(h.client.removeChannel).toHaveBeenCalledWith(h.channels[0])
    expect(h.channels[1].topic).toBe('relay:bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb')
    await goLive(h.channels[1])
    expect(getRemoteState().devices).toEqual([])
    expect(h.channels[1].send).not.toHaveBeenCalled()
  })

  it('after a refused session, the next account\'s phones see only that account\'s terminals', async () => {
    seedPairedPhones()
    await setRemoteEnabled(true)
    await goLive(h.channels[0])
    // The session is refused elsewhere: the relay is suspended, but the PTYs keep running.
    await suspendRemoteRelay()
    h.userId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
    const { macId, macPub, phones } = seedPairedPhones()
    h.terminals = [
      ...h.terminals,
      { id: 'claude-2', name: 'Agent 2', state: 'idle', metadata: { title: 'B: mine' } },
      { id: 'claude-3', name: 'Agent 3', state: 'idle', metadata: { title: 'nobody knows' } },
    ]
    recordTerminalOwner('claude-2', h.userId)
    await resumeRemoteRelay()
    await goLive(h.channels[1])
    const envelopes = sentOn(h.channels[1])
    expect(envelopes).toHaveLength(phones.length)
    for (const envelope of envelopes) {
      const phone = phones.find((p) => p.id === envelope.to)!
      const snapshot = openEnvelope(envelope, phoneKey(phone, macId, macPub)) as OpenedSnapshot
      // claude-1 is the previous account's, claude-3 has no recorded owner: neither is sent.
      expect(snapshot.agents.map((a) => a.appAgentId)).toEqual(['claude-2'])
    }
  })

  it('increments the generation on every relay start and persists it across launches', async () => {
    const { macId, macPub, phones } = seedPairedPhones()
    const generationSent = (channel: FakeChannel): number => {
      const envelope = sentOn(channel).find((e) => e.type === 'state' && e.to === phones[0].id)!
      return (openEnvelope(envelope, phoneKey(phones[0], macId, macPub)) as OpenedSnapshot).generation
    }
    await setRemoteEnabled(true)
    await goLive(h.channels[0])
    expect(generationSent(h.channels[0])).toBe(1)
    await setRemoteEnabled(false)
    await setRemoteEnabled(true)
    await goLive(h.channels[1])
    expect(generationSent(h.channels[1])).toBe(2)
    expect(h.channels[1].send.mock.calls[0][0].payload.epoch).not.toBe(h.channels[0].send.mock.calls[0][0].payload.epoch)
    expect(loadIdentity(h.userId!)?.generation).toBe(2)
    // A relaunch reads it back and goes above it.
    await __resetRemoteRelayForTests()
    await resumeRemoteRelay()
    await goLive(h.channels[2])
    expect(generationSent(h.channels[2])).toBe(3)
  })

  it('a generation that cannot be saved is still used, from memory', async () => {
    const { macId, macPub, phones } = seedPairedPhones()
    await setRemoteEnabled(true)
    await goLive(h.channels[0])
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    h.keychain = false
    await setRemoteEnabled(false)
    await setRemoteEnabled(true)
    await goLive(h.channels[1])
    const envelope = sentOn(h.channels[1]).find((e) => e.to === phones[0].id)!
    expect((openEnvelope(envelope, phoneKey(phones[0], macId, macPub)) as OpenedSnapshot).generation).toBe(2)
    expect(error).toHaveBeenCalledWith('[remote] failed to save the relay generation:', expect.any(String))
    error.mockRestore()
    h.keychain = true
    expect(loadIdentity(h.userId!)?.generation).toBe(1)
  })

  it('a stored device without a pairing id is dropped and never sealed for', async () => {
    const { phones } = seedPairedPhones()
    const identity = loadIdentity(h.userId!)!
    const legacy = { phoneId: crypto.randomUUID(), name: 'Old iPhone', pub: generateKeyPair().publicRaw.toString('base64'), pairedAt: 1 }
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    saveIdentity(h.userId!, { ...identity, devices: [...identity.devices, legacy as unknown as (typeof identity.devices)[number]] })
    await setRemoteEnabled(true)
    await goLive(h.channels[0])
    expect(getRemoteState().devices.map((d) => d.phoneId).sort()).toEqual(phones.map((p) => p.id).sort())
    expect(sentOn(h.channels[0]).map((e) => e.to)).not.toContain(legacy.phoneId)
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('without a pairing id'))
    warn.mockRestore()
  })

  it('cancels a pairing only by its own attempt id', async () => {
    await setRemoteEnabled(true)
    await goLive(h.channels[0])
    const first = await startRemotePairing()
    expect(first?.attemptId).toMatch(/^[0-9a-f-]{36}$/)
    expect(pairings.at(-1)?.attemptId).toBe(first!.attemptId)
    // A newer start replaces it without a `null` in between (that would close the dialog).
    const second = await startRemotePairing()
    expect(second?.attemptId).not.toBe(first!.attemptId)
    expect(pairings).not.toContain(null)
    expect(pairings.at(-1)?.attemptId).toBe(second!.attemptId)
    // The older attempt's late cleanup: nothing closes.
    cancelRemotePairing(first!.attemptId)
    expect(pairings).not.toContain(null)
    // Its own id closes it.
    cancelRemotePairing(second!.attemptId)
    expect(pairings.at(-1)).toBeNull()
    // And with nothing on screen, any id is a no-op.
    const count = pairings.length
    cancelRemotePairing(second!.attemptId)
    expect(pairings).toHaveLength(count)
  })

  it('cancels whatever is on screen when no attempt id is given', async () => {
    await setRemoteEnabled(true)
    await goLive(h.channels[0])
    await startRemotePairing()
    cancelRemotePairing()
    expect(pairings.at(-1)).toBeNull()
  })

  it('remote mode is read from disk at launch', async () => {
    setRemoteModeEnabled(true)
    await __resetRemoteRelayForTests()
    await resumeRemoteRelay()
    expect(h.channels).toHaveLength(1)
  })
})

describe('commands from a paired phone', () => {
  let macId: string
  let macPub: Buffer
  let phone: PairedPhone
  let other: PairedPhone
  let seq: number
  /** The launch id the phone read in its first snapshot. */
  let bootId: string

  /** What each action carries beside the common fields (§10). */
  const ACTION_FIELDS: Record<'answer' | 'prompt' | 'stop', () => Record<string, unknown>> = {
    answer: () => ({ token: 'none', choice: { kind: 'option', index: 0 } }),
    prompt: () => ({ text: 'Add a test for the refund', bootId }),
    stop: () => ({ bootId }),
  }

  /**
   * A command as the phone builds it (§10): payload serialized once, signed, sealed. An
   * `answer` unless `overrides.action` names another; `prompt` and `stop` quote the boot id
   * the phone read in its last snapshot.
   */
  function command(from: PairedPhone, overrides: Record<string, unknown> = {}, signer = from.signing.privateKey): RelayEnvelope {
    const action = (overrides.action ?? 'answer') as keyof typeof ACTION_FIELDS
    const payload = JSON.stringify({
      v: 1,
      action,
      macId,
      phoneId: from.id,
      pairingId: from.pairingId,
      commandId: crypto.randomUUID(),
      issuedAt: Date.now(),
      appAgentId: 'claude-1',
      ...(ACTION_FIELDS[action]?.() ?? {}),
      ...overrides,
    })
    const box = { payload, sig: sign(signer, Buffer.from(payload, 'utf8')).toString('base64') }
    seq += 1
    const header = { type: 'command' as const, from: from.id, to: macId, epoch: crypto.randomUUID(), seq }
    return sealEnvelope(header, phoneKey(from, macId, macPub), box)
  }

  /** The `command-result`s sealed for `to`, opened with its key. */
  function results(to: PairedPhone): { commandId: string; pairingId: string; ok: boolean; reason?: string }[] {
    return sentOn(h.channels[0])
      .filter((e) => e.type === 'command-result' && e.to === to.id)
      .map((e) => openEnvelope(e, phoneKey(to, macId, macPub)) as { commandId: string; pairingId: string; ok: boolean; reason?: string })
  }

  async function send(envelope: RelayEnvelope): Promise<void> {
    broadcast(h.channels[0], envelope)
    await tick()
  }

  function ask(questions: { question: string; options: { label: string }[]; multiSelect?: boolean }[]) {
    return { hook_event_name: 'PreToolUse', tool_input: { questions } }
  }

  const ONE = [{ question: 'Which branch?', options: [{ label: 'main' }, { label: 'develop' }, { label: 'staging' }] }]
  const TWO = [...ONE, { question: 'Which colours?', multiSelect: true, options: [{ label: 'Red' }, { label: 'Blue' }] }]

  beforeEach(async () => {
    const seeded = seedPairedPhones()
    macId = seeded.macId
    macPub = seeded.macPub
    ;[phone, other] = seeded.phones
    seq = 0
    await setRemoteEnabled(true)
    await goLive(h.channels[0])
    const first = sentOn(h.channels[0]).find((e) => e.type === 'state' && e.to === phone.id)!
    bootId = (openEnvelope(first, phoneKey(phone, macId, macPub)) as OpenedSnapshot).bootId
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('publishes the pending question in each snapshot, with its token', async () => {
    const question = setFromAskQuestion('claude-1', ask(ONE))!
    h.channels[0].send.mockClear()
    notifyRemoteState()
    await tick()
    const envelope = sentOn(h.channels[0]).find((e) => e.to === phone.id)!
    const snapshot = openEnvelope(envelope, phoneKey(phone, macId, macPub)) as OpenedSnapshot
    expect(snapshot.agents[0].question).toMatchObject({ token: question.token, kind: 'ask', unsupported: false })
    expect(snapshot.agents[0].question?.questions).toHaveLength(1)
  })

  it('types the chosen option into the agent\'s terminal and tells the phone it landed', async () => {
    const question = setFromAskQuestion('claude-1', ask(ONE))!
    const envelope = command(phone, { token: question.token, choice: { kind: 'option', index: 1 } })
    await send(envelope)
    expect(typed).toEqual([['claude-1', '\x1b[B'], ['claude-1', '\r']])
    expect(getPendingQuestion('claude-1')).toBeUndefined()
    const [result] = results(phone)
    expect(result).toEqual({ pairingId: phone.pairingId, commandId: expect.any(String), ok: true })
    // Sealed for that phone alone.
    expect(results(other)).toEqual([])
  })

  it('answers a question held for the chat through its hook, never the terminal', async () => {
    const { question, reply } = holdAsk('claude-1', ask(TWO))
    await send(command(phone, { token: question!.token, choice: { kind: 'answers', answers: ['develop', 'Red, Blue'] } }))
    const output = JSON.parse((await reply)!)
    expect(output.hookSpecificOutput.updatedInput.answers).toEqual({ 'Which branch?': 'develop', 'Which colours?': 'Red, Blue' })
    expect(typed).toEqual([])
    expect(results(phone)[0]).toMatchObject({ ok: true })
  })

  it('allows and denies a permission request', async () => {
    const allow = setFromNotification('claude-1', { message: 'Claude needs your permission to use Bash' })!
    await send(command(phone, { token: allow.token, choice: { kind: 'option', index: 0 } }))
    expect(typed).toEqual([['claude-1', '\r']])

    const deny = setFromNotification('claude-1', { message: 'Claude needs your permission to use Bash' })!
    await send(command(phone, { token: deny.token, choice: { kind: 'deny' } }))
    expect(typed).toEqual([['claude-1', '\r'], ['claude-1', '\x1b']])
    expect(results(phone).map((r) => r.ok)).toEqual([true, true])
  })

  it('tells the phone `stale` for a question already answered on the Mac, and types nothing', async () => {
    const question = setFromAskQuestion('claude-1', ask(ONE))!
    clearPendingQuestion('claude-1')
    await send(command(phone, { token: question.token }))
    // Replaced by a newer question: the old token is stale too.
    const replaced = setFromAskQuestion('claude-1', ask(ONE))!
    setFromAskQuestion('claude-1', ask(ONE))
    await send(command(phone, { token: replaced.token }))
    expect(typed).toEqual([])
    expect(results(phone).map((r) => r.reason)).toEqual(['stale', 'stale'])
  })

  it('tells the phone `stale` for a question past its 30 minutes', async () => {
    const question = setFromAskQuestion('claude-1', ask(ONE))!
    const realNow = Date.now
    const later = realNow() + 31 * 60 * 1000
    vi.spyOn(Date, 'now').mockImplementation(() => later)
    try {
      await send(command(phone, { token: question.token, issuedAt: later }))
    } finally {
      vi.mocked(Date.now).mockRestore()
    }
    expect(typed).toEqual([])
    expect(results(phone)[0]).toMatchObject({ ok: false, reason: 'stale' })
  })

  it('flags a question the terminal cannot answer as unsupported, and types nothing', async () => {
    // Two questions at once, typed into the TUI: the keystrokes cannot drive that.
    const question = setFromAskQuestion('claude-1', ask(TWO))!
    expect(question.unsupported).toBe(true)
    await send(command(phone, { token: question.token, choice: { kind: 'answers', answers: ['main', 'Red'] } }))
    await send(command(phone, { token: question.token, choice: { kind: 'option', index: 0 } }))
    expect(typed).toEqual([])
    expect(results(phone).map((r) => r.reason)).toEqual(['unsupported', 'unsupported'])
    expect(getPendingQuestion('claude-1')?.token).toBe(question.token)
  })

  it('answers `stale` for an agent of another account, or no agent at all, and types nothing', async () => {
    h.terminals = [...h.terminals, { id: 'claude-2', name: 'Theirs', state: 'waiting' }, { id: 'claude-3', name: 'Unowned', state: 'waiting' }]
    recordTerminalOwner('claude-2', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb')
    for (const id of ['claude-2', 'claude-3', 'script-dev']) {
      const question = setFromNotification(id, { message: 'Claude needs your permission to use Bash' })!
      await send(command(phone, { appAgentId: id, token: question.token }))
    }
    expect(answerer).not.toHaveBeenCalled()
    expect(typed).toEqual([])
    expect(results(phone).map((r) => r.reason)).toEqual(['stale', 'stale', 'stale'])
  })

  it('drops a revoked phone\'s command: no answer, and nothing sealed back', async () => {
    const question = setFromAskQuestion('claude-1', ask(ONE))!
    await revokeRemoteDevice(phone.id)
    h.channels[0].send.mockClear()
    await send(command(phone, { token: question.token }))
    expect(answerer).not.toHaveBeenCalled()
    expect(h.channels[0].send).not.toHaveBeenCalled()
    expect(getPendingQuestion('claude-1')).toBeDefined()
  })

  it('drops a command from an unknown sender, or whose box does not open', async () => {
    const question = setFromAskQuestion('claude-1', ask(ONE))!
    const stranger: PairedPhone = { id: crypto.randomUUID(), keys: generateKeyPair(), pairingId: crypto.randomUUID(), signing: generateKeyPair() }
    h.channels[0].send.mockClear()
    await send(command(stranger, { token: question.token }))
    // Sealed with another phone's key, under this phone's name.
    await send({ ...command(other, { token: question.token }), from: phone.id })
    expect(answerer).not.toHaveBeenCalled()
    expect(h.channels[0].send).not.toHaveBeenCalled()
  })

  it('rejects an unsigned or wrongly signed command, and types nothing', async () => {
    const question = setFromAskQuestion('claude-1', ask(ONE))!
    // Signed by the other phone's key.
    await send(command(phone, { token: question.token }, other.signing.privateKey))
    // A box with no signature at all.
    const unsigned = JSON.stringify({ v: 1, action: 'answer', commandId: crypto.randomUUID() })
    seq += 1
    await send(sealEnvelope({ type: 'command', from: phone.id, to: macId, epoch: crypto.randomUUID(), seq }, phoneKey(phone, macId, macPub), { payload: unsigned, sig: '' }))
    expect(answerer).not.toHaveBeenCalled()
    expect(typed).toEqual([])
    expect(results(phone).map((r) => r.reason)).toEqual(['rejected', 'rejected'])
  })

  it('asks a phone paired before commands existed to pair again', async () => {
    // The relay reads the identity once per account: start it afresh on the stored one.
    await __resetRemoteRelayForTests()
    const identity = loadIdentity(h.userId!)!
    saveIdentity(h.userId!, { ...identity, devices: identity.devices.map(({ signPub: _signPub, ...d }) => d) })
    await setRemoteEnabled(true)
    await goLive(h.channels[1])
    const question = setFromAskQuestion('claude-1', ask(ONE))!
    broadcast(h.channels[1], command(phone, { token: question.token }))
    await tick()
    expect(answerer).not.toHaveBeenCalled()
    const replies = sentOn(h.channels[1]).filter((e) => e.type === 'command-result')
    expect(replies.map((e) => openEnvelope(e, phoneKey(phone, macId, macPub)))).toEqual([
      { pairingId: phone.pairingId, commandId: expect.any(String), ok: false, reason: 're-pair' },
    ])
  })

  it('runs a replayed command once, and answers the replay with the first result', async () => {
    const question = setFromAskQuestion('claude-1', ask(ONE))!
    const envelope = command(phone, { token: question.token, choice: { kind: 'option', index: 2 } })
    await send(envelope)
    await send(envelope)
    expect(answerer).toHaveBeenCalledTimes(1)
    expect(typed).toEqual([['claude-1', '\x1b[B'], ['claude-1', '\x1b[B'], ['claude-1', '\r']])
    const [first, again] = results(phone)
    expect(again).toEqual(first)
    expect(first.ok).toBe(true)
  })

  it('submits a prompt to an idle agent, formatted as the desktop chat does, and tells the phone', async () => {
    h.terminals = [{ id: 'claude-1', name: 'Agent 1', state: 'idle' }]
    await send(command(phone, { action: 'prompt', text: 'first line\nsecond line' }))
    expect(prompter).toHaveBeenCalledWith('claude-1', 'first line\nsecond line', expect.any(Function))
    expect(submitted).toEqual([['claude-1', '\x1b[200~first line\nsecond line\x1b[201~']])
    expect(results(phone)).toEqual([{ pairingId: phone.pairingId, commandId: expect.any(String), ok: true }])
  })

  it('queues a prompt to a working agent, and the phone is told it was queued', async () => {
    await send(command(phone, { action: 'prompt', text: 'and then the docs' }))
    expect(submitted).toEqual([['claude-1', 'and then the docs']])
    expect(results(phone)[0]).toMatchObject({ ok: true, queued: true })
  })

  it('refuses a prompt `busy` while the agent waits on an answer, and types nothing', async () => {
    setFromAskQuestion('claude-1', ask(ONE))
    await send(command(phone, { action: 'prompt' }))
    h.terminals = [{ id: 'claude-1', name: 'Agent 1', state: 'waiting' }]
    clearPendingQuestion('claude-1')
    await send(command(phone, { action: 'prompt' }))
    expect(submitted).toEqual([])
    expect(results(phone).map((r) => r.reason)).toEqual(['busy', 'busy'])
  })

  it('refuses a shell line or a command that opens a dialog `unsupported`, and types nothing', async () => {
    h.terminals = [{ id: 'claude-1', name: 'Agent 1', state: 'idle' }]
    for (const text of ['!rm -rf build', '  ! ls', '/model', '/mcp']) await send(command(phone, { action: 'prompt', text }))
    expect(submitted).toEqual([])
    expect(results(phone).map((r) => r.reason)).toEqual(['unsupported', 'unsupported', 'unsupported', 'unsupported'])
  })

  it('stops a working agent, and hands a prompt it took back to the desktop chat', async () => {
    takenBack = 'the prompt it had not started on'
    await send(command(phone, { action: 'stop' }))
    expect(stopper).toHaveBeenCalledWith('claude-1')
    expect(typed).toEqual([['claude-1', '\x1b']])
    expect(restored).toEqual([['claude-1', 'the prompt it had not started on']])
    expect(results(phone)[0]).toMatchObject({ ok: true })
  })

  it('stops a waiting agent and forgets its question', async () => {
    h.terminals = [{ id: 'claude-1', name: 'Agent 1', state: 'waiting' }]
    setFromNotification('claude-1', { message: 'Claude needs your permission to use Bash' })
    await send(command(phone, { action: 'stop' }))
    expect(typed).toEqual([['claude-1', '\x1b']])
    expect(getPendingQuestion('claude-1')).toBeUndefined()
    expect(restored).toEqual([])
    expect(results(phone)[0]).toMatchObject({ ok: true })
  })

  it('answers `stale` to a stop on an idle agent, and sends no Escape', async () => {
    for (const state of ['idle', 'completed', 'error']) {
      h.terminals = [{ id: 'claude-1', name: 'Agent 1', state }]
      await send(command(phone, { action: 'stop' }))
    }
    expect(typed).toEqual([])
    expect(results(phone).map((r) => r.reason)).toEqual(['stale', 'stale', 'stale'])
  })

  it('answers `stale` to a prompt or a stop for an agent of another account, or no agent at all', async () => {
    h.terminals = [...h.terminals, { id: 'claude-2', name: 'Theirs', state: 'working' }, { id: 'claude-3', name: 'Unowned', state: 'working' }]
    recordTerminalOwner('claude-2', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb')
    for (const id of ['claude-2', 'claude-3', 'script-dev']) {
      await send(command(phone, { action: 'prompt', appAgentId: id }))
      await send(command(phone, { action: 'stop', appAgentId: id }))
    }
    expect(prompter).not.toHaveBeenCalled()
    expect(stopper).not.toHaveBeenCalled()
    expect(submitted).toEqual([])
    expect(typed).toEqual([])
    expect(results(phone).map((r) => r.reason)).toEqual(Array(6).fill('stale'))
  })

  it('rejects a prompt or a stop quoting another launch of the Mac, and runs neither', async () => {
    const before = crypto.randomUUID()
    await send(command(phone, { action: 'prompt', bootId: before }))
    await send(command(phone, { action: 'stop', bootId: before }))
    expect(prompter).not.toHaveBeenCalled()
    expect(stopper).not.toHaveBeenCalled()
    expect(results(phone).map((r) => r.reason)).toEqual(['rejected', 'rejected'])
  })

  it('keeps the boot id across relay restarts within one launch', async () => {
    await setRemoteEnabled(false)
    await setRemoteEnabled(true)
    await goLive(h.channels[1])
    const envelope = sentOn(h.channels[1]).find((e) => e.type === 'state' && e.to === phone.id)!
    expect((openEnvelope(envelope, phoneKey(phone, macId, macPub)) as OpenedSnapshot).bootId).toBe(bootId)
  })

  it('submits a replayed prompt once, and answers the replay with the first result', async () => {
    const envelope = command(phone, { action: 'prompt' })
    await send(envelope)
    await send(envelope)
    expect(submitted).toHaveLength(1)
    const [first, again] = results(phone)
    expect(again).toEqual(first)
    expect(first).toMatchObject({ ok: true, queued: true })
  })
})

describe('the conversation, read from a paired phone (§11)', () => {
  let macId: string
  let macPub: Buffer
  let phone: PairedPhone
  let other: PairedPhone
  let seq: number

  function chatRequest(from: PairedPhone, box: Record<string, unknown> = {}, at?: number): RelayEnvelope {
    seq = at ?? seq + 1
    const header = { type: 'chat-request' as const, from: from.id, to: macId, epoch: 'phone-epoch', seq }
    return sealEnvelope(header, phoneKey(from, macId, macPub), { pairingId: from.pairingId, appAgentId: 'claude-1', ...box })
  }

  function chats(to: PairedPhone): { pairingId: string; appAgentId: string; entries: { text?: string }[] }[] {
    return sentOn(h.channels[0])
      .filter((e) => e.type === 'chat' && e.to === to.id)
      .map((e) => openEnvelope(e, phoneKey(to, macId, macPub)) as { pairingId: string; appAgentId: string; entries: { text?: string }[] })
  }

  async function send(envelope: RelayEnvelope): Promise<void> {
    broadcast(h.channels[0], envelope)
    await tick()
  }

  beforeEach(async () => {
    const seeded = seedPairedPhones()
    macId = seeded.macId
    macPub = seeded.macPub
    ;[phone, other] = seeded.phones
    seq = 0
    h.chats.set('claude-1', { entries: [{ kind: 'user', id: 'u1', text: 'Fix the refund' }], queue: [], background: [] })
    await setRemoteEnabled(true)
    await goLive(h.channels[0])
  })

  it('answers a request with the tail, sealed for that phone alone, and nothing for the others', async () => {
    await send(chatRequest(phone))
    expect(chats(phone)).toEqual([expect.objectContaining({ pairingId: phone.pairingId, appAgentId: 'claude-1', entries: [expect.objectContaining({ text: 'Fix the refund' })] })])
    expect(chats(other)).toEqual([])
  })

  it('sends every change while the lease runs, and none once it has run out', async () => {
    await send(chatRequest(phone))
    notifyRemoteChat('claude-1')
    await tick()
    expect(chats(phone)).toHaveLength(2)
    const now = Date.now()
    vi.spyOn(Date, 'now').mockReturnValue(now + 60_000)
    notifyRemoteChat('claude-1')
    await tick()
    vi.mocked(Date.now).mockRestore()
    expect(chats(phone)).toHaveLength(2)
  })

  it('drops a replayed request, another pairing\'s, or one for an agent of no one here', async () => {
    await send(chatRequest(phone))
    await send(chatRequest(phone, {}, 1))
    await send(chatRequest(phone, { pairingId: crypto.randomUUID() }))
    await send(chatRequest(phone, { appAgentId: 'script-dev' }))
    await send(chatRequest(phone, { appAgentId: 'claude-404' }))
    expect(chats(phone)).toHaveLength(1)
  })

  it('a revoked phone is sent nothing more', async () => {
    await send(chatRequest(phone))
    await revokeRemoteDevice(phone.id)
    notifyRemoteChat('claude-1')
    await tick()
    expect(chats(phone)).toHaveLength(1)
  })
})
