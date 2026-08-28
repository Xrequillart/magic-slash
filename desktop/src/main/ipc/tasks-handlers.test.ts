import { describe, it, expect, vi, beforeEach } from 'vitest'
import type {
  Config,
  GitHubTaskRepoGroup,
  JiraAuthStatus,
  JiraTaskIssueDetail,
  JiraTaskRepoGroup,
  JiraTaskStatusError,
  PRStatusError,
  RepositoryConfig,
  TaskIssueDetail,
  TasksSnapshot,
} from '../../types'
import { AtlassianApiError } from '../jira/atlassian-api'

// Hoisted above the import of the module under test, in the style of
// config-handlers.test.ts: ipcMain.handle would throw outside Electron, and the
// registration is captured so the handler can be invoked directly.
//
// Typed loosely on purpose: the two channels here take different arguments, and
// each accessor below narrows its own — a single precise signature could only be
// wrong for one of them.
type IpcHandler = (event: unknown, args?: unknown) => Promise<unknown>
const handlers = new Map<string, IpcHandler>()
vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn((channel: string, handler: IpcHandler) => {
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
const mockFetchIssueDetail = vi.fn()
vi.mock('../github-issues', () => ({
  fetchOpenIssues: (...args: unknown[]) => mockFetchOpenIssues(...args),
  fetchIssueDetail: (...args: unknown[]) => mockFetchIssueDetail(...args),
}))

// `jira/connect` is mocked for TWO reasons, and the second is why it cannot simply
// be left alone. It imports `electron` (`shell`, `safeStorage`), which the root
// node_modules does not hold — and, through `token-store.ts`, it computes
// `path.join(CONFIG_DIR, …)` at module load, where `CONFIG_DIR` is `undefined`
// because this suite replaces the whole config module above. Importing
// `tasks-handlers.ts` would therefore throw before a single test ran.
const mockJiraStatus = vi.fn<() => JiraAuthStatus>()
const mockWithFreshAccessToken = vi.fn<() => Promise<{ accessToken: string; cloudId: string } | null>>()
const mockReportUnauthorized = vi.fn(async () => {})
vi.mock('../jira/connect', () => ({
  getStatus: () => mockJiraStatus(),
  withFreshAccessToken: () => mockWithFreshAccessToken(),
  reportUnauthorized: () => mockReportUnauthorized(),
}))

// Only the one CALL is replaced. `AtlassianApiError` is left real on purpose: the
// failure ladder narrows on `instanceof` and on `.status`, so a stand-in class
// would test the stand-in.
const mockFetchSprintIssues = vi.fn()
const mockFetchJiraIssue = vi.fn()
const mockFetchJiraFields = vi.fn()
vi.mock('../jira/atlassian-api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../jira/atlassian-api')>()),
  fetchSprintIssues: (...args: unknown[]) => mockFetchSprintIssues(...args),
  fetchJiraIssue: (...args: unknown[]) => mockFetchJiraIssue(...args),
  fetchJiraFields: (...args: unknown[]) => mockFetchJiraFields(...args),
}))

import { setupTasksHandlers } from './tasks-handlers'

function repo(overrides: Partial<RepositoryConfig> = {}): RepositoryConfig {
  return { path: '/tmp/repo', keywords: [], ...overrides }
}

/** A repo the ladder resolves to `github`: an ordinary normalized GitHub remote. */
function githubRepo(name: string, overrides: Partial<RepositoryConfig> = {}): RepositoryConfig {
  return repo({ name, remoteUrl: `https://github.com/acme/${name}`, ...overrides })
}

/** A repo the ladder resolves to `jira`, with the project key the query needs. */
function jiraRepo(name: string, overrides: Partial<RepositoryConfig> = {}): RepositoryConfig {
  return repo({ name, plan: { tracker: 'jira' }, jira: { projectKey: 'PROJ' }, ...overrides })
}

/** Jira's own issue shape, as `/rest/api/3/search/jql` returns it. */
function sprintIssue(key: string, category = 'new', name = 'To Do') {
  return {
    key,
    fields: {
      summary: `Ticket ${key}`,
      created: '2026-08-01T10:00:00.000+0200',
      status: { name, statusCategory: { key: category } },
    },
  }
}

/**
 * The Jira group of one repository, narrowed out of the snapshot.
 *
 * Matched on the TRACKER as well as the key: an undecided repository contributes a
 * group to each half, and a find on the key alone returns whichever the handler
 * concatenated first — the GitHub one — which this helper would then narrow away to
 * `undefined` and report as "no sprint was read".
 */
function jiraGroupOf(snapshot: TasksSnapshot, configKey: string): JiraTaskRepoGroup | undefined {
  const group = snapshot.groups.find((c) => c.configKey === configKey && c.tracker === 'jira')
  return group?.tracker === 'jira' ? group : undefined
}

