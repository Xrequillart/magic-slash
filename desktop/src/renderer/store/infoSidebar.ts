/**
 * Whose info panel is on screen, and whether it is open.
 *
 * A module of its own rather than two functions inside the store, for the reason
 * `utils/skillSummary.ts` is one: importing the store runs `persist`, which wants a
 * browser, so a rule that lives in `index.ts` can only be tested through a window. The
 * rule here is the whole feature — three states collapsing into one boolean — and it is
 * the thing worth testing.
 *
 * Typed against the shape it READS, not against `AppState`: the store satisfies it
 * structurally, and a test can hand it four fields instead of ninety.
 */

export interface InfoSidebarState {
  terminals: { id: string; infoSidebarOpen?: boolean }[]
  config: { infoSidebarOnCreate?: boolean } | null
  isSplitMode: boolean
  focusedPane: 'primary' | 'secondary'
  activeTerminalId: string | null
  splitTerminalId: string | null
}

/**
 * The agent the right-hand info panel describes: in split mode, whichever pane has
 * focus; otherwise the active one.
 *
 * Exported because three surfaces have to agree on it — the panel, the title bar's
 * toggle and ⌘I — and they would disagree the moment one of them recomputed the rule
 * slightly differently. `TitleBar` picks its close button by the same rule.
 */
export function selectInspectedTerminalId(state: InfoSidebarState): string | null {
  return state.isSplitMode && state.focusedPane === 'secondary'
    ? state.splitTerminalId
    : state.activeTerminalId
}

/**
 * Whether the info panel is open, for the agent currently being inspected.
 *
 * THREE STATES COLLAPSE HERE, and the order matters. An agent that has been toggled
 * carries its own boolean, and that wins — it is the whole point of the panel being per
 * agent. An agent nobody has toggled (brand new, or created before the field existed)
 * reads as `config.infoSidebarOnCreate`, which is on unless explicitly turned off. And
 * with no agent inspected there is nothing for the panel to describe, so it is shut:
 * that used to be a special case when the last agent was closed, and it now falls out
 * of the lookup missing.
 */
export function selectInfoSidebarOpen(state: InfoSidebarState): boolean {
  const terminal = state.terminals.find((t) => t.id === selectInspectedTerminalId(state))
  if (!terminal) return false
  return terminal.infoSidebarOpen ?? state.config?.infoSidebarOnCreate !== false
}
