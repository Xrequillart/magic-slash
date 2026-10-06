import type { ChatDiff, ChatEntry, ChatQueuedPrompt } from '../../types'
import { stripAnsi } from '../../strip-ansi'

/**
 * Turns a Claude Code transcript (the session's JSONL) into the chat view's entries.
 *
 * WHY THE TRANSCRIPT AND NOT THE PTY
 * ---------------------------------------------------------------------------
 * The chat view is a second way of looking at the SAME `claude` process the terminal
 * shows, so the connection, the hooks and the permissions are untouched. The PTY
 * stream is a screen, redrawn in place, with nothing in it that says where a message
 * starts; the transcript is the conversation itself, appended one JSON object per
 * line. Claude Code writes it whatever is watching.
 *
 * Fed line by line (see transcript-watcher.ts, which tails the file), so the state is
 * a class: a tool result lands lines after its call and has to find it.
 *
 * What is dropped: every line that is not a `user` or `assistant` message (titles,
 * snapshots, attachments, mode changes), meta and sidechain messages (injected
 * context, subagents), thinking blocks, and the system reminders Claude Code wraps
 * around a prompt. The format is Claude Code's, not ours, so every read is defensive:
 * a line it does not understand is skipped, never thrown on.
 *
 * THE QUEUE. A prompt typed while the agent works is held by Claude Code, and each move
 * of that queue is a `queue-operation` line: `enqueue` with the text, `dequeue` when the
 * turn ends and the head goes in as the next prompt, `remove` with the text when it is
 * taken mid-turn (it then lands as a `queued_command` attachment) or pulled back to the
 * input box. Replayed in order, they leave what is still waiting. What Claude Code queues
 * for itself (task notifications, subagent hand-backs) comes wrapped in a tag and is not
 * shown: it is not the user's.
 */

/** Long tool outputs are clipped: the chat shows a glimpse, the terminal has the rest. */
const MAX_OUTPUT = 4000
/** A diff card past this many lines is cut, and says so. */
const MAX_DIFF_LINES = 400

/**
 * What Claude Code writes, as a user line, when Escape stops a turn ("…by user", or
 * "…by user for tool use" when a tool was running). Its, not the user's.
 */
const INTERRUPTED = /^\[Request interrupted by user[^\]]*\]$/

type Block = { type?: string; text?: string; name?: string; id?: string; input?: Record<string, unknown>; tool_use_id?: string; content?: unknown; is_error?: boolean }

export class ChatTranscript {
  readonly entries: ChatEntry[] = []
  /**
   * When the turn the transcript ends on was interrupted (epoch ms), or null when it
   * ends on anything else. An interrupt fires no Stop hook, so this line is the only
   * trace of it: see `settleInterruptedTurn` in terminal-manager.ts.
   */
  interruptedAt: number | null = null
  /**
   * The prompt the transcript ends on while nothing has come back for it yet, or null.
   * Escape at that point leaves no line at all: Claude Code takes the prompt back into
   * its input box, as if it had never been sent. See `dropUnanswered`.
   */
  unanswered: { ids: string[]; text: string } | null = null
  /** The prompts still waiting, oldest first. Replaced on every change, never mutated. */
  queue: ChatQueuedPrompt[] = []
  private readonly tools = new Map<string, Extract<ChatEntry, { kind: 'tool' }>>()
  /** What a command changed, measured by the app (see command-diff.ts), for a call not read yet. */
  private readonly commandDiffs = new Map<string, ChatDiff[]>()

  /**
   * What a shell command changed on disk, onto its tool entry. The hook may land before
   * the transcript line of the call is read, so it waits for it then. Returns whether
   * the entries changed.
   */
  attachDiffs(toolUseId: string, diffs: ChatDiff[]): boolean {
    const entry = this.tools.get(toolUseId)
    if (!entry) {
      this.commandDiffs.set(toolUseId, diffs)
      return false
    }
    const updated = { ...entry, diffs }
    const index = this.entries.indexOf(entry)
    if (index >= 0) this.entries[index] = updated
    this.tools.set(toolUseId, updated)
    return true
  }

