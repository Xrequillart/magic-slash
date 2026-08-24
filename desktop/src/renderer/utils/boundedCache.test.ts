import { describe, it, expect } from 'vitest'
import { evictToBudget } from './boundedCache'

/** A cache entry is just its size here — the eviction rule has no opinion about values. */
const sizeOf = (value: number) => value

function cache(...sizes: Array<[string, number]>): Map<string, number> {
  return new Map(sizes)
}

describe('evictToBudget', () => {
  it('leaves a cache already inside its budget alone', () => {
    const entries = cache(['a', 10], ['b', 20])
    expect(evictToBudget(entries, sizeOf, 100)).toBe(30)
    expect([...entries.keys()]).toEqual(['a', 'b'])
  })

  it('drops the OLDEST entries first', () => {
    // Insertion order is the LRU order, because the reader deletes a key before
    // re-setting it. So the front of the map is the least recently used.
    const entries = cache(['a', 40], ['b', 40], ['c', 40])
    expect(evictToBudget(entries, sizeOf, 80)).toBe(80)
    expect([...entries.keys()]).toEqual(['b', 'c'])
  })

  it('stops as soon as the total fits, rather than emptying the cache', () => {
    const entries = cache(['a', 100], ['b', 10], ['c', 10])
    expect(evictToBudget(entries, sizeOf, 50)).toBe(20)
    expect([...entries.keys()]).toEqual(['b', 'c'])
  })

  it('counts BYTES, not entries — one huge file evicts where ten small ones do not', () => {
    const small = cache(...Array.from({ length: 10 }, (_, i) => [`f${i}`, 1] as [string, number]))
    expect(evictToBudget(small, sizeOf, 50)).toBe(10)
    expect(small.size).toBe(10)

    const large = cache(['huge', 400], ['next', 10])
    evictToBudget(large, sizeOf, 50)
    expect([...large.keys()]).toEqual(['next'])
  })

  it('keeps the newest entry even when it alone busts the budget', () => {
    // The cache must never come back empty from the call that filled it, or the very
    // next mount re-reads the file it was just handed.
    const entries = cache(['a', 10], ['giant', 10_000])
    expect(evictToBudget(entries, sizeOf, 100)).toBe(10_000)
    expect([...entries.keys()]).toEqual(['giant'])
  })

  it('keeps one entry under a budget of zero rather than clearing everything', () => {
    const entries = cache(['a', 5], ['b', 5])
    evictToBudget(entries, sizeOf, 0)
    expect([...entries.keys()]).toEqual(['b'])
  })

  it('does nothing to an empty cache', () => {
    const entries = cache()
    expect(evictToBudget(entries, sizeOf, 100)).toBe(0)
    expect(entries.size).toBe(0)
  })

  it('mutates the map the caller holds, since it is a shared singleton', () => {
    const entries = cache(['a', 100], ['b', 1])
    const alias = entries
    evictToBudget(entries, sizeOf, 10)
    expect(alias.size).toBe(1)
    expect(alias.has('a')).toBe(false)
  })

  it('measures with the function it is given, not with the map', () => {
    const entries = new Map<string, { chars: number }>([['a', { chars: 90 }], ['b', { chars: 5 }]])
    evictToBudget(entries, value => value.chars, 50)
    expect([...entries.keys()]).toEqual(['b'])
  })
})
