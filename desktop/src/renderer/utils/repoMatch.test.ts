import { describe, it, expect } from 'vitest'
import { repoBasename, pathBelongsToRepo } from './repoMatch'

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
