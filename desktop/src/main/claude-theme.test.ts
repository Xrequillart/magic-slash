import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { CLAUDE_THEME_REF } from '../claude-theme'

// readConfig is mocked so the opt-out can be flipped per test.
vi.mock('./config/config', () => ({ readConfig: vi.fn() }))
import { readConfig } from './config/config'
import { claudeThemeFlag, syncClaudeTheme } from './claude-theme'

/**
 * A throwaway CLAUDE_CONFIG_DIR, which the module honours the same way the CLI
 * does. Nothing here touches the developer's real ~/.claude.
 */
let configDir: string

function themeFile(): string {
  return path.join(configDir, 'themes', 'magic-slash.json')
}

/** Give the fake Claude install a settings.json naming `theme`. */
function userTheme(theme: string): void {
  fs.writeFileSync(path.join(configDir, 'settings.json'), JSON.stringify({ theme }))
}

beforeEach(() => {
  configDir = fs.mkdtempSync(path.join(os.tmpdir(), 'claude-theme-'))
  process.env.CLAUDE_CONFIG_DIR = configDir
  vi.mocked(readConfig).mockReturnValue({ version: 'x', repositories: {} })
})

afterEach(() => {
  delete process.env.CLAUDE_CONFIG_DIR
  fs.rmSync(configDir, { recursive: true, force: true })
})

describe('syncClaudeTheme', () => {
  it('writes a theme Claude Code can parse, creating the directory', () => {
    syncClaudeTheme('light')

    const written = JSON.parse(fs.readFileSync(themeFile(), 'utf-8'))
    expect(written.base).toBe('light')
    expect(written.overrides.text).toMatch(/^#[0-9a-f]{6}$/)
  })

  it('removes the file when the setting is off', () => {
    syncClaudeTheme('light')
    expect(fs.existsSync(themeFile())).toBe(true)

    // Removal, not neglect: the CLI watches the directory, so a file going away
    // is what returns an already-open session to Claude's own palette.
    vi.mocked(readConfig).mockReturnValue({ version: 'x', repositories: {}, syncClaudeTheme: false })
    syncClaudeTheme('light')
    expect(fs.existsSync(themeFile())).toBe(false)
  })

  it('carries a daltonized base across the light/dark flip', () => {
    userTheme('dark-daltonized')
    syncClaudeTheme('light')

    // The accommodation survives; only the light/dark half follows the app.
    expect(JSON.parse(fs.readFileSync(themeFile(), 'utf-8')).base).toBe('light-daltonized')
  })

  it('declines entirely for a user reading in an ansi variant', () => {
    userTheme('dark-ansi')
    syncClaudeTheme('light')

    // Both halves have to agree: activating a theme we never wrote would drop
    // them onto a default instead of the ANSI palette they asked for.
    expect(fs.existsSync(themeFile())).toBe(false)
    expect(claudeThemeFlag()).toBe('')
  })

  it('treats an unreadable settings.json as no opinion', () => {
    fs.writeFileSync(path.join(configDir, 'settings.json'), '{ not json')
    syncClaudeTheme('dark')

    expect(JSON.parse(fs.readFileSync(themeFile(), 'utf-8')).base).toBe('dark')
  })
})

describe('claudeThemeFlag', () => {
  it('quotes the settings JSON for the shell that runs the command', () => {
    // pty.spawn runs `sh -c "<string>"`, so the JSON has to survive one round of
    // shell parsing as ONE argument. Single quotes now, not escaped double quotes:
    // inside double quotes a shell still expands `$` and backticks, and while this
    // particular payload is a constant with neither, the spawn path must not carry
    // an example of quoting-for-the-shell-with-JSON for the next reader to copy.
    // Asserting the exact string because getting this subtly wrong produces a
    // command that still launches, just without the theme.
    expect(claudeThemeFlag()).toBe(` --settings '{"theme":"${CLAUDE_THEME_REF}"}'`)
  })

  it('is empty when the setting is off, so the command line is untouched', () => {
    vi.mocked(readConfig).mockReturnValue({ version: 'x', repositories: {}, syncClaudeTheme: false })
    expect(claudeThemeFlag()).toBe('')
  })
})
