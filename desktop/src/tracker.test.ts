import { describe, it, expect } from 'vitest'
import { resolveGitHubIssuesUrl, resolveJiraProject, resolveJiraSite, resolveTracker } from './tracker'

const SITE = 'https://acme.atlassian.net/browse/'
const LEGACY_SITE = 'https://legacy.atlassian.net/browse/'

describe('resolveJiraSite', () => {
  it('prefers the jira block', () => {
    expect(resolveJiraSite({ jira: { siteUrl: SITE }, issues: { jiraUrl: LEGACY_SITE } })).toBe(SITE)
  })

  it('falls back to the legacy issues.jiraUrl', () => {
    expect(resolveJiraSite({ issues: { jiraUrl: LEGACY_SITE } })).toBe(LEGACY_SITE)
  })

  // '' is what a cleared text input sends and what DEFAULT_REPOSITORY_FIELDS
  // materialises, so it must fall THROUGH rather than win — otherwise every repo
  // that has never opened the new field loses the URL it was configured with.
  it('treats an empty new key as unset', () => {
    expect(resolveJiraSite({ jira: { siteUrl: '' }, issues: { jiraUrl: LEGACY_SITE } })).toBe(LEGACY_SITE)
  })

  it('returns an empty string when nothing is configured', () => {
    expect(resolveJiraSite({})).toBe('')
    expect(resolveJiraSite(undefined)).toBe('')
    expect(resolveJiraSite(null)).toBe('')
  })
})

describe('resolveJiraProject', () => {
  it('prefers the jira block', () => {
    expect(resolveJiraProject({ jira: { projectKey: 'NEW' }, plan: { jiraProject: 'OLD' } })).toBe('NEW')
  })

  it('falls back to the legacy plan.jiraProject', () => {
    expect(resolveJiraProject({ plan: { jiraProject: 'OLD' } })).toBe('OLD')
  })

  it('treats an empty new key as unset', () => {
    expect(resolveJiraProject({ jira: { projectKey: '' }, plan: { jiraProject: 'OLD' } })).toBe('OLD')
  })

  it('returns an empty string when nothing is configured', () => {
    expect(resolveJiraProject({})).toBe('')
    expect(resolveJiraProject(undefined)).toBe('')
  })
})

describe('resolveGitHubIssuesUrl', () => {
  // The override means "the issues are NOT in the repo the code lives in", so it
  // has to beat the remote — deriving anyway would file tickets in the wrong repo.
  it('prefers the configured override over the remote', () => {
    expect(resolveGitHubIssuesUrl({
      issues: { githubIssuesUrl: 'https://github.com/acme/tracker/issues/' },
      remoteUrl: 'https://github.com/acme/api',
    })).toBe('https://github.com/acme/tracker/issues')
  })

  it('derives from the remote when no override is set', () => {
    expect(resolveGitHubIssuesUrl({ remoteUrl: 'https://github.com/acme/api' }))
      .toBe('https://github.com/acme/api/issues')
  })

  it('returns an empty string with neither an override nor a remote', () => {
    expect(resolveGitHubIssuesUrl({})).toBe('')
    expect(resolveGitHubIssuesUrl({ remoteUrl: null })).toBe('')
    expect(resolveGitHubIssuesUrl(undefined)).toBe('')
  })

  // Consumers append `/{number}`, so a trailing slash on either the configured or
  // the derived form would produce `.../issues//196`.
  it('never returns a trailing slash', () => {
    expect(resolveGitHubIssuesUrl({ issues: { githubIssuesUrl: 'https://github.com/acme/api/issues//' } }))
      .toBe('https://github.com/acme/api/issues')
  })
})

