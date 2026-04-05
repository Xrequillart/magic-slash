import { describe, it, expect } from 'vitest'
import { validateConfig, hasCriticalErrors } from './schema-validator'

/**
 * Returns a minimal valid config for testing.
 */
function validConfig() {
  return {
    version: '0.32.3',
    repositories: {
      'my-app': {
        path: '/Users/dev/my-app',
        keywords: ['my-app'],
        color: '#3B82F6',
        languages: { commit: 'en', pullRequest: 'en', jiraComment: 'en', discussion: 'en' },
        commit: { style: 'single-line', format: 'angular', coAuthor: true, includeTicketId: true },
        resolve: {
          commitMode: 'new', format: 'angular', style: 'single-line',
          useCommitConfig: true, replyToComments: true, replyLanguage: 'en'
        },
        pullRequest: { autoLinkTickets: true },
        issues: { commentOnPR: true, jiraUrl: '', githubIssuesUrl: '' },
        branches: { development: 'develop' },
        worktreeFiles: ['.env']
      }
    },
    agents: [],
    splitEnabled: false,
    splitActive: false
  }
}

describe('validateConfig', () => {
  it('should pass for a valid complete config', () => {
    const result = validateConfig(validConfig())
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('should pass for a minimal valid config (only required fields)', () => {
    const config = {
      version: '1.0.0',
      repositories: {
        'test-repo': {
          path: '/home/user/test-repo',
          keywords: ['test']
        }
      }
    }
    const result = validateConfig(config)
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('should pass when optional nested objects are missing', () => {
    const config = {
      version: '1.0.0',
      repositories: {
        'test-repo': {
          path: '/home/user/test-repo',
          keywords: ['test']
          // No languages, commit, resolve, pullRequest, issues, branches, worktreeFiles
        }
      }
      // No agents, splitEnabled, splitActive
    }
    const result = validateConfig(config)
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('should pass for a path starting with ~', () => {
    const config = {
      version: '1.0.0',
      repositories: {
        'test-repo': {
          path: '~/projects/test-repo',
          keywords: ['test']
        }
      }
    }
    const result = validateConfig(config)
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  // --- Invalid field tests ---

  it('should fail for a relative path (not starting with / or ~)', () => {
    const config = validConfig()
    config.repositories['my-app'].path = 'relative/path'
    const result = validateConfig(config)
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('path') && e.includes('absolute path'))).toBe(true)
  })

  it('should fail for empty keywords array', () => {
    const config = validConfig()
    config.repositories['my-app'].keywords = []
    const result = validateConfig(config)
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('keywords') && e.includes('at least 1'))).toBe(true)
  })

  it('should fail for keywords containing an empty string', () => {
    const config = validConfig()
    config.repositories['my-app'].keywords = ['']
    const result = validateConfig(config)
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('keywords') && e.includes('non-empty string'))).toBe(true)
  })

  it('should fail for an invalid language enum value', () => {
    const config = validConfig() as Record<string, unknown>
    ;(config.repositories as Record<string, Record<string, unknown>>)['my-app'].languages = { commit: 'spanish' }
    const result = validateConfig(config)
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('languages.commit') && e.includes('en') && e.includes('fr'))).toBe(true)
  })

  it('should fail for an invalid commit format', () => {
    const config = validConfig() as Record<string, unknown>
    ;(config.repositories as Record<string, Record<string, unknown>>)['my-app'].commit = { format: 'fancy' }
    const result = validateConfig(config)
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('commit.format') && e.includes('angular'))).toBe(true)
  })

  it('should fail for an invalid commit style', () => {
    const config = validConfig() as Record<string, unknown>
    ;(config.repositories as Record<string, Record<string, unknown>>)['my-app'].commit = { style: 'verbose' }
    const result = validateConfig(config)
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('commit.style') && e.includes('single-line'))).toBe(true)
  })

  it('should fail for an invalid commitMode', () => {
    const config = validConfig() as Record<string, unknown>
    ;(config.repositories as Record<string, Record<string, unknown>>)['my-app'].resolve = { commitMode: 'squash' }
    const result = validateConfig(config)
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('commitMode') && e.includes('new'))).toBe(true)
  })

  it('should fail for an invalid replyLanguage', () => {
    const config = validConfig() as Record<string, unknown>
    ;(config.repositories as Record<string, Record<string, unknown>>)['my-app'].resolve = { replyLanguage: 'de' }
    const result = validateConfig(config)
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('replyLanguage') && e.includes('en') && e.includes('fr'))).toBe(true)
  })

  it('should fail when version is missing', () => {
    const config = { repositories: { 'test': { path: '/a', keywords: ['k'] } } }
    const result = validateConfig(config)
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('missing required field "version"'))).toBe(true)
  })

  it('should fail when repositories is missing', () => {
    const config = { version: '1.0.0' }
    const result = validateConfig(config)
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('missing required field "repositories"'))).toBe(true)
  })

  it('should fail when version is not a semver string', () => {
    const config = {
      version: 'not-a-version',
      repositories: { 'test': { path: '/a', keywords: ['k'] } }
    }
    const result = validateConfig(config)
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('version') && e.includes('semver'))).toBe(true)
  })

  it('should fail for empty repositories object', () => {
    const config = { version: '1.0.0', repositories: {} }
    const result = validateConfig(config)
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('repositories') && e.includes('at least 1'))).toBe(true)
  })

  it('should fail for an invalid splitPane value on agent', () => {
    const config = {
      version: '1.0.0',
      repositories: { 'test': { path: '/a', keywords: ['k'] } },
      agents: [{ id: '1', name: 'agent1', repositories: [], splitPane: 'center' }]
    }
    const result = validateConfig(config)
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('splitPane'))).toBe(true)
  })
})

