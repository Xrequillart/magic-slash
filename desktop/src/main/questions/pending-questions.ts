import { randomUUID } from 'crypto'
import { stripAnsi } from '../../strip-ansi'
import type { TrayQuestion, TrayQuestionItem, TrayQuestionOption } from '../../types'

/**
 * The one question each agent is currently blocked on.
 *
 * WHY A MODULE-LEVEL MAP AND NO SWEEPER
 * ---------------------------------------------------------------------------
 * Same shape as `displayBuffers` / `restartTrackers` in pty/terminal-manager.ts:
 * a plain Map keyed by terminal id, emptied by whoever ends the thing it belongs
 * to. The TTL is applied lazily on read rather than by a `setInterval`, and that
 * is enough here because the only reader is the tray aggregator's existing 3s
 * poll — an expired entry cannot survive more than one tick of being looked at.
 *
 * WHAT CLEARS AN ENTRY — AND WHAT MUST NOT
 * ---------------------------------------------------------------------------
 * Clearing is bound to EVENTS, never to agent state:
 *   - the `PostToolUse` (AskUserQuestion) / `UserPromptSubmit` / `Stop` hooks;
 *   - a human typing an answer into the terminal (`noteTerminalInput`, and only
 *     for a permission prompt — see there);
 *   - the terminal exiting or being killed;
 *   - the 30-minute TTL below.
 *
 * Looking at the question in the main window is NOT one of them: the panel and the
 * app show the same pending question until it is actually answered, wherever the
 * answer comes from.
 *
 * ⚠️ Never from the `/status` route or any state transition. The generic
 * `PreToolUse` hook flips the agent to `working` at the same instant the
 * AskUserQuestion capture hook fires, and their order is not guaranteed — a
 * state-driven clear would routinely erase the question that just arrived.
 */
const pendingQuestions = new Map<string, TrayQuestion>()

/**
 * Told whenever an agent's pending question changes (set, replaced, cleared), for the
 * chat view, which draws the question where the conversation is. The tray polls; the
 * chat is a live view and is pushed to.
 */
type QuestionListener = (terminalId: string, question: TrayQuestion | undefined) => void
let questionListener: QuestionListener | null = null

export function setPendingQuestionListener(listener: QuestionListener | null): void {
  questionListener = listener
}

function notify(terminalId: string): void {
  questionListener?.(terminalId, pendingQuestions.get(terminalId))
}

/**
 * THE ASKS THE APP IS HOLDING, by agent: the AskUserQuestion hook's request, kept open.
 *
 * While the agent is shown as a chat, its AskUserQuestion hook does not answer at once:
 * the app holds it, Claude Code waits on it and shows no dialog, and the answer goes
 * back as the hook's own output (`permissionDecision: allow` with the tool input and
 * its `answers` filled in). That is what lets the chat answer several questions at
 * once, or in free text, where typing into the TUI could not.
 *
 * Settled exactly once, with the hook's output or with `null`, which RELEASES it: the
 * hook then prints nothing, and Claude Code shows its own dialog as if no hook had run.
 * Everything that ends a question releases its hold (an answer, a clear, a newer
 * question, the TTL), and so does the agent's view flipping to the terminal, where
 * the TUI's dialog is the one to answer. Verified against Claude Code 2.1.288.
 */
interface HeldAsk {
  token: string
  /** The tool input as the hook received it, which the answer is sent back inside. */
  input: Record<string, unknown>
  /** The questions' own `question` strings, untrimmed: the keys Claude Code reads. */
  keys: string[]
  settle: (output: string | null) => void
}
const heldAsks = new Map<string, HeldAsk>()

function settleHeld(terminalId: string, output: string | null): void {
  const held = heldAsks.get(terminalId)
  if (!held) return
  heldAsks.delete(terminalId)
  held.settle(output)
}

/** After half an hour, a question nobody answered is stale by any measure. */
const QUESTION_TTL_MS = 30 * 60 * 1000

/** How much terminal tail a permission preview keeps. */
const PREVIEW_LINES = 15

