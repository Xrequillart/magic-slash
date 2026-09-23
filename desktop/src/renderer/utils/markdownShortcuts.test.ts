import { describe, expect, it } from 'vitest'
import { blockShortcut, inlineShortcut } from './markdownShortcuts'

describe('inlineShortcut', () => {
  it('closes code on the second backtick', () => {
    expect(inlineShortcut('lancer `npm test`')).toEqual({ start: 7, tag: 'code', inner: 'npm test' })
  })

  it('closes bold before italic', () => {
    expect(inlineShortcut('un **mot**')).toEqual({ start: 3, tag: 'strong', inner: 'mot' })
    expect(inlineShortcut('un __mot__')).toEqual({ start: 3, tag: 'strong', inner: 'mot' })
  })

  it('closes italic and strikethrough', () => {
    expect(inlineShortcut('un *mot*')).toEqual({ start: 3, tag: 'em', inner: 'mot' })
    expect(inlineShortcut('un _mot_')).toEqual({ start: 3, tag: 'em', inner: 'mot' })
    expect(inlineShortcut('un ~~mot~~')).toEqual({ start: 3, tag: 's', inner: 'mot' })
  })

  it('closes a link on its closing parenthesis', () => {
    expect(inlineShortcut('voir [le site](https://e.com)')).toEqual({
      start: 5, tag: 'a', inner: 'le site', href: 'https://e.com',
    })
  })

  it('leaves what markdown would not read as a mark', () => {
    expect(inlineShortcut('2 * 3 *')).toBeNull()
    expect(inlineShortcut('un ** mot **')).toBeNull()
    expect(inlineShortcut('snake_case_')).toBeNull()
    expect(inlineShortcut('rien')).toBeNull()
  })

  it('does not take the opening of a bold for an italic', () => {
    expect(inlineShortcut('**mot*')).toBeNull()
  })
})

describe('blockShortcut', () => {
  it('reads a marker typed at the start of a line', () => {
    expect(blockShortcut('# ')).toBe('h1')
    expect(blockShortcut('## ')).toBe('h2')
    expect(blockShortcut('### ')).toBe('h3')
    expect(blockShortcut('- ')).toBe('ul')
    expect(blockShortcut('1. ')).toBe('ol')
    expect(blockShortcut('[] ')).toBe('todo')
    expect(blockShortcut('> ')).toBe('quote')
  })

  it('reads nothing once there is text before the marker', () => {
    expect(blockShortcut('texte # ')).toBeNull()
    expect(blockShortcut('#')).toBeNull()
  })
})
