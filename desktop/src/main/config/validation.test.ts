import { describe, it, expect, beforeEach, afterEach } from 'vitest'

import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'

import { countAddedLines, newReadBudget, parseNumstatPath, parsePorcelainPath, unquoteGitPath } from './validation'

describe('unquoteGitPath', () => {
  it('leaves a plain path alone', () => {
    expect(unquoteGitPath('src/main/index.ts')).toBe('src/main/index.ts')
  })

  it('strips the quotes git adds around a path with a space', () => {
    expect(unquoteGitPath('"with space.txt"')).toBe('with space.txt')
  })

  it('decodes a run of octal escapes as one UTF-8 sequence', () => {
    expect(unquoteGitPath('"acc\\303\\251nt\\303\\251.txt"')).toBe('accénté.txt')
  })

  it('unescapes quotes and backslashes', () => {
    expect(unquoteGitPath('"a\\"b\\\\c.txt"')).toBe('a"b\\c.txt')
  })
})

describe('parsePorcelainPath', () => {
  it('reads a plain status path', () => {
    expect(parsePorcelainPath('desktop/src/types.ts', false)).toBe('desktop/src/types.ts')
  })

  it('keeps only the new path of a rename', () => {
    expect(parsePorcelainPath('a.txt -> b.txt', true)).toBe('b.txt')
  })

  it('unquotes a renamed path', () => {
    expect(parsePorcelainPath('"old name.txt" -> "new name.txt"', true)).toBe('new name.txt')
  })

  it('does not split on an arrow inside a non-rename path', () => {
    expect(parsePorcelainPath('"a -> b.txt"', false)).toBe('a -> b.txt')
  })
})

describe('parseNumstatPath', () => {
  it('reads a plain numstat path', () => {
    expect(parseNumstatPath('desktop/src/types.ts')).toBe('desktop/src/types.ts')
  })

  it('keeps only the new path of a rename', () => {
    expect(parseNumstatPath('a.txt => b.txt')).toBe('b.txt')
  })

  it('expands the braced form git uses for a shared prefix and suffix', () => {
    expect(parseNumstatPath('src/{old => new}/file.ts')).toBe('src/new/file.ts')
  })

  it('expands the braced form when a path segment disappears', () => {
    expect(parseNumstatPath('src/{utils/ => }helper.ts')).toBe('src/helper.ts')
  })
})

describe('countAddedLines', () => {
  let dir: string

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ms-count-'))
  })

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true })
  })

  const write = (name: string, content: string | Buffer): string => {
    const full = path.join(dir, name)
    fs.writeFileSync(full, content)
    return full
  }

  it('counts the lines of a new file', () => {
    expect(countAddedLines(write('a.ts', 'one\ntwo\nthree\n'), newReadBudget())).toBe(3)
  })

  it('counts a last line that has no trailing newline, as git does', () => {
    expect(countAddedLines(write('b.ts', 'one\ntwo'), newReadBudget())).toBe(2)
  })

  it('is zero for an empty file', () => {
    expect(countAddedLines(write('c.ts', ''), newReadBudget())).toBe(0)
  })

  it('is zero for a binary file rather than a count of stray newlines', () => {
    expect(countAddedLines(write('d.png', Buffer.from([0x89, 0x50, 0x00, 0x0a, 0x0a])), newReadBudget())).toBe(0)
  })

  it('is zero for a path that does not exist', () => {
    expect(countAddedLines(path.join(dir, 'missing.ts'), newReadBudget())).toBe(0)
  })

  it('is zero for a directory', () => {
    fs.mkdirSync(path.join(dir, 'sub'))
    expect(countAddedLines(path.join(dir, 'sub'), newReadBudget())).toBe(0)
  })

  it('skips a file that no longer fits the budget, and leaves the budget for smaller ones', () => {
    const budget = { remaining: 8 }
    expect(countAddedLines(write('big.ts', 'way past the budget\n'), budget)).toBe(0)
    expect(budget.remaining).toBe(8)
    expect(countAddedLines(write('small.ts', 'a\nb\n'), budget)).toBe(2)
    expect(budget.remaining).toBe(4)
  })
})