/**
 * How much of the buffer's tail is even looked at.
 *
 * A display buffer runs to ~100KB (DISPLAY_BUFFER_MAX_SIZE in pty/terminal-manager)
 * and only the last PREVIEW_LINES lines are ever shown, so stripping and splitting
 * the whole thing is work thrown away on a path a blocked agent is waiting on. It
 * also bounds the preview crossing IPC, which PREVIEW_LINES alone does not: a TUI
 * redrawing with bare `\r` can pile a lot of output into a single line.
 *
 * That last property is why the cut cannot be a plain byte offset — see scanWindow.
 */
const PREVIEW_SCAN_CHARS = 16384

/**
 * Notifications that are NOT a question.
 *
 * `Notification` fires for everything Claude Code wants to tell the user, and the
 * only signal in the payload is a free-text `message`. This one is the idle nudge:
 * the most frequent notification of all, and definitely not a prompt.
 */
const NON_QUESTION_NOTIFICATION = /waiting for your input/i

/**
 * Notifications we are confident enough about to ANSWER, not merely show.
 *
 * The distinction matters because answering means writing a bare `\r` into the
 * PTY. On a message we misread, that Enter lands in a terminal that may not be
 * showing a prompt at all — so an unrecognised wording gets stored `unsupported`
 * instead: the card, the preview and "open the agent", with no button that drives
 * the terminal. Showing too much is cheap; injecting a keystroke on a guess is not.
 *
 * Kept deliberately loose (any phrasing built around "permission") so a reworded
 * release still matches. The ticket's second open question stands: capture the real
 * payloads of both a permission prompt and a routine notification to firm this up.
 */
const ANSWERABLE_NOTIFICATION = /permission|approve|allow|autoris/i

interface AskQuestionOption {
  label?: unknown
  description?: unknown
}

interface AskQuestion {
  question?: unknown
  header?: unknown
  multiSelect?: unknown
  options?: unknown
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined
}

function parseOptions(raw: unknown): TrayQuestionOption[] {
  if (!Array.isArray(raw)) return []
  const options: TrayQuestionOption[] = []
  for (const entry of raw) {
    const option = entry as AskQuestionOption
    const label = asString(option?.label)
    if (!label) continue
    const description = asString(option?.description)
    options.push(description ? { label, description } : { label })
  }
  return options
}

/**
 * The buffer's tail, cut at an escape boundary rather than a byte offset.
 *
 * Slicing at PREVIEW_SCAN_CHARS lands mid-sequence roughly as often as not, and the
 * fragment left behind is indistinguishable from text once the ESC is gone — `3H`,
 * `25l` and friends showed up at the head of the preview. Dropping it by dropping
 * the first line only works if there IS a first line to lose: a TUI that repaints
 * with bare `\r` puts the whole window on one, so the fragment would survive on the
 * same line as real content. Cutting at the first ESC costs a few characters of a
 * line that is already partial, and a buffer with no escapes at all is plain output
 * where every byte is content.
 */
function scanWindow(buffer: string): string {
  if (buffer.length <= PREVIEW_SCAN_CHARS) return buffer
  const window = buffer.slice(-PREVIEW_SCAN_CHARS)
  const firstEscape = window.indexOf('\x1b')
  return firstEscape === -1 ? window : window.slice(firstEscape)
}

/**
 * The last lines of a terminal buffer, ANSI-stripped — what the agent is actually
 * showing. Used as the permission preview: the alternative, reading
 * `transcript_path`, couples us to a file format we do not own.
 *
 * A bare `\r` returns the cursor to column 0, so only what follows the last one on a
 * line is still on screen. Keeping just that segment is what collapses a repainting
 * status line (spinner, elapsed time, token count) to its final frame instead of
 * concatenating every frame the agent has drawn since it started.
 */
export function buildPreview(buffer: string | null | undefined): string | undefined {
  if (!buffer) return undefined
  const lines = stripAnsi(scanWindow(buffer))
    .split('\n')
    .map((line) => line.slice(line.lastIndexOf('\r') + 1).replace(/\s+$/, ''))
  // Trailing blank lines are the norm in a TUI buffer and would eat the preview.
  while (lines.length > 0 && lines[lines.length - 1] === '') lines.pop()
  if (lines.length === 0) return undefined
  return lines.slice(-PREVIEW_LINES).join('\n')
}

