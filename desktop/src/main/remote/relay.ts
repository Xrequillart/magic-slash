import * as crypto from 'crypto'
import * as os from 'os'
import { powerSaveBlocker } from 'electron'
import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js'
import type { RemoteDevice, RemotePairing, RemoteRelayStatus, RemoteState, TrayAnswerChoice, TrayAnswerResult } from '../../types'
import { getAuthedClient } from '../cloud/auth'
import { loadSession } from '../cloud/session-store'
import { getAllTerminals } from '../pty/terminal-manager'
import { getPendingQuestion } from '../questions/pending-questions'
import { getChatSnapshot } from '../chat/transcript-watcher'
import { ChatLeases, toRelayChat } from './chat'
import { toRelayCommands, type ListingRow } from './command-list'
import { CommandGate, type CommandOutcome, type RemoteCommand } from './commands'
import { privateKeyFromRaw, publicRawOf, deriveKey } from './crypto'
import { openEnvelope, parseEnvelope, sealEnvelope, type RelayEnvelope, type RelayMessageType } from './envelope'
import {
  addDevice,
  listDevices,
  loadIdentity,
  loadOrCreateIdentity,
  removeDevice,
  saveGeneration,
  setDevicePushKey,
  type RemoteIdentity,
  type StoredRemoteDevice,
} from './identity-store'
import { PairingSession, type PairingOutgoing } from './pairing'
import { logRelayEvent } from './relay-log'
import { isRemoteModeEnabled, setRemoteModeEnabled } from './remote-mode'
import { buildSnapshot, isAgentTerminal, snapshotFor, SnapshotScheduler } from './snapshot'
import { terminalOwner } from './terminal-owners'

// ---------------------------------------------------------------------------
// The relay to paired iPhones (main process, #352). PROTOCOL.md is the contract.
//
// While remote mode is on and the account is signed in, this Mac joins the account's private
// channel `relay:<userId>` and broadcasts there one envelope PER PAIRED PHONE, sealed with
// the key only that phone shares with this Mac. Supabase authorizes the join and carries the
// bytes; it never sees a state, a title or a cost. Nothing is written to `agents`.
//
// OFF MEANS NOTHING: no channel, no QR, no envelope. Every entry point checks remote mode
// before it reaches for a socket, and the tests hold that (`client.channel` never called).
//
// The channel lifecycle is plan-live.ts's: entry points serialized by a lock, the socket
// authorized with the user's JWT before the join (and again on every refresh), a 15 s
// deadline on the join, and `live` only once our presence is tracked — the phones read our
// presence as "this Mac is online", so a join without it must not claim to be live.
//
// PER ACCOUNT. The identity and the paired phones are the signed-in account's
// (identity-store.ts). A sign-out suspends everything and forgets them from memory; the next
// account starts from its own file.
// ---------------------------------------------------------------------------

export interface RemoteEmitters {
  state: (state: RemoteState) => void
  pairing: (pairing: RemotePairing | null) => void
}

let emitters: RemoteEmitters | null = null

/** Wire the emitters that forward to the renderer. Pass null to clear. */
export function setRemoteEmitters(next: RemoteEmitters | null): void {
  emitters = next
}

/** Answers an agent's pending question: main/index.ts's `answerQuestion`, the tray's own path. */
export type RemoteAnswerer = (id: string, token: string, choice: TrayAnswerChoice) => Promise<TrayAnswerResult>

let answerer: RemoteAnswerer | null = null

/** Wire the path a verified `answer` command takes (§10 step 9). Pass null to clear. */
export function setRemoteAnswerer(next: RemoteAnswerer | null): void {
  answerer = next
}

/** Types a prompt into an agent: main/index.ts's, over agent-control.ts's `runRemotePrompt`. */
/** `stillWanted`: step 9 again, for the moment the text is typed (see `runCommand`). */
export type RemotePrompter = (id: string, text: string, stillWanted: () => boolean) => Promise<CommandOutcome>

let prompter: RemotePrompter | null = null

/** Wire the path a verified `prompt` command takes (§10 step 9). Pass null to clear. */
export function setRemotePrompter(next: RemotePrompter | null): void {
  prompter = next
}

/** Interrupts an agent's turn: main/index.ts's, over agent-control.ts's `runRemoteStop`. */
export type RemoteStopper = (id: string) => Promise<CommandOutcome>

let stopper: RemoteStopper | null = null

/** Wire the path a verified `stop` command takes (§10 step 9). Pass null to clear. */
export function setRemoteStopper(next: RemoteStopper | null): void {
  stopper = next
}

/** Lists the skills and commands on disk: main/index.ts's, over skills-listing.ts. */
export type RemoteCommandLister = () => readonly ListingRow[]

let commandLister: RemoteCommandLister | null = null

/** Wire where the `/` commands a phone suggests come from (§13). Pass null to clear. */
export function setRemoteCommandLister(next: RemoteCommandLister | null): void {
  commandLister = next
}

interface LoadedIdentity {
  macId: string
  privateKey: crypto.KeyObject
  publicRaw: Buffer
  /** The current relay start's generation (§6); ahead of the file when saving it failed. */
  generation: number
  devices: StoredRemoteDevice[]
}

