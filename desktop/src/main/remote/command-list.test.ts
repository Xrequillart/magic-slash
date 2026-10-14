import { describe, expect, it } from 'vitest'
import { COMMAND_LIMITS, toRelayCommands } from './command-list'

describe('toRelayCommands', () => {
  it('lists the built-ins that answer in the conversation, then the skills', () => {
    const commands = toRelayCommands([{ name: 'magic:start', description: 'Start a ticket' }])
    expect(commands[0]).toEqual({ name: 'clear', source: 'builtin' })
    expect(commands.at(-1)).toEqual({ name: 'magic:start', description: 'Start a ticket', source: 'skill' })
  })

  it('leaves out what a phone may not send, what cannot be typed, and a second row of a name', () => {
    const names = toRelayCommands([
      { name: 'model', description: 'A skill named like a dialog' },
      { name: 'magic:action', description: 'Hidden', userInvocable: false },
      { name: 'magic:pr', description: 'First' },
      { name: 'magic:pr', description: 'Second' },
      { name: 'compact', description: 'A skill named like a built-in' },
    ]).map((c) => c.name)
    expect(names).not.toContain('model')
    expect(names).not.toContain('magic:action')
    expect(names.filter((n) => n === 'magic:pr')).toHaveLength(1)
    expect(names.filter((n) => n === 'compact')).toHaveLength(1)
  })

  it('falls back on the listing text, on one line, cut at its bound', () => {
    const [command] = toRelayCommands([{ name: 'long', text: `Does\n\nthings ${'x'.repeat(400)}` }]).filter((c) => c.source === 'skill')
    expect(command.description!.startsWith('Does things x')).toBe(true)
    expect(Array.from(command.description!)).toHaveLength(COMMAND_LIMITS.description)
    expect(command.description!.endsWith('…')).toBe(true)
  })

  it('stays within its byte bound', () => {
    const listing = Array.from({ length: 1000 }, (_, i) => ({ name: `skill-${i}`, description: 'd'.repeat(150) }))
    const commands = toRelayCommands(listing)
    expect(commands.length).toBeLessThanOrEqual(COMMAND_LIMITS.count)
    expect(Buffer.byteLength(JSON.stringify(commands))).toBeLessThanOrEqual(COMMAND_LIMITS.bytes + COMMAND_LIMITS.count)
  })
})
