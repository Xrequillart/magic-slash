/**
 * Whether the process behind a script terminal is still alive.
 *
 * There are three ways a script stops being live, and a reader of the script's terminal
 * has to treat all three the same way — the PTY is gone, so a "Stop" pointing at it is a
 * lie and the terminal should stop claiming to be working:
 *
 * - it exited 0, and the exit listener removed it from the list;
 * - it exited non-zero, and its entry flipped to `error` so its card stays on screen;
 * - it was stopped from that card, which removes the entry too.
 *
 * Deriving that from ABSENCE-or-not-running, in one place, is what stops a dialog's footer
 * and its terminal disagreeing about the same script. `ScriptsDropdown` asks a different
 * question — "is this script NAME already running for this repo and agent", to grey out a
 * second launch — and deliberately ignores state, so the two are not merged.
 *
 * No DOM types and no store import, so the node test suite can load it. The same goes
 * for `scriptLabel` below, which answers the other question every one of those surfaces
 * has to: what to CALL a script when the repository has several packages defining it.
 */

/** The shape this needs from a `ScriptTerminalInfo`, and no more. */
interface ScriptLiveness {
  id: string
  state: 'running' | 'error'
}

/**
 * True when `id` names a script that is no longer running — including one that is no
 * longer in `scripts` at all.
 *
 * An unknown id is EXITED rather than an error: "gone from the list" is the ordinary way a
 * successful script ends, and it is the case callers most need this to cover.
 */
export function hasScriptExited(scripts: readonly ScriptLiveness[], id: string): boolean {
  return !scripts.some(s => s.id === id && s.state === 'running')
}

/** The shape a name needs: the script, and the package it was run from. */
interface ScriptIdentity {
  scriptName: string
  workspace?: string
}

/**
 * How a script is named wherever it is shown on its own — a card, a dialog title, a
 * terminal tab.
 *
 * `webapp/dev` and not `dev`, because a repository is routinely several packages and
 * the script names repeat across them: three cards reading `dev` name nothing at all.
 * The root keeps the bare name, so a single-package repository is unchanged.
 */
export function scriptLabel(script: ScriptIdentity): string {
  return script.workspace ? `${script.workspace}/${script.scriptName}` : script.scriptName
}
