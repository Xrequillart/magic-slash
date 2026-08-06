import { describe, it, expect } from 'vitest'
import { keysFor, answerableOptionCount } from './answer-keys'
import type { TrayAnswerChoice, TrayQuestion } from '../../types'

const ask = (overrides: Partial<TrayQuestion> = {}): TrayQuestion => ({
  token: 't',
  kind: 'ask',
  prompt: 'Which database?',
  options: [{ label: 'Postgres' }, { label: 'MySQL' }, { label: 'SQLite' }],
  receivedAt: Date.now(),
  ...overrides,
})

const permission = (overrides: Partial<TrayQuestion> = {}): TrayQuestion => ({
  token: 't',
  kind: 'permission',
  prompt: 'Claude needs your permission to use Bash',
  options: [],
  receivedAt: Date.now(),
  ...overrides,
})

const option = (index: number): TrayAnswerChoice => ({ kind: 'option', index })

describe('keysFor', () => {
  it('sends Enter alone for the first option (the row already highlighted)', () => {
    expect(keysFor(ask(), option(0))).toBe('\r')
  })

  it('sends one arrow per row to walk down to the option, then Enter', () => {
    expect(keysFor(ask(), option(1))).toBe('\x1b[B\r')
    expect(keysFor(ask(), option(2))).toBe('\x1b[B\x1b[B\r')
  })

  it('refuses an index past the last option rather than writing an approximation', () => {
    expect(keysFor(ask(), option(3))).toBeNull()
    expect(keysFor(ask(), option(-1))).toBeNull()
    expect(keysFor(ask(), option(1.5))).toBeNull()
  })

  it('refuses everything for a question v1 cannot drive', () => {
    expect(keysFor(ask({ unsupported: true }), option(0))).toBeNull()
    expect(keysFor(permission({ unsupported: true }), { kind: 'deny' })).toBeNull()
  })

  it('denies with a bare Escape, independent of how many options there are', () => {
    expect(keysFor(permission(), { kind: 'deny' })).toBe('\x1b')
    expect(keysFor(permission({ options: [{ label: 'a' }, { label: 'b' }] }), { kind: 'deny' })).toBe('\x1b')
  })

  it('does not offer a refusal on an AskUserQuestion (Escape would interrupt it)', () => {
    expect(keysFor(ask(), { kind: 'deny' })).toBeNull()
  })

  it('treats a permission Allow as the first row of an implicit one-option list', () => {
    expect(answerableOptionCount(permission())).toBe(1)
    expect(keysFor(permission(), option(0))).toBe('\r')
    expect(keysFor(permission(), option(1))).toBeNull()
  })
})