function store(terminalId: string, question: Omit<TrayQuestion, 'token' | 'receivedAt'>): TrayQuestion {
  // A newer question ends the one it replaces, held or not.
  settleHeld(terminalId, null)
  // A fresh token per question, so an answer aimed at the previous one is rejected
  // rather than applied to whatever replaced it.
  const stored: TrayQuestion = { ...question, token: randomUUID(), receivedAt: Date.now() }
  // One question per agent: a new one supersedes whatever was there. The agent can
  // only be blocked on its most recent prompt anyway.
  pendingQuestions.set(terminalId, stored)
  notify(terminalId)
  return stored
}

/**
 * An `AskUserQuestion` tool call, from the `PreToolUse` hook payload
 * (`{ tool_input: { questions: [{ question, header, multiSelect, options }] } }`).
 *
 * Typed into the TUI (the panel, or a chat that does not hold the hook), one
 * single- or multiSelect question is answerable, on the keystrokes verified in
 * answer-keys.ts. Several questions in one call, or one with no option to pick, are
 * stored as `unsupported` rather than dropped: the card shows what is asked and sends
 * the user to the agent.
 *
 * `hold` is the chat's way round that (see `holdAsk`): the answer goes back through
 * the hook, so nothing is out of reach and nothing is `unsupported`.
 */
export function setFromAskQuestion(terminalId: string, payload: unknown, hold = false): TrayQuestion | null {
  const items = parseAsk(payload)
  if (!items) return null
  const first = items[0]

  // No refusal is offered on an `ask`: Escape would interrupt the agent rather
  // than answer it. That follows from `kind` alone — see answer-keys.keysFor.
  return store(terminalId, {
    kind: 'ask',
    prompt: first.prompt,
    options: first.options,
    ...(first.multiSelect ? { multiSelect: true } : {}),
    questions: items,
    ...(hold ? { held: true } : typedUnsupported(items) ? { unsupported: true } : {}),
  })
}

/** Out of reach of the keystrokes: several questions at once, or nothing to pick. */
function typedUnsupported(items: TrayQuestionItem[]): boolean {
  return items.length > 1 || items[0].options.length === 0
}

function parseAsk(payload: unknown): TrayQuestionItem[] | null {
  const questions = (payload as { tool_input?: { questions?: unknown } })?.tool_input?.questions
  if (!Array.isArray(questions) || questions.length === 0) return null
  const items: TrayQuestionItem[] = []
  for (const raw of questions) {
    const q = raw as AskQuestion
    const prompt = asString(q?.question) ?? asString(q?.header)
    if (!prompt) return null
    const header = asString(q?.header)
    items.push({
      prompt,
      ...(header && header !== prompt ? { header } : {}),
      options: parseOptions(q?.options),
      ...(q?.multiSelect === true ? { multiSelect: true } : {}),
    })
  }
  return items
}

/**
 * Stores the ask and HOLDS it: resolves with the hook's output once the user answers
 * (`answerHeld`), or with `null` once the hold is released, whatever releases it.
 *
 * Refuses to hold (answering `null` at once, the question stored as for the TUI) when
 * a question has no `question` string of its own: an answer is filed under that
 * string, and one Claude Code cannot match would be an answer lost.
 */
export function holdAsk(terminalId: string, payload: unknown): { question: TrayQuestion | null; reply: Promise<string | null> } {
  const input = (payload as { tool_input?: unknown })?.tool_input
  const raw = (input as { questions?: unknown } | undefined)?.questions
  const keys = Array.isArray(raw) ? raw.map((q) => (q as AskQuestion)?.question) : []
  const holdable = typeof input === 'object' && input !== null && keys.length > 0
    && keys.every((k): k is string => typeof k === 'string' && k.trim() !== '')
  const question = setFromAskQuestion(terminalId, payload, holdable)
  if (!question || !holdable) return { question, reply: Promise.resolve(null) }

  const reply = new Promise<string | null>((settle) => {
    heldAsks.set(terminalId, { token: question.token, input: input as Record<string, unknown>, keys: keys as string[], settle })
  })
  return { question, reply }
}

/**
 * Sends the answers back through the held hook, one per question in order. False
 * when nothing is held under this token, or the answers do not fit the questions.
 */
export function answerHeld(terminalId: string, token: string, answers: string[]): boolean {
  const held = heldAsks.get(terminalId)
  if (!held || held.token !== token) return false
  if (answers.length !== held.keys.length || answers.some((a) => typeof a !== 'string' || a.trim() === '')) return false
  const output = {
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'allow',
      updatedInput: { ...held.input, answers: Object.fromEntries(held.keys.map((k, i) => [k, answers[i].trim()])) },
    },
  }
  settleHeld(terminalId, JSON.stringify(output))
  return true
}