/** `jiraGroupOf`'s twin, for the same reason. */
function githubGroupOf(snapshot: TasksSnapshot, configKey: string): GitHubTaskRepoGroup | undefined {
  const group = snapshot.groups.find((c) => c.configKey === configKey && c.tracker === 'github')
  return group?.tracker === 'github' ? group : undefined
}

function withRepos(repositories: Record<string, RepositoryConfig>): void {
  mockReadConfig.mockReturnValue({ repositories } as unknown as Config)
}

/**
 * Registers the handlers and hands back the one on `channel`, typed to what it
 * answers.
 *
 * The ARGS stay `unknown` at every call site: half the point of a handler's guard is
 * what it does with a payload its own annotation says is impossible, and a helper
 * typed to that annotation could not express those cases without a cast per test.
 */
function handlerFor<T>(channel: string): (args?: unknown) => Promise<T> {
  setupTasksHandlers()
  const handler = handlers.get(channel)
  if (!handler) throw new Error(`${channel} was never registered`)
  return (args) => handler(null, args) as Promise<T>
}

/** The one the Tasks page calls on open. */
function listOpenIssues(): () => Promise<TasksSnapshot> {
  return handlerFor<TasksSnapshot>('tasks:listOpenIssues')
}

/** The one the detail panel calls on select. */
function getIssueDetail(): (args: unknown) => Promise<TaskIssueDetail | PRStatusError> {
  return handlerFor<TaskIssueDetail | PRStatusError>('tasks:getIssueDetail')
}

function detail(overrides: Partial<TaskIssueDetail> = {}): TaskIssueDetail {
  return { body: 'the body', state: 'OPEN', assignees: [], commentCount: 0, comments: [], ...overrides }
}

/** The one the Jira detail panel calls on select. */
function getJiraIssueDetail(): (args: unknown) => Promise<JiraTaskIssueDetail | JiraTaskStatusError> {
  return handlerFor<JiraTaskIssueDetail | JiraTaskStatusError>('tasks:getJiraIssueDetail')
}

/** Jira's own single-issue shape, as `GET /rest/api/3/issue/{key}` returns it. */
function rawJiraIssue(fields: Record<string, unknown> = {}) {
  return {
    key: 'PROJ-42',
    fields: {
      description: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Body' }] }] },
      status: { name: 'In Progress', statusCategory: { key: 'indeterminate' } },
      assignee: { displayName: 'Ada Lovelace', accountId: 'acc-1' },
      labels: ['backend'],
      ...fields,
    },
  }
}

/**
 * The premise every suite below starts from: no handlers registered, a usable GitHub
 * token, both reads answering empty, and NO Atlassian credential.
 *
 * Hoisted to the file so each `describe` states only what makes it different. Vitest
 * runs the outer hook first, so an inner `mockReturnValue` overrides the default
 * rather than fighting it — and a mock added to the module above is reset in one
 * place instead of three.
 */
beforeEach(() => {
  handlers.clear()
  mockReadConfig.mockReset()
  mockGetGitHubToken.mockReset()
  mockGetGitHubToken.mockReturnValue('gho_testtoken')
  mockFetchOpenIssues.mockReset()
  mockFetchOpenIssues.mockResolvedValue({ issues: [], totalOpen: 0 })
  mockFetchIssueDetail.mockReset()
  // Disconnected by default: the GitHub tests must not depend on an Atlassian
  // credential existing, and a Jira test that wants one says so.
  mockJiraStatus.mockReset()
  mockJiraStatus.mockReturnValue({ connected: false, configured: true })
  mockWithFreshAccessToken.mockReset()
  mockWithFreshAccessToken.mockResolvedValue({ accessToken: 'atl-access', cloudId: 'cloud-1' })
  mockReportUnauthorized.mockReset()
  mockFetchSprintIssues.mockReset()
  mockFetchSprintIssues.mockResolvedValue({ issues: [], nextPageToken: null })
  mockFetchJiraIssue.mockReset()
  // A site with no custom fields worth naming, which is what most of these tests are
  // about: no Sprint field to caption the card with, and no colour field, so the epic
  // colour read never happens. A test that wants either says so.
  mockFetchJiraFields.mockReset()
  mockFetchJiraFields.mockResolvedValue([])
})

