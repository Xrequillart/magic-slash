import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest'
import type { Config } from '../../types'
import type { Store } from '../store/Store'
import { setStore, NOOP_STORE } from '../store/Store'

// git is the one thing these tests must not actually run: the backfill probes
// every bound repository for its origin. Mocked at the module boundary so the
// rules can be exercised without a real repository on disk.
const mockRemoteUrl: Mock<(repoPath: string) => Promise<string | null>> = vi.fn()
vi.mock('./validation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./validation')>()),
  getGitHubRepoUrl: vi.fn(() => null),
  getGitHubRepoUrlAsync: (repoPath: string) => mockRemoteUrl(repoPath),
}))

import {
  backfillRepoRemotes,
  hydrateConfig,
  readConfig,
  resetConfigCache,
  updateRepositoryCommitSettings,
  updateUsageLogsEnabled,
} from './config'

// updateUsageLogsEnabled toggles the GDPR opt-in on the in-memory config cache and
// writes through to the store (NOOP here). readConfig serves the cache back.
beforeEach(() => {
  setStore(NOOP_STORE)
  mockRemoteUrl.mockReset().mockResolvedValue(null)
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

describe('backfillRepoRemotes', () => {
  // captureRepoRemote only fires when a path CHANGES, so every repository bound
  // before remote_url existed — essentially all of them — kept a null address
  // forever, and the one-click clone an invitee is offered on the org's repos had
  // no data to work from. This pass is what fills the column in.
  let setRemote: Mock<(id: string, url: string) => Promise<boolean>>

  /**
   * Let the fire-and-forget backfill hydration kicks off run to completion. A
   * macrotask drains every pending microtask, so nothing here depends on how many
   * awaits the pass happens to contain.
   */
  const settle = () => new Promise<void>((resolve) => setTimeout(resolve, 0))

  /** Hydrate a config holding exactly these repositories, backfill included. */
  async function hydrateWith(repositories: Record<string, unknown>, store: Partial<Store> = {}): Promise<void> {
    setStore({
      ...NOOP_STORE,
      loadConfig: async () => ({ version: '1.0.0', repositories } as unknown as Config),
      setRepositoryRemoteUrl: (id: string, url: string) => setRemote(id, url),
      ...store,
    })
    await hydrateConfig()
    await settle()
  }

  beforeEach(() => {
    resetConfigCache()
    setRemote = vi.fn(async () => true)
    // The pass reports its own failures; the tests that provoke one do not need
    // the noise in the output.
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('captures the address of a repository that has a local folder and no remote yet', async () => {
    mockRemoteUrl.mockResolvedValue('https://github.com/acme/api')

    // No user action, no path change: hydration alone is the trigger.
    await hydrateWith({ api: { id: 'r1', path: '/repo/api', keywords: ['api'] } })

    expect(setRemote).toHaveBeenCalledWith('r1', 'https://github.com/acme/api')
    // Reflected locally too, so the interface does not wait for a re-hydration.
    expect(readConfig().repositories.api.remoteUrl).toBe('https://github.com/acme/api')
  })

  it('refuses to publish an origin that points at a different repository than the one being filled', async () => {
    // The address a member contributes becomes the one every teammate clones, and
    // the column is fill-only — so a checkout of something else, bound to the org's
    // repo by accident or otherwise, would send everyone to the wrong code with no
    // way back. The repo half of owner/repo has to match the repository's name.
    mockRemoteUrl.mockResolvedValue('https://github.com/attacker/not-the-api')

    await hydrateWith({ api: { id: 'r1', path: '/repo/api', keywords: ['api'] } })

    expect(setRemote).not.toHaveBeenCalled()
    expect(readConfig().repositories.api.remoteUrl).toBeUndefined()
  })

  it('accepts an origin whose owner differs, since only the repository half identifies it', async () => {
    // A fork, a transferred repo or a personal mirror is still the same repository
    // as far as the record is concerned; the owner is not what the name pins down.
    mockRemoteUrl.mockResolvedValue('https://github.com/someone-else/api')

    await hydrateWith({ api: { id: 'r1', path: '/repo/api', keywords: ['api'] } })

    expect(setRemote).toHaveBeenCalledWith('r1', 'https://github.com/someone-else/api')
  })

  it('matches the name past our own org-disambiguation suffix on the record key', async () => {
    // Two orgs may both have an "api", so the config key carries " (Acme)". That
    // suffix is ours, never GitHub's, and must not make the names disagree.
    mockRemoteUrl.mockResolvedValue('https://github.com/acme/api')

    await hydrateWith({ 'api (Acme)': { id: 'r1', path: '/repo/api', keywords: ['api'] } })

    expect(setRemote).toHaveBeenCalledWith('r1', 'https://github.com/acme/api')
  })

  it('writes through the fill-only remote RPC, never the admin-only repository update', async () => {
    // repositories_update is owner-or-admin under RLS, and the member running this
    // pass is usually neither — routing the capture there would refuse them all.
    const updateRepository = vi.fn()
    mockRemoteUrl.mockResolvedValue('https://github.com/acme/api')

    await hydrateWith({ api: { id: 'r1', path: '/repo/api', keywords: ['api'] } }, { updateRepository })

    expect(setRemote).toHaveBeenCalledOnce()
    expect(updateRepository).not.toHaveBeenCalled()
  })

  it('leaves a repository whose address is already known untouched', async () => {
    // remote_url is fill-only: an existing value is never re-derived, and git is
    // not even asked.
    await hydrateWith({
      api: { id: 'r1', path: '/repo/api', keywords: ['api'], remoteUrl: 'https://github.com/acme/api' },
    })

    expect(mockRemoteUrl).not.toHaveBeenCalled()
    expect(setRemote).not.toHaveBeenCalled()
  })

  it('skips a repository that has no local folder on this machine', async () => {
    // Nothing here knows that repository's address, and inventing one is not an
    // option — it is also exactly the repository an invitee will want to clone.
    await hydrateWith({ api: { id: 'r1', path: '', keywords: ['api'], needsLocalPath: true } })

    expect(mockRemoteUrl).not.toHaveBeenCalled()
    expect(setRemote).not.toHaveBeenCalled()
  })

  it('stores nothing for a folder whose origin is not a GitHub remote', async () => {
    mockRemoteUrl.mockResolvedValue(null)

    await hydrateWith({ api: { id: 'r1', path: '/repo/api', keywords: ['api'] } })

    expect(setRemote).not.toHaveBeenCalled()
    expect(readConfig().repositories.api.remoteUrl).toBeUndefined()
  })

  it('leaves hydration intact when the cloud refuses the capture', async () => {
    // A bonus for teammates, run fire-and-forget behind hydration: a refusal must
    // never take hydration — or anything the user asked for — down with it.
    mockRemoteUrl.mockResolvedValue('https://github.com/acme/api')
    setRemote.mockRejectedValue(new Error('row level security'))

    await hydrateWith({ api: { id: 'r1', path: '/repo/api', keywords: ['api'] } })

    expect(Object.keys(readConfig().repositories)).toEqual(['api'])
    await expect(backfillRepoRemotes()).resolves.toBeUndefined()
  })

  it('leaves hydration intact when the git probe fails outright', async () => {
    mockRemoteUrl.mockRejectedValue(new Error('git exploded'))

    await hydrateWith({ api: { id: 'r1', path: '/repo/api', keywords: ['api'] } })

    expect(Object.keys(readConfig().repositories)).toEqual(['api'])
    await expect(backfillRepoRemotes()).resolves.toBeUndefined()
  })

  it('probes a repository once per session rather than on every hydration', async () => {
    // Hydration also runs whenever a remote edit arrives, and a folder with no
    // GitHub origin would otherwise pay for a git subprocess every single time.
    mockRemoteUrl.mockResolvedValue(null)
    await hydrateWith({ api: { id: 'r1', path: '/repo/api', keywords: ['api'] } })

    await backfillRepoRemotes()

    expect(mockRemoteUrl).toHaveBeenCalledOnce()
  })
})

describe('updateRepositoryCommitSettings', () => {
  beforeEach(async () => {
    resetConfigCache()
    setStore(storeLoading(async () => ({
      version: '1.0.0',
      repositories: { api: { path: '/repo/api', keywords: ['api'] } },
    } as unknown as Config)))
    await hydrateConfig()
  })

  // applySetting is a per-key whitelist: a setting absent from it is dropped on the
  // floor, so the toggle in Settings would appear to work and never persist.
  it('persists allowOnProtectedBranch in both directions', () => {
    expect(updateRepositoryCommitSettings('api', { allowOnProtectedBranch: false })
      .repositories.api.commit?.allowOnProtectedBranch).toBe(false)
    expect(readConfig().repositories.api.commit?.allowOnProtectedBranch).toBe(false)

    updateRepositoryCommitSettings('api', { allowOnProtectedBranch: true })
    expect(readConfig().repositories.api.commit?.allowOnProtectedBranch).toBe(true)
  })

  it('leaves the other commit settings alone', () => {
    updateRepositoryCommitSettings('api', { format: 'gitmoji', coAuthor: true })
    updateRepositoryCommitSettings('api', { allowOnProtectedBranch: false })

    const commit = readConfig().repositories.api.commit
    expect(commit?.format).toBe('gitmoji')
    expect(commit?.coAuthor).toBe(true)
  })

  it('ignores a non-boolean, rather than storing it', () => {
    updateRepositoryCommitSettings('api', { allowOnProtectedBranch: 'yes' as unknown as boolean })
    expect(readConfig().repositories.api.commit?.allowOnProtectedBranch).toBeUndefined()
  })
})
