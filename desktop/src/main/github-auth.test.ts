import { describe, it, expect, vi, beforeEach } from 'vitest'

// Controllable mock of child_process so getGitHubAuthStatus() never spawns `gh`.
// Each test sets execFileSync's behaviour to simulate a `gh auth status` outcome.
vi.mock('child_process', () => ({
  execFileSync: vi.fn(),
}))

import { execFileSync } from 'child_process'
import { getGitHubAuthStatus, getGitHubToken, clearGitHubTokenCache } from './github'

const mockExec = execFileSync as unknown as ReturnType<typeof vi.fn>

/** Build the error `gh` throws on non-zero exit, carrying output on stderr. */
function ghError(stderr = '', stdout = ''): Error {
  return Object.assign(new Error('gh exited non-zero'), { stderr, stdout })
}

describe('getGitHubAuthStatus', () => {
  beforeEach(() => {
    mockExec.mockReset()
  })

  it('reports logged in and parses the account from the "account <user>" format', () => {
    mockExec.mockReturnValue(
      '✓ Logged in to github.com account octocat (keyring)\n  - Active account: true\n',
    )
    expect(getGitHubAuthStatus()).toEqual({ loggedIn: true, account: 'octocat' })
  })

  it('parses the account from the "Logged in to <host> as <user>" format', () => {
    mockExec.mockReturnValue('✓ Logged in to github.com as octocat (oauth_token)\n')
    expect(getGitHubAuthStatus()).toEqual({ loggedIn: true, account: 'octocat' })
  })

  it('reports logged in without an account when the output has no recognizable handle', () => {
    mockExec.mockReturnValue('✓ Logged in to github.com\n')
    expect(getGitHubAuthStatus()).toEqual({ loggedIn: true, account: undefined })
  })

  it('reports logged out when gh exits non-zero with no account in its output', () => {
    mockExec.mockImplementation(() => {
      throw ghError('You are not logged into any GitHub hosts. Run gh auth login to authenticate.\n')
    })
    expect(getGitHubAuthStatus()).toEqual({ loggedIn: false })
  })

  it('reports logged out when gh fails even if an account name appears on stderr', () => {
    // Invalid/expired credentials: gh exits non-zero but may still name the
    // account. The login is unusable, so it must NOT be reported as connected.
    mockExec.mockImplementation(() => {
      throw ghError('X Failed to log in to github.com account octocat (keyring) - invalid token\n')
    })
    expect(getGitHubAuthStatus()).toEqual({ loggedIn: false })
  })

  it('never stores or returns a token', () => {
    mockExec.mockReturnValue('✓ Logged in to github.com account octocat\n')
    const result = getGitHubAuthStatus()
    expect(Object.keys(result).sort()).toEqual(['account', 'loggedIn'])
  })
})

/**
 * Launched from the Dock, the app inherits launchd's PATH (/usr/bin:/bin:...), which
 * does NOT contain Homebrew — so `gh` used to come back ENOENT for someone logged in
 * fine in their terminal, and the PR watcher said "no GitHub token".
 */
describe('resolving gh outside a terminal', () => {
  beforeEach(() => {
    mockExec.mockReset()
    clearGitHubTokenCache()
  })

  it('runs gh with the common install prefixes prepended to PATH', () => {
    mockExec.mockReturnValue('gho_token\n')
    expect(getGitHubToken()).toBe('gho_token')

    const [file, args, options] = mockExec.mock.calls[0]
    expect(file).toBe('gh')
    expect(args).toEqual(['auth', 'token'])
    expect(options.env.PATH).toContain('/opt/homebrew/bin')
  })

  it('falls back to a login shell when gh is not on that PATH either', () => {
    // mise/asdf/an exotic npm prefix: only the user's profile knows where gh is.
    mockExec.mockImplementation((file: string, args: string[]) => {
      if (file === 'gh') throw Object.assign(new Error('spawnSync gh ENOENT'), { code: 'ENOENT' })
      expect(args).toContain('gh auth token')
      return 'gho_from_profile\n'
    })
    expect(getGitHubToken()).toBe('gho_from_profile')
  })

  it('returns null when neither the direct call nor the shell finds a token', () => {
    mockExec.mockImplementation(() => {
      throw ghError('not logged in')
    })
    expect(getGitHubToken()).toBeNull()
  })
})
