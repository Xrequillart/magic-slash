import { describe, it, expect } from 'vitest'
import {
  clampQuote, commentFileKey, commentFileKeyPrefix, diffFingerprint, edgesByRow, extendRange,
  lineIdentityFromRow, markersByRow, normalizeRange, rangeCovers, rangeLabel, rowsForComment,
  visibleRowForComment, MAX_QUOTE_CHARS,
  type AnchoredComment, type CommentTarget, type LineRange, type RowAttributes, type RowIdentity,
} from './commentAnchors'
import { reviewFileKey } from './reviewLayout'
import type { ChangedLines } from '../../types'

/** An ordinary row: its number is the new file's, and it carries no diff attribute. */
function keptRow(line: number, overrides: Partial<RowAttributes> = {}): RowAttributes {
  return { line: String(line), ...overrides }
}

/**
 * A row the diff injected for a deleted line. `data-line` is the number in the OLD file
 * — the line is gone from the new one — and `data-anchor` is the new-file line the
 * deletion sits before.
 */
function removedRow(oldLine: number, anchor: number, overrides: Partial<RowAttributes> = {}): RowAttributes {
  return { line: String(oldLine), diff: 'remove', anchor: String(anchor), ...overrides }
}

/** A line of the file as it stands now. */
function kept(line: number): RowIdentity {
  return { side: 'new', line, newLine: line }
}

/** A deleted line, with the new-file position it was injected at. */
function removed(oldLine: number, anchor: number): RowIdentity {
  return { side: 'old', line: oldLine, newLine: anchor }
}

function range(overrides: Partial<LineRange> = {}): LineRange {
  return { side: 'new', startLine: 12, endLine: 12, ...overrides }
}

/** A stored comment, reduced to the two fields the marker arithmetic reads. */
function comment(id: string, anchor: LineRange | null): AnchoredComment {
  return { id, anchor }
}

/**
 * An unchanged file rendered whole: row `i` is line `i + 1`, for ten lines.
 *
 * Ten because the blocks below are commented on lines 3 to 5 — enough to leave rows above
 * the block, inside it and below it, which is what tells "every line of the range" from
 * "the first line" and from "all of them".
 */
const PLAIN_ROWS: RowIdentity[] = Array.from({ length: 10 }, (_, i) => kept(i + 1))

/**
 * The rendering of a file with two lines deleted near the top — the case the whole
 * `side` distinction exists for.
 *
 * Old file:  1 `const a`, 2 `const b`, 3 `const c`, 4 `const d`, 5 `const e`
 * New file:  1 `const a`,                           2 `const d`, 3 `const e`
 *
 * Which is five rows on screen: the kept first line, the two injected deletions, then
 * the two lines that survive. `const d` is the FOURTH row drawn and the SECOND line of
 * the file, and every assertion below that mentions it is checking that the arithmetic
 * answers 2.
 *
 * It is also where the collision lives: the second row says `data-line="2"` and so does
 * the fourth. One is `const b` in the old file, the other `const d` in the new one.
 */
const DELETIONS_ABOVE: RowIdentity[] = [kept(1), removed(2, 2), removed(3, 2), kept(2), kept(3)]

