/**
 * Which terminals are AGENTS, and which only look like one from the store.
 *
 * The store's `terminals` list is not all agents. Two other kinds exist under reserved id
 * prefixes — the sidebar's own terminal (`sidebar-`) and the script runner's (`script-`) —
 * and `activeTerminalId` can name the `sidebar-` one, because it is a terminal a user
 * selects and types in like any other.
 *
 * `script-` ids are the codebase's canonical statement of a narrower invariant, and this
 * is where it is stated: a script's terminal is read in a dialog
 * (`components/ScriptTerminalModal.tsx`) and never rendered in the content pane, so a
 * `script-` id never becomes `activeTerminalId` at all. The prefix stays in the list below
 * regardless — the MAIN process holds all three kinds in one map, which is why
 * `main/tray/agent-state-aggregator.ts` and `hooks/useTerminals.ts` must filter on it, and
 * this module's guarantee should not depend on one page's rendering choices.
 *
 * So a truthy `activeTerminalId` is NOT "an agent is running". Anything that writes text
 * meant for an agent has to test the id, or it writes into a plain shell: for a multi-line
 * paste that means each line is read as a command, which is a very different outcome from a
 * prompt that was ignored.
 *
 * The prefixes are the codebase's existing answer to this question, not a new convention —
 * `hooks/useTerminals.ts` (`isSidebarTerminal` / `isScriptTerminal` / `shouldIgnoreTerminal`),
 * `main/tray/agent-state-aggregator.ts`, `App.tsx` and `UpdateOverlay.tsx`'s docblock all
 * spell out the same two. This module exists so the next caller is not a fifth copy of them;
 * those four are deliberately left alone here, since rewriting working call sites is not
 * what the change that needed this was about.
 *
 * No DOM types and no store import, so the node test suite can load it.
 */

/** The id prefixes the store uses for terminals that are not agents. */
const NON_AGENT_PREFIXES = ['sidebar-', 'script-'] as const

/**
 * True when this id names an agent terminal.
 *
 * `null` and `''` are false rather than an error: "no terminal is selected" is an ordinary
 * state — the app opens in it — and every caller here has to handle it anyway. Taking the
 * nullable type means a caller can pass `activeTerminalId` straight in, which is the point:
 * a helper that demanded a non-null string would just move the truthy check back out to the
 * call site, next to the one it is meant to replace.
 *
 * An unknown prefix is an AGENT. The two names above are reserved and assigned by this app;
 * an id it does not recognise is a pty it created for an agent, so the default has to be
 * the permissive one or a future id scheme would silently disable every agent feature.
 */
export function isAgentTerminal(id: string | null | undefined): boolean {
  if (!id) return false
  return !NON_AGENT_PREFIXES.some(prefix => id.startsWith(prefix))
}

/** A terminal as the store lists it. `TerminalInfo` satisfies it — the ID is all this reads. */
export interface KnownTerminal {
  id: string
}

/**
 * WHICH terminal a hand-off should be written to, or `null` when there is nowhere to write.
 *
 * The two questions above, asked once. A control that hands text to an agent needs the answer
 * twice — to decide whether its button is enabled, and again at the click, because the selection
 * can change between the render that enabled it and the press that fires it — and answering it
 * in both places is how the two drift apart. So it is one function, and the caller's disabled
 * state and its guard are the same computation with the same inputs.
 *
 * `explicit` is the caller NAMING its target, and `undefined` means it has none: fall back to
 * whatever is selected. The distinction between `undefined` and `null` is load-bearing — a
 * caller that names its target and currently has none must NOT silently inherit the selection,
 * which is the whole failure this exists to prevent: a document's comments handed to whichever
 * agent the reader happened to click last.
 *
 * A NAMED target is also checked against the list, where a selected one is not. It has to be:
 * the selection names a terminal the store is rendering, but an id a component is holding stays
 * well-formed forever, so an agent closed while the control is on screen would leave a button
 * writing into a pty nobody is reading. `isAgentTerminal` cannot see that — it reads a prefix.
 *
 * No store import and no DOM types, like the rest of this module, so the node suite can load it.
 */
export function resolveAgentTarget(
  explicit: string | null | undefined,
  active: string | null | undefined,
  terminals: readonly KnownTerminal[],
): string | null {
  const named = explicit !== undefined
  const id = named ? explicit : active
  if (!id || !isAgentTerminal(id)) return null
  if (named && !terminals.some(terminal => terminal.id === id)) return null
  return id
}

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
 * HERE rather than beside the first control that pasted, because there are two of them now —
 * the review's comments and a PR review thread — and this module is already the answer to
 * "which terminal do I hand text to". The bytes that make it a paste belong with it.
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
