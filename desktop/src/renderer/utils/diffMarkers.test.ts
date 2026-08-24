import { describe, it, expect } from 'vitest'
import { blockScrollTop, currentBlockIndex, groupMarkerBlocks, resolveBlockIndex, selectScrollTop, type MarkerBlock, type MarkerPosition, type ScrollView } from './diffMarkers'

const LINE = 18

/** A marked row at `line` (0-based), in a gutter of uniform 18 px rows. */
function marker(line: number, height = LINE): MarkerPosition {
  return { top: line * LINE, height }
}

function view(overrides: Partial<ScrollView> = {}): ScrollView {
  return { viewportHeight: 400, contentHeight: 4000, currentScrollTop: 0, contextPx: 3 * LINE, ...overrides }
}

function block(fromLine: number, toLine: number): MarkerBlock {
  return { top: fromLine * LINE, bottom: (toLine + 1) * LINE }
}

/** A block at an arbitrary pixel offset, for the fractional heights a browser reports. */
function blockAt(top: number, height = LINE): MarkerBlock {
  return { top, bottom: top + height }
}

describe('groupMarkerBlocks', () => {
  it('turns a lone marked line into a block of its own height', () => {
    expect(groupMarkerBlocks([marker(10)])).toEqual([{ top: 180, bottom: 198 }])
  })

  it('merges a run of touching lines into the single change a reader sees', () => {
    expect(groupMarkerBlocks([marker(4), marker(5), marker(6)])).toEqual([block(4, 6)])
  })

  it('starts a new block once real unchanged code sits between two runs', () => {
    expect(groupMarkerBlocks([marker(4), marker(5), marker(40), marker(41)])).toEqual([block(4, 5), block(40, 41)])
  })

  it('groups by position rather than by the order the markers arrived in', () => {
    expect(groupMarkerBlocks([marker(41), marker(5), marker(40), marker(4)])).toEqual([block(4, 5), block(40, 41)])
  })

  it('absorbs a sub-pixel seam between rows that visually touch', () => {
    // Fractional row heights are what a browser actually reports; two rows half a
    // pixel apart are one block, not two.
    expect(groupMarkerBlocks([{ top: 100, height: 17.5 }, { top: 118, height: 17.5 }]))
      .toEqual([{ top: 100, bottom: 135.5 }])
  })

  it('returns nothing for a file with no marked line at all', () => {
    expect(groupMarkerBlocks([])).toEqual([])
  })
})

describe('selectScrollTop', () => {
  it('leaves the scroll alone when nothing is marked, which is what keeps the spec panel and every unmarked file at rest', () => {
    expect(selectScrollTop([], view())).toBeNull()
  })

  it('does not move when the first change is already inside the viewport', () => {
    expect(selectScrollTop([block(3, 4)], view())).toBeNull()
  })

  it('does not move for a file where every line is marked, since its first change is line one', () => {
    expect(selectScrollTop([block(0, 500)], view())).toBeNull()
  })

  it('still scrolls a change sitting in the last sliver of the viewport, rather than leaving it at the fold', () => {
    // Technically on screen, but with barely a row showing. "Visible" has to mean
    // readable, so the change has to clear the bottom by the same margin the scroll
    // would leave above it.
    const top = 400 - LINE
    expect(selectScrollTop([{ top, bottom: top + LINE }], view())).toBe(top - 3 * LINE)
  })

  it('brings a change below the fold into view with a few lines of context above it', () => {
    expect(selectScrollTop([block(100, 102)], view())).toBe(100 * LINE - 3 * LINE)
  })

  it('re-anchors upwards on a change the reader has scrolled past', () => {
    expect(selectScrollTop([block(10, 11)], view({ currentScrollTop: 2000 }))).toBe(10 * LINE - 3 * LINE)
  })

  it('stops at the top rather than asking for a negative scroll', () => {
    // A change one line into the file has less context above it than requested.
    expect(selectScrollTop([block(1, 1)], view({ currentScrollTop: 2000 }))).toBe(0)
  })

  it('stops at the last scrollable pixel for a change near the end of the file', () => {
    expect(selectScrollTop([block(200, 201)], view({ contentHeight: 3700 }))).toBe(3700 - 400)
  })

  it('never asks for a scroll in content shorter than its own viewport', () => {
    expect(selectScrollTop([block(30, 30)], view({ contentHeight: 300, currentScrollTop: 0, viewportHeight: 400 })))
      .toBe(0)
  })
})

