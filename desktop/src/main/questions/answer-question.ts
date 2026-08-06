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

/**
 * How long to wait between two keypresses.
 *
 * NOT a cosmetic delay — it is the fix. Concatenating the whole sequence into one
 * `pty.write()` made the TUI take a single event out of the burst and drop the rest,
 * so every answer but the first option silently resolved to the first option (see the
 * measurements in answer-keys.ts). Separate writes need separation in time too, or
 * they coalesce in the pipe and reproduce exactly the same burst.
 *
 * 30ms is comfortably above a TUI frame and imperceptible on a four-option answer
 * (~90ms end to end). Empirical: if answers start landing one row short, raise it.
 */
const KEYSTROKE_INTERVAL_MS = 30

/**
 * Agents with a keystroke sequence in flight.
 *
 * Sequencing made answering asynchronous, and that opened a window that did not
 * exist when it was one synchronous write: a second click landing mid-sequence
 * interleaves its arrows with the first one's and walks the highlight somewhere
 * neither click asked for. The token cannot catch this — the question is only
 * cleared once the sequence finishes, so both clicks carry a valid token.
 */
const inFlight = new Set<string>()

export interface AnswerDeps {
  /** The question currently pending for this agent, if any. */
  getQuestion: (id: string) => TrayQuestion | undefined
  /** Writes into the agent's PTY. Returns false when the terminal is gone. */
  write: (id: string, keys: string) => boolean
  /** Drops the pending question once it has been answered. */
  clear: (id: string) => void
  /**
   * Pause between keypresses. Injected so the tests exercise the real sequencing
   * without waiting in real time — a suite that actually slept would either be slow
   * or be tuned to pass on a delay it never observed.
   */
  wait?: (ms: number) => Promise<void>
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

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
  if (kind === 'options') {
    // Emptiness and range are keysFor's call, against the question itself. All this
    // has to guarantee is that iterating the array cannot throw out of the handler.
    const indexes = (choice as { indexes?: unknown }).indexes
    return Array.isArray(indexes) && indexes.every((i) => Number.isInteger(i))
  }
  if (kind !== 'option') return false
  // Range is checked in keysFor, against the question's own option count.
  return Number.isInteger((choice as { index?: unknown }).index)
}

export async function answerPendingQuestion(
  id: string,
  token: string,
  choice: TrayAnswerChoice,
  deps: AnswerDeps,
): Promise<TrayAnswerResult> {
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

  if (inFlight.has(id)) {
    console.error(`[Questions] Ignoring an answer for ${id}: one is already being typed`)
    return { ok: false }
  }

  const wait = deps.wait ?? sleep
  inFlight.add(id)
  try {
    for (const [index, key] of keys.entries()) {
      // Pace BEFORE every keypress but the first: the arrows have to arrive as
      // distinct events, and the terminal is not necessarily idle when we start.
      if (index > 0) await wait(KEYSTROKE_INTERVAL_MS)

      // A terminal that has since exited takes the answer nowhere. Reporting success
      // would leave the panel claiming the agent was advanced when it was not — and
      // the card would vanish, hiding the failure. Keep the question instead.
      //
      // Failing PART-WAY is the nastier case, and it is why the question is kept
      // rather than cleared: some arrows landed, so the agent's highlight has moved
      // but nothing was submitted. Keeping the card is what lets the user see that
      // and finish it in the terminal; clearing it would hide a half-typed answer.
      if (!deps.write(id, key)) {
        console.error(
          `[Questions] Answer for ${id} reached no terminal (keystroke ${index + 1}/${keys.length})`,
        )
        return { ok: false }
      }
    }
  } finally {
    inFlight.delete(id)
  }

  deps.clear(id)
  return { ok: true }
}
