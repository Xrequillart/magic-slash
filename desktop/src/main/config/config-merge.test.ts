import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Config, OrgSharedConfig } from '../../types'

// In-memory config file so readConfig/writeConfig have no real FS side effects.
let store = ''

vi.mock('fs', () => ({
  existsSync: () => true,
  readFileSync: () => store,
  writeFileSync: (_path: string, data: string) => {
    store = data
  },
  mkdirSync: () => undefined,
}))

// Neutralise schema validation and defaults so readConfig returns our config as-is.
vi.mock('./schema-validator', () => ({
  validateConfig: () => ({ valid: true, errors: [] }),
  hasCriticalErrors: () => false,
}))

vi.mock('./defaults', () => ({
  DEFAULT_REPOSITORY_FIELDS: {},
  DEFAULT_SPOTLIGHT: {},
  isValidSpotlightConfig: () => true,
}))

vi.mock('./validation', () => ({
  expandPath: (p: string) => p,
}))

import { mergeOrgSharedConfig } from './config'

/** Seed the in-memory config file. */
function seed(config: Config): void {
  store = JSON.stringify(config)
}

function baseConfig(): Config {
  return {
    version: '1.0.0',
    repositories: {},
    splitEnabled: false,
    splitActive: false,
    integrations: { github: true, atlassian: true },
    spotlight: {},
  } as unknown as Config
}

describe('mergeOrgSharedConfig', () => {
  beforeEach(() => {
    store = ''
  })

  it('fills unset language fields but never overrides existing local ones', () => {
    const config = baseConfig()
    config.repositories = {
      web: { path: '/local/web', keywords: ['web'], languages: { commit: 'fr' } },
    }
    seed(config)

    const shared: OrgSharedConfig = { languages: { commit: 'en', pullRequest: 'en' } }
    const result = mergeOrgSharedConfig(shared)

    // Existing local value wins; missing one is inherited.
    expect(result.repositories.web.languages).toEqual({ commit: 'fr', pullRequest: 'en' })
  })

  it('fills unset commit and pullRequest fields, preserving those already set', () => {
    const config = baseConfig()
    config.repositories = {
      api: { path: '/local/api', keywords: ['api'], commit: { format: 'gitmoji' } },
    }
    seed(config)

    const shared: OrgSharedConfig = {
      commit: { format: 'angular', style: 'single-line', coAuthor: false },
      pullRequest: { autoLinkTickets: true },
    }
    const result = mergeOrgSharedConfig(shared)

    expect(result.repositories.api.commit).toEqual({
      format: 'gitmoji', // local wins
      style: 'single-line', // inherited
      coAuthor: false, // inherited (false is a real value, not "unset")
    })
    expect(result.repositories.api.pullRequest).toEqual({ autoLinkTickets: true })
  })

  it('applies shared keywords only to repos with defaulted keywords', () => {
    const config = baseConfig()
    config.repositories = {
      empty: { path: '/local/empty', keywords: [] },
      defaulted: { path: '/local/defaulted', keywords: ['defaulted'] }, // == repo name
      customized: { path: '/local/customized', keywords: ['payments', 'billing'] },
    }
    seed(config)

    const shared: OrgSharedConfig = {
      repoKeywords: {
        empty: ['shared', 'kw'],
        defaulted: ['shared', 'kw'],
        customized: ['should', 'not', 'apply'],
      },
    }
    const result = mergeOrgSharedConfig(shared)

    expect(result.repositories.empty.keywords).toEqual(['shared', 'kw'])
    expect(result.repositories.defaulted.keywords).toEqual(['shared', 'kw'])
    expect(result.repositories.customized.keywords).toEqual(['payments', 'billing']) // untouched
  })

  it('never touches local repo paths', () => {
    const config = baseConfig()
    config.repositories = {
      web: { path: '/very/local/path', keywords: [] },
    }
    seed(config)

    const result = mergeOrgSharedConfig({ languages: { commit: 'en' }, repoKeywords: { web: ['x'] } })

    expect(result.repositories.web.path).toBe('/very/local/path')
  })

  it('records the org id when provided', () => {
    seed(baseConfig())
    const result = mergeOrgSharedConfig({}, 'org-123')
    expect(result.currentOrgId).toBe('org-123')
  })

  it('does not set an org id when none is provided', () => {
    seed(baseConfig())
    const result = mergeOrgSharedConfig({})
    expect(result.currentOrgId).toBeUndefined()
  })

  it('ignores empty and malformed shared config without throwing', () => {
    const config = baseConfig()
    config.repositories = {
      web: { path: '/local/web', keywords: ['web'], languages: { commit: 'fr' } },
    }
    seed(config)

    expect(() => mergeOrgSharedConfig({})).not.toThrow()
    // Malformed input (wrong shapes) is defensively ignored.
    const result = mergeOrgSharedConfig({
      languages: 'nope' as unknown as OrgSharedConfig['languages'],
      repoKeywords: { web: 'nope' as unknown as string[] },
    })
    expect(result.repositories.web.languages).toEqual({ commit: 'fr' })
    expect(result.repositories.web.keywords).toEqual(['web'])
  })
})
