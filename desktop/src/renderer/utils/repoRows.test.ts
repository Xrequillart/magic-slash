import { describe, it, expect } from 'vitest'
import type { OrgAgent, RepositoryConfig } from '../../types'
import { buildRepoRows } from './repoRows'

function repo(overrides: Partial<RepositoryConfig> = {}): RepositoryConfig {
  return { path: '', keywords: [], ...overrides }
}

function agent(overrides: Partial<OrgAgent> = {}): OrgAgent {
  return { id: 'a1', ownerId: 'u1', name: 'Claude 1', repositories: [], ...overrides }
}

const REPOS: Record<string, RepositoryConfig> = {
  'magic-slash': repo({ path: '/Users/me/Documents/magic-slash', orgId: 'org-1' }),
  'poppins-pex': repo({ path: '/Users/me/Documents/poppins-pex', orgId: 'org-1' }),
  'my-side-project': repo({ path: '/Users/me/Documents/my-side-project' }),
}

describe('buildRepoRows', () => {
  it('lists only repositories shared with the organization', () => {
    const { rows } = buildRepoRows([], REPOS)
    expect(rows.map((r) => r.name)).toEqual(['magic-slash', 'poppins-pex'])
  })

  it('keeps a team repo with no agent, and reports it as empty', () => {
    const { rows } = buildRepoRows([agent({ repositories: ['/home/other/magic-slash'] })], REPOS)
    expect(rows.find((r) => r.name === 'poppins-pex')?.agents).toEqual([])
  })

  it("attaches a teammate's agent by folder name, not by local prefix", () => {
    const { rows, unmatched } = buildRepoRows(
      [agent({ id: 'a1', repositories: ['/home/b-drey/code/poppins-pex'] })],
      REPOS,
    )
    expect(rows.find((r) => r.name === 'poppins-pex')?.agents.map((a) => a.id)).toEqual(['a1'])
    expect(unmatched).toBe(0)
  })

  it('attaches a worktree to its repository', () => {
    const { rows } = buildRepoRows(
      [agent({ id: 'a1', repositories: ['/home/b-drey/code/poppins-pex-PER-5030'] })],
      REPOS,
    )
    expect(rows.find((r) => r.name === 'poppins-pex')?.agents.map((a) => a.id)).toEqual(['a1'])
  })

  it('counts only PR-linked statuses, excluding merged and pre-PR work', () => {
    const on = (id: string, status: string) =>
      agent({ id, status, repositories: ['/home/other/magic-slash'] })
    const { rows } = buildRepoRows(
      [
        on('a1', 'PR created'),
        on('a2', 'in review'),
        on('a3', 'changes requested'),
        on('a4', 'Review addressed'),
        on('a5', 'PR merged'),
        on('a6', 'in progress'),
        on('a7', 'ready for PR'),
        agent({ id: 'a8', repositories: ['/home/other/magic-slash'] }),
      ],
      REPOS,
    )
    const row = rows.find((r) => r.name === 'magic-slash')
    expect(row?.agents).toHaveLength(8)
    expect(row?.prCount).toBe(4)
  })

  it('counts an agent attached to two repos in both rows', () => {
    const { rows, unmatched } = buildRepoRows(
      [agent({ repositories: ['/home/other/magic-slash', '/home/other/poppins-pex'] })],
      REPOS,
    )
    expect(rows.every((r) => r.agents.length === 1)).toBe(true)
    expect(unmatched).toBe(0)
  })

  it('counts agents on personal or unknown repos as unmatched', () => {
    const { rows, unmatched } = buildRepoRows(
      [
        agent({ id: 'a1', repositories: ['/Users/me/Documents/my-side-project'] }),
        agent({ id: 'a2', repositories: ['/home/other/some-other-repo'] }),
        agent({ id: 'a3', repositories: [] }),
      ],
      REPOS,
    )
    expect(unmatched).toBe(3)
    expect(rows.every((r) => r.agents.length === 0)).toBe(true)
  })

  it('sorts the busiest repository first, then alphabetically', () => {
    const { rows } = buildRepoRows(
      [
        agent({ id: 'a1', repositories: ['/home/other/poppins-pex'] }),
        agent({ id: 'a2', repositories: ['/home/other/poppins-pex'] }),
        agent({ id: 'a3', repositories: ['/home/other/magic-slash'] }),
      ],
      REPOS,
    )
    expect(rows.map((r) => r.name)).toEqual(['poppins-pex', 'magic-slash'])
  })

  it('never credits an agent to a team repo the user has not cloned locally', () => {
    const repos = { 'design-system': repo({ path: '', orgId: 'org-1' }) }
    const { rows, unmatched } = buildRepoRows([agent({ repositories: ['/home/other/whatever'] })], repos)
    expect(rows[0].agents).toEqual([])
    expect(unmatched).toBe(1)
  })

  it('still matches an unbound team repo by its name', () => {
    const repos = { 'design-system': repo({ path: '', orgId: 'org-1' }) }
    const { rows } = buildRepoRows([agent({ repositories: ['/home/other/design-system'] })], repos)
    expect(rows[0].agents).toHaveLength(1)
  })
})
