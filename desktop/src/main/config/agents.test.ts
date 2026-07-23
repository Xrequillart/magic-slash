import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

// We need to mock CONFIG_DIR before importing agents, so that all file I/O
// goes to a temp directory instead of the real ~/.config/magic-slash.
let tmpDir: string

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agents-test-'))
})

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true })
})

// Helper: write agents.json in the temp dir
function writeAgentsFile(data: unknown): void {
  fs.writeFileSync(path.join(tmpDir, 'agents.json'), JSON.stringify(data, null, 2))
}

// Helper: read agents.json from the temp dir
function readAgentsFile(): unknown {
  return JSON.parse(fs.readFileSync(path.join(tmpDir, 'agents.json'), 'utf8'))
}

// We dynamically import agents.ts in each test after setting up mocks.
// To avoid module cache issues, we use vi.mock + vi.doMock.

vi.mock('./config', async () => {
  return {
    filterValidRepositories: (repos: string[]) => repos,
    get CONFIG_DIR() {
      // This will be set per-test via tmpDir
      return tmpDir
    },
  }
})

// We also need to mock the CONFIG_DIR import used by agents.ts.
// Since agents.ts does: const AGENTS_FILE = path.join(CONFIG_DIR, 'agents.json')
// and that's evaluated at module load time, we need to handle this differently.
// Let's instead re-import the module for each test.

// Actually, the simpler approach: since CONFIG_DIR is used at module level to compute
// AGENTS_FILE, we need to mock it before the module loads. Let's use a different approach:
// We'll mock the fs module calls instead to redirect to our temp dir.

// Let me take a cleaner approach: mock the config module to return tmpDir,
// and since AGENTS_FILE is computed once at module load, we need to reset modules.

vi.unmock('./config')

// Clean approach: We'll directly use the exported functions but mock the underlying
// fs operations by overriding AGENTS_FILE. Since AGENTS_FILE is derived from CONFIG_DIR
// at module load time, we'll use vi.mock for the config module.

// Actually, the cleanest approach for this codebase: import the pure functions
// (mergeMetadata, createDefaultMetadata) directly, and for the fs-dependent functions
// we'll create a small wrapper that sets up the right file paths.

// Let's just test by writing files to a tmp dir and using dynamic imports with
// module reset. But vitest doesn't easily support per-test module resets.

// Simplest viable approach: mock fs functions to redirect the agents file path.

vi.restoreAllMocks()

// --- Pure function tests (no fs needed) ---

import { createDefaultMetadata, mergeMetadata } from './agents'

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
    existing.repositoryMetadata = {
      'repo-a': { branchName: 'main', path: '/a' } as never,
    }

    const result = mergeMetadata(existing, {
      repositoryMetadata: {
        'repo-b': { branchName: 'dev', path: '/b' } as never,
      },
    })

    expect(result.repositoryMetadata).toBeDefined()
    expect(result.repositoryMetadata!['repo-a']).toBeDefined()
    expect(result.repositoryMetadata!['repo-b']).toBeDefined()
  })

  it('should overwrite same-key repositoryMetadata entries', () => {
    const existing = createDefaultMetadata()
    existing.repositoryMetadata = {
      'repo-a': { branchName: 'main', path: '/a' } as never,
    }

    const result = mergeMetadata(existing, {
      repositoryMetadata: {
        'repo-a': { branchName: 'develop', path: '/a2' } as never,
      },
    })

    expect((result.repositoryMetadata!['repo-a'] as Record<string, string>).branchName).toBe('develop')
  })

  it('should clean undefined values from the merged result', () => {
    const existing = createDefaultMetadata()
    existing.title = 'hello'

    const result = mergeMetadata(existing, { title: undefined } as never)
    // title is undefined in incoming, but spread keeps existing value
    // The clean loop removes keys that ended up undefined
    // In this case, ...existing sets title='hello', ...incoming has title=undefined
    // so the merged title is undefined, and the clean loop deletes it
    expect('title' in result).toBe(false)
  })

  it('should handle undefined existing metadata', () => {
    const result = mergeMetadata(undefined, { title: 'new', ticketId: 'T-1' })
    expect(result.title).toBe('new')
    expect(result.ticketId).toBe('T-1')
  })

  it('should set repositoryMetadata to undefined when both are empty', () => {
    const result = mergeMetadata(undefined, {})
    // Both existing and incoming repositoryMetadata are empty/undefined
    // mergedRepoMetadata = {}, Object.keys({}).length === 0 => undefined
    // then the clean loop removes it
    expect(result.repositoryMetadata).toBeUndefined()
  })
})

