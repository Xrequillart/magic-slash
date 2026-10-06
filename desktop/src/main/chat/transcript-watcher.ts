import * as fs from 'fs'
import type { ChatDiff, ChatSnapshot } from '../../types'
import { ChatTranscript } from './transcript'

/**
 * Tails each agent's transcript and keeps its chat entries in memory.
 *
 * The path comes from the statusLine report (`TerminalUsage.transcriptPath`), which
 * every session sends; a DIFFERENT path means a new session (`/clear`, a relaunch) and
 * starts the chat over, the way the terminal starts over.
 *
 * Polled with `fs.watchFile` rather than `fs.watch`: the file may not exist yet when
 * its path is announced, and FSEvents watchers are the scarce resource this machine
 * already runs out of. One stat every 300ms per agent costs nothing.
 *
 * Always on, not only while an agent is shown as a chat: switching views has to show
 * the whole conversation at once, which means it has already been read.
 */

const POLL_MS = 300
/** Batches the burst of lines a single turn writes into one IPC message. */
const EMIT_DEBOUNCE_MS = 80

interface Watch {
  path: string
  offset: number
  /** The tail of the last read when it ended mid-line. */
  partial: string
  transcript: ChatTranscript
  emitTimer: NodeJS.Timeout | null
  listener: (curr: fs.Stats) => void
}

type ChatListener = (terminalId: string, chat: ChatSnapshot) => void
type InterruptListener = (terminalId: string, at: number) => void

const watches = new Map<string, Watch>()
let chatListener: ChatListener | null = null
let interruptListener: InterruptListener | null = null

export function setChatListener(listener: ChatListener): void {
  chatListener = listener
}

/** Told when a read leaves the transcript ending on an interrupted turn. */
export function setInterruptListener(listener: InterruptListener): void {
  interruptListener = listener
}

/** The transcript the chat is showing for an agent, if any. */
export function watchedTranscript(terminalId: string): string | null {
  return watches.get(terminalId)?.path ?? null
}

export function getChatSnapshot(terminalId: string): ChatSnapshot {
  const transcript = watches.get(terminalId)?.transcript
  return transcript ? snapshot(transcript) : { entries: [], queue: [] }
}

/**
 * Whether the transcript, read up to now, ends on a prompt nothing has answered yet: the
 * one Escape takes back without a word (see `ChatTranscript.unanswered`).
 */
export function hasUnansweredPrompt(terminalId: string): boolean {
  const watch = watches.get(terminalId)
  if (!watch) return false
  readNew(terminalId, watch)
  return watch.transcript.unanswered !== null
}

/** Takes that prompt out of the chat, and answers its text (null when there was none). */
export function dropUnansweredPrompt(terminalId: string): string | null {
  const watch = watches.get(terminalId)
  const text = watch?.transcript.dropUnanswered() ?? null
  if (watch && text !== null) scheduleEmit(terminalId, watch)
  return text
}

function snapshot(transcript: ChatTranscript): ChatSnapshot {
  return { entries: transcript.entries.slice(), queue: transcript.queue }
}

/** What a shell command changed on disk (see command-diff.ts), onto its line in the chat. */
export function attachCommandDiffs(terminalId: string, toolUseId: string, diffs: ChatDiff[]): void {
  const watch = watches.get(terminalId)
  if (watch?.transcript.attachDiffs(toolUseId, diffs)) scheduleEmit(terminalId, watch)
}

export function watchTranscript(terminalId: string, path: string): void {
  const current = watches.get(terminalId)
  if (current?.path === path) return
  if (current) unwatchTranscript(terminalId)

  const watch: Watch = {
    path,
    offset: 0,
    partial: '',
    transcript: new ChatTranscript(),
    emitTimer: null,
    listener: (curr) => {
      // Truncated or replaced: read it again from the top.
      if (curr.size < watch.offset) {
        watch.offset = 0
        watch.partial = ''
        watch.transcript = new ChatTranscript()
      }
      if (curr.size > watch.offset) readNew(terminalId, watch)
    },
  }
  watches.set(terminalId, watch)
  fs.watchFile(path, { interval: POLL_MS }, watch.listener)
  // The new session's chat starts empty, and the renderer is told so now rather than
  // left showing the previous session until the first line arrives.
  scheduleEmit(terminalId, watch)
  readNew(terminalId, watch)
}

/**
 * Stops showing the agent's conversation and tells the renderer its chat is empty: the
 * session was replaced by a fresh one, which has said nothing yet. Without it the chat
 * kept the old conversation until the new session's statusLine named its file.
 */
export function resetTranscript(terminalId: string): void {
  if (!watches.has(terminalId)) return
  unwatchTranscript(terminalId)
  chatListener?.(terminalId, { entries: [], queue: [] })
}

export function unwatchTranscript(terminalId: string): void {
  const watch = watches.get(terminalId)
  if (!watch) return
  fs.unwatchFile(watch.path, watch.listener)
  if (watch.emitTimer) clearTimeout(watch.emitTimer)
  watches.delete(terminalId)
}

function readNew(terminalId: string, watch: Watch): void {
  let fd: number | null = null
  try {
    fd = fs.openSync(watch.path, 'r')
    const size = fs.fstatSync(fd).size
    if (size <= watch.offset) return
    const buffer = Buffer.alloc(size - watch.offset)
    fs.readSync(fd, buffer, 0, buffer.length, watch.offset)
    watch.offset = size

    const lines = (watch.partial + buffer.toString('utf-8')).split('\n')
    watch.partial = lines.pop() ?? ''
    let changed = false
    for (const line of lines) {
      if (line && watch.transcript.push(line)) changed = true
    }
    if (changed) scheduleEmit(terminalId, watch)
    // Read on the batch's last state, so a prompt sent right after the interrupt, in
    // the same read, does not get its turn settled under it.
    const interruptedAt = watch.transcript.interruptedAt
    if (changed && interruptedAt !== null) interruptListener?.(terminalId, interruptedAt)
  } catch {
    // Not written yet: the next poll will find it.
  } finally {
    if (fd !== null) fs.closeSync(fd)
  }
}

function scheduleEmit(terminalId: string, watch: Watch): void {
  if (watch.emitTimer) return
  watch.emitTimer = setTimeout(() => {
    watch.emitTimer = null
    if (watches.get(terminalId) === watch) chatListener?.(terminalId, snapshot(watch.transcript))
  }, EMIT_DEBOUNCE_MS)
}
