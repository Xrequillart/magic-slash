import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

let tmpDir: string

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'activity-history-test-'))
})

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true })
})

function writeHistoryFile(data: unknown): void {
  fs.writeFileSync(path.join(tmpDir, 'history.json'), JSON.stringify(data, null, 2))
}

function readHistoryFile(): unknown {
  return JSON.parse(fs.readFileSync(path.join(tmpDir, 'history.json'), 'utf8'))
}

describe('readHistory', () => {
  let readHistory: typeof import('./activity-history').readHistory

  beforeEach(async () => {
    vi.doMock('./config', () => ({
      CONFIG_DIR: tmpDir,
    }))
    vi.resetModules()
    const mod = await import('./activity-history')
    readHistory = mod.readHistory
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should return [] when history.json does not exist', () => {
    expect(readHistory()).toEqual([])
  })

  it('should return [] when file contains non-array', () => {
    writeHistoryFile({ foo: 'bar' })
    expect(readHistory()).toEqual([])
  })

  it('should return [] when file contains invalid JSON', () => {
    fs.writeFileSync(path.join(tmpDir, 'history.json'), '{broken')
    expect(readHistory()).toEqual([])
  })

  it('should return entries when file contains a valid array', () => {
    const entries = [
      { id: '1', agentId: 'a1', agentName: 'Claude 1', action: 'started', repositories: [], timestamp: 1000 },
    ]
    writeHistoryFile(entries)
    const result = readHistory()
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('1')
  })
})

describe('addHistoryEntry', () => {
  let addHistoryEntry: typeof import('./activity-history').addHistoryEntry
  let readHistory: typeof import('./activity-history').readHistory

  beforeEach(async () => {
    vi.doMock('./config', () => ({
      CONFIG_DIR: tmpDir,
    }))
    vi.resetModules()
    const mod = await import('./activity-history')
    addHistoryEntry = mod.addHistoryEntry
    readHistory = mod.readHistory
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should create an entry with all fields', () => {
    const entry = addHistoryEntry({
      agentId: 'a1',
      agentName: 'Claude 1',
      action: 'started',
      ticketId: 'PROJ-123',
      description: 'Fix login',
      repositories: ['/repo1'],
    })

    expect(entry.id).toBeDefined()
    expect(entry.agentId).toBe('a1')
    expect(entry.agentName).toBe('Claude 1')
    expect(entry.action).toBe('started')
    expect(entry.ticketId).toBe('PROJ-123')
    expect(entry.description).toBe('Fix login')
    expect(entry.repositories).toEqual(['/repo1'])
    expect(entry.timestamp).toBeGreaterThan(0)
  })

  it('should persist to history.json', () => {
    addHistoryEntry({
      agentId: 'a1',
      agentName: 'Claude 1',
      action: 'committed',
      repositories: [],
    })

    const data = readHistoryFile() as unknown[]
    expect(data).toHaveLength(1)
  })

  it('should append to existing entries', () => {
    writeHistoryFile([
      { id: 'existing', agentId: 'a0', agentName: 'Old', action: 'started', repositories: [], timestamp: 1000 },
    ])

    addHistoryEntry({
      agentId: 'a1',
      agentName: 'Claude 1',
      action: 'committed',
      repositories: [],
    })

    const result = readHistory()
    expect(result).toHaveLength(2)
    expect(result[0].id).toBe('existing')
  })

  it('should cap entries at 500 by removing oldest', () => {
    const existing = Array.from({ length: 500 }, (_, i) => ({
      id: `entry-${i}`,
      agentId: 'a1',
      agentName: 'Claude',
      action: 'started',
      repositories: [],
      timestamp: i,
    }))
    writeHistoryFile(existing)

    addHistoryEntry({
      agentId: 'a2',
      agentName: 'Claude 2',
      action: 'committed',
      repositories: [],
    })

    const result = readHistory()
    expect(result).toHaveLength(500)
    expect(result[0].id).toBe('entry-1')
    expect(result[result.length - 1].agentName).toBe('Claude 2')
  })
})

describe('clearHistory', () => {
  let clearHistory: typeof import('./activity-history').clearHistory
  let readHistory: typeof import('./activity-history').readHistory

  beforeEach(async () => {
    vi.doMock('./config', () => ({
      CONFIG_DIR: tmpDir,
    }))
    vi.resetModules()
    const mod = await import('./activity-history')
    clearHistory = mod.clearHistory
    readHistory = mod.readHistory
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should clear all entries', () => {
    writeHistoryFile([
      { id: '1', agentId: 'a1', agentName: 'Claude', action: 'started', repositories: [], timestamp: 1000 },
      { id: '2', agentId: 'a1', agentName: 'Claude', action: 'committed', repositories: [], timestamp: 2000 },
    ])

    clearHistory()
    expect(readHistory()).toEqual([])
  })

  it('should handle clearing when file does not exist', () => {
    clearHistory()
    expect(readHistory()).toEqual([])
  })
})
