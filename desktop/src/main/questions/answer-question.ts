import type { TrayAnswerChoice, TrayAnswerResult, TrayQuestion } from '../../types'
import { keysFor } from './answer-keys'

/**
 * The staleness guard: what stands between a click in the menu bar panel and a
 * keystroke in a live agent's terminal.
 *
 * WHY THIS IS A MODULE AND NOT AN IPC HANDLER BODY
 * ---------------------------------------------------------------------------
 * The panel polls every 2s, so the question it shows is always slightly behind
 * reality: the user can answer in the main window, or the agent can move on, in the
 * gap between the paint and the click. The ticket's requirement is absolute — a late
 * click must write NOTHING — and a requirement stated that way has to be testable.
 * Inside `ipcMain.handle` it would not be, so the decision lives here and
 * `main/index.ts` only supplies the terminal-facing side effects.
 *
 * ORDER MATTERS: every check happens BEFORE the write
 * ---------------------------------------------------------------------------
 * Token first, then keystrokes, then the write. Nothing reaches the PTY until the
 * question the user clicked on is provably the one still pending.
 */
export interface AnswerDeps {
  /** The question currently pending for this agent, if any. */
  getQuestion: (id: string) => TrayQuestion | undefined
  /** Writes into the agent's PTY. Returns false when the terminal is gone. */
  write: (id: string, keys: string) => boolean
  /** Drops the pending question once it has been answered. */
  clear: (id: string) => void
}

/**
 * Whether `choice` is really a `TrayAnswerChoice`.
 *
 * The type annotation is erased at runtime and this value crosses IPC from the
 * renderer, so it is untrusted input. `keysFor` reads `choice.kind` directly: without
 * this gate a malformed payload throws a TypeError out of the IPC handler instead of
 * returning the `{ ok: false }` the panel is documented to receive.
 */
function isAnswerChoice(choice: unknown): choice is TrayAnswerChoice {
  if (typeof choice !== 'object' || choice === null) return false
  const kind = (choice as { kind?: unknown }).kind
  if (kind === 'deny') return true
  if (kind !== 'option') return false
  // Range is checked in keysFor, against the question's own option count.
  return Number.isInteger((choice as { index?: unknown }).index)
}

export function answerPendingQuestion(
  id: string,
  token: string,
  choice: TrayAnswerChoice,
  deps: AnswerDeps,
): TrayAnswerResult {
  if (typeof id !== 'string' || typeof token !== 'string' || !id || !token) return { ok: false }
  if (!isAnswerChoice(choice)) {
    console.error(`[Questions] Refusing to answer ${id}: malformed choice payload`)
    return { ok: false }
  }

  const question = deps.getQuestion(id)
  if (!question || question.token !== token) {
    console.error(`[Questions] Ignoring a stale answer for ${id}`)
    return { ok: false }
  }

  const keys = keysFor(question, choice)
  if (keys === null) {
    console.error(`[Questions] Refusing to answer ${id}: no keystrokes for this choice`)
    return { ok: false }
  }

  // A terminal that has since exited takes the answer nowhere. Reporting success
  // would leave the panel claiming the agent was advanced when it was not — and the
  // card would vanish, hiding the failure. Keep the question instead.
  if (!deps.write(id, keys)) {
    console.error(`[Questions] Answer for ${id} reached no terminal`)
    return { ok: false }
  }

  deps.clear(id)
  return { ok: true }
}
