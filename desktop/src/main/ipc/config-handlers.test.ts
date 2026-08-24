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
  CONFIG_DIR: '/mock',
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
  updateUsageLogsEnabled: vi.fn(),
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

import { codeToHtml } from 'shiki'
import { annotateShikiHtml, parseDiff, readFileForPreview } from './config-handlers'
import { numberShikiLines } from './hunkView'

const mockCodeToHtml = vi.mocked(codeToHtml)

/** Shiki's shape for a file of `count` lines, each holding its own number as text. */
function shikiDoc(count: number): string {
  const rows = Array.from({ length: count }, (_, i) => `<span class="line">L${i + 1}</span>`)
  return `<pre class="shiki"><code>${rows.join('\n')}</code></pre>`
}

/** The attributes of every row in a document, in order. */
function rowAttributes(html: string): string[] {
  return [...html.matchAll(/<span class="line"([^>]*)>/g)].map(([, attrs]) => attrs)
}

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

    // The two checks above are lexical, and `path.resolve` never follows a symlink —
    // so a link INSIDE the tree can name a target anywhere on disk and satisfy them
    // both. This is the case the spec panel makes reachable: its repoPath is the
    // spec's own parent directory, so lexical containment holds by construction and
    // the canonical check is the only thing left.
    it('blocks a symlink whose target escapes the repo', async () => {
      const outside = path.join(tmpDir, 'outside-secret.txt')
      fs.writeFileSync(outside, 'SECRET')

      const repo = path.join(tmpDir, 'repo-with-link')
      fs.mkdirSync(repo, { recursive: true })
      const link = path.join(repo, 'looks-innocent.txt')
      fs.symlinkSync(outside, link)

      const result = await readFileForPreview(repo, 'looks-innocent.txt')
      expect(result).toEqual({ error: 'path_traversal' })
    })

    it('still reads a symlink whose target stays inside the repo', async () => {
      const repo = path.join(tmpDir, 'repo-inner-link')
      fs.mkdirSync(repo, { recursive: true })
      fs.writeFileSync(path.join(repo, 'real.txt'), 'inside')
      fs.symlinkSync(path.join(repo, 'real.txt'), path.join(repo, 'alias.txt'))

      const result = await readFileForPreview(repo, 'alias.txt')
      expect(result).toMatchObject({ content: 'inside', encoding: 'utf8' })
    })
  })

  describe('non-deleted files (live filesystem)', () => {
    // Also guards the canonical containment check above: `realpathSync` throws for a
    // path that does not exist, and that must stay a not_found rather than becoming a
    // refusal — a spec's path is announced before the file is written.
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
  // The positions the epic's navigator and marker ruler will read. They are extracted
  // from the ParsedDiff BEFORE the HTML is annotated, because annotating drains the
  // removed-lines map — so a regression here looks like `removedBefore` silently
  // emptying while the highlighting still works.
  describe('changed-line positions', () => {
    it('reports the added and removed positions of a modified file', async () => {
      const filePath = path.join(tmpDir, 'changed.ts')
      fs.writeFileSync(filePath, 'a\nb\nc\nd\ne\nf\ng\nh\ni\nj\nk\n')
      mockExecFileSync.mockReturnValueOnce(Buffer.from(
        [
          '@@ -1,3 +1,3 @@',
          ' a',
          '-old',
          '+b',
          ' c',
          '@@ -10,2 +10,3 @@',
          ' j',
          '+k',
        ].join('\n'),
        'utf8',
      ))

      const result = await readFileForPreview(tmpDir, 'changed.ts', 'modified')
      expect(result).toMatchObject({ changedLines: { added: [2, 11], removedBefore: [2] } })
    })

    it('reports no positions for an added file, and never runs git for one', async () => {
      const filePath = path.join(tmpDir, 'brand-new.ts')
      fs.writeFileSync(filePath, 'const x = 1\n')

      const result = await readFileForPreview(tmpDir, 'brand-new.ts', 'added') as { changedLines?: unknown }
      expect(result.changedLines).toBeUndefined()
      expect(mockExecFileSync).not.toHaveBeenCalled()
    })
  })

  // Only a modified or renamed file gets a second, collapsed rendering. The absence
  // of one is load-bearing: it is what tells the panel's header there is no expand
  // toggle to offer, and what makes an all-changed file render exactly as before.
  describe('changes-only rendering', () => {
    it('collapses a long file to its changed regions, and keeps the whole one alongside', async () => {
      const filePath = path.join(tmpDir, 'long.ts')
      fs.writeFileSync(filePath, Array.from({ length: 40 }, (_, i) => `L${i + 1}`).join('\n'))
      mockCodeToHtml.mockResolvedValueOnce(shikiDoc(40))
      mockExecFileSync.mockReturnValueOnce(Buffer.from(
        ['@@ -20,1 +20,1 @@', '-was', '+L20'].join('\n'),
        'utf8',
      ))

      const result = await readFileForPreview(tmpDir, 'long.ts', 'modified') as
        { highlightedHtml: string; changesOnlyHtml: string }

      // Four lines of context each side of line 20, and a marker for each cut.
      expect(rowAttributes(result.changesOnlyHtml).filter(a => / data-elided=/.test(a)))
        .toEqual([' data-elided="15"', ' data-elided="16"'])
      expect(result.changesOnlyHtml).toContain('>L16<')
      expect(result.changesOnlyHtml).not.toContain('>L15<')
      // The full document is untouched by any of this — it is what the expand shows.
      expect(result.highlightedHtml).toContain('>L1<')
      expect(result.highlightedHtml).not.toContain('data-elided')
    })

    it('offers no collapsed view for an added file, where every line is a change', async () => {
      const filePath = path.join(tmpDir, 'fresh.ts')
      fs.writeFileSync(filePath, Array.from({ length: 40 }, (_, i) => `L${i + 1}`).join('\n'))
      mockCodeToHtml.mockResolvedValueOnce(shikiDoc(40))

      const result = await readFileForPreview(tmpDir, 'fresh.ts', 'added') as { changesOnlyHtml?: string }
      expect(result.changesOnlyHtml).toBeUndefined()
    })

    it('offers no collapsed view when the context already reaches both ends of the file', async () => {
      const filePath = path.join(tmpDir, 'short.ts')
      fs.writeFileSync(filePath, 'L1\nL2\nL3\nL4\nL5')
      mockCodeToHtml.mockResolvedValueOnce(shikiDoc(5))
      mockExecFileSync.mockReturnValueOnce(Buffer.from(['@@ -3,1 +3,1 @@', '-was', '+L3'].join('\n'), 'utf8'))

      const result = await readFileForPreview(tmpDir, 'short.ts', 'modified') as { changesOnlyHtml?: string }
      expect(result.changesOnlyHtml).toBeUndefined()
    })

    it('numbers every row even where no diff was applied, so the gutter is never blank', async () => {
      // The spec panel's path: no status at all, and therefore no annotation.
      const filePath = path.join(tmpDir, 'plain.ts')
      fs.writeFileSync(filePath, 'L1\nL2\nL3')
      mockCodeToHtml.mockResolvedValueOnce(shikiDoc(3))

      const result = await readFileForPreview(tmpDir, 'plain.ts') as { highlightedHtml: string }
      expect(rowAttributes(result.highlightedHtml)).toEqual([
        ' data-line="1"', ' data-line="2"', ' data-line="3"',
      ])
    })
  })
})

