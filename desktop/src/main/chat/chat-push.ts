import type { ChatEntry, ChatPush, ChatSnapshot, NumberedChatSnapshot } from '../../types'

/**
 * WHAT EACH AGENT'S CHAT WAS LAST SENT, so the next push carries only what changed.
 *
 * A long conversation is a megabyte of entries, and a working agent pushes every 80 ms:
 * sent whole, it was copied into the renderer and drawn again each time, which is what
 * made switching agents lag while one of them worked. The transcript replaces an entry
 * rather than mutating it (see transcript.ts), so the first entry that is not the same
 * object as the one sent is where the change starts, and everything before it is skipped.
 *
 * Never forgotten, so an agent's numbers only go up: a renderer still holding an old
 * number after its chat was reset reads the snapshot again rather than taking a patch
 * for one it never had.
 */
const sent = new Map<string, { seq: number; entries: ChatEntry[] }>()

/** The push for this snapshot, recorded as sent. */
export function chatPush(terminalId: string, chat: ChatSnapshot): ChatPush {
  const last = sent.get(terminalId)
  const previous = last?.entries ?? []
  const shared = Math.min(previous.length, chat.entries.length)
  let from = 0
  while (from < shared && previous[from] === chat.entries[from]) from++
  const base = last?.seq ?? 0
  const seq = base + 1
  sent.set(terminalId, { seq, entries: chat.entries })
  return { id: terminalId, seq, base, from, tail: chat.entries.slice(from), queue: chat.queue, background: chat.background }
}

/** The snapshot, numbered by the last push sent: the next one applies to it. */
export function numberedSnapshot(terminalId: string, chat: ChatSnapshot): NumberedChatSnapshot {
  return { ...chat, seq: sent.get(terminalId)?.seq ?? 0 }
}
