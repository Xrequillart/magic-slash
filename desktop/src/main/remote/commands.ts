import type { TrayAnswerChoice, TrayAnswerRefusal, TrayAnswerResult } from '../../types'
import { verifySignature } from './crypto'
import { UUID_RE } from './envelope'
import type { StoredRemoteDevice } from './identity-store'

/**
 * A phone's `command`, Mac side (PROTOCOL.md §10, steps 3 to 8). Pure: the clock is injected
 * and nothing here touches a channel or a terminal, so every refusal the ticket names is
 * tested without either. relay.ts does steps 1 and 2 (whose device, does the box open) before
 * it calls in, and step 9 plus the answer itself inside `run`.
 *
 * NOTHING RUNS TWICE. A `commandId` whose signature verified is remembered with the result it
 * got, and the same command again gets that result back without `run` being called: a phone
 * that retried after a lost `command-result` learns the outcome, and a recording replayed in
 * the window answers nothing. A command still running is remembered too, as its promise, so a
 * replay landing mid-keystrokes waits for the same outcome rather than typing a second time.
 */

/** §10: how far `issuedAt` may be from this Mac's clock, either way, and how long an id is kept. */
export const COMMAND_WINDOW_MS = 5 * 60 * 1000
/** §10: the most `commandId`s remembered at a time. */
export const REMEMBERED_COMMANDS = 1000

export type CommandRefusal = TrayAnswerRefusal | 'rejected' | 're-pair'

/** The `command-result` box (§4, §10), sealed for the device that sent the command. */
export interface CommandResultBody {
  pairingId: string
  commandId: string
  ok: boolean
  reason?: CommandRefusal
}

/** An `answer` that passed steps 3 to 8: what step 9 and the answer itself act on. */
export interface AnswerCommand {
  appAgentId: string
  token: string
  choice: TrayAnswerChoice
}

interface Remembered {
  /** Forgotten after this (Mac clock, epoch ms): `issuedAt` + the window. */
  until: number
  result: Promise<CommandResultBody>
}

function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value)
}

function isIndex(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) >= 0
}

/**
 * `choice` in one of §10's four shapes, rebuilt with only the fields that shape names, or
 * null. Ranges against the question itself are `answerPendingQuestion`'s call.
 */
export function parseChoice(value: unknown): TrayAnswerChoice | null {
  if (!value || typeof value !== 'object') return null
  const c = value as Record<string, unknown>
  switch (c.kind) {
    case 'option':
      return isIndex(c.index) ? { kind: 'option', index: c.index } : null
    case 'options':
      return Array.isArray(c.indexes) && c.indexes.length > 0 && c.indexes.every(isIndex)
        ? { kind: 'options', indexes: [...c.indexes] }
        : null
    case 'answers':
      return Array.isArray(c.answers) && c.answers.length > 0 && c.answers.every((a) => typeof a === 'string')
        ? { kind: 'answers', answers: [...c.answers] }
        : null
    case 'deny':
      return { kind: 'deny' }
    default:
      return null
  }
}

function parseJson(text: string): Record<string, unknown> | null {
  try {
    const value: unknown = JSON.parse(text)
    return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null
  } catch {
    return null
  }
}

export interface CommandInput {
  /** The opened box (step 2 passed). */
  box: unknown
  /** The envelope's `from`. */
  from: string
  /** This Mac's id. */
  macId: string
  /** The paired device `from` names (step 1 passed). */
  device: StoredRemoteDevice
}

export class CommandGate {
  private readonly now: () => number
  /** By `phoneId|commandId`: a command id only means something within the phone that drew it. */
  private readonly seen = new Map<string, Remembered>()

  constructor(now: () => number = () => Date.now()) {
    this.now = now
  }

  /** How many command ids are remembered right now (tests). */
  get size(): number {
    return this.seen.size
  }