// --- FS-dependent tests ---
// We mock the AGENTS_FILE constant by mocking the config module's CONFIG_DIR export,
// but since AGENTS_FILE = path.join(CONFIG_DIR, 'agents.json') is computed at import
// time, we use a different strategy: directly mock the module-level AGENTS_FILE.

// The best approach: since agents.ts exports AGENTS_FILE, we can use vi.spyOn on fs
// to intercept reads/writes. But that's complex. Instead, let's use a helper that
// writes to a temp dir and then imports agents with mocked paths.

// Final clean approach: We'll use vi.doMock to mock the config import and then
// dynamically import agents for each describe block.

describe('readAgents (file-based)', () => {
  let readAgents: typeof import('./agents').readAgents

  beforeEach(async () => {
    vi.doMock('./config', () => ({
      filterValidRepositories: (repos: string[]) => repos,
      CONFIG_DIR: tmpDir,
    }))
    // Reset the agents module so AGENTS_FILE picks up the new CONFIG_DIR
    vi.resetModules()
    const mod = await import('./agents')
    readAgents = mod.readAgents
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should return [] when agents.json does not exist', () => {
    const result = readAgents()
    expect(result).toEqual([])
  })

  it('should return [] when file contains non-array (object)', () => {
    writeAgentsFile({ foo: 'bar' })
    const result = readAgents()
    expect(result).toEqual([])
  })

  it('should return [] when file contains non-array (string)', () => {
    fs.writeFileSync(path.join(tmpDir, 'agents.json'), '"hello"')
    const result = readAgents()
    expect(result).toEqual([])
  })

  it('should return [] when file contains invalid JSON', () => {
    fs.writeFileSync(path.join(tmpDir, 'agents.json'), '{broken json')
    const result = readAgents()
    expect(result).toEqual([])
  })

  it('should deduplicate by ID, keeping the last entry', () => {
    writeAgentsFile([
      { id: 'a1', name: 'Agent v1', repositories: [] },
      { id: 'a2', name: 'Agent 2', repositories: [] },
      { id: 'a1', name: 'Agent v2', repositories: [] },
    ])
    const result = readAgents()
    expect(result).toHaveLength(2)
    const a1 = result.find(a => a.id === 'a1')
    expect(a1!.name).toBe('Agent v2')
  })

  it('should normalize missing repositories to []', () => {
    writeAgentsFile([{ id: 'a1', name: 'Test' }])
    const result = readAgents()
    expect(result[0].repositories).toEqual([])
  })

  it('should normalize missing metadata with defaults', () => {
    writeAgentsFile([{ id: 'a1', name: 'Test', repositories: [] }])
    const result = readAgents()
    expect(result[0].metadata).toBeDefined()
    expect(result[0].metadata!.title).toBe('')
    expect(result[0].metadata!.relatedWorktrees).toEqual([])
    expect(result[0].metadata!.repositoryMetadata).toEqual({})
  })

  it('should preserve existing metadata fields while filling defaults', () => {
    writeAgentsFile([{
      id: 'a1',
      name: 'Test',
      repositories: [],
      metadata: { title: 'My Task', ticketId: 'PROJ-1' },
    }])
    const result = readAgents()
    expect(result[0].metadata!.title).toBe('My Task')
    expect(result[0].metadata!.ticketId).toBe('PROJ-1')
    // Defaults filled in
    expect(result[0].metadata!.branchName).toBe('')
  })

  it('should normalize missing splitPane to "left"', () => {
    writeAgentsFile([{ id: 'a1', name: 'Test', repositories: [] }])
    const result = readAgents()
    expect(result[0].splitPane).toBe('left')
  })

  it('should preserve existing splitPane value', () => {
    writeAgentsFile([{ id: 'a1', name: 'Test', repositories: [], splitPane: 'right' }])
    const result = readAgents()
    expect(result[0].splitPane).toBe('right')
  })

  it('should skip entries without a valid id', () => {
    writeAgentsFile([
      { id: 'a1', name: 'Good Agent', repositories: [] },
      { name: 'No ID Agent', repositories: [] },
      { id: '', name: 'Empty ID Agent', repositories: [] },
      { id: null, name: 'Null ID Agent', repositories: [] },
      { id: 123, name: 'Numeric ID Agent', repositories: [] },
      { id: 'a2', name: 'Another Good Agent', repositories: [] },
    ])
    const result = readAgents()
    expect(result).toHaveLength(2)
    expect(result[0].id).toBe('a1')
    expect(result[1].id).toBe('a2')
  })
})

