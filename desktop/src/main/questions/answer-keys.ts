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

/**
 * MULTISELECT IS ADDRESSED BY DIGIT, NOT BY ARROWS — AND THAT IS DELIBERATE
 * ---------------------------------------------------------------------------
 * Captured from a live TUI (Claude Code v2.1.223, 2026-08-06) on a multiSelect
 * question, which draws NUMBERED CHECKBOXES and a footer that redefines Enter:
 *
 *   ←  ☐ Colours  ✔ Submit  →
 *   Which colours do you like?
 *   ❯ 1. [ ] Red
 *     2. [ ] Green
 *     3. [ ] Blue
 *     4. [ ] Yellow
 *     5. [ ] Type something
 *        Submit
 *   Enter to select · ↑/↓ to navigate · Esc to cancel
 *
 * Two things follow, and both are why the single-select recipe below could not just
 * be reused with extra Enters:
 *
 *   - "Enter to select" means Enter TOGGLES the highlighted box. It does not submit,
 *     so the arrows-then-Enter sequence would tick a box and stop there.
 *   - Typing `3` ticks the third box and LEAVES THE HIGHLIGHT WHERE IT IS (measured:
 *     `❯` stayed on row 1 while row 3 became `[✔]`). So each option is addressed
 *     absolutely, with no dependence on the cursor position we cannot see — the one
 *     assumption that makes the single-select path fragile.
 *
 * Submitting is the right arrow, which opens a "Review your answers" page whose first
 * row is `1. Submit answers`, then Enter on it.
 *
 * End to end, at the app's own KEYSTROKE_INTERVAL_MS (30ms) rather than by hand:
 * `1`, `3`, `→`, Enter on a four-option question returned
 * `User answered Claude's questions: Which colours do you like? → Red, Blue`.
 */

/** Enter — selects the highlighted row, and on a review page submits it. */
const SUBMIT = '\r'
/** Down arrow — moves the highlight one row down. */
const DOWN = '\x1b[B'
/** Right arrow — leaves a multiSelect question for its review page. */
const REVIEW = '\x1b[C'
/**
 * Ticking the nth checkbox: the row numbers the TUI itself prints.
 *
 * Single digits only, which is what bounds MAX_DIGIT_OPTIONS: `10` would arrive as
 * `1` then `0` and tick the first box.
 */
const digit = (index: number): string => String(index + 1)

/**
 * How many options a multiSelect answer can reach by digit.
 *
 * Far above what the panel renders anyway (MAX_OPTIONS in QuestionCard), so this is
 * a guard rather than a limit anyone meets: the store keeps every option, and an
 * index past this one has no keystroke that would reach it.
 */
const MAX_DIGIT_OPTIONS = 9
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

  // A multiSelect question is answered by digit and submitted from its review page,
  // whether one box is ticked or four. Routing the single-option click through the
  // same builder is not a convenience: the arrows-and-Enter recipe below would
  // TOGGLE a box and never submit, so it must not be reachable from here.
  if (question.multiSelect) {
    const indexes = choice.kind === 'options' ? choice.indexes : [choice.index]
    return multiSelectKeys(question, indexes)
  }

  // Ticking boxes on a question that has none of them is not something to guess at.
  if (choice.kind === 'options') return null

  if (!Number.isInteger(choice.index) || choice.index < 0) return null
  if (choice.index >= answerableOptionCount(question)) return null

  return [...Array<string>(choice.index).fill(DOWN), SUBMIT]
}

/**
 * `digit` per ticked box, then the review page, then submit.
 *
 * Sorted and de-duplicated because both would otherwise reach the TUI as toggles:
 * the same digit twice ticks and un-ticks, which would drop an option the user asked
 * for. Order is normalised for the same reason it is asserted in the tests — the
 * keystrokes are the only record of what was sent.
 */
function multiSelectKeys(question: TrayQuestion, indexes: number[]): string[] | null {
  if (!Array.isArray(indexes) || indexes.length === 0) return null

  const unique = [...new Set(indexes)].sort((a, b) => a - b)
  const count = Math.min(answerableOptionCount(question), MAX_DIGIT_OPTIONS)
  for (const index of unique) {
    if (!Number.isInteger(index) || index < 0 || index >= count) return null
  }

  return [...unique.map(digit), REVIEW, SUBMIT]
}
