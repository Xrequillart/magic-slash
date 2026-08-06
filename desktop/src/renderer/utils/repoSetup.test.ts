import { describe, it, expect } from 'vitest'
import type { InvalidRepo } from '../../preload'
import type { RepositoryConfig } from '../../types'
import { REASON_META, buildRepoSetup, mergeRepoSetup, needsRepoSetup } from './repoSetup'

function repo(overrides: Partial<RepositoryConfig> = {}): RepositoryConfig {
  return { path: '/Users/me/Documents/repo', keywords: [], ...overrides }
}

function invalid(name: string, reason: InvalidRepo['reason'], path = ''): InvalidRepo {
  return { name, path, reason }
}

const REPOS: Record<string, RepositoryConfig> = {
  'magic-slash': repo({ path: '/Users/me/Documents/magic-slash' }),
  'poppins-pex': repo({ path: '/Users/me/Documents/poppins-pex' }),
  'design-system': repo({ path: '', needsLocalPath: true }),
}

describe('REASON_META', () => {
  it('never toasts a repository that just has no folder bound yet', () => {
    // The whole "no double signal" rule lives in this null: a team repo the user
    // has not bound on this machine is surfaced in the modal and in Settings,
    // never as a persistent error toast on top of them.
    expect(REASON_META['no-local-path'].toastKey).toBeNull()
    expect(REASON_META['no-local-path'].severity).toBe('warning')
  })

  it('toasts the states the user has to act on', () => {
    expect(REASON_META['missing'].toastKey).toBe('toast.repoInvalidMissing')
    expect(REASON_META['not-git'].toastKey).toBe('toast.repoInvalidNotGit')
  })

  it('orders unbound first, then missing, then not-git', () => {
    expect(REASON_META['no-local-path'].priority).toBeLessThan(REASON_META['missing'].priority)
    expect(REASON_META['missing'].priority).toBeLessThan(REASON_META['not-git'].priority)
  })
})

describe('buildRepoSetup', () => {
  it('asks for a first repository when the account has none', () => {
    const result = buildRepoSetup({}, [])
    expect(result.mode).toBe('empty')
    expect(result.rows).toEqual([])
    expect(needsRepoSetup(result)).toBe(true)
  })

  it('stays silent while the config has not loaded yet', () => {
    // A null config is "not known yet", not "empty" — mapping it to 'empty'
    // would flash an "add a repository" modal at a user who has ten.
    for (const cfg of [null, undefined]) {
      const result = buildRepoSetup(cfg, [invalid('magic-slash', 'missing')])
      expect(result.mode).toBe('fix')
      expect(result.rows).toEqual([])
      expect(needsRepoSetup(result)).toBe(false)
    }
  })

  it('stays silent when every configured path is valid', () => {
    const result = buildRepoSetup(REPOS, [])
    expect(result.mode).toBe('fix')
    expect(result.rows).toEqual([])
    expect(needsRepoSetup(result)).toBe(false)
  })

  it('lists a team repository with no local folder bound', () => {
    const result = buildRepoSetup(REPOS, [invalid('design-system', 'no-local-path')])
    expect(result.rows).toEqual([{ name: 'design-system', path: '', reason: 'no-local-path' }])
    expect(needsRepoSetup(result)).toBe(true)
  })

  it('lists a repository whose folder has disappeared', () => {
    const result = buildRepoSetup(REPOS, [invalid('magic-slash', 'missing', '/gone/magic-slash')])
    expect(result.rows).toEqual([{ name: 'magic-slash', path: '/gone/magic-slash', reason: 'missing' }])
  })

  it('lists a repository pointing at a folder that is not a git repository', () => {
    const result = buildRepoSetup(REPOS, [invalid('poppins-pex', 'not-git', '/Users/me/Downloads')])
    expect(result.rows).toEqual([{ name: 'poppins-pex', path: '/Users/me/Downloads', reason: 'not-git' }])
  })

  it('ignores a repository the user no longer has in their config', () => {
    // A stale 'repos:invalid' payload can still name a repo deleted since — a
    // row for it would offer a "choose folder" button that writes into nothing.
    const result = buildRepoSetup(REPOS, [invalid('deleted-repo', 'missing')])
    expect(result.rows).toEqual([])
  })

  it('keeps a single row when the same repository is reported twice', () => {
    const result = buildRepoSetup(REPOS, [
      invalid('magic-slash', 'missing', '/gone/magic-slash'),
      invalid('magic-slash', 'not-git', '/other/magic-slash'),
    ])
    expect(result.rows).toEqual([{ name: 'magic-slash', path: '/gone/magic-slash', reason: 'missing' }])
  })

  it('shows unbound repositories first, then missing, then not-git', () => {
    const repos = {
      ...REPOS,
      'api': repo({ path: '/Users/me/Downloads' }),
      'aaa-unbound': repo({ path: '', needsLocalPath: true }),
    }
    const result = buildRepoSetup(repos, [
      invalid('api', 'not-git'),
      invalid('magic-slash', 'missing'),
      invalid('design-system', 'no-local-path'),
      invalid('poppins-pex', 'missing'),
      invalid('aaa-unbound', 'no-local-path'),
    ])
    expect(result.rows.map((r) => r.name)).toEqual([
      'aaa-unbound',
      'design-system',
      'magic-slash',
      'poppins-pex',
      'api',
    ])
  })
})