describe('tasks:listOpenIssues', () => {
  beforeEach(() => {
    mockFetchIssueDetail.mockResolvedValue({ body: '', state: 'OPEN', assignees: [], commentCount: 0 })
  })

  it('reads the open issues of every GitHub-tracked repository', async () => {
    withRepos({ api: githubRepo('api'), web: githubRepo('web') })
    mockFetchOpenIssues.mockResolvedValue({
      issues: [{ number: 1, title: 'x', url: 'https://github.com/acme/api/issues/1', createdAt: '', labels: [] }],
      totalOpen: 214,
    })

    const snapshot = await listOpenIssues()()

    expect(snapshot.connected.github).toBe(true)
    expect(snapshot.groups.map((g) => g.configKey).sort()).toEqual(['api', 'web'])
    // The owner and the repo are parsed here, not by the query.
    expect(mockFetchOpenIssues).toHaveBeenCalledWith('acme', 'api')
    // The page cap is a cap: the total the repository reported has to survive the trip.
    const group = snapshot.groups[0]
    expect(group.tracker === 'github' && group.totalOpen).toBe(214)
  })

  // A Jira repository no longer sits this page out — it gets a group of its own,
  // read from Jira. What must not happen is its being queried on api.github.com.
  it('does not send a Jira-tracked repository to GitHub', async () => {
    withRepos({ api: githubRepo('api'), billing: jiraRepo('billing') })

    const snapshot = await listOpenIssues()()

    expect(snapshot.groups.map((g) => g.tracker).sort()).toEqual(['github', 'jira'])
    expect(mockFetchOpenIssues).toHaveBeenCalledTimes(1)
    expect(mockFetchOpenIssues).toHaveBeenCalledWith('acme', 'api')
  })

  // `ask` means both sides are configured, and this page cannot put the question to
  // anybody — so it answers with BOTH backlogs rather than with silence. It used to
  // send no group at all, which the page rendered as "nothing open here".
  it('gives a repository the ladder leaves undecided one card per tracker', async () => {
    withRepos({
      api: githubRepo('api'),
      both: githubRepo('both', { plan: { tracker: 'ask' }, jira: { projectKey: 'PROJ' } }),
    })

    const snapshot = await listOpenIssues()()

    expect(snapshot.groups.filter((g) => g.configKey === 'both').map((g) => g.tracker).sort())
      .toEqual(['github', 'jira'])
    // And the GitHub half is a real read, not a placeholder card.
    expect(mockFetchOpenIssues).toHaveBeenCalledWith('acme', 'both')
  })

  // The second half of the same rule. A Jira SITE with no project key is not
  // readable — there is nothing to query — so the repository contributes its GitHub
  // backlog and nothing else. Silently: an empty Jira card next to a full GitHub one
  // would read as "the sprint is empty", which is a claim nothing here can make.
  it('reads only GitHub for an undecided repository whose Jira project key is missing', async () => {
    withRepos({
      partial: githubRepo('partial', { jira: { siteUrl: 'https://acme.atlassian.net/browse/' } }),
    })

    const snapshot = await listOpenIssues()()

    expect(snapshot.groups.map((g) => g.tracker)).toEqual(['github'])
    expect(githubGroupOf(snapshot, 'partial')?.error).toBeUndefined()
    expect(mockFetchSprintIssues).not.toHaveBeenCalled()
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

    expect(await listOpenIssues()()).toEqual({ connected: { github: false, jira: false }, groups: [] })
    expect(mockFetchOpenIssues).not.toHaveBeenCalled()
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

    expect(snapshot.connected.github).toBe(true)
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

    expect(snapshot.connected.github).toBe(true)
    expect(snapshot.groups.find((g) => g.configKey === 'web')?.error)
      .toEqual({ error: 'network', message: 'boom' })
    expect(snapshot.groups.find((g) => g.configKey === 'api')?.issues).toEqual([])
  })
})