/** Remote mode, read from disk once and then held: the switch below is its only writer. */
let enabled: boolean | null = null
/** The account the identity below belongs to. Lower-case. */
let userId: string | null = null
let identity: LoadedIdentity | null = null
/** Pair keys by phone id: one ECDH + HKDF per phone per account, not per snapshot. */
const pairKeys = new Map<string, Buffer>()
/** The session was refused: shown as signed out until the next `ok` starts us again. */
let suspended = false
/**
 * The phones' commands seen so far (§10 step 7), for the account loaded. Its `bootId` is drawn
 * at launch, and again each time `forgetAccount` clears the gate, and is published in every
 * snapshot (§5): a `prompt` or `stop` must quote it, so nothing signed before a restart, or
 * before the memory that would have refused its replay was cleared, runs after it.
 */
const commands = new CommandGate()
/** Which phone reads which agent's conversation (§11), and the last request seq each sent. */
const chatLeases = new ChatLeases()
const chatRequestSeen = new Map<string, { epoch: string; seq: number }>()
/** The same, for `state-request` (§12). */
const stateRequestSeen = new Map<string, { epoch: string; seq: number }>()
/** The same, for `push-key` (§14). */
const pushKeySeen = new Map<string, { epoch: string; seq: number }>()

/** Anti-replay for a phone → Mac message: true (and recorded) only when its seq moves forward. */
function acceptSeq(seen: Map<string, { epoch: string; seq: number }>, phoneId: string, envelope: RelayEnvelope): boolean {
  const last = seen.get(phoneId)
  if (last && last.epoch === envelope.epoch && envelope.seq <= last.seq) return false
  seen.set(phoneId, { epoch: envelope.epoch, seq: envelope.seq })
  return true
}

let client: SupabaseClient | null = null
let channel: RealtimeChannel | null = null
let live = false
let authListenerUnsub: (() => void) | null = null
let epoch = ''
let seq = 0
let scheduler: SnapshotScheduler | null = null
let pairing: PairingSession | null = null
/** The id of the `startRemotePairing` call that put `pairing` up: a cancel names it. */
let pairingAttempt: string | null = null
let blockerId: number | null = null
let lastStateKey = ''

const SUBSCRIBE_DEADLINE_MS = 15_000
/**
 * A channel that WAS live and dropped gets this long, not the first join's deadline.
 * realtime-js answers a server drop with CLOSED then TIMED_OUT and never recovers it on its
 * own (relay-events.log: 15 to 20 s gone every time, then a fresh join live in under one),
 * so waiting is only time the phones read this Mac as offline.
 */
const DROP_DEADLINE_MS = 3_000
/**
 * A `command-result` finished while the channel was down waits for the next join, this long
 * at most: the command already ran, and a phone left without its answer tells its user the
 * Mac is unreachable. Past it the phone has long given up on it.
 */
const RESULT_HOLD_MS = 60_000
const heldResults: { device: StoredRemoteDevice; self: LoadedIdentity; body: unknown; at: number }[] = []
let subscribeWatchdog: ReturnType<typeof setTimeout> | null = null
const UNTRACK_TIMEOUT_MS = 1_000
const TRACK_RETRY_MS = 3_000
/** Bumped on every channel status: a `track` loop belongs to one join only (plan-live's). */
let joinCount = 0

function isEnabled(): boolean {
  if (enabled === null) enabled = isRemoteModeEnabled()
  return enabled
}

/**
 * The name the phones show for this Mac: the host name without its `.local` and with the
 * hyphens macOS puts in place of spaces ("Xaviers-MacBook-Pro.local" → "Xaviers MacBook Pro").
 */
export function cleanMacName(hostname: string): string {
  const name = hostname.replace(/\.local$/i, '').split('.')[0].replace(/-/g, ' ').trim()
  return name || 'Mac'
}

let macNameCache: string | null = null
function macName(): string {
  if (macNameCache === null) macNameCache = cleanMacName(os.hostname())
  return macNameCache
}

function toLoaded(stored: RemoteIdentity): LoadedIdentity {
  const privateKey = privateKeyFromRaw(Buffer.from(stored.macPrivate, 'hex'))
  return {
    macId: stored.macId,
    privateKey,
    publicRaw: publicRawOf(privateKey),
    generation: stored.generation,
    devices: stored.devices,
  }
}

function sessionUserId(): string | null {
  const id = loadSession()?.user?.id
  return typeof id === 'string' && id ? id.toLowerCase() : null
}

function publicDevices(devices: StoredRemoteDevice[]): RemoteDevice[] {
  return devices.map(({ phoneId, name, pairedAt }) => ({ phoneId, name, pairedAt }))
}

function currentStatus(uid: string | null): RemoteRelayStatus {
  if (!isEnabled()) return 'off'
  if (suspended || !uid) return 'signed-out'
  return live ? 'live' : 'reconnecting'
}

/**
 * Where the relay stands, for the settings page. Read-only: the devices of an account whose
 * identity is not loaded yet (remote mode off, before the first check) are read from its
 * file, never created.
 */
export function getRemoteState(): RemoteState {
  const uid = sessionUserId()
  const status = currentStatus(uid)
  let devices: StoredRemoteDevice[] = []
  if (status !== 'signed-out') {
    if (uid && uid === userId && identity) devices = identity.devices
    else if (uid) devices = listDevices(uid)
  }
  return { enabled: isEnabled(), status, devices: publicDevices(devices), macName: macName() }
}

