import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'

/**
 * CLAUDE CODE'S `:emoji:` TYPEAHEAD, read and switched from the app.
 *
 * `emojiCompletionEnabled` in Claude Code's settings: absent or true, its prompt turns a
 * trailing `:+1` into 👍 on Enter instead of sending. The chat view has to know, because
 * it types into that prompt and does the same swap in its own box first (see
 * design-system/desktop/chatEmoji.ts): with the typeahead off, `:+1` is sent as typed.
 *
 * THE VALUE IS CLAUDE CODE'S, not the app's: no copy in the cloud config, nothing to
 * keep in step. The switch in Settings writes the user's own `settings.json`, so it is
 * the same setting their `claude` in any terminal reads, and Claude Code re-reads that
 * file live: the sessions already open follow without a restart.
 *
 * Read as Claude Code merges it for a session in `cwd`: the project's local file, then
 * the project's shared one, then the user's. Managed (enterprise) settings are left out:
 * they are not ours to show or to write over.
 */

/** Honours CLAUDE_CONFIG_DIR the same way the CLI does. */
function claudeConfigDir(): string {
  return process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude')
}

function userSettingsPath(): string {
  return path.join(claudeConfigDir(), 'settings.json')
}

/** The flag as one file sets it, or undefined when it does not (or cannot be read). */
function flagIn(file: string): boolean | undefined {
  try {
    const value = (JSON.parse(fs.readFileSync(file, 'utf-8')) as { emojiCompletionEnabled?: unknown }).emojiCompletionEnabled
    return typeof value === 'boolean' ? value : undefined
  } catch {
    return undefined
  }
}

/** Whether Claude Code completes `:emoji:` shortcodes for a session in `cwd` (the user's own value without one). */
export function readEmojiCompletion(cwd?: string | null): boolean {
  const files = cwd
    ? [path.join(cwd, '.claude', 'settings.local.json'), path.join(cwd, '.claude', 'settings.json'), userSettingsPath()]
    : [userSettingsPath()]
  for (const file of files) {
    const value = flagIn(file)
    if (value !== undefined) return value
  }
  return true
}

/**
 * Switches it in the user's `settings.json`. On is written as the key's absence, which is
 * Claude Code's own default, so turning it back on leaves the file as it was found.
 *
 * A file that exists but does not parse is left alone and the write refused: rewriting
 * it from scratch would drop everything else the person keeps in it.
 */
export function writeEmojiCompletion(enabled: boolean): void {
  const file = userSettingsPath()
  let settings: Record<string, unknown> = {}
  if (fs.existsSync(file)) {
    const parsed: unknown = JSON.parse(fs.readFileSync(file, 'utf-8'))
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      throw new Error(`${file} is not a JSON object`)
    }
    settings = parsed as Record<string, unknown>
  }
  if (enabled) delete settings.emojiCompletionEnabled
  else settings.emojiCompletionEnabled = false
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, JSON.stringify(settings, null, 2))
}
