import { describe, expect, it } from 'vitest'
import { matchCommands, type ChatCommand } from './chatCommandMatch'

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