describe('lineIdentityFromRow', () => {
  it('reads an ordinary row as a line of the file as it stands now, which is the number its gutter shows', () => {
    expect(lineIdentityFromRow(keptRow(42))).toEqual({ side: 'new', line: 42, newLine: 42 })
  })

  it('reads an added row as a line of that same file, since an addition is there to be numbered', () => {
    expect(lineIdentityFromRow(keptRow(42, { diff: 'add' }))).toEqual({ side: 'new', line: 42, newLine: 42 })
  })

  it('reads an injected removed row as a line of the OLD file, because that line is gone from the new one', () => {
    expect(lineIdentityFromRow(removedRow(2, 2))).toEqual({ side: 'old', line: 2, newLine: 2 })
  })

  it('carries the new-file line a deletion sits before, which is the one position it shares with the rows around it', () => {
    // A block of deletions later in the file: old lines 80 and 81 both sit before new
    // line 60, and that 60 is what puts them on the same axis as the rows either side.
    expect(lineIdentityFromRow(removedRow(80, 60))).toEqual({ side: 'old', line: 80, newLine: 60 })
  })

  it('falls back to the row own number for a wholly deleted file, where no row has a place in the new one', () => {
    // `annotateShikiHtml`'s 'all-remove' mode marks every row and stamps no anchor:
    // there is no new file for the rows to have a position in. Every row is then on the
    // same side, so nothing ever projects and the fallback is never read.
    expect(lineIdentityFromRow({ line: '7', diff: 'remove' })).toEqual({ side: 'old', line: 7, newLine: 7 })
  })

  it('has no line for the separator standing in for a region left out', () => {
    // The changes-only view's seams carry `data-elided` and no number at all. A comment
    // attached to "the part that was left out" would have nothing to come back to.
    expect(lineIdentityFromRow({ elided: '120' })).toBeNull()
  })

  it('has no line for a row that never got a number', () => {
    expect(lineIdentityFromRow({})).toBeNull()
    expect(lineIdentityFromRow({ line: null })).toBeNull()
    expect(lineIdentityFromRow({ line: '' })).toBeNull()
  })

  it('refuses a number that is not one, rather than anchoring a comment to NaN', () => {
    expect(lineIdentityFromRow({ line: '12px' })).toBeNull()
    expect(lineIdentityFromRow({ line: '1.5' })).toBeNull()
    // Lines are 1-based everywhere in the pipeline, so a zero is a bug upstream.
    expect(lineIdentityFromRow({ line: '0' })).toBeNull()
    expect(lineIdentityFromRow({ line: '-3' })).toBeNull()
  })

  it('ignores an anchor that is not a number, keeping the row own line instead', () => {
    expect(lineIdentityFromRow({ line: '80', diff: 'remove', anchor: 'x' }))
      .toEqual({ side: 'old', line: 80, newLine: 80 })
  })
})

describe('normalizeRange', () => {
  it('takes the two ends in whichever order the reader dragged them', () => {
    expect(normalizeRange(kept(18), kept(12))).toEqual({ side: 'new', startLine: 12, endLine: 18 })
    expect(normalizeRange(kept(12), kept(18))).toEqual({ side: 'new', startLine: 12, endLine: 18 })
  })

  it('gives a single row a range of its own', () => {
    expect(normalizeRange(kept(12), kept(12))).toEqual({ side: 'new', startLine: 12, endLine: 12 })
  })

  it('stores the file real line number on a file with deletions above the commented line', () => {
    // `const d` is the fourth row on screen and the second line of the file. Two rows of
    // deletions sit above it, so anything counting rows would have said 4 — and an agent
    // sent to line 4 of a three-line file would be looking at nothing.
    const constD = DELETIONS_ABOVE[3]
    expect(normalizeRange(constD, constD)).toEqual({ side: 'new', startLine: 2, endLine: 2 })
  })

  it('keeps a pick made entirely of deleted rows in the old file numbering, which is the only place those lines exist', () => {
    expect(normalizeRange(DELETIONS_ABOVE[1], DELETIONS_ABOVE[2]))
      .toEqual({ side: 'old', startLine: 2, endLine: 3 })
  })

  it('projects a selection dragged from a deleted line into the line replacing it onto the file as it stands now', () => {
    // The ordinary shape of an edited line in the diff: the removed row, then the added
    // one, touching. Dragging across both is what a reader does to comment on the edit,
    // and the new file is the only axis the two rows share.
    expect(normalizeRange(removed(80, 60), kept(60)))
      .toEqual({ side: 'new', startLine: 60, endLine: 60 })
  })

  it('spans from a deletion to a kept line further down using where the deletion sits, not its old number', () => {
    // The deleted line was number 80 in the old file and sits before new line 60. Read
    // as an old number it would have produced a backwards range of 60 to 80.
    expect(normalizeRange(removed(80, 60), kept(64)))
      .toEqual({ side: 'new', startLine: 60, endLine: 64 })
  })
})

