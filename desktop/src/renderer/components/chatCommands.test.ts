import { describe, expect, it } from 'vitest'
import { mergeCommands, opensInTerminal } from './chatCommands'

describe('opensInTerminal', () => {
  it('is true for the TUI dialogs only', () => {
    expect(opensInTerminal('/mcp')).toBe(true)
    expect(opensInTerminal('  /model opus')).toBe(true)
    expect(opensInTerminal('/clear')).toBe(false)
    expect(opensInTerminal('/magic:start PROJ-1')).toBe(false)
    expect(opensInTerminal('talk about /mcp')).toBe(false)
  })
})

describe('mergeCommands', () => {
  it('keeps the built-in when a skill has the same name', () => {
    const merged = mergeCommands([{ name: 'review', source: 'builtin' }], [{ name: 'review', source: 'skill' }, { name: 'x', source: 'skill' }])
    expect(merged.map((c) => `${c.source}:${c.name}`)).toEqual(['builtin:review', 'skill:x'])
  })
})