describe('writeAgents', () => {
  let writeAgentsFn: typeof import('./agents').writeAgents

  beforeEach(async () => {
    vi.doMock('./config', () => ({
      filterValidRepositories: (repos: string[]) => repos,
      CONFIG_DIR: tmpDir,
    }))
    vi.resetModules()
    const mod = await import('./agents')
    writeAgentsFn = mod.writeAgents
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should write valid JSON to agents.json', () => {
    const agents = [
      { id: 'a1', name: 'Agent 1', repositories: ['/repo1'], tsCreate: 1000 },
      { id: 'a2', name: 'Agent 2', repositories: [], tsCreate: 2000 },
    ]
    writeAgentsFn(agents as never)
    const written = readAgentsFile()
    expect(written).toEqual(agents)
  })

  it('should create the config directory if it does not exist', () => {
    const nestedDir = path.join(tmpDir, 'nested', 'dir')
    // Re-mock with nested dir
    vi.doMock('./config', () => ({
      filterValidRepositories: (repos: string[]) => repos,
      CONFIG_DIR: nestedDir,
    }))
    vi.resetModules()

    // Dynamically re-import
    return import('./agents').then(mod => {
      mod.writeAgents([{ id: 'a1', name: 'Test', repositories: [], tsCreate: 1 } as never])
      const content = JSON.parse(fs.readFileSync(path.join(nestedDir, 'agents.json'), 'utf8'))
      expect(content).toHaveLength(1)
      expect(content[0].id).toBe('a1')
    })
  })

  it('should write an empty array', () => {
    writeAgentsFn([])
    const written = readAgentsFile()
    expect(written).toEqual([])
  })
})

describe('saveAgent', () => {
  let saveAgent: typeof import('./agents').saveAgent
  let readAgents: typeof import('./agents').readAgents

  beforeEach(async () => {
    vi.doMock('./config', () => ({
      filterValidRepositories: (repos: string[]) => repos,
      CONFIG_DIR: tmpDir,
    }))
    vi.resetModules()
    const mod = await import('./agents')
    saveAgent = mod.saveAgent
    readAgents = mod.readAgents
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should create a new agent', () => {
    // Start with empty agents file
    writeAgentsFile([])

    saveAgent('a1', 'My Agent', ['/repo1'], undefined, 12345)
    const agents = readAgents()
    expect(agents).toHaveLength(1)
    expect(agents[0].id).toBe('a1')
    expect(agents[0].name).toBe('My Agent')
    expect(agents[0].repositories).toEqual(['/repo1'])
    expect(agents[0].tsCreate).toBe(12345)
  })

  it('should preserve existing splitPane when re-saving', () => {
    // Create initial agent with splitPane = right
    writeAgentsFile([{
      id: 'a1',
      name: 'Agent',
      repositories: [],
      tsCreate: 100,
      splitPane: 'right',
      metadata: { title: '', branchName: '', ticketId: '', description: '', status: '', fullStackTaskId: '', relatedWorktrees: [], repositoryMetadata: {} },
    }])

    // Re-save the same agent with new name
    saveAgent('a1', 'Updated Agent', ['/repo1'])
    const agents = readAgents()
    expect(agents).toHaveLength(1)
    expect(agents[0].name).toBe('Updated Agent')
    expect(agents[0].splitPane).toBe('right')
  })

  it('should preserve tsCreate from existing agent when not provided', () => {
    writeAgentsFile([{
      id: 'a1',
      name: 'Agent',
      repositories: [],
      tsCreate: 5555,
      metadata: { title: '', branchName: '', ticketId: '', description: '', status: '', fullStackTaskId: '', relatedWorktrees: [], repositoryMetadata: {} },
    }])

    saveAgent('a1', 'Updated', [])
    const agents = readAgents()
    expect(agents[0].tsCreate).toBe(5555)
  })

  it('should add a new agent alongside existing ones', () => {
    writeAgentsFile([{
      id: 'a1',
      name: 'Agent 1',
      repositories: [],
      tsCreate: 100,
      metadata: { title: '', branchName: '', ticketId: '', description: '', status: '', fullStackTaskId: '', relatedWorktrees: [], repositoryMetadata: {} },
    }])

    saveAgent('a2', 'Agent 2', ['/new-repo'], undefined, 200)
    const agents = readAgents()
    expect(agents).toHaveLength(2)
    expect(agents.find(a => a.id === 'a1')).toBeDefined()
    expect(agents.find(a => a.id === 'a2')).toBeDefined()
  })
})