describe('extendRange', () => {
  it('starts a pick of one line on the first click', () => {
    expect(extendRange(null, kept(12)))
      .toEqual({ anchor: kept(12), range: { side: 'new', startLine: 12, endLine: 12 } })
  })

  it('grows the pick to the row shift-clicked below it', () => {
    const first = extendRange(null, kept(12))
    expect(extendRange(first, kept(18)).range).toEqual({ side: 'new', startLine: 12, endLine: 18 })
  })

  it('grows upwards just as readily, since a reader picks a block from either end', () => {
    const first = extendRange(null, kept(18))
    expect(extendRange(first, kept(12)).range).toEqual({ side: 'new', startLine: 12, endLine: 18 })
  })

  it('measures every shift-click from where the pick began rather than from where it last reached', () => {
    // Pick 10, shift-click 14, then shift-click 12: the reader is correcting the end of
    // the block, so the answer is 10 to 12. Extending from the last end instead would
    // hand back 12 to 14 and drop the two lines the reader started on.
    const pick = extendRange(extendRange(null, kept(10)), kept(14))
    expect(extendRange(pick, kept(12)).range).toEqual({ side: 'new', startLine: 10, endLine: 12 })
  })

  it('keeps the row the pick began on as its anchor however far the range has moved', () => {
    const pick = extendRange(extendRange(null, kept(10)), kept(40))
    expect(pick.anchor).toEqual(kept(10))
  })

  it('crosses from a deleted line into the file as it stands now, the way a drag across an edit does', () => {
    const pick = extendRange(null, removed(80, 60))
    expect(pick.range).toEqual({ side: 'old', startLine: 80, endLine: 80 })
    expect(extendRange(pick, kept(62)).range).toEqual({ side: 'new', startLine: 60, endLine: 62 })
  })
})

describe('rangeCovers', () => {
  it('covers every line from one end of a block to the other, and nothing past either', () => {
    const block: LineRange = { side: 'new', startLine: 12, endLine: 18 }
    expect(rangeCovers(block, 'new', 11)).toBe(false)
    expect(rangeCovers(block, 'new', 12)).toBe(true)
    expect(rangeCovers(block, 'new', 18)).toBe(true)
    expect(rangeCovers(block, 'new', 19)).toBe(false)
  })

  it('never covers the same number in the other file', () => {
    // The one mistake that shows a comment on the wrong line rather than on none: in
    // DELETIONS_ABOVE, old line 2 and new line 2 are two different lines of two
    // different files, and both are on screen at once.
    expect(rangeCovers({ side: 'new', startLine: 2, endLine: 2 }, 'old', 2)).toBe(false)
    expect(rangeCovers({ side: 'old', startLine: 2, endLine: 2 }, 'new', 2)).toBe(false)
  })
})

describe('visibleRowForComment', () => {
  it('names the row the comment was left on', () => {
    expect(visibleRowForComment({ side: 'new', startLine: 2, endLine: 2 }, DELETIONS_ABOVE)).toBe(3)
  })

  it('names the FIRST row of a block, which is where one marker for the block belongs', () => {
    expect(visibleRowForComment({ side: 'new', startLine: 1, endLine: 3 }, DELETIONS_ABOVE)).toBe(0)
  })

  it('finds a comment on a deleted line among the rows injected for it', () => {
    expect(visibleRowForComment({ side: 'old', startLine: 3, endLine: 3 }, DELETIONS_ABOVE)).toBe(2)
  })

  it('counts the separators, so the index points at the row it was handed', () => {
    // The caller walks every `.line` in the document and keeps the elision seams in the
    // list as nulls, because it holds a parallel array of the elements themselves. An
    // index that skipped them would be off by one seam per region above it.
    const rows = [null, kept(40), kept(41), null, kept(80)]
    expect(visibleRowForComment({ side: 'new', startLine: 80, endLine: 80 }, rows)).toBe(4)
  })

  it('falls back to the nearest row above once the commented line has been folded away', () => {
    // Comment left on line 40 with the whole file showing, then the card folded back to
    // its changed regions. Dropping the marker would drop the only way back into the
    // comment, so it goes to the last row still on screen above it.
    const rows = [kept(1), kept(2), kept(3), null]
    expect(visibleRowForComment({ side: 'new', startLine: 40, endLine: 40 }, rows)).toBe(2)
  })

  it('falls back to the row below when the fold took everything above it', () => {
    const rows = [null, kept(40), kept(41)]
    expect(visibleRowForComment({ side: 'new', startLine: 2, endLine: 2 }, rows)).toBe(1)
  })

  it('never puts a comment on a deleted line onto a kept row that happens to share its number', () => {
    // Only the removed rows can carry it, and this rendering has none.
    expect(visibleRowForComment({ side: 'old', startLine: 2, endLine: 2 }, [kept(1), kept(2), kept(3)]))
      .toBeNull()
  })

  it('has no row at all for a document that rendered nothing to mark', () => {
    expect(visibleRowForComment(range(), [])).toBeNull()
    expect(visibleRowForComment(range(), [null, null])).toBeNull()
  })
})