  /** Returns whether the entries changed. */
  push(line: string): boolean {
    let data: { type?: string; uuid?: string; timestamp?: unknown; isMeta?: boolean; isSidechain?: boolean; content?: unknown; message?: { content?: unknown }; toolUseResult?: unknown; operation?: unknown; attachment?: QueuedAttachment; origin?: { kind?: string } }
    try {
      data = JSON.parse(line)
    } catch {
      return false
    }
    if (!data || data.isMeta || data.isSidechain) return false
    if (data.type === 'queue-operation') return this.moveQueue(data.operation, data.content, data.timestamp)
    const id = data.uuid ?? String(this.entries.length)

    // A queued prompt taken in mid-turn is not written as a user message but as an
    // attachment: it is still what the user said, at that point of the turn.
    if (data.type === 'attachment') {
      const a = data.attachment
      const human = a?.type === 'queued_command' && a.commandMode === 'prompt' && (!a.origin || a.origin.kind === 'human')
      const text = human && typeof a.prompt === 'string' ? userText(a.prompt) : ''
      if (!text) return false
      const at = typeof data.timestamp === 'string' ? Date.parse(data.timestamp) : NaN
      this.entries.push({ kind: 'user', id, text, ...(Number.isFinite(at) ? { at } : {}) })
      return true
    }

    // A local command's output is written two ways, as a user message or as a
    // `system` line of its own; either way it is the command answering, not the user.
    const raw = typeof data.message?.content === 'string' ? data.message.content : typeof data.content === 'string' ? data.content : null
    const output = raw !== null && (data.type === 'user' || data.type === 'system') ? localCommandOutput(raw) : null
    if (output !== null) {
      // A local command answered its prompt: there is nothing left for Escape to take back.
      this.unanswered = null
      if (!output) return false
      this.entries.push({ kind: 'notice', id, text: output })
      return true
    }
    if (data.type !== 'user' && data.type !== 'assistant') return false
    // A prompt Claude Code wrote for itself — a background task's `<task-notification>`,
    // a coordinator's turn — is a `user` line too, and only its origin says nobody typed
    // it. Lines with no origin (tool results, older versions) are read as they always were.
    if (data.type === 'user' && data.origin && data.origin.kind !== 'human') return false

    const content = data.message?.content
    const blocks: Block[] = typeof content === 'string' ? [{ type: 'text', text: content }] : Array.isArray(content) ? content : []

    const interrupt = data.type === 'user' && blocks.find((b) => b?.type === 'text' && typeof b.text === 'string' && INTERRUPTED.test(b.text.trim()))
    if (interrupt) {
      const at = typeof data.timestamp === 'string' ? Date.parse(data.timestamp) : NaN
      this.interruptedAt = Number.isFinite(at) ? at : Date.now()
      this.unanswered = null
      this.entries.push({ kind: 'notice', id, text: interrupt.text!.trim().slice(1, -1) })
      return true
    }
    // Anything else said after it means the session moved on.
    this.interruptedAt = null
    // A thinking block counts: the turn has begun answering, even if nothing is shown.
    if (data.type === 'assistant') this.unanswered = null
    const prompt: { ids: string[]; texts: string[] } = { ids: [], texts: [] }

    let changed = false
    blocks.forEach((block, i) => {
      const blockId = `${id}:${i}`
      if (block?.type === 'text' && typeof block.text === 'string') {
        const text = data.type === 'user' ? userText(block.text) : block.text.trim()
        if (!text) return
        if (data.type === 'user') {
          const at = typeof data.timestamp === 'string' ? Date.parse(data.timestamp) : NaN
          this.entries.push({ kind: 'user', id: blockId, text, ...(Number.isFinite(at) ? { at } : {}) })
          prompt.ids.push(blockId)
          prompt.texts.push(text)
        } else {
          this.entries.push({ kind: 'assistant', id: blockId, text })
        }
        changed = true
      } else if (block?.type === 'tool_use' && data.type === 'assistant') {
        const entry: Extract<ChatEntry, { kind: 'tool' }> = {
          kind: 'tool',
          id: blockId,
          name: block.name ?? 'Tool',
          summary: toolSummary(block.input),
          status: 'running',
        }
        const diffs = block.id ? this.commandDiffs.get(block.id) : undefined
        if (diffs && block.id) {
          entry.diffs = diffs
          this.commandDiffs.delete(block.id)
        }
        this.entries.push(entry)
        if (block.id) this.tools.set(block.id, entry)
        changed = true
      } else if (block?.type === 'tool_result' && block.tool_use_id) {
        const entry = this.tools.get(block.tool_use_id)
        if (!entry) return
        // Replaced, not mutated: the renderer memoises on identity.
        const diff = block.is_error ? null : diffFrom(data.toolUseResult)
        const updated = {
          ...entry,
          status: block.is_error ? 'error' as const : 'done' as const,
          output: resultText(block.content),
          ...(diff ? { diff } : {}),
        }
        const index = this.entries.indexOf(entry)
        if (index >= 0) this.entries[index] = updated
        this.tools.set(block.tool_use_id, updated)
        changed = true
      }
    })
    if (prompt.ids.length) this.unanswered = { ids: prompt.ids, text: prompt.texts.join('\n') }
    return changed
  }

