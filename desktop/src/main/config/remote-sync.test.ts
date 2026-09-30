import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { Config } from '../../types'
import type { UserSettingsRow } from '../store/user-settings-mapper'
import type { Store, StoredWorkflow } from '../store/Store'
import { setStore, NOOP_STORE } from '../store/Store'

// hydrate.ts reaches Electron through appearance.ts, so only the one function
// remote-sync uses is stubbed. The config cache below is the REAL one — the
// interesting behaviour here is how a row lands on it.
vi.mock('../store/hydrate', () => ({
  applyAppearanceFromConfig: vi.fn(),
}))

import { applyAppearanceFromConfig } from '../store/hydrate'
import { hydrateConfig, readConfig, resetConfigCache } from './config'
import { overlayForRepo, resetWorkflowsCache, revisionForRepo } from '../workflow/workflows'
import {
  addConfigChangeListener,
  applyRemoteSettingsRow,
  refreshWorkflows,
  resetRemoteSync,
  scheduleRemoteRefresh,
  setRemoteSyncEmitters,
  type ConfigChange,
} from './remote-sync'

/** Every column NULL: "the user has never chosen any of these". */
const emptyRow = (): UserSettingsRow => ({
  usage_card_enabled: null,
  usage_card_minimized: null,
  agent_context_enabled: null,
  agent_context_minimized: null,
  usage_logs_enabled: null,
  info_sidebar_on_create: null,
  plan_sync_enabled: null,
  daily_digest_enabled: null,
  notifications_enabled: null,
  notification_agent_waiting: null,
  notification_agent_completed: null,
  notification_pr_review: null,
  notification_pr_changes_requested: null,
  split_enabled: null,
  split_active: null,
  pr_reviews_enabled: null,
  pr_reviews_poll_interval_ms: null,
  pr_reviews_auto_launch_skills: null,
  spotlight_enabled: null,
  spotlight_shortcut: null,
  auto_start_at_login: null,
  launch_mode: null,
  atlassian_integration_enabled: null,
  theme: null,
  language: null,
  sync_claude_theme: null,
  code_syntax: null,
  code_font_size: null,
  default_model: null,
  confirm_agent_archive: null,
  split_new_agent_pane: null,
  quick_launch_repo: null,
  quick_launch_background: null,
  quick_launch_launch_mode: null,
  quick_settings_enabled: null,
  quick_settings_items: null,
  sidebar_order: null,
  sidebar_hidden: null,
  sidebar_compact: null,
  default_agent_type: null,
  agent_sort: null,
  tasks_repo: null,
  plans_repo: null,
})

const storeLoading = (loadConfig: Store['loadConfig']): Store => ({ ...NOOP_STORE, loadConfig })

let pushed: Config[]
let repositoriesReloaded: number
let changes: ConfigChange[]
let workflowsChanged: string[][]

const OVERLAY = { version: 1, steps: [{ skill: 'check', mode: 'advisory', before: 'commit' }], kinds: {} }
/** OVERLAY as loadRepositoryWorkflows returns it, at a revision. */
const row = (revision = 'rev-1', definition: unknown = OVERLAY) => ({ definition, revision })

/** Seed the real config cache with a known config, as hydration would. */
const seed = async (config: Partial<Config> = {}): Promise<void> => {
  setStore(storeLoading(async () => ({ version: '1.0.0', repositories: {}, ...config } as Config)))
  await hydrateConfig()
}

beforeEach(() => {
  vi.clearAllMocks()
  resetConfigCache()
  resetRemoteSync()
  resetWorkflowsCache()
  setStore(NOOP_STORE)
  workflowsChanged = []
  pushed = []
  repositoriesReloaded = 0
  changes = []
  setRemoteSyncEmitters({
    onConfigChanged: (config) => pushed.push(config),
    onRepositoriesReloaded: () => { repositoriesReloaded++ },
    onWorkflowsChanged: (repoIds) => { workflowsChanged.push(repoIds) },
  })
  // Registered after resetRemoteSync, which clears listeners.
  addConfigChangeListener((change) => changes.push(change))
})

afterEach(() => {
  resetRemoteSync()
  setRemoteSyncEmitters(null)
})

