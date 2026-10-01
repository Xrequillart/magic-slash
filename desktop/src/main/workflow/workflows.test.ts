import { afterEach, describe, it, expect, vi } from 'vitest'
import { setStore, NOOP_STORE, type StoredWorkflow } from '../store/Store'
import { DEFAULT_WORKFLOW } from '../../workflow/defaultFlow'
import type { WorkflowOverlay } from '../../workflow/overlay'
import { EMPTY_OVERLAY, composeWorkflow } from '../../workflow/overlay'
import { hydrateWorkflows, overlayForRepo, resetWorkflowsCache, revisionForRepo, setWorkflow, workflowForRepo } from './workflows'

/** A check step after commit. */
const OVERLAY: WorkflowOverlay = {
  version: 2,
  steps: [{ skill: 'check', mode: 'advisory' }],
  links: [{ from: 'commit', to: 'custom:check', kind: 'suggest' }],
  kinds: {},
  positions: {},
}
const CUSTOM = composeWorkflow(OVERLAY)

/** Rows as the store returns them: each definition at `revision`. */
function rows(definitions: Record<string, unknown>, revision = 'rev-1'): Record<string, StoredWorkflow> {
  return Object.fromEntries(Object.entries(definitions).map(([id, definition]) => [id, { definition, revision }]))
}

function withStoredWorkflows(workflows: Record<string, unknown> | null, revision?: string) {
  const loaded = workflows && rows(workflows, revision)
  setStore({ ...NOOP_STORE, loadRepositoryWorkflows: async () => loaded })
}

/** A store whose loads are parked until the test releases them, one by one, in any order. */
function withParkedLoads() {
  const parked: ((value: Record<string, StoredWorkflow> | null) => void)[] = []
  const load = vi.fn(() => new Promise<Record<string, StoredWorkflow> | null>((resolve) => { parked.push(resolve) }))
  setStore({ ...NOOP_STORE, loadRepositoryWorkflows: load })
  return { load, parked }
}

/** Let every settled promise run its callbacks. */
const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

afterEach(() => {
  resetWorkflowsCache()
  setStore(NOOP_STORE)
  vi.restoreAllMocks()
})

describe('workflowForRepo', () => {
  it('serves the default flow to a repository without one, and to no repository', async () => {
    withStoredWorkflows({ 'repo-1': OVERLAY })
    await hydrateWorkflows()
    expect(workflowForRepo('repo-2')).toEqual({ workflow: DEFAULT_WORKFLOW, source: 'default' })
    expect(workflowForRepo(null)).toEqual({ workflow: DEFAULT_WORKFLOW, source: 'default' })
  })

  it('serves a repository its own valid flow', async () => {
    withStoredWorkflows({ 'repo-1': OVERLAY })
    await hydrateWorkflows()
    expect(workflowForRepo('repo-1')).toEqual({ workflow: CUSTOM, source: 'repository' })
  })

  it('ignores an invalid flow, with a warning, and serves the default', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const duplicated: WorkflowOverlay = { ...OVERLAY, steps: [{ skill: 'magic-commit', mode: 'advisory' }] }
    // A full workflow, as stored before overlays: not an overlay, so not served.
    withStoredWorkflows({ 'repo-1': duplicated, 'repo-2': { nodes: 'nope' }, 'repo-3': DEFAULT_WORKFLOW })
    await hydrateWorkflows()
    expect(workflowForRepo('repo-1').source).toBe('default')
    expect(workflowForRepo('repo-2').source).toBe('default')
    expect(workflowForRepo('repo-3').source).toBe('default')
    expect(overlayForRepo('repo-1')).toEqual(EMPTY_OVERLAY)
    expect(warn).toHaveBeenCalledTimes(3)
  })

  it('forgets every flow on reset', async () => {
    withStoredWorkflows({ 'repo-1': OVERLAY })
    await hydrateWorkflows()
    resetWorkflowsCache()
    expect(workflowForRepo('repo-1').source).toBe('default')
  })

  it('keeps what it had when a load rejects', async () => {
    withStoredWorkflows({ 'repo-1': OVERLAY })
    await hydrateWorkflows()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    setStore({ ...NOOP_STORE, loadRepositoryWorkflows: async () => { throw new Error('offline') } })
    await hydrateWorkflows()
    expect(workflowForRepo('repo-1').source).toBe('repository')
  })

  it('keeps what it had when a refresh fails to read', async () => {
    withStoredWorkflows({ 'repo-1': OVERLAY })
    await hydrateWorkflows()
    withStoredWorkflows(null)
    await hydrateWorkflows()
    expect(workflowForRepo('repo-1')).toEqual({ workflow: CUSTOM, source: 'repository' })
  })

  it('drops the flows a successful load no longer returns', async () => {
    withStoredWorkflows({ 'repo-1': OVERLAY })
    await hydrateWorkflows()
    withStoredWorkflows({})
    await hydrateWorkflows()
    expect(workflowForRepo('repo-1').source).toBe('default')
  })

  it('does not land a load that started before a sign-out', async () => {
    const { parked } = withParkedLoads()
    const pending = hydrateWorkflows()
    resetWorkflowsCache()
    parked[0](rows({ 'repo-1': OVERLAY }))
    await pending
    expect(workflowForRepo('repo-1').source).toBe('default')
  })
})