describe('mergeRepoSetup', () => {
  const OPENED_WITH = buildRepoSetup(REPOS, [
    invalid('design-system', 'no-local-path'),
    invalid('magic-slash', 'missing', '/gone/magic-slash'),
  ])

  it('keeps a row the user has just fixed', () => {
    // `repos:invalid` is re-emitted every 20s and on window focus, and a fixed
    // repository is exactly what drops out of it. Removing the row would erase
    // the green "Ready" the user's own action just produced.
    const merged = mergeRepoSetup(OPENED_WITH, buildRepoSetup(REPOS, [
      invalid('design-system', 'no-local-path'),
    ]))
    expect(merged.rows.map((r) => r.name)).toEqual(['design-system', 'magic-slash'])
  })

  it('keeps the last row when every repository has been fixed', () => {
    // The empty-list-under-a-"fix-these"-heading case.
    const merged = mergeRepoSetup(OPENED_WITH, buildRepoSetup(REPOS, []))
    expect(merged.rows).toEqual(OPENED_WITH.rows)
  })

  it('adds a repository that only shows up in a later payload', () => {
    // An organization's repositories land after the connectivity check, well
    // after the modal has opened — a late arrival still has to be surfaced.
    const merged = mergeRepoSetup(OPENED_WITH, buildRepoSetup(REPOS, [
      invalid('poppins-pex', 'not-git', '/Users/me/Downloads'),
    ]))
    expect(merged.rows.map((r) => r.name)).toEqual(['design-system', 'magic-slash', 'poppins-pex'])
    expect(merged.rows[2]).toEqual({ name: 'poppins-pex', path: '/Users/me/Downloads', reason: 'not-git' })
  })

  it('updates a displayed row in place when its reason changes', () => {
    const merged = mergeRepoSetup(OPENED_WITH, buildRepoSetup(REPOS, [
      invalid('magic-slash', 'not-git', '/Users/me/Downloads'),
    ]))
    expect(merged.rows).toEqual([
      { name: 'design-system', path: '', reason: 'no-local-path' },
      { name: 'magic-slash', path: '/Users/me/Downloads', reason: 'not-git' },
    ])
  })

  it('never duplicates a repository, however many payloads name it', () => {
    let merged = mergeRepoSetup(OPENED_WITH, buildRepoSetup(REPOS, [
      invalid('poppins-pex', 'not-git', '/Users/me/Downloads'),
    ]))
    merged = mergeRepoSetup(merged, buildRepoSetup(REPOS, [
      invalid('design-system', 'no-local-path'),
      invalid('magic-slash', 'missing', '/gone/magic-slash'),
      invalid('poppins-pex', 'not-git', '/Users/me/Downloads'),
    ]))
    expect(merged.rows.map((r) => r.name)).toEqual(['design-system', 'magic-slash', 'poppins-pex'])
  })

  it('pins the mode so the modal never swaps its body out mid-action', () => {
    // Adding the first repository makes the config non-empty, which flips the
    // computed mode to 'fix'.
    const opened = buildRepoSetup({}, [])
    const merged = mergeRepoSetup(opened, buildRepoSetup(REPOS, [invalid('design-system', 'no-local-path')]))
    expect(merged.mode).toBe('empty')
    expect(merged.rows.map((r) => r.name)).toEqual(['design-system'])
  })

  it('returns the displayed setup untouched when a poll reports the status quo', () => {
    // Identity, not just equality: a 20s poll that says nothing new must not
    // re-render the open modal.
    const same = buildRepoSetup(REPOS, [
      invalid('design-system', 'no-local-path'),
      invalid('magic-slash', 'missing', '/gone/magic-slash'),
    ])
    expect(mergeRepoSetup(OPENED_WITH, same)).toBe(OPENED_WITH)
    expect(mergeRepoSetup(OPENED_WITH, buildRepoSetup(REPOS, []))).toBe(OPENED_WITH)
  })
})