/** Push the state when it moved, and return it. */
function emitState(): RemoteState {
  const state = getRemoteState()
  const key = JSON.stringify(state)
  if (key !== lastStateKey) {
    lastStateKey = key
    emitters?.state(state)
  }
  return state
}

// --- power ------------------------------------------------------------------

/**
 * Held while remote mode is on (§9): an app nap would freeze the heartbeat and the phones
 * would read this Mac as offline while it is in fact awake. It cannot keep a closed lid from
 * sleeping the Mac, which is what the phone's 75 s rule is for.
 */
function holdPowerBlocker(): void {
  if (blockerId !== null && powerSaveBlocker.isStarted(blockerId)) return
  blockerId = powerSaveBlocker.start('prevent-app-suspension')
}

function releasePowerBlocker(): void {
  if (blockerId === null) return
  if (powerSaveBlocker.isStarted(blockerId)) powerSaveBlocker.stop(blockerId)
  blockerId = null
}

// --- lock -------------------------------------------------------------------

// Serialize every start/stop for plan-live's reason: each awaits before touching module
// state, and two interleaving across that await would orphan a channel.
let opLock: Promise<void> = Promise.resolve()

function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = opLock.then(fn, fn)
  opLock = run.then(() => undefined, () => undefined)
  return run
}

// --- account ----------------------------------------------------------------

/** Forget the account in memory: its identity, its keys and any pairing on screen. */
function forgetAccount(): void {
  closePairing()
  userId = null
  identity = null
  pairKeys.clear()
  commands.clear()
  chatLeases.clear()
  chatRequestSeen.clear()
  stateRequestSeen.clear()
  pushKeySeen.clear()
  heldResults.length = 0
}

/**
 * Line the module up with the signed-in account (lock held). Another account than the one
 * loaded means everything of the previous one goes first, its channel included. Loads the
 * identity when there is one; `create` makes one (and may throw: no keychain).
 */
async function syncAccount(create: boolean): Promise<string | null> {
  const uid = sessionUserId()
  if (uid !== userId) {
    await teardown()
    forgetAccount()
    userId = uid
  }
  if (!uid) return null
  if (!identity) {
    const stored = create ? loadOrCreateIdentity(uid) : loadIdentity(uid)
    if (stored) identity = toLoaded(stored)
  }
  return uid
}

// --- sending ----------------------------------------------------------------

function pairKey(device: StoredRemoteDevice): Buffer | null {
  const cached = pairKeys.get(device.phoneId)
  if (cached) return cached
  if (!identity) return null
  try {
    const key = deriveKey(identity.privateKey, Buffer.from(device.pub, 'base64'), identity.macId, device.phoneId)
    pairKeys.set(device.phoneId, key)
    return key
  } catch (error) {
    // A stored key that is not a point: that phone cannot be served, the others can.
    console.error('[remote] unusable key for a paired device:', error instanceof Error ? error.name : 'unknown error')
    return null
  }
}

function nextHeader(type: RelayMessageType, to: string) {
  seq += 1
  return { type, from: identity!.macId, to, epoch, seq }
}

/**
 * Broadcast an envelope. Only on a live channel: realtime-js would otherwise fall back to its
 * REST endpoint, and a broadcast is not replayed anyway (§6) — a phone that missed this one
 * gets the next snapshot, which is complete.
 */
async function sendEnvelope(envelope: RelayEnvelope): Promise<void> {
  const ch = channel
  if (!ch || !live) return
  try {
    const result = await ch.send({ type: 'broadcast', event: 'relay', payload: envelope })
    // The conversation is the one large message: its size, to tell a payload cap from a drop.
    if (envelope.type === 'chat') logRelayEvent(`send chat ${Buffer.byteLength(JSON.stringify(envelope))} bytes: ${String(result)}`)
    else if (result !== 'ok') logRelayEvent(`send ${envelope.type} answered ${String(result)}`)
  } catch (error) {
    logRelayEvent(`send ${envelope.type} threw`)
    console.error('[remote] failed to send an envelope:', error)
  }
}

function sendSealed(type: RelayMessageType, device: StoredRemoteDevice, body: unknown): Promise<void> {
  const key = pairKey(device)
  if (!key || !identity) return Promise.resolve()
  return sendEnvelope(sealEnvelope(nextHeader(type, device.phoneId), key, body))
}

/**
 * One complete snapshot, sealed once per paired phone (seq moves across recipients), each
 * named by that phone's `pairingId` (§5). Only the
 * terminals started under THIS account: a refused session leaves its PTYs running, and the
 * next account to sign in must not see them on its phones (terminal-owners.ts).
 */
function publishSnapshot(): void {
  const account = userId
  if (!live || !channel || !identity || !account || identity.devices.length === 0) return
  const body = buildSnapshot(
    getAllTerminals(),
    macName(),
    Date.now(),
    identity.generation,
    commands.bootId,
    (id) => terminalOwner(id) === account,
    // Read through the TTL: a question past its 30 minutes is not published.
    getPendingQuestion,
  )
  for (const device of identity.devices) void sendSealed('state', device, snapshotFor(body, device.pairingId))
}

/** Thrown when a `pair-accepted` cannot be put on the relay: the approval fails with it. */
const NOT_SENT = 'Your iPhone could not be reached through the relay. Nothing was paired, try again once it is connected.'

