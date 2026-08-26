import { describe, it, expect } from 'vitest'
import { bufferOutlivesExit } from './exited-buffer'

// Node environment, no Electron and no node-pty: the point of the module under test is
// that this rule is expressible, and checkable, without either.

describe('bufferOutlivesExit', () => {
  it('keeps the output of a failed process', () => {
    // Its card stays on screen so the failure can be read, and the dialog opened from
    // that card is the only place to read it.
    expect(bufferOutlivesExit(1)).toBe(true)
    expect(bufferOutlivesExit(2)).toBe(true)
    // Signals arrive as 128 + signum; a script killed by SIGKILL or SIGTERM is a failure
    // whose output is worth as much as any other.
    expect(bufferOutlivesExit(137)).toBe(true)
    expect(bufferOutlivesExit(143)).toBe(true)
  })

  it('drops the output of a clean exit', () => {
    // The card disappears with the script, so nothing can reopen the terminal or kill it.
    // Anything kept here would live until quit with no reclamation path — one buffer per
    // successful run, for the whole session.
    expect(bufferOutlivesExit(0)).toBe(false)
  })

  it('treats a negative code as a failure', () => {
    // Not reachable through node-pty today, but "anything that is not a clean exit is a
    // failure" is the rule; a `=== 0` test is what makes that true for every input.
    expect(bufferOutlivesExit(-1)).toBe(true)
  })
})
