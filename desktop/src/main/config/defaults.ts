import type { RepositoryConfig } from '../../types'

export const DEFAULT_REPOSITORY_FIELDS: Omit<RepositoryConfig, 'path' | 'keywords'> = {
  color: '#3B82F6',
  languages: {
    commit: 'en',
    pullRequest: 'en',
    jiraComment: 'en',
    discussion: 'en'
  },
  commit: {
    style: 'single-line',
    format: 'angular',
    coAuthor: true,
    includeTicketId: true
  },
  resolve: {
    commitMode: 'new',
    format: 'angular',
    style: 'single-line',
    useCommitConfig: true,
    replyToComments: true,
    replyLanguage: 'en'
  },
  pullRequest: {
    autoLinkTickets: true
  },
  issues: {
    commentOnPR: true,
    jiraUrl: '',
    githubIssuesUrl: ''
  },
  branches: {
    development: ''
  },
  worktreeFiles: []
}