describe('overlayForRepo', () => {
  it('returns the stored overlay, or the empty one', async () => {
    withStoredWorkflows({ 'repo-1': OVERLAY })
    await hydrateWorkflows()
    expect(overlayForRepo('repo-1')).toEqual(OVERLAY)
    expect(overlayForRepo('repo-2')).toEqual(EMPTY_OVERLAY)
  })
})

describe('setWorkflow', () => {
  it('serves a saved overlay at once', () => {
    setWorkflow('repo-1', OVERLAY, 'rev-2')
    expect(workflowForRepo('repo-1')).toEqual({ workflow: CUSTOM, source: 'repository' })
    expect(overlayForRepo('repo-1')).toEqual(OVERLAY)
  })

  it('goes back to the default on null', async () => {
    withStoredWorkflows({ 'repo-1': OVERLAY })
    await hydrateWorkflows()
    setWorkflow('repo-1', null, null)
    expect(workflowForRepo('repo-1').source).toBe('default')
    expect(overlayForRepo('repo-1')).toEqual(EMPTY_OVERLAY)
  })

  it('judges a saved overlay as a load would, serving the default for an unusable one', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    setWorkflow('repo-1', OVERLAY, 'rev-2')
    setWorkflow('repo-1', { ...OVERLAY, steps: [{ skill: 'magic-commit', mode: 'advisory' }] }, 'rev-3')
    expect(workflowForRepo('repo-1').source).toBe('default')
    expect(warn).toHaveBeenCalledTimes(1)
  })

  it('leaves the other repositories alone', async () => {
    withStoredWorkflows({ 'repo-1': OVERLAY, 'repo-2': OVERLAY })
    await hydrateWorkflows()
    setWorkflow('repo-1', null, null)
    expect(workflowForRepo('repo-2').source).toBe('repository')
  })
})

describe('hydrateWorkflows', () => {
  it('reports the repositories whose flow was added, edited or removed', async () => {
    withStoredWorkflows({ 'repo-1': OVERLAY, 'repo-2': OVERLAY })
    expect(await hydrateWorkflows()).toEqual(['repo-1', 'repo-2'])
    const edited: WorkflowOverlay = { ...OVERLAY, steps: [{ ...OVERLAY.steps[0], mode: 'blocking' }] }
    withStoredWorkflows({ 'repo-1': edited, 'repo-3': OVERLAY })
    expect((await hydrateWorkflows()).sort()).toEqual(['repo-1', 'repo-2', 'repo-3'])
  })

  it('reports nothing when the same flows come back, whatever their key order', async () => {
    setWorkflow('repo-1', OVERLAY, 'rev-1')
    // jsonb hands keys back in its own order.
    withStoredWorkflows({
      'repo-1': { positions: {}, kinds: {}, links: [{ kind: 'suggest', to: 'custom:check', from: 'commit' }], steps: [{ mode: 'advisory', skill: 'check' }], version: 2 },
    })
    expect(await hydrateWorkflows()).toEqual([])
  })

  it('serves the default flow for a v1 row: no build writes one, none is stored', async () => {
    withStoredWorkflows({ 'repo-1': { version: 1, steps: [{ skill: 'check', mode: 'advisory', before: 'commit' }], kinds: {} } })
    await hydrateWorkflows()
    expect(workflowForRepo('repo-1').source).toBe('default')
  })

  it('reports nothing when the read fails', async () => {
    withStoredWorkflows({ 'repo-1': OVERLAY })
    await hydrateWorkflows()
    withStoredWorkflows(null)
    expect(await hydrateWorkflows()).toEqual([])
  })
})

