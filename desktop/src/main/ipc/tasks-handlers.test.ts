import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Config, RepositoryConfig, TasksSnapshot } from '../../types'

// Hoisted above the import of the module under test, in the style of
// config-handlers.test.ts: ipcMain.handle would throw outside Electron, and the
// registration is captured so the handler can be invoked directly.
const handlers = new Map<string, () => Promise<TasksSnapshot>>()
vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn((channel: string, handler: () => Promise<TasksSnapshot>) => {
      handlers.set(channel, handler)
    }),
  },
}))

// The config is a cloud-hydrated in-memory object; here it is whatever the test
// says it is. `tracker.ts` is deliberately NOT mocked — resolving which repos are
// GitHub-tracked is half of what this handler does.
const mockReadConfig = vi.fn<() => Config>()
vi.mock('../config/config', () => ({
  readConfig: () => mockReadConfig(),
}))

// `gh auth token` must never be spawned in the suite.
const mockGetGitHubToken = vi.fn<() => string | null>()
vi.mock('../github', () => ({
  getGitHubToken: () => mockGetGitHubToken(),
}))

const mockFetchOpenIssues = vi.fn()
vi.mock('../github-issues', () => ({
  fetchOpenIssues: (...args: unknown[]) => mockFetchOpenIssues(...args),
}))

import { setupTasksHandlers } from './tasks-handlers'

function repo(overrides: Partial<RepositoryConfig> = {}): RepositoryConfig {
  return { path: '/tmp/repo', keywords: [], ...overrides }
}

/** A repo the ladder resolves to `github`: an ordinary normalized GitHub remote. */
function githubRepo(name: string, overrides: Partial<RepositoryConfig> = {}): RepositoryConfig {
  return repo({ name, remoteUrl: `https://github.com/acme/${name}`, ...overrides })
}

function withRepos(repositories: Record<string, RepositoryConfig>): void {
  mockReadConfig.mockReturnValue({ repositories } as unknown as Config)
}

/** Registers the handlers and returns the one the Tasks page calls. */
function listOpenIssues(): () => Promise<TasksSnapshot> {
  setupTasksHandlers()
  const handler = handlers.get('tasks:listOpenIssues')
  if (!handler) throw new Error('tasks:listOpenIssues was never registered')
  return handler
}