  /**
   * Takes the unanswered prompt out of the entries, the way Claude Code took it back into
   * its input box, and answers its text (null when there is none).
   */
  dropUnanswered(): string | null {
    const prompt = this.unanswered
    if (!prompt) return null
    this.unanswered = null
    for (const id of prompt.ids) {
      const index = this.entries.findIndex((e) => e.id === id)
      if (index >= 0) this.entries.splice(index, 1)
    }
    return prompt.text
  }

  /**
   * Every prompt held, Claude Code's own included: a `dequeue` names none and takes the
   * head, which may be one of those.
   */
  private held: (ChatQueuedPrompt & { own: boolean })[] = []
  private queued = 0

  private moveQueue(operation: unknown, content: unknown, timestamp: unknown): boolean {
    if (operation === 'enqueue') {
      if (typeof content !== 'string' || !content.trim()) return false
      const at = typeof timestamp === 'string' ? Date.parse(timestamp) : NaN
      const own = content.trimStart().startsWith('<')
      this.held = [...this.held, { id: `q${this.queued++}`, text: content.trim(), own, ...(Number.isFinite(at) ? { at } : {}) }]
    } else if (operation === 'dequeue' && typeof content !== 'string') {
      this.held = this.held.slice(1)
    } else if (typeof content === 'string') {
      const index = this.held.findIndex((q) => q.text === content.trim())
      if (index >= 0) this.held = [...this.held.slice(0, index), ...this.held.slice(index + 1)]
    } else {
      // An operation this does not know, with nothing to say which: whatever was held
      // went somewhere, and an empty queue is the safer guess than a stale one.
      this.held = []
    }
    const next = this.held.filter((q) => !q.own).map(({ own: _own, ...q }) => q)
    if (next.length === this.queue.length && next.every((q, i) => q.id === this.queue[i].id)) return false
    this.queue = next
    return true
  }
}

type QueuedAttachment = { type?: string; prompt?: unknown; commandMode?: string; origin?: { kind?: string } }

/**
 * What the user typed, as they typed it. A slash command is stored expanded into
 * `<command-name>` tags; its local output (`/mcp`, `/cost`) and the reminders around a
 * prompt are Claude Code's, not the user's, and are dropped.
 */
