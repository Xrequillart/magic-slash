import { describe, it, expect } from 'vitest'
import { buildTeamRows, pathBelongsToRepo, repoBasename, type TeamAgent, type TeamRepo } from './teamRows'

function agent(overrides: Partial<TeamAgent> = {}): TeamAgent {
  return {
    id: 'a1',
    orgId: 'org-1',
    ownerId: 'u1',
    label: 'Agent',
    repositories: [],
    repositoryIds: [],
    ...overrides,
  }
}

const REPOS: TeamRepo[] = [
  { id: 'r1', orgId: 'org-1', name: 'magic-slash', color: null },
  { id: 'r2', orgId: 'org-1', name: 'poppins-pex', color: '#06B6D4' },
]

const SCOPED: TeamRepo[] = [
  ...REPOS,
  { id: 'r3', orgId: 'org-2', name: 'other-api', color: null },
  { id: 'r4', orgId: null, name: 'side-project', color: null },
]

describe('repoBasename', () => {
  it('returns the last segment, ignoring trailing slashes', () => {
    expect(repoBasename('/Users/me/Documents/magic-slash/')).toBe('magic-slash')
    expect(repoBasename('C:\\Users\\me\\magic-slash')).toBe('magic-slash')
  })
})

describe('pathBelongsToRepo', () => {
  it("matches a teammate's path by folder name, not by prefix", () => {
    expect(pathBelongsToRepo('/home/b-drey/code/poppins-pex', 'poppins-pex')).toBe(true)
  })

  it('matches a worktree suffixed with a ticket id or an issue number', () => {
    expect(pathBelongsToRepo('/home/b-drey/poppins-pex-PER-5030', 'poppins-pex')).toBe(true)
    expect(pathBelongsToRepo('/home/b-drey/poppins-pex-456', 'poppins-pex')).toBe(true)
  })

  it('does not swallow a different repo that shares a prefix', () => {
    expect(pathBelongsToRepo('/home/b-drey/magic-slash-ui', 'magic')).toBe(false)
    expect(pathBelongsToRepo('/home/b-drey/magicslash', 'magic-slash')).toBe(false)
  })

  it('falls back to the local folder name when it differs from the repo name', () => {
    expect(pathBelongsToRepo('/home/b-drey/poppins-pex', 'Poppins PEX', 'poppins-pex')).toBe(true)
  })
})

describe('buildTeamRows', () => {
  it('counts only PR-linked statuses, excluding merged and pre-PR work', () => {
    const on = (id: string, status: string) => agent({ id, status, repositories: ['/home/other/magic-slash'] })
    const { rows } = buildTeamRows(
      [
        on('a1', 'PR created'),
        on('a2', 'in review'),
        on('a3', 'changes requested'),
        on('a4', 'Review addressed'),
        on('a5', 'PR merged'),
        on('a6', 'in progress'),
        agent({ id: 'a7', repositories: ['/home/other/magic-slash'] }),
      ],
      REPOS,
    )
    const row = rows.find((r) => r.name === 'magic-slash')
    expect(row?.agents).toHaveLength(7)
    expect(row?.prCount).toBe(4)
  })

  it('counts an agent attached to two repos in both rows', () => {
    const { rows, unmatched } = buildTeamRows(
      [agent({ repositories: ['/home/other/magic-slash', '/home/other/poppins-pex'] })],
      REPOS,
    )
    expect(rows.every((r) => r.agents.length === 1)).toBe(true)
    expect(unmatched).toBe(0)
  })

  it('counts agents on unknown repos apart instead of dropping them', () => {
    const { unmatched } = buildTeamRows(
      [agent({ id: 'a1', repositories: ['/home/other/side-project'] }), agent({ id: 'a2', repositories: [] })],
      REPOS,
    )
    expect(unmatched).toBe(2)
  })

  it('keeps an empty repo visible, sorted after the busy ones', () => {
    const { rows } = buildTeamRows([agent({ repositories: ['/home/other/poppins-pex'] })], REPOS)
    expect(rows.map((r) => r.name)).toEqual(['poppins-pex', 'magic-slash'])
    expect(rows[1].agents).toEqual([])
  })

  it('falls back to the palette when a repo has no configured color', () => {
    const { rows } = buildTeamRows([], REPOS)
    expect(rows.find((r) => r.name === 'poppins-pex')?.color).toBe('#06B6D4')
    expect(rows.find((r) => r.name === 'magic-slash')?.color).toMatch(/^#[0-9A-F]{6}$/i)
  })

  it('prefers the repository link over any path matching', () => {
    // The paths point at poppins-pex, the link says magic-slash. The link wins:
    // it is what the backend derived the agent's organization from.
    const { rows } = buildTeamRows(
      [agent({ repositories: ['/home/other/poppins-pex'], repositoryIds: ['r1'] })],
      REPOS,
    )
    expect(rows.find((r) => r.name === 'magic-slash')?.agents).toHaveLength(1)
    expect(rows.find((r) => r.name === 'poppins-pex')?.agents).toEqual([])
  })

  it('still matches by path for an agent that predates the link', () => {
    const { rows, unmatched } = buildTeamRows(
      [agent({ repositories: ['/home/other/poppins-pex'], repositoryIds: [] })],
      REPOS,
    )
    expect(rows.find((r) => r.name === 'poppins-pex')?.agents).toHaveLength(1)
    expect(unmatched).toBe(0)
  })

  it('shows only the scope it was asked for', () => {
    const agents = [
      agent({ id: 'a1', orgId: 'org-1', repositories: ['/x/magic-slash'] }),
      agent({ id: 'a2', orgId: 'org-2', repositories: ['/x/other-api'] }),
      agent({ id: 'a3', orgId: null, repositories: ['/x/side-project'] }),
    ]

    expect(buildTeamRows(agents, SCOPED, {}, 'org-2').rows.map((r) => r.name)).toEqual(['other-api'])
    expect(buildTeamRows(agents, SCOPED, {}, null).rows.map((r) => r.name)).toEqual(['side-project'])
    // Undefined keeps everything — the single-org case, where there are no tabs.
    expect(buildTeamRows(agents, SCOPED, {}).rows).toHaveLength(4)
  })

  it('never shows an agent under an organization that is not its own', () => {
    const { rows, unmatched } = buildTeamRows(
      [agent({ orgId: 'org-2', repositories: ['/x/magic-slash'] })],
      SCOPED,
      {},
      'org-1',
    )
    expect(rows.every((r) => r.agents.length === 0)).toBe(true)
    expect(unmatched).toBe(0)
  })

  it('uses the caller-bound local folder as a second name to match on', () => {
    const repos: TeamRepo[] = [{ id: 'r9', orgId: 'org-1', name: 'Design System', color: null }]
    const { rows } = buildTeamRows(
      [agent({ repositories: ['/home/other/design-system'] })],
      repos,
      { r9: 'design-system' },
    )
    expect(rows[0].agents).toHaveLength(1)
  })
})