describe('blockScrollTop', () => {
  it('puts the asked-for block below the same few lines of context the panel opens with', () => {
    expect(blockScrollTop(block(100, 102), view())).toBe(100 * LINE - 3 * LINE)
  })

  it('moves even for a block already on screen, because a click is a request to move', () => {
    // The one difference with selectScrollTop, which answers null for this very block.
    expect(selectScrollTop([block(5, 6)], view())).toBeNull()
    expect(blockScrollTop(block(5, 6), view())).toBe(5 * LINE - 3 * LINE)
  })

  it('stops at the top rather than asking for a negative scroll', () => {
    expect(blockScrollTop(block(1, 1), view({ currentScrollTop: 2000 }))).toBe(0)
  })

  it('stops at the last scrollable pixel for a block near the end of the file', () => {
    expect(blockScrollTop(block(200, 201), view({ contentHeight: 3700 }))).toBe(3700 - 400)
  })

  it('never asks for a scroll in content shorter than its own viewport', () => {
    expect(blockScrollTop(block(30, 30), view({ contentHeight: 300, viewportHeight: 400 }))).toBe(0)
  })

  it('carries fractional row heights through instead of rounding them away', () => {
    expect(blockScrollTop(blockAt(100.5, 17.5), view())).toBe(46.5)
  })
})

describe('currentBlockIndex', () => {
  it('has no answer for a file with nothing marked in it', () => {
    expect(currentBlockIndex([], view())).toBe(-1)
  })

  it('stays on the only block of a single-block file wherever the reader scrolls', () => {
    expect(currentBlockIndex([block(100, 101)], view({ currentScrollTop: 2000 }))).toBe(0)
  })

  it('reports the first block at the top of the file, even when later ones sit within the context margin', () => {
    // A first change less than contextPx from the top had its target clamped to 0, so
    // several blocks are at or below the anchor there and the general rule would pick
    // the last of them — the counter would open on change 2 of a file anchored on 1.
    expect(currentBlockIndex([block(1, 1), block(2, 3)], view())).toBe(0)
  })

  it('reports the last block once the scroll has run out of travel', () => {
    // Those final blocks sit past the deepest anchor the container can offer, so
    // without this they could never become current and the counter would stick short.
    const blocks = [block(10, 11), block(200, 201), block(203, 204)]
    expect(currentBlockIndex(blocks, view({ contentHeight: 3700, currentScrollTop: 3300 }))).toBe(2)
  })

  it('stays on the first block in content shorter than its own viewport, where nothing scrolls at all', () => {
    expect(currentBlockIndex([block(1, 1), block(5, 5)], view({ contentHeight: 300, viewportHeight: 400 }))).toBe(0)
  })

  it('holds on the first block while the reader is still above the first change', () => {
    expect(currentBlockIndex([block(40, 41), block(100, 101)], view({ currentScrollTop: 100 }))).toBe(0)
  })

  it('follows a hand scroll onto the block the reader has just brought up', () => {
    expect(currentBlockIndex([block(4, 5), block(40, 41), block(100, 102)], view({ currentScrollTop: 700 }))).toBe(1)
  })

  // The round trip the two functions have to agree on: scroll where `blockScrollTop`
  // says, and `currentBlockIndex` must name that block back. Every index of the same
  // file, because this fixture keeps all three off the clamps — they all run the
  // general rule, so what is under test is the scan itself reaching the first block,
  // the last one, and a middle one, rather than three different branches.
  it.each([0, 1, 2])('names block %i back after a scroll to it', index => {
    const blocks = [block(4, 5), block(40, 41), block(100, 102)]
    const top = blockScrollTop(blocks[index], view())
    expect(currentBlockIndex(blocks, view({ currentScrollTop: top }))).toBe(index)
  })

  it('round-trips on fractional positions, where an off-by-half-a-pixel would name the previous block', () => {
    const blocks = [blockAt(100.5, 17.5), blockAt(500.25, 17.5)]
    const top = blockScrollTop(blocks[1], view())
    expect(top).toBe(446.25)
    expect(currentBlockIndex(blocks, view({ currentScrollTop: top }))).toBe(1)
  })
})

