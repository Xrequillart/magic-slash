import { describe, expect, it } from 'vitest'
import { isAgentTerminal, resolveAgentTarget } from './agentTerminals'

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

describe('resolveAgentTarget', () => {
  const LIVE = [{ id: 'term-1' }, { id: 'term-2' }, { id: 'sidebar-1' }]

  it('falls back to the selection when the caller names no target', () => {
    // The review's rule: it belongs to no agent in particular, so the reader picks.
    expect(resolveAgentTarget(undefined, 'term-2', LIVE)).toBe('term-2')
  })

  it('prefers the named target over the selection', () => {
    // The whole point of the prop: a document belongs to ONE agent, and the paste goes there
    // whatever the reader happens to have clicked last.
    expect(resolveAgentTarget('term-1', 'term-2', LIVE)).toBe('term-1')
  })

  it('does not inherit the selection when the caller names nothing to send to', () => {
    // `null` is a caller that HAS a target slot and currently has nobody in it — the case that
    // must not fall through to the selection. `undefined` above is the caller with no slot at
    // all, which is why the two cannot be collapsed.
    expect(resolveAgentTarget(null, 'term-2', LIVE)).toBeNull()
  })

  it('refuses a target that is no longer in the list', () => {
    // The agent that owned the document has been closed while the control was on screen. Its id
    // still looks exactly like an agent's, which is why the prefix test cannot catch this.
    expect(resolveAgentTarget('term-9', 'term-1', LIVE)).toBeNull()
  })

  it('does not ask the same of the selection, which the store is rendering by definition', () => {
    // Asserted so the asymmetry is deliberate rather than an oversight: a selected id absent
    // from this list is a state the store does not produce, and demanding membership here would
    // disable the review's Send on any list this function was handed incompletely.
    expect(resolveAgentTarget(undefined, 'term-9', LIVE)).toBe('term-9')
  })

  it('rejects a terminal that is not an agent, named or selected', () => {
    // A plain shell reads every line of a multi-line paste as a command. `sidebar-1` is in the
    // list, so this is the prefix doing the work and not the membership test.
    expect(resolveAgentTarget('sidebar-1', 'term-1', LIVE)).toBeNull()
    expect(resolveAgentTarget(undefined, 'sidebar-1', LIVE)).toBeNull()
  })

  it('has nowhere to write with nothing selected and nothing named', () => {
    expect(resolveAgentTarget(undefined, null, LIVE)).toBeNull()
    expect(resolveAgentTarget(undefined, undefined, [])).toBeNull()
  })
})
