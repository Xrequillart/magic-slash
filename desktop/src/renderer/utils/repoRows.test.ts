import { describe, it, expect } from 'vitest'
import type { OrgAgent, RepositoryConfig } from '../../types'
import { buildRepoRows } from './repoRows'

function repo(overrides: Partial<RepositoryConfig> = {}): RepositoryConfig {
  return { path: '', keywords: [], ...overrides }
}

function agent(overrides: Partial<OrgAgent> = {}): OrgAgent {
  return { id: 'a1', ownerId: 'u1', orgId: null, name: 'Claude 1', repositories: [], ...overrides }
}

const ORG = 'org-1'
const OTHER = 'org-2'

const REPOS: Record<string, RepositoryConfig> = {
  'magic-slash': repo({ id: 'r1', path: '/Users/me/Documents/magic-slash', orgId: ORG }),
  'poppins-pex': repo({ id: 'r2', path: '/Users/me/Documents/poppins-pex', orgId: ORG }),
  'other-org-api': repo({ id: 'r4', path: '/Users/me/Documents/other-org-api', orgId: OTHER }),
  'my-side-project': repo({ id: 'r3', path: '/Users/me/Documents/my-side-project' }),
}

describe('buildRepoRows', () => {
  it('lists only the repositories of the scope it was asked for', () => {
    expect(buildRepoRows([], REPOS, ORG).rows.map((r) => r.name)).toEqual(['magic-slash', 'poppins-pex'])
    expect(buildRepoRows([], REPOS, OTHER).rows.map((r) => r.name)).toEqual(['other-org-api'])
    expect(buildRepoRows([], REPOS, null).rows.map((r) => r.name)).toEqual(['my-side-project'])
  })

  it('keeps a repo with no agent, and reports it as empty', () => {
    const { rows } = buildRepoRows(
      [agent({ orgId: ORG, repositories: ['/home/other/magic-slash'] })],
      REPOS,
      ORG,
    )
    expect(rows.find((r) => r.name === 'poppins-pex')?.agents).toEqual([])
  })

  it("attaches a teammate's agent by folder name, not by local prefix", () => {
    const { rows, unmatched } = buildRepoRows(
      [agent({ id: 'a1', orgId: ORG, repositories: ['/home/b-drey/code/poppins-pex'] })],
      REPOS,
      ORG,
    )
    expect(rows.find((r) => r.name === 'poppins-pex')?.agents.map((a) => a.id)).toEqual(['a1'])
    expect(unmatched).toBe(0)
  })

  it('attaches a worktree to its repository', () => {
    const { rows } = buildRepoRows(
      [agent({ id: 'a1', orgId: ORG, repositories: ['/home/b-drey/code/poppins-pex-PER-5030'] })],
      REPOS,
      ORG,
    )
    expect(rows.find((r) => r.name === 'poppins-pex')?.agents.map((a) => a.id)).toEqual(['a1'])
  })

  it('never shows an agent under an organization that is not its own', () => {
    // The agent's org is derived by the backend; the tab must honour it even if
    // a path happens to look like one of this org's repos.
    const { rows, unmatched } = buildRepoRows(
      [agent({ orgId: OTHER, repositories: ['/home/other/magic-slash'] })],
      REPOS,
      ORG,
    )
    expect(rows.every((r) => r.agents.length === 0)).toBe(true)
    expect(unmatched).toBe(0)
  })

  it('counts only PR-linked statuses, excluding merged and pre-PR work', () => {
    const on = (id: string, status: string) =>
      agent({ id, status, orgId: ORG, repositories: ['/home/other/magic-slash'] })
    const { rows } = buildRepoRows(
      [
        on('a1', 'PR created'),
        on('a2', 'in review'),
        on('a3', 'changes requested'),
        on('a4', 'Review addressed'),
        on('a5', 'PR merged'),
        on('a6', 'in progress'),
        on('a7', 'ready for PR'),
        agent({ id: 'a8', orgId: ORG, repositories: ['/home/other/magic-slash'] }),
      ],
      REPOS,
      ORG,
    )
    const row = rows.find((r) => r.name === 'magic-slash')
    expect(row?.agents).toHaveLength(8)
    expect(row?.prCount).toBe(4)
  })

  it('counts an agent attached to two repos in both rows', () => {
    const { rows, unmatched } = buildRepoRows(
      [agent({ orgId: ORG, repositories: ['/home/other/magic-slash', '/home/other/poppins-pex'] })],
      REPOS,
      ORG,
    )
    expect(rows.every((r) => r.agents.length === 1)).toBe(true)
    expect(unmatched).toBe(0)
  })

  it('counts agents of this scope matching no repo as unmatched', () => {
    const { rows, unmatched } = buildRepoRows(
      [
        agent({ id: 'a1', orgId: ORG, repositories: ['/home/other/deleted-worktree'] }),
        agent({ id: 'a2', orgId: ORG, repositories: [] }),
      ],
      REPOS,
      ORG,
    )
    expect(unmatched).toBe(2)
    expect(rows.every((r) => r.agents.length === 0)).toBe(true)
  })

  it('sorts the busiest repository first, then alphabetically', () => {
    const { rows } = buildRepoRows(
      [
        agent({ id: 'a1', orgId: ORG, repositories: ['/home/other/poppins-pex'] }),
        agent({ id: 'a2', orgId: ORG, repositories: ['/home/other/poppins-pex'] }),
        agent({ id: 'a3', orgId: ORG, repositories: ['/home/other/magic-slash'] }),
      ],
      REPOS,
      ORG,
    )
    expect(rows.map((r) => r.name)).toEqual(['poppins-pex', 'magic-slash'])
  })

  it('prefers the repository link over any path matching', () => {
    // Paths say poppins-pex, the link says magic-slash. The link wins: it is
    // what the backend derived the agent's organization from.
    const { rows } = buildRepoRows(
      [agent({ orgId: ORG, repositories: ['/home/other/poppins-pex'], repositoryIds: ['r1'] })],
      REPOS,
      ORG,
    )
    expect(rows.find((r) => r.name === 'magic-slash')?.agents).toHaveLength(1)
    expect(rows.find((r) => r.name === 'poppins-pex')?.agents).toEqual([])
  })

  it('still matches by path for an agent that predates the link', () => {
    const { rows, unmatched } = buildRepoRows(
      [agent({ orgId: ORG, repositories: ['/home/other/poppins-pex'] })],
      REPOS,
      ORG,
    )
    expect(rows.find((r) => r.name === 'poppins-pex')?.agents).toHaveLength(1)
    expect(unmatched).toBe(0)
  })

  it('puts an agent with no organization under the personal scope', () => {
    const { rows } = buildRepoRows(
      [agent({ orgId: null, repositories: ['/home/me/my-side-project'] })],
      REPOS,
      null,
    )
    expect(rows.find((r) => r.name === 'my-side-project')?.agents).toHaveLength(1)
  })

  it('never credits an agent to a team repo the user has not cloned locally', () => {
    const repos = { 'design-system': repo({ id: 'r9', path: '', orgId: ORG }) }
    const { rows, unmatched } = buildRepoRows(
      [agent({ orgId: ORG, repositories: ['/home/other/whatever'] })],
      repos,
      ORG,
    )
    expect(rows[0].agents).toEqual([])
    expect(unmatched).toBe(1)
  })

  it('still matches an unbound team repo by its name', () => {
    const repos = { 'design-system': repo({ id: 'r9', path: '', orgId: ORG }) }
    const { rows } = buildRepoRows(
      [agent({ orgId: ORG, repositories: ['/home/other/design-system'] })],
      repos,
      ORG,
    )
    expect(rows[0].agents).toHaveLength(1)
  })
})
