import { describe, expect, it } from 'vitest'
import { isAgentTerminal } from './agentTerminals'

describe('isAgentTerminal', () => {
  it('accepts an ordinary agent id', () => {
    expect(isAgentTerminal('term-1')).toBe(true)
    expect(isAgentTerminal('a1b2c3')).toBe(true)
  })

  it('rejects the two reserved non-agent prefixes', () => {
    expect(isAgentTerminal('sidebar-1')).toBe(false)
    expect(isAgentTerminal('script-42')).toBe(false)
  })

  it('rejects no selection, so a caller can pass activeTerminalId straight in', () => {
    expect(isAgentTerminal(null)).toBe(false)
    expect(isAgentTerminal(undefined)).toBe(false)
    expect(isAgentTerminal('')).toBe(false)
  })

  it('matches on the prefix only, never on the substring', () => {
    // A pty whose id merely CONTAINS one of the words is an agent: the prefixes are
    // assigned by this app at the front of the id, and a substring test would disable
    // agent features on an id that happened to embed one.
    expect(isAgentTerminal('my-script-runner')).toBe(true)
    expect(isAgentTerminal('agent-sidebar-2')).toBe(true)
  })

  it('treats an unrecognised prefix as an agent', () => {
    // The permissive default is deliberate — see the module docblock. A future id scheme
    // must not silently disable every agent-facing feature.
    expect(isAgentTerminal('worktree-7')).toBe(true)
  })

  it('rejects the bare prefixes themselves', () => {
    expect(isAgentTerminal('sidebar-')).toBe(false)
    expect(isAgentTerminal('script-')).toBe(false)
  })
})