describe('rowsForComment', () => {
  it('marks every line of a commented block, not only the one the card hangs off', () => {
    expect(rowsForComment({ side: 'new', startLine: 3, endLine: 5 }, PLAIN_ROWS)).toEqual([2, 3, 4])
  })

  it('marks the one line a comment on a single line was left on', () => {
    expect(rowsForComment({ side: 'new', startLine: 3, endLine: 3 }, PLAIN_ROWS)).toEqual([2])
  })

  it('marks the deleted lines a comment was left on, and none of the kept lines sharing their numbers', () => {
    // Old lines 2 and 3 are the two injected rows, at indexes 1 and 2. New lines 2 and 3
    // are on screen at the same time, at indexes 3 and 4, and must not be marked.
    expect(rowsForComment({ side: 'old', startLine: 2, endLine: 3 }, DELETIONS_ABOVE)).toEqual([1, 2])
  })

  it('steps over a separator standing in the middle of the block', () => {
    // The changes-only view can show the two ends of a commented block and elide its
    // middle. The rows that ARE on screen still carry their markers.
    const rows = [kept(10), null, kept(14)]
    expect(rowsForComment({ side: 'new', startLine: 10, endLine: 14 }, rows)).toEqual([0, 2])
  })

  it('falls back to the single nearest row once the whole block has been folded away', () => {
    // Same fallback as `visibleRowForComment`, and for the same reason: the marker is the
    // only way back into the comment. One row, not a spread — none of these lines is in
    // the range, so marking several would be marking lines nobody commented on.
    expect(rowsForComment({ side: 'new', startLine: 40, endLine: 44 }, [kept(1), kept(2), kept(3)]))
      .toEqual([2])
  })

  it('has nothing to mark when the comment side is absent from the rendering', () => {
    expect(rowsForComment({ side: 'old', startLine: 2, endLine: 2 }, PLAIN_ROWS)).toEqual([])
    expect(rowsForComment(range(), [])).toEqual([])
  })
})