/**
 * Like `sendEnvelope`, but for the one message whose loss matters to the Mac: rejects when the
 * channel is not live or the broadcast is not acknowledged, so the approval can roll back.
 */
async function sendEnvelopeOrThrow(envelope: RelayEnvelope): Promise<void> {
  const ch = channel
  if (!ch || !live) throw new Error(NOT_SENT)
  let result: unknown
  try {
    result = await ch.send({ type: 'broadcast', event: 'relay', payload: envelope })
  } catch (error) {
    console.error('[remote] failed to send pair-accepted:', error)
    throw new Error(NOT_SENT)
  }
  if (result !== 'ok') {
    console.error(`[remote] pair-accepted answered ${String(result)}`)
    throw new Error(NOT_SENT)
  }
}

function sendPairing(message: PairingOutgoing): void | Promise<void> {
  if (message.type === 'pair-accepted') {
    if (!identity || !channel || !live) return Promise.reject(new Error(NOT_SENT))
    return sendEnvelopeOrThrow(sealEnvelope(nextHeader('pair-accepted', message.to), message.key, message.body))
  }
  if (!identity || !channel || !live) return
  // Clear text by design (§4): `box` is absent and `reason` rides beside the header.
  void sendEnvelope({ v: 1, ...nextHeader('pair-rejected', message.to), reason: message.reason })
}

/** A runtime state moved: the phones get it at once (well under the 2 s the ticket allows). */
export function notifyRemoteState(): void {
  scheduler?.notifyState()
}

/**
 * An agent's conversation moved (transcript-watcher.ts's listener, already debounced): every
 * phone whose lease is on it gets the new tail (§11). Nothing at all when none reads it.
 */
export function notifyRemoteChat(appAgentId: string): void {
  if (!live || !channel || !identity || !userId) return
  const readers = chatLeases.readers(appAgentId, Date.now())
  if (readers.length === 0 || terminalOwner(appAgentId) !== userId) return
  for (const device of identity.devices) {
    if (readers.includes(device.phoneId)) sendChat(device, appAgentId)
  }
}

function sendChat(device: StoredRemoteDevice, appAgentId: string): void {
  if (!identity) return
  const body = toRelayChat(getChatSnapshot(appAgentId), appAgentId, identity.generation)
  void sendSealed('chat', device, { pairingId: device.pairingId, ...body })
}

/** Usage moved: the phones get it at most every 2 s, the status line reports far more often. */
export function notifyRemoteUsage(): void {
  scheduler?.notifyUsage()
}

// --- receiving --------------------------------------------------------------

function handleIncoming(payload: unknown): void {
  const envelope = parseEnvelope(payload)
  if ((payload as { type?: unknown } | null)?.type === 'pair-request') logPairRequest(envelope)
  // Not addressed to this Mac: another Mac of the account, or our own phones' traffic.
  if (!envelope || !identity || envelope.to !== identity.macId) return
  // The two messages a phone sends a Mac. Anything else from a phone is dropped.
  if (envelope.type === 'pair-request') pairing?.handleRequest(envelope)
  else if (envelope.type === 'command') void handleCommand(envelope)
  else if (envelope.type === 'chat-request') handleChatRequest(envelope)
  else if (envelope.type === 'state-request') handleStateRequest(envelope)
  else if (envelope.type === 'push-key') handlePushKey(envelope)
}

/**
 * Where a `pair-request` stops before the pairing session reads it: every later refusal is
 * silent towards the phone (§7), so the log is the only place it shows.
 */
function logPairRequest(envelope: RelayEnvelope | null): void {
  if (!envelope) console.warn('[remote] pair-request dropped: malformed envelope')
  else if (!identity) console.warn('[remote] pair-request dropped: no relay identity loaded')
  else if (envelope.to !== identity.macId) console.warn('[remote] pair-request dropped: addressed to another Mac')
  else if (!pairing) console.warn('[remote] pair-request dropped: no pairing on screen')
}

/**
 * A phone asks for a snapshot now (§12): it just joined, and would otherwise wait for the next
 * heartbeat. Answered with a snapshot to every paired phone, debounced like a presence join.
 * It must come from a paired phone, open with its key, name its current pairing and move
 * forward in seq, so a replay does nothing.
 */
function handleStateRequest(envelope: RelayEnvelope): void {
  const device = identity?.devices.find((d) => d.phoneId === envelope.from)
  const key = device && pairKey(device)
  if (!device || !key) return
  const box = openEnvelope(envelope, key)
  if (!box || typeof box !== 'object' || (box as { pairingId?: unknown }).pairingId !== device.pairingId) return
  if (!acceptSeq(stateRequestSeen, device.phoneId, envelope)) return
  logRelayEvent(`state-request from phone:${device.phoneId}`)
  scheduler?.notifyPresenceJoin()
}

/** 32 bytes in standard base64, padded: the only form a push key travels in (§14). */
const PUSH_KEY_RE = /^[A-Za-z0-9+/]{43}=$/

/**
 * A phone hands this Mac its push key for the pairing (§14), after every unlock of its app.
 * The same checks as any phone → Mac message: a paired phone, a box that opens with its key,
 * its current `pairingId`, and a seq that moves forward. The key is then stored with the
 * device, replacing an earlier one; the same key again writes nothing. No answer either way.
 */
