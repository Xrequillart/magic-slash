/**
 * Whether a terminal's output survives its process.
 *
 * `createTerminal`'s exit handler used to drop the display buffer unconditionally, one
 * line before the renderer was even told the process had gone — so `getBuffer` answered
 * null for anything that had exited, and a dialog opened on a dead terminal showed
 * nothing at all.
 *
 * Kept in its own module so the rule can be stated and tested without
 * `terminal-manager`'s native node-pty import.
 */

/**
 * True when the display buffer of a terminal that exited with `exitCode` must be kept.
 *
 * The question is not who might still READ the buffer — it is who can still FREE it:
 *
 * - **Non-zero** — kept. The script's card stays on screen precisely so the failure can
 *   be read, and the dialog opened from it is the only place to read it. Dismissing or
 *   stopping that card calls `killTerminal`, which deletes the buffer. Bounded, because
 *   the retention lasts exactly as long as the card the user can see.
 * - **Zero** — dropped. The card disappears the moment the exit listener removes the
 *   script, so nothing can ever reopen that terminal *or* kill it: anything kept here
 *   would live until `cleanupAllTerminals` on quit, growing the main process by one
 *   buffer per successful run for the life of the session, with no reclamation path.
 *
 * The asymmetry is the whole design. A blanket "keep" leaks; a blanket "drop" is the bug
 * above.
 */
export function bufferOutlivesExit(exitCode: number): boolean {
  return exitCode !== 0
}