describe('markersByRow', () => {
  it('gives a line carrying two comments both of their ids, oldest first', () => {
    // The order the store holds them in is the order they were written, and it is what the
    // marker walks: the first click opens what the reader wrote first, the next click the
    // one after it. Without both ids the second comment on a line is unreachable.
    const markers = markersByRow(
      [comment('older', range({ startLine: 3, endLine: 3 })), comment('newer', range({ startLine: 3, endLine: 3 }))],
      PLAIN_ROWS,
    )
    expect(markers.get(2)).toEqual(['older', 'newer'])
  })

  it('puts a marker on every line of a block, each saying it carries one comment', () => {
    const markers = markersByRow([comment('block', range({ startLine: 3, endLine: 5 }))], PLAIN_ROWS)
    expect([...markers.keys()]).toEqual([2, 3, 4])
    expect(markers.get(3)).toEqual(['block'])
  })

  it('adds a block comment to the count of a line that already had one of its own', () => {
    // Line 4 is inside the block AND has a comment of its own, so its pill reads two and
    // clicking it walks through both. Lines 3 and 5 carry only the block's.
    const markers = markersByRow(
      [comment('block', range({ startLine: 3, endLine: 5 })), comment('own', range({ startLine: 4, endLine: 4 }))],
      PLAIN_ROWS,
    )
    expect(markers.get(2)).toEqual(['block'])
    expect(markers.get(3)).toEqual(['block', 'own'])
    expect(markers.get(4)).toEqual(['block'])
  })

  it('leaves every line nobody commented on out of the answer', () => {
    const markers = markersByRow([comment('one', range({ startLine: 3, endLine: 3 }))], PLAIN_ROWS)
    expect(markers.size).toBe(1)
    expect(markers.has(0)).toBe(false)
  })

  it('has no marker for a comment that never got an anchor', () => {
    // `FileComment.anchor` is nullable, and a comment with none has no line to mark.
    expect(markersByRow([comment('loose', null)], PLAIN_ROWS).size).toBe(0)
  })
})

describe('edgesByRow', () => {
  it('closes a block off at its first line and at its last, and nowhere in between', () => {
    // A reader sees the commented range from the wash on the rows; the edges are what say
    // where that range stops. The middle of a block has no edge of its own to draw.
    const edges = edgesByRow(markersByRow([comment('block', range({ startLine: 3, endLine: 5 }))], PLAIN_ROWS))
    expect([...edges.keys()]).toEqual([2, 4])
    expect(edges.get(2)).toEqual({ top: true, bottom: false })
    expect(edges.get(4)).toEqual({ top: false, bottom: true })
  })

  it('gives a comment on a single line both of its edges, on the one row it has', () => {
    const edges = edgesByRow(markersByRow([comment('one', range({ startLine: 3, endLine: 3 }))], PLAIN_ROWS))
    expect([...edges.keys()]).toEqual([2])
    expect(edges.get(2)).toEqual({ top: true, bottom: true })
  })

  it('keeps two comments on consecutive lines apart, which is what the edges are for', () => {
    // Lines 3–4 and 5–6. Without the edges the two are one unbroken wash from 3 to 6 and
    // nothing says where the first comment stops and the second starts; with them, line 4
    // is closed at the bottom and line 5 opens again at the top.
    const edges = edgesByRow(markersByRow(
      [comment('upper', range({ startLine: 3, endLine: 4 })), comment('lower', range({ startLine: 5, endLine: 6 }))],
      PLAIN_ROWS,
    ))
    expect([...edges.keys()]).toEqual([2, 3, 4, 5])
    expect(edges.get(3)).toEqual({ top: false, bottom: true })
    expect(edges.get(4)).toEqual({ top: true, bottom: false })
  })

  it('draws both edges on the row where one comment ends and the next begins', () => {
    // Lines 3–5 and 5–7 share line 5: it is the bottom of one block and the top of the
    // other, so it carries both lines rather than whichever was found last.
    const edges = edgesByRow(markersByRow(
      [comment('upper', range({ startLine: 3, endLine: 5 })), comment('lower', range({ startLine: 5, endLine: 7 }))],
      PLAIN_ROWS,
    ))
    expect([...edges.keys()]).toEqual([2, 4, 6])
    expect(edges.get(4)).toEqual({ top: true, bottom: true })
  })

  it('gives a comment sitting inside another block its own edges, and the block keeps its', () => {
    // Line 4 is inside 3–5 and has a comment of its own. Two comments, two pills: one on
    // line 3 where the block begins, one on line 4 where the inner comment does.
    const edges = edgesByRow(markersByRow(
      [comment('block', range({ startLine: 3, endLine: 5 })), comment('own', range({ startLine: 4, endLine: 4 }))],
      PLAIN_ROWS,
    ))
    expect(edges.get(2)).toEqual({ top: true, bottom: false })
    expect(edges.get(3)).toEqual({ top: true, bottom: true })
    expect(edges.get(4)).toEqual({ top: false, bottom: true })
  })

  it('marks the row two comments both begin on once, since one edge is all it can draw', () => {
    // The pill on that row opens the older comment and clicking again walks to the newer —
    // the tooltip is what says there are two, now that the pill carries no number.
    const edges = edgesByRow(markersByRow(
      [comment('older', range({ startLine: 3, endLine: 3 })), comment('newer', range({ startLine: 3, endLine: 4 }))],
      PLAIN_ROWS,
    ))
    expect([...edges.keys()]).toEqual([2, 3])
    expect(edges.get(2)).toEqual({ top: true, bottom: true })
    expect(edges.get(3)).toEqual({ top: false, bottom: true })
  })

  it('closes each block off in document order however the comments happen to be stored', () => {
    // The map arrives in the order the comments were written, which here is the reverse of
    // the order the rows are drawn in. Reading it as-is would call line 7 the first row of
    // the file and hand the top of the block on lines 2–4 to line 3.
    const edges = edgesByRow(markersByRow(
      [comment('lower', range({ startLine: 7, endLine: 8 })), comment('upper', range({ startLine: 2, endLine: 4 }))],
      PLAIN_ROWS,
    ))
    expect([...edges.keys()]).toEqual([1, 3, 6, 7])
    expect(edges.get(1)).toEqual({ top: true, bottom: false })
    expect(edges.get(6)).toEqual({ top: true, bottom: false })
  })

  it('closes a block off on the rows that ARE on screen when its middle has been elided', () => {
    const rows = [kept(10), null, kept(14)]
    const edges = edgesByRow(markersByRow([comment('block', range({ startLine: 10, endLine: 14 }))], rows))
    expect([...edges.keys()]).toEqual([0, 2])
    expect(edges.get(0)).toEqual({ top: true, bottom: false })
    expect(edges.get(2)).toEqual({ top: false, bottom: true })
  })

  it('draws both edges on the nearest rendered row once the whole block has been folded away', () => {
    // Inherited from `rowsForComment`, and inherited on purpose: the pill is the way back
    // into the comment, so one a line or two off is strictly better than none — and the
    // block it stands for is that single row.
    const edges = edgesByRow(markersByRow(
      [comment('folded', range({ startLine: 40, endLine: 44 }))],
      [kept(1), kept(2), kept(3)],
    ))
    expect([...edges.keys()]).toEqual([2])
    expect(edges.get(2)).toEqual({ top: true, bottom: true })
  })

  it('has nothing to draw on a file nobody has commented on', () => {
    expect(edgesByRow(markersByRow([], PLAIN_ROWS)).size).toBe(0)
  })
})

