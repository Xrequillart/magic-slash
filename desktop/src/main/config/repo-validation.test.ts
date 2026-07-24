/* eslint-disable @typescript-eslint/no-explicit-any -- test fixtures cast partial configs to any */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// repo-validation reads the config cache and probes the filesystem via
// isGitRepository; mock both so we exercise only the classification logic.
vi.mock('./config', () => ({ readConfig: vi.fn() }))
vi.mock('./validation', () => ({ isGitRepository: vi.fn() }))

import { validateAllRepoPaths } from './repo-validation'
import { readConfig } from './config'
import { isGitRepository } from './validation'

const readConfigMock = vi.mocked(readConfig)
const isGitRepositoryMock = vi.mocked(isGitRepository)

beforeEach(() => {
  readConfigMock.mockReset()
  isGitRepositoryMock.mockReset()
})

describe('validateAllRepoPaths', () => {
  it('flags a team repo with no local folder as no-local-path (not a broken path)', () => {
    readConfigMock.mockReturnValue({ repositories: {
      team: { id: 'r1', orgId: 'org-1', path: '', needsLocalPath: true, keywords: [] },
    } } as any)

    const invalid = validateAllRepoPaths()
    expect(invalid).toEqual([{ name: 'team', path: '', reason: 'no-local-path' }])
    // The filesystem is never probed for an unbound repo.
    expect(isGitRepositoryMock).not.toHaveBeenCalled()
  })

  it('treats an empty path as no-local-path even without the needsLocalPath flag', () => {
    readConfigMock.mockReturnValue({ repositories: { p: { id: 'r', orgId: null, path: '', keywords: [] } } } as any)
    expect(validateAllRepoPaths()).toEqual([{ name: 'p', path: '', reason: 'no-local-path' }])
  })

  it('still reports genuinely broken bound paths (missing / not-git)', () => {
    readConfigMock.mockReturnValue({ repositories: {
      gone: { id: 'a', path: '/gone', keywords: [] },
      plain: { id: 'b', path: '/plain', keywords: [] },
      ok: { id: 'c', path: '/ok', keywords: [] },
    } } as any)
    isGitRepositoryMock.mockImplementation((p: string) => {
      if (p === '/gone') return { exists: false, isGit: false }
      if (p === '/plain') return { exists: true, isGit: false }
      return { exists: true, isGit: true }
    })

    const invalid = validateAllRepoPaths()
    expect(invalid).toEqual([
      { name: 'gone', path: '/gone', reason: 'missing' },
      { name: 'plain', path: '/plain', reason: 'not-git' },
    ])
  })
})
