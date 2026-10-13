import * as crypto from 'crypto'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { generateKeyPair, sign, type RelayKeyPair } from './crypto'
import {
  COMMAND_WINDOW_MS,
  CommandGate,
  parseChoice,
  PROMPT_MAX_CHARS,
  REMEMBERED_COMMANDS,
  type CommandOutcome,
  type RemoteCommand,
} from './commands'
import type { StoredRemoteDevice } from './identity-store'

// The phone is simulated with crypto.ts's `sign`, which the signing vector pins to CryptoKit:
// a command signed here is byte for byte one the iPhone would send.

const MAC_ID = '11111111-1111-4111-8111-111111111111'
const PHONE_ID = '22222222-2222-4222-8222-222222222222'
const PAIRING_ID = '33333333-3333-4333-8333-333333333333'
const BOOT_ID = '88888888-8888-4888-8888-888888888888'

let signing: RelayKeyPair
let device: StoredRemoteDevice
let now: number
let gate: CommandGate
let run: ReturnType<typeof vi.fn<(command: RemoteCommand) => Promise<CommandOutcome>>>

function payload(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    v: 1,
    action: 'answer',
    macId: MAC_ID,
    phoneId: PHONE_ID,
    pairingId: PAIRING_ID,
    commandId: crypto.randomUUID(),
    issuedAt: now,
    appAgentId: 'claude-1',
    token: 'tok-1',
    choice: { kind: 'option', index: 1 },
    ...overrides,
  }
}

/** A command box as the phone seals it: the payload serialized once, signed as those bytes. */
function box(body: Record<string, unknown>, key = signing.privateKey): { payload: string; sig: string } {
  const text = JSON.stringify(body)
  return { payload: text, sig: sign(key, Buffer.from(text, 'utf8')).toString('base64') }
}

function handle(b: unknown, from = PHONE_ID, d = device) {
  return gate.handle({ box: b, from, macId: MAC_ID, device: d }, run)
}