/**
 * Lets the held hook go without an answer, so Claude Code shows its own dialog: the
 * agent's view went back to the terminal. The question stays pending, now as one the
 * TUI is showing, so what the keystrokes cannot drive is `unsupported` again.
 */
export function releaseHeld(terminalId: string): void {
  if (!heldAsks.has(terminalId)) return
  settleHeld(terminalId, null)
  const question = pendingQuestions.get(terminalId)
  if (!question?.held) return
  const { held: _held, ...rest } = question
  const items = question.questions ?? [{ prompt: question.prompt, options: question.options }]
  pendingQuestions.set(terminalId, { ...rest, ...(typedUnsupported(items) ? { unsupported: true } : {}) })
  notify(terminalId)
}

/** Whether this agent's AskUserQuestion hook is being held open. */
export function isHeld(terminalId: string): boolean {
  return heldAsks.has(terminalId)
}

/**
 * A `Notification` hook payload (`{ message }`), treated as a permission prompt.
 *
 * `preview` carries the terminal tail because the message itself is a one-liner
 * ("Claude needs your permission to use Bash") that never says WHAT is being
 * asked — AC3 wants the real prompt next to the Allow / Deny buttons.
 *
 * The buffer arrives as a callback, read only AFTER the guards below: the idle
 * nudge is the most frequent Notification of all, and it is the one case where
 * building a preview is guaranteed to be wasted.
 *
 * A message that is not the idle nudge but that we cannot positively identify as a
 * permission request is still surfaced — as `unsupported`, so the panel shows it and
 * sends the user to the agent rather than writing an Enter into the PTY on a guess.
 *
 * ⚠️ A NOTIFICATION NEVER REPLACES A LIVE `ask`
 * ---------------------------------------------------------------------------
 * Both hooks feed the same one-question-per-agent slot, and Claude Code announces an
 * `AskUserQuestion` prompt with a Notification of its own ("Claude needs your
 * permission to use AskUserQuestion") — which matches ANSWERABLE_NOTIFICATION and
 * used to overwrite the question that had just been captured. The panel then showed a
 * bare Allow / Deny and none of what was actually being asked.
 *
 * Hook order is not guaranteed, so the rule is stated as precedence rather than
 * timing: an `ask` carries the real prompt and its options, which no notification
 * ever can, and it is cleared by its own PostToolUse — so nothing strands it here.
 */
export function setFromNotification(
  terminalId: string,
  payload: unknown,
  bufferProvider?: () => string | null | undefined,
): TrayQuestion | null {
  const message = asString((payload as { message?: unknown })?.message)
  if (!message) return null
  if (NON_QUESTION_NOTIFICATION.test(message)) return null
  // Checked before the preview is built: reading the buffer for a payload we are
  // about to drop is work on the critical path of a blocked agent.
  if (getPendingQuestion(terminalId)?.kind === 'ask') return null

  const preview = buildPreview(bufferProvider?.())
  const unsupported = !ANSWERABLE_NOTIFICATION.test(message)

  return store(terminalId, {
    kind: 'permission',
    prompt: message,
    // The panel renders its own Allow / Deny for a permission (see answer-keys).
    options: [],
    ...(preview ? { preview } : {}),
    ...(unsupported ? { unsupported: true } : {}),
  })
}

/**
 * Route a raw hook body to the right parser.
 *
 * `bufferProvider` is a callback rather than a string so the terminal buffer is
 * only read for the payloads that need it — and, more importantly, so this module
 * does not import terminal-manager, which imports this one to clear on exit.
 * Turning that buffer into a preview stays in here, with `buildPreview`.
 */
export function ingestQuestionPayload(
  terminalId: string,
  body: string,
  bufferProvider?: () => string | null | undefined,
): TrayQuestion | null {
  let payload: unknown
  try {
    payload = JSON.parse(body)
  } catch (e) {
    console.error('[Questions] Failed to parse hook payload:', e)
    return null
  }

  const event = (payload as { hook_event_name?: unknown })?.hook_event_name
  if (event === 'PreToolUse') {
    return setFromAskQuestion(terminalId, payload)
  }
  if (event === 'Notification') {
    return setFromNotification(terminalId, payload, bufferProvider)
  }
  console.error(`[Questions] Ignoring hook payload with unexpected event: ${String(event)}`)
  return null
}

