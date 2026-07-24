import { describe, it, expect } from 'vitest'
import type { Config, OrgSharedConfig } from '../../types'
import type { Store } from '../store/Store'
import { setStore, NOOP_STORE } from '../store/Store'
import { mergeOrgSharedConfig, hydrateConfig } from './config'

// The DB is the single source of truth: config lives behind the Store. These
// tests seed a fake in-memory store, hydrate the config cache from it, then
// exercise mergeOrgSharedConfig against the cache.

let saved: Config | null = null

function fakeStore(initial: Config): Store {
  saved = structuredClone(initial)
  return {
    ...NOOP_STORE,
    loadConfig: async () => (saved ? structuredClone(saved) : null),
    saveConfig: async (c) => { saved = structuredClone(c) },
  }
}

async function seed(config: Config): Promise<void> {
  setStore(fakeStore(config))
  await hydrateConfig()
}

function baseConfig(): Config {
  return {
    version: '1.0.0',
    repositories: {},
    splitEnabled: false,
    splitActive: false,
    integrations: { github: true, atlassian: true },
    spotlight: { enabled: true, shortcut: 'Control+Space' },
  }
}

describe('mergeOrgSharedConfig', () => {
  it('fills unset language fields but never overrides existing local ones', async () => {
    const config = baseConfig()
    config.repositories = {
      web: { path: '/local/web', keywords: ['web'], languages: { commit: 'fr' } },
    }
    await seed(config)

    const shared: OrgSharedConfig = { languages: { commit: 'en', pullRequest: 'en' } }
    const result = mergeOrgSharedConfig(shared)

    expect(result.repositories.web.languages).toEqual({ commit: 'fr', pullRequest: 'en' })
  })

  it('fills unset commit and pullRequest fields, preserving those already set', async () => {
    const config = baseConfig()
    config.repositories = {
      api: { path: '/local/api', keywords: ['api'], commit: { format: 'gitmoji' } },
    }
    await seed(config)

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

  it('applies shared keywords only to repos with defaulted keywords', async () => {
    const config = baseConfig()
    config.repositories = {
      empty: { path: '/local/empty', keywords: [] },
      defaulted: { path: '/local/defaulted', keywords: ['defaulted'] },
      customized: { path: '/local/customized', keywords: ['payments', 'billing'] },
    }
    await seed(config)

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
    expect(result.repositories.customized.keywords).toEqual(['payments', 'billing'])
  })

  it('never touches local repo paths', async () => {
    const config = baseConfig()
    config.repositories = {
      web: { path: '/very/local/path', keywords: [] },
    }
    await seed(config)

    const result = mergeOrgSharedConfig({ languages: { commit: 'en' }, repoKeywords: { web: ['x'] } })

    expect(result.repositories.web.path).toBe('/very/local/path')
  })

  it('records the org id when provided', async () => {
    await seed(baseConfig())
    const result = mergeOrgSharedConfig({}, 'org-123')
    expect(result.currentOrgId).toBe('org-123')
  })

  it('does not set an org id when none is provided', async () => {
    await seed(baseConfig())
    const result = mergeOrgSharedConfig({})
    expect(result.currentOrgId).toBeUndefined()
  })

  it('ignores empty and malformed shared config without throwing', async () => {
    const config = baseConfig()
    config.repositories = {
      web: { path: '/local/web', keywords: ['web'], languages: { commit: 'fr' } },
    }
    await seed(config)

    expect(() => mergeOrgSharedConfig({})).not.toThrow()
    const result = mergeOrgSharedConfig({
      languages: 'nope' as unknown as OrgSharedConfig['languages'],
      repoKeywords: { web: 'nope' as unknown as string[] },
    })
    expect(result.repositories.web.languages).toEqual({ commit: 'fr' })
    expect(result.repositories.web.keywords).toEqual(['web'])
  })
})
