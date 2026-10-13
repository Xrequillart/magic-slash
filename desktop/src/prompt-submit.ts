/**
 * A prompt as it is written into an agent's TUI, and what may not be sent that way.
 *
 * Lives at the src root, next to strip-ansi and the other pure cross-process helpers, because
 * BOTH sides need it: the renderer formats what the desktop chat sends
 * (renderer/components/AgentPane.tsx), and the main process formats what a paired iPhone sends
 * (main/index.ts, remote/PROTOCOL.md §10). The sequence that submits it lives once, in the
 * main process (`submitToTerminal`, main/ipc/terminal-handlers.ts): the two paths must not be
 * two copies of the same timing that drift apart.
 *
 * renderer/utils/chatPrompt.ts, renderer/utils/agentTerminals.ts and
 * renderer/components/chatCommands.ts re-export what they used to hold, so their callers and
 * tests read the same names as before.
 *
 * No DOM types and no Electron import, so the node test suite and both processes can load it.
 */

/**
 * A paste, as a terminal reads one.
 *
 * The markers are what tell the program on the other end that what arrives between them was
 * PASTED rather than typed, which is how it knows not to interpret a newline in the middle
 * of it as a submission. The text is written straight to the pty, so this only means "paste"
 * to a program that has turned bracketed paste on (mode 2004) — every TUI that takes
 * multi-line input does, including the agent this app drives.
 *
 * There is deliberately no `\r` and no trailing newline anywhere near this: the text lands
 * in the prompt and the reader presses Enter themselves, having seen what they are about to
 * send. `pages/Skills` writes a trailing `\r` on purpose for a one-line command; a review's
 * worth of comments is not that, and neither is a review thread.
 *
 * A FUNCTION rather than two exported markers, because every caller did the same
 * concatenation with them and the two that matter are easy to get wrong once: an unterminated
 * paste leaves the terminal in bracketed-paste mode, and a `\r` appended after the end marker
 * submits the thing this whole design exists to leave sitting in the prompt. Composing the
 * three pieces here means a call site cannot spell either mistake.
 */
const PASTE_START = '\x1b[200~'
const PASTE_END = '\x1b[201~'

/** `text`, wrapped so the terminal reads it as pasted rather than typed. */
export function bracketedPaste(text: string): string {
  return `${PASTE_START}${text}${PASTE_END}`
}

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

/** The text as the TUI will read it: line breaks normalised, control bytes dropped. */
function cleanText(text: string): string {
  return text.replace(/\r\n?/g, '\n').replace(CONTROL_BYTES, '')
}

export function promptBytes(text: string): string {
  const clean = cleanText(text)
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

/**
 * Claude Code's built-in commands whose answer is a dialog of the TUI, not a reply in the
 * conversation. The chat sends them like any other and then shows the terminal, where the
 * dialog is (chatCommands.ts); a phone may not send them at all, since nobody at the Mac
 * would be there to close the dialog.
 */
export const INTERACTIVE_COMMANDS: readonly string[] = [
  'mcp',
  'model',
  'agents',
  'config',
  'permissions',
  'hooks',
  'memory',
  'resume',
  'rewind',
  'status',
  'usage',
  'plugin',
  'doctor',
  'login',
  'logout',
  'help',
]

/** Whether the text sent runs a command whose answer only the terminal can show. */
export function opensInTerminal(text: string): boolean {
  const name = /^\/(\S+)/.exec(text.trim())?.[1]
  return Boolean(name && INTERACTIVE_COMMANDS.includes(name))
}

/**
 * Whether a prompt from a paired iPhone must be refused `unsupported` (PROTOCOL.md §10),
 * rather than typed: a command that opens a TUI dialog nobody at the Mac would close, or a
 * `!` line, which Claude Code runs as a shell command and the phone is not allowed to.
 */
export function remotePromptRefusal(text: string): boolean {
  // Judged on the cleaned text, the one actually typed: a control byte in front of `!` or `/`
  // is dropped on the way to the terminal, and must not slip the line past this check.
  const clean = cleanText(text)
  return clean.trimStart().startsWith('!') || opensInTerminal(clean)
}