describe('applyRemoteSettingsRow', () => {
  it('adopts a changed setting and publishes it', async () => {
    await seed()

    applyRemoteSettingsRow({ ...emptyRow(), usage_logs_enabled: false, launch_mode: 'plan' })

    expect(readConfig().usageLogsEnabled).toBe(false)
    expect(readConfig().launchMode).toBe('plan')
    expect(pushed).toHaveLength(1)
    expect(pushed[0].usageLogsEnabled).toBe(false)
    expect(applyAppearanceFromConfig).toHaveBeenCalledWith(pushed[0])
    expect(changes).toHaveLength(1)
  })

  it('hands listeners both the old and the new config', async () => {
    await seed({ launchMode: 'plan' })

    applyRemoteSettingsRow({ ...emptyRow(), launch_mode: 'acceptEdits' })

    expect(changes[0].prev?.launchMode).toBe('plan')
    expect(changes[0].next.launchMode).toBe('acceptEdits')
  })

  it('ignores a row that carries what the app already holds', async () => {
    // Saving ANY single preference upserts every settings column, so each local
    // toggle produces an event echoing values we already have. Acting on those
    // would cost a repaint, a Claude theme file rewrite and a renderer update for
    // no change at all.
    await seed({ launchMode: 'plan' })
    const echo = { ...emptyRow(), launch_mode: 'plan' }

    applyRemoteSettingsRow(echo)

    expect(pushed).toEqual([])
    expect(changes).toEqual([])
    expect(applyAppearanceFromConfig).not.toHaveBeenCalled()
  })

  it('treats an all-NULL row against a defaulted config as no change', async () => {
    await seed()
    applyRemoteSettingsRow(emptyRow())
    expect(pushed).toEqual([])
  })

  it('resets a setting back to its default when the column goes NULL', async () => {
    // applySettingsRow only ever SETS keys, so the settings-owned keys have to be
    // cleared first — otherwise a value cleared elsewhere would linger in memory.
    await seed({ launchMode: 'plan' })

    applyRemoteSettingsRow(emptyRow())

    expect(readConfig().launchMode).toBeUndefined()
    expect(pushed).toHaveLength(1)
  })

  it('leaves repositories untouched', async () => {
    await seed({ repositories: { api: { path: '/repo/api', keywords: ['api'] } } as unknown as Config['repositories'] })

    applyRemoteSettingsRow({ ...emptyRow(), usage_logs_enabled: false })

    expect(Object.keys(readConfig().repositories)).toEqual(['api'])
    expect(Object.keys(pushed[0].repositories)).toEqual(['api'])
  })

  it('does nothing while the cache is still cold', async () => {
    // Hydration has not run (or failed) and the interface is behind the
    // connectivity gate. Installing a settings-only config would briefly present
    // an app with no repositories, and hydration reads the same row anyway.
    applyRemoteSettingsRow({ ...emptyRow(), usage_logs_enabled: false })

    expect(pushed).toEqual([])
    expect(changes).toEqual([])
  })

  it('still pushes to the renderer when a listener throws', async () => {
    await seed()
    addConfigChangeListener(() => { throw new Error('listener blew up') })

    applyRemoteSettingsRow({ ...emptyRow(), usage_logs_enabled: false })

    expect(pushed).toHaveLength(1)
  })
})

