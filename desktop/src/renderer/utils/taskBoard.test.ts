import { describe, it, expect } from 'vitest'
import type { JiraTaskIssue, TaskIssue } from '../../types'
import {
  BOARD_COLUMNS,
  buildBoard,
  countBoard,
  githubColumn,
  isBlockedLabel,
  isBlockedStatus,
  jiraColumn,
  type BoardCard,
  type BoardColumn,
} from './taskBoard'
import { NO_AGENTS } from './taskAgents'
import type { TaskRow } from './taskRows'

function issue(overrides: Partial<TaskIssue> = {}): TaskIssue {
  return {
    number: 1,
    title: 'An issue',
    url: 'https://github.com/acme/api/issues/1',
    createdAt: '2026-08-01T10:00:00Z',
    labels: [],
    ...overrides,
  }
}

function jiraIssue(overrides: Partial<JiraTaskIssue> = {}): JiraTaskIssue {
  return {
    key: 'PROJ-1',
    title: 'A ticket',
    url: 'https://acme.atlassian.net/browse/PROJ-1',
    createdAt: '2026-08-01T10:00:00Z',
    statusName: 'To Do',
    statusCategory: 'new',
    labels: [],
    ...overrides,
  }
}

/** A GitHub row carrying the issues a test cares about, and defaults for the rest. */
function githubRow(issues: TaskIssue[], agented: ReadonlySet<string> = NO_AGENTS): TaskRow {
  return {
    tracker: 'github',
    configKey: 'api',
    name: 'api',
    sourceKey: 'github:acme/api',
    issues,
    color: '#111111',
    showTracker: false,
    repos: [{ configKey: 'api', name: 'api', color: '#111111' }],
    agentedIssues: agented,
  }
}

/** The same for a sprint. */
function jiraRow(issues: JiraTaskIssue[], agented: ReadonlySet<string> = NO_AGENTS): TaskRow {
  return {
    tracker: 'jira',
    configKey: 'api',
    name: 'api',
    sourceKey: 'jira:https://acme.atlassian.net|API',
    issues,
    color: '#111111',
    showTracker: false,
    repos: [{ configKey: 'api', name: 'api', color: '#111111' }],
    agentedIssues: agented,
  }
}

/** The ids in one column, which is what nearly every assertion below is about. */
function ids(cards: BoardCard[]): string[] {
  return cards.map((card) => card.id)
}

describe('isBlockedStatus', () => {
  it('recognises the word whatever case the site spells it in', () => {
    expect(isBlockedStatus('Blocked')).toBe(true)
    expect(isBlockedStatus('BLOCKED')).toBe(true)
  })

  it('recognises it inside a longer status the team wrote', () => {
    expect(isBlockedStatus('Blocked / on hold')).toBe(true)
    expect(isBlockedStatus('Waiting — blocked by infra')).toBe(true)
  })

  it('recognises the accented French spelling', () => {
    expect(isBlockedStatus('Bloqué')).toBe(true)
    expect(isBlockedStatus('Bloquée par le client')).toBe(true)
  })

  it('says no to the ordinary columns', () => {
    expect(isBlockedStatus('To Do')).toBe(false)
    expect(isBlockedStatus('In Review')).toBe(false)
    expect(isBlockedStatus('')).toBe(false)
  })
})

describe('isBlockedLabel', () => {
  it('recognises the label however it is punctuated', () => {
    expect(isBlockedLabel(['blocked'])).toBe(true)
    expect(isBlockedLabel(['Blocked By'])).toBe(true)
    expect(isBlockedLabel(['blocked-by'])).toBe(true)
    expect(isBlockedLabel(['on hold'])).toBe(true)
    expect(isBlockedLabel(['on_hold'])).toBe(true)
    expect(isBlockedLabel(['bloqué'])).toBe(true)
  })

  it('leaves a severity called blocker alone', () => {
    // The whole reason labels get an exact match where a Jira status gets a substring:
    // on most repositories `blocker` is how urgent a bug is, not whether anyone can
    // work on it.
    expect(isBlockedLabel(['blocker'])).toBe(false)
    expect(isBlockedLabel(['P0: blocker'])).toBe(false)
  })

  it('says no when nothing on the issue mentions it', () => {
    expect(isBlockedLabel([])).toBe(false)
    expect(isBlockedLabel(['bug', 'good first issue'])).toBe(false)
  })
})

describe('githubColumn', () => {
  it('puts an ordinary open issue in the backlog', () => {
    expect(githubColumn(issue(), false)).toBe('backlog')
  })

  it('puts an issue somebody has an agent on in progress', () => {
    expect(githubColumn(issue(), true)).toBe('progress')
  })

  it('puts a labelled issue in blocked, agent or no agent', () => {
    expect(githubColumn(issue({ labels: ['blocked'] }), false)).toBe('blocked')
    expect(githubColumn(issue({ labels: ['blocked'] }), true)).toBe('blocked')
  })

  it('puts a closed issue in done even with an agent still attached', () => {
    expect(githubColumn(issue({ closedAt: '2026-09-01T10:00:00Z' }), true)).toBe('done')
  })

  it('puts a closed issue in done even when it is still labelled blocked', () => {
    expect(githubColumn(issue({ closedAt: '2026-09-01T10:00:00Z', labels: ['blocked'] }), false)).toBe('done')
  })
})

