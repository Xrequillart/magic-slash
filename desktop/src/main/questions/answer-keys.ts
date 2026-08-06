import type { TrayAnswerChoice, TrayQuestion } from '../../types'

/**
 * Turning a click in the menu bar panel into keystrokes for the Claude Code TUI.
 *
 * THE FORMULA LIVES HERE AND NOWHERE ELSE
 * ---------------------------------------------------------------------------
 * Claude Code has no API for "answer the pending question", so the panel answers
 * the only way anything answers a TUI: by typing. Which keys, exactly, is the one
 * assumption in this feature that cannot be verified from code — it depends on how
 * the current Claude Code build draws its selection list. It is therefore reduced
 * to the three constants below and a single function, so a manual check against a
 * live build can correct it in one place instead of hunting call sites.
 *
 * ONE KEYSTROKE PER ELEMENT — AND WHY THAT IS THE WHOLE POINT
 * ---------------------------------------------------------------------------
 * This used to return a single concatenated string, and it was silently wrong.
 * Measured against a live build:
 *
 *   click "option 2" (1 arrow + Enter)  → answered option 1
 *   click "option 4" (3 arrows + Enter) → answered option 1
 *
 * Every arrow was dropped and only the trailing `\r` registered, so ANY answer but
 * the first option resolved to the first option — and reported success while doing
 * it. Writing `\x1b[B\x1b[B\x1b[B\r` into the PTY in one chunk does not read as four
 * keypresses at the other end; the TUI takes one event out of the burst.
 *
 * Hence an array: each element is one keypress, and the caller is required to write
 * them as separate, spaced writes. Returning a joined string here would make the
 * old bug reachable again from a single innocent-looking `.join('')`.
 *
 * Confirmed against a live build on 2026-08-06: with the keypresses written
 * separately and spaced, clicking the 4th option answers the 4th option.
 *
 * ⚠️ The pacing itself (KEYSTROKE_INTERVAL_MS in answer-question.ts) is empirical —
 * 30ms is measured, not derived. If answers start landing one row short, that
 * interval is the first suspect.
 *
 * OFF-BY-ONE IN THE TICKET, DELIBERATELY NOT REPRODUCED
 * ---------------------------------------------------------------------------
 * The ticket states both "option 1 → `\r`" and "option i → `'\x1b[B'.repeat(i)`
 * + `\r`". Those contradict each other: option 1 needs ZERO arrows, so the
 * exponent is `i - 1`, not `i`. We implement `i - 1` — expressed here as
 * `index` arrows on a 0-based index, which is the same thing without the
 * opportunity to get it wrong again.
 */

/** Enter — selects the highlighted row. */
const SUBMIT = '\r'
/** Down arrow — moves the highlight one row down. */
const DOWN = '\x1b[B'
/**
 * Escape — cancels the prompt. Deliberately position-independent: a refusal must
 * not depend on counting rows we cannot see, which is the whole point of using it.
 */
const CANCEL = '\x1b'

/**
 * How many options can be selected by position.
 *
 * A permission prompt carries no options: we never see the TUI's own wording, so
 * the panel offers its own Allow (the highlighted first row) and Deny (Escape).
 * Allow is therefore index 0 of an implicit one-option list.
 */
export function answerableOptionCount(question: TrayQuestion): number {
  if (question.kind === 'permission' && question.options.length === 0) return 1
  return question.options.length
}

/**
 * The keystrokes that answer `question` with `choice`, one keypress per element, or
 * `null` when we refuse to guess.
 *
 * `null` is not a failure to be worked around: an approximate write into a live
 * agent's PTY is worse than no write at all, so an out-of-range index or a
 * question v1 cannot drive both stop here.
 *
 * The array is never empty when it is not null — every answer ends in SUBMIT.
 */
export function keysFor(question: TrayQuestion, choice: TrayAnswerChoice): string[] | null {
  if (question.unsupported) return null

  if (choice.kind === 'deny') {
    // Only a permission prompt can be refused: on an AskUserQuestion, Escape
    // interrupts the agent rather than answering it.
    return question.kind === 'permission' ? [CANCEL] : null
  }

  if (!Number.isInteger(choice.index) || choice.index < 0) return null
  if (choice.index >= answerableOptionCount(question)) return null

  return [...Array<string>(choice.index).fill(DOWN), SUBMIT]
}
