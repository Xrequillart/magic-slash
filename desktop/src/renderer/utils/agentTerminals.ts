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
