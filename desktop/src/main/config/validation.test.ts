import { describe, it, expect } from 'vitest'

import { parseNumstatPath, parsePorcelainPath, unquoteGitPath } from './validation'

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