describe('tasks:listOpenIssues — the Jira half', () => {
  beforeEach(() => {
    // The two premises this suite adds to the file's: an Atlassian account is
    // connected, unless the test is about not being, and the sprint has a ticket in
    // it, unless the test is about it not having one.
    mockJiraStatus.mockReturnValue({
      connected: true,
      configured: true,
      accountName: 'Ada',
      siteUrl: 'https://acme.atlassian.net',
    })
    mockFetchSprintIssues.mockResolvedValue({ issues: [sprintIssue('PROJ-1')], nextPageToken: null })
  })

  // Acceptance criterion 1.
  it('lists the active sprint of every Jira-tracked repository', async () => {
    withRepos({ billing: jiraRepo('billing'), infra: jiraRepo('infra', { jira: { projectKey: 'INFRA' } }) })

    const snapshot = await listOpenIssues()()

    expect(snapshot.groups.map((g) => g.configKey).sort()).toEqual(['billing', 'infra'])
    // One query per project, resolving the board through `openSprints()` — no board
    // id, and nothing on the `/rest/agile` surface the OAuth scope does not cover.
    expect(mockFetchSprintIssues).toHaveBeenCalledTimes(2)
    expect(mockFetchSprintIssues.mock.calls[0][1]).toMatchObject({
      accessToken: 'atl-access',
      cloudId: 'cloud-1',
      jql: 'project = "PROJ" AND sprint in openSprints() AND statusCategory != Done ORDER BY statusCategory DESC, created DESC',
    })
  })

  it('shows the To Do column and hides what is finished', async () => {
    // In Progress crosses IPC and is narrowed in the renderer, which is the only
    // side that knows who has an agent on what. `done` never leaves this process.
    withRepos({ billing: jiraRepo('billing') })
    mockFetchSprintIssues.mockResolvedValue({
      issues: [
        sprintIssue('PROJ-1', 'new', 'To Do'),
        sprintIssue('PROJ-2', 'indeterminate', 'In Progress'),
        sprintIssue('PROJ-3', 'done', 'Done'),
      ],
      nextPageToken: null,
    })

    const group = jiraGroupOf(await listOpenIssues()(), 'billing')

    expect(group?.issues.map((issue) => issue.key)).toEqual(['PROJ-1', 'PROJ-2'])
    expect(group?.issues[1].statusCategory).toBe('indeterminate')
    // The site's own word for the column, not ours: every Atlassian site renames
    // its statuses, and the reader knows their board by its labels.
    expect(group?.issues[1].statusName).toBe('In Progress')
  })

  // Acceptance criterion 5: a board with no sprint running is not an empty backlog.
  it('says a project has no active sprint, distinctly from having nothing to do', async () => {
    // Both the filtered query AND the probe come back empty: there is no sprint.
    withRepos({ billing: jiraRepo('billing') })
    mockFetchSprintIssues.mockResolvedValue({ issues: [], nextPageToken: null })

    const group = jiraGroupOf(await listOpenIssues()(), 'billing')

    expect(group?.error?.error).toBe('no-active-sprint')
    expect(group?.issues).toEqual([])
  })

  it('reports a sprint whose only tickets are finished as having nothing to do', async () => {
    // The filtered query excludes Done, so a fully-finished sprint answers empty and
    // is indistinguishable from no sprint at all — until the probe, which drops the
    // filter and finds the finished ticket. No error, and an empty list, which the
    // card words as "nothing to do".
    withRepos({ billing: jiraRepo('billing') })
    mockFetchSprintIssues
      .mockResolvedValueOnce({ issues: [], nextPageToken: null })
      .mockResolvedValueOnce({ issues: [sprintIssue('PROJ-9', 'done', 'Done')], nextPageToken: null })

    const group = jiraGroupOf(await listOpenIssues()(), 'billing')

    expect(group?.error).toBeUndefined()
    expect(group?.issues).toEqual([])
    expect(mockFetchSprintIssues).toHaveBeenCalledTimes(2)
    expect(mockFetchSprintIssues.mock.calls[1][1]).toMatchObject({
      jql: 'project = "PROJ" AND sprint in openSprints()',
      maxResults: 1,
    })
  })

  // ── The epic on a sprint row, and the one extra call that colours it ──────
  describe('epics', () => {
    /** The `parent` Jira sends inline on a ticket that belongs to an epic. */
    function withEpic(key: string, epicKey: string, summary: string) {
      const issue = sprintIssue(key)
      return {
        ...issue,
        fields: {
          ...issue.fields,
          parent: { key: epicKey, fields: { summary, issuetype: { name: 'Epic', hierarchyLevel: 1 } } },
        },
      }
    }

    /** A site that has the modern Issue Color field, and nothing else worth naming. */
    function withColorField() {
      mockFetchJiraFields.mockResolvedValue([
        { id: 'customfield_10017', name: 'Issue Color', schema: { custom: 'com.pyxis.greenhopper.jira:jsw-issue-color' } },
      ])
    }

    it('carries each ticket’s epic, and colours it from one extra search', async () => {
      withRepos({ billing: jiraRepo('billing') })
      withColorField()
      mockFetchSprintIssues.mockImplementation(async (_deps: unknown, args: { jql: string }) =>
        args.jql.startsWith('key in')
          ? { issues: [{ key: 'PROJ-100', fields: { customfield_10017: 'green' } }], nextPageToken: null }
          : {
            issues: [withEpic('PROJ-1', 'PROJ-100', 'Remboursement'), withEpic('PROJ-2', 'PROJ-100', 'Remboursement')],
            nextPageToken: null,
          },
      )

      const group = jiraGroupOf(await listOpenIssues()(), 'billing')

      // ONE extra call for the whole card, not one per ticket: the two rows share an
      // epic, and `epicKeys` is what collapses them.
      const colorCalls = mockFetchSprintIssues.mock.calls.filter((call) => call[1].jql.startsWith('key in'))
      expect(colorCalls).toHaveLength(1)
      expect(colorCalls[0][1]).toMatchObject({ jql: 'key in ("PROJ-100")', fields: ['customfield_10017'] })
      expect(group?.issues[0].epic).toEqual({
        key: 'PROJ-100',
        title: 'Remboursement',
        // Built off the same resolved site the TICKET's own link is, so the badge
        // could be made to open the epic in Jira without a second answer to "which
        // site is this".
        url: 'https://acme.atlassian.net/browse/PROJ-100',
        color: '#36B37E',
      })
    })

    it('never asks for a colour when no ticket is in an epic', async () => {
      // The extra call is bounded on both sides: no colour field, or no epic.
      withRepos({ billing: jiraRepo('billing') })
      withColorField()
      mockFetchSprintIssues.mockResolvedValue({ issues: [sprintIssue('PROJ-1')], nextPageToken: null })

      await listOpenIssues()()

      expect(mockFetchSprintIssues).toHaveBeenCalledTimes(1)
    })

    it('never asks for a colour on a site with no colour field', async () => {
      withRepos({ billing: jiraRepo('billing') })
      mockFetchSprintIssues.mockResolvedValue({
        issues: [withEpic('PROJ-1', 'PROJ-100', 'Remboursement')],
        nextPageToken: null,
      })

      const group = jiraGroupOf(await listOpenIssues()(), 'billing')

      expect(mockFetchSprintIssues).toHaveBeenCalledTimes(1)
      // The epic is still on the row — it came inline with the sprint read. Only the
      // dot is missing, which is what `JiraEpic.color` being optional is for.
      expect(group?.issues[0].epic?.title).toBe('Remboursement')
      expect(group?.issues[0].epic).not.toHaveProperty('color')
    })

    it('keeps the card when the colour read fails', async () => {
      // A dot on a badge that already carries the epic's name is not worth turning a
      // readable sprint into an error row for.
      withRepos({ billing: jiraRepo('billing') })
      withColorField()
      mockFetchSprintIssues.mockImplementation(async (_deps: unknown, args: { jql: string }) => {
        if (args.jql.startsWith('key in')) throw new AtlassianApiError('Jira sprint search', 500)
        return { issues: [withEpic('PROJ-1', 'PROJ-100', 'Remboursement')], nextPageToken: null }
      })

      const group = jiraGroupOf(await listOpenIssues()(), 'billing')

      expect(group?.error).toBeUndefined()
      expect(group?.issues[0].epic?.title).toBe('Remboursement')
      expect(group?.issues[0].epic).not.toHaveProperty('color')
    })
  })

  it('does not probe when the sprint has work to show', async () => {
    // The probe is the price of filtering server-side, and it must stay off the
    // common path: one call, not two, whenever the card has anything on it.
    withRepos({ billing: jiraRepo('billing') })
    mockFetchSprintIssues.mockResolvedValue({
      issues: [sprintIssue('PROJ-1', 'new', 'To Do')],
      nextPageToken: null,
    })

    await listOpenIssues()()

    expect(mockFetchSprintIssues).toHaveBeenCalledTimes(1)
  })

  // Acceptance criterion 4.
  it('gives every Jira repository a not-connected group when no account is connected', async () => {
    withRepos({ billing: jiraRepo('billing'), infra: jiraRepo('infra') })
    mockJiraStatus.mockReturnValue({ connected: false, configured: true })

    const snapshot = await listOpenIssues()()

    expect(snapshot.connected.jira).toBe(false)
    expect(snapshot.groups.map((g) => g.error?.error)).toEqual(['not-connected', 'not-connected'])
    // Said per group rather than once for the page, so each card can carry the
    // route to Settings — and never as an empty card, which reads as "no tickets".
    expect(mockFetchSprintIssues).not.toHaveBeenCalled()
  })

  it('treats a credential Atlassian has refused as not connected', async () => {
    // `unverified` is a mark, not a deletion. Reading anyway would earn a 401 per
    // repository and tell the user nothing Settings is not already telling them.
    withRepos({ billing: jiraRepo('billing') })
    mockJiraStatus.mockReturnValue({ connected: true, configured: true, unverified: true })

    const snapshot = await listOpenIssues()()

    expect(snapshot.connected.jira).toBe(false)
    expect(jiraGroupOf(snapshot, 'billing')?.error?.error).toBe('not-connected')
    expect(mockFetchSprintIssues).not.toHaveBeenCalled()
  })

  // The distinction the plan insists on: `withFreshAccessToken()` answers null for a
  // missing credential, a failed refresh AND a dead keychain, so translating it into
  // "reconnect" would tell someone with a perfectly good credential to reconnect.
  it('does not read a null access token as a missing account', async () => {
    withRepos({ billing: jiraRepo('billing') })
    mockWithFreshAccessToken.mockResolvedValue(null)

    const snapshot = await listOpenIssues()()

    expect(jiraGroupOf(snapshot, 'billing')?.error?.error).toBe('offline')
    // The credential IS there; the page must not contradict Settings about it.
    expect(snapshot.connected.jira).toBe(true)
  })

  it('skips a Jira repository with no project key', async () => {
    // The one value the query cannot be built without. Qualified on it rather than
    // on the site host, which no request is ever addressed to.
    withRepos({ billing: repo({ name: 'billing', plan: { tracker: 'jira' } }) })

    expect((await listOpenIssues()()).groups).toEqual([])
    expect(mockFetchSprintIssues).not.toHaveBeenCalled()
  })

  // Acceptance criterion 6.
  it('confines a failing project to its own group', async () => {
    withRepos({ billing: jiraRepo('billing'), infra: jiraRepo('infra', { jira: { projectKey: 'INFRA' } }) })
    mockFetchSprintIssues.mockImplementation(async (_deps: unknown, args: { jql: string }) => {
      if (args.jql.includes('INFRA')) throw new AtlassianApiError('Jira sprint search', 400)
      return { issues: [sprintIssue('PROJ-1')], nextPageToken: null }
    })

    const snapshot = await listOpenIssues()()

    // 400 is the likeliest Jira failure here: a project key that does not exist, or
    // one with no Jira Software in it, where `sprint` is not a field.
    expect(jiraGroupOf(snapshot, 'infra')?.error?.error).toBe('invalid-query')
    expect(jiraGroupOf(snapshot, 'billing')?.issues.map((i) => i.key)).toEqual(['PROJ-1'])
  })

  it('captures a throw that is not an Atlassian failure at all', async () => {
    withRepos({ billing: jiraRepo('billing') })
    mockFetchSprintIssues.mockRejectedValue(new Error('boom'))

    expect(jiraGroupOf(await listOpenIssues()(), 'billing')?.error)
      .toEqual({ error: 'server-error', message: 'boom' })
  })

  it('funnels a 401 through the one place allowed to conclude anything from it', async () => {
    // A 401 has three causes and only one is a revocation; `reportUnauthorized` is
    // what rules out the repairable one (a cloud id that moved) before marking.
    withRepos({ billing: jiraRepo('billing') })
    mockFetchSprintIssues.mockRejectedValue(new AtlassianApiError('Jira sprint search', 401))

    expect(jiraGroupOf(await listOpenIssues()(), 'billing')?.error?.error).toBe('unauthorized')
    expect(mockReportUnauthorized).toHaveBeenCalledTimes(1)
  })

  it('marks a sprint that did not fit in one page', async () => {
    // Jira's search returns no `total`, so "50 of 214" cannot be said — only that
    // there is another page.
    withRepos({ billing: jiraRepo('billing') })
    mockFetchSprintIssues.mockResolvedValue({ issues: [sprintIssue('PROJ-1')], nextPageToken: 'next' })

    expect(jiraGroupOf(await listOpenIssues()(), 'billing')?.truncated).toBe(true)
  })

  it('builds the browse link from the repository’s own site, then the credential’s', async () => {
    withRepos({
      // Configured as a browse BASE, which is how the settings form stores it.
      billing: jiraRepo('billing', { jira: { projectKey: 'PROJ', siteUrl: 'https://own.atlassian.net/browse/' } }),
      infra: jiraRepo('infra'),
    })
    const snapshot = await listOpenIssues()()

    expect(jiraGroupOf(snapshot, 'billing')?.issues[0].url).toBe('https://own.atlassian.net/browse/PROJ-1')
    // No site on the repository: the connected account's own site is the fallback,
    // because `url` drives the row's Open and Copy buttons.
    expect(jiraGroupOf(snapshot, 'infra')?.issues[0].url).toBe('https://acme.atlassian.net/browse/PROJ-1')
  })

  // Acceptance criterion 3: the page no longer short-circuits on the GitHub token.
  it('shows a Jira-only user their sprint with no GitHub CLI at all', async () => {
    mockGetGitHubToken.mockReturnValue(null)
    withRepos({ billing: jiraRepo('billing') })

    const snapshot = await listOpenIssues()()

    expect(snapshot.connected).toEqual({ github: false, jira: true })
    expect(jiraGroupOf(snapshot, 'billing')?.issues.map((i) => i.key)).toEqual(['PROJ-1'])
  })

  it('reads a project at most once per refresh floor', async () => {
    // The page has no poller, but Reload does not rate-limit itself: opening and
    // closing the modal three times must not be three round trips per project.
    withRepos({ billing: jiraRepo('billing') })
    const handler = listOpenIssues()

    await handler()
    await handler()

    expect(mockFetchSprintIssues).toHaveBeenCalledTimes(1)
  })

  it('does not cache a failure', async () => {
    // A failure is usually something the reader is in the middle of fixing, and a
    // Reload answering from a stale one would look like the fix had not worked.
    withRepos({ billing: jiraRepo('billing') })
    mockFetchSprintIssues.mockRejectedValue(new AtlassianApiError('Jira sprint search', 500))
    const handler = listOpenIssues()

    await handler()
    await handler()

    expect(mockFetchSprintIssues).toHaveBeenCalledTimes(2)
  })
})

