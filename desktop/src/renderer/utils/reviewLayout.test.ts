import { describe, it, expect } from 'vitest'
import {
  anchorScrollTop, buildReviewLayout, mergeRulerSegments,
  reservedCardHeight, reviewFileKey, sumChangedFiles,
  type FileMarkers,
} from './reviewLayout'
import { rulerSegments, segmentIndexAt, type MarkerKind, type MarkerPosition, type RulerSegment, type ScrollView } from './diffMarkers'
import type { ChangedFile } from '../../types'

const LINE = 18

/** A marked row at `line` (0-based) of a uniform 18 px gutter, offset by the card it sits in. */
function marker(line: number, kind: MarkerKind = 'add', cardTop = 0): MarkerPosition {
  return { top: cardTop + line * LINE, height: LINE, kind }
}

function file(fileIndex: number, markers: MarkerPosition[]): FileMarkers {
  return { fileIndex, markers }
}

function changed(overrides: Partial<ChangedFile> = {}): ChangedFile {
  return { path: 'src/a.ts', additions: 0, deletions: 0, status: 'modified', ...overrides }
}

function view(overrides: Partial<ScrollView> = {}): ScrollView {
  return { viewportHeight: 400, contentHeight: 4000, currentScrollTop: 0, contextPx: 3 * LINE, ...overrides }
}

function segment(top: number, height: number, index: number, kind: RulerSegment['kind'] = 'add'): RulerSegment {
  return { top, height, index, kind }
}

describe('reviewFileKey', () => {
  it('names a file by its repository and its path', () => {
    expect(reviewFileKey('/repo', 'src/a.ts')).toBe('/repo\u0000src/a.ts')
  })

  it('keeps the same path in two repositories apart', () => {
    expect(reviewFileKey('/one', 'src/a.ts')).not.toBe(reviewFileKey('/two', 'src/a.ts'))
  })

  it('cannot be spelled two ways by moving the separator', () => {
    // The whole reason the separator is NUL and not a slash or a space: a path can
    // contain either of those, and a key that collides silently un-collapses a card
    // the reader collapsed on a different file.
    expect(reviewFileKey('a/b', 'c')).not.toBe(reviewFileKey('a', 'b/c'))
  })
})

describe('buildReviewLayout', () => {
  it('flattens every file into one list the navigator can walk', () => {
    // Two files, two changes each — four steps, with the boundary between file 0 and
    // file 1 being nothing the walk can tell from any other step. That is AC3.
    const layout = buildReviewLayout([
      file(0, [marker(0), marker(10)]),
      file(1, [marker(0, 'add', 1000), marker(10, 'add', 1000)]),
    ])
    expect(layout.blocks).toHaveLength(4)
    expect(layout.blocks.map(b => b.top)).toEqual([0, 180, 1000, 1180])
  })

  it('groups WITHIN a file, so two files never fold into one change', () => {
    // The last row of file 0 ends exactly where the first row of file 1 starts. Rows
    // that close would merge inside one document; across cards they are two changes.
    const layout = buildReviewLayout([
      file(0, [marker(0)]),
      file(1, [{ top: LINE, height: LINE, kind: 'add' }]),
    ])
    expect(layout.blocks).toHaveLength(2)
    expect(layout.blocks.map(b => b.top)).toEqual([0, LINE])
  })

  it('still groups a run of adjacent rows inside one file', () => {
    const layout = buildReviewLayout([file(0, [marker(0), marker(1), marker(2)])])
    expect(layout.blocks).toEqual([{ top: 0, bottom: 3 * LINE, kind: 'add' }])
  })

  it('folds a removed row and the added row under it into one mixed block', () => {
    const layout = buildReviewLayout([file(0, [marker(4, 'remove'), marker(5, 'add')])])
    expect(layout.blocks).toHaveLength(1)
    expect(layout.blocks[0].kind).toBe('mixed')
  })

  it('counts ROWS across the whole repository', () => {
    const layout = buildReviewLayout([
      file(0, [marker(0), marker(1), marker(2, 'remove')]),
      file(1, [marker(0, 'remove', 900)]),
    ])
    expect(layout.counts).toEqual({ added: 2, removed: 2 })
  })

  it('orders blocks by position even when the cards arrive out of order', () => {
    // The sort is what everything downstream assumes: `currentBlockIndex` breaks its
    // scan on the first block past the anchor, so one block out of order would make
    // every block after it unreachable from a hand scroll.
    const layout = buildReviewLayout([
      file(2, [marker(0, 'add', 2000)]),
      file(0, [marker(0)]),
      file(1, [marker(0, 'add', 1000)]),
    ])
    expect(layout.blocks.map(b => b.top)).toEqual([0, 1000, 2000])
  })

  it('is empty for a repository whose cards are all collapsed', () => {
    const layout = buildReviewLayout([file(0, []), file(1, [])])
    expect(layout.blocks).toEqual([])
    expect(layout.counts).toEqual({ added: 0, removed: 0 })
  })

  it('reads a one-file repository as an ordinary review', () => {
    // AC5: one card is not a special case, it is a review whose list has one entry.
    const layout = buildReviewLayout([file(0, [marker(0), marker(10)])])
    expect(layout.blocks).toHaveLength(2)
    expect(layout.blocks.map(b => b.top)).toEqual([0, 180])
  })
})

