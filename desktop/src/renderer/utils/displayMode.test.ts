import { describe, expect, it } from 'vitest'
import { resolveDisplayMode } from './displayMode'

describe('resolveDisplayMode', () => {
  it('prefers the agent, then the account, then the terminal', () => {
    expect(resolveDisplayMode({ displayMode: 'terminal' }, { defaultDisplayMode: 'chat' })).toBe('terminal')
    expect(resolveDisplayMode({}, { defaultDisplayMode: 'chat' })).toBe('chat')
    expect(resolveDisplayMode({}, null)).toBe('terminal')
  })
})
