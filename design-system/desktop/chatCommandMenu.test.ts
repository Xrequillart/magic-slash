import { describe, expect, it } from 'vitest'
import { commandSpans, matchCommands, slashTokenAt, type ChatCommand } from './chatCommandMatch'

const cmd = (name: string): ChatCommand => ({ name, source: 'skill' })

describe('matchCommands', () => {
  const all = [cmd('clear'), cmd('compact'), cmd('magic-commit'), cmd('my-plugin:commit'), cmd('mcp')]
  it('puts names that start with the query before names that contain it', () => {
    expect(matchCommands(all, 'com').map((c) => c.name)).toEqual(['compact', 'my-plugin:commit', 'magic-commit'])
  })
  it('offers everything on a bare slash', () => {
    expect(matchCommands(all, '')).toHaveLength(all.length)
  })
})

describe('slashTokenAt', () => {
  it('finds the slash word at the start, in the middle and at the end', () => {
    expect(slashTokenAt('/mag', 4)).toEqual({ start: 0, end: 4, query: 'mag' })
    expect(slashTokenAt('please /mag now', 11)).toEqual({ start: 7, end: 11, query: 'mag' })
    expect(slashTokenAt('fix it\n/', 8)).toEqual({ start: 7, end: 8, query: '' })
  })
  it('reads the query up to the caret, the word to its end', () => {
    expect(slashTokenAt('run /magic-commit', 8)).toEqual({ start: 4, end: 17, query: 'mag' })
  })
  it('is not fooled by paths or by a caret past the word', () => {
    expect(slashTokenAt('open src/app', 12)).toBeNull()
    expect(slashTokenAt('/Users/me', 9)).toBeNull()
    expect(slashTokenAt('/mag ', 5)).toBeNull()
  })
})

describe('commandSpans', () => {
  const names = new Set(['magic-commit', 'clear'])
  it('marks every known command that stands as a word, wherever it is', () => {
    expect(commandSpans('do /magic-commit then /clear', names)).toEqual([
      { text: 'do ', command: false },
      { text: '/magic-commit', command: true },
      { text: ' then ', command: false },
      { text: '/clear', command: true },
    ])
  })
  it('leaves unknown names, paths and glued slashes plain', () => {
    expect(commandSpans('/nope a/clear /clear.', names)).toEqual([{ text: '/nope a/clear /clear.', command: false }])
  })
})
