import { describe, expect, it, vi } from 'vitest'
import { createLatestWriter } from './latestWrite'

/** One macrotask, which drains every microtask the chains below queue. */
const flush = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0))

/** A write whose settling the test controls, one call at a time. */
function deferredWrite() {
  const settlers: Array<{ resolve: () => void; reject: (error: Error) => void }> = []
  const calls: string[] = []
  const write = vi.fn((value: string) => {
    calls.push(value)
    return new Promise<void>((resolve, reject) => {
      settlers.push({ resolve, reject: (error) => reject(error) })
    })
  })
  return { write, calls, settlers }
}

describe('createLatestWriter', () => {
  it('issues the first value straight away', async () => {
    const { write, calls } = deferredWrite()
    createLatestWriter(write)('a')
    await flush()
    expect(calls).toEqual(['a'])
  })

  it('holds a second value back while the first is in flight', async () => {
    const { write, calls, settlers } = deferredWrite()
    const save = createLatestWriter(write)

    save('a')
    save('b')
    await flush()
    // 'b' must NOT be in flight beside 'a': two parallel writes are exactly the race
    // this exists to stop.
    expect(calls).toEqual(['a'])

    settlers[0].resolve()
    await flush()
    expect(calls).toEqual(['a', 'b'])
  })

  it('sends only the last value of a burst, and sends it last', async () => {
    const { write, calls, settlers } = deferredWrite()
    const save = createLatestWriter(write)

    save('a')
    save('b')
    save('c')
    save('d')
    await flush()
    settlers[0].resolve()
    await flush()

    // The intermediate clicks are dropped, and the value the account ends on is the one
    // the reader picked last.
    expect(calls).toEqual(['a', 'd'])
    expect(calls[calls.length - 1]).toBe('d')
  })

  it('keeps going after a write fails', async () => {
    const { write, calls, settlers } = deferredWrite()
    const save = createLatestWriter(write)

    save('a')
    save('b')
    await flush()
    settlers[0].reject(new Error('offline'))
    await flush()

    // A rejection must not wedge the queue: the pending value is still the reader's
    // answer, and the next attempt is what corrects the stored one.
    expect(calls).toEqual(['a', 'b'])
  })

  it('re-issues a value already sent when it is picked again mid-flight', async () => {
    const { write, calls, settlers } = deferredWrite()
    const save = createLatestWriter(write)

    save('a')
    save('b')
    save('a')
    await flush()
    settlers[0].resolve()
    await flush()

    // Naive de-duplication against "what is in flight" would drop this and leave the
    // account on 'b', which is not what the reader last chose.
    expect(calls).toEqual(['a', 'a'])
  })
})