describe('tasks:getIssueDetail', () => {
  beforeEach(() => {
    mockFetchIssueDetail.mockResolvedValue(detail())
  })

  it('resolves the repository’s config key to an owner and a repo', async () => {
    // The renderer sends the key it drew the row from, never a URL: the parsing —
    // and the host check inside it — stays on this side of the bridge.
    withRepos({ api: githubRepo('api'), web: githubRepo('web') })

    expect(await getIssueDetail()({ configKey: 'web', number: 234 })).toEqual(detail())
    expect(mockFetchIssueDetail).toHaveBeenCalledWith('acme', 'web', 234)
  })

  it('follows the explicit issues URL, like the list read does', async () => {
    withRepos({
      api: githubRepo('api', { issues: { githubIssuesUrl: 'https://github.com/acme/tracker/issues' } }),
    })

    await getIssueDetail()({ configKey: 'api', number: 12 })

    expect(mockFetchIssueDetail).toHaveBeenCalledWith('acme', 'tracker', 12)
  })

  it('answers that there is no token without reading the config', async () => {
    mockGetGitHubToken.mockReturnValue(null)
    withRepos({ api: githubRepo('api') })

    const result = await getIssueDetail()({ configKey: 'api', number: 234 })

    expect(result).toEqual({ error: 'no-token', message: expect.stringContaining('gh auth login') })
    expect(mockFetchIssueDetail).not.toHaveBeenCalled()
    expect(mockReadConfig).not.toHaveBeenCalled()
  })

  // The config can change between the list read and the click — a repository
  // renamed, deleted, or switched to Jira. Querying api.github.com anyway would
  // ask about a repository this app no longer tracks there.
  it('reports a key that is no longer a GitHub-tracked repository as not-found', async () => {
    withRepos({ billing: repo({ name: 'billing', plan: { tracker: 'jira' }, jira: { projectKey: 'PROJ' } }) })

    expect(await getIssueDetail()({ configKey: 'billing', number: 234 }))
      .toEqual({ error: 'not-found', message: expect.stringContaining('billing') })
    expect(mockFetchIssueDetail).not.toHaveBeenCalled()
  })

  it('passes the read’s own failure straight through', async () => {
    // The panel renders the same five named failures the repository cards do, so
    // the handler must not flatten them into one.
    withRepos({ api: githubRepo('api') })
    mockFetchIssueDetail.mockResolvedValue({ error: 'rate-limited', message: 'slow down' })

    expect(await getIssueDetail()({ configKey: 'api', number: 234 }))
      .toEqual({ error: 'rate-limited', message: 'slow down' })
  })

  // The payload crosses the bridge, so its shape is an assumption rather than a
  // guarantee: the annotation on the handler is erased at runtime. Each of these
  // reached a dereference or api.github.com before the guard existed.
  it.each([
    ['no payload at all', undefined],
    ['a payload that is not an object', 'api'],
    ['a missing config key', { number: 234 }],
    ['a blank config key', { configKey: '', number: 234 }],
    ['an issue number that is not a number', { configKey: 'api', number: '234' }],
    ['an issue number that is not an integer', { configKey: 'api', number: 23.4 }],
    ['an issue number that is NaN', { configKey: 'api', number: Number.NaN }],
  ])('refuses %s without reading the config or the network', async (_label, args) => {
    withRepos({ api: githubRepo('api') })

    expect(await getIssueDetail()(args)).toEqual({
      error: 'not-found',
      message: expect.stringContaining('Malformed'),
    })
    expect(mockFetchIssueDetail).not.toHaveBeenCalled()
    expect(mockReadConfig).not.toHaveBeenCalled()
  })

  it('captures an unexpected throw instead of rejecting at the panel', async () => {
    withRepos({ api: githubRepo('api') })
    mockFetchIssueDetail.mockRejectedValue(new Error('boom'))

    expect(await getIssueDetail()({ configKey: 'api', number: 234 }))
      .toEqual({ error: 'network', message: 'boom' })
  })
})

