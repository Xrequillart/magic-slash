import { describe, it, expect } from 'vitest'
import type { OrgAgent, RepositoryConfig, TerminalInfo } from '../../types'
import {
  buildAgentedIssues,
  normalizeTicketId,
  taskAgentRefs,
  terminalAgentRefs,
  terminalAgentSignature,
  type TaskAgentRef,
} from './taskAgents'

function repo(overrides: Partial<RepositoryConfig> = {}): RepositoryConfig {
  return { path: '', keywords: [], ...overrides }
}

const REPOS: Record<string, RepositoryConfig> = {
  'magic-slash': repo({ id: 'r1', path: '/Users/x/Documents/magic-slash' }),
  'poppins-pex': repo({ id: 'r2', path: '/Users/x/Documents/poppins-pex' }),
}

const KEYS = Object.keys(REPOS)

function agent(overrides: Partial<TaskAgentRef> = {}): TaskAgentRef {
  return { repositories: [], ...overrides }
}

describe('normalizeTicketId', () => {
  it('reads a bare number and a hash-prefixed one as the same issue', () => {
    // /magic:start writes agents.ticket_id as "234"; the `#` is display only. A
    // hand-typed "#234" is still a real value to find in that column.
    expect(normalizeTicketId('234')).toBe('234')
    expect(normalizeTicketId('#234')).toBe('234')
    expect(normalizeTicketId('  #234  ')).toBe('234')
  })

  it('answers the empty string for an agent that is on no ticket', () => {
    expect(normalizeTicketId(undefined)).toBe('')
    expect(normalizeTicketId('')).toBe('')
    expect(normalizeTicketId('   ')).toBe('')
  })

  it('leaves a Jira key alone', () => {
    expect(normalizeTicketId('PER-5030')).toBe('PER-5030')
  })

  it('folds the two spellings of a Jira key together', () => {
    // Jira itself is case-insensitive about keys — `per-5030` browses to `PER-5030`
    // — so an agent whose ticket id was typed in lower case is on the same sprint
    // ticket, and the marker has to find it.
    expect(normalizeTicketId('per-5030')).toBe('PER-5030')
    expect(normalizeTicketId('Per-5030')).toBe('PER-5030')
    expect(normalizeTicketId(' #per-5030 ')).toBe('PER-5030')
  })

  it('upper-cases nothing that is not a Jira key', () => {
    // The rule is deliberately narrow: this function must invent no equivalence it
    // cannot justify, so a branch name or any other free-text id is left as typed.
    expect(normalizeTicketId('234')).toBe('234')
    expect(normalizeTicketId('feature/some-branch')).toBe('feature/some-branch')
    expect(normalizeTicketId('per-5030-extra')).toBe('per-5030-extra')
  })
})

