import { describe, it, expect } from 'vitest'
import { classifyTerminal } from './groupedTerminals'
import type { TerminalInfo, TerminalState, TerminalMetadata } from '../../types'

function terminal(state: TerminalState, status?: TerminalMetadata['status']): TerminalInfo {
  return {
    id: 't1',
    name: 't1',
    state,
    repositories: [],
    metadata: status !== undefined ? { status } : undefined,
  }
}

describe('classifyTerminal', () => {
  it('routes error/waiting states to needs_attention regardless of status', () => {
    expect(classifyTerminal(terminal('error', 'in progress'))).toBe('needs_attention')
    expect(classifyTerminal(terminal('waiting', 'PR created'))).toBe('needs_attention')
  })

  it('classifies the in_review statuses', () => {
    expect(classifyTerminal(terminal('idle', 'PR created'))).toBe('in_review')
    expect(classifyTerminal(terminal('idle', 'in review'))).toBe('in_review')
    expect(classifyTerminal(terminal('idle', 'changes requested'))).toBe('in_review')
  })

  it('keeps "Review addressed" (magic:resolve) in the in_review group', () => {
    expect(classifyTerminal(terminal('idle', 'Review addressed'))).toBe('in_review')
  })

  it('classifies "PR merged" as done', () => {
    expect(classifyTerminal(terminal('idle', 'PR merged'))).toBe('done')
  })

  it('classifies early-workflow statuses as active', () => {
    expect(classifyTerminal(terminal('idle', 'in progress'))).toBe('active')
    expect(classifyTerminal(terminal('idle', 'committed'))).toBe('active')
  })

  it('treats an empty/absent status as active', () => {
    expect(classifyTerminal(terminal('idle', ''))).toBe('active')
    expect(classifyTerminal(terminal('idle'))).toBe('active')
  })

  it('safety net: an unknown non-empty status stays in_review instead of falling back to active', () => {
    // Simulates a newer skill sending a status the desktop app doesn't know yet.
    expect(classifyTerminal(terminal('idle', 'some future status' as TerminalMetadata['status']))).toBe('in_review')
  })
})