describe('sumChangedFiles', () => {
  it('totals the repository, not the file', () => {
    expect(sumChangedFiles([
      changed({ additions: 10, deletions: 2 }),
      changed({ path: 'src/b.ts', additions: 5, deletions: 7 }),
    ])).toEqual({ added: 15, removed: 9 })
  })

  it('is zero for a repository of untracked files, which carry no figures', () => {
    expect(sumChangedFiles([changed({ status: 'untracked' })])).toEqual({ added: 0, removed: 0 })
  })

  it('is zero for an empty list rather than undefined', () => {
    expect(sumChangedFiles([])).toEqual({ added: 0, removed: 0 })
  })
})

describe('reservedCardHeight', () => {
  it('holds open the changed rows plus the context around them', () => {
    // 20 changed rows + 3 lines of context on each side.
    expect(reservedCardHeight(changed({ additions: 12, deletions: 8 }), LINE)).toBe(26 * LINE)
  })

  it('never reserves less than a card-sized sliver, even for an untracked 0/0 file', () => {
    expect(reservedCardHeight(changed({ status: 'untracked' }), LINE)).toBe(6 * LINE)
  })

  it('caps a huge diff rather than reserving a scrollbar of blank space', () => {
    expect(reservedCardHeight(changed({ additions: 5000, deletions: 5000 }), LINE)).toBe(400 * LINE)
  })

  it('scales with the row height it is given', () => {
    expect(reservedCardHeight(changed({ additions: 4 }), 30)).toBe(10 * 30)
  })
})

describe('anchorScrollTop', () => {
  it('puts the clicked card at the top of the view', () => {
    expect(anchorScrollTop(1200, view())).toBe(1200)
  })

  it('leaves a sliver of the card above when asked for a margin', () => {
    expect(anchorScrollTop(1200, view(), 12)).toBe(1188)
  })

  it('does not scroll above the top for the first card', () => {
    expect(anchorScrollTop(0, view(), 12)).toBe(0)
  })

  it('clamps to the end of travel for the last card', () => {
    // 4000 of content in a 400 window travels 3600, so a card at 3900 cannot be
    // brought to the top and the view stops where it can.
    expect(anchorScrollTop(3900, view())).toBe(3600)
  })

  it('answers 0 when the content does not overflow its own view', () => {
    expect(anchorScrollTop(200, view({ contentHeight: 300 }))).toBe(0)
  })
})

