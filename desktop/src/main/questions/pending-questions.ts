import { randomUUID } from 'crypto'
import { stripAnsi } from '../../strip-ansi'
import type { TrayQuestion, TrayQuestionOption } from '../../types'

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
 *   - the user typing in the terminal (`terminal:write`, the IPC handler only);
 *   - the terminal exiting or being killed;
 *   - the 30-minute TTL below.
 *
 * ⚠️ Never from the `/status` route or any state transition. The generic
 * `PreToolUse` hook flips the agent to `working` at the same instant the
 * AskUserQuestion capture hook fires, and their order is not guaranteed — a
 * state-driven clear would routinely erase the question that just arrived.
 */
const pendingQuestions = new Map<string, TrayQuestion>()

/** After half an hour, a question nobody answered is stale by any measure. */
const QUESTION_TTL_MS = 30 * 60 * 1000

/** How much terminal tail a permission preview keeps. */
const PREVIEW_LINES = 15

/**
 * How much of the buffer's tail is even looked at.
 *
 * A display buffer runs to ~100KB (DISPLAY_BUFFER_MAX_SIZE in pty/terminal-manager)
 * and only the last PREVIEW_LINES lines are ever shown, so stripping and splitting
 * the whole thing is work thrown away on a path a blocked agent is waiting on. This
 * window is far wider than 15 lines, so the leading fragment it may cut mid-escape
 * sequence always falls in a line that gets dropped anyway. It also bounds the
 * preview crossing IPC, which PREVIEW_LINES alone does not: a TUI redrawing with
 * bare `\r` can pile a lot of output into a single line.
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
 * The last lines of a terminal buffer, ANSI-stripped — what the agent is actually
 * showing. Used as the permission preview: the alternative, reading
 * `transcript_path`, couples us to a file format we do not own.
 */
export function buildPreview(buffer: string | null | undefined): string | undefined {
  if (!buffer) return undefined
  const lines = stripAnsi(buffer.slice(-PREVIEW_SCAN_CHARS))
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+$/, ''))
  // Trailing blank lines are the norm in a TUI buffer and would eat the preview.
  while (lines.length > 0 && lines[lines.length - 1] === '') lines.pop()
  if (lines.length === 0) return undefined
  return lines.slice(-PREVIEW_LINES).join('\n')
}

function store(terminalId: string, question: Omit<TrayQuestion, 'token' | 'receivedAt'>): TrayQuestion {
  // A fresh token per question, so an answer aimed at the previous one is rejected
  // rather than applied to whatever replaced it.
  const stored: TrayQuestion = { ...question, token: randomUUID(), receivedAt: Date.now() }
  // One question per agent: a new one supersedes whatever was there. The agent can
  // only be blocked on its most recent prompt anyway.
  pendingQuestions.set(terminalId, stored)
  return stored
}

/**
 * An `AskUserQuestion` tool call, from the `PreToolUse` hook payload
 * (`{ tool_input: { questions: [{ question, header, multiSelect, options }] } }`).
 *
 * Several questions in one call, `multiSelect`, and the free-text "Other" option
 * are all out of scope for v1: they are stored as `unsupported` rather than
 * dropped, so the panel still shows what is being asked and offers "Open agent".
 */
export function setFromAskQuestion(terminalId: string, payload: unknown): TrayQuestion | null {
  const toolInput = (payload as { tool_input?: { questions?: unknown } })?.tool_input
  const questions = toolInput?.questions
  if (!Array.isArray(questions) || questions.length === 0) return null

  const first = questions[0] as AskQuestion
  const prompt = asString(first?.question) ?? asString(first?.header)
  if (!prompt) return null

  const options = parseOptions(first?.options)
  const unsupported = questions.length > 1 || first?.multiSelect === true || options.length === 0

  // No refusal is offered on an `ask`: Escape would interrupt the agent rather
  // than answer it. That follows from `kind` alone — see answer-keys.keysFor.
  return store(terminalId, {
    kind: 'ask',
    prompt,
    options,
    ...(unsupported ? { unsupported: true } : {}),
  })
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
 */
export function setFromNotification(
  terminalId: string,
  payload: unknown,
  bufferProvider?: () => string | null | undefined,
): TrayQuestion | null {
  const message = asString((payload as { message?: unknown })?.message)
  if (!message) return null
  if (NON_QUESTION_NOTIFICATION.test(message)) return null

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
    return undefined
  }
  return question
}

export function clearPendingQuestion(terminalId: string): void {
  pendingQuestions.delete(terminalId)
}

export function clearAllPendingQuestions(): void {
  pendingQuestions.clear()
}