describe('removeAgent', () => {
  let removeAgent: typeof import('./agents').removeAgent
  let readAgents: typeof import('./agents').readAgents

  beforeEach(async () => {
    vi.doMock('./config', () => ({
      filterValidRepositories: (repos: string[]) => repos,
      CONFIG_DIR: tmpDir,
    }))
    vi.resetModules()
    const mod = await import('./agents')
    removeAgent = mod.removeAgent
    readAgents = mod.readAgents
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should remove an agent by ID', () => {
    writeAgentsFile([
      { id: 'a1', name: 'Agent 1', repositories: [], tsCreate: 100 },
      { id: 'a2', name: 'Agent 2', repositories: [], tsCreate: 200 },
    ])

    removeAgent('a1')
    const agents = readAgents()
    expect(agents).toHaveLength(1)
    expect(agents[0].id).toBe('a2')
  })

  it('should be a no-op if the ID does not exist', () => {
    writeAgentsFile([
      { id: 'a1', name: 'Agent 1', repositories: [], tsCreate: 100 },
    ])

    removeAgent('nonexistent')
    const agents = readAgents()
    expect(agents).toHaveLength(1)
  })
})

describe('updateAgentMetadata', () => {
  let updateAgentMetadata: typeof import('./agents').updateAgentMetadata
  let readAgents: typeof import('./agents').readAgents

  beforeEach(async () => {
    vi.doMock('./config', () => ({
      filterValidRepositories: (repos: string[]) => repos,
      CONFIG_DIR: tmpDir,
    }))
    vi.resetModules()
    const mod = await import('./agents')
    updateAgentMetadata = mod.updateAgentMetadata
    readAgents = mod.readAgents
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should deep-merge repositoryMetadata', () => {
    writeAgentsFile([{
      id: 'a1',
      name: 'Agent',
      repositories: [],
      tsCreate: 100,
      metadata: {
        title: 'Task',
        repositoryMetadata: {
          'repo-a': { branchName: 'main' },
        },
      },
    }])

    updateAgentMetadata('a1', {
      ticketId: 'PROJ-1',
      repositoryMetadata: {
        'repo-b': { branchName: 'dev' } as never,
      },
    })

    const agents = readAgents()
    expect(agents[0].metadata!.ticketId).toBe('PROJ-1')
    expect(agents[0].metadata!.title).toBe('Task')
    expect(agents[0].metadata!.repositoryMetadata!['repo-a']).toBeDefined()
    expect(agents[0].metadata!.repositoryMetadata!['repo-b']).toBeDefined()
  })

  it('should not modify agents if ID is not found', () => {
    writeAgentsFile([{
      id: 'a1',
      name: 'Agent',
      repositories: [],
      tsCreate: 100,
      metadata: { title: 'Original' },
    }])

    updateAgentMetadata('nonexistent', { title: 'Changed' })
    const agents = readAgents()
    expect(agents[0].metadata!.title).toBe('Original')
  })
})

describe('updateAgentSplitPane', () => {
  let updateAgentSplitPane: typeof import('./agents').updateAgentSplitPane
  let readAgents: typeof import('./agents').readAgents

  beforeEach(async () => {
    vi.doMock('./config', () => ({
      filterValidRepositories: (repos: string[]) => repos,
      CONFIG_DIR: tmpDir,
    }))
    vi.resetModules()
    const mod = await import('./agents')
    updateAgentSplitPane = mod.updateAgentSplitPane
    readAgents = mod.readAgents
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should update the splitPane value', () => {
    writeAgentsFile([{
      id: 'a1',
      name: 'Agent',
      repositories: [],
      tsCreate: 100,
      splitPane: 'left',
    }])

    updateAgentSplitPane('a1', 'right')
    const agents = readAgents()
    expect(agents[0].splitPane).toBe('right')
  })

  it('should not modify agents if ID is not found', () => {
    writeAgentsFile([{
      id: 'a1',
      name: 'Agent',
      repositories: [],
      tsCreate: 100,
      splitPane: 'left',
    }])

    updateAgentSplitPane('nonexistent', 'right')
    const agents = readAgents()
    expect(agents[0].splitPane).toBe('left')
  })
})
