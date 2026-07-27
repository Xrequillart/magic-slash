import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { Config } from '../../types'
import type { Store } from '../store/Store'
import { setStore, NOOP_STORE } from '../store/Store'
import { hydrateConfig, readConfig, resetConfigCache, updateUsageLogsEnabled } from './config'

// updateUsageLogsEnabled toggles the GDPR opt-in on the in-memory config cache and
// writes through to the store (NOOP here). readConfig serves the cache back.
beforeEach(() => {
  setStore(NOOP_STORE)
})

/** A store whose loadConfig is controlled per test. */
const storeLoading = (loadConfig: Store['loadConfig']): Store => ({ ...NOOP_STORE, loadConfig })

describe('hydrateConfig', () => {
  // Hydration is no longer a startup-only operation: it also runs when a remote
  // change arrives (config/remote-sync.ts). That makes two failure modes matter
  // which never did before — a slow load racing a local edit, and a load that
  // fails while the app already holds a perfectly good config.
  beforeEach(() => {
    resetConfigCache()
    setStore(NOOP_STORE)
  })

  it('loads the config from the store and applies defaults', async () => {
    setStore(storeLoading(async () => ({ version: '1.0.0', repositories: {}, launchMode: 'plan' } as Config)))

    const config = await hydrateConfig()

    expect(config.launchMode).toBe('plan')
    // withDefaults fills in what the row never carried.
    expect(config.spotlight).toBeDefined()
    expect(config.integrations).toEqual({ github: true, atlassian: true })
  })

  it('keeps a warm cache when the load throws', async () => {
    setStore(storeLoading(async () => ({ version: '1.0.0', repositories: { api: { path: '/repo/api', keywords: ['api'] } } } as unknown as Config)))
    await hydrateConfig()

    setStore(storeLoading(async () => { throw new Error('offline') }))
    const config = await hydrateConfig()

    // Blanking the cache here would make every configured repository vanish from
    // the interface on a transient network error — and the next local edit would
    // then persist those defaults over the real ones.
    expect(Object.keys(config.repositories)).toEqual(['api'])
    expect(Object.keys(readConfig().repositories)).toEqual(['api'])
  })

  it('keeps a warm cache when the load resolves empty', async () => {
    setStore(storeLoading(async () => ({ version: '1.0.0', repositories: {}, launchMode: 'acceptEdits' } as Config)))
    await hydrateConfig()

    setStore(storeLoading(async () => null))
    expect((await hydrateConfig()).launchMode).toBe('acceptEdits')
  })

  it('falls back to defaults only when the cache is cold', async () => {
    setStore(storeLoading(async () => { throw new Error('offline') }))
    const config = await hydrateConfig()

    expect(config.repositories).toEqual({})
    expect(config.splitEnabled).toBe(false)
  })

  it('discards its snapshot when a local edit lands mid-load', async () => {
    // loadConfig makes several sequential round trips while every local mutation
    // is a synchronous read-modify-write on the cached object. Without the
    // generation guard, this load would resolve and reinstall a snapshot taken
    // BEFORE the toggle — reverting it on screen, and then pushing the stale
    // value back to the database on the next write (saveUserSettings writes
    // every settings column at once).
    setStore(storeLoading(async () => ({ version: '1.0.0', repositories: {} } as Config)))
    await hydrateConfig()

    let release: (config: Config | null) => void = () => {}
    setStore(storeLoading(() => new Promise((resolve) => { release = resolve })))

    const pending = hydrateConfig()
    updateUsageLogsEnabled(true)
    release({ version: '1.0.0', repositories: {}, usageLogsEnabled: false } as Config)
    await pending

    expect(readConfig().usageLogsEnabled).toBe(true)
  })

  it('adopts the load when nothing changed locally', async () => {
    // The mirror image of the test above: the guard must not make hydration inert.
    setStore(storeLoading(async () => ({ version: '1.0.0', repositories: {} } as Config)))
    await hydrateConfig()

    setStore(storeLoading(async () => ({ version: '1.0.0', repositories: {}, usageLogsEnabled: true } as Config)))
    expect((await hydrateConfig()).usageLogsEnabled).toBe(true)
  })

  it('does not write back what it just read', async () => {
    const saveConfig = vi.fn()
    setStore({ ...NOOP_STORE, loadConfig: async () => ({ version: '1.0.0', repositories: {} } as Config), saveConfig })

    await hydrateConfig()

    expect(saveConfig).not.toHaveBeenCalled()
  })
})

describe('updateUsageLogsEnabled', () => {
  beforeEach(() => {
    resetConfigCache()
  })

  it('is off by default (never set on a fresh config)', () => {
    expect(readConfig().usageLogsEnabled).toBeUndefined()
  })

  it('enables the opt-in and reflects it in the returned + cached config', () => {
    const config = updateUsageLogsEnabled(true)
    expect(config.usageLogsEnabled).toBe(true)
    expect(readConfig().usageLogsEnabled).toBe(true)
  })

  it('disables the opt-in again', () => {
    updateUsageLogsEnabled(true)
    const config = updateUsageLogsEnabled(false)
    expect(config.usageLogsEnabled).toBe(false)
    expect(readConfig().usageLogsEnabled).toBe(false)
  })
})