describe('buildAgentedIssues', () => {
  it('marks the issue an agent is attached to by repository id', () => {
    const index = buildAgentedIssues(KEYS, REPOS, [
      agent({ ticketId: '234', repositoryIds: ['r1'], repositories: ['/somebody/else/magic-slash'] }),
    ])

    expect([...index['magic-slash']]).toEqual(['234'])
    expect([...index['poppins-pex']]).toEqual([])
  })

  it('reads a hash-prefixed ticket id as the same issue as a bare one', () => {
    const index = buildAgentedIssues(KEYS, REPOS, [
      agent({ ticketId: '#234', repositoryIds: ['r1'] }),
    ])

    expect(index['magic-slash'].has('234')).toBe(true)
  })

  it('joins an agent to a sprint ticket whatever case its key was written in', () => {
    // The sprint rows carry Jira's own spelling (`PER-5030`); an agent's ticket id
    // is whatever /magic:start was handed. Both go through `normalizeTicketId`, so
    // the two meet — which is what decides whether an In Progress ticket is shown
    // at all.
    const index = buildAgentedIssues(KEYS, REPOS, [
      agent({ ticketId: 'per-5030', repositoryIds: ['r1'] }),
    ])

    expect(index['magic-slash'].has('PER-5030')).toBe(true)
  })

  it('ignores an agent that is on the repository but on no issue', () => {
    // An agent with no ticket is working somewhere, not on something.
    const index = buildAgentedIssues(KEYS, REPOS, [agent({ repositoryIds: ['r1'] })])

    expect([...index['magic-slash']]).toEqual([])
  })

  // The collision this whole cross-reference exists to avoid: issue numbers are
  // per repository, so "12" alone would light up a row in every repository that
  // happens to have one.
  it('keeps issue 12 of one repository out of the other', () => {
    const index = buildAgentedIssues(KEYS, REPOS, [
      agent({ ticketId: '12', repositoryIds: ['r2'] }),
    ])

    expect(index['poppins-pex'].has('12')).toBe(true)
    expect(index['magic-slash'].has('12')).toBe(false)
  })

  it('credits a worktree to the repository it was cut from', () => {
    // /magic:start replaces the agent's repositories with `../<repo>-<ticket>`, so
    // the ONLY path a running agent carries is the worktree. A basename compare
    // would never match it back to its repo.
    const index = buildAgentedIssues(KEYS, REPOS, [
      agent({ ticketId: '234', repositories: ['/Users/x/Documents/magic-slash-234'] }),
    ])

    expect(index['magic-slash'].has('234')).toBe(true)
    expect(index['poppins-pex'].has('234')).toBe(false)
  })

  it('ignores an agent with neither a repository id nor a matching path', () => {
    const index = buildAgentedIssues(KEYS, REPOS, [
      agent({ ticketId: '234', repositories: ['/Users/x/Documents/some-other-thing'] }),
    ])

    expect([...index['magic-slash']]).toEqual([])
    expect([...index['poppins-pex']]).toEqual([])
  })

  // An agent that HAS ids and none of them is this repo's has answered the
  // question — falling back to its paths would undo the discrimination the ids
  // just made, and put a teammate's `magic-slash-234` worktree on our row.
  it('does not fall back to paths for an agent whose ids point elsewhere', () => {
    const index = buildAgentedIssues(KEYS, REPOS, [
      agent({ ticketId: '234', repositoryIds: ['r2'], repositories: ['/Users/x/Documents/magic-slash-234'] }),
    ])

    expect(index['magic-slash'].has('234')).toBe(false)
    expect(index['poppins-pex'].has('234')).toBe(true)
  })

  // The Tasks page hands each entry to a memoised card, so a fresh empty Set per
  // rebuild would re-render every agent-free repository for nothing — and that is
  // most of the page.
  it('gives every agent-free repository the same set instance, rebuild after rebuild', () => {
    const agents = [agent({ ticketId: '234', repositoryIds: ['r1'] })]

    const first = buildAgentedIssues(KEYS, REPOS, agents)
    const second = buildAgentedIssues(KEYS, REPOS, agents)

    expect(second['poppins-pex']).toBe(first['poppins-pex'])
    expect([...second['poppins-pex']]).toEqual([])
    // The repository that DOES have an agent still gets its own set.
    expect(second['magic-slash']).not.toBe(first['poppins-pex'])
  })

  it('gives every asked-for repository an entry, even with no agents at all', () => {
    // The page indexes by config key and never guards on the key being present.
    const index = buildAgentedIssues(KEYS, REPOS, [])

    expect(Object.keys(index).sort()).toEqual(['magic-slash', 'poppins-pex'])
  })

  it('answers nothing for a repository with no local path and no id', () => {
    // Matching on an empty path would credit every agent to it.
    const index = buildAgentedIssues(['unbound'], { unbound: repo() }, [
      agent({ ticketId: '234', repositories: ['/Users/x/Documents/magic-slash-234'] }),
    ])

    expect([...index['unbound']]).toEqual([])
  })
})

