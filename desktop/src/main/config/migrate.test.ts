import { describe, it, expect } from 'vitest'
import type { Config } from '../../types'
import type { Store } from '../store/Store'
import { setStore, NOOP_STORE } from '../store/Store'
import { readConfig, hydrateConfig } from './config'
import { DEFAULT_REPOSITORY_FIELDS, DEFAULT_SPOTLIGHT } from './defaults'
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

// The LAST pullRequest block DEFAULT_REPOSITORY_FIELDS stamped on every repo,
// before issue #161 removed it. Written out rather than imported: it is what
// existing installs PERSISTED, and the app no longer defaults to it at all.
// Two OLDER shapes were persisted before it (see the tests below and the frozen
// list in normalize.ts) and installs still carry them.
const LEGACY_PULL_REQUEST = {
  autoLinkTickets: true,
  watchCI: true,
  testAccounts: 'off',
  testAccountsSource: '',
} as const

function withRepoPullRequest(pullRequest: unknown): Config {
  return minimalConfig({
    repositories: {
      'test-repo': {
        path: '/home/user/test-repo',
        keywords: ['test'],
        pullRequest: pullRequest as never,
      },
    },
  })
}

describe('migrateConfig — legacy pullRequest defaults (issue #161)', () => {
  it('drops a block left exactly at the historical default', async () => {
    await seed(withRepoPullRequest({ ...LEGACY_PULL_REQUEST }))
    migrateConfig('1.0.0')
    expect(readConfig().repositories['test-repo'].pullRequest).toBeUndefined()
  })

  it('drops it whatever order the keys were persisted in', async () => {
    await seed(withRepoPullRequest({ testAccountsSource: '', watchCI: true, testAccounts: 'off', autoLinkTickets: true }))
    migrateConfig('1.0.0')
    expect(readConfig().repositories['test-repo'].pullRequest).toBeUndefined()
  })

  // The shapes that PREDATE the four-key block. `repositories.pull_request` is
  // only rewritten when the user edits that repo, so a repo created under an
  // older release still holds the default of its day verbatim — which is the
  // impact scenario of #161 and, by age, most of the installs in the wild.
  it('drops the original one-key default an early release persisted', async () => {
    await seed(withRepoPullRequest({ autoLinkTickets: true }))
    migrateConfig('1.0.0')
    expect(readConfig().repositories['test-repo'].pullRequest).toBeUndefined()
  })

  it('drops the two-key default that shipped between them', async () => {
    await seed(withRepoPullRequest({ autoLinkTickets: true, watchCI: true }))
    migrateConfig('1.0.0')
    expect(readConfig().repositories['test-repo'].pullRequest).toBeUndefined()
  })

  it('keeps a block the user changed', async () => {
    const touched = { ...LEGACY_PULL_REQUEST, watchCI: false }
    await seed(withRepoPullRequest({ ...touched }))
    migrateConfig('1.0.0')
    expect(readConfig().repositories['test-repo'].pullRequest).toEqual(touched)
  })

  // Whole-block equality only: a partial block is not the default the app wrote,
  // so it is somebody's choice and stays put.
  it('keeps a partial block even when every key it has matches the default', async () => {
    await seed(withRepoPullRequest({ watchCI: true }))
    migrateConfig('1.0.0')
    expect(readConfig().repositories['test-repo'].pullRequest).toEqual({ watchCI: true })
  })

  it('leaves a repo that never had the block alone', async () => {
    await seed(minimalConfig())
    migrateConfig('1.0.0')
    expect(readConfig().repositories['test-repo'].pullRequest).toBeUndefined()
  })

  it('is idempotent: the second pass reports no change', async () => {
    await seed(withRepoPullRequest({ ...LEGACY_PULL_REQUEST }))
    expect(migrateConfig('1.0.0')).toBe(true)
    expect(migrateConfig('1.0.0')).toBe(false)
    expect(readConfig().repositories['test-repo'].pullRequest).toBeUndefined()
  })

  /**
   * Models what production actually persists: the config BLOB and the
   * REPOSITORIES are two different tables. saveConfig drops `repositories` from
   * the blob (CloudStore.saveConfig) and repos are written per-repo only when the
   * user edits one — so every loadConfig keeps handing back the legacy
   * `pullRequest` block, however many times the app has stripped it in memory.
   * The simpler `fakeStore` above cannot show this: it stores whatever it was
   * last saved, repositories included, so the strip appears to stick.
   */
  function fakeSplitStore(initial: Config): Store {
    let blob = structuredClone(initial)
    const repositories = structuredClone(initial.repositories)
    return {
      ...NOOP_STORE,
      loadConfig: async () => ({ ...structuredClone(blob), repositories: structuredClone(repositories) }),
      saveConfig: async (c) => { blob = structuredClone(c) },
    }
  }

  // The defect: migrateConfig is guarded by `restoredOnce` and runs ONCE per
  // process, but remote-sync's runRefresh calls hydrateConfig again whenever a
  // teammate edits a repo or a Realtime channel resubscribes. Normalizing only in
  // migrateConfig let that reload restore the legacy block for the rest of the
  // session — blocking inheritance and serving the stale block over /config.
  it('keeps the block stripped across a mid-session re-hydration (remote-sync refresh)', async () => {
    setStore(fakeSplitStore(withRepoPullRequest({ ...LEGACY_PULL_REQUEST })))
    await hydrateConfig()
    migrateConfig('1.0.0')
    expect(readConfig().repositories['test-repo'].pullRequest).toBeUndefined()

    // Exactly what runRefresh does: reload the whole config from the store.
    await hydrateConfig()
    expect(readConfig().repositories['test-repo'].pullRequest).toBeUndefined()
  })

  // A repo the user genuinely configured survives the reload untouched — the
  // load-path normalization is the same whole-block rule, not a blanket wipe.
  it('does not strip a user-modified block on re-hydration either', async () => {
    const touched = { ...LEGACY_PULL_REQUEST, testAccounts: 'inline' }
    setStore(fakeSplitStore(withRepoPullRequest({ ...touched })))
    await hydrateConfig()
    await hydrateConfig()
    expect(readConfig().repositories['test-repo'].pullRequest).toEqual(touched)
  })

  /**
   * Convergence. Because the block is already gone by the time migrateConfig
   * runs, an otherwise up-to-date existing install reports NO change — so it no
   * longer fires a writeConfig → `configs` upsert at every single launch just to
   * re-strip a block the database will hand back again next time.
   */
  it('reports no change on an otherwise up-to-date install carrying the legacy block', async () => {
    setStore(fakeSplitStore(minimalConfig({
      version: '1.0.0',
      integrations: { github: true, atlassian: true },
      spotlight: { ...DEFAULT_SPOTLIGHT },
      repositories: {
        'test-repo': {
          path: '/home/user/test-repo',
          keywords: ['test'],
          ...structuredClone(DEFAULT_REPOSITORY_FIELDS),
          pullRequest: { ...LEGACY_PULL_REQUEST },
        },
      },
    })))
    await hydrateConfig()

    expect(migrateConfig('1.0.0')).toBe(false)
    expect(readConfig().repositories['test-repo'].pullRequest).toBeUndefined()
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