  /**
   * Steps 3 to 8, then `run` for a command that passed them. Resolves with the
   * `command-result` to seal back, or null when there is nothing to answer: a box that is not
   * a command, or one whose `commandId` cannot be read, which no phone could match a reply to.
   */
  async handle(input: CommandInput, run: (command: AnswerCommand) => Promise<TrayAnswerResult>): Promise<CommandResultBody | null> {
    const { box, from, macId, device } = input
    // 3. The box's shape.
    if (!box || typeof box !== 'object') return null
    const { payload, sig } = box as { payload?: unknown; sig?: unknown }
    if (typeof payload !== 'string' || typeof sig !== 'string') return null
    const parsed = parseJson(payload)
    // Read before the signature, for the reply only: a refusal still names the command it
    // answers, so the phone stops waiting on it. Nothing else trusts it yet.
    const claimedId = parsed?.commandId
    if (!isUuid(claimedId)) return null
    const refuse = (reason: CommandRefusal, commandId = claimedId): CommandResultBody =>
      ({ pairingId: device.pairingId, commandId, ok: false, reason })
    if (!device.signPub) return refuse('re-pair')

    // 4. The signature, over the exact bytes the phone serialized (no canonical form).
    if (!verifySignature(Buffer.from(device.signPub, 'base64'), Buffer.from(payload, 'utf8'), Buffer.from(sig, 'base64'))) {
      return refuse('rejected')
    }

    // 5. Whose, for which Mac, under which pairing.
    if (
      !parsed ||
      parsed.v !== 1 ||
      parsed.phoneId !== from ||
      from !== device.phoneId ||
      parsed.macId !== macId ||
      parsed.pairingId !== device.pairingId
    ) {
      return refuse('rejected')
    }

    // 6. When: within the window of this Mac's clock, either way.
    const issuedAt = parsed.issuedAt
    const now = this.now()
    if (typeof issuedAt !== 'number' || !Number.isSafeInteger(issuedAt) || Math.abs(now - issuedAt) > COMMAND_WINDOW_MS) {
      return refuse('rejected')
    }

    // 7. Never run twice: a command seen before gets the result it got the first time.
    this.forgetExpired(now)
    const key = `${device.phoneId}|${claimedId}`
    const earlier = this.seen.get(key)
    if (earlier) return earlier.result

    const result = this.execute(parsed, claimedId, device, run)
    this.remember(key, issuedAt + COMMAND_WINDOW_MS, result)
    return result
  }

  /** Steps 8 and on, for a command remembered from here: its result is what a replay gets. */
  private async execute(
    payload: Record<string, unknown>,
    commandId: string,
    device: StoredRemoteDevice,
    run: (command: AnswerCommand) => Promise<TrayAnswerResult>,
  ): Promise<CommandResultBody> {
    const reply = (outcome: TrayAnswerResult): CommandResultBody => ({
      pairingId: device.pairingId,
      commandId,
      ok: outcome.ok,
      ...(!outcome.ok && outcome.reason ? { reason: outcome.reason } : {}),
    })

    // 8. The closed action set, and a choice in one of its shapes. `prompt` and `stop` are
    // reserved: refused until their own version of §10 names them.
    const choice = parseChoice(payload.choice)
    const { action, appAgentId, token } = payload
    if (action !== 'answer' || !choice || typeof appAgentId !== 'string' || !appAgentId || typeof token !== 'string' || !token) {
      return reply({ ok: false, reason: 'invalid' })
    }

    try {
      return reply(await run({ appAgentId, token, choice }))
    } catch (error) {
      // Not expected (the answer path returns its refusals): nothing is claimed to have landed.
      console.error('[remote] a command failed to run:', error instanceof Error ? error.message : 'unknown error')
      return reply({ ok: false, reason: 'write-failed' })
    }
  }

  private remember(key: string, until: number, result: Promise<CommandResultBody>): void {
    // Bounded: past the cap the oldest goes first. Its question token, single use, is what
    // still stands between a replay of it and the terminal.
    while (this.seen.size >= REMEMBERED_COMMANDS) {
      const oldest = this.seen.keys().next().value
      if (oldest === undefined) break
      this.seen.delete(oldest)
    }
    this.seen.set(key, { until, result })
  }

  private forgetExpired(now: number): void {
    for (const [key, entry] of this.seen) {
      if (entry.until < now) this.seen.delete(key)
    }
  }

  /** Forget every id: a new account, or the relay torn down. */
  clear(): void {
    this.seen.clear()
  }
}
