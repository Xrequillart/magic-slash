import type { ChatEntry, ChatSnapshot } from '../../types'

/**
 * The conversation a phone reads (PROTOCOL.md §11): the desktop chat's entries, bounded so
 * one sealed box fits a broadcast, and the leases that say which phone is reading which agent.
 *
 * Pulled, never pushed unasked. A phone that opens a session sends `chat-request`, and gets the
 * conversation's tail at once and again on every change for as long as its lease runs. The
 * lease is renewed by the next request: a phone that left the screen, or the channel, simply
 * stops renewing, and nothing is sent for it after `LEASE_MS`.
 *
 * Each `chat` is the complete tail, never a delta: broadcast is not replayed (§2), so a missed
 * one is made good by the next, the way snapshots are.
 */

/** The bounds of a published chat. `bytes` keeps the box well under Realtime's payload cap. */
export const CHAT_LIMITS = { entries: 80, text: 4000, summary: 300, name: 80, queue: 10, bytes: 96_000 } as const

/** How long a `chat-request` keeps a phone subscribed to an agent's conversation. */
export const CHAT_LEASE_MS = 45_000

/** One entry as the phone reads it: tool output and diffs stay on the Mac. */
export type RelayChatEntry =
  | { kind: 'user' | 'assistant' | 'notice'; id: string; text: string; at?: number; cut?: true }
  | { kind: 'tool'; id: string; name: string; summary: string; status: 'running' | 'done' | 'error' }

export interface RelayChatBody {
  appAgentId: string
  /** The relay start it belongs to (§6): the phone orders by it, then by epoch and seq. */
  generation: number
  entries: RelayChatEntry[]
  /** Prompts Claude Code holds until the current turn ends, oldest first. */
  queue: { id: string; text: string }[]
  /** Older entries were left out: the Mac has the whole conversation. */
  hasEarlier: boolean
}

/** `text` cut at `max` code points: a cut through a surrogate pair would not encode. */
function cut(text: string, max: number): { text: string; cut: boolean } {
  if (text.length <= max) return { text, cut: false }
  const points = Array.from(text)
  return points.length <= max ? { text, cut: false } : { text: points.slice(0, max).join(''), cut: true }
}

function toRelayEntry(entry: ChatEntry): RelayChatEntry {
  if (entry.kind === 'tool') {
    return {
      kind: 'tool',
      id: entry.id,
      name: cut(entry.name, CHAT_LIMITS.name).text,
      summary: cut(entry.summary, CHAT_LIMITS.summary).text,
      status: entry.status,
    }
  }
  const text = cut(entry.text, CHAT_LIMITS.text)
  return {
    kind: entry.kind,
    id: entry.id,
    text: text.text,
    ...('at' in entry && typeof entry.at === 'number' ? { at: entry.at } : {}),
    ...(text.cut ? { cut: true as const } : {}),
  }
}

/**
 * The conversation's tail in the protocol's shape: the last entries that fit both
 * `CHAT_LIMITS.entries` and `CHAT_LIMITS.bytes`, newest kept first, so the phone always has
 * what was said last. One entry is always kept, whatever its size: it is already cut.
 */
export function toRelayChat(chat: ChatSnapshot, appAgentId: string, generation: number): RelayChatBody {
  const queue = chat.queue.slice(-CHAT_LIMITS.queue).map((q) => ({ id: q.id, text: cut(q.text, CHAT_LIMITS.text).text }))
  let budget = CHAT_LIMITS.bytes - Buffer.byteLength(JSON.stringify(queue))
  const kept: RelayChatEntry[] = []
  for (let i = chat.entries.length - 1; i >= 0 && kept.length < CHAT_LIMITS.entries; i--) {
    const entry = toRelayEntry(chat.entries[i])
    const size = Buffer.byteLength(JSON.stringify(entry)) + 1
    if (kept.length > 0 && size > budget) break
    budget -= size
    kept.push(entry)
  }
  kept.reverse()
  return { appAgentId, generation, entries: kept, queue, hasEarlier: kept.length < chat.entries.length }
}

/** Which agent each phone reads, until when. One agent per phone: the screen it has open. */
export class ChatLeases {
  private readonly leases = new Map<string, { appAgentId: string; until: number }>()

  /** The phone reads `appAgentId` for the next `CHAT_LEASE_MS`, and nothing else. */
  renew(phoneId: string, appAgentId: string, now: number): void {
    this.leases.set(phoneId, { appAgentId, until: now + CHAT_LEASE_MS })
  }

  /** The phones still reading `appAgentId`. Expired leases are dropped on the way. */
  readers(appAgentId: string, now: number): string[] {
    const phones: string[] = []
    for (const [phoneId, lease] of this.leases) {
      if (lease.until <= now) this.leases.delete(phoneId)
      else if (lease.appAgentId === appAgentId) phones.push(phoneId)
    }
    return phones
  }

  forget(phoneId: string): void {
    this.leases.delete(phoneId)
  }

  clear(): void {
    this.leases.clear()
  }
}
