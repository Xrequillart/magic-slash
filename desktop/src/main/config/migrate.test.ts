import { describe, it, expect } from 'vitest'
import type { Config } from '../../types'
import type { Store } from '../store/Store'
import { setStore, NOOP_STORE } from '../store/Store'
import { readConfig, hydrateConfig } from './config'
import { migrateConfig } from './migrate'

// There is NO data migration from legacy local JSON files: migrateConfig only
// normalizes the in-memory config hydrated from the store (fills default repo
// fields, sanitizes launchMode, syncs the version). These tests seed a fake
// store, hydrate, then assert on the normalized cache.

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

function minimalConfig(overrides: Partial<Config> = {}): Config {
  return {
    version: '0.32.0',
    repositories: {
      'test-repo': { path: '/home/user/test-repo', keywords: ['test'] },
    },
    splitEnabled: false,
    splitActive: false,
    ...overrides,
  }
}

describe('migrateConfig — repository defaults', () => {
  it('fills missing default repository fields', async () => {
    await seed(minimalConfig())
    migrateConfig('1.0.0')
    const repo = readConfig().repositories['test-repo']
    expect(repo.color).toBe('#3B82F6')
    expect(repo.languages).toEqual({ commit: 'en', pullRequest: 'en', jiraComment: 'en', discussion: 'en' })
    expect(repo.commit).toMatchObject({ style: 'single-line', format: 'angular' })
    // Existing fields are preserved.
    expect(repo.path).toBe('/home/user/test-repo')
    expect(repo.keywords).toEqual(['test'])
  })

  it('syncs the version with the app version', async () => {
    await seed(minimalConfig())
    migrateConfig('1.0.0')
    expect(readConfig().version).toBe('1.0.0')
  })

  it('defaults integrations when missing', async () => {
    await seed(minimalConfig())
    migrateConfig('1.0.0')
    expect(readConfig().integrations).toEqual({ github: true, atlassian: true })
  })
})

describe('migrateConfig — launchMode sanitization', () => {
  it('resets an invalid launchMode', async () => {
    await seed(minimalConfig({ launchMode: 'turbo' as never }))
    migrateConfig('1.0.0')
    expect(readConfig().launchMode).toBeUndefined()
  })

  it('preserves a valid launchMode', async () => {
    await seed(minimalConfig({ launchMode: 'auto' }))
    migrateConfig('1.0.0')
    expect(readConfig().launchMode).toBe('auto')
  })

  it('does not add launchMode when absent', async () => {
    await seed(minimalConfig())
    migrateConfig('1.0.0')
    expect(readConfig().launchMode).toBeUndefined()
  })

  it('resets a non-string launchMode', async () => {
    await seed(minimalConfig({ launchMode: 123 as never }))
    migrateConfig('1.0.0')
    expect(readConfig().launchMode).toBeUndefined()
  })
})