function handlePushKey(envelope: RelayEnvelope): void {
  const self = identity
  const account = userId
  if (!self || !account) return
  const device = self.devices.find((d) => d.phoneId === envelope.from)
  const key = device && pairKey(device)
  if (!device || !key) return
  const box = openEnvelope(envelope, key)
  if (!box || typeof box !== 'object') return
  const { pairingId, pushKey } = box as Record<string, unknown>
  if (pairingId !== device.pairingId || typeof pushKey !== 'string' || !PUSH_KEY_RE.test(pushKey)) return
  if (!acceptSeq(pushKeySeen, device.phoneId, envelope)) return
  if (device.pushKey === pushKey) return
  try {
    setDevicePushKey(account, device.phoneId, device.pairingId, pushKey)
  } catch (error) {
    // The phone sends it again at its next unlock; until then it gets no notification.
    console.error('[remote] failed to store a push key:', error instanceof Error ? error.name : 'unknown error')
    return
  }
  // Onto the record in memory only if it is still that pairing's: revoked or paired again
  // meanwhile, the key belongs to nothing here.
  if (identity === self) {
    self.devices = self.devices.map((d) => (d.phoneId === device.phoneId && d.pairingId === device.pairingId ? { ...d, pushKey } : d))
  }
  logRelayEvent(`push-key from phone:${device.phoneId}`)
}

/**
 * A phone asks to read an agent's conversation (§11). Not a command: it changes nothing on
 * this Mac and only ever answers the phone that sent it, sealed with its own key, so it needs
 * no signature, no Face ID, no bootId. It still has to come from a paired phone, open with
 * its key, name its current pairing, move forward in seq (a replay renews nothing), and name
 * an agent this account's snapshots carry.
 */
function handleChatRequest(envelope: RelayEnvelope): void {
  const self = identity
  const account = userId
  if (!self || !account) return
  const device = self.devices.find((d) => d.phoneId === envelope.from)
  if (!device) return
  const key = pairKey(device)
  if (!key) return
  const box = openEnvelope(envelope, key)
  if (!box || typeof box !== 'object') return
  const { pairingId, appAgentId, commands: wantsCommands } = box as Record<string, unknown>
  if (pairingId !== device.pairingId || typeof appAgentId !== 'string') return
  if (!acceptSeq(chatRequestSeen, device.phoneId, envelope)) return
  if (!isAgentTerminal(appAgentId) || terminalOwner(appAgentId) !== account) {
    chatLeases.forget(device.phoneId)
    return
  }
  chatLeases.renew(device.phoneId, appAgentId, Date.now())
  sendChat(device, appAgentId)
  if (wantsCommands === true) sendCommands(device)
}

/**
 * The `/` commands the phone suggests (§13), to the phone that asked for them alone. A listing
 * that throws sends nothing: the phone asks again with its next request.
 */
function sendCommands(device: StoredRemoteDevice): void {
  let listing: readonly ListingRow[]
  try {
    listing = commandLister?.() ?? []
  } catch (error) {
    console.error('[remote] failed to list the commands:', error)
    return
  }
  void sendSealed('commands', device, { pairingId: device.pairingId, commands: toRelayCommands(listing) })
}

/** The same pairing of the same phone, still in the identity loaded: not revoked meanwhile. */
function stillPaired(self: LoadedIdentity, device: StoredRemoteDevice): StoredRemoteDevice | null {
  if (identity !== self) return null
  return self.devices.find((d) => d.phoneId === device.phoneId && d.pairingId === device.pairingId) ?? null
}

/**
 * A phone's `command` (§10). Steps 1 and 2 here: a sender that is not a paired phone, or a box
 * that does not open with its key, is dropped without a word, since there is no key to answer
 * with. commands.ts does steps 3 to 8, and the `command-result` it returns is sealed back to
 * that phone alone, unless it was revoked while the answer ran: nothing is ever sealed for a
 * revoked phone again (§8).
 */
async function handleCommand(envelope: RelayEnvelope): Promise<void> {
  const self = identity
  const account = userId
  if (!self || !account) return
  const device = self.devices.find((d) => d.phoneId === envelope.from)
  if (!device) return
  const key = pairKey(device)
  if (!key) return
  const box = openEnvelope(envelope, key)
  if (box === null) return
  const result = await commands.handle(
    { box, from: envelope.from, macId: self.macId, device },
    (command) => runCommand(command, self, account, device),
  )
  if (!result) return
  const current = stillPaired(self, device)
  if (!current) return
  if (!live) {
    logRelayEvent(`command-result for phone:${current.phoneId} held until live`)
    heldResults.push({ device: current, self, body: result, at: Date.now() })
    return
  }
  await sendSealed('command-result', current, result)
}

/** On a (re)join: the results that finished while the channel was down, still wanted. */
function flushHeldResults(): void {
  const now = Date.now()
  for (const held of heldResults.splice(0)) {
    const current = stillPaired(held.self, held.device)
    if (!current || now - held.at > RESULT_HOLD_MS) continue
    logRelayEvent(`command-result for phone:${current.phoneId} sent after ${Math.round((now - held.at) / 1000)} s`)
    void sendSealed('command-result', current, held.body)
  }
}

