import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'
import { answerPendingQuestion, type AnswerDeps } from './answer-question'
import type { TrayQuestion } from '../../types'

/**
 * These tests exist for one acceptance criterion: "a late click on a stale option
 * writes NOTHING to the PTY". Every case therefore asserts on the write spy, not
 * just on the returned result — a refusal that still wrote would satisfy `ok: false`
 * while breaking the actual guarantee.
 */

const ASK: TrayQuestion = {
  token: 'tok-1',
  kind: 'ask',
  prompt: 'Which branch?',
  options: [{ label: 'main' }, { label: 'develop' }],
  receivedAt: 0,
}

const PERMISSION: TrayQuestion = {
  token: 'tok-2',
  kind: 'permission',
  prompt: 'Claude needs your permission to use Bash',
  options: [],
  receivedAt: 0,
}

let write: Mock<(id: string, keys: string) => boolean>
let clear: Mock<(id: string) => void>

function deps(question: TrayQuestion | undefined): AnswerDeps {
  return { getQuestion: () => question, write, clear }
}

beforeEach(() => {
  write = vi.fn(() => true)
  clear = vi.fn()
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('answerPendingQuestion', () => {
  it('writes the keystrokes and clears the question on a matching token', () => {
    const result = answerPendingQuestion('term-1', 'tok-1', { kind: 'option', index: 1 }, deps(ASK))
    expect(result).toEqual({ ok: true })
    expect(write).toHaveBeenCalledWith('term-1', '\x1b[B\r')
    expect(clear).toHaveBeenCalledWith('term-1')
  })

  it('writes NOTHING when the token no longer matches', () => {
    // The panel is up to 2s stale: the user answered in the main window and a new
    // question already took this agent's slot.
    const result = answerPendingQuestion('term-1', 'tok-old', { kind: 'option', index: 0 }, deps(ASK))
    expect(result).toEqual({ ok: false })
    expect(write).not.toHaveBeenCalled()
    expect(clear).not.toHaveBeenCalled()
  })

  it('writes NOTHING when the question is already gone', () => {
    const result = answerPendingQuestion('term-1', 'tok-1', { kind: 'option', index: 0 }, deps(undefined))
    expect(result).toEqual({ ok: false })
    expect(write).not.toHaveBeenCalled()
  })

  it('writes NOTHING when no keystrokes can be derived', () => {
    // Out of range, an unsupported question, and denying an AskUserQuestion (where
    // Escape would interrupt the agent rather than answer it).
    expect(answerPendingQuestion('t', 'tok-1', { kind: 'option', index: 9 }, deps(ASK)).ok).toBe(false)
    expect(answerPendingQuestion('t', 'tok-1', { kind: 'deny' }, deps(ASK)).ok).toBe(false)
    expect(
      answerPendingQuestion('t', 'tok-1', { kind: 'option', index: 0 }, deps({ ...ASK, unsupported: true })).ok,
    ).toBe(false)
    expect(write).not.toHaveBeenCalled()
  })

  it('writes NOTHING on a malformed choice, instead of throwing out of the IPC handler', () => {
    // `choice` crosses IPC from the renderer, so its type annotation guarantees
    // nothing at runtime. keysFor reads choice.kind directly.
    const malformed = [
      undefined, null, 'deny', 42, {}, { kind: 'nope' },
      { kind: 'option' }, { kind: 'option', index: '1' }, { kind: 'option', index: 1.5 },
    ]
    for (const choice of malformed) {
      expect(() =>
        answerPendingQuestion('term-1', 'tok-1', choice as never, deps(ASK)),
      ).not.toThrow()
      expect(answerPendingQuestion('term-1', 'tok-1', choice as never, deps(ASK)).ok).toBe(false)
    }
    expect(write).not.toHaveBeenCalled()
  })

  it('writes NOTHING on a malformed id or token', () => {
    for (const [id, token] of [['', 'tok-1'], ['term-1', ''], [null, 'tok-1'], ['term-1', undefined]]) {
      expect(answerPendingQuestion(id as string, token as string, { kind: 'option', index: 0 }, deps(ASK)).ok)
        .toBe(false)
    }
    expect(write).not.toHaveBeenCalled()
  })

  it('refuses a permission prompt with Escape, and keeps Allow at the highlighted row', () => {
    expect(answerPendingQuestion('t', 'tok-2', { kind: 'deny' }, deps(PERMISSION))).toEqual({ ok: true })
    expect(write).toHaveBeenCalledWith('t', '\x1b')

    write.mockClear()
    expect(answerPendingQuestion('t', 'tok-2', { kind: 'option', index: 0 }, deps(PERMISSION))).toEqual({ ok: true })
    expect(write).toHaveBeenCalledWith('t', '\r')
  })

  it('reports failure and keeps the question when the terminal is gone', () => {
    // writeToTerminal no-ops on an unknown id. Reporting success would make the card
    // disappear as if the agent had been advanced.
    write.mockReturnValue(false)
    const result = answerPendingQuestion('term-1', 'tok-1', { kind: 'option', index: 0 }, deps(ASK))
    expect(result).toEqual({ ok: false })
    expect(clear).not.toHaveBeenCalled()
  })
})
