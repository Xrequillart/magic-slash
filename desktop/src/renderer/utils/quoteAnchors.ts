/**
 * Finding a quoted passage again in the text of a rendered document.
 *
 * A markdown card switched to its rendered view has no lines to anchor a comment to. The
 * prose react-markdown paints carries no mapping back to the file — `node.position` never
 * survives the walk from remark to the DOM — so a comment left there is anchored to the
 * PASSAGE it was left on and to nothing else. Which means the passage has to be FOUND
 * again on every render, in whatever text is on screen at the time, and this module is
 * that search and nothing else.
 *
 * Pure string arithmetic, with no DOM and no React, for exactly the reason `commentAnchors`
 * next door is: the renderer suite runs on node with no jsdom, so anything holding a `Text`
 * node could not be covered here. The caller owns the walk that turns a container into a
 * string and an offset back into a `Range`; this owns the question "where in that string is
 * the quote", which is the half that fails silently — a search that misses reports "the
 * anchor is lost" about a passage that is sitting on screen.
 */

import { unclampQuote } from './commentAnchors'

/** Where a quote was found: half-open offsets into the text it was looked for in. */
export interface QuoteMatch {
  start: number
  end: number
}

/**
 * A character of the rendered text, with where it came from.
 *
 * `origin[i]` is the offset in the ORIGINAL text of the character at `i` in the collapsed
 * one — which is the only reason collapsing is usable at all: a match found in collapsed
 * space has to come back as offsets the caller can turn into a `Range` over the real nodes.
 */
interface Collapsed {
  text: string
  origin: number[]
}

/**
 * `\s` and not a hand-written list, which is what puts NBSP in it.
 *
 * A rendered document is full of them — `&nbsp;` in the source, and the entity the diff's
 * own gutter emits — and a search that treated one as a letter would fail on any passage
 * containing one while reporting the anchor lost.
 */
const WHITESPACE = /\s/

/**
 * Where a quote sits in a text, or `null` when it is not in it at all.
 *
 * Two passes, and the second is not a nicety. The stored quote was captured from the very
 * same walk that produces `text`, so an exact match is the ordinary case and is tried
 * first. It is not the only case: the document is re-parsed by react-markdown on every
 * read, and a passage that gained or lost a soft break between two words — an edit above it
 * rewrapping the source, a table cell re-laid out — is the same passage with different
 * whitespace in it. So a failed exact match falls back to a search in which every run of
 * whitespace is one space, which is the one difference that says nothing about what the
 * reader picked.
 *
 * A trailing ellipsis is taken off first, because `clampQuote` PUT it there: a selection
 * over the budget is stored cut short with `…` appended, so a clamped quote can never match
 * verbatim and every long selection would report its anchor lost. What is left is a PREFIX
 * of what was selected, and a prefix is what gets found — the highlight then covers the part
 * that was stored, which is the honest answer rather than a guess at where the rest ended.
 *
 * The FIRST occurrence wins, and that is an accepted cost rather than an oversight. Nothing
 * in a stored comment can say which occurrence was meant — `FileComment` holds a quote and
 * no index, and widening it to hold one would undo the single-discriminant decision that
 * `commentAnchorKind` exists for — so a passage that appears twice in a document takes its
 * marker to the earlier of the two. A marker a paragraph off is strictly better than none,
 * which is the same trade `visibleRowForComment` makes for a folded-away line.
 *
 * `null` for an empty quote as well as for a missing one: a comment with no quote is not a
 * quote-anchored comment at all (see `commentAnchorKind`), and answering "found at 0" for it
 * would put a marker on the first character of every document.
 */
export function locateQuote(text: string, quote: string): QuoteMatch | null {
  const wanted = wantedText(quote)
  if (wanted === '') return null

  const exact = text.indexOf(wanted)
  if (exact >= 0) return { start: exact, end: exact + wanted.length }

  const haystack = collapse(text)
  const needle = collapse(wanted)
  if (needle.text === '') return null
  const at = haystack.text.indexOf(needle.text)
  if (at < 0) return null

  // The END comes off the LAST matched character's origin rather than off the first plus a
  // length: a collapsed run of whitespace is one character standing for several, so the two
  // are not the same number. `+ 1` because the offsets are half-open, and it lands on a real
  // character because `collapse` never leaves a space at either end of the needle.
  return {
    start: haystack.origin[at],
    end: haystack.origin[at + needle.text.length - 1] + 1,
  }
}

/**
 * The text actually searched for: the stored quote, less what `clampQuote` added to it.
 *
 * Trimmed as well, so a quote stored by an older build that kept its edges — or one whose
 * selection ended on a block break — still matches the passage rather than the passage plus
 * a newline the rendering may no longer produce.
 */
function wantedText(quote: string): string {
  return unclampQuote(quote).trim()
}

/**
 * Every run of whitespace as one space, the ends dropped, and where each character came from.
 *
 * The ends are dropped rather than kept as a space so that a needle can never begin or end
 * on one: that is what lets the caller above map a match's end back through `origin` and
 * land on a real character instead of on the first character AFTER the passage.
 */
function collapse(text: string): Collapsed {
  const characters: string[] = []
  const origin: number[] = []
  let gap = false

  for (let i = 0; i < text.length; i++) {
    const character = text[i]
    if (WHITESPACE.test(character)) {
      // A leading run is not a gap between anything, so it emits nothing at all.
      gap = characters.length > 0
      continue
    }
    if (gap) {
      // The space stands for the run BEFORE this character, and it is given this
      // character's own offset: a match can only ever start or end on a non-space, so this
      // offset is never the one a boundary is read from — and pointing forward keeps every
      // entry of `origin` inside the run's own text rather than one past it.
      characters.push(' ')
      origin.push(i)
      gap = false
    }
    characters.push(character)
    origin.push(i)
  }

  // A trailing run leaves `gap` set and is never flushed, which is what drops it.
  return { text: characters.join(''), origin }
}
