/**
 * Which terminals are AGENTS, and which only look like one from the store.
 *
 * The store's `terminals` list is not all agents. Two other kinds live in it under reserved
 * id prefixes — the sidebar's own terminal (`sidebar-`) and the script runner's
 * (`script-`) — and `activeTerminalId` can name either of them, because they are terminals a
 * user selects and types in like any other.
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