describe('resolveBlockIndex', () => {
  it('keeps the block that was current when scrolling to it lands exactly where the container already sits', () => {
    const blocks = [block(4, 5), block(40, 41), block(100, 102)]
    expect(resolveBlockIndex(blocks, view({ currentScrollTop: 666 }), 1)).toBe(1)
  })

  it('drops it for the block under the reader once they have scrolled somewhere else entirely', () => {
    const blocks = [block(4, 5), block(40, 41), block(100, 102)]
    expect(resolveBlockIndex(blocks, view({ currentScrollTop: 666 }), 0)).toBe(1)
  })

  it('keeps the block just clicked at the end of travel, where the final changes all share one scroll target', () => {
    // The bug this exists for: those last two both clamp to 3300, so the positional
    // reading answers 2 for either of them and clicking onto change 2 would renumber
    // the counter to 3 on its own.
    const blocks = [block(10, 11), block(200, 201), block(203, 204)]
    const atEnd = view({ contentHeight: 3700, currentScrollTop: 3300 })
    expect(currentBlockIndex(blocks, atEnd)).toBe(2)
    expect(resolveBlockIndex(blocks, atEnd, 1)).toBe(1)
  })

  it('still moves off a block the end of travel has left behind, when that block is nowhere near it', () => {
    const blocks = [block(10, 11), block(200, 201), block(203, 204)]
    expect(resolveBlockIndex(blocks, view({ contentHeight: 3700, currentScrollTop: 3300 }), 0)).toBe(2)
  })

  it('keeps the block just clicked at the top of the file, where a second change also targets scrollTop 0', () => {
    // Both are within contextPx of the top, so the scroll from 0 to 0 fires no event
    // at all and nothing but this can tell the two apart.
    const blocks = [block(1, 1), block(2, 3)]
    expect(currentBlockIndex(blocks, view())).toBe(0)
    expect(resolveBlockIndex(blocks, view(), 1)).toBe(1)
  })

  it('falls back to the scroll position when the remembered index is past the end of the blocks', () => {
    const blocks = [block(4, 5), block(40, 41), block(100, 102)]
    expect(resolveBlockIndex(blocks, view({ currentScrollTop: 666 }), 5)).toBe(1)
  })

  it('falls back to the scroll position for the -1 of a file that had nothing marked in it', () => {
    const blocks = [block(4, 5), block(40, 41), block(100, 102)]
    expect(resolveBlockIndex(blocks, view({ currentScrollTop: 666 }), -1)).toBe(1)
  })

  it('has no answer for a file with nothing marked in it, whatever index came before', () => {
    expect(resolveBlockIndex([], view(), 0)).toBe(-1)
  })

  it('treats a scrollTop the engine snapped a fraction of a pixel off the target as the same place', () => {
    // A fractional target does not survive the DOM round trip untouched, and an exact
    // comparison would then discard the block on precisely the fractional row heights
    // this module carries through everywhere else.
    const blocks = [blockAt(100.5, 17.5), blockAt(500.25, 17.5)]
    expect(blockScrollTop(blocks[1], view())).toBe(446.25)
    expect(resolveBlockIndex(blocks, view({ currentScrollTop: 446.2 }), 1)).toBe(1)
  })
})
