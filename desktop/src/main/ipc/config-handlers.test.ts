import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest'
import * as os from 'os'
import * as fs from 'fs'
import * as path from 'path'

// Mock electron before importing the module under test so ipcMain.handle
// doesn't fail outside an Electron environment.
vi.mock('electron', () => ({
  ipcMain: { handle: vi.fn() },
}))

// Mock spotlight-shortcut which has Electron dependencies
vi.mock('../spotlight-shortcut', () => ({
  reRegisterSpotlightShortcut: vi.fn(),
}))

// Mock all config modules to avoid file-system side effects at import time
vi.mock('../config/config', () => ({
  readConfig: vi.fn(),
  writeConfig: vi.fn(),
  CONFIG_FILE: '/mock/config.json',
  addRepository: vi.fn(),
  updateRepository: vi.fn(),
  deleteRepository: vi.fn(),
  renameRepository: vi.fn(),
  updateRepositoryLanguages: vi.fn(),
  updateRepositoryCommitSettings: vi.fn(),
  updateRepositoryResolveSettings: vi.fn(),
  updateRepositoryPullRequestSettings: vi.fn(),
  updateRepositoryIssuesSettings: vi.fn(),
  updateRepositoryBranchSettings: vi.fn(),
  updateRepositoryWorktreeFilesSettings: vi.fn(),
  updateSplitEnabled: vi.fn(),
  updateSplitActive: vi.fn(),
  updateLaunchMode: vi.fn(),
}))

vi.mock('../config/migrate', () => ({ repairConfig: vi.fn() }))

vi.mock('../config/schema-validator', () => ({
  validateConfig: vi.fn(() => ({ valid: true, errors: [] })),
}))

vi.mock('../config/defaults', () => ({
  isValidSpotlightShortcut: vi.fn(() => true),
  isValidLaunchMode: vi.fn(() => true),
}))

vi.mock('../config/validation', () => ({
  validateRepoName: vi.fn(),
  validateRepoPath: vi.fn(),
  isGitRepository: vi.fn(),
  hasGitHubRemote: vi.fn(),
  getGitStatus: vi.fn(),
  getGitDiffStats: vi.fn(),
  getBranchCommits: vi.fn(),
  getGitHubRepoUrl: vi.fn(),
  getPRTemplate: vi.fn(),
  createPRTemplate: vi.fn(),
  updatePRTemplate: vi.fn(),
  getRemoteBranches: vi.fn(),
}))

vi.mock('../config/command-history', () => ({
  getCommandHistory: vi.fn(),
  addCommandToHistory: vi.fn(),
  findBestMatch: vi.fn(),
  getLastCommand: vi.fn(),
}))

vi.mock('shiki', () => ({
  codeToHtml: vi.fn().mockResolvedValue('<pre><code><span class="line">mocked</span></code></pre>'),
}))

// Mutable reference for execFileSync so individual tests can override it
const mockExecFileSync: Mock<() => Buffer> = vi.fn()

vi.mock('child_process', () => ({
  execFileSync: (...args: unknown[]) => mockExecFileSync(...(args as Parameters<typeof mockExecFileSync>)),
}))

import { readFileForPreview } from './config-handlers'

// ── helpers ───────────────────────────────────────────────────────────────────

let tmpDir: string

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'config-handlers-test-'))
  mockExecFileSync.mockReset()
})

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true })
})

// ── tests ─────────────────────────────────────────────────────────────────────

describe('readFileForPreview', () => {
  describe('path traversal', () => {
    it('blocks ../../../etc/passwd style paths', async () => {
      const result = await readFileForPreview('/repo', '../../../etc/passwd')
      expect(result).toEqual({ error: 'path_traversal' })
    })

    it('blocks absolute paths that escape the repo', async () => {
      const result = await readFileForPreview('/repo', '/etc/passwd')
      expect(result).toEqual({ error: 'path_traversal' })
    })
  })

  describe('non-deleted files (live filesystem)', () => {
    it('returns not_found for a non-existent file', async () => {
      const result = await readFileForPreview(tmpDir, 'no-such-file.txt')
      expect(result).toEqual({ error: 'not_found' })
    })

    it('returns too_large for a file exceeding 10 MB', async () => {
      const filePath = path.join(tmpDir, 'big.bin')
      const tenMbPlusOne = 10 * 1024 * 1024 + 1
      // Create a sparse file of the desired size
      const fd = fs.openSync(filePath, 'w')
      const buf = Buffer.alloc(1, 0x41)
      fs.writeSync(fd, buf, 0, 1, tenMbPlusOne - 1)
      fs.closeSync(fd)

      const result = await readFileForPreview(tmpDir, 'big.bin')
      expect(result).toMatchObject({ error: 'too_large', size: tenMbPlusOne })
    })

    it('detects binary files via null-byte scan', async () => {
      const filePath = path.join(tmpDir, 'data.bin')
      const buf = Buffer.alloc(16, 0x41) // all 'A'
      buf[4] = 0x00 // inject a null byte
      fs.writeFileSync(filePath, buf)

      const result = await readFileForPreview(tmpDir, 'data.bin')
      expect(result).toMatchObject({ encoding: 'binary' })
    })

    it('returns utf8 content for a plain text file', async () => {
      const filePath = path.join(tmpDir, 'hello.txt')
      fs.writeFileSync(filePath, 'hello world', 'utf8')

      const result = await readFileForPreview(tmpDir, 'hello.txt')
      expect(result).toMatchObject({ encoding: 'utf8', content: 'hello world' })
    })
  })

  describe('deleted files (git show path)', () => {
    it('returns not_found when git show throws', async () => {
      mockExecFileSync.mockImplementationOnce(() => {
        throw new Error('fatal: path not in HEAD')
      })

      const result = await readFileForPreview('/repo', 'deleted.txt', 'deleted')
      expect(result).toEqual({ error: 'not_found' })
    })

    it('returns too_large when git show returns > 10 MB', async () => {
      const bigBuffer = Buffer.alloc(10 * 1024 * 1024 + 1, 0x41)
      mockExecFileSync.mockReturnValueOnce(bigBuffer)

      const result = await readFileForPreview('/repo', 'deleted.txt', 'deleted')
      expect(result).toMatchObject({ error: 'too_large', size: bigBuffer.length })
    })

    it('returns binary encoding for a deleted binary file', async () => {
      const buf = Buffer.alloc(16, 0x41)
      buf[4] = 0x00
      mockExecFileSync.mockReturnValueOnce(buf)

      const result = await readFileForPreview('/repo', 'deleted.bin', 'deleted')
      expect(result).toMatchObject({ encoding: 'binary' })
    })

    it('returns image encoding for a deleted .png file', async () => {
      // PNG magic bytes — note: byte index 1 is 0x50 ('P'), not null
      const buf = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
      mockExecFileSync.mockReturnValueOnce(buf)

      const result = await readFileForPreview('/repo', 'icon.png', 'deleted') as { encoding: string; content: string }
      expect(result.encoding).toBe('image')
      expect(result.content).toMatch(/^data:image\/png;base64,/)
    })

    it('returns utf8 content for a deleted text file', async () => {
      mockExecFileSync.mockReturnValueOnce(Buffer.from('old content', 'utf8'))

      const result = await readFileForPreview('/repo', 'deleted.txt', 'deleted')
      expect(result).toMatchObject({ encoding: 'utf8', content: 'old content' })
    })
  })
})
