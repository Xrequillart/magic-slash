import { describe, it, expect } from 'vitest'
import type {
  GitHubTaskRepoGroup,
  JiraTaskIssue,
  JiraTaskRepoGroup,
  RepositoryConfig,
  TaskIssue,
  TaskRepoGroup,
} from '../../types'
import {
  buildTaskRows,
  countOpenIssues,
  countTotalOpen,
  filterTaskRows,
  NO_FILTER,
  rowKey,
  sortIssues,
  taskFilterRepos,
  type TaskRow,
} from './taskRows'

function repo(overrides: Partial<RepositoryConfig> = {}): RepositoryConfig {
  return { path: '', keywords: [], ...overrides }
}

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

function group(overrides: Partial<Omit<GitHubTaskRepoGroup, 'tracker'>> = {}): GitHubTaskRepoGroup {
  return {
    tracker: 'github',
    configKey: 'api',
    name: 'api',
    issues: [],
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

function jiraGroup(overrides: Partial<Omit<JiraTaskRepoGroup, 'tracker'>> = {}): JiraTaskRepoGroup {
  return {
    tracker: 'jira',
    configKey: 'jira-only',
    name: 'jira-only',
    issues: [],
    ...overrides,
  }
}

/**
 * `buildTaskRows` with the two arguments most of these tests do not vary.
 *
 * The agent index is the third and it decides which In Progress sprint tickets
 * survive — `{}`, nobody is on anything, unless the test is about that rule.
 */
function build(
  groups: TaskRepoGroup[],
  repositories: Record<string, RepositoryConfig> = REPOS,
  agented: Record<string, ReadonlySet<string>> = {},
): TaskRow[] {
  return buildTaskRows(groups, repositories, agented)
}

/** One row's issue numbers, narrowed to the GitHub kind the test built it from. */
function numbers(row: TaskRow): number[] {
  return row.tracker === 'github' ? row.issues.map((i) => i.number) : []
}

/** One row's Jira keys, likewise. */
function keys(row: TaskRow): string[] {
  return row.tracker === 'jira' ? row.issues.map((i) => i.key) : []
}

const REPOS: Record<string, RepositoryConfig> = {
  'magic-slash': repo({ id: 'r1' }),
  'poppins-pex': repo({ id: 'r2' }),
  'jira-only': repo({ id: 'r3' }),
  'my-side-project': repo({ id: 'r4', color: '#123456' }),
}

describe('sortIssues', () => {
  it('puts the most recently opened issue first', () => {
    const sorted = sortIssues([
      issue({ number: 1, createdAt: '2026-08-01T10:00:00Z' }),
      issue({ number: 3, createdAt: '2026-08-03T10:00:00Z' }),
      issue({ number: 2, createdAt: '2026-08-02T10:00:00Z' }),
    ])
    expect(sorted.map((i) => i.number)).toEqual([3, 2, 1])
  })

  it('sinks an issue with no timestamp instead of floating it to the top', () => {
    const sorted = sortIssues([
      issue({ number: 1, createdAt: '' }),
      issue({ number: 2, createdAt: '2026-08-02T10:00:00Z' }),
    ])
    expect(sorted.map((i) => i.number)).toEqual([2, 1])
  })

  it('leaves the input untouched', () => {
    const input = [issue({ number: 1, createdAt: '2026-08-01T10:00:00Z' }), issue({ number: 2, createdAt: '2026-08-02T10:00:00Z' })]
    sortIssues(input)
    expect(input.map((i) => i.number)).toEqual([1, 2])
  })
})

describe('buildTaskRows', () => {
  it('sorts the issues of every group, newest first', () => {
    const [row] = build([group({
      issues: [
        issue({ number: 1, createdAt: '2026-08-01T10:00:00Z' }),
        issue({ number: 2, createdAt: '2026-08-05T10:00:00Z' }),
      ],
    })])
    expect(numbers(row)).toEqual([2, 1])
  })

  it('shows the repositories that failed before the ones that answered', () => {
    // A failure is the only thing on this page that asks something of the reader.
    // Ordered on issue count alone it would sit at the bottom, next to the repos
    // that simply have nothing open.
    const rows = build([
      group({ configKey: 'magic-slash', name: 'magic-slash', issues: [issue(), issue(), issue()] }),
      group({ configKey: 'poppins-pex', name: 'poppins-pex', error: { error: 'forbidden', message: 'nope' } }),
    ], REPOS)
    expect(rows.map((r) => r.name)).toEqual(['poppins-pex', 'magic-slash'])
  })

  it('keeps a failed group, with its error and no issues', () => {
    const rows = build([
      group({ configKey: 'poppins-pex', name: 'poppins-pex', error: { error: 'rate-limited', message: 'later' } }),
      group({ configKey: 'magic-slash', name: 'magic-slash', issues: [issue()] }),
    ], REPOS)
    expect(rows.find((r) => r.name === 'poppins-pex')?.error).toEqual({ error: 'rate-limited', message: 'later' })
    expect(rows.find((r) => r.name === 'poppins-pex')?.issues).toEqual([])
  })

  it('ranks the fullest backlog first, then falls back to the name', () => {
    const rows = build([
      group({ configKey: 'poppins-pex', name: 'poppins-pex' }),
      group({ configKey: 'magic-slash', name: 'magic-slash' }),
      group({ configKey: 'jira-only', name: 'busy', issues: [issue(), issue()] }),
    ], REPOS)
    expect(rows.map((r) => r.name)).toEqual(['busy', 'magic-slash', 'poppins-pex'])
  })

  // The colour is an identity: the same repo has the same dot in the sidebar and
  // here. getProjectColorMap assigns by INDEX, so a map built from the GitHub-tracked
  // subset would repaint a repo the moment another repo's tracker changed.
  it('colours a repository the same way whatever the other trackers say', () => {
    const all = build([group({ configKey: 'my-side-project', name: 'my-side-project' })], REPOS)
    const fewer = build(
      [group({ configKey: 'my-side-project', name: 'my-side-project' })],
      { 'my-side-project': REPOS['my-side-project'] },
    )
    // Explicitly configured, so it is the same colour in both maps.
    expect(all[0].color).toEqual('#123456')
    expect(fewer[0].color).toEqual('#123456')
  })

  // Acceptance criterion 1: a Jira repository's card is its active sprint, and the
  // GitHub cards are unchanged beside it.
  it('builds a row for each tracker in one page', () => {
    const rows = build([
      group({ configKey: 'magic-slash', name: 'magic-slash', issues: [issue()] }),
      jiraGroup({ configKey: 'jira-only', name: 'jira-only', issues: [jiraIssue({ key: 'PROJ-7' })] }),
    ])
    expect(rows.map((r) => r.tracker).sort()).toEqual(['github', 'jira'])
    expect(keys(rows.find((r) => r.name === 'jira-only')!)).toEqual(['PROJ-7'])
    expect(numbers(rows.find((r) => r.name === 'magic-slash')!)).toEqual([1])
  })

  it('sorts a sprint on its creation dates, newest first', () => {
    // `created` is asked for by the search precisely so this holds: without it every
    // Jira row would sink, and the card would render in whatever order Jira answered.
    const [row] = build([jiraGroup({
      issues: [
        jiraIssue({ key: 'PROJ-1', createdAt: '2026-08-01T10:00:00Z' }),
        jiraIssue({ key: 'PROJ-2', createdAt: '2026-08-05T10:00:00Z' }),
      ],
    })])
    expect(keys(row)).toEqual(['PROJ-2', 'PROJ-1'])
  })

  // Acceptance criterion 2, and the reason `buildTaskRows` takes the agent index at
  // all: the In Progress column is everybody's work in flight, and a page whose one
  // action is "start an agent" must not offer to duplicate it.
  it('drops an In Progress ticket nobody has an agent on', () => {
    const [row] = build([jiraGroup({
      issues: [
        jiraIssue({ key: 'PROJ-1', statusCategory: 'new' }),
        jiraIssue({ key: 'PROJ-2', statusCategory: 'indeterminate' }),
      ],
    })])
    expect(keys(row)).toEqual(['PROJ-1'])
  })

  it('keeps an In Progress ticket an agent is on', () => {
    const [row] = build(
      [jiraGroup({
        issues: [
          jiraIssue({ key: 'PROJ-1', statusCategory: 'new', createdAt: '2026-08-01T10:00:00Z' }),
          jiraIssue({ key: 'PROJ-2', statusCategory: 'indeterminate', createdAt: '2026-08-02T10:00:00Z' }),
        ],
      })],
      REPOS,
      { 'jira-only': new Set(['PROJ-2']) },
    )
    expect(keys(row)).toEqual(['PROJ-2', 'PROJ-1'])
  })

  // The index is keyed per repository, so an agent on PROJ-2 of another project
  // must not rescue this one's.
  it('reads the agent index of the repository the row belongs to', () => {
    const [row] = build(
      [jiraGroup({ issues: [jiraIssue({ key: 'PROJ-2', statusCategory: 'indeterminate' })] })],
      REPOS,
      { 'magic-slash': new Set(['PROJ-2']) },
    )
    expect(keys(row)).toEqual([])
  })

  it('never filters a GitHub group on the agent index', () => {
    // GitHub issues on this page are all open and all listed; the rule is about a
    // sprint's In Progress column and nothing else.
    const [row] = build([group({ issues: [issue({ number: 9 })] })], REPOS, {})
    expect(numbers(row)).toEqual([9])
  })

  it('gives a repository with no configured colour the one its position earns', () => {
    const rows = build([
      group({ configKey: 'magic-slash', name: 'magic-slash' }),
      group({ configKey: 'poppins-pex', name: 'poppins-pex' }),
    ], REPOS)
    // The palette is assigned over the FULL config, in its own order — not over the
    // two groups this page happens to draw.
    expect(rows.map((r) => r.color)).toEqual(['#3B82F6', '#10B981'])
  })
})

describe('counters', () => {
  it('counts every open issue on the page', () => {
    const rows = build([
      group({ configKey: 'magic-slash', name: 'magic-slash', issues: [issue(), issue()] }),
      group({ configKey: 'poppins-pex', name: 'poppins-pex', issues: [issue()] }),
    ], REPOS)
    expect(countOpenIssues(rows)).toEqual(3)
  })

  it('counts nothing on an empty page', () => {
    expect(countOpenIssues([])).toEqual(0)
  })

  // A failed repository contributes no issues: the total is what the page can
  // actually show, not what it hoped to.
  it('counts only the repositories that answered', () => {
    const rows = build([
      group({ configKey: 'magic-slash', name: 'magic-slash', issues: [issue()] }),
      group({ configKey: 'poppins-pex', name: 'poppins-pex', error: { error: 'network', message: 'offline' } }),
      group({ configKey: 'jira-only', name: 'jira-only', error: { error: 'not-found', message: 'gone' } }),
    ], REPOS)
    expect(countOpenIssues(rows)).toEqual(1)
  })

  // The query reads one capped page: what a repository HAS and what the page can
  // SHOW are two numbers, and the header needs both to say "showing 3 of 214".
  it('counts what the repositories have, past the page cap', () => {
    const rows = build([
      group({ configKey: 'magic-slash', name: 'magic-slash', issues: [issue(), issue()], totalOpen: 214 }),
      group({ configKey: 'poppins-pex', name: 'poppins-pex', issues: [issue()], totalOpen: 1 }),
    ], REPOS)
    expect(countOpenIssues(rows)).toEqual(3)
    expect(countTotalOpen(rows)).toEqual(215)
  })

  it('counts a group with no reported total as what it could show', () => {
    // Never less than the issues in hand: a missing total must not read as "of 1".
    const rows = build([
      group({ configKey: 'magic-slash', name: 'magic-slash', issues: [issue(), issue()] }),
      group({ configKey: 'poppins-pex', name: 'poppins-pex', error: { error: 'network', message: 'offline' } }),
    ], REPOS)
    expect(countTotalOpen(rows)).toEqual(2)
  })

  // Jira's search returns no `total` at all, so a sprint contributes what the card
  // could read — a floor, and the same claim a failed GitHub group already made.
  it('counts a truncated sprint as the tickets it could show', () => {
    const rows = build([
      jiraGroup({ configKey: 'jira-only', name: 'jira-only', issues: [jiraIssue(), jiraIssue({ key: 'PROJ-2' })], truncated: true }),
      group({ configKey: 'magic-slash', name: 'magic-slash', issues: [issue()], totalOpen: 214 }),
    ])
    expect(countOpenIssues(rows)).toEqual(3)
    expect(countTotalOpen(rows)).toEqual(216)
  })

  it('counts nothing on an empty page, totals included', () => {
    expect(countTotalOpen([])).toEqual(0)
  })
})

describe('rowKey', () => {
  // The config key stopped being unique the day an undecided repository started
  // producing two groups. Everything that keys a card — React's list key, the folded
  // set, the detail page's lookup — goes through this, so the two cannot collide.
  it('separates the two cards of one repository', () => {
    expect(rowKey({ tracker: 'github', configKey: 'api' })).not.toBe(rowKey({ tracker: 'jira', configKey: 'api' }))
  })

  it('is stable for the same card', () => {
    expect(rowKey({ tracker: 'jira', configKey: 'api' })).toBe(rowKey({ tracker: 'jira', configKey: 'api' }))
  })
})

describe('buildTaskRows — an undecided repository', () => {
  // Two cards under one name are a rendering bug unless each says where it came
  // from, so the flag is on for both of them.
  it('labels both cards with their tracker', () => {
    const rows = build([
      group({ configKey: 'poppins-pex', name: 'poppins-pex', issues: [issue()] }),
      jiraGroup({ configKey: 'poppins-pex', name: 'poppins-pex', issues: [jiraIssue()] }),
    ])

    expect(rows.map((row) => row.showTracker)).toEqual([true, true])
    expect(rows.map(rowKey).sort()).toEqual(['github:poppins-pex', 'jira:poppins-pex'])
  })

  // And off for everybody else: a repository with one card has nothing to be told
  // apart from, and stamping the tracker on every card in the list is noise.
  it('leaves a single-card repository unlabelled', () => {
    const rows = build([
      group({ configKey: 'poppins-pex', name: 'poppins-pex', issues: [issue()] }),
      jiraGroup({ configKey: 'jira-only', name: 'jira-only', issues: [jiraIssue()] }),
    ])

    expect(rows.map((row) => row.showTracker)).toEqual([false, false])
  })

  // The sort's own rules still decide the order — failures first, then the fullest
  // backlog — and the tracker only breaks a tie that would otherwise follow whichever
  // half of the snapshot resolved first.
  it('orders the pair by the page rules, tracker last', () => {
    const rows = build([
      jiraGroup({ configKey: 'poppins-pex', name: 'poppins-pex', issues: [jiraIssue()] }),
      group({ configKey: 'poppins-pex', name: 'poppins-pex', issues: [issue()] }),
    ])

    // Equal counts, same name: the tiebreak lands github before jira, every time.
    expect(rows.map((row) => row.tracker)).toEqual(['github', 'jira'])

    // A fuller backlog still wins over it.
    const uneven = build([
      group({ configKey: 'poppins-pex', name: 'poppins-pex', issues: [issue()] }),
      jiraGroup({ configKey: 'poppins-pex', name: 'poppins-pex', issues: [jiraIssue(), jiraIssue({ key: 'PROJ-2' })] }),
    ])
    expect(uneven.map((row) => row.tracker)).toEqual(['jira', 'github'])
  })

  // The agent index is keyed by REPOSITORY, so the two cards share one answer to
  // "who is on what" — and the Jira card's In Progress filter still reads it.
  it('shares the repository agent index between both cards', () => {
    const rows = build(
      [
        group({ configKey: 'poppins-pex', name: 'poppins-pex', issues: [issue()] }),
        jiraGroup({
          configKey: 'poppins-pex',
          name: 'poppins-pex',
          issues: [jiraIssue({ key: 'PROJ-9', statusCategory: 'indeterminate' })],
        }),
      ],
      REPOS,
      { 'poppins-pex': new Set(['PROJ-9']) },
    )

    expect(keys(rows.find((row) => row.tracker === 'jira')!)).toEqual(['PROJ-9'])
  })
})

describe('filterTaskRows', () => {
  /** Two repositories with two tickets each, one tracker apiece. */
  function backlog(): TaskRow[] {
    return build([
      group({
        configKey: 'poppins-pex',
        name: 'poppins-pex',
        issues: [
          issue({ number: 234, title: 'Fix the export' }),
          issue({ number: 1023, title: 'Création du rapport' }),
        ],
      }),
      jiraGroup({
        configKey: 'jira-only',
        name: 'jira-only',
        issues: [
          jiraIssue({ key: 'PER-1234', title: 'Sprint burndown' }),
          jiraIssue({ key: 'PER-77', title: 'Quota par workspace' }),
        ],
      }),
    ])
  }

  /** Every ticket left on screen, whichever card it is on. */
  function shown(rows: TaskRow[]): string[] {
    return rows.flatMap((row) => row.issues.map((i) => ('key' in i ? i.key : `#${i.number}`)))
  }

  it('returns the rows untouched when neither control is set', () => {
    const rows = backlog()
    // Identity, not merely equality: the page memoises on this, and a fresh array on
    // every render would re-render every card for nothing.
    expect(filterTaskRows(rows, NO_FILTER)).toBe(rows)
  })

  it('keeps one repository, and every card of it', () => {
    // The control names a REPOSITORY, not a backlog: an undecided repo has a GitHub
    // card and a Jira card, and picking it means both.
    const rows = build([
      group({ configKey: 'poppins-pex', name: 'poppins-pex', issues: [issue()] }),
      jiraGroup({ configKey: 'poppins-pex', name: 'poppins-pex', issues: [jiraIssue()] }),
      group({ configKey: 'magic-slash', name: 'magic-slash', issues: [issue({ number: 9 })] }),
    ])

    const kept = filterTaskRows(rows, { configKey: 'poppins-pex', query: '' })

    expect(kept).toHaveLength(2)
    expect(kept.map((row) => row.tracker).sort()).toEqual(['github', 'jira'])
  })

  it('finds a GitHub issue by its number, with or without the hash', () => {
    expect(shown(filterTaskRows(backlog(), { configKey: '', query: '234' }))).toContain('#234')
    expect(shown(filterTaskRows(backlog(), { configKey: '', query: '#234' }))).toContain('#234')
  })

  it('finds a Jira ticket by its key, in any casing and by the number alone', () => {
    expect(shown(filterTaskRows(backlog(), { configKey: '', query: 'per-77' }))).toEqual(['PER-77'])
    expect(shown(filterTaskRows(backlog(), { configKey: '', query: 'PER-77' }))).toEqual(['PER-77'])
    expect(shown(filterTaskRows(backlog(), { configKey: '', query: '77' }))).toEqual(['PER-77'])
  })

  it('searches the title too', () => {
    expect(shown(filterTaskRows(backlog(), { configKey: '', query: 'burndown' }))).toEqual(['PER-1234'])
    expect(shown(filterTaskRows(backlog(), { configKey: '', query: 'FIX THE' }))).toEqual(['#234'])
  })

  // Titles here are written in French as often as in English, and a box that will
  // not find `création` when you type `creation` is a box people stop using.
  it('ignores accents in both directions', () => {
    expect(shown(filterTaskRows(backlog(), { configKey: '', query: 'creation' }))).toEqual(['#1023'])
    expect(shown(filterTaskRows(backlog(), { configKey: '', query: 'création' }))).toEqual(['#1023'])
  })

  it('drops a card with nothing left on it', () => {
    const kept = filterTaskRows(backlog(), { configKey: '', query: 'burndown' })

    expect(kept).toHaveLength(1)
    expect(kept[0].configKey).toBe('jira-only')
  })

  it('combines the two controls', () => {
    const kept = filterTaskRows(backlog(), { configKey: 'poppins-pex', query: 'per' })

    // `per` matches both Jira keys — and neither is in the repository asked for.
    expect(kept).toEqual([])
  })

  // A failed row has no issues to match, so dropping it would be the page asserting
  // there is no match in a repository it could not read at all.
  it('never searches away a card that failed to load', () => {
    const rows = build([
      group({ configKey: 'poppins-pex', name: 'poppins-pex', issues: [issue({ title: 'Fix the export' })] }),
      group({ configKey: 'magic-slash', name: 'magic-slash', issues: [], error: { error: 'no-token', message: 'x' } }),
    ])

    const kept = filterTaskRows(rows, { configKey: '', query: 'nothing matches this' })

    expect(kept.map((row) => row.configKey)).toEqual(['magic-slash'])
    expect(kept[0].error).toBeDefined()
  })

  // The repository filter still applies to it: a card the reader has filtered out is
  // filtered out whether or not its read worked.
  it('applies the repository filter to a failed card as well', () => {
    const rows = build([
      group({ configKey: 'magic-slash', name: 'magic-slash', issues: [], error: { error: 'no-token', message: 'x' } }),
    ])

    expect(filterTaskRows(rows, { configKey: 'poppins-pex', query: 'x' })).toEqual([])
  })

  it('treats a query of nothing but spaces as no query', () => {
    const rows = backlog()
    expect(filterTaskRows(rows, { configKey: '', query: '   ' })).toBe(rows)
  })
})

describe('taskFilterRepos', () => {
  it('offers each repository once, whatever its card count', () => {
    const rows = build([
      group({ configKey: 'poppins-pex', name: 'poppins-pex', issues: [issue()] }),
      jiraGroup({ configKey: 'poppins-pex', name: 'poppins-pex', issues: [jiraIssue()] }),
      group({ configKey: 'magic-slash', name: 'magic-slash', issues: [issue({ number: 9 })] }),
    ])

    // In the order the CARDS are in, which is `buildTaskRows`' sort and not the order
    // they were declared here: equal backlogs, so alphabetical decides.
    expect(taskFilterRepos(rows).map((repo) => repo.configKey)).toEqual(['magic-slash', 'poppins-pex'])
  })

  it('carries the dot colour the cards are drawn with', () => {
    const rows = build([group({ configKey: 'my-side-project', name: 'my-side-project', issues: [issue()] })])

    expect(taskFilterRepos(rows)[0].color).toBe(rows[0].color)
  })
})