describe('scheduleRemoteRefresh', () => {
  it('collapses a burst of events into a single reload', async () => {
    vi.useFakeTimers()
    try {
      await seed()
      const loadConfig = vi.fn(async () => ({ version: '1.0.0', repositories: {}, launchMode: 'plan' } as Config))
      setStore(storeLoading(loadConfig))

      // The web app's settings page saves key by key; one reload per key would be
      // several round trips each.
      scheduleRemoteRefresh()
      scheduleRemoteRefresh()
      scheduleRemoteRefresh()
      await vi.advanceTimersByTimeAsync(200)

      expect(loadConfig).toHaveBeenCalledTimes(1)
      expect(pushed).toHaveLength(1)
    } finally {
      vi.useRealTimers()
    }
  })

  it('re-validates local repository paths after a reload', async () => {
    vi.useFakeTimers()
    try {
      await seed()
      setStore(storeLoading(async () => ({ version: '1.0.0', repositories: { api: { path: '/repo/api', keywords: ['api'] } } } as unknown as Config)))

      scheduleRemoteRefresh()
      await vi.advanceTimersByTimeAsync(200)

      // A team repo appearing would otherwise leave the "choose a folder" surface stale.
      expect(repositoriesReloaded).toBe(1)
      expect(Object.keys(pushed[0].repositories)).toEqual(['api'])
    } finally {
      vi.useRealTimers()
    }
  })

  it('publishes nothing when the reload was discarded', async () => {
    vi.useFakeTimers()
    try {
      await seed({ launchMode: 'plan' })
      setStore(storeLoading(async () => { throw new Error('offline') }))

      scheduleRemoteRefresh()
      await vi.advanceTimersByTimeAsync(200)

      // hydrateConfig kept the warm cache, so nothing was adopted — telling the
      // renderer "here is your config" would be noise.
      expect(pushed).toEqual([])
      expect(repositoriesReloaded).toBe(0)
      expect(readConfig().launchMode).toBe('plan')
    } finally {
      vi.useRealTimers()
    }
  })

  it('does nothing while the cache is still cold', async () => {
    vi.useFakeTimers()
    try {
      const loadConfig = vi.fn(async () => ({ version: '1.0.0', repositories: {} } as Config))
      setStore(storeLoading(loadConfig))

      scheduleRemoteRefresh()
      await vi.advanceTimersByTimeAsync(200)

      expect(loadConfig).not.toHaveBeenCalled()
      expect(pushed).toEqual([])
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('workflow changes', () => {
  it('reports a flow that moved on a reload whose config was discarded', async () => {
    vi.useFakeTimers()
    try {
      await seed()
      setStore({ ...NOOP_STORE, loadConfig: async () => { throw new Error('offline') }, loadRepositoryWorkflows: async () => ({ r1: row() }) })

      scheduleRemoteRefresh()
      await vi.advanceTimersByTimeAsync(200)

      // The config early return must not swallow it: a flow is not part of the config.
      expect(pushed).toEqual([])
      expect(workflowsChanged).toEqual([['r1']])
    } finally {
      vi.useRealTimers()
    }
  })

  it('refreshWorkflows reports the flows that moved, and nothing when none did', async () => {
    await seed()
    setStore({ ...NOOP_STORE, loadRepositoryWorkflows: async () => ({ r1: row() }) })
    await refreshWorkflows()
    await refreshWorkflows()
    expect(workflowsChanged).toEqual([['r1']])
    expect(pushed).toEqual([])
  })

  it('never loads beside a reload: a refresh mid-load waits for one follow-up read, reported once', async () => {
    vi.useFakeTimers()
    try {
      await seed()
      const parked: ((value: Record<string, StoredWorkflow>) => void)[] = []
      const load = vi.fn(() => new Promise<Record<string, StoredWorkflow>>((resolve) => { parked.push(resolve) }))
      setStore({ ...storeLoading(async () => ({ version: '1.0.0', repositories: {} } as Config)), loadRepositoryWorkflows: load })

      scheduleRemoteRefresh()
      await vi.advanceTimersByTimeAsync(200)
      expect(load).toHaveBeenCalledTimes(1)

      // Two events while the reload's read is out: no second read beside it.
      const first = refreshWorkflows()
      const second = refreshWorkflows()
      expect(load).toHaveBeenCalledTimes(1)

      parked[0]({ r1: row('rev-1') })
      await vi.advanceTimersByTimeAsync(0)
      expect(load).toHaveBeenCalledTimes(2)
      const edited = { ...OVERLAY, steps: [{ ...OVERLAY.steps[0], mode: 'blocking' }] }
      parked[1]({ r1: row('rev-2', edited) })
      await Promise.all([first, second])

      expect(load).toHaveBeenCalledTimes(2)
      // The reload reports its read, the refreshes the follow-up's, once between them.
      expect(workflowsChanged).toEqual([['r1'], ['r1']])
      expect(overlayForRepo('r1')).toEqual(edited)
      expect(revisionForRepo('r1')).toBe('rev-2')
    } finally {
      vi.useRealTimers()
    }
  })

  it('refreshWorkflows does nothing while the cache is still cold', async () => {
    const load = vi.fn(async () => ({ r1: row() }))
    setStore({ ...NOOP_STORE, loadRepositoryWorkflows: load })
    await refreshWorkflows()
    expect(load).not.toHaveBeenCalled()
    expect(workflowsChanged).toEqual([])
  })
})
