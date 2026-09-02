import { describe, it, expect } from 'vitest'
import type { RepositoryConfig } from './types'
import { repoBasename, pathBelongsToRepo, resolveRepoIds, isWorktreePathOf, withoutShadowedCheckouts } from './repoMatch'

describe('repoBasename', () => {
  it('returns the last segment', () => {
    expect(repoBasename('/Users/me/Documents/magic-slash')).toBe('magic-slash')
  })

  it('ignores trailing slashes', () => {
    expect(repoBasename('/Users/me/Documents/magic-slash/')).toBe('magic-slash')
  })

  it('handles windows separators', () => {
    expect(repoBasename('C:\\Users\\me\\magic-slash')).toBe('magic-slash')
  })

  it('returns the input when there is no separator', () => {
    expect(repoBasename('magic-slash')).toBe('magic-slash')
  })
})

describe('pathBelongsToRepo', () => {
  it('matches the repo folder itself', () => {
    expect(pathBelongsToRepo('/Users/me/Documents/magic-slash', 'magic-slash')).toBe(true)
  })

  it('matches a teammate path whose prefix differs from ours', () => {
    expect(
      pathBelongsToRepo('/home/other/code/magic-slash', 'magic-slash', '/Users/me/Documents/magic-slash'),
    ).toBe(true)
  })

  it('matches a worktree suffixed with the ticket id', () => {
    expect(pathBelongsToRepo('/Users/me/Documents/magic-slash-PER-5030', 'magic-slash')).toBe(true)
  })

  it('matches a worktree suffixed with a bare issue number', () => {
    expect(pathBelongsToRepo('/Users/me/Documents/magic-slash-456', 'magic-slash')).toBe(true)
  })

  it('matches on the local folder name when it differs from the config name', () => {
    expect(pathBelongsToRepo('/home/other/poppins-pex', 'Poppins PEX', '/Users/me/Documents/poppins-pex')).toBe(true)
  })

  it('does not match a different repo that merely shares a prefix', () => {
    expect(pathBelongsToRepo('/Users/me/Documents/magicslash', 'magic-slash')).toBe(false)
    expect(pathBelongsToRepo('/Users/me/Documents/magic-slash-ui', 'magic')).toBe(false)
  })

  it('ignores an empty local path instead of matching everything', () => {
    expect(pathBelongsToRepo('/home/other/some-repo', 'design-system', '')).toBe(false)
  })

  it('returns false for an empty agent path', () => {
    expect(pathBelongsToRepo('', 'magic-slash')).toBe(false)
  })
})

describe('resolveRepoIds', () => {
  const repo = (over: Partial<RepositoryConfig> = {}): RepositoryConfig => ({
    path: '',
    keywords: [],
    ...over,
  })

  const REPOS: Record<string, RepositoryConfig> = {
    'magic-slash': repo({ id: 'r1', path: '~/Documents/magic-slash' }),
    'poppins-pex': repo({ id: 'r2', path: '~/Documents/poppins-pex' }),
  }

  const expand = (p: string) => p.replace(/^~/, '/Users/me')

  it('resolves a repo folder to its id', () => {
    expect(resolveRepoIds(['/Users/me/Documents/magic-slash'], REPOS, expand)).toEqual(['r1'])
  })

  it('resolves a worktree to the repo it was cut from', () => {
    expect(resolveRepoIds(['/Users/me/Documents/magic-slash-PER-5030'], REPOS, expand)).toEqual(['r1'])
  })

  it('expands ~ on the configured side before comparing', () => {
    // Without `expand`, '~/Documents/magic-slash' has basename 'magic-slash'
    // too, so this also proves the match is not accidentally prefix-based.
    expect(resolveRepoIds(['~/Documents/magic-slash'], REPOS, expand)).toEqual(['r1'])
  })

  it('keeps the order of the paths — the first one decides the org', () => {
    const paths = ['/Users/me/Documents/poppins-pex', '/Users/me/Documents/magic-slash']
    expect(resolveRepoIds(paths, REPOS, expand)).toEqual(['r2', 'r1'])
  })

  it('deduplicates a repo reachable through two paths', () => {
    const paths = ['/Users/me/Documents/magic-slash', '/Users/me/Documents/magic-slash-PER-1']
    expect(resolveRepoIds(paths, REPOS, expand)).toEqual(['r1'])
  })

  it('skips paths that match no configured repo', () => {
    expect(resolveRepoIds(['/Users/me/Documents/unknown'], REPOS, expand)).toEqual([])
  })

  it('skips a repo that has no cloud id yet', () => {
    const repos = { 'design-system': repo({ path: '~/Documents/design-system' }) }
    expect(resolveRepoIds(['/Users/me/Documents/design-system'], repos, expand)).toEqual([])
  })

  it('matches an unbound team repo by name alone', () => {
    const repos = { 'design-system': repo({ id: 'r9', path: '' }) }
    expect(resolveRepoIds(['/home/other/design-system'], repos, expand)).toEqual(['r9'])
  })
})

describe('withoutShadowedCheckouts', () => {
  it('drops the main checkout when one of its worktrees is attached too', () => {
    expect(withoutShadowedCheckouts([
      '/Users/me/Documents/poppins-pex',
      '/Users/me/Documents/poppins-pex-PER-5138',
    ])).toEqual(['/Users/me/Documents/poppins-pex-PER-5138'])
  })

  it('keeps every worktree of the same repository', () => {
    const paths = [
      '/Users/me/Documents/poppins-pex',
      '/Users/me/Documents/poppins-pex-PER-5138',
      '/Users/me/Documents/poppins-pex-PER-5071',
    ]
    expect(withoutShadowedCheckouts(paths)).toEqual([
      '/Users/me/Documents/poppins-pex-PER-5138',
      '/Users/me/Documents/poppins-pex-PER-5071',
    ])
  })

  it('leaves a repository attached on its own alone', () => {
    expect(withoutShadowedCheckouts(['/Users/me/Documents/poppins-pex']))
      .toEqual(['/Users/me/Documents/poppins-pex'])
  })

  it('never lets one repository shadow another', () => {
    // `magic-slash` is not a worktree of `magic`: the suffix has to be a ticket id.
    const paths = ['/Users/me/Documents/magic', '/Users/me/Documents/magic-slash']
    expect(withoutShadowedCheckouts(paths)).toEqual(paths)
  })

  it('keeps two unrelated repositories', () => {
    const paths = ['/Users/me/Documents/api', '/Users/me/Documents/web-42']
    expect(withoutShadowedCheckouts(paths)).toEqual(paths)
  })
})

describe('isWorktreePathOf', () => {
  it('accepts a Jira key and a bare issue number as the suffix', () => {
    expect(isWorktreePathOf('/r/api-PER-5138', '/r/api')).toBe(true)
    expect(isWorktreePathOf('/r/api-456', '/r/api')).toBe(true)
  })

  it('rejects a repository that merely starts with the same name', () => {
    expect(isWorktreePathOf('/r/api-gateway', '/r/api')).toBe(false)
  })

  it('is not satisfied by the checkout itself', () => {
    expect(isWorktreePathOf('/r/api', '/r/api')).toBe(false)
  })
})
