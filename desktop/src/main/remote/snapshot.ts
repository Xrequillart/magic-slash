import type { TerminalMetadata, TerminalState } from '../../types'

/**
 * The state snapshot (PROTOCOL.md §5) and the schedule it is sent on.
 *
 * Built from the terminals in memory, never from the `agents` table: the runtime state and
 * the usage are exactly what the ticket keeps OUT of the cloud, and the snapshot is the only
 * place they go, sealed.
 */
export interface RelayAgentUsage {
  costUsd: number | null
  contextPercent: number | null
  model: string | null
  fiveHourPercent: number | null
  fiveHourResetsAt: number | null
  sevenDayPercent: number | null
  sevenDayResetsAt: number | null
}

export interface RelayAgent {
  appAgentId: string
  title: string
  state: TerminalState
  usage: RelayAgentUsage | null
}

/** What every phone of the Mac is sent alike: the snapshot before it is addressed. */
export interface RelaySnapshotBody {
  /** The relay start this snapshot belongs to (§6): what the phone orders by. */
  generation: number
  /** Mac clock, epoch ms. Shown, never compared (§6). */
  sentAt: number
  macName: string
  agents: RelayAgent[]
}

/** The snapshot as one phone receives it (§5): named by that phone's pairing. */
export interface RelaySnapshot extends RelaySnapshotBody {
  pairingId: string
}

/** What a snapshot reads of a terminal: a structural subset, so tests need no PTY. */
export interface SnapshotTerminal {
  id: string
  name: string
  state: TerminalState
  metadata?: TerminalMetadata
}

const num = (value: unknown): number | null => (typeof value === 'number' && Number.isFinite(value) ? value : null)

/** Only the fields the protocol names: the transcript path and the rest stay on the Mac. */
export function toRelayUsage(usage: TerminalMetadata['usage']): RelayAgentUsage | null {
  if (!usage) return null
  return {
    costUsd: num(usage.costUsd),
    contextPercent: num(usage.contextPercent),
    model: typeof usage.model === 'string' && usage.model ? usage.model : null,
    fiveHourPercent: num(usage.fiveHourPercent),
    fiveHourResetsAt: num(usage.fiveHourResetsAt),
    sevenDayPercent: num(usage.sevenDayPercent),
    sevenDayResetsAt: num(usage.sevenDayResetsAt),
  }
}

/** Script runners and the sidebar's shell are terminals, not agents (as for the tray). */
export function isAgentTerminal(id: string): boolean {
  return !id.startsWith('script-') && !id.startsWith('sidebar-')
}

/**
 * `isOwned` says whether a terminal belongs to the account the snapshot is sealed for. It is
 * required, not defaulted: a terminal started under another account (one whose session was
 * refused, then someone else signed in) must never reach this account's phones, and one whose
 * owner is unknown is left out too.
 */
export function buildSnapshot(
  terminals: SnapshotTerminal[],
  macName: string,
  sentAt: number,
  generation: number,
  isOwned: (terminalId: string) => boolean,
): RelaySnapshotBody {
  return {
    generation,
    sentAt,
    macName,
    agents: terminals
      .filter((t) => isAgentTerminal(t.id) && isOwned(t.id))
      .map((t) => ({
        appAgentId: t.id,
        title: t.metadata?.title || t.name,
        state: t.state,
        usage: toRelayUsage(t.metadata?.usage),
      })),
  }
}

/**
 * The snapshot for one phone: the shared body, named by that phone's pairing, so the
 * plaintext sealed for each phone is its own (§5, §6).
 */
export function snapshotFor(body: RelaySnapshotBody, pairingId: string): RelaySnapshot {
  return { pairingId, ...body }
}

export const USAGE_THROTTLE_MS = 2_000
export const PRESENCE_DEBOUNCE_MS = 1_000
export const HEARTBEAT_MS = 30_000

export interface SchedulerTimers {
  setTimeout: (fn: () => void, ms: number) => unknown
  clearTimeout: (handle: unknown) => void
  now: () => number
}

const defaultTimers: SchedulerTimers = {
  setTimeout: (fn, ms) => {
    const timer = setTimeout(fn, ms)
    // Never hold the process open for a heartbeat (matters in tests/teardown).
    timer.unref?.()
    return timer
  },
  clearTimeout: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
  now: () => Date.now(),
}

/**
 * When to send (§5): at once on a state change, at most every 2 s on a usage change, 1 s after
 * a phone's presence joins, and every 30 s of silence as a heartbeat (the phone's 75 s rule
 * counts on it). Every send is a complete snapshot, so one send answers every reason pending.
 *
 * "At once" still waits for the current tick to end: a hook moves several agents, or one
 * agent's state and metadata, in one go, and those are one snapshot, not five.
 */
export class SnapshotScheduler {
  private readonly send: () => void
  private readonly timers: SchedulerTimers
  private immediate: unknown = null
  private usageTimer: unknown = null
  private presenceTimer: unknown = null
  private heartbeat: unknown = null
  private lastSentAt = Number.NEGATIVE_INFINITY
  private running = false

  constructor(send: () => void, timers: SchedulerTimers = defaultTimers) {
    this.send = send
    this.timers = timers
  }

  /** Send a first snapshot now, and keep the heartbeat from there. */
  start(): void {
    this.running = true
    this.notifyState()
  }

  stop(): void {
    this.running = false
    for (const handle of [this.immediate, this.usageTimer, this.presenceTimer, this.heartbeat]) {
      if (handle !== null) this.timers.clearTimeout(handle)
    }
    this.immediate = this.usageTimer = this.presenceTimer = this.heartbeat = null
  }

  notifyState(): void {
    if (!this.running || this.immediate !== null) return
    this.immediate = this.timers.setTimeout(() => {
      this.immediate = null
      this.flush()
    }, 0)
  }

  notifyUsage(): void {
    if (!this.running || this.immediate !== null || this.usageTimer !== null) return
    const wait = this.lastSentAt + USAGE_THROTTLE_MS - this.timers.now()
    if (wait <= 0) {
      this.notifyState()
      return
    }
    this.usageTimer = this.timers.setTimeout(() => {
      this.usageTimer = null
      this.flush()
    }, wait)
  }

  /** A phone came online: give it the state shortly, once the joins of a reconnect settle. */
  notifyPresenceJoin(): void {
    if (!this.running) return
    if (this.presenceTimer !== null) this.timers.clearTimeout(this.presenceTimer)
    this.presenceTimer = this.timers.setTimeout(() => {
      this.presenceTimer = null
      this.flush()
    }, PRESENCE_DEBOUNCE_MS)
  }

  private flush(): void {
    if (!this.running) return
    // One snapshot answers every reason that was waiting: drop the timers it makes moot.
    if (this.usageTimer !== null) {
      this.timers.clearTimeout(this.usageTimer)
      this.usageTimer = null
    }
    if (this.heartbeat !== null) this.timers.clearTimeout(this.heartbeat)
    this.lastSentAt = this.timers.now()
    try {
      this.send()
    } catch (error) {
      console.error('[remote] failed to send a snapshot:', error)
    }
    this.heartbeat = this.timers.setTimeout(() => {
      this.heartbeat = null
      this.flush()
    }, HEARTBEAT_MS)
  }
}
