import { describe, it, expect } from 'vitest'
import { buildTeamRows, pathBelongsToRepo, repoBasename, type TeamAgent, type TeamRepo } from './teamRows'

function agent(overrides: Partial<TeamAgent> = {}): TeamAgent {
  return { id: 'a1', orgId: 'org-1', ownerId: 'u1', label: 'Agent', repositories: [], ...overrides }
}

const REPOS: TeamRepo[] = [
  { id: 'r1', orgId: 'org-1', name: 'magic-slash', color: null },
  { id: 'r2', orgId: 'org-1', name: 'poppins-pex', color: '#06B6D4' },
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
