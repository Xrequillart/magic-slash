/**
 * How much of a terminal's output survives its process.
 *
 * The display buffer deliberately OUTLIVES the PTY, which is what `launchClaude` always
 * did: dropping it in `createTerminal`'s exit handler is why `getBuffer` used to answer
 * null for anything that had exited, and why a dialog opened on a failed script would
 * show nothing at all.
 *
 * Kept in its own module so the rule can be tested without `terminal-manager`'s native
 * node-pty import.
 */

/**
 * How much of a cleanly-exited terminal's output is kept.
 *
 * Enough for the tail a reader or a parser wants — a failure message, a test summary —
 * and 8 KB rather than `DISPLAY_BUFFER_MAX_SIZE`'s 100 KB because this is the branch with
 * no reclamation path: see `retainedBufferOnExit`.
 */
export const EXITED_BUFFER_TAIL = 8192

/**
 * What to keep of `buffer` once the process behind it has exited with `exitCode`.
 *
 * The asymmetry is about who can still free it, not about who might still read it:
 *
 * - **Non-zero** — kept whole. Its card stays on screen until the reader dismisses it,
 *   and dismissing calls `killTerminal`, which deletes the buffer. Bounded, and a failure
 *   is the case where the whole scrollback is worth having.
 * - **Zero** — trimmed to the tail. The card disappears immediately, so nothing can ever
 *   reopen that terminal *or* kill it, and the entry lives until `cleanupAllTerminals` on
 *   quit. The only reader left is the toast's test-count parse, which matches a summary
 *   line at the end. So the cost is `EXITED_BUFFER_TAIL` per run for one session — 8 KB,
 *   next to the `terminals` entry and node-pty handle the same exit already never frees.
 */
export function retainedBufferOnExit(buffer: string, exitCode: number): string {
  return exitCode === 0 ? buffer.slice(-EXITED_BUFFER_TAIL) : buffer
}