describe('mergeRulerSegments', () => {
  it('leaves marks that are clearly apart alone', () => {
    const merged = mergeRulerSegments([segment(0, 4, 0), segment(40, 4, 1)])
    expect(merged).toEqual([segment(0, 4, 0), segment(40, 4, 1)])
  })

  it('joins two marks drawn into each other, keeping the FIRST block index', () => {
    // The index is what `segmentIndexAt` hands to `goToBlock`, so it has to name the
    // topmost change under the mark — the reader must never have to scroll back.
    const merged = mergeRulerSegments([segment(10, 6, 3), segment(12, 6, 4)])
    expect(merged).toEqual([segment(10, 8, 3)])
  })

  it('joins marks that merely touch — a one-pixel seam is not a target', () => {
    expect(mergeRulerSegments([segment(0, 4, 0), segment(5, 4, 1)])).toEqual([segment(0, 9, 0)])
  })

  it('folds disagreeing kinds to mixed', () => {
    const merged = mergeRulerSegments([segment(0, 4, 0, 'add'), segment(2, 4, 1, 'remove')])
    expect(merged).toEqual([segment(0, 6, 0, 'mixed')])
  })

  it('keeps a kind both marks agreed on', () => {
    expect(mergeRulerSegments([segment(0, 4, 0, 'remove'), segment(2, 4, 1, 'remove')])[0].kind).toBe('remove')
  })

  it('chains a run of overlapping marks up to the bound, then starts a new one', () => {
    // The first three fold into a 10 px mark. The fourth would take it to 13, past
    // MAX_MERGED_SEGMENT_PX, so it opens a run of its own — which is what keeps a
    // saturated band a row of handles instead of one bar carrying block 0.
    const merged = mergeRulerSegments([segment(0, 4, 0), segment(3, 4, 1), segment(6, 4, 2), segment(9, 4, 3)])
    expect(merged).toEqual([segment(0, 10, 0), segment(9, 4, 3)])
  })

  it('does not swallow a mark that starts after the run it would have joined', () => {
    const merged = mergeRulerSegments([segment(0, 4, 0), segment(3, 4, 1), segment(60, 4, 2)])
    expect(merged).toEqual([segment(0, 7, 0), segment(60, 4, 2)])
  })

  it('does not mutate the segments it was handed', () => {
    const original = [segment(0, 4, 0), segment(2, 4, 1)]
    mergeRulerSegments(original)
    expect(original).toEqual([segment(0, 4, 0), segment(2, 4, 1)])
  })

  it('sorts before merging, so an unordered list still collapses', () => {
    expect(mergeRulerSegments([segment(2, 4, 1), segment(0, 4, 0)])).toEqual([segment(0, 6, 0)])
  })

  it('is empty for an empty ruler', () => {
    expect(mergeRulerSegments([])).toEqual([])
  })

  it('stops a run rather than chaining a saturated band into one mark', () => {
    // The case this exists for, and the failure mode the bound prevents. Two hundred
    // one-line changes down a long review project to a fraction of a pixel each, are
    // floored to MIN_SEGMENT_PX, and would paint 800 px of marks onto a 400 px band.
    // Merged without a bound they become ONE full-height segment carrying block 0 —
    // every click on the ruler would then go to the first change in the repository.
    const markers = Array.from({ length: 200 }, (_, i) => marker(0, 'add', i * 400))
    const layout = buildReviewLayout([file(0, markers)])
    const scroll = view({ contentHeight: 80_000, viewportHeight: 400 })
    const merged = mergeRulerSegments(rulerSegments(layout.blocks, scroll, 400))

    // Far fewer nodes than blocks, and nothing like a single bar.
    expect(merged.length).toBeGreaterThan(10)
    expect(merged.length).toBeLessThan(60)
    for (const [i, mark] of merged.entries()) {
      expect(mark.height).toBeLessThanOrEqual(12)
      if (i > 0) expect(mark.top).toBeGreaterThan(merged[i - 1].top)
    }
    // Resolution survives: a click a third of the way down does not land on block 0.
    const hit = segmentIndexAt(merged, 140)
    expect(hit).not.toBeNull()
    expect(hit).toBeGreaterThan(0)
  })

  it('leaves the marks of a sparse review exactly as the ruler drew them', () => {
    // AC5 from the ruler's side: merging must not touch a review whose marks are
    // already apart, which is every one-file repository.
    const layout = buildReviewLayout([file(0, [marker(0), marker(40), marker(80)])])
    const scroll = view({ contentHeight: 3200, viewportHeight: 400 })
    const drawn = rulerSegments(layout.blocks, scroll, 400)
    expect(mergeRulerSegments(drawn)).toEqual(drawn)
  })
})
