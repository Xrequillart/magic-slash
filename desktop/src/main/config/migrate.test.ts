import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

let tmpDir: string
let configFile: string
let agentsFile: string

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'migrate-test-'))
  configFile = path.join(tmpDir, 'config.json')
  agentsFile = path.join(tmpDir, 'agents.json')
})

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true })
  vi.restoreAllMocks()
})

function writeConfigFile(data: unknown): void {
  fs.writeFileSync(configFile, JSON.stringify(data, null, 2))
}

function readConfigFile(): unknown {
  return JSON.parse(fs.readFileSync(configFile, 'utf8'))
}

function writeAgentsJsonFile(data: unknown): void {
  fs.writeFileSync(agentsFile, JSON.stringify(data, null, 2))
}

function readAgentsJsonFile(): unknown {
  return JSON.parse(fs.readFileSync(agentsFile, 'utf8'))
}

/**
 * A minimal valid config for migration tests.
 */
function minimalConfig(overrides: Record<string, unknown> = {}) {
  return {
    version: '0.32.0',
    repositories: {
      'test-repo': {
        path: '/home/user/test-repo',
        keywords: ['test'],
        color: '#3B82F6',
        languages: { commit: 'en', pullRequest: 'en', jiraComment: 'en', discussion: 'en' },
        commit: { style: 'single-line', format: 'angular', coAuthor: true, includeTicketId: true },
        resolve: {
          commitMode: 'new', format: 'angular', style: 'single-line',
          useCommitConfig: true, replyToComments: true, replyLanguage: 'en',
        },
        pullRequest: { autoLinkTickets: true },
        issues: { commentOnPR: true, jiraUrl: '', githubIssuesUrl: '' },
        branches: { development: '' },
        worktreeFiles: [],
      },
    },
    splitEnabled: false,
    splitActive: false,
    ...overrides,
  }
}