/**
 * §10 step 9, right before the action: the phone is still paired, the relay still serves the
 * account it was paired under, and the agent is one this account's snapshots carry (§5).
 * Anything else is `stale`, and nothing reaches a terminal. An answer then takes the tray's
 * own path, token check and keystrokes included; a prompt the desktop chat's, and a stop its
 * Stop button's (main/index.ts).
 */
async function runCommand(command: RemoteCommand, self: LoadedIdentity, account: string, device: StoredRemoteDevice): Promise<CommandOutcome> {
  const { appAgentId } = command
  // Asked again by a prompt as it is typed: it may wait behind another submission (§10).
  const stillWanted = () =>
    stillPaired(self, device) !== null && userId === account
    && isAgentTerminal(appAgentId) && terminalOwner(appAgentId) === account
  const run = dispatch(command, stillWanted)
  if (!run || !stillWanted()) return { ok: false, reason: 'stale' }
  return run()
}

/** The runner wired for this command's action, bound to it, or null when none is. */
function dispatch(command: RemoteCommand, stillWanted: () => boolean): (() => Promise<CommandOutcome>) | null {
  const { appAgentId } = command
  switch (command.action) {
    // A question it clears is republished by the question listener (main/index.ts).
    case 'answer': {
      const run = answerer
      return run && (() => run(appAgentId, command.token, command.choice))
    }
    case 'prompt': {
      const run = prompter
      return run && (() => run(appAgentId, command.text, stillWanted))
    }
    case 'stop': {
      const run = stopper
      return run && (() => run(appAgentId))
    }
  }
}

// --- channel ----------------------------------------------------------------

function clearSubscribeWatchdog(): void {
  if (subscribeWatchdog) {
    clearTimeout(subscribeWatchdog)
    subscribeWatchdog = null
  }
}

function armSubscribeWatchdog(ch: RealtimeChannel, deadline = SUBSCRIBE_DEADLINE_MS): void {
  clearSubscribeWatchdog()
  subscribeWatchdog = setTimeout(() => {
    subscribeWatchdog = null
    void withLock(async () => {
      if (channel !== ch || live) return
      logRelayEvent('watchdog: not live after its deadline, leaving the channel')
      console.warn('[remote] relay channel not live after its deadline, leaving it so the next connectivity check rejoins')
      await teardown()
      emitState()
    })
  }, deadline)
  subscribeWatchdog.unref?.()
}

function setLive(next: boolean): void {
  if (next === live) return
  live = next
  logRelayEvent(live ? 'live' : 'not live')
  if (live) {
    clearSubscribeWatchdog()
    // A (re)join: the phones may have missed anything while we were gone, and nothing is
    // replayed, so the scheduler starts with a complete snapshot.
    scheduler ??= new SnapshotScheduler(publishSnapshot)
    scheduler.start()
    flushHeldResults()
  } else {
    scheduler?.stop()
  }
  emitState()
}

/** See plan-live's `ensureTokenReapply`: a private channel rejoined with the anon key is refused. */
function ensureTokenReapply(c: SupabaseClient): void {
  if (authListenerUnsub) return
  const { data } = c.auth.onAuthStateChange((_event, session) => {
    if (session?.access_token) c.realtime.setAuth(session.access_token)
  })
  authListenerUnsub = () => {
    try {
      data.subscription.unsubscribe()
    } catch (error) {
      console.error('[remote] failed to unsubscribe auth listener:', error)
    }
  }
}

async function trackUntilLive(ch: RealtimeChannel, join: number): Promise<void> {
  if (channel !== ch || joinCount !== join) return
  // `{}`: presence is clear text, so it never carries a name or a state (§2).
  const result = await ch.track({}).catch(() => 'error' as const)
  if (channel !== ch || joinCount !== join) return
  if (result === 'ok') {
    setLive(true)
    return
  }
  logRelayEvent(`presence track answered ${result}`)
  console.warn(`[remote] presence track answered ${result}, retrying`)
  const retry = setTimeout(() => void trackUntilLive(ch, join), TRACK_RETRY_MS)
  retry.unref?.()
}

function join(c: SupabaseClient, uid: string, macId: string): void {
  const ch = c.channel(`relay:${uid}`, {
    config: { private: true, presence: { key: `mac:${macId}` }, broadcast: { self: false } },
  })
  channel = ch
  ch
    .on('broadcast', { event: 'relay' }, (message: { payload?: unknown }) => {
      if (channel === ch) handleIncoming(message?.payload)
    })
    .on('presence', { event: 'join' }, ({ key }: { key?: string }) => {
      if (channel !== ch || typeof key !== 'string' || !key.startsWith('phone:')) return
      logRelayEvent(`presence join ${key}`)
      scheduler?.notifyPresenceJoin()
    })
    .on('presence', { event: 'leave' }, ({ key }: { key?: string }) => {
      if (channel === ch && typeof key === 'string' && key.startsWith('phone:')) logRelayEvent(`presence leave ${key}`)
    })
    .subscribe((status: string, error?: Error) => {
      if (channel !== ch) return
      logRelayEvent(`channel ${status}${error?.message ? ` (${error.message})` : ''}`)
      const current = ++joinCount
      if (status !== 'SUBSCRIBED') {
        const dropped = live
        setLive(false)
        // A channel that was live and dropped (sleep, a network change, a server close) is
        // not rejoined by realtime-js: left after a short deadline, so the next connectivity
        // check joins a fresh one. A first join keeps the long one.
        if (dropped) armSubscribeWatchdog(ch, DROP_DEADLINE_MS)
        else if (!subscribeWatchdog) armSubscribeWatchdog(ch)
        return
      }
      // On EVERY join: realtime-js does not track again after a rejoin by itself.
      void trackUntilLive(ch, current)
    })
  armSubscribeWatchdog(ch)
}