describe('tasks:listOpenIssues', () => {
  beforeEach(() => {
    handlers.clear()
    mockReadConfig.mockReset()
    mockGetGitHubToken.mockReset()
    mockGetGitHubToken.mockReturnValue('gho_testtoken')
    mockFetchOpenIssues.mockReset()
    mockFetchOpenIssues.mockResolvedValue({ issues: [], totalOpen: 0 })
  })

  it('reads the open issues of every GitHub-tracked repository', async () => {
    withRepos({ api: githubRepo('api'), web: githubRepo('web') })
    mockFetchOpenIssues.mockResolvedValue({
      issues: [{ number: 1, title: 'x', url: 'https://github.com/acme/api/issues/1', createdAt: '', labels: [] }],
      totalOpen: 214,
    })

    const snapshot = await listOpenIssues()()

    expect(snapshot.githubConnected).toBe(true)
    expect(snapshot.groups.map((g) => g.configKey).sort()).toEqual(['api', 'web'])
    // The owner and the repo are parsed here, not by the query.
    expect(mockFetchOpenIssues).toHaveBeenCalledWith('acme', 'api')
    // The page cap is a cap: the total the repository reported has to survive the trip.
    expect(snapshot.groups[0].totalOpen).toBe(214)
  })

  // Acceptance criterion 2: "nothing open" and "tracked somewhere else" are
  // different statements, so a Jira repo gets no group rather than an empty one.
  it('shows no group for a repository tracked in Jira', async () => {
    withRepos({
      api: githubRepo('api'),
      billing: repo({ name: 'billing', plan: { tracker: 'jira' }, jira: { projectKey: 'PROJ' } }),
    })

    const snapshot = await listOpenIssues()()

    expect(snapshot.groups.map((g) => g.configKey)).toEqual(['api'])
    expect(mockFetchOpenIssues).toHaveBeenCalledTimes(1)
  })

  // `ask` is a real answer, and one this page cannot put to anybody: both sides are
  // configured, so guessing GitHub would file the question in the wrong backlog.
  it('shows no group for a repository the ladder leaves undecided', async () => {
    withRepos({
      api: githubRepo('api'),
      both: githubRepo('both', { plan: { tracker: 'ask' }, jira: { projectKey: 'PROJ' } }),
    })

    const snapshot = await listOpenIssues()()

    expect(snapshot.groups.map((g) => g.configKey)).toEqual(['api'])
  })

  // A GHE issues host is not readable from api.github.com, so the ladder no longer
  // calls it GitHub — and no group is far better than a permanent "not found" card.
  it('shows no group for a repository whose issues live on a non-github.com host', async () => {
    withRepos({
      ghe: repo({
        name: 'ghe',
        plan: { tracker: 'ask' },
        issues: { githubIssuesUrl: 'https://github.acme-corp.com/acme/api/issues' },
        remoteUrl: 'https://gitlab.com/acme/api',
      }),
    })

    const snapshot = await listOpenIssues()()

    expect(snapshot.groups).toEqual([])
    expect(mockFetchOpenIssues).not.toHaveBeenCalled()
  })

  // The override is free text. A card saying "this is not a URL" belongs in the
  // settings form that accepted it, not on a backlog page.
  it('skips a GitHub repository whose issues address does not parse', async () => {
    withRepos({
      api: githubRepo('api'),
      broken: githubRepo('broken', { issues: { githubIssuesUrl: 'not a url at all' } }),
    })

    const snapshot = await listOpenIssues()()

    expect(snapshot.groups.map((g) => g.configKey)).toEqual(['api'])
    expect(mockFetchOpenIssues).toHaveBeenCalledTimes(1)
    expect(mockFetchOpenIssues).toHaveBeenCalledWith('acme', 'api')
  })

  it('reads the owner and repo out of an explicit issues URL', async () => {
    // A separate tracker repository: the issues are NOT in the repo the code is in.
    withRepos({
      api: githubRepo('api', { issues: { githubIssuesUrl: 'https://github.com/acme/tracker/issues/' } }),
    })

    await listOpenIssues()()

    expect(mockFetchOpenIssues).toHaveBeenCalledWith('acme', 'tracker')
  })

  // A connection state, said once, and before any config is walked: with no token
  // every group would otherwise carry the same `no-token` error.
  it('answers that GitHub is not connected without fetching anything', async () => {
    mockGetGitHubToken.mockReturnValue(null)
    withRepos({ api: githubRepo('api') })

    expect(await listOpenIssues()()).toEqual({ githubConnected: false, groups: [] })
    expect(mockFetchOpenIssues).not.toHaveBeenCalled()
    expect(mockReadConfig).not.toHaveBeenCalled()
  })

  it('keeps a failing repository from taking the others down with it', async () => {
    withRepos({ api: githubRepo('api'), web: githubRepo('web') })
    mockFetchOpenIssues.mockImplementation(async (_owner: string, name: string) => {
      if (name === 'web') return { error: 'forbidden', message: 'nope' }
      return { issues: [], totalOpen: 0 }
    })

    const snapshot = await listOpenIssues()()

    expect(snapshot.groups.find((g) => g.configKey === 'web')?.error)
      .toEqual({ error: 'forbidden', message: 'nope' })
    expect(snapshot.groups.find((g) => g.configKey === 'api')?.error).toBeUndefined()
  })

  // resolveTracker's row 1 returns `github` from an explicit plan.tracker alone,
  // without consulting hasGitHubCoordinates — so a repo deliberately set to GitHub
  // with a remote hosted elsewhere reaches parseOwnerRepo. fetchOpenIssues only
  // knows api.github.com, so querying it would earn a permanent, wrong
  // "Repository not found" card. It must be skipped instead.
  it('skips a repo explicitly set to github whose remote is on another host', async () => {
    withRepos({
      gitlab: {
        name: 'gitlab',
        path: '/tmp/gitlab',
        keywords: [],
        plan: { tracker: 'github' },
        remoteUrl: 'https://gitlab.com/acme/api',
      },
      ghe: {
        name: 'ghe',
        path: '/tmp/ghe',
        keywords: [],
        plan: { tracker: 'github' },
        issues: { githubIssuesUrl: 'https://github.acme-corp.com/acme/api/issues' },
      },
    })

    const snapshot = await listOpenIssues()()

    expect(snapshot.githubConnected).toBe(true)
    expect(snapshot.groups).toEqual([])
    expect(mockFetchOpenIssues).not.toHaveBeenCalled()
  })

  // Not redundant with the error return above: an unexpected throw inside a
  // Promise.all would otherwise reject the whole page into a blank screen.
  it('captures an unexpected throw into that repository’s own group', async () => {
    withRepos({ api: githubRepo('api'), web: githubRepo('web') })
    mockFetchOpenIssues.mockImplementation(async (_owner: string, name: string) => {
      if (name === 'web') throw new Error('boom')
      return { issues: [], totalOpen: 0 }
    })

    const snapshot = await listOpenIssues()()

    expect(snapshot.githubConnected).toBe(true)
    expect(snapshot.groups.find((g) => g.configKey === 'web')?.error)
      .toEqual({ error: 'network', message: 'boom' })
    expect(snapshot.groups.find((g) => g.configKey === 'api')?.issues).toEqual([])
  })
})
