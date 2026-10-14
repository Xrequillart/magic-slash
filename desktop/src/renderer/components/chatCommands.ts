import type { ChatCommand } from '@ds/desktop'
import { INTERACTIVE_COMMANDS, PLAIN_COMMANDS, opensInTerminal } from '../../prompt-submit'

/**
 * What the chat's `/` menu offers: Claude Code's own commands, then every skill and
 * command on disk the way the CLI lists them (`skills:listingEntries`, the same walk
 * the Skills page budget reads: user, repository and plugin skills).
 *
 * THE BUILT-INS ARE A LIST WRITTEN HERE because they live inside the Claude Code binary
 * and have no file to read. `interactive` is a command whose answer is a dialog of the
 * TUI: it is sent like any other, and the pane then shows the terminal, where the
 * dialog is. A command missing from this list still works when typed in full; it only
 * goes unsuggested.
 *
 * Which of them are `interactive` is src/prompt-submit.ts's list, shared with the main
 * process: a paired iPhone may not send those (remote/PROTOCOL.md §10).
 */
const BUILT_INS: { name: string; interactive?: boolean }[] = [
  ...PLAIN_COMMANDS.map((name) => ({ name })),
  ...INTERACTIVE_COMMANDS.map((name) => ({ name, interactive: true })),
]

export function builtInCommands(describe: (name: string) => string): ChatCommand[] {
  return BUILT_INS.map((c) => ({ name: c.name, description: describe(c.name), source: 'builtin' as const, interactive: c.interactive }))
}

/** Whether the text sent runs a command whose answer only the terminal can show. */
export { opensInTerminal }

interface ListingRow { name: string; description?: string; text?: string; userInvocable?: false }

/**
 * The skills, read once and shared by every pane: the walk touches every repository and
 * plugin on disk, and twelve agents must not each make it. Read again after a minute, so
 * a skill installed meanwhile shows up.
 */
let cached: { at: number; rows: Promise<ChatCommand[]> } | null = null
const TTL_MS = 60_000

export function skillCommands(): Promise<ChatCommand[]> {
  if (cached && Date.now() - cached.at < TTL_MS) return cached.rows
  const rows = window.electronAPI.skills.listingEntries()
    .then((result: { entries?: ListingRow[] }) =>
      (result?.entries ?? []).filter((e) => e.userInvocable !== false).map((e) => ({ name: e.name, description: e.description ?? e.text, source: 'skill' as const }))
    )
    .catch(() => [] as ChatCommand[])
  cached = { at: Date.now(), rows }
  return rows
}

/** Built-ins first, then skills; one row per name. */
export function mergeCommands(builtIns: ChatCommand[], skills: ChatCommand[]): ChatCommand[] {
  const seen = new Set<string>()
  return [...builtIns, ...skills].filter((c) => (seen.has(c.name) ? false : (seen.add(c.name), true)))
}
