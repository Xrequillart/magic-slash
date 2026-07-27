import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import {
  CLAUDE_THEME_REF,
  CLAUDE_THEME_SLUG,
  claudeThemeFile,
  type ClaudeThemeVariant,
} from '../claude-theme'
import type { ThemeId } from '../types'
import { readConfig } from './config/config'

/**
 * Keeps Claude Code's own colours in step with the app's theme.
 *
 * Claude Code paints itself from a theme chosen once at install time, which has
 * nothing to do with the app it happens to be running inside. Put the app in a
 * light theme with Claude Code still on a dark one and parts of the transcript
 * go white on white.
 *
 * The fix has two halves, and they have to agree with each other:
 *  - a generated theme file in Claude's config directory, rewritten whenever the
 *    app's theme changes (see ../claude-theme.ts for what goes in it);
 *  - `--settings '{"theme":"custom:magic-slash"}'` on the command line of every
 *    terminal the app spawns (see pty/terminal-manager.ts).
 *
 * Activating through the command line rather than by editing the user's
 * `settings.json` is deliberate: the override then applies to the terminals in
 * this app and nowhere else. Claude Code launched from a normal terminal keeps
 * whatever theme its owner chose, which is the whole reason they chose it.
 *
 * Rewriting one file rather than shipping one per theme is deliberate too.
 * Claude Code watches the themes directory, so a session that is already open
 * repaints when the file changes — switching the app's theme reaches the
 * transcripts already on screen, not just the next terminal.
 */

/** Honours CLAUDE_CONFIG_DIR the same way the CLI does. */
function claudeConfigDir(): string {
  return process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude')
}

function themeFilePath(): string {
  return path.join(claudeConfigDir(), 'themes', `${CLAUDE_THEME_SLUG}.json`)
}

/** Whatever the user picked for their own Claude Code, or null if unreadable. */
function userClaudeTheme(): string | null {
  try {
    const raw = fs.readFileSync(path.join(claudeConfigDir(), 'settings.json'), 'utf-8')
    const theme = (JSON.parse(raw) as { theme?: unknown }).theme
    return typeof theme === 'string' ? theme : null
  } catch {
    // No settings file, or one we cannot parse. Neither is our business to fix.
    return null
  }
}

interface SyncDecision {
  /** Whether to generate the theme at all, and to pass the flag at spawn. */
  active: boolean
  variant: ClaudeThemeVariant
}

/**
 * Whether to sync, and onto which of Claude's built-ins.
 *
 * Two reasons to decline. The obvious one is the setting being off. The other is
 * a user reading in one of the `-ansi` variants: those exist to say "use the
 * sixteen colours my terminal defines, no truecolor", usually because the
 * terminal's palette is tuned for a reason. Handing that user a file full of hex
 * would override the preference with the opposite of it, so the feature steps
 * aside instead — and steps aside on BOTH halves, since activating a theme we
 * never wrote would drop them onto a default rather than their own.
 *
 * A `-daltonized` base, by contrast, is carried across: it is a colourblindness
 * accommodation, and the light/dark flip has no quarrel with it.
 */
function decide(): SyncDecision {
  if (readConfig().syncClaudeTheme === false) return { active: false, variant: '' }

  const theme = userClaudeTheme()
  if (theme?.endsWith('-ansi')) return { active: false, variant: '' }

  return { active: true, variant: theme?.endsWith('-daltonized') ? '-daltonized' : '' }
}

/**
 * The command-line fragment that activates the generated theme, or an empty
 * string when the feature is off. Appended to the `claude` invocation.
 *
 * Double-encoded on purpose: the inner JSON.stringify builds the settings
 * object, the outer one quotes it for the shell that `pty.spawn` runs it
 * through.
 */
export function claudeThemeFlag(): string {
  if (!decide().active) return ''
  return ` --settings ${JSON.stringify(JSON.stringify({ theme: CLAUDE_THEME_REF }))}`
}

/**
 * Write the theme for `id`, or remove it when the feature is off.
 *
 * Removing rather than leaving the file behind matters: it is the only way a
 * user who turns the setting off gets their terminal back to Claude's own
 * palette in the sessions already open, since the watcher reacts to the file
 * going away as well as to it changing.
 *
 * Failures are swallowed. A theme that cannot be written costs the user the
 * colours they would have had, and nothing else — the terminal still runs.
 */
export function syncClaudeTheme(id: ThemeId): void {
  const target = themeFilePath()
  const { active, variant } = decide()

  try {
    if (!active) {
      fs.rmSync(target, { force: true })
      return
    }
    fs.mkdirSync(path.dirname(target), { recursive: true })
    fs.writeFileSync(target, `${JSON.stringify(claudeThemeFile(id, variant), null, 2)}\n`)
  } catch (error) {
    console.error('Could not sync the Claude Code theme:', error)
  }
}
