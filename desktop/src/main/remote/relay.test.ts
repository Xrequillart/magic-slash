import * as crypto from 'crypto'
import * as fs from 'fs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

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
}))

vi.mock('electron', () => ({
  safeStorage: {
    isEncryptionAvailable: () => true,
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

import { deriveKey, generateKeyPair, type RelayKeyPair } from './crypto'
import { openEnvelope, sealEnvelope, type RelayEnvelope } from './envelope'
import { addDevice, loadOrCreateIdentity } from './identity-store'
import {
  __resetRemoteRelayForTests,
  approveRemotePairing,
  getRemoteState,
  notifyRemoteState,
  resumeRemoteRelay,
  revokeRemoteDevice,
  setRemoteEmitters,
  setRemoteEnabled,
  startRemotePairing,
  suspendRemoteRelay,
} from './relay'
import { setRemoteModeEnabled } from './remote-mode'
import { clearTerminalOwners, recordTerminalOwner } from './terminal-owners'
import type { RemotePairing } from '../../types'

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

beforeEach(async () => {
  fs.rmSync(h.TEST_CONFIG_DIR, { recursive: true, force: true })
  h.channels = []
  h.client = makeClient()
  h.userId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
  h.terminals = [
    { id: 'claude-1', name: 'Agent 1', state: 'working', metadata: { title: 'PROJ-12: refunds' } },
    { id: 'script-dev', name: 'dev', state: 'working', metadata: {} },
  ]
  clearTerminalOwners()
  recordTerminalOwner('claude-1', h.userId)
  pairings = []
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
function seedPairedPhones(): { macId: string; macPub: Buffer; phones: Phone[] } {
  const identity = loadOrCreateIdentity(h.userId!)
  const phones = [0, 1].map(() => ({ id: crypto.randomUUID(), keys: generateKeyPair() }))
  for (const phone of phones) {
    addDevice(h.userId!, { phoneId: phone.id, name: `iPhone ${phone.id.slice(0, 4)}`, pub: phone.keys.publicRaw.toString('base64'), pairedAt: 1 })
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
      const snapshot = openEnvelope(envelope, phoneKey(mine, macId, macPub)) as { agents: { appAgentId: string }[] }
      expect(snapshot.agents.map((a) => a.appAgentId)).toEqual(['claude-1'])
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
    expect(openEnvelope(goodbye, phoneKey(revoked, macId, macPub))).toEqual({ pairedAt: 1 })

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
    const pairedAt = getRemoteState().devices[0].pairedAt
    expect(openEnvelope(accepted, key)).toEqual({ macName: getRemoteState().macName, requestEpoch: req.epoch, pairedAt })
    expect(state).toMatchObject({ type: 'state', to: phone.id })
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
      const snapshot = openEnvelope(envelope, phoneKey(phone, macId, macPub)) as { agents: { appAgentId: string }[] }
      // claude-1 is the previous account's, claude-3 has no recorded owner: neither is sent.
      expect(snapshot.agents.map((a) => a.appAgentId)).toEqual(['claude-2'])
    }
  })

  it('remote mode is read from disk at launch', async () => {
    setRemoteModeEnabled(true)
    await __resetRemoteRelayForTests()
    await resumeRemoteRelay()
    expect(h.channels).toHaveLength(1)
  })
})