describe('jiraColumn', () => {
  it('puts the To Do column in the backlog', () => {
    expect(jiraColumn(jiraIssue({ statusCategory: 'new', statusName: 'To Do' }))).toBe('backlog')
  })

  it('puts everything in flight in progress, whatever the site calls it', () => {
    expect(jiraColumn(jiraIssue({ statusCategory: 'indeterminate', statusName: 'In Progress' }))).toBe('progress')
    expect(jiraColumn(jiraIssue({ statusCategory: 'indeterminate', statusName: 'In Review' }))).toBe('progress')
    expect(jiraColumn(jiraIssue({ statusCategory: 'indeterminate', statusName: 'QA' }))).toBe('progress')
    expect(jiraColumn(jiraIssue({ statusCategory: 'indeterminate', statusName: 'Waiting for deploy' }))).toBe('progress')
  })

  it('puts a finished ticket in done', () => {
    expect(jiraColumn(jiraIssue({ statusCategory: 'done', statusName: 'Done' }))).toBe('done')
  })

  it('reads blocked off the status name, which has no category of its own', () => {
    expect(jiraColumn(jiraIssue({ statusCategory: 'indeterminate', statusName: 'Blocked' }))).toBe('blocked')
    // A site that files its blocked column under To Do rather than In Progress.
    expect(jiraColumn(jiraIssue({ statusCategory: 'new', statusName: 'Bloqué' }))).toBe('blocked')
  })

  it('prefers done over a status that still says blocked', () => {
    expect(jiraColumn(jiraIssue({ statusCategory: 'done', statusName: 'Done (was blocked)' }))).toBe('done')
  })

  it('ignores the agent, unlike the GitHub side', () => {
    // The sprint board is the shared truth about where Jira work is; the card says an
    // agent is on it with its own marker.
    expect(jiraColumn(jiraIssue({ statusCategory: 'new' }))).toBe('backlog')
  })
})

describe('buildBoard', () => {
  it('deals a mixed page into the four columns', () => {
    const board = buildBoard([
      githubRow([
        issue({ number: 1 }),
        issue({ number: 2, labels: ['blocked'] }),
        issue({ number: 3, closedAt: '2026-09-01T10:00:00Z' }),
      ], new Set(['1'])),
      jiraRow([
        jiraIssue({ key: 'PROJ-1', statusCategory: 'indeterminate', statusName: 'In Review' }),
        jiraIssue({ key: 'PROJ-2', statusCategory: 'new' }),
      ]),
    ])

    expect(ids(board.blocked)).toEqual(['2'])
    expect(ids(board.backlog)).toEqual(['PROJ-2'])
    expect(ids(board.progress)).toEqual(['1', 'PROJ-1'])
    expect(ids(board.done)).toEqual(['3'])
  })

  it('gives every card a key that is unique across the board', () => {
    const board = buildBoard([
      githubRow([issue({ number: 7 })]),
      jiraRow([jiraIssue({ key: 'PROJ-7' })]),
    ])
    const keys = BOARD_COLUMNS.flatMap((column) => board[column].map((card) => card.key))
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('marks the cards somebody has an agent on', () => {
    const board = buildBoard([githubRow([issue({ number: 1 }), issue({ number: 2 })], new Set(['1']))])
    expect(board.progress[0]?.hasAgent).toBe(true)
    expect(board.backlog[0]?.hasAgent).toBe(false)
  })

  it('finds a Jira agent whose ticket was typed in another case', () => {
    // The index is keyed through `normalizeTicketId`, so a card has to ask it the same
    // way — an agent started on `proj-1` is on `PROJ-1`.
    const board = buildBoard([jiraRow([jiraIssue({ key: 'PROJ-1' })], new Set(['PROJ-1']))])
    expect(board.backlog[0]?.hasAgent).toBe(true)
  })

  it('keeps the order the rows arrived in, inside each column', () => {
    // What makes the sort control go on meaning something: each column is a
    // subsequence of a list that was already ordered.
    const board = buildBoard([githubRow([issue({ number: 3 }), issue({ number: 2 }), issue({ number: 1 })])])
    expect(ids(board.backlog)).toEqual(['3', '2', '1'])
  })

  it('keeps a ticket shared by two repositories on one card', () => {
    const shared: TaskRow = {
      ...githubRow([issue({ number: 1 })]),
      repos: [
        { configKey: 'api', name: 'api', color: '#111111' },
        { configKey: 'api-worker', name: 'api-worker', color: '#222222' },
      ],
    }
    expect(countBoard(buildBoard([shared]))).toBe(1)
  })

  it('draws nothing for an empty page', () => {
    const board = buildBoard([])
    expect(countBoard(board)).toBe(0)
    for (const column of BOARD_COLUMNS) expect(board[column]).toEqual([])
  })

  it('draws nothing for a row that failed', () => {
    const failed: TaskRow = { ...githubRow([]), error: { error: 'not-found', message: 'gone' } }
    expect(countBoard(buildBoard([failed]))).toBe(0)
  })
})

describe('countBoard', () => {
  it('counts every column, the finished one included', () => {
    const board = buildBoard([
      githubRow([issue({ number: 1 }), issue({ number: 2, closedAt: '2026-09-01T10:00:00Z' })]),
    ])
    expect(countBoard(board)).toBe(2)
  })

  it('has an entry for every declared column', () => {
    // Guards the shape rather than the count: a fifth column added to BOARD_COLUMNS
    // and forgotten in `emptyBoard` would count as `undefined.length`.
    const board = buildBoard([])
    for (const column of BOARD_COLUMNS) {
      expect(Array.isArray(board[column as BoardColumn])).toBe(true)
    }
  })
})
