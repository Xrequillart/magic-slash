import { describe, it, expect } from 'vitest'
import { hasScriptExited } from './scriptTerminals'

const running = (id: string) => ({ id, state: 'running' as const })
const errored = (id: string) => ({ id, state: 'error' as const })

describe('hasScriptExited', () => {
  it('is false only while the script is in the list and running', () => {
    expect(hasScriptExited([running('script-1')], 'script-1')).toBe(false)
    expect(hasScriptExited([running('script-1'), errored('script-2')], 'script-1')).toBe(false)
  })

  it('is true for a script that flipped to error', () => {
    // Exited non-zero: the card stays on screen so the failure can be read, but the PTY
    // is gone.
    expect(hasScriptExited([errored('script-1')], 'script-1')).toBe(true)
  })

  it('is true for a script that is no longer in the list', () => {
    // The ordinary end of a successful run — the exit listener removes it — and the case
    // a dialog still showing its output most needs covered.
    expect(hasScriptExited([], 'script-1')).toBe(true)
    expect(hasScriptExited([running('script-2')], 'script-1')).toBe(true)
  })

  it('matches on the whole id, not a prefix of one', () => {
    // Script ids are `script-${Date.now()}`, so one is a genuine prefix of another the
    // moment the clock gains a digit.
    expect(hasScriptExited([running('script-17000000000')], 'script-1700000000')).toBe(true)
    expect(hasScriptExited([running('script-1700000000')], 'script-17000000000')).toBe(true)
  })

  it('reports the script asked about, not another one in the same state', () => {
    expect(hasScriptExited([running('script-1'), running('script-2')], 'script-3')).toBe(true)
    expect(hasScriptExited([errored('script-1'), running('script-2')], 'script-2')).toBe(false)
  })
})
