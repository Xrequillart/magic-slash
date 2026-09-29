import { describe, expect, it } from 'vitest'
import { splitAvatarStack } from './avatarStackOverflow'

describe('splitAvatarStack', () => {
  it('draws everyone while they fit, the last slot included', () => {
    expect(splitAvatarStack(['a', 'b', 'c'], 4)).toEqual({ shown: ['a', 'b', 'c'], rest: [] })
    expect(splitAvatarStack(['a', 'b', 'c', 'd'], 4)).toEqual({ shown: ['a', 'b', 'c', 'd'], rest: [] })
  })

  it('gives the chip a slot of its own once they do not', () => {
    expect(splitAvatarStack(['a', 'b', 'c', 'd', 'e'], 4)).toEqual({ shown: ['a', 'b', 'c'], rest: ['d', 'e'] })
    expect(splitAvatarStack(['a', 'b', 'c', 'd', 'e', 'f', 'g'], 3)).toEqual({ shown: ['a', 'b'], rest: ['c', 'd', 'e', 'f', 'g'] })
  })

  it('never uses more slots than max', () => {
    for (let count = 0; count < 10; count++) {
      const { shown, rest } = splitAvatarStack(Array.from({ length: count }, (_, i) => i), 4)
      expect(shown.length + (rest.length > 0 ? 1 : 0)).toBeLessThanOrEqual(4)
      expect(shown.length + rest.length).toBe(count)
    }
  })

  it('reads a max below one as one', () => {
    expect(splitAvatarStack(['a'], 0)).toEqual({ shown: ['a'], rest: [] })
    expect(splitAvatarStack(['a', 'b'], 0)).toEqual({ shown: [], rest: ['a', 'b'] })
  })

  it('answers nothing for nobody', () => {
    expect(splitAvatarStack([], 4)).toEqual({ shown: [], rest: [] })
  })
})
