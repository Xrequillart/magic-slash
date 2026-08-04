import { describe, it, expect } from 'vitest'
import { INSTALL_COMMANDS, installPrerequisite } from './installers'
import { CLAUDE_INSTALL_COMMAND } from './prerequisites'
import type { PrerequisiteId } from '../../types'

/**
 * The allowlist is the security boundary here — the id arrives over IPC and the value
 * it selects goes to a shell — so what is tested is that it stays an allowlist: fixed
 * whole commands, nothing interpolated, and a refusal for anything not in it.
 */
describe('INSTALL_COMMANDS', () => {
  it('installs Claude Code with its official installer', () => {
    // The one required prerequisite with no brew formula. Before this it was a link to
    // a docs page, which left the app unable to repair the tool it needs most.
    expect(INSTALL_COMMANDS.claude).toBe(CLAUDE_INSTALL_COMMAND)
    expect(INSTALL_COMMANDS.claude).toBe('curl -fsSL https://claude.ai/install.sh | bash')
  })

  it('installs every brew-managed prerequisite by formula', () => {
    expect(INSTALL_COMMANDS.jq).toBe('brew install jq')
    expect(INSTALL_COMMANDS.gh).toBe('brew install gh')
    expect(INSTALL_COMMANDS.git).toBe('brew install git')
    expect(INSTALL_COMMANDS.node).toBe('brew install node')
  })

  it('holds no command that interpolates anything', () => {
    // A `$`, a backtick or a `${}` would mean the shell expands part of this string,
    // which is the one thing an allowlist of whole commands exists to prevent.
    for (const command of Object.values(INSTALL_COMMANDS)) {
      expect(command).not.toMatch(/[$`]/)
    }
  })
})

describe('installPrerequisite', () => {
  it('refuses an id that is not in the allowlist, without spawning anything', async () => {
    // Reached only from a renderer sending something the UI never offers; it must be a
    // returned error rather than a shell invocation.
    const result = await installPrerequisite('nonsense' as PrerequisiteId)
    expect(result).toEqual({ ok: false, output: '', error: 'not installable: nonsense' })
  })
})
