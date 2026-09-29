import { afterEach, describe, it, expect, vi } from 'vitest'
import { setStore, NOOP_STORE } from '../store/Store'
import { DEFAULT_WORKFLOW } from '../../workflow/defaultFlow'
import type { Workflow } from '../../workflow/model'
import { hydrateWorkflows, resetWorkflowsCache, workflowForRepo } from './workflows'

const CUSTOM: Workflow = {
  id: 'custom',
  entry: ['commit'],
  nodes: [
    { id: 'commit', skill: 'magic-commit', mode: 'blocking', required: true, outcomes: ['committed'], provides: ['commits'] },
    { id: 'pr', skill: 'magic-pr', mode: 'blocking', required: true, outcomes: [], provides: ['pr'] },
  ],
  links: [{ from: 'commit', to: 'pr', kind: 'auto' }],
}

function withStoredWorkflows(workflows: Record<string, unknown> | null) {
  setStore({ ...NOOP_STORE, loadRepositoryWorkflows: async () => workflows })
}

afterEach(() => {
  resetWorkflowsCache()
  setStore(NOOP_STORE)
  vi.restoreAllMocks()
})

describe('workflowForRepo', () => {
  it('serves the default flow to a repository without one, and to no repository', async () => {
    withStoredWorkflows({ 'repo-1': CUSTOM })
    await hydrateWorkflows()
    expect(workflowForRepo('repo-2')).toEqual({ workflow: DEFAULT_WORKFLOW, source: 'default' })
    expect(workflowForRepo(null)).toEqual({ workflow: DEFAULT_WORKFLOW, source: 'default' })
  })

  it('serves a repository its own valid flow', async () => {
    withStoredWorkflows({ 'repo-1': CUSTOM })
    await hydrateWorkflows()
    expect(workflowForRepo('repo-1')).toEqual({ workflow: CUSTOM, source: 'repository' })
  })

  it('ignores an invalid flow, with a warning, and serves the default', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const duplicated = { ...CUSTOM, nodes: [...CUSTOM.nodes, { ...CUSTOM.nodes[0], id: 'commit-2' }] }
    withStoredWorkflows({ 'repo-1': duplicated, 'repo-2': { nodes: 'nope' } })
    await hydrateWorkflows()
    expect(workflowForRepo('repo-1').source).toBe('default')
    expect(workflowForRepo('repo-2').source).toBe('default')
    expect(warn).toHaveBeenCalledTimes(2)
  })

  it('forgets every flow on reset', async () => {
    withStoredWorkflows({ 'repo-1': CUSTOM })
    await hydrateWorkflows()
    resetWorkflowsCache()
    expect(workflowForRepo('repo-1').source).toBe('default')
  })

  it('keeps what it had when a load rejects', async () => {
    withStoredWorkflows({ 'repo-1': CUSTOM })
    await hydrateWorkflows()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    setStore({ ...NOOP_STORE, loadRepositoryWorkflows: async () => { throw new Error('offline') } })
    await hydrateWorkflows()
    expect(workflowForRepo('repo-1').source).toBe('repository')
  })

  it('keeps what it had when a refresh fails to read', async () => {
    withStoredWorkflows({ 'repo-1': CUSTOM })
    await hydrateWorkflows()
    withStoredWorkflows(null)
    await hydrateWorkflows()
    expect(workflowForRepo('repo-1')).toEqual({ workflow: CUSTOM, source: 'repository' })
  })

  it('drops the flows a successful load no longer returns', async () => {
    withStoredWorkflows({ 'repo-1': CUSTOM })
    await hydrateWorkflows()
    withStoredWorkflows({})
    await hydrateWorkflows()
    expect(workflowForRepo('repo-1').source).toBe('default')
  })

  it('does not land a load that started before a sign-out', async () => {
    let release: (value: Record<string, unknown>) => void = () => {}
    setStore({ ...NOOP_STORE, loadRepositoryWorkflows: () => new Promise((resolve) => { release = resolve }) })
    const pending = hydrateWorkflows()
    resetWorkflowsCache()
    release({ 'repo-1': CUSTOM })
    await pending
    expect(workflowForRepo('repo-1').source).toBe('default')
  })
})
