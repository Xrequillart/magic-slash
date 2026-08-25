import { describe, it, expect } from 'vitest'
import type { RepositoryConfig, TaskIssue, TaskRepoGroup } from '../../types'
import { buildTaskRows, countOpenIssues, countTotalOpen, sortIssues } from './taskRows'

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

function group(overrides: Partial<TaskRepoGroup> = {}): TaskRepoGroup {
  return {
    configKey: 'api',
    name: 'api',
    issues: [],
    ...overrides,
  }
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
    const [row] = buildTaskRows([group({
      issues: [
        issue({ number: 1, createdAt: '2026-08-01T10:00:00Z' }),
        issue({ number: 2, createdAt: '2026-08-05T10:00:00Z' }),
      ],
    })], REPOS)
    expect(row.issues.map((i) => i.number)).toEqual([2, 1])
  })

  it('shows the repositories that failed before the ones that answered', () => {
    // A failure is the only thing on this page that asks something of the reader.
    // Ordered on issue count alone it would sit at the bottom, next to the repos
    // that simply have nothing open.
    const rows = buildTaskRows([
      group({ configKey: 'magic-slash', name: 'magic-slash', issues: [issue(), issue(), issue()] }),
      group({ configKey: 'poppins-pex', name: 'poppins-pex', error: { error: 'forbidden', message: 'nope' } }),
    ], REPOS)
    expect(rows.map((r) => r.name)).toEqual(['poppins-pex', 'magic-slash'])
  })

  it('keeps a failed group, with its error and no issues', () => {
    const rows = buildTaskRows([
      group({ configKey: 'poppins-pex', name: 'poppins-pex', error: { error: 'rate-limited', message: 'later' } }),
      group({ configKey: 'magic-slash', name: 'magic-slash', issues: [issue()] }),
    ], REPOS)
    expect(rows.find((r) => r.name === 'poppins-pex')?.error).toEqual({ error: 'rate-limited', message: 'later' })
    expect(rows.find((r) => r.name === 'poppins-pex')?.issues).toEqual([])
  })

  it('ranks the fullest backlog first, then falls back to the name', () => {
    const rows = buildTaskRows([
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
    const all = buildTaskRows([group({ configKey: 'my-side-project', name: 'my-side-project' })], REPOS)
    const fewer = buildTaskRows(
      [group({ configKey: 'my-side-project', name: 'my-side-project' })],
      { 'my-side-project': REPOS['my-side-project'] },
    )
    // Explicitly configured, so it is the same colour in both maps.
    expect(all[0].color).toEqual('#123456')
    expect(fewer[0].color).toEqual('#123456')
  })

  it('gives a repository with no configured colour the one its position earns', () => {
    const rows = buildTaskRows([
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
    const rows = buildTaskRows([
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
    const rows = buildTaskRows([
      group({ configKey: 'magic-slash', name: 'magic-slash', issues: [issue()] }),
      group({ configKey: 'poppins-pex', name: 'poppins-pex', error: { error: 'network', message: 'offline' } }),
      group({ configKey: 'jira-only', name: 'jira-only', error: { error: 'not-found', message: 'gone' } }),
    ], REPOS)
    expect(countOpenIssues(rows)).toEqual(1)
  })

  // The query reads one capped page: what a repository HAS and what the page can
  // SHOW are two numbers, and the header needs both to say "showing 3 of 214".
  it('counts what the repositories have, past the page cap', () => {
    const rows = buildTaskRows([
      group({ configKey: 'magic-slash', name: 'magic-slash', issues: [issue(), issue()], totalOpen: 214 }),
      group({ configKey: 'poppins-pex', name: 'poppins-pex', issues: [issue()], totalOpen: 1 }),
    ], REPOS)
    expect(countOpenIssues(rows)).toEqual(3)
    expect(countTotalOpen(rows)).toEqual(215)
  })

  it('counts a group with no reported total as what it could show', () => {
    // Never less than the issues in hand: a missing total must not read as "of 1".
    const rows = buildTaskRows([
      group({ configKey: 'magic-slash', name: 'magic-slash', issues: [issue(), issue()] }),
      group({ configKey: 'poppins-pex', name: 'poppins-pex', error: { error: 'network', message: 'offline' } }),
    ], REPOS)
    expect(countTotalOpen(rows)).toEqual(2)
  })

  it('counts nothing on an empty page, totals included', () => {
    expect(countTotalOpen([])).toEqual(0)
  })
})
