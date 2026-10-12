import { execFileSync } from 'child_process'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { afterEach, describe, expect, it, vi } from 'vitest'

const attached: { terminalId: string; toolUseId: string; diffs: unknown[] }[] = []
vi.mock('./transcript-watcher', () => ({
  attachCommandDiffs: (terminalId: string, toolUseId: string, diffs: unknown[]) => attached.push({ terminalId, toolUseId, diffs }),
}))

const { commandEnded, commandStarting, mayWriteFiles, parseUnifiedDiff } = await import('./command-diff')

describe('mayWriteFiles', () => {
  it('measures scripts, in-place editors and redirections', () => {
    expect(mayWriteFiles("python3 - <<'EOF'\nprint(1)\nEOF")).toBe(true)
    expect(mayWriteFiles('cd x && sed -i "" s/a/b/ f.ts')).toBe(true)
    expect(mayWriteFiles('echo hi > notes.md')).toBe(true)
    expect(mayWriteFiles('cat <<EOF >> a.txt')).toBe(true)
  })
  it('skips what only reads', () => {
    expect(mayWriteFiles('git status --short')).toBe(false)
    expect(mayWriteFiles('ls -la 2>&1')).toBe(false)
    expect(mayWriteFiles('npm test > /dev/null')).toBe(false)
  })
})

describe('parseUnifiedDiff', () => {
  it('reads files, hunks, creations and deletions', () => {
    const text = [
      'diff --git a/src/a.ts b/src/a.ts',
      'index 1..2 100644',
      '--- a/src/a.ts',
      '+++ b/src/a.ts',
      '@@ -3,3 +3,3 @@ fn',
      ' a',
      '--- b',
      '+c',
      ' d',
      'diff --git a/n.md b/n.md',
      'new file mode 100644',
      '--- /dev/null',
      '+++ b/n.md',
      '@@ -0,0 +1 @@',
      '+x',
      'diff --git a/old.md b/old.md',
      'deleted file mode 100644',
      '--- a/old.md',
      '+++ /dev/null',
      '@@ -1 +0,0 @@',
      '-y',
      'diff --git a/img.png b/img.png',
      'Binary files a/img.png and b/img.png differ',
      '',
    ].join('\n')
    expect(parseUnifiedDiff(text, '/r')).toEqual([
      { path: '/r/src/a.ts', added: 1, removed: 1, hunks: [{ oldStart: 3, newStart: 3, lines: [' a', '--- b', '+c', ' d'] }] },
      { path: '/r/n.md', added: 1, removed: 0, hunks: [{ oldStart: 0, newStart: 1, lines: ['+x'] }] },
      { path: '/r/old.md', added: 0, removed: 1, hunks: [{ oldStart: 1, newStart: 0, lines: ['-y'] }] },
    ])
  })
})

describe('around a command', () => {
  let dir: string | null = null
  afterEach(() => {
    if (dir) fs.rmSync(dir, { recursive: true, force: true })
    dir = null
    attached.length = 0
  })

  it('attaches what the command changed, and only that', async () => {
    dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'command-diff-')))
    const git = (...args: string[]) => execFileSync('git', args, { cwd: dir! })
    git('init', '-q')
    git('-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-q', '--allow-empty', '-m', 'init')
    fs.writeFileSync(path.join(dir, 'a.txt'), 'one\ntwo\n')
    fs.writeFileSync(path.join(dir, 'staged.txt'), 'kept\n')
    git('add', 'staged.txt')
    const index = fs.readFileSync(path.join(dir, '.git', 'index'))

    const body = JSON.stringify({ tool_use_id: 'toolu_1', cwd: dir, tool_input: { command: 'python3 edit.py' } })
    await commandStarting(body)
    fs.writeFileSync(path.join(dir, 'a.txt'), 'one\n2\n')
    fs.writeFileSync(path.join(dir, 'b.txt'), 'new\n')
    await commandEnded('t1', body)

    expect(attached).toHaveLength(1)
    expect(attached[0]).toMatchObject({ terminalId: 't1', toolUseId: 'toolu_1' })
    expect(attached[0].diffs).toEqual([
      { path: path.join(dir, 'a.txt'), added: 1, removed: 1, hunks: [{ oldStart: 1, newStart: 1, lines: [' one', '-two', '+2'] }] },
      { path: path.join(dir, 'b.txt'), added: 1, removed: 0, hunks: [{ oldStart: 0, newStart: 1, lines: ['+new'] }] },
    ])
    // The user's index is never touched.
    expect(fs.readFileSync(path.join(dir, '.git', 'index')).equals(index)).toBe(true)
  })

  it('attaches nothing for a command that changed nothing, or outside a repository', async () => {
    dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'command-diff-')))
    const body = JSON.stringify({ tool_use_id: 'toolu_2', cwd: dir, tool_input: { command: 'python3 x.py' } })
    await commandStarting(body)
    fs.writeFileSync(path.join(dir, 'a.txt'), 'x\n')
    await commandEnded('t1', body)
    expect(attached).toHaveLength(0)
  })
})
