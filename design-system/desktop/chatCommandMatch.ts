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

/**
 * THE `/` BEING TYPED, wherever it is in the prompt: the word the caret is in or just
 * after, when it starts with a slash that opens the prompt or follows a space or a line
 * break. `start` is the slash, `end` the end of the word (it may run past the caret),
 * `query` what was typed between the slash and the caret. Null when the caret is in no
 * such word: a path (`src/app`) or a URL is not a command.
 */
export interface SlashToken {
  start: number
  end: number
  query: string
}

export function slashTokenAt(text: string, caret: number): SlashToken | null {
  let start = caret
  while (start > 0 && !/\s/.test(text[start - 1])) start--
  if (text[start] !== '/') return null
  const query = text.slice(start + 1, caret)
  if (query.includes('/')) return null
  let end = caret
  while (end < text.length && !/\s/.test(text[end])) end++
  return { start, end, query }
}

/**
 * The prompt cut into runs, each a known `/command` or not: what the composer colours.
 * A command counts wherever it stands, as long as it is a word of its own: after the
 * start or a space, before a space or the end.
 */
export function commandSpans(text: string, names: ReadonlySet<string>): { text: string; command: boolean }[] {
  const spans: { text: string; command: boolean }[] = []
  let last = 0
  for (const match of text.matchAll(/(^|\s)(\/([^\s/]+))(?=\s|$)/g)) {
    if (!names.has(match[3])) continue
    const at = match.index! + match[1].length
    if (at > last) spans.push({ text: text.slice(last, at), command: false })
    spans.push({ text: match[2], command: true })
    last = at + match[2].length
  }
  if (last < text.length) spans.push({ text: text.slice(last), command: false })
  return spans
}
