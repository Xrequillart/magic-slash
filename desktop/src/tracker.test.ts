import { describe, it, expect } from 'vitest'
import { resolveGitHubIssuesUrl, resolveJiraProject, resolveJiraSite } from './tracker'

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