// The gutter reads its number off the row, and a deletion is the one row whose
// number comes from a different file — so these two functions are where the two
// numbering spaces are kept apart. A regression here is silent: the highlighting
// still works, the wrong numbers just appear beside it.
describe('parseDiff', () => {
  it('numbers a removed line in the OLD file, which is the only number it ever had', () => {
    const diff = parseDiff(['@@ -10,4 +10,3 @@', ' a', '-gone', '-also gone', ' b'].join('\n'))
    expect(diff.removedBeforeLines.get(11)).toEqual([
      { text: 'gone', oldLine: 11 },
      { text: 'also gone', oldLine: 12 },
    ])
  })

  it('keeps the two files apart once an edit has shifted them', () => {
    // Two lines added at the top push the new file ahead; the deletion further down
    // must still report where it was BEFORE that shift.
    const diff = parseDiff([
      '@@ -1,3 +1,5 @@',
      ' a',
      '+one',
      '+two',
      ' b',
      '-gone',
      ' c',
    ].join('\n'))
    expect(diff.addedNewLines).toEqual(new Set([2, 3]))
    expect(diff.removedBeforeLines.get(5)).toEqual([{ text: 'gone', oldLine: 3 }])
  })

  it('places lines deleted at the end of the file one past its last line', () => {
    const diff = parseDiff(['@@ -1,3 +1,1 @@', ' a', '-b', '-c'].join('\n'))
    expect([...diff.removedBeforeLines.keys()]).toEqual([2])
  })
})

describe('annotateShikiHtml', () => {
  it('gives a deleted row the old number for its gutter and the new one for its place', () => {
    const numbered = numberShikiLines(shikiDoc(3))
    const diff = parseDiff(['@@ -1,3 +1,2 @@', ' L1', '-gone', ' L2'].join('\n'))
    const html = annotateShikiHtml(numbered, diff, 'normal')

    // The removed row sits before line 2 of the new file and shows line 2 of the old.
    expect(rowAttributes(html)).toEqual([
      ' data-line="1"',
      ' data-line="2" data-anchor="2" data-diff="remove"',
      ' data-line="2"',
      ' data-line="3"',
    ])
  })

  it('keeps the numbers the rows already carry when marking a file all added', () => {
    const html = annotateShikiHtml(numberShikiLines(shikiDoc(2)), null, 'all-add')
    expect(rowAttributes(html)).toEqual([
      ' data-line="1" data-diff="add"',
      ' data-line="2" data-diff="add"',
    ])
  })

  it('anchors lines deleted at the end of the file past its last row', () => {
    const numbered = numberShikiLines(shikiDoc(2))
    const diff = parseDiff(['@@ -1,4 +1,2 @@', ' L1', ' L2', '-gone', '-also'].join('\n'))
    const html = annotateShikiHtml(numbered, diff, 'normal')

    expect(rowAttributes(html)).toEqual([
      ' data-line="1"',
      ' data-line="2"',
      ' data-line="3" data-anchor="3" data-diff="remove"',
      ' data-line="4" data-anchor="3" data-diff="remove"',
    ])
  })
})