describe('rangeLabel', () => {
  it('names a single line without pretending it is a range', () => {
    expect(rangeLabel({ side: 'new', startLine: 12, endLine: 12 }))
      .toEqual({ key: 'filePreview.commentLine', vars: { start: 12, end: 12 } })
  })

  it('names both ends of a block', () => {
    expect(rangeLabel({ side: 'new', startLine: 12, endLine: 18 }))
      .toEqual({ key: 'filePreview.commentLines', vars: { start: 12, end: 18 } })
  })

  it('says the same thing about a block of deleted lines, which are numbered in their own file', () => {
    expect(rangeLabel({ side: 'old', startLine: 80, endLine: 81 }))
      .toEqual({ key: 'filePreview.commentLines', vars: { start: 80, end: 81 } })
  })
})

describe('clampQuote', () => {
  it('keeps a selection short enough to be worth storing whole', () => {
    expect(clampQuote('const answer = 42')).toBe('const answer = 42')
    expect(clampQuote('')).toBe('')
  })

  it('keeps a selection of exactly the budget, so the cut is not off by one', () => {
    const exact = 'x'.repeat(MAX_QUOTE_CHARS)
    expect(clampQuote(exact)).toBe(exact)
  })

  it('cuts a selection nobody would read back, and shows that it cut it', () => {
    // A reader dragging across a generated file would otherwise put the whole of it in
    // the store, once per comment, for a card showing three lines of it.
    const clamped = clampQuote('x'.repeat(MAX_QUOTE_CHARS + 500))
    expect(clamped).toHaveLength(MAX_QUOTE_CHARS + 1)
    expect(clamped.endsWith('…')).toBe(true)
  })
})

