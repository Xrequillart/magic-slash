import { describe, it, expect } from 'vitest'
import { ChainCounter } from './chainCounter'

describe('ChainCounter', () => {
  it('counts the chains from a directory', () => {
    const counter = new ChainCounter()
    expect(counter.count('/repo')).toBe(0)
    counter.chained('/repo')
    counter.chained('/repo')
    expect(counter.count('/repo')).toBe(2)
    expect(counter.count('/other')).toBe(0)
  })

  it('starts again on a prompt typed in that directory, above it or below it', () => {
    const counter = new ChainCounter()
    for (const path of ['/repo', '/repo/packages/api', '/repo-PROJ-1', '/elsewhere']) counter.chained(path)
    counter.reset('/repo')
    expect(counter.count('/repo')).toBe(0)
    expect(counter.count('/repo/packages/api')).toBe(0)
    // A sibling whose name only starts the same is another directory.
    expect(counter.count('/repo-PROJ-1')).toBe(1)
    expect(counter.count('/elsewhere')).toBe(1)
    counter.reset('/elsewhere/sub')
    expect(counter.count('/elsewhere')).toBe(0)
  })

  it('lets a count lapse once no chain came for a while', () => {
    let now = 0
    const counter = new ChainCounter(1000, () => now)
    counter.chained('/repo')
    now = 900
    counter.chained('/repo')
    expect(counter.count('/repo')).toBe(2)
    now = 2000
    expect(counter.count('/repo')).toBe(0)
    counter.chained('/repo')
    expect(counter.count('/repo')).toBe(1)
  })
})
