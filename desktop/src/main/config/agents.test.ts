import { describe, it, expect, beforeEach } from 'vitest'
import type { Agent } from '../../types'
import type { Store } from '../store/Store'
import { setStore, NOOP_STORE } from '../store/Store'
import {
  createDefaultMetadata,
  mergeMetadata,
  readAgents,
  writeAgents,
  saveAgent,
  removeAgent,
  updateAgentMetadata,
  updateAgentSplitPane,
  hydrateAgents,
} from './agents'

// Agents live in the Supabase `agents` table behind the Store — there is no local
// agents.json. These tests seed a fake store, hydrate the cache, then exercise the
// synchronous cache API (which writes through to the store).

let savedAgents: unknown[] = []

function fakeStore(initial: unknown[] = []): Store {
  savedAgents = structuredClone(initial)
  return {
    ...NOOP_STORE,
    loadAgents: async () => structuredClone(savedAgents) as Agent[],
    saveAgents: async (a) => { savedAgents = structuredClone(a) },
  }
}

async function seed(initial: unknown[] = []): Promise<void> {
  setStore(fakeStore(initial))
  await hydrateAgents()
}

// --- Pure function tests (no store needed) ---

describe('createDefaultMetadata', () => {
  it('should return a default metadata object', () => {
    const meta = createDefaultMetadata()
    expect(meta.title).toBe('')
    expect(meta.branchName).toBe('')
    expect(meta.ticketId).toBe('')
    expect(meta.description).toBe('')
    expect(meta.status).toBe('')
    expect(meta.fullStackTaskId).toBe('')
    expect(meta.relatedWorktrees).toEqual([])
    expect(meta.repositoryMetadata).toEqual({})
  })
})

describe('mergeMetadata', () => {
  it('should merge incoming fields into existing metadata', () => {
    const existing = createDefaultMetadata()
    existing.title = 'old title'
    existing.branchName = 'feat/old'

    const result = mergeMetadata(existing, { title: 'new title', ticketId: 'PROJ-1' })
    expect(result.title).toBe('new title')
    expect(result.branchName).toBe('feat/old')
    expect(result.ticketId).toBe('PROJ-1')
  })

  it('should deep-merge repositoryMetadata', () => {
    const existing = createDefaultMetadata()
    existing.repositoryMetadata = { 'repo-a': { branchName: 'main', path: '/a' } as never }

    const result = mergeMetadata(existing, {
      repositoryMetadata: { 'repo-b': { branchName: 'dev', path: '/b' } as never },
    })

    expect(result.repositoryMetadata!['repo-a']).toBeDefined()
    expect(result.repositoryMetadata!['repo-b']).toBeDefined()
  })

  it('should overwrite same-key repositoryMetadata entries', () => {
    const existing = createDefaultMetadata()
    existing.repositoryMetadata = { 'repo-a': { branchName: 'main', path: '/a' } as never }

    const result = mergeMetadata(existing, {
      repositoryMetadata: { 'repo-a': { branchName: 'develop', path: '/a2' } as never },
    })

    expect((result.repositoryMetadata!['repo-a'] as Record<string, string>).branchName).toBe('develop')
  })

  it('should clean undefined values from the merged result', () => {
    const existing = createDefaultMetadata()
    existing.title = 'hello'
    const result = mergeMetadata(existing, { title: undefined } as never)
    expect('title' in result).toBe(false)
  })

  it('should handle undefined existing metadata', () => {
    const result = mergeMetadata(undefined, { title: 'new', ticketId: 'T-1' })
    expect(result.title).toBe('new')
    expect(result.ticketId).toBe('T-1')
  })

  it('should set repositoryMetadata to undefined when both are empty', () => {
    const result = mergeMetadata(undefined, {})
    expect(result.repositoryMetadata).toBeUndefined()
  })
})

// --- Store-backed cache tests ---

describe('hydrateAgents / readAgents', () => {
  beforeEach(async () => {
    await seed([])
  })

  it('returns [] when the store has no agents', () => {
    expect(readAgents()).toEqual([])
  })

  it('deduplicates by id, keeping the last entry', async () => {
    await seed([
      { id: 'a1', name: 'Agent v1', repositories: [] },
      { id: 'a2', name: 'Agent 2', repositories: [] },
      { id: 'a1', name: 'Agent v2', repositories: [] },
    ])
    const result = readAgents()
    expect(result).toHaveLength(2)
    expect(result.find(a => a.id === 'a1')!.name).toBe('Agent v2')
  })

  it('normalizes missing repositories/metadata/splitPane', async () => {
    await seed([{ id: 'a1', name: 'Test' }])
    const a = readAgents()[0]
    expect(a.repositories).toEqual([])
    expect(a.metadata!.title).toBe('')
    expect(a.metadata!.repositoryMetadata).toEqual({})
    expect(a.splitPane).toBe('left')
  })

  it('preserves an existing splitPane value', async () => {
    await seed([{ id: 'a1', name: 'Test', repositories: [], splitPane: 'right' }])
    expect(readAgents()[0].splitPane).toBe('right')
  })

  it('skips entries without a valid id', async () => {
    await seed([
      { id: 'a1', name: 'Good', repositories: [] },
      { name: 'No ID', repositories: [] },
      { id: '', name: 'Empty ID', repositories: [] },
      { id: 'a2', name: 'Good 2', repositories: [] },
    ])
    const result = readAgents()
    expect(result.map(a => a.id)).toEqual(['a1', 'a2'])
  })
})

