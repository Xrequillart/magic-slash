import { describe, it, expect } from 'vitest'
import type { RepositoryConfig } from '../../types'
import {
  resolveTaskSelection,
  seedFromTarget,
  shouldClearSeededQuery,
  taskSelectionFor,
} from './taskSelection'

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

describe('seedFromTarget', () => {
  const SELECTION = { tracker: 'github' as const, configKey: 'magic-slash', number: 291 }

  it('opens on the ticket, and narrows the list to it as well', () => {
    // Both, deliberately: the page cannot know which of the two it needs until the
    // snapshot lands, and the query is what `back()` from the ticket then drops.
    expect(seedFromTarget({ selection: SELECTION, query: '#291' })).toEqual({
      selection: SELECTION,
      query: '#291',
    })
  })

  it('narrows the list alone for a ticket the sidebar could not place', () => {
    // A closed issue, an untracked repository, an id typed by hand: no row to open,
    // so the list filtered by the id is the whole answer.
    expect(seedFromTarget({ selection: null, query: '#412' })).toEqual({
      selection: null,
      query: '#412',
    })
  })

  it('seeds nothing when the page was opened by hand', () => {
    // ⌘J and the sidebar button both go through the bare `openModal('tasks')`, which
    // leaves the target null — the backlog, unnarrowed. This is the case that makes
    // reopening Tasks safe after a deep link: the store field was consumed, so the
    // next open reads null here rather than replaying the last ticket clicked.
    expect(seedFromTarget(null)).toEqual({ selection: null, query: '' })
    expect(seedFromTarget(undefined)).toEqual({ selection: null, query: '' })
  })
})

describe('taskSelectionFor', () => {
  it('reads each tracker off the ID, not off the caller', () => {
    // The plan detail page passes ONE repository for a whole tree of tickets, so a plan
    // that filed a Jira epic and GitHub issues has both shapes arriving with the same
    // config key. The id is the only thing that says which is which.
    expect(taskSelectionFor('#194', 'magic-slash')).toEqual({
      tracker: 'github',
      configKey: 'magic-slash',
      number: 194,
    })
    expect(taskSelectionFor('per-5030', 'magic-slash')).toEqual({
      tracker: 'jira',
      configKey: 'magic-slash',
      key: 'PER-5030',
    })
  })

  it('is null for a repository this machine has not configured', () => {
    // The ordinary case for a teammate's plan: `configKeyForRepoId` finds no local key
    // for the cloud repo id. Not a dead click — Tasks opens on the list narrowed to the
    // ticket — which is why this returns null rather than throwing.
    expect(taskSelectionFor('#194', undefined)).toBeNull()
  })

  it('is null for an id of neither shape', () => {
    expect(taskSelectionFor('', 'magic-slash')).toBeNull()
    expect(taskSelectionFor('spec-refonte', 'magic-slash')).toBeNull()
  })
})

describe('shouldClearSeededQuery', () => {
  it('drops the seeded query once the ticket is open', () => {
    expect(shouldClearSeededQuery('#291', '#291', true)).toBe(true)
  })

  it('keeps it while no ticket has resolved', () => {
    // The unresolved case is the FALLBACK, not a failure: the narrowed list and its
    // "no open ticket matches" state are the whole point of having seeded a query.
    expect(shouldClearSeededQuery('#291', '#291', false)).toBe(false)
  })

  it('never drops a query the reader typed themselves', () => {
    // The regression this guards: a ticket that never resolves leaves the seeded query
    // in the box, so by the time some other selection resolves the text may be the
    // reader's own. Clearing it would send them back to a backlog they never asked for.
    expect(shouldClearSeededQuery('#291', 'refund', true)).toBe(false)
    expect(shouldClearSeededQuery('#291', '', true)).toBe(false)
    expect(shouldClearSeededQuery('#291', '#2910', true)).toBe(false)
  })

  it('does nothing on a page that seeded no query', () => {
    // Opened by hand and then a ticket clicked: there is no query of ours to drop, and
    // an empty seed must never match an empty box and clear it "successfully".
    expect(shouldClearSeededQuery('', '', true)).toBe(false)
    expect(shouldClearSeededQuery('', 'refund', true)).toBe(false)
  })
})
