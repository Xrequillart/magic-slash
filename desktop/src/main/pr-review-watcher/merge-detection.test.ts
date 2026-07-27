import { describe, it, expect } from 'vitest'
import { shouldEmitMerged } from './merge-detection'

/**
 * `merged` is the cycle-end anchor for every flow metric, so emitting it twice
 * inflates throughput and emitting it never leaves PR→merge unmeasurable. Both
 * failure modes are silent, which is why the decision is a pure function.
 */
describe('shouldEmitMerged', () => {
  it('emits the first time a PR is seen merged', () => {
    expect(shouldEmitMerged(undefined, { merged: true }, {})).toBe(true)
  })

  it('does not emit for a PR that is not merged', () => {
    expect(shouldEmitMerged(undefined, { merged: false }, {})).toBe(false)
  })

  it('does not emit again on a later tick within the same run', () => {
    expect(shouldEmitMerged({ merged: true }, { merged: true }, {})).toBe(false)
  })

  it('does not re-emit after an app restart, when the in-memory map is empty', () => {
    // The restart case: `previous` is gone, so only the persisted metadata can
    // say the event already went out. Without this guard every relaunch would
    // append a duplicate merge for every merged PR still in the terminal list.
    expect(shouldEmitMerged(undefined, { merged: true }, { prMerged: true })).toBe(false)
  })

  it('emits when the previous tick saw the PR open', () => {
    expect(shouldEmitMerged({ merged: false }, { merged: true }, { prMerged: false })).toBe(true)
  })
})
