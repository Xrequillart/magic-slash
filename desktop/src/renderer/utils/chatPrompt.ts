import { bracketedPaste } from './agentTerminals'

/**
 * A chat message as it is written into the agent's TUI.
 *
 * A long text goes as a PASTE. Typed in raw, a few kilobytes reach Claude Code as a burst
 * of keystrokes it does not take whole: a long SQL query arrived with only its end in the
 * prompt. Wrapped in the bracketed-paste markers, the same bytes are read the way a paste
 * into the terminal view is, all of it, folded behind `[Pasted text #1 +N lines]`.
 *
 * A short line still goes as typed, so `/model` or `/clear` reach the TUI exactly as they
 * would from the keyboard.
 */

/** Past this many characters, or on any newline, the text is pasted rather than typed. */
const TYPED_MAX_CHARS = 200

/**
 * The bytes a terminal acts on, which the paste must not carry: ESC above all, since
 * `\x1b[201~` in the text would end the paste early and leave the rest to be read as typed.
 * TAB and LF are text; a CR is a line ending here, not an Enter.
 */
const CONTROL_BYTES = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g

export function promptBytes(text: string): string {
  const clean = text.replace(/\r\n?/g, '\n').replace(CONTROL_BYTES, '')
  if (!clean) return ''
  return clean.includes('\n') || clean.length > TYPED_MAX_CHARS ? bracketedPaste(clean) : clean
}

/** Between the text and the Return that submits it, so the TUI has taken the text in. */
const SUBMIT_DELAY_MS = 60

/** A long paste takes the TUI longer to take in: this much more per thousand characters. */
const SUBMIT_DELAY_PER_KB_MS = 20

const SUBMIT_DELAY_MAX_MS = 1_000

export function submitDelay(message: string): number {
  return Math.min(SUBMIT_DELAY_MAX_MS, SUBMIT_DELAY_MS + Math.floor(message.length / 1_000) * SUBMIT_DELAY_PER_KB_MS)
}