/**
 * A file as it stands, and the same file after the agent has been over it.
 *
 * Three shapes, because the fingerprint has three jobs: `FILE` and `FILE_AGAIN` are the
 * same bytes arriving twice (a theme change, a re-read), `FILE_REWRITTEN` is a line
 * changed in place — the case line numbers alone survive and a quote does not — and
 * `FILE_GROWN` is a line inserted above, which moves every number below it.
 */
const FILE = 'const a = 1\nconst b = 2\nexport default a + b\n'
const FILE_AGAIN = 'const a = 1\nconst b = 2\nexport default a + b\n'
const FILE_REWRITTEN = 'const a = 1\nconst b = 3\nexport default a + b\n'
const FILE_GROWN = "import x from 'x'\nconst a = 1\nconst b = 2\nexport default a + b\n"

/**
 * The diff's shape as the read reports it, in the states the fingerprint has to tell apart —
 * the fifth being absent altogether, which has no fixture because it is the argument left
 * out.
 *
 * `DIFF_AGAIN` is a DISTINCT object holding the same numbers, which is exactly what a theme
 * change produces: the code appearance is part of the preview's cache key, so the file is
 * re-read over IPC and the same diff comes back in a new object. `DIFF_MOVED` is the same
 * working file against a HEAD that moved — a commit, an amend, a rebase — where an old-side
 * comment would otherwise re-attach to unrelated deleted code. `DIFF_CLEARED` is present and
 * empty, the file having been committed, which is a different state of the world from a file
 * that has no diff to report at all.
 */
const DIFF: ChangedLines = { added: [2], removedBefore: [2] }
const DIFF_AGAIN: ChangedLines = { added: [2], removedBefore: [2] }
const DIFF_MOVED: ChangedLines = { added: [2, 3], removedBefore: [5] }
const DIFF_CLEARED: ChangedLines = { added: [], removedBefore: [] }

/** The file a comment is filed under, as CodeView holds it. */
function target(overrides: Partial<CommentTarget> = {}): CommentTarget {
  return { repoPath: '/repo', path: 'src/a.ts', fingerprint: diffFingerprint(FILE), ...overrides }
}