describe('revisions', () => {
  it('keeps the revision of every row, a usable one or not, and null for no row', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    setStore({
      ...NOOP_STORE,
      loadRepositoryWorkflows: async () => ({
        'repo-1': { definition: OVERLAY, revision: 'rev-a' },
        'repo-2': { definition: { nodes: 'nope' }, revision: 'rev-b' },
      }),
    })
    await hydrateWorkflows()
    expect(revisionForRepo('repo-1')).toBe('rev-a')
    // Served the default, but the editor's save still replaces this very row.
    expect(overlayForRepo('repo-2')).toEqual(EMPTY_OVERLAY)
    expect(revisionForRepo('repo-2')).toBe('rev-b')
    expect(revisionForRepo('repo-3')).toBeNull()
  })

  it('takes a save\'s revision, and drops it when the row went', () => {
    setWorkflow('repo-1', OVERLAY, 'rev-2')
    expect(revisionForRepo('repo-1')).toBe('rev-2')
    setWorkflow('repo-1', null, null)
    expect(revisionForRepo('repo-1')).toBeNull()
  })

  it('reports a flow saved again as it was, since its revision moved', async () => {
    withStoredWorkflows({ 'repo-1': OVERLAY }, 'rev-1')
    await hydrateWorkflows()
    withStoredWorkflows({ 'repo-1': OVERLAY }, 'rev-2')
    expect(await hydrateWorkflows()).toEqual(['repo-1'])
    expect(revisionForRepo('repo-1')).toBe('rev-2')
  })

  it('forgets every revision on reset', async () => {
    withStoredWorkflows({ 'repo-1': OVERLAY })
    await hydrateWorkflows()
    resetWorkflowsCache()
    expect(revisionForRepo('repo-1')).toBeNull()
  })
})

describe('serialized loads', () => {
  it('runs overlapping requests as one load and one follow-up, the last read winning', async () => {
    const { load, parked } = withParkedLoads()
    const first = hydrateWorkflows()
    const second = hydrateWorkflows()
    const third = hydrateWorkflows()
    // The follow-up waits for the load in flight: nothing runs beside it.
    expect(load).toHaveBeenCalledTimes(1)
    expect(second).toBe(third)

    parked[0](rows({ 'repo-1': OVERLAY }, 'rev-1'))
    expect(await first).toEqual(['repo-1'])
    await flush()
    expect(load).toHaveBeenCalledTimes(2)

    parked[1](rows({}))
    // The follow-up's changed ids, against what the first load left.
    expect(await second).toEqual(['repo-1'])
    expect(load).toHaveBeenCalledTimes(2)
    expect(workflowForRepo('repo-1').source).toBe('default')
    expect(revisionForRepo('repo-1')).toBeNull()
  })

  it('starts a fresh load for a request made once the previous one settled', async () => {
    const { load, parked } = withParkedLoads()
    const first = hydrateWorkflows()
    parked[0](rows({}))
    await first
    const second = hydrateWorkflows()
    expect(load).toHaveBeenCalledTimes(2)
    parked[1](rows({ 'repo-1': OVERLAY }))
    expect(await second).toEqual(['repo-1'])
  })

  it('does not let a load that started before a save put the older row back', async () => {
    withStoredWorkflows({ 'repo-1': OVERLAY, 'repo-2': OVERLAY }, 'rev-1')
    await hydrateWorkflows()
    const { parked } = withParkedLoads()
    const pending = hydrateWorkflows()
    // Saved while the load is out: back to the default.
    setWorkflow('repo-1', null, null)
    // The load read the row before the delete, and another repository's edit.
    const edited: WorkflowOverlay = { ...OVERLAY, steps: [{ ...OVERLAY.steps[0], mode: 'blocking' }] }
    parked[0]({ 'repo-1': { definition: OVERLAY, revision: 'rev-1' }, 'repo-2': { definition: edited, revision: 'rev-9' } })
    // The saved repository is not reported (it did not move from what the cache holds);
    // the other one lands as usual.
    expect(await pending).toEqual(['repo-2'])
    expect(workflowForRepo('repo-1').source).toBe('default')
    expect(revisionForRepo('repo-1')).toBeNull()
    expect(overlayForRepo('repo-2')).toEqual(edited)
    expect(revisionForRepo('repo-2')).toBe('rev-9')
  })

  it('lets a load that started after the save confirm it', async () => {
    setWorkflow('repo-1', OVERLAY, 'rev-2')
    const edited: WorkflowOverlay = { ...OVERLAY, steps: [{ ...OVERLAY.steps[0], mode: 'blocking' }] }
    withStoredWorkflows({ 'repo-1': edited }, 'rev-3')
    expect(await hydrateWorkflows()).toEqual(['repo-1'])
    expect(overlayForRepo('repo-1')).toEqual(edited)
    expect(revisionForRepo('repo-1')).toBe('rev-3')
  })
})
