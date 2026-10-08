import { describe, expect, it } from 'vitest'
import { completeTrailingShortcode } from './chatEmoji'

describe('completeTrailingShortcode', () => {
  it('swaps a trailing shortcode for its emoji and a space, as the terminal does', () => {
    expect(completeTrailingShortcode(':+1')).toBe('👍 ')
    expect(completeTrailingShortcode('nice work :tada')).toBe('nice work 🎉 ')
    expect(completeTrailingShortcode('first line\n:thumbsup')).toBe('first line\n👍 ')
  })
  it('takes the first row of the list for a partial name', () => {
    // `100` starts with `10`, and is the shortest that does.
    expect(completeTrailingShortcode(':10')).toBe('💯 ')
  })
  it('leaves alone what the terminal would send as typed', () => {
    expect(completeTrailingShortcode('see :+1 above')).toBeNull()
    expect(completeTrailingShortcode('at 10:30')).toBeNull()
    expect(completeTrailingShortcode('one char :a')).toBeNull()
    expect(completeTrailingShortcode('done :+1:')).toBeNull()
    expect(completeTrailingShortcode('nothing like :qqqzzz')).toBeNull()
  })
})
