import { describe, it, expect } from 'vitest'
import { retainedBufferOnExit, EXITED_BUFFER_TAIL } from './exited-buffer'

// Node environment, no Electron and no node-pty: the point of the module under test is
// that this rule is expressible without either.

describe('retainedBufferOnExit', () => {
  it('keeps a failed process\'s output whole', () => {
    // The card of a failure stays on screen until it is dismissed, and dismissing frees
    // the buffer — so there is nothing to bound, and the whole scrollback is the useful
    // part of a stack trace.
    const long = 'x'.repeat(EXITED_BUFFER_TAIL * 3)
    expect(retainedBufferOnExit(long, 1)).toBe(long)
    expect(retainedBufferOnExit(long, 137)).toBe(long)
  })

  it('trims a clean exit to its tail', () => {
    const buffer = 'head'.padEnd(EXITED_BUFFER_TAIL * 2, 'x') + 'TAIL'
    const kept = retainedBufferOnExit(buffer, 0)

    expect(kept).toHaveLength(EXITED_BUFFER_TAIL)
    // The END is what is kept, which is what makes the test-count parse still work: a
    // Vitest/Jest summary line is the last thing a passing run prints.
    expect(kept.endsWith('TAIL')).toBe(true)
    expect(kept.startsWith('head')).toBe(false)
  })

  it('leaves a buffer shorter than the tail untouched on a clean exit', () => {
    // `slice(-n)` on a shorter string returns the whole string rather than throwing or
    // padding, which is the behaviour relied on: most script runs never reach 8 KB.
    expect(retainedBufferOnExit('npm run lint\r\nok\r\n', 0)).toBe('npm run lint\r\nok\r\n')
    expect(retainedBufferOnExit('', 0)).toBe('')
  })

  it('never returns more than it was given', () => {
    for (const exitCode of [0, 1]) {
      const buffer = 'y'.repeat(EXITED_BUFFER_TAIL + 1)
      expect(retainedBufferOnExit(buffer, exitCode).length).toBeLessThanOrEqual(buffer.length)
    }
  })
})