/** The agent's pending question, or `undefined` — expired entries are dropped here. */
export function getPendingQuestion(terminalId: string): TrayQuestion | undefined {
  const question = pendingQuestions.get(terminalId)
  if (!question) return undefined
  if (Date.now() - question.receivedAt > QUESTION_TTL_MS) {
    pendingQuestions.delete(terminalId)
    settleHeld(terminalId, null)
    return undefined
  }
  return question
}

export function clearPendingQuestion(terminalId: string): void {
  settleHeld(terminalId, null)
  if (pendingQuestions.delete(terminalId)) notify(terminalId)
}

/**
 * Bytes a terminal emulator sends UPSTREAM on its own, with nobody typing.
 *
 * ⚠️ THIS IS THE WHOLE REASON THE PANEL USED TO SHOW NOTHING
 * ---------------------------------------------------------------------------
 * Claude Code enables focus reporting (`\x1b[?1004h` — verified against a live
 * build), so xterm.js reports every focus change through the SAME `onData` channel
 * as keystrokes: `\x1b[I` on focus, `\x1b[O` on blur. Clicking the menu bar icon
 * blurs the main window, which sent `\x1b[O` down `terminal:write` — and the old
 * unconditional clear there erased the question a fraction of a second before the
 * panel painted. Merely clicking INTO the terminal did it too, via `\x1b[I`.
 *
 * The others are here for the same reason rather than from an observed bug: none of
 * them is a person answering anything, and a terminal is free to send them at any
 * time. Cursor position and device-attribute replies answer queries the agent made;
 * the mouse reports would arrive on any build that turns tracking on; the bracketed
 * paste markers wrap a paste whose CONTENT survives this strip, as it should.
 */
const TERMINAL_REPORT = /\x1b\[(?:[IO]|\d+;\d+R|\?[\d;]*[a-zA-Z]|>[\d;]*[a-zA-Z]|<[\d;]*[Mm]|20[01]~)/g

/** Whether `data` contains anything a human actually typed. */
export function isUserInput(data: string): boolean {
  return data.replace(TERMINAL_REPORT, '') !== ''
}

/**
 * A human typed into the agent's terminal — what that means for its question.
 *
 * ⚠️ NOT A PLAIN CLEAR, AND NOT A NO-OP EITHER
 * ---------------------------------------------------------------------------
 * Two requirements meet here and only one of them is about the store:
 *
 *   1. The question must stay visible until it is ANSWERED, in the panel as much as
 *      in the app. Someone who reads a question in the main window, wanders off and
 *      opens the panel has answered nothing yet.
 *   2. The panel answers by position — `keysFor` sends N× down-arrow from the row
 *      the TUI highlights on its own. Once the user has moved that highlight with
 *      the arrow keys, our count is wrong and clicking "option 1" would answer
 *      whatever is highlighted now.
 *
 * So an `ask` is KEPT and marked `unsupported`: the card still shows the prompt and
 * "Open the agent", it just no longer offers buttons we can no longer aim. Its real
 * end of life stays hook-driven (`PostToolUse` on AskUserQuestion, or `Stop`).
 *
 * A `permission` is dropped instead, because nothing would ever take it back: the
 * clear hooks are scoped to AskUserQuestion and to the end of the turn, so a card
 * for a prompt the user allowed in the app seconds ago would sit in the panel for as
 * long as the agent then works. A keystroke while a modal permission prompt is up IS
 * the answer to it.
 */
export function noteTerminalInput(terminalId: string, data: string): void {
  if (!isUserInput(data)) return
  const question = getPendingQuestion(terminalId)
  if (!question) return
  if (question.kind === 'permission') {
    pendingQuestions.delete(terminalId)
    notify(terminalId)
    return
  }
  if (question.unsupported) return
  // Same token: the question is the same question, only its buttons are gone. A
  // fresh one would make a click read as "already answered" instead.
  pendingQuestions.set(terminalId, { ...question, unsupported: true })
  notify(terminalId)
}

export function clearAllPendingQuestions(): void {
  for (const id of [...heldAsks.keys()]) settleHeld(id, null)
  pendingQuestions.clear()
}
