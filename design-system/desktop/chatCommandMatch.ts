/**
 * The `/` menu's data and its filter, apart from the menu itself so they can be tested
 * without React (see ChatCommandMenu.tsx for what the menu is).
 */

export interface ChatCommand {
  /** Without the slash: `magic:start`, `mcp`, `my-plugin:review`. */
  name: string
  description?: string
  source: 'builtin' | 'skill'
  interactive?: boolean
}

/**
 * The commands that match what was typed after the slash: names that START with it
 * first, then names that merely contain it, each group in the order given. A plugin
 * command is matched on its own name too (`review` finds `my-plugin:review`).
 */
export function matchCommands(commands: ChatCommand[], query: string): ChatCommand[] {
  const q = query.toLowerCase()
  if (!q) return commands
  const starts: ChatCommand[] = []
  const contains: ChatCommand[] = []
  for (const command of commands) {
    const name = command.name.toLowerCase()
    const short = name.slice(name.lastIndexOf(':') + 1)
    if (name.startsWith(q) || short.startsWith(q)) starts.push(command)
    else if (name.includes(q)) contains.push(command)
  }
  return [...starts, ...contains]
}
