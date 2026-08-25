import { describe, it, expect } from 'vitest'
import { locateQuote } from './quoteAnchors'
import { clampQuote, MAX_QUOTE_CHARS } from './commentAnchors'

/**
 * A rendered document as the layer's walk hands it over: one line per block.
 *
 * Spelled as a fixture rather than inline in each case because the interesting cases are
 * the ones that SPAN two of these lines — a heading and the paragraph under it, two list
 * items — which is precisely where the two obvious ways of reading a container's text
 * disagree with each other.
 */
const DOC = [
  'Anchors',
  'A comment can be left on a passage.',
  'First item',
  'Second item',
].join('\n')

/** What `text.slice` says the match covers, which is the only thing the caller does with it. */
function matched(text: string, quote: string): string | null {
  const at = locateQuote(text, quote)
  return at === null ? null : text.slice(at.start, at.end)
}

describe('locateQuote', () => {
  it('finds a passage that is in the document', () => {
    expect(locateQuote(DOC, 'on a passage')).toEqual({ start: 30, end: 42 })
    expect(matched(DOC, 'on a passage')).toBe('on a passage')
  })

  it('finds a whole block, edges included', () => {
    expect(matched(DOC, 'Anchors')).toBe('Anchors')
  })

  it('says nothing at all when the passage is not there', () => {
    // AC6's own case: the comment is kept and the layer says the anchor was lost, which it
    // can only do if a miss is a miss rather than a nearest guess.
    expect(locateQuote(DOC, 'a passage nobody wrote')).toBeNull()
  })

  it('finds a passage that SPANS two blocks', () => {
    // The bug this whole module is shaped around. `selection.toString()` puts a newline
    // between two blocks and `container.textContent` puts nothing, so a quote captured with
    // one and searched for with the other never matches — and every selection covering a
    // heading and its paragraph, or two list items, would falsely report its anchor lost.
    expect(matched(DOC, 'Anchors\nA comment')).toBe('Anchors\nA comment')
    expect(matched(DOC, 'First item\nSecond item')).toBe('First item\nSecond item')
  })

  it('finds a passage whose whitespace no longer matches, character for character', () => {
    // A re-parse can rewrap the same words: a soft break where there was a space, two
    // spaces where there was one. That says nothing about what the reader picked, so it
    // must not be the difference between a marker and a lost anchor.
    expect(matched(DOC, 'left  on\na passage')).toBe('left on a passage')
    expect(matched('a b c', 'a b\nc')).toBe('a b c')
  })

  it('keeps the ends of a loose match on real characters, never one past the passage', () => {
    // The end offset is read off the LAST matched character rather than the first plus a
    // length, because a collapsed run of whitespace is one character standing for several.
    expect(matched('one   two   three', 'two three')).toBe('two   three')
  })

  it('finds what a clamped quote kept, rather than reporting the anchor lost', () => {
    // `clampQuote` appends an ellipsis, so a long selection can NEVER match verbatim. Left
    // unhandled, every selection over the budget would come back anchorless.
    const passage = 'x'.repeat(MAX_QUOTE_CHARS + 500)
    const clamped = clampQuote(passage)
    expect(clamped.endsWith('…')).toBe(true)
    expect(locateQuote(`before ${passage} after`, clamped))
      .toEqual({ start: 7, end: 7 + MAX_QUOTE_CHARS })
  })

  it('does not mistake an ellipsis the reader selected for one the clamp added', () => {
    // Only ONE trailing ellipsis comes off, so a passage that genuinely ends in one is
    // still found — by its prefix, which is what a clamp would have left anyway.
    expect(matched('the story ends… or does it', 'the story ends…')).toBe('the story ends')
  })

  it('takes the FIRST of several identical passages', () => {
    // The accepted cost written down in the docblock: nothing in a stored comment can say
    // which occurrence was meant, so a marker on the earlier one is the answer.
    expect(locateQuote('same same', 'same')).toEqual({ start: 0, end: 4 })
  })

  it('says nothing for an empty quote, rather than finding it at the start', () => {
    // A comment with no quote is not quote-anchored at all — `commentAnchorKind` calls it
    // `'file'` — and answering `{ start: 0 }` would put a marker on every document.
    expect(locateQuote(DOC, '')).toBeNull()
    expect(locateQuote(DOC, '   \n  ')).toBeNull()
    expect(locateQuote(DOC, '…')).toBeNull()
  })

  it('says nothing when the quote is longer than the whole document', () => {
    expect(locateQuote('short', 'a good deal longer than that')).toBeNull()
  })

  it('says nothing about an empty document', () => {
    expect(locateQuote('', 'anything')).toBeNull()
  })
})
