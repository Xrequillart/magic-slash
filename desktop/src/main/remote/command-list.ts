import { INTERACTIVE_COMMANDS, PLAIN_COMMANDS } from '../../prompt-submit'

/**
 * The `/` commands a paired iPhone suggests while its user types (PROTOCOL.md §13): the desktop
 * chat's own menu (renderer/components/chatCommands.ts), minus what a phone may not send.
 *
 * Claude Code's built-ins that answer in the conversation come first, then every skill and
 * command on disk the way the CLI lists them. The built-ins that open a dialog of the TUI are
 * left out, and so is a skill named like one: the Mac refuses those from a phone (§10), so the
 * phone must not offer them. Bounded so the box stays well under Realtime's payload cap.
 */

export const COMMAND_LIMITS = { count: 300, name: 80, description: 160, bytes: 48_000 } as const

export interface RelayCommand {
  /** Without the slash: `magic:start`, `compact`. */
  name: string
  /** A built-in has none: the phone words its own, in its language. */
  description?: string
  source: 'builtin' | 'skill'
}

/** A row of `collectListingEntries` (skills-listing.ts), as far as the phone needs it. */
export interface ListingRow {
  name: string
  description?: string
  text?: string
  userInvocable?: false
}

/** `text` cut at `max` code points: a cut through a surrogate pair would not encode. */
function cut(text: string, max: number): string {
  if (text.length <= max) return text
  const points = Array.from(text)
  return points.length <= max ? text : `${points.slice(0, max - 1).join('').trimEnd()}…`
}

export function toRelayCommands(listing: readonly ListingRow[]): RelayCommand[] {
  const seen = new Set<string>(INTERACTIVE_COMMANDS)
  const commands: RelayCommand[] = []
  let bytes = 0
  const push = (command: RelayCommand): boolean => {
    const size = Buffer.byteLength(JSON.stringify(command))
    if (commands.length >= COMMAND_LIMITS.count || bytes + size > COMMAND_LIMITS.bytes) return false
    commands.push(command)
    bytes += size
    return true
  }
  for (const name of PLAIN_COMMANDS) {
    seen.add(name)
    push({ name, source: 'builtin' })
  }
  for (const row of listing) {
    // A name longer than the bound would be cut into a command that does not exist.
    if (row.userInvocable === false || !row.name || row.name.length > COMMAND_LIMITS.name || seen.has(row.name)) continue
    seen.add(row.name)
    const about = (row.description || row.text || '').replace(/\s+/g, ' ').trim()
    if (!push({ name: row.name, ...(about ? { description: cut(about, COMMAND_LIMITS.description) } : {}), source: 'skill' })) break
  }
  return commands
}