describe('migrateConfig — agents migration', () => {
  let migrateConfig: typeof import('./migrate').migrateConfig

  beforeEach(async () => {
    // Mock config module to point to our temp dir
    vi.doMock('./config', () => ({
      CONFIG_DIR: tmpDir,
      CONFIG_FILE: configFile,
      readConfig: () => {
        try {
          return JSON.parse(fs.readFileSync(configFile, 'utf8'))
        } catch {
          return { version: 'unknown', repositories: {}, splitEnabled: false, splitActive: false }
        }
      },
      writeConfig: (config: unknown) => {
        fs.writeFileSync(configFile, JSON.stringify(config, null, 2))
      },
      filterValidRepositories: (repos: string[]) => repos,
    }))

    // Mock agents module to use our temp dir
    vi.doMock('./agents', () => ({
      writeAgents: (agents: unknown[]) => {
        fs.writeFileSync(agentsFile, JSON.stringify(agents, null, 2))
      },
      AGENTS_FILE: agentsFile,
    }))

    // Mock schema-validator to always pass
    vi.doMock('./schema-validator', () => ({
      validateConfig: () => ({ valid: true, errors: [] }),
      hasCriticalErrors: () => false,
    }))

    // Mock defaults
    const VALID_SHORTCUTS = [
      'Control+Space', 'Control+Shift+Space', 'Alt+Space', 'Alt+Shift+Space',
      'Control+M', 'Control+Shift+M', 'Alt+M', 'Alt+Shift+M',
    ]
    const mockDefaultSpotlight = { enabled: true, shortcut: 'Control+Space' }
    vi.doMock('./defaults', () => ({
      DEFAULT_REPOSITORY_FIELDS: {
        color: '#3B82F6',
        languages: { commit: 'en', pullRequest: 'en', jiraComment: 'en', discussion: 'en' },
        commit: { style: 'single-line', format: 'angular', coAuthor: true, includeTicketId: true },
        resolve: {
          commitMode: 'new', format: 'angular', style: 'single-line',
          useCommitConfig: true, replyToComments: true, replyLanguage: 'en',
        },
        pullRequest: { autoLinkTickets: true },
        issues: { commentOnPR: true, jiraUrl: '', githubIssuesUrl: '' },
        branches: { development: '' },
        worktreeFiles: [],
      },
      DEFAULT_SPOTLIGHT: mockDefaultSpotlight,
      VALID_SPOTLIGHT_SHORTCUTS: VALID_SHORTCUTS,
      isValidSpotlightShortcut: (value: unknown) =>
        typeof value === 'string' && VALID_SHORTCUTS.includes(value),
      isValidSpotlightConfig: (obj: unknown) => {
        if (typeof obj !== 'object' || obj === null) return false
        const record = obj as Record<string, unknown>
        return typeof record.enabled === 'boolean' &&
          typeof record.shortcut === 'string' &&
          VALID_SHORTCUTS.includes(record.shortcut)
      },
    }))

    vi.resetModules()
    const mod = await import('./migrate')
    migrateConfig = mod.migrateConfig
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should migrate agents from config.json to agents.json and remove agents key', () => {
    const agents = [
      { id: 'a1', name: 'Agent 1', repositories: ['/repo1'], tsCreate: 1000 },
      { id: 'a2', name: 'Agent 2', repositories: [], tsCreate: 2000 },
    ]
    writeConfigFile(minimalConfig({ agents }))

    migrateConfig('1.0.0')

    // agents.json should be created with the agents
    expect(fs.existsSync(agentsFile)).toBe(true)
    const writtenAgents = readAgentsJsonFile()
    expect(writtenAgents).toEqual(agents)

    // config.json should no longer have the agents key
    const config = readConfigFile() as Record<string, unknown>
    expect(config).not.toHaveProperty('agents')
  })

  it('should not overwrite agents.json if it already exists, but should remove agents key from config', () => {
    const existingAgents = [
      { id: 'existing1', name: 'Existing Agent', repositories: [], tsCreate: 500 },
    ]
    writeAgentsJsonFile(existingAgents)

    const configAgents = [
      { id: 'a1', name: 'Config Agent', repositories: [], tsCreate: 1000 },
    ]
    writeConfigFile(minimalConfig({ agents: configAgents }))

    migrateConfig('1.0.0')

    // agents.json should still contain the pre-existing agents (not overwritten)
    const writtenAgents = readAgentsJsonFile() as unknown[]
    expect(writtenAgents).toEqual(existingAgents)

    // config.json should no longer have the agents key
    const config = readConfigFile() as Record<string, unknown>
    expect(config).not.toHaveProperty('agents')
  })

  it('should not create agents.json when config has no agents key', () => {
    writeConfigFile(minimalConfig())

    migrateConfig('1.0.0')

    expect(fs.existsSync(agentsFile)).toBe(false)
  })

  it('should not crash on fresh install (no config.json)', () => {
    // No config.json exists at all
    expect(() => migrateConfig('1.0.0')).not.toThrow()
    expect(fs.existsSync(agentsFile)).toBe(false)
  })

  it('should remove agents key even when agents array is empty', () => {
    writeConfigFile(minimalConfig({ agents: [] }))

    migrateConfig('1.0.0')

    // agents key was present (empty array) — should be removed
    const config = readConfigFile() as Record<string, unknown>
    expect(config).not.toHaveProperty('agents')

    // agents.json should NOT be created (empty array, nothing to migrate)
    expect(fs.existsSync(agentsFile)).toBe(false)
  })

  it('should handle config with agents key set to non-array', () => {
    writeConfigFile(minimalConfig({ agents: 'invalid' }))

    migrateConfig('1.0.0')

    // agents key should still be removed
    const config = readConfigFile() as Record<string, unknown>
    expect(config).not.toHaveProperty('agents')

    // agents.json should NOT be created (not a valid array)
    expect(fs.existsSync(agentsFile)).toBe(false)
  })
})
