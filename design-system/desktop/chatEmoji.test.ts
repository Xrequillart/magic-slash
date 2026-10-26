import { describe, expect, it } from 'vitest'
import { completeTrailingShortcode, emojiTokenAt, matchEmoji } from './chatEmoji'

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

describe('matchEmoji', () => {
  it('ranks the names that start with the query first, the shortest leading', () => {
    expect(matchEmoji('+1')[0]).toEqual({ name: '+1', emoji: '👍' })
    expect(matchEmoji('10')[0]).toEqual({ name: '100', emoji: '💯' })
  })
  it('shows an emoji once, under its best name', () => {
    const emojis = matchEmoji('thumbs').map((m) => m.emoji)
    expect(new Set(emojis).size).toBe(emojis.length)
  })
  it('stops at the list length', () => {
    expect(matchEmoji('sm').length).toBe(8)
  })
})

describe('emojiTokenAt', () => {
  it('finds the shortcode before the caret', () => {
    expect(emojiTokenAt('nice :ta', 8)).toEqual({ start: 5, end: 8, query: 'ta' })
    expect(emojiTokenAt(':tada more', 3)).toEqual({ start: 0, end: 5, query: 'ta' })
  })
  it('opens on nothing else', () => {
    expect(emojiTokenAt('at 10:30', 8)).toBeNull()
    expect(emojiTokenAt('one :a', 6)).toBeNull()
    expect(emojiTokenAt(':+1 then', 8)).toBeNull()
  })
})