describe('diffFingerprint', () => {
  it('answers the same string for the same bytes, which is what makes a comment readable back', () => {
    // The one thing that must hold: a theme change re-reads the file and replaces the whole
    // highlighted document, and a fingerprint that moved with it would take every marker in
    // the review with it.
    expect(diffFingerprint(FILE_AGAIN)).toBe(diffFingerprint(FILE))
  })

  it('moves when a line is rewritten in place, where the numbers alone would not have', () => {
    // Line 2 still exists and still numbers 2, so a comment on it would land — on code it
    // was not about, with a stored quote that now says something the file does not.
    expect(diffFingerprint(FILE_REWRITTEN)).not.toBe(diffFingerprint(FILE))
  })

  it('moves when a line is inserted above the comment, which is what shifts every number below', () => {
    expect(diffFingerprint(FILE_GROWN)).not.toBe(diffFingerprint(FILE))
  })

  it('tells two files of the same length apart, which a length alone could not', () => {
    expect(diffFingerprint('ab')).not.toBe(diffFingerprint('ba'))
  })

  it('answers for an empty file, since a file emptied is a file that changed', () => {
    expect(diffFingerprint('')).not.toBe(diffFingerprint(FILE))
    expect(diffFingerprint('')).toBe(diffFingerprint(''))
  })

  it('answers the same string when the same diff arrives in a new object, which is every re-read', () => {
    // The theme-change criterion, and the one the whole file guards: a new appearance means a
    // new read, so the numbers come back in an object that is never the one before it. Reading
    // the object's identity instead of its values would move the key on every theme switch and
    // take every marker in the review with it.
    expect(diffFingerprint(FILE, DIFF_AGAIN)).toBe(diffFingerprint(FILE, DIFF))
  })

  it('moves when the diff moves under a file whose bytes did not change, which is what a commit does', () => {
    // The old side's whole problem. The working file is untouched, so the content says nothing
    // has happened — but "old line 5" now names a line of a different version of the file, and
    // a removed row stamped with that number would take the comment.
    expect(diffFingerprint(FILE, DIFF_MOVED)).not.toBe(diffFingerprint(FILE, DIFF))
  })

  it('tells a file with no diff at all from one whose diff was cleared', () => {
    // Absent is "there was nothing to diff" — an added file, a read that threw, a preview
    // outside a review. Present and empty is a file that HAD a diff and has just been
    // committed, which is precisely when its old-side comments must stop resolving.
    expect(diffFingerprint(FILE)).not.toBe(diffFingerprint(FILE, DIFF_CLEARED))
  })

  it('tells a moved addition from a moved deletion, rather than reading the two lists as one', () => {
    expect(diffFingerprint(FILE, { added: [2], removedBefore: [] }))
      .not.toBe(diffFingerprint(FILE, { added: [], removedBefore: [2] }))
  })

  it('still moves with the bytes when the diff stands still', () => {
    // Both halves are load-bearing: a line rewritten in place can leave the changed-line
    // positions exactly where they were, and only the content catches it.
    expect(diffFingerprint(FILE_REWRITTEN, DIFF)).not.toBe(diffFingerprint(FILE, DIFF))
  })

  it('carries no separator of its own, so it cannot spell a second key', () => {
    // The keys below join their parts with NUL. A fingerprint containing one would let two
    // different files agree on a key by moving the seam.
    expect(diffFingerprint(FILE)).not.toContain('\u0000')
    expect(diffFingerprint(FILE, DIFF)).not.toContain('\u0000')
  })
})

describe('commentFileKey', () => {
  it('files two versions of one file apart, which is the whole point of the fingerprint', () => {
    const before = commentFileKey(target())
    const after = commentFileKey(target({ fingerprint: diffFingerprint(FILE_REWRITTEN) }))
    expect(after).not.toBe(before)
  })

  it('is the collapsed-card key with the version added, not a key of its own', () => {
    // Collapse state is about the FILE and must not move when the agent edits it, so the
    // two keys share a stem rather than a definition. `reviewLayout` still owns that stem.
    expect(commentFileKey(target())).toBe(`${reviewFileKey('/repo', 'src/a.ts')}\u0000${diffFingerprint(FILE)}`)
  })

  it('keeps the same file in two repositories apart', () => {
    expect(commentFileKey(target({ repoPath: '/one' }))).not.toBe(commentFileKey(target({ repoPath: '/two' })))
  })

  it('cannot be spelled two ways by moving the separator', () => {
    expect(commentFileKey({ repoPath: 'a/b', path: 'c', fingerprint: 'f' }))
      .not.toBe(commentFileKey({ repoPath: 'a', path: 'b/c', fingerprint: 'f' }))
  })
})

describe('commentFileKeyPrefix', () => {
  it('matches every version of the file it names', () => {
    // What the store sweeps when a comment is written: the entries left behind by the
    // versions before it are unreachable, and this is how they are found.
    const prefix = commentFileKeyPrefix('/repo', 'src/a.ts')
    expect(commentFileKey(target()).startsWith(prefix)).toBe(true)
    expect(commentFileKey(target({ fingerprint: diffFingerprint(FILE_GROWN) })).startsWith(prefix)).toBe(true)
  })

  it('matches no other file, so pruning one cannot take another with it', () => {
    const prefix = commentFileKeyPrefix('/repo', 'src/a.ts')
    expect(commentFileKey(target({ path: 'src/ab.ts' })).startsWith(prefix)).toBe(false)
    expect(commentFileKey(target({ repoPath: '/other' })).startsWith(prefix)).toBe(false)
  })
})