describe('resolveTracker', () => {
  const GITHUB_REMOTE = 'https://github.com/acme/api'

  it('honours an explicit choice over everything else', () => {
    // Row 1. A repo can keep a Jira site for links and still file new tickets on
    // GitHub — the explicit value is the answer, not a hint.
    expect(resolveTracker({ plan: { tracker: 'github' }, jira: { projectKey: 'PROJ' } })).toBe('github')
    expect(resolveTracker({ plan: { tracker: 'jira' }, remoteUrl: GITHUB_REMOTE })).toBe('jira')
  })

  it('picks the only side that is configured', () => {
    // Row 2, both ways round.
    expect(resolveTracker({ plan: { tracker: 'ask' }, remoteUrl: GITHUB_REMOTE })).toBe('github')
    expect(resolveTracker({ plan: { tracker: 'ask' }, jira: { projectKey: 'PROJ' } })).toBe('jira')
  })

  // The site alone is enough to call a repo Jira-destined. Requiring a project key
  // would send it down the GitHub row and file its tickets in the wrong backlog.
  it('counts a Jira site with no project key as Jira', () => {
    expect(resolveTracker({ plan: { tracker: 'ask' }, jira: { siteUrl: SITE } })).toBe('jira')
    expect(resolveTracker({ plan: { tracker: 'ask' }, issues: { jiraUrl: LEGACY_SITE } })).toBe('jira')
  })

  it('stays undecided when both sides are configured', () => {
    // Row 3: only a human can answer this one, and a page cannot ask.
    expect(resolveTracker({
      plan: { tracker: 'ask' },
      jira: { projectKey: 'PROJ' },
      remoteUrl: GITHUB_REMOTE,
    })).toBe('ask')
  })

  it('reads a GitHub remote as GitHub, in whatever form it was captured', () => {
    // Row 4, in both shapes the remote is stored in.
    expect(resolveTracker({ plan: { tracker: 'ask' }, remoteUrl: 'git@github.com:acme/api.git' })).toBe('github')
    expect(resolveTracker({ plan: { tracker: 'ask' }, remoteUrl: GITHUB_REMOTE })).toBe('github')
  })

  // resolveGitHubIssuesUrl() appends /issues to ANY remote, so qualifying row 4 on
  // it would call a GitLab clone GitHub, query github.com for a repo that is not
  // there, and leave a permanent "not found" card on the Tasks page.
  it('does not read a non-GitHub remote as GitHub', () => {
    expect(resolveTracker({ plan: { tracker: 'ask' }, remoteUrl: 'https://gitlab.com/acme/api' })).toBe('ask')
    expect(resolveTracker({ plan: { tracker: 'ask' }, remoteUrl: 'git@bitbucket.org:acme/api.git' })).toBe('ask')
  })

  // A repo hosted elsewhere but tracked in Jira is Jira-destined, not ambiguous:
  // there is no GitHub side for the question to be about.
  it('picks Jira for a non-GitHub remote with Jira coordinates', () => {
    expect(resolveTracker({
      plan: { tracker: 'ask' },
      jira: { projectKey: 'PROJ' },
      remoteUrl: 'https://gitlab.com/acme/api',
    })).toBe('jira')
  })

  // A separate tracker repository is a real configuration: the override points at
  // github.com, so the repo IS on GitHub whatever its code remote says.
  it('honours a github.com githubIssuesUrl override on a non-GitHub remote', () => {
    expect(resolveTracker({
      plan: { tracker: 'ask' },
      issues: { githubIssuesUrl: 'https://github.com/acme/tracker/issues' },
      remoteUrl: 'https://gitlab.com/acme/api',
    })).toBe('github')
  })

  // A GitHub Enterprise host is NOT supported by the Tasks page: github-issues.ts
  // posts to api.github.com and nowhere else, so answering `github` here would query
  // the wrong host and leave a permanent, untrue "Repository not found" card.
  it('does not read a non-github.com issues host as GitHub', () => {
    expect(resolveTracker({
      plan: { tracker: 'ask' },
      issues: { githubIssuesUrl: 'https://github.acme-corp.com/acme/api/issues' },
      remoteUrl: 'https://gitlab.com/acme/api',
    })).toBe('ask')
    // With Jira coordinates it is Jira-destined, not ambiguous — the GHE override
    // is not a GitHub side for the question to be about.
    expect(resolveTracker({
      plan: { tracker: 'ask' },
      jira: { projectKey: 'PROJ' },
      issues: { githubIssuesUrl: 'https://github.acme-corp.com/acme/api/issues' },
      remoteUrl: 'https://gitlab.com/acme/api',
    })).toBe('jira')
  })

  it('asks when nothing resolves at all', () => {
    // Row 5, and the shape a brand-new repository arrives in.
    expect(resolveTracker({ plan: { tracker: 'ask' } })).toBe('ask')
    expect(resolveTracker({})).toBe('ask')
    expect(resolveTracker(undefined)).toBe('ask')
  })

  it('treats empty strings as unset, like every other chain here', () => {
    expect(resolveTracker({ plan: { tracker: '' }, jira: { projectKey: '', siteUrl: '' }, remoteUrl: '' })).toBe('ask')
    expect(resolveTracker({ plan: { tracker: '' }, jira: { projectKey: '' }, remoteUrl: GITHUB_REMOTE })).toBe('github')
  })
})