beforeEach(() => {
  signing = generateKeyPair()
  device = {
    phoneId: PHONE_ID,
    name: 'iPhone',
    pub: 'BAAA',
    pairedAt: 1,
    pairingId: PAIRING_ID,
    signPub: signing.publicRaw.toString('base64'),
  }
  now = 1_760_000_000_000
  gate = new CommandGate(() => now, BOOT_ID)
  run = vi.fn(async () => ({ ok: true }))
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('a valid answer', () => {
  it('runs once, with the agent, the token and the choice, and replies ok', async () => {
    const p = payload()
    expect(await handle(box(p))).toEqual({ pairingId: PAIRING_ID, commandId: p.commandId, ok: true })
    expect(run).toHaveBeenCalledWith({ action: 'answer', appAgentId: 'claude-1', token: 'tok-1', choice: { kind: 'option', index: 1 } })
  })

  it('carries the answer path\'s refusal back as its reason', async () => {
    run.mockResolvedValue({ ok: false, reason: 'stale' })
    const p = payload()
    expect(await handle(box(p))).toEqual({ pairingId: PAIRING_ID, commandId: p.commandId, ok: false, reason: 'stale' })
  })

  it('accepts every choice shape of §10', async () => {
    for (const choice of [
      { kind: 'option', index: 0 },
      { kind: 'options', indexes: [2, 0] },
      { kind: 'answers', answers: ['main', 'Red, Blue'] },
      { kind: 'deny' },
    ]) {
      expect((await handle(box(payload({ choice }))))?.ok).toBe(true)
    }
    expect(run).toHaveBeenCalledTimes(4)
  })

  it('accepts a clock off by up to five minutes either way', async () => {
    expect((await handle(box(payload({ issuedAt: now - COMMAND_WINDOW_MS }))))?.ok).toBe(true)
    expect((await handle(box(payload({ issuedAt: now + COMMAND_WINDOW_MS }))))?.ok).toBe(true)
  })
})

describe('the refusals', () => {
  it('asks a phone paired before commands existed to pair again, running nothing', async () => {
    const { signPub: _signPub, ...legacy } = device
    const p = payload()
    expect(await handle(box(p), PHONE_ID, legacy)).toEqual({ pairingId: PAIRING_ID, commandId: p.commandId, ok: false, reason: 're-pair' })
    expect(run).not.toHaveBeenCalled()
  })

  it('rejects a bad signature, another key\'s, or a payload changed after signing', async () => {
    const p = payload()
    const signed = box(p)
    const tampered = { ...signed, payload: signed.payload.replace('"index":1', '"index":0') }
    const other = box(p, generateKeyPair().privateKey)
    const garbage = { ...signed, sig: Buffer.alloc(64, 7).toString('base64') }
    for (const b of [tampered, other, garbage, { ...signed, sig: '' }]) {
      expect(await handle(b)).toMatchObject({ commandId: p.commandId, ok: false, reason: 'rejected' })
    }
    expect(run).not.toHaveBeenCalled()
  })

  it('rejects a command naming another Mac, another phone or another pairing', async () => {
    for (const overrides of [
      { macId: '44444444-4444-4444-8444-444444444444' },
      { phoneId: '55555555-5555-4555-8555-555555555555' },
      { pairingId: '66666666-6666-4666-8666-666666666666' },
      { v: 2 },
    ]) {
      expect(await handle(box(payload(overrides)))).toMatchObject({ ok: false, reason: 'rejected' })
    }
    // Signed by this phone, but sent from another one's envelope.
    expect(await handle(box(payload()), '55555555-5555-4555-8555-555555555555')).toMatchObject({ ok: false, reason: 'rejected' })
    expect(run).not.toHaveBeenCalled()
  })

  it('rejects an issuedAt too old, too far ahead, or missing', async () => {
    for (const issuedAt of [now - COMMAND_WINDOW_MS - 1, now + COMMAND_WINDOW_MS + 1, undefined, '1760000000000', 1.5]) {
      expect(await handle(box(payload({ issuedAt })))).toMatchObject({ ok: false, reason: 'rejected' })
    }
    expect(run).not.toHaveBeenCalled()
  })

  it('refuses an action outside the closed set as invalid', async () => {
    for (const action of ['nope', 'Prompt', 'shell', undefined]) {
      expect(await handle(box(payload({ action, text: 'hi', bootId: BOOT_ID })))).toMatchObject({ ok: false, reason: 'invalid' })
    }
    expect(run).not.toHaveBeenCalled()
  })

  it('refuses a choice in no known shape, or a command without its agent or token, as invalid', async () => {
    for (const overrides of [
      { choice: { kind: 'option', index: -1 } },
      { choice: { kind: 'option', index: 1.5 } },
      { choice: { kind: 'options', indexes: [] } },
      { choice: { kind: 'options', indexes: ['1'] } },
      { choice: { kind: 'answers', answers: [1] } },
      { choice: { kind: 'skip' } },
      { choice: null },
      { appAgentId: '' },
      { token: 42 },
    ]) {
      expect(await handle(box(payload(overrides)))).toMatchObject({ ok: false, reason: 'invalid' })
    }
    expect(run).not.toHaveBeenCalled()
  })

  it('answers nothing to a box that is not a command, or whose command id cannot be read', async () => {
    const p = payload({ commandId: 'not-a-uuid' })
    for (const b of [null, 'text', {}, { payload: 1, sig: 'x' }, { payload: 'not json', sig: 'x' }, box(p)]) {
      expect(await handle(b)).toBeNull()
    }
    expect(run).not.toHaveBeenCalled()
  })
})

describe('a prompt and a stop', () => {
  function prompt(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    const { token: _token, choice: _choice, ...common } = payload()
    return { ...common, action: 'prompt', text: 'Add a test for the refund', bootId: BOOT_ID, ...overrides }
  }

  function stop(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    const { token: _token, choice: _choice, ...common } = payload()
    return { ...common, action: 'stop', bootId: BOOT_ID, ...overrides }
  }

  it('runs a prompt with its agent and its text as sent, and replies ok', async () => {
    const p = prompt({ text: 'line one\nline two' })
    expect(await handle(box(p))).toEqual({ pairingId: PAIRING_ID, commandId: p.commandId, ok: true })
    expect(run).toHaveBeenCalledWith({ action: 'prompt', appAgentId: 'claude-1', text: 'line one\nline two' })
  })

  it('says a prompt was queued, and only when it was', async () => {
    run.mockResolvedValueOnce({ ok: true, queued: true })
    const p = prompt()
    expect(await handle(box(p))).toEqual({ pairingId: PAIRING_ID, commandId: p.commandId, ok: true, queued: true })
    // A refusal never claims a queue.
    run.mockResolvedValueOnce({ ok: false, reason: 'busy', queued: true })
    expect(await handle(box(prompt()))).toEqual({ pairingId: PAIRING_ID, commandId: expect.any(String), ok: false, reason: 'busy' })
  })

  it('runs a stop with its agent, and carries its refusal back', async () => {
    run.mockResolvedValueOnce({ ok: false, reason: 'stale' })
    const p = stop()
    expect(await handle(box(p))).toEqual({ pairingId: PAIRING_ID, commandId: p.commandId, ok: false, reason: 'stale' })
    expect(run).toHaveBeenCalledWith({ action: 'stop', appAgentId: 'claude-1' })
  })

  it('accepts a text at the limit, and a text with control bytes around words', async () => {
    expect((await handle(box(prompt({ text: 'x'.repeat(PROMPT_MAX_CHARS) }))))?.ok).toBe(true)
    expect((await handle(box(prompt({ text: '\x1bhi' }))))?.ok).toBe(true)
  })

  it('refuses a prompt with no text, an empty one, one over the limit or one of control bytes only, as invalid', async () => {
    for (const text of [undefined, '', 42, 'x'.repeat(PROMPT_MAX_CHARS + 1), '\x1b\x03', ['hi']]) {
      expect(await handle(box(prompt({ text })))).toMatchObject({ ok: false, reason: 'invalid' })
    }
    expect(run).not.toHaveBeenCalled()
  })

  it('refuses a prompt or a stop without its boot id, or without its agent, as invalid', async () => {
    for (const p of [prompt({ bootId: undefined }), prompt({ bootId: 7 }), stop({ bootId: undefined }), stop({ bootId: null }), prompt({ appAgentId: '' }), stop({ appAgentId: undefined })]) {
      expect(await handle(box(p))).toMatchObject({ ok: false, reason: 'invalid' })
    }
    expect(run).not.toHaveBeenCalled()
  })

  it('rejects a prompt or a stop signed for an earlier launch of the Mac', async () => {
    const before = '99999999-9999-4999-8999-999999999999'
    for (const p of [prompt({ bootId: before }), stop({ bootId: before }), prompt({ bootId: '' })]) {
      expect(await handle(box(p))).toMatchObject({ ok: false, reason: 'rejected' })
    }
    expect(run).not.toHaveBeenCalled()
  })

  it('ignores a boot id on an answer', async () => {
    expect((await handle(box(payload({ bootId: 'from-another-launch' }))))?.ok).toBe(true)
  })

  it('draws a boot id of its own when none is given, one per gate', () => {
    const a = new CommandGate()
    const b = new CommandGate()
    expect(a.bootId).toMatch(/^[0-9a-f-]{36}$/)
    expect(a.bootId).not.toBe(b.bootId)
  })

  it('types a replayed prompt once, and answers the replay with the first result', async () => {
    run.mockResolvedValueOnce({ ok: true, queued: true })
    const signed = box(prompt())
    const first = await handle(signed)
    expect(await handle(signed)).toEqual(first)
    expect(first).toMatchObject({ ok: true, queued: true })
    expect(run).toHaveBeenCalledTimes(1)
  })

  it('stops once for a replayed stop', async () => {
    const signed = box(stop())
    await handle(signed)
    await handle(signed)
    expect(run).toHaveBeenCalledTimes(1)
  })
})

describe('replay', () => {
  it('returns the first result to a command seen before, without running it again', async () => {
    const signed = box(payload())
    const first = await handle(signed)
    run.mockResolvedValue({ ok: false, reason: 'stale' })
    expect(await handle(signed)).toEqual(first)
    expect(run).toHaveBeenCalledTimes(1)
  })

  it('makes a replay landing mid-answer wait for that answer rather than run a second one', async () => {
    let finish: (outcome: CommandOutcome) => void = () => {}
    run.mockImplementation(() => new Promise((resolve) => { finish = resolve }))
    const signed = box(payload())
    const first = handle(signed)
    const second = handle(signed)
    await Promise.resolve()
    finish({ ok: true })
    expect(await first).toEqual(await second)
    expect(run).toHaveBeenCalledTimes(1)
  })

  it('remembers a refused command too, so its replay is refused the same way', async () => {
    const signed = box(payload({ action: 'nope' }))
    expect(await handle(signed)).toMatchObject({ reason: 'invalid' })
    expect(await handle(signed)).toMatchObject({ reason: 'invalid' })
    expect(gate.size).toBe(1)
  })

  it('rejects a replay once the window is past, rather than answer from a forgotten id', async () => {
    const signed = box(payload())
    await handle(signed)
    now += COMMAND_WINDOW_MS + 1
    expect(await handle(signed)).toMatchObject({ ok: false, reason: 'rejected' })
    expect(run).toHaveBeenCalledTimes(1)
  })

  it('forgets ids once their window is past', async () => {
    await handle(box(payload()))
    now += COMMAND_WINDOW_MS + 1
    await handle(box(payload()))
    expect(gate.size).toBe(1)
  })

  it('remembers only commands whose signature verified: junk fills nothing', async () => {
    const forged = box(payload(), generateKeyPair().privateKey)
    for (let i = 0; i < 5; i++) await handle(box(payload({ macId: 'x' }), generateKeyPair().privateKey))
    await handle(forged)
    await handle({ payload: 'nope', sig: 'nope' })
    const { signPub: _signPub, ...legacy } = device
    await handle(box(payload()), PHONE_ID, legacy)
    expect(gate.size).toBe(0)
  })

  it('keeps at most the cap, the oldest going first', async () => {
    const first = box(payload())
    await handle(first)
    for (let i = 0; i < REMEMBERED_COMMANDS; i++) await handle(box(payload()))
    expect(gate.size).toBe(REMEMBERED_COMMANDS)
    // The first one fell out: within its window it would run again, and its single-use
    // question token is what refuses it then.
    run.mockClear()
    await handle(first)
    expect(run).toHaveBeenCalledTimes(1)
  })

  it('tells two phones\' identical command ids apart', async () => {
    const otherSigning = generateKeyPair()
    const otherPhone = '77777777-7777-4777-8777-777777777777'
    const other: StoredRemoteDevice = { ...device, phoneId: otherPhone, signPub: otherSigning.publicRaw.toString('base64') }
    const commandId = crypto.randomUUID()
    await handle(box(payload({ commandId })))
    await handle(box(payload({ commandId, phoneId: otherPhone }), otherSigning.privateKey), otherPhone, other)
    expect(run).toHaveBeenCalledTimes(2)
  })
})

describe('parseChoice', () => {
  it('keeps only the fields of the shape it names', () => {
    expect(parseChoice({ kind: 'option', index: 2, extra: 'x' })).toEqual({ kind: 'option', index: 2 })
    expect(parseChoice({ kind: 'deny', index: 3 })).toEqual({ kind: 'deny' })
  })
})
