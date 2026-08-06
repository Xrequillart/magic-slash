/**
 * Strip ANSI escape codes from terminal output.
 *
 * Lives at the src root, next to the other pure cross-process helpers
 * (repoMatch, urls, claude-theme), because BOTH sides need it: the renderer parses
 * script output with it (renderer/hooks/useScriptRunner.ts, its original home) and
 * the main process builds the permission-prompt preview with it
 * (main/questions/pending-questions.ts). There must stay exactly one of these —
 * two regexes drifting apart is how a preview ends up full of escape sequences.
 */
/**
 * Every escape sequence a terminal emits, not just the coloured ones.
 *
 * Order matters: the alternatives are tried left to right at each position, and the
 * introducers below (`]`, `P`, `[`, …) all fall inside the final catch-all's range —
 * so the specific forms have to come first or a CSI would be eaten two bytes at a
 * time, leaving its parameters behind as text.
 *
 * Written as source strings and compiled once because the escapes needed to put
 * \x1b and a `[` range inside one literal make the whole thing unreadable.
 */
const ESCAPE_SEQUENCE = new RegExp(
  [
    // OSC — sets the window title, which Claude Code repaints on every frame with
    // the spinner and token count in it. Terminated by BEL or ST, but bounded by a
    // newline too: an unterminated one must not swallow the rest of the output.
    '\\x1b\\][^\\x07\\x1b\\n]*(?:\\x07|\\x1b\\\\)?',
    // DCS / SOS / PM / APC — same shape, ST-terminated.
    '\\x1b[P^_X][^\\x1b\\n]*(?:\\x1b\\\\)?',
    // CSI — `[0-?]` rather than `[0-9;]` is what makes the private forms go:
    // ESC[?25l / ESC[?25h (hide/show cursor) surround every TUI redraw.
    '\\x1b\\[[0-?]*[ -/]*[@-~]',
    // Two- and three-byte sequences: charset designators (ESC ( B), ESC 7, ESC M…
    '\\x1b[ -/]*[0-~]',
    // A bare ESC — the head of a sequence cut off by the end of the string.
    '\\x1b',
  ].join('|'),
  'g',
)

export function stripAnsi(str: string): string {
  return str.replace(ESCAPE_SEQUENCE, '')
}
