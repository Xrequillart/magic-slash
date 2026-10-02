import type { AgentDisplayMode, Config } from '../../types'

/**
 * Terminal or chat, for one agent: its own choice when it has one, else the account's
 * default, else the terminal. One rule for the pane and the title bar's button, which
 * would otherwise disagree about an agent nobody has switched.
 */
export function resolveDisplayMode(
  terminal: { displayMode?: AgentDisplayMode },
  config: Pick<Config, 'defaultDisplayMode'> | null | undefined,
): AgentDisplayMode {
  return terminal.displayMode ?? config?.defaultDisplayMode ?? 'terminal'
}