describe('writeAgents', () => {
  beforeEach(async () => { await seed([]) })

  it('replaces the cache and writes through to the store', async () => {
    const agents: Agent[] = [
      { id: 'a1', name: 'Agent 1', repositories: ['/repo1'], tsCreate: 1000 },
      { id: 'a2', name: 'Agent 2', repositories: [], tsCreate: 2000 },
    ]
    writeAgents(agents)
    expect(readAgents()).toEqual(agents)
    await Promise.resolve()
    expect(savedAgents).toEqual(agents)
  })
})

describe('saveAgent', () => {
  beforeEach(async () => { await seed([]) })

  it('creates a new agent', () => {
    saveAgent('a1', 'My Agent', ['/repo1'], undefined, 12345)
    const agents = readAgents()
    expect(agents).toHaveLength(1)
    expect(agents[0]).toMatchObject({ id: 'a1', name: 'My Agent', repositories: ['/repo1'], tsCreate: 12345 })
  })

  it('preserves existing splitPane when re-saving', async () => {
    await seed([{ id: 'a1', name: 'Agent', repositories: [], tsCreate: 100, splitPane: 'right' }])
    saveAgent('a1', 'Updated Agent', ['/repo1'])
    const agents = readAgents()
    expect(agents).toHaveLength(1)
    expect(agents[0].name).toBe('Updated Agent')
    expect(agents[0].splitPane).toBe('right')
  })

  it('preserves tsCreate from the existing agent when not provided', async () => {
    await seed([{ id: 'a1', name: 'Agent', repositories: [], tsCreate: 5555 }])
    saveAgent('a1', 'Updated', [])
    expect(readAgents()[0].tsCreate).toBe(5555)
  })

  it('adds a new agent alongside existing ones', async () => {
    await seed([{ id: 'a1', name: 'Agent 1', repositories: [], tsCreate: 100 }])
    saveAgent('a2', 'Agent 2', ['/new-repo'], undefined, 200)
    const agents = readAgents()
    expect(agents).toHaveLength(2)
  })
})

describe('removeAgent', () => {
  it('removes an agent by id', async () => {
    await seed([
      { id: 'a1', name: 'Agent 1', repositories: [], tsCreate: 100 },
      { id: 'a2', name: 'Agent 2', repositories: [], tsCreate: 200 },
    ])
    removeAgent('a1')
    const agents = readAgents()
    expect(agents).toHaveLength(1)
    expect(agents[0].id).toBe('a2')
  })

  it('is a no-op if the id does not exist', async () => {
    await seed([{ id: 'a1', name: 'Agent 1', repositories: [], tsCreate: 100 }])
    removeAgent('nope')
    expect(readAgents()).toHaveLength(1)
  })
})

describe('updateAgentMetadata', () => {
  it('deep-merges repositoryMetadata', async () => {
    await seed([{
      id: 'a1', name: 'Agent', repositories: [], tsCreate: 100,
      metadata: { title: 'Task', repositoryMetadata: { 'repo-a': { branchName: 'main' } } },
    }])
    updateAgentMetadata('a1', {
      ticketId: 'PROJ-1',
      repositoryMetadata: { 'repo-b': { branchName: 'dev' } as never },
    })
    const a = readAgents()[0]
    expect(a.metadata!.ticketId).toBe('PROJ-1')
    expect(a.metadata!.title).toBe('Task')
    expect(a.metadata!.repositoryMetadata!['repo-a']).toBeDefined()
    expect(a.metadata!.repositoryMetadata!['repo-b']).toBeDefined()
  })

  it('does not modify agents if the id is not found', async () => {
    await seed([{ id: 'a1', name: 'Agent', repositories: [], tsCreate: 100, metadata: { title: 'Original' } }])
    updateAgentMetadata('nope', { title: 'Changed' })
    expect(readAgents()[0].metadata!.title).toBe('Original')
  })
})

describe('updateAgentSplitPane', () => {
  it('updates the splitPane value', async () => {
    await seed([{ id: 'a1', name: 'Agent', repositories: [], tsCreate: 100, splitPane: 'left' }])
    updateAgentSplitPane('a1', 'right')
    expect(readAgents()[0].splitPane).toBe('right')
  })

  it('does not modify agents if the id is not found', async () => {
    await seed([{ id: 'a1', name: 'Agent', repositories: [], tsCreate: 100, splitPane: 'left' }])
    updateAgentSplitPane('nope', 'right')
    expect(readAgents()[0].splitPane).toBe('left')
  })
})
