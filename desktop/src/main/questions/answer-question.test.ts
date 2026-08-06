import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'
import { answerPendingQuestion, type AnswerDeps } from './answer-question'
import type { TrayQuestion } from '../../types'

/**
 * These tests exist for two acceptance criteria:
 *
 *   - "a late click on a stale option writes NOTHING to the PTY". Every case
 *     therefore asserts on the write spy, not just on the returned result — a
 *     refusal that still wrote would satisfy `ok: false` while breaking the actual
 *     guarantee.
 *   - "the option the user clicked is the option that gets answered". That one is a
 *     regression: the keystrokes used to go out as a single concatenated write, the
 *     TUI dropped every arrow in the burst, and so every answer resolved to the
 *     first option while reporting success. Hence the assertions on one write PER
 *     keypress, spaced — a joined string would pass a naive "did it write?" check.
 */

const ASK: TrayQuestion = {
  token: 'tok-1',
  kind: 'ask',
  prompt: 'Which branch?',
  options: [{ label: 'main' }, { label: 'develop' }, { label: 'staging' }, { label: 'prod' }],
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
let wait: Mock<(ms: number) => Promise<void>>

function deps(question: TrayQuestion | undefined): AnswerDeps {
  return { getQuestion: () => question, write, clear, wait }
}

/** Just the keystrokes, in order, as the PTY saw them. */
const written = (): string[] => write.mock.calls.map(([, keys]) => keys)

beforeEach(() => {
  write = vi.fn(() => true)
  clear = vi.fn()
  // Resolves immediately: the suite exercises the real sequencing without sleeping.
  wait = vi.fn(() => Promise.resolve())
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('answerPendingQuestion', () => {
  it('writes the keystrokes and clears the question on a matching token', async () => {
    const result = await answerPendingQuestion('term-1', 'tok-1', { kind: 'option', index: 1 }, deps(ASK))
    expect(result).toEqual({ ok: true })
    expect(written()).toEqual(['\x1b[B', '\r'])
    expect(clear).toHaveBeenCalledWith('term-1')
  })

  it('sends one write PER keypress, never a single concatenated burst', async () => {
    // The regression itself. Option 4 is three arrows then Enter; as one chunk the
    // TUI kept only the Enter and answered option 1.
    await answerPendingQuestion('term-1', 'tok-1', { kind: 'option', index: 3 }, deps(ASK))
    expect(write).toHaveBeenCalledTimes(4)
    expect(written()).toEqual(['\x1b[B', '\x1b[B', '\x1b[B', '\r'])
    for (const keys of written()) expect(keys.length).toBeLessThanOrEqual(3)
  })

  it('spaces the keypresses apart, once between each pair', async () => {
    // Separate writes still coalesce in the pipe without a pause between them, which
    // would reproduce the burst this fix exists to avoid.
    await answerPendingQuestion('term-1', 'tok-1', { kind: 'option', index: 3 }, deps(ASK))
    expect(wait).toHaveBeenCalledTimes(3)
    for (const [ms] of wait.mock.calls) expect(ms).toBeGreaterThan(0)
  })

  it('does not pause before a lone keypress', async () => {
    await answerPendingQuestion('term-1', 'tok-1', { kind: 'option', index: 0 }, deps(ASK))
    expect(written()).toEqual(['\r'])
    expect(wait).not.toHaveBeenCalled()
  })

  it('writes NOTHING when the token no longer matches', async () => {
    // The panel is up to 2s stale: the user answered in the main window and a new
    // question already took this agent's slot.
    const result = await answerPendingQuestion('term-1', 'tok-old', { kind: 'option', index: 0 }, deps(ASK))
    expect(result).toEqual({ ok: false })
    expect(write).not.toHaveBeenCalled()
    expect(clear).not.toHaveBeenCalled()
  })

  it('writes NOTHING when the question is already gone', async () => {
    const result = await answerPendingQuestion('term-1', 'tok-1', { kind: 'option', index: 0 }, deps(undefined))
    expect(result).toEqual({ ok: false })
    expect(write).not.toHaveBeenCalled()
  })

  it('writes NOTHING when no keystrokes can be derived', async () => {
    // Out of range, an unsupported question, and denying an AskUserQuestion (where
    // Escape would interrupt the agent rather than answer it).
    expect((await answerPendingQuestion('t', 'tok-1', { kind: 'option', index: 9 }, deps(ASK))).ok).toBe(false)
    expect((await answerPendingQuestion('t', 'tok-1', { kind: 'deny' }, deps(ASK))).ok).toBe(false)
    expect(
      (await answerPendingQuestion('t', 'tok-1', { kind: 'option', index: 0 }, deps({ ...ASK, unsupported: true }))).ok,
    ).toBe(false)
    expect(write).not.toHaveBeenCalled()
  })

  it('writes NOTHING on a malformed choice, instead of throwing out of the IPC handler', async () => {
    // `choice` crosses IPC from the renderer, so its type annotation guarantees
    // nothing at runtime. keysFor reads choice.kind directly.
    const malformed = [
      undefined, null, 'deny', 42, {}, { kind: 'nope' },
      { kind: 'option' }, { kind: 'option', index: '1' }, { kind: 'option', index: 1.5 },
    ]
    for (const choice of malformed) {
      await expect(
        answerPendingQuestion('term-1', 'tok-1', choice as never, deps(ASK)),
      ).resolves.toEqual({ ok: false })
    }
    expect(write).not.toHaveBeenCalled()
  })

  it('writes NOTHING on a malformed id or token', async () => {
    for (const [id, token] of [['', 'tok-1'], ['term-1', ''], [null, 'tok-1'], ['term-1', undefined]]) {
      const result = await answerPendingQuestion(id as string, token as string, { kind: 'option', index: 0 }, deps(ASK))
      expect(result.ok).toBe(false)
    }
    expect(write).not.toHaveBeenCalled()
  })

  it('refuses a permission prompt with Escape, and keeps Allow at the highlighted row', async () => {
    expect(await answerPendingQuestion('t', 'tok-2', { kind: 'deny' }, deps(PERMISSION))).toEqual({ ok: true })
    expect(written()).toEqual(['\x1b'])

    write.mockClear()
    expect(await answerPendingQuestion('t', 'tok-2', { kind: 'option', index: 0 }, deps(PERMISSION)))
      .toEqual({ ok: true })
    expect(written()).toEqual(['\r'])
  })

  it('reports failure and keeps the question when the terminal is gone', async () => {
    // writeToTerminal no-ops on an unknown id. Reporting success would make the card
    // disappear as if the agent had been advanced.
    write.mockReturnValue(false)
    const result = await answerPendingQuestion('term-1', 'tok-1', { kind: 'option', index: 0 }, deps(ASK))
    expect(result).toEqual({ ok: false })
    expect(clear).not.toHaveBeenCalled()
  })

  it('stops mid-sequence and keeps the question when the terminal dies part-way', async () => {
    // The half-typed case: two arrows landed, the terminal went away, nothing was
    // submitted. Keeping the card is what lets the user see it and finish by hand.
    write.mockImplementation(() => write.mock.calls.length < 3)
    const result = await answerPendingQuestion('term-1', 'tok-1', { kind: 'option', index: 3 }, deps(ASK))
    expect(result).toEqual({ ok: false })
    expect(write).toHaveBeenCalledTimes(3)
    expect(clear).not.toHaveBeenCalled()
  })

  it('refuses a second answer while one is still being typed', async () => {
    // Sequencing made this async, so two fast clicks can interleave their arrows and
    // walk the highlight somewhere neither of them asked for. The token cannot catch
    // it: the question is only cleared once the first sequence finishes.
    let release: () => void = () => {}
    wait.mockImplementation(() => new Promise<void>((resolve) => { release = resolve }))

    const first = answerPendingQuestion('term-1', 'tok-1', { kind: 'option', index: 3 }, deps(ASK))
    // Let the first sequence reach its first pause.
    await Promise.resolve()

    const second = await answerPendingQuestion('term-1', 'tok-1', { kind: 'option', index: 1 }, deps(ASK))
    expect(second).toEqual({ ok: false })

    // Drain the first sequence: each release lets it through one more keypress.
    for (let i = 0; i < 5; i++) { release(); await Promise.resolve() }
    await expect(first).resolves.toEqual({ ok: true })

    // Only the first click's keystrokes ever reached the PTY.
    expect(written()).toEqual(['\x1b[B', '\x1b[B', '\x1b[B', '\r'])
  })

  it('releases the in-flight lock once a sequence finishes, so the next answer works', async () => {
    await answerPendingQuestion('term-1', 'tok-1', { kind: 'option', index: 1 }, deps(ASK))
    write.mockClear()
    const again = await answerPendingQuestion('term-1', 'tok-1', { kind: 'option', index: 2 }, deps(ASK))
    expect(again).toEqual({ ok: true })
    expect(written()).toEqual(['\x1b[B', '\x1b[B', '\r'])
  })
})