describe('tasks:getJiraIssueDetail', () => {
  beforeEach(() => {
    // A connected, verified Atlassian account: the premise every test here but the
    // credential ones starts from.
    mockJiraStatus.mockReturnValue({ connected: true, configured: true, siteUrl: 'https://acme.atlassian.net' })
    mockFetchJiraIssue.mockResolvedValue(rawJiraIssue())
  })

  it('reads the ticket for the repository’s configured project', async () => {
    // The renderer sends the key it drew the row from, never a site or a cloud id:
    // both are the main process's business, and only it holds the credential.
    withRepos({ api: githubRepo('api'), billing: jiraRepo('billing') })

    expect(await getJiraIssueDetail()({ configKey: 'billing', key: 'PROJ-42' })).toEqual({
      description: 'Body',
      assignee: 'Ada Lovelace',
      labels: ['backend'],
      statusName: 'In Progress',
      statusCategory: 'indeterminate',
      comments: [],
    })
    expect(mockFetchJiraIssue).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      accessToken: 'atl-access',
      cloudId: 'cloud-1',
      key: 'PROJ-42',
      fields: [
        'description', 'status', 'priority', 'assignee', 'reporter', 'creator', 'labels', 'comment',
      ],
    }))
  })

  it('re-reads the status rather than trusting the one the row carried', async () => {
    // The row may have been listed minutes ago. A ticket somebody transitioned since
    // must not go on showing the word the list captured.
    withRepos({ billing: jiraRepo('billing') })
    mockFetchJiraIssue.mockResolvedValue(rawJiraIssue({ status: { name: 'Done', statusCategory: { key: 'done' } } }))

    expect(await getJiraIssueDetail()({ configKey: 'billing', key: 'PROJ-42' }))
      .toMatchObject({ statusName: 'Done', statusCategory: 'done' })
  })

  // The payload crosses the bridge, so its shape is an assumption rather than a
  // guarantee: the annotation on the handler is erased at runtime.
  it.each([
    ['no payload at all', undefined],
    ['a payload that is not an object', 'billing'],
    ['a missing config key', { key: 'PROJ-42' }],
    ['a blank config key', { configKey: '', key: 'PROJ-42' }],
    ['a key that is not a string', { configKey: 'billing', key: 42 }],
    ['a key that is not shaped like a Jira key', { configKey: 'billing', key: 'not a key' }],
    ['a key carrying a path separator', { configKey: 'billing', key: '../myself' }],
    ['a key carrying a control character', { configKey: 'billing', key: 'PROJ-42\n' }],
  ])('refuses %s without reading the config or the network', async (_label, args) => {
    withRepos({ billing: jiraRepo('billing') })

    expect(await getJiraIssueDetail()(args)).toEqual({
      error: 'not-found',
      message: expect.stringContaining('Malformed'),
    })
    expect(mockFetchJiraIssue).not.toHaveBeenCalled()
    expect(mockReadConfig).not.toHaveBeenCalled()
  })

  it('says the Atlassian account is not connected before spending a token refresh', async () => {
    mockJiraStatus.mockReturnValue({ connected: false, configured: true })
    withRepos({ billing: jiraRepo('billing') })

    expect(await getJiraIssueDetail()({ configKey: 'billing', key: 'PROJ-42' }))
      .toEqual({ error: 'not-connected', message: expect.any(String) })
    expect(mockWithFreshAccessToken).not.toHaveBeenCalled()
    expect(mockFetchJiraIssue).not.toHaveBeenCalled()
  })

  it('treats an unverified credential as not connected', async () => {
    // Atlassian refused it the last time it was used, and Settings is already
    // offering Reconnect. Sending the read anyway earns a 401 and says nothing new.
    mockJiraStatus.mockReturnValue({ connected: true, configured: true, unverified: true })
    withRepos({ billing: jiraRepo('billing') })

    expect(await getJiraIssueDetail()({ configKey: 'billing', key: 'PROJ-42' }))
      .toMatchObject({ error: 'not-connected' })
  })

  it('reports no usable token as offline, not as a disconnected account', async () => {
    // A null from `withFreshAccessToken` is a missing credential, a refresh that
    // failed, or a keychain that has gone away — and the check above has already
    // established that a verified credential is stored. Telling someone to reconnect
    // an account that is fine is the failure this split exists to avoid.
    mockWithFreshAccessToken.mockResolvedValue(null)
    withRepos({ billing: jiraRepo('billing') })

    expect(await getJiraIssueDetail()({ configKey: 'billing', key: 'PROJ-42' }))
      .toEqual({ error: 'offline', message: expect.any(String) })
    expect(mockFetchJiraIssue).not.toHaveBeenCalled()
  })

  // The config can change between the list read and the click — a repository
  // renamed, deleted, or switched to GitHub.
  it('reports a key that is no longer a Jira-tracked repository as not-found', async () => {
    withRepos({ api: githubRepo('api') })

    expect(await getJiraIssueDetail()({ configKey: 'api', key: 'PROJ-42' }))
      .toEqual({ error: 'not-found', message: expect.stringContaining('api') })
    expect(mockFetchJiraIssue).not.toHaveBeenCalled()
  })

  it('classifies a failed read on the sprint read’s own ladder', async () => {
    // One Jira failure, one name, one sentence — wherever it is met. `classify`
    // lives in `sprint-issues.ts` and is imported from there rather than copied.
    withRepos({ billing: jiraRepo('billing') })
    for (const [status, code] of [[400, 'invalid-query'], [403, 'forbidden'], [404, 'not-found'], [0, 'offline']] as const) {
      mockFetchJiraIssue.mockRejectedValue(new AtlassianApiError('Jira issue read', status))
      expect(await getJiraIssueDetail()({ configKey: 'billing', key: 'PROJ-42' }))
        .toMatchObject({ error: code })
    }
  })

  it('reports a 401 and asks for the credential to be re-checked', async () => {
    withRepos({ billing: jiraRepo('billing') })
    mockFetchJiraIssue.mockRejectedValue(new AtlassianApiError('Jira issue read', 401))

    expect(await getJiraIssueDetail()({ configKey: 'billing', key: 'PROJ-42' }))
      .toMatchObject({ error: 'unauthorized' })
    expect(mockReportUnauthorized).toHaveBeenCalledTimes(1)
  })

  it('captures an unexpected throw instead of rejecting at the panel', async () => {
    withRepos({ billing: jiraRepo('billing') })
    mockFetchJiraIssue.mockRejectedValue(new Error('boom'))

    expect(await getJiraIssueDetail()({ configKey: 'billing', key: 'PROJ-42' }))
      .toEqual({ error: 'server-error', message: 'boom' })
  })
})