/**
 * `syncAccount(true)`, logged: undefined when the identity cannot be created. No keychain: an
 * identity this Mac would forget cannot be handed to a phone.
 */
async function createAccountOrLog(): Promise<string | null | undefined> {
  try {
    return await syncAccount(true)
  } catch (error) {
    console.error('[remote] cannot create the relay identity:', error instanceof Error ? error.message : 'unknown error')
    return undefined
  }
}

async function startInternal(): Promise<void> {
  if (!isEnabled()) return
  const c = await getAuthedClient()
  const token = loadSession()?.access_token
  const uid = await createAccountOrLog()
  if (uid === undefined) {
    emitState()
    return
  }
  if (!uid || !token || !c) {
    if (!uid) suspended = true
    emitState()
    return
  }
  suspended = false
  // Re-checked after the awaits: remote mode may have been switched off meanwhile.
  if (!isEnabled() || channel || !identity) {
    emitState()
    return
  }

  // CRITICAL for a private channel: authorize the socket before subscribing.
  c.realtime.setAuth(token)
  ensureTokenReapply(c)
  client = c
  // A fresh epoch per start (§4), and seq from 1 within it.
  epoch = crypto.randomUUID().toLowerCase()
  seq = 0
  nextGeneration(uid, identity)
  logRelayEvent(`join (generation ${identity.generation})`)
  try {
    join(c, uid, identity.macId)
  } catch (error) {
    console.error('[remote] failed to subscribe:', error)
    await teardown()
  }
  emitState()
}

/**
 * A new generation for this relay start (§6): the phones order snapshots by it, never by this
 * Mac's clock. Saved so the next launch goes above it. A save that fails is logged and the
 * relay runs all the same, on the incremented value held in memory: a phone then at worst
 * waits for a later generation after a relaunch, and a phone that never updates is worse.
 */
function nextGeneration(uid: string, self: LoadedIdentity): void {
  self.generation += 1
  try {
    saveGeneration(uid, self.generation)
  } catch (error) {
    console.error('[remote] failed to save the relay generation:', error instanceof Error ? error.message : 'unknown error')
  }
}

async function teardown(): Promise<void> {
  if (channel) logRelayEvent('leave the channel')
  if (authListenerUnsub) {
    authListenerUnsub()
    authListenerUnsub = null
  }
  clearSubscribeWatchdog()
  const ch = channel
  const c = client
  const wasLive = live
  // Released BEFORE the awaits: removeChannel fires the CLOSED callback, which must find
  // nothing to report on.
  channel = null
  client = null
  joinCount++
  setLive(false)
  if (c && ch) {
    if (wasLive) {
      await ch.untrack({ timeout: UNTRACK_TIMEOUT_MS })
        .catch((error: unknown) => console.error('[remote] failed to untrack presence:', error))
    }
    await c.removeChannel(ch).catch((error: unknown) => console.error('[remote] failed to remove channel:', error))
  }
}

// --- lifecycle --------------------------------------------------------------

/** At launch: hold the power blocker if remote mode was left on. Joins nothing. */
export function initRemoteRelay(): void {
  if (isEnabled()) holdPowerBlocker()
}

/**
 * Join the relay if remote mode is on and the account is signed in. Called by the
 * connectivity poller on every `ok`; a no-op when off or already joined (for this account).
 */
export function resumeRemoteRelay(): Promise<void> {
  if (!isEnabled()) return Promise.resolve()
  holdPowerBlocker()
  if (channel && !suspended && sessionUserId() === userId) return Promise.resolve()
  return withLock(startInternal)
}

/** The session was refused: leave the channel and forget the account until the next `ok`. */
export function suspendRemoteRelay(): Promise<void> {
  return withLock(async () => {
    await teardown()
    forgetAccount()
    suspended = true
    emitState()
  })
}

/** Quit: leave the channel (our presence goes now, not on the server's timeout) and let go of the blocker. */
export function stopRemoteRelay(): Promise<void> {
  closePairing()
  releasePowerBlocker()
  return withLock(teardown)
}

/** Flip remote mode. Off tears down at once, whatever the write did: off must mean off now. */
export async function setRemoteEnabled(next: boolean): Promise<RemoteState> {
  if (next) {
    enabled = setRemoteModeEnabled(true)
    if (enabled) {
      holdPowerBlocker()
      await withLock(startInternal)
    }
  } else {
    setRemoteModeEnabled(false)
    enabled = false
    await stopRemoteRelay()
  }
  return emitState()
}

// --- pairing ----------------------------------------------------------------

/**
 * Close the pairing on screen. `announce` false is for a pairing replaced by a new one: the
 * new one's first state follows at once, and a `null` in between would close the dialog that
 * is waiting for it.
 */
function closePairing(announce = true): void {
  if (!pairing) return
  pairing.cancel()
  pairing = null
  pairingAttempt = null
  if (announce) emitters?.pairing(null)
}