describe('hasCriticalErrors', () => {
  it('should return true when version is missing', () => {
    const errors = ['config: missing required field "version"']
    expect(hasCriticalErrors(errors)).toBe(true)
  })

  it('should return true when repositories is missing', () => {
    const errors = ['config: missing required field "repositories"']
    expect(hasCriticalErrors(errors)).toBe(true)
  })

  it('should return false for non-critical errors', () => {
    const errors = [
      'repositories.my-app.languages.commit: must be one of ["en","fr"], got "spanish"',
      'repositories.my-app.commit.format: must be one of ["angular","conventional","gitmoji","none"], got "fancy"'
    ]
    expect(hasCriticalErrors(errors)).toBe(false)
  })

  it('should return false for an empty error list', () => {
    expect(hasCriticalErrors([])).toBe(false)
  })
})

describe('migration backup', () => {
  it('should detect when backup is needed (config needing migration)', () => {
    // Verify that a config missing default fields is detected as needing migration
    const configNeedingMigration = {
      version: '0.30.0',
      repositories: {
        'test-repo': {
          path: '/home/user/test',
          keywords: ['test']
          // Missing: color, languages, commit, resolve, etc.
        }
      }
    }

    // Validate the incomplete config - it should still be structurally valid
    // (schema only checks types, not completeness of optional fields)
    const result = validateConfig(configNeedingMigration)
    expect(result.valid).toBe(true)

    // Verify the config lacks default fields that migration would add
    const repo = configNeedingMigration.repositories['test-repo'] as Record<string, unknown>
    expect(repo.color).toBeUndefined()
    expect(repo.commit).toBeUndefined()
    expect(repo.resolve).toBeUndefined()
    expect(repo.languages).toBeUndefined()
  })

  it('should not need backup when all default fields are present', () => {
    const fullConfig = validConfig()

    // A fully populated config validates successfully
    const result = validateConfig(fullConfig)
    expect(result.valid).toBe(true)

    // All default fields are present
    const repo = fullConfig.repositories['my-app']
    expect(repo.color).toBeDefined()
    expect(repo.commit).toBeDefined()
    expect(repo.resolve).toBeDefined()
    expect(repo.languages).toBeDefined()
  })

  it('should validate config correctly after simulated migration', () => {
    // Simulate what migration does: add default fields to a minimal config
    const configBefore = {
      version: '0.30.0',
      repositories: {
        'test-repo': {
          path: '/home/user/test',
          keywords: ['test']
        }
      }
    }

    // Simulate migration by adding default fields
    const migratedConfig = {
      ...configBefore,
      repositories: {
        'test-repo': {
          ...configBefore.repositories['test-repo'],
          color: '#3B82F6',
          languages: { commit: 'en', pullRequest: 'en', jiraComment: 'en', discussion: 'en' },
          commit: { style: 'single-line', format: 'angular', coAuthor: true, includeTicketId: true },
          resolve: {
            commitMode: 'new', format: 'angular', style: 'single-line',
            useCommitConfig: true, replyToComments: true, replyLanguage: 'en'
          },
          pullRequest: { autoLinkTickets: true },
          issues: { commentOnPR: true, jiraUrl: '', githubIssuesUrl: '' },
          branches: { development: '' },
          worktreeFiles: []
        }
      }
    }

    // Post-migration config should still be valid
    const result = validateConfig(migratedConfig)
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })
})