export function userText(raw: string): string {
  if (raw.includes('<local-command-stdout>') || raw.includes('<local-command-stderr>')) return ''
  const command = raw.match(/<command-name>([^<]*)<\/command-name>/)
  if (command) {
    const args = raw.match(/<command-args>([\s\S]*?)<\/command-args>/)?.[1]?.trim()
    return [command[1].trim(), args].filter(Boolean).join(' ')
  }
  return raw.replace(/<system-reminder>[\s\S]*?<\/system-reminder>/g, '').trim()
}

/**
 * The text inside `<local-command-stdout>` / `<local-command-stderr>`, ANSI stripped, or
 * null when the line is not a local command's output at all.
 */
export function localCommandOutput(raw: string): string | null {
  const match = raw.match(/<local-command-std(?:out|err)>([\s\S]*?)<\/local-command-std(?:out|err)>/)
  if (!match) return null
  return stripAnsi(match[1]).trim()
}

/** The argument that says what a tool call is doing. */
export function toolSummary(input: Record<string, unknown> | undefined): string {
  if (!input || typeof input !== 'object') return ''
  for (const key of ['command', 'file_path', 'notebook_path', 'pattern', 'skill', 'description', 'url', 'query', 'prompt']) {
    const value = input[key]
    if (typeof value === 'string' && value.trim()) return value.trim().split('\n')[0]
  }
  const first = Object.values(input).find((v): v is string => typeof v === 'string')
  return first?.split('\n')[0] ?? ''
}

function resultText(content: unknown): string {
  const text = typeof content === 'string'
    ? content
    : Array.isArray(content)
      ? content.map((c: Block) => (c?.type === 'text' && typeof c.text === 'string' ? c.text : '')).join('\n')
      : ''
  return text.length > MAX_OUTPUT ? `${text.slice(0, MAX_OUTPUT)}…` : text
}

/**
 * The change a file tool made, from the result Claude Code records beside the tool
 * result: `structuredPatch` (hunks with their line numbers and three lines of context)
 * for an edit, the written `content` for a new file, whose patch is empty. Anything
 * else, a read or a failed edit, is not a diff.
 */
export function diffFrom(result: unknown): ChatDiff | null {
  const r = result as { filePath?: unknown; structuredPatch?: unknown; type?: unknown; content?: unknown } | null
  if (!r || typeof r.filePath !== 'string') return null

  let hunks: ChatDiff['hunks'] = []
  if (Array.isArray(r.structuredPatch) && r.structuredPatch.length > 0) {
    hunks = r.structuredPatch
      .filter((h): h is { oldStart: number; newStart: number; lines: string[] } =>
        h && typeof h.oldStart === 'number' && typeof h.newStart === 'number' && Array.isArray(h.lines))
      .map((h) => ({ oldStart: h.oldStart, newStart: h.newStart, lines: h.lines.filter((l) => typeof l === 'string') }))
  } else if (r.type === 'create' && typeof r.content === 'string') {
    const lines = r.content.replace(/\n$/, '').split('\n')
    hunks = [{ oldStart: 0, newStart: 1, lines: lines.map((l) => `+${l}`) }]
  }
  return toChatDiff(r.filePath, hunks)
}

/** Hunks as a diff card: counted on the whole change, cut for drawing. Null when empty. */
export function toChatDiff(filePath: string, hunks: ChatDiff['hunks']): ChatDiff | null {
  if (hunks.length === 0) return null

  let added = 0
  let removed = 0
  for (const h of hunks) for (const l of h.lines) {
    if (l.startsWith('+')) added++
    else if (l.startsWith('-')) removed++
  }

  // Counted on the whole change, cut for drawing only.
  let budget = MAX_DIFF_LINES
  let truncated = false
  const kept: ChatDiff['hunks'] = []
  for (const h of hunks) {
    if (budget <= 0) { truncated = true; break }
    const lines = h.lines.slice(0, budget)
    if (lines.length < h.lines.length) truncated = true
    budget -= lines.length
    kept.push({ ...h, lines })
  }
  return { path: filePath, added, removed, hunks: kept, ...(truncated ? { truncated } : {}) }
}
