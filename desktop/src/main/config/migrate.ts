import { readConfig, writeConfig, createDefaultMetadata } from './config'
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

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function deepMergeDefaults(defaults: Record<string, unknown>, existing: Record<string, unknown>): Record<string, unknown> {
  const result = { ...existing }
  for (const key of Object.keys(defaults)) {
    const defVal = defaults[key]
    const resVal = result[key]
    if (!(key in result)) {
      result[key] = isPlainObject(defVal) ? { ...defVal } : defVal
    } else if (isPlainObject(defVal) && isPlainObject(resVal)) {
      result[key] = deepMergeDefaults(defVal, resVal)
    }
  }
  return result
}

export function migrateConfig(): boolean {
  const config = readConfig()
  let changed = false

  // Migrate repositories
  if (config.repositories) {
    for (const name of Object.keys(config.repositories)) {
      const repo = config.repositories[name]
      const merged = deepMergeDefaults(DEFAULT_REPOSITORY_FIELDS as Record<string, unknown>, repo as Record<string, unknown>) as RepositoryConfig
      if (JSON.stringify(merged) !== JSON.stringify(repo)) {
        config.repositories[name] = merged
        changed = true
      }
    }
  }

  // Migrate agents
  if (config.agents && Array.isArray(config.agents)) {
    for (const agent of config.agents) {
      if (!agent.repositories) {
        agent.repositories = []
        changed = true
      }
      const defaultMeta = createDefaultMetadata()
      const mergedMeta = { ...defaultMeta, ...agent.metadata }
      if (JSON.stringify(mergedMeta) !== JSON.stringify(agent.metadata)) {
        agent.metadata = mergedMeta
        changed = true
      }
    }
  }

  if (changed) {
    writeConfig(config)
  }

  return changed
}