/**
 * Put a QR up. Null when remote mode is off (no QR is ever offered then), when signed out,
 * when the relay is not live (the phone's request and our answer both ride it), or when this
 * Mac's identity cannot be stored. Replaces any pairing already on screen.
 *
 * Every call that puts a QR up gets its own `attemptId`, carried by every `RemotePairing` it
 * emits: the page cancels by that id, so a cleanup for an older call that arrives late can
 * never close a newer pairing.
 */
export function startRemotePairing(): Promise<RemotePairing | null> {
  if (!isEnabled()) return Promise.resolve(null)
  return withLock(async () => {
    if (!isEnabled()) return null
    const uid = await createAccountOrLog()
    const self = identity
    if (!uid || !self || !live || !channel) return null
    closePairing(false)
    const attemptId = crypto.randomUUID().toLowerCase()
    const session: PairingSession = new PairingSession({
      macId: self.macId,
      macPrivate: self.privateKey,
      macPublicRaw: self.publicRaw,
      macName: macName(),
      onChange: (p) => {
        if (pairing === session) emitters?.pairing({ ...p, attemptId })
      },
      send: sendPairing,
      storeDevice: (device) => {
        // Throws without a keychain, and the approval fails with it (pairing.ts).
        const stored = addDevice(uid, device)
        if (identity === self) {
          self.devices = stored.devices
          pairKeys.delete(device.phoneId)
        }
        emitState()
      },
      // The `pair-accepted` did not go out: the phone never saved this Mac, so neither do we.
      forgetDevice: (phoneId) => {
        if (identity === self) {
          self.devices = self.devices.filter((d) => d.phoneId !== phoneId)
          pairKeys.delete(phoneId)
        }
        try {
          removeDevice(uid, phoneId)
        } catch (error) {
          console.error('[remote] failed to forget a phone whose pairing was not sent:', error instanceof Error ? error.message : 'unknown error')
        } finally {
          emitState()
        }
      },
    })
    pairing = session
    pairingAttempt = attemptId
    return { ...session.start(), attemptId }
  })
}

/**
 * Close the pairing on screen. With an `attemptId`, only if it is the current attempt's:
 * a stale one (the page's cleanup for a call since replaced) does nothing. Without one,
 * whatever is on screen closes.
 */
export function cancelRemotePairing(attemptId?: string): void {
  if (attemptId !== undefined && attemptId !== pairingAttempt) return
  closePairing()
}

/**
 * Rejects when the phone cannot be stored (no keychain) or told (relay not live, send
 * refused): the device is then not kept, and the confirmation stays on screen.
 */
export async function approveRemotePairing(): Promise<void> {
  const session = pairing
  if (!session) return
  if (!live || !channel) throw new Error(NOT_SENT)
  await session.approve()
  // The new phone gets the state right after its `pair-accepted`.
  if (session.current.phase === 'paired') scheduler?.notifyState()
}

export function declineRemotePairing(): void {
  pairing?.decline()
}

/**
 * Revoke a phone (§8): it is sent `revoked`, then its key is forgotten, and nothing is
 * sealed for it again — even with a valid session it reads nothing from here on. Works with
 * remote mode off too (nothing is sent then, and the key goes all the same).
 */
export function revokeRemoteDevice(phoneId: string): Promise<RemoteState> {
  return withLock(async () => {
    const uid = await syncAccount(false)
    const self = identity
    const device = self?.devices.find((d) => d.phoneId === phoneId)
    if (uid && self && device) {
      // Names the pairing it ends (§8): a phone paired again since drops a replay of this one.
      await sendSealed('revoked', device, { pairingId: device.pairingId })
      // Out of memory FIRST: whatever the write does, this session never seals for it again.
      self.devices = self.devices.filter((d) => d.phoneId !== phoneId)
      pairKeys.delete(phoneId)
      chatLeases.forget(phoneId)
      pushKeySeen.delete(phoneId)
      // Not awaited: the server's row is the phone's to clean up too, and revoking must
      // not wait on (or fail with) the network.
      void forgetPushDevice(phoneId, self.macId)
      try {
        removeDevice(uid, phoneId)
      } finally {
        emitState()
      }
    }
    return getRemoteState()
  })
}

/**
 * Delete this pair's `push_devices` row (§8, §14), so the server stops relaying to that phone
 * at once. Best effort: a failure is logged and the revocation stands all the same, since the
 * push key goes with the device and nothing sealed from here would open anyway.
 */
async function forgetPushDevice(phoneId: string, macId: string): Promise<void> {
  try {
    const c = await getAuthedClient()
    if (!c) return
    const { error } = await c.from('push_devices').delete().eq('phone_id', phoneId).eq('mac_id', macId)
    if (error) console.error('[remote] failed to delete the push row of a revoked phone:', error.code ?? 'unknown error')
  } catch (error) {
    console.error('[remote] failed to delete the push row of a revoked phone:', error instanceof Error ? error.name : 'unknown error')
  }
}

/** Test seam: forget every module-level value, as at a cold launch. */
export async function __resetRemoteRelayForTests(): Promise<void> {
  await stopRemoteRelay()
  forgetAccount()
  enabled = null
  suspended = false
  scheduler = null
  lastStateKey = ''
}
