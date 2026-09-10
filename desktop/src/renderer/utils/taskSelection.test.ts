import { describe, it, expect } from 'vitest'
import type { RepositoryConfig } from '../../types'
import { resolveTaskSelection } from './taskSelection'

function repo(overrides: Partial<RepositoryConfig> = {}): RepositoryConfig {
  return { path: '', keywords: [], ...overrides }
}

const REPOS: Record<string, RepositoryConfig> = {
  'magic-slash': repo({ id: 'r1', path: '/Users/x/Documents/magic-slash' }),
  'poppins-pex': repo({ id: 'r2', path: '/Users/x/Documents/poppins-pex' }),
}

describe('resolveTaskSelection', () => {
  it('reads a GitHub issue id as a NUMBER', () => {
    // The Tasks page compares `issue.number === selected.number`, so the string
    // `'291'` would never match a row — and neither would `'#291'`.
    expect(resolveTaskSelection('291', ['/Users/x/Documents/magic-slash'], REPOS)).toEqual({
      tracker: 'github',
      configKey: 'magic-slash',
      number: 291,
    })
  })

  it('drops the display `#` a hand-typed issue id carries', () => {
    expect(resolveTaskSelection('#291', ['/Users/x/Documents/magic-slash'], REPOS)).toEqual({
      tracker: 'github',
      configKey: 'magic-slash',
      number: 291,
    })
  })

  it('upper-cases a Jira key, because the page compares it exactly', () => {
    // Jira itself is case-insensitive about keys — `per-5030` browses to `PER-5030` —
    // so the two spellings are one ticket and have to fold together here.
    expect(resolveTaskSelection('per-5030', ['/Users/x/Documents/poppins-pex'], REPOS)).toEqual({
      tracker: 'jira',
      configKey: 'poppins-pex',
      key: 'PER-5030',
    })
  })

  it('resolves a /magic:start WORKTREE to the repository it was cut from', () => {
    // `/magic:start` replaces the agent's repositories with `../<repo>-<TICKET>`, so
    // the path an agent carries is usually a sibling of the configured folder.
    expect(resolveTaskSelection('234', ['/Users/x/Documents/magic-slash-234'], REPOS)).toEqual({
      tracker: 'github',
      configKey: 'magic-slash',
      number: 234,
    })
  })

  it('picks the LONGEST matching repository when two of them claim the worktree', () => {
    // `slash-291` is itself a valid worktree suffix, so a repo called `magic` matches
    // `…/magic-slash-291` as truly as `magic-slash` does. Taking the first match would
    // hand the selection to whichever key the settings happened to be written in first.
    const ambiguous: Record<string, RepositoryConfig> = {
      magic: repo({ id: 'r0', path: '/Users/x/Documents/magic' }),
      ...REPOS,
    }
    expect(resolveTaskSelection('291', ['/Users/x/Documents/magic-slash-291'], ambiguous)).toEqual({
      tracker: 'github',
      configKey: 'magic-slash',
      number: 291,
    })
    // Order-independent: the same answer with the candidates declared the other way up.
    const reversed: Record<string, RepositoryConfig> = {
      'magic-slash': REPOS['magic-slash'],
      magic: repo({ id: 'r0', path: '/Users/x/Documents/magic' }),
    }
    expect(resolveTaskSelection('291', ['/Users/x/Documents/magic-slash-291'], reversed)).toEqual({
      tracker: 'github',
      configKey: 'magic-slash',
      number: 291,
    })
  })

  it('lets the FIRST attached path decide, not the longest name across all of them', () => {
    // `resolveRepoIds` in repoMatch.ts answers the same question with the same rule —
    // "Order follows `paths`, so the FIRST path decides" — and the two must not
    // disagree about which repository an agent spanning several belongs to. Comparing
    // globally opened the ticket against `poppins-website` (15 characters) even though
    // the worktree the ticket came from was the first path.
    const spanning: Record<string, RepositoryConfig> = {
      'magic-slash': repo({ id: 'r1', path: '/Users/x/Documents/magic-slash' }),
      'poppins-website': repo({ id: 'r4', path: '/Users/x/Documents/poppins-website' }),
    }
    expect(resolveTaskSelection(
      '291',
      ['/Users/x/Documents/magic-slash-291', '/Users/x/Documents/poppins-website'],
      spanning,
    )).toEqual({ tracker: 'github', configKey: 'magic-slash', number: 291 })
  })

  it('measures the handle that MATCHED, not the longer name the repo also carries', () => {
    // `magic` claims `…/magic-slash-291` through its config key and nothing else — its
    // folder name is irrelevant to that match. Scoring both handles let a long folder
    // stand in for a specificity the key does not have, and outrank the `magic-slash`
    // the worktree was actually named after.
    const decoy: Record<string, RepositoryConfig> = {
      magic: repo({ id: 'r0', path: '/Users/x/Documents/verylongreponame' }),
      'magic-slash': repo({ id: 'r1', path: '/Users/x/Documents/magic-slash' }),
    }
    expect(resolveTaskSelection('291', ['/Users/x/Documents/magic-slash-291'], decoy)).toEqual({
      tracker: 'github',
      configKey: 'magic-slash',
      number: 291,
    })
  })

  it('matches through the local folder name of a repo registered under another', () => {
    // `pathBelongsToRepo` accepts either handle, and a team repo can be keyed
    // differently from the directory it was cloned into.
    const renamed: Record<string, RepositoryConfig> = {
      api: repo({ id: 'r3', path: '/Users/x/Documents/poppins-api' }),
    }
    expect(resolveTaskSelection('PER-1', ['/Users/x/Documents/poppins-api-PER-1'], renamed)).toEqual({
      tracker: 'jira',
      configKey: 'api',
      key: 'PER-1',
    })
  })

  it('answers null for paths that belong to no configured repository', () => {
    expect(resolveTaskSelection('291', ['/Users/x/Documents/some-other-repo'], REPOS)).toBeNull()
    expect(resolveTaskSelection('291', [], REPOS)).toBeNull()
  })

  it('answers null for an id that matches neither tracker', () => {
    // A hand-typed reference is still a valid ticket id in the sidebar; it simply has
    // no row for the page to open.
    expect(resolveTaskSelection('see the doc', ['/Users/x/Documents/magic-slash'], REPOS)).toBeNull()
  })

  it('answers null for an agent that is on no ticket', () => {
    expect(resolveTaskSelection(undefined, ['/Users/x/Documents/magic-slash'], REPOS)).toBeNull()
    expect(resolveTaskSelection('   ', ['/Users/x/Documents/magic-slash'], REPOS)).toBeNull()
  })
})