describe('taskAgentRefs', () => {
  it('unions the org roster with the agents running on this machine', () => {
    // Without the local half, a user with no organization would never see the
    // marker: useOrgAgents() returns [] for them.
    const terminals = [
      {
        id: 't1',
        name: 'Claude 1',
        state: 'working',
        repositories: ['/Users/x/Documents/magic-slash-234'],
        metadata: { ticketId: '234' },
      },
    ] as unknown as TerminalInfo[]
    const orgAgents = [
      { id: 'a1', ownerId: null, orgId: null, name: 'Claude 2', ticketId: '12', repositories: [], repositoryIds: ['r2'] },
    ] as OrgAgent[]

    const index = buildAgentedIssues(KEYS, REPOS, taskAgentRefs(orgAgents, terminals))

    expect(index['magic-slash'].has('234')).toBe(true)
    expect(index['poppins-pex'].has('12')).toBe(true)
  })

  it('carries a local terminal’s ticket and paths, and no repository ids', () => {
    const terminals = [
      { id: 't1', name: 'Claude 1', state: 'idle', repositories: ['/a/b'], metadata: { ticketId: '#7' } },
    ] as unknown as TerminalInfo[]

    expect(terminalAgentRefs(terminals)).toEqual([{ ticketId: '#7', repositories: ['/a/b'] }])
  })

  it('leaves out the terminals that are not agents', () => {
    // The store's list also holds the sidebar's own terminal and the script
    // runner's, under reserved id prefixes. Neither is an agent on a ticket.
    const terminals = [
      { id: 'sidebar-1', name: 'Shell', state: 'idle', repositories: ['/a/b'], metadata: { ticketId: '7' } },
      { id: 'script-1', name: 'Script', state: 'idle', repositories: ['/a/b'], metadata: { ticketId: '8' } },
      { id: 't1', name: 'Claude 1', state: 'idle', repositories: ['/a/b'], metadata: { ticketId: '9' } },
    ] as unknown as TerminalInfo[]

    expect(terminalAgentRefs(terminals).map((ref) => ref.ticketId)).toEqual(['9'])
  })
})

describe('terminalAgentSignature', () => {
  function terminal(overrides: Record<string, unknown>): TerminalInfo {
    return { id: 't1', name: 'Claude 1', state: 'idle', repositories: [], ...overrides } as unknown as TerminalInfo
  }

  // The whole point: the Tasks page subscribes to this string instead of to the
  // store's `terminals` array, which is rewritten on every pty tick.
  it('ignores the fields that change on every pty tick', () => {
    const before = [terminal({ state: 'idle', repositories: ['/a/b'], metadata: { ticketId: '234' } })]
    const after = [terminal({ state: 'working', repositories: ['/a/b'], metadata: { ticketId: '234', costUsd: 0.42 } })]

    expect(terminalAgentSignature(after)).toBe(terminalAgentSignature(before))
  })

  it('changes when an agent picks up a ticket', () => {
    const before = [terminal({ repositories: ['/a/b'] })]
    const after = [terminal({ repositories: ['/a/b'], metadata: { ticketId: '234' } })]

    expect(terminalAgentSignature(after)).not.toBe(terminalAgentSignature(before))
  })

  it('changes when an agent moves to another repository', () => {
    const before = [terminal({ repositories: ['/a/b'], metadata: { ticketId: '234' } })]
    const after = [terminal({ repositories: ['/c/d'], metadata: { ticketId: '234' } })]

    expect(terminalAgentSignature(after)).not.toBe(terminalAgentSignature(before))
  })

  it('cannot be fooled by a ticket id that runs into a path', () => {
    // Joined on separators no path or ticket id contains, so two different
    // rosters cannot collapse onto the same string.
    const a = [terminal({ repositories: ['/b'], metadata: { ticketId: '234' } })]
    const b = [terminal({ repositories: [], metadata: { ticketId: '234/b' } })]

    expect(terminalAgentSignature(a)).not.toBe(terminalAgentSignature(b))
  })
})
