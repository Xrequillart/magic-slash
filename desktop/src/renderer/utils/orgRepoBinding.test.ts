import { describe, it, expect } from 'vitest'
import type { RepositoryConfig } from '../../types'
import {
  detectFolderNameMismatch,
  isKeyTaken,
  listBindableOrgRepos,
  type OrgRepoRow,
} from './orgRepoBinding'

function repo(overrides: Partial<RepositoryConfig> = {}): RepositoryConfig {
  return { path: '/Users/me/dev/repo', keywords: [], ...overrides }
}

// An invitee's config right after accepting: the org's repositories arrive
// unbound, and the key of the second `api` carries an org suffix.
const REPOS: Record<string, RepositoryConfig> = {
  'web': repo({ orgId: 'org-1', name: 'web', path: '', needsLocalPath: true, remoteUrl: 'https://github.com/acme/web' }),
  'api (Acme)': repo({ orgId: 'org-1', name: 'api', path: '', needsLocalPath: true }),
  'infra': repo({ orgId: 'org-1', name: 'infra', path: '/Users/me/dev/infra', remoteUrl: 'https://github.com/acme/infra' }),
  'notes': repo({ orgId: null }),
  'scratch': repo(),
  'other-org': repo({ orgId: 'org-2', name: 'billing' }),
}

describe('listBindableOrgRepos', () => {
  it('lists only the repositories of that org', () => {
    const rows = listBindableOrgRepos(REPOS, 'org-1')
    expect(rows.map((r) => r.key)).toEqual(['api (Acme)', 'infra', 'web'])
  })

  it('excludes personal repositories, whether orgId is null or absent', () => {
    const rows = listBindableOrgRepos(REPOS, 'org-1')
    expect(rows.some((r) => r.key === 'notes' || r.key === 'scratch')).toBe(false)
    // …and they are exactly what the personal scope returns — the scope the
    // wizard reuses to list the repositories added from its escape hatch.
    expect(listBindableOrgRepos(REPOS, null).map((r) => r.key)).toEqual(['notes', 'scratch'])
  })

  it('shows the org name, not the key, when the two differ', () => {
    const row = listBindableOrgRepos(REPOS, 'org-1').find((r) => r.key === 'api (Acme)')
    // The key is what a config write takes; the name is what the invitee reads.
    expect(row).toEqual({ key: 'api (Acme)', displayName: 'api', path: '', remoteUrl: '' })
  })

  // The address is what turns "go find your clone" into one Clone button, so it
  // has to reach the row — the wizard has no other source for it.
  it('surfaces the repository’s clone address', () => {
    const rows = listBindableOrgRepos(REPOS, 'org-1')
    expect(rows.find((r) => r.key === 'web')?.remoteUrl).toBe('https://github.com/acme/web')
  })

  it('still lists a repository that has no clone address — it is bindable by hand', () => {
    // A repo created before the capture, or one whose origin is not on GitHub.
    // The folder picker is the only route for it, never an absence from the list.
    const rows = listBindableOrgRepos(REPOS, 'org-1')
    const api = rows.find((r) => r.key === 'api (Acme)')
    expect(api).toBeDefined()
    expect(api?.remoteUrl).toBe('')
  })

  it('falls back to the key when the repository has no cloud name', () => {
    const rows = listBindableOrgRepos({ solo: repo({ orgId: 'org-1' }) }, 'org-1')
    expect(rows[0].displayName).toBe('solo')
  })

  it('separates bound from unbound rows — an empty path is "no folder yet"', () => {
    const rows = listBindableOrgRepos(REPOS, 'org-1')
    expect(rows.find((r) => r.key === 'infra')?.path).toBe('/Users/me/dev/infra')
    expect(rows.find((r) => r.key === 'web')?.path).toBe('')
  })

  it('sorts by display name, so a suffixed key does not jump the list', () => {
    const rows = listBindableOrgRepos(REPOS, 'org-1')
    expect(rows.map((r) => r.displayName)).toEqual(['api', 'infra', 'web'])
  })
})

describe('detectFolderNameMismatch', () => {
  const rows = listBindableOrgRepos(REPOS, 'org-1')

  it('says nothing when the folder is named like the repository', () => {
    expect(detectFolderNameMismatch('/Users/me/dev/api', 'api (Acme)', rows)).toEqual({ kind: 'none' })
  })

  it('ignores case and punctuation, exactly like the add path does', () => {
    expect(detectFolderNameMismatch('/Users/me/dev/API', 'api (Acme)', rows)).toEqual({ kind: 'none' })
  })

  it('warns when the folder name differs — without blocking the binding', () => {
    // The case from the ticket: org repo `api`, local clone `api-service`.
    expect(detectFolderNameMismatch('/Users/me/dev/api-service', 'api (Acme)', rows))
      .toEqual({ kind: 'mismatch' })
  })

  it('names the other repository when the folder matches one of them', () => {
    expect(detectFolderNameMismatch('/Users/me/dev/web', 'api (Acme)', rows))
      .toEqual({ kind: 'belongs-to-other', otherRepoName: 'web' })
  })

  it('handles Windows separators', () => {
    expect(detectFolderNameMismatch('C:\\dev\\web', 'api (Acme)', rows))
      .toEqual({ kind: 'belongs-to-other', otherRepoName: 'web' })
  })

  it('still compares when the path carries a trailing separator', () => {
    // repoBasename strips it; a naive split would yield '' and skip the check.
    expect(detectFolderNameMismatch('/Users/me/dev/web/', 'api (Acme)', rows))
      .toEqual({ kind: 'belongs-to-other', otherRepoName: 'web' })
    expect(detectFolderNameMismatch('/Users/me/dev/api/', 'api (Acme)', rows))
      .toEqual({ kind: 'none' })
  })

  it('stays silent when the target row is unknown or the folder unnameable', () => {
    expect(detectFolderNameMismatch('/Users/me/dev/api-service', 'ghost', rows)).toEqual({ kind: 'none' })
    expect(detectFolderNameMismatch('', 'api (Acme)', rows)).toEqual({ kind: 'none' })
  })
})

describe('isKeyTaken', () => {
  const rows: OrgRepoRow[] = listBindableOrgRepos(REPOS, 'org-1')

  it('rejects a slug that already keys a repository, org or personal', () => {
    expect(isKeyTaken(REPOS, rows, 'web')).toBe(true)
    expect(isKeyTaken(REPOS, rows, 'notes')).toBe(true)
  })

  it('rejects a slug matching an org repository whose key is suffixed', () => {
    // `api` keys nothing, but adding it would duplicate the org's `api (Acme)`.
    expect(isKeyTaken(REPOS, rows, 'api')).toBe(true)
  })

  it('accepts a repository the org does not have', () => {
    expect(isKeyTaken(REPOS, rows, 'sandbox')).toBe(false)
  })
})
