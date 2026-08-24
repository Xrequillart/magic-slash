import { describe, it, expect } from 'vitest'
import {
  blockScrollTop, currentBlockIndex, groupMarkerBlocks, jumpScrollTop, resolveBlockIndex,
  rulerSegments, rulerViewport, segmentIndexAt, selectScrollTop,
  MIN_SEGMENT_PX, MIN_VIEWPORT_PX,
  type BlockKind, type MarkerBlock, type MarkerKind, type MarkerPosition, type RulerSegment, type ScrollView,
} from './diffMarkers'

const LINE = 18

/** A marked row at `line` (0-based), in a gutter of uniform 18 px rows. */
function marker(line: number, kind: MarkerKind = 'add', height = LINE): MarkerPosition {
  return { top: line * LINE, height, kind }
}

function view(overrides: Partial<ScrollView> = {}): ScrollView {
  return { viewportHeight: 400, contentHeight: 4000, currentScrollTop: 0, contextPx: 3 * LINE, ...overrides }
}

function block(fromLine: number, toLine: number, kind: BlockKind = 'add'): MarkerBlock {
  return { top: fromLine * LINE, bottom: (toLine + 1) * LINE, kind }
}

/** A block at an arbitrary pixel offset, for the fractional heights a browser reports. */
function blockAt(top: number, height = LINE): MarkerBlock {
  return { top, bottom: top + height, kind: 'add' }
}

/**
 * How tall the ruler is on screen, and the number the projections below are read
 * against. Equal to the fixture's `viewportHeight`, as it is in the app.
 */
const RULER_TRACK = 400

/**
 * The scroll fixture the ruler tests use: 3200 px of content in the same 400 px window.
 *
 * A different `contentHeight` from `view()` for one reason — it makes the track scale
 * exactly one eighth, so every projection below is a round number that can be asserted
 * with `toBe`. At the 4000 px of the default fixture the same arithmetic lands on
 * binary fractions, and the tests would be reading float noise instead of geometry.
 */
function rulerView(overrides: Partial<ScrollView> = {}): ScrollView {
  return view({ contentHeight: 3200, ...overrides })
}

function segment(top: number, height: number, index: number): RulerSegment {
  return { top, height, kind: 'add', index }
}

describe('groupMarkerBlocks', () => {
  it('turns a lone marked line into a block of its own height', () => {
    expect(groupMarkerBlocks([marker(10)])).toEqual([{ top: 180, bottom: 198, kind: 'add' }])
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
    expect(groupMarkerBlocks([{ top: 100, height: 17.5, kind: 'add' }, { top: 118, height: 17.5, kind: 'add' }]))
      .toEqual([{ top: 100, bottom: 135.5, kind: 'add' }])
  })

  it('returns nothing for a file with no marked line at all', () => {
    expect(groupMarkerBlocks([])).toEqual([])
  })

  it('folds a removed row and the added row replacing it into one mixed block, which is what an edited line is', () => {
    // Not an edge case: this is the ordinary shape of a modification in the diff, so
    // `mixed` is the kind the ruler paints most often.
    expect(groupMarkerBlocks([marker(4, 'remove'), marker(5, 'add')]))
      .toEqual([{ top: 72, bottom: 108, kind: 'mixed' }])
  })

  it('keeps the kind of a run whose rows all say the same thing, so a pure insertion still reads as one', () => {
    expect(groupMarkerBlocks([marker(4, 'add'), marker(5, 'add'), marker(6, 'add')])).toEqual([block(4, 6)])
  })

  it('stays mixed once mixed, rather than being talked back out of it by the rows that follow', () => {
    expect(groupMarkerBlocks([marker(4, 'remove'), marker(5, 'add'), marker(6, 'add')]))
      .toEqual([{ top: 72, bottom: 126, kind: 'mixed' }])
  })

  it('gives two separated runs the kind each of them actually has, rather than one answer for the file', () => {
    expect(groupMarkerBlocks([marker(4, 'remove'), marker(40, 'add')]))
      .toEqual([block(4, 4, 'remove'), block(40, 40, 'add')])
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

describe('rulerSegments', () => {
  it('places each block the same fraction down the band as it sits down the file', () => {
    // 3200 px of content in a 400 px track: every projection is a division by eight.
    expect(rulerSegments([block(0, 2), block(100, 102)], rulerView())).toEqual([
      { top: 0, height: 6.75, kind: 'add', index: 0 },
      { top: 225, height: 6.75, kind: 'add', index: 1 },
    ])
  })

  it('keeps a one-line change tall enough to be clicked, rather than collapsing it to a hairline', () => {
    // A single 18 px row in a 32 000 px file projects to a fifth of a pixel, which is
    // both invisible and impossible to hit — and a one-line change is exactly the kind
    // the reader cannot find by scrolling, so it is the one the ruler must not lose.
    expect(rulerSegments([block(500, 500)], rulerView({ contentHeight: 32000 }))[0].height).toBe(MIN_SEGMENT_PX)
  })

  it('keeps the last change of a long file whole and inside the band instead of cropping it at the bottom', () => {
    // Its proportional top is within a pixel of the end, so the minimum height would
    // otherwise push the segment's lower edge past the track.
    const [last] = rulerSegments([blockAt(31_990, 10)], rulerView({ contentHeight: 32000 }))
    expect(last.top + last.height).toBe(RULER_TRACK)
  })

  it('carries each block kind through, so an addition and a removal can be drawn apart', () => {
    const blocks = [block(0, 0, 'add'), block(40, 40, 'remove'), block(100, 100, 'mixed')]
    expect(rulerSegments(blocks, rulerView()).map(s => s.kind)).toEqual(['add', 'remove', 'mixed'])
  })

  it('paints a block that never declared a kind as mixed, the colour that claims the least', () => {
    // The scroll-anchoring callers build blocks without one; "something changed here"
    // is still true of every block, so that is what an unstated kind draws as.
    expect(rulerSegments([{ top: 0, bottom: 18 }], rulerView())[0].kind).toBe('mixed')
  })

  it('numbers each segment with the block it came from, which is what a click on it hands back', () => {
    expect(rulerSegments([block(0, 0), block(40, 40), block(100, 100)], rulerView()).map(s => s.index))
      .toEqual([0, 1, 2])
  })

  it('draws nothing at all for a file with no changed block in it', () => {
    expect(rulerSegments([], rulerView())).toEqual([])
  })

  it('takes the track height from the caller rather than assuming the viewport, for a band that is not full height', () => {
    // The two are equal in this app's layout, and that is the caller's business — the
    // arithmetic must not bake it in.
    expect(rulerSegments([block(100, 102)], rulerView(), 800)[0].top).toBe(450)
  })

  it('collapses to a drawable segment for content that has not been laid out yet, rather than a NaN', () => {
    const [only] = rulerSegments([block(0, 0)], rulerView({ contentHeight: 0 }))
    expect(only).toEqual({ top: 0, height: MIN_SEGMENT_PX, kind: 'add', index: 0 })
  })
})

describe('rulerViewport', () => {
  it('sits at the top of the band for a file the reader has not scrolled yet', () => {
    expect(rulerViewport(rulerView())).toEqual({ top: 0, height: 50 })
  })

  it('follows the scroll down the band, at the same fraction as the window has travelled', () => {
    expect(rulerViewport(rulerView({ currentScrollTop: 1400 }))).toEqual({ top: 175, height: 50 })
  })

  it('finishes flush with the bottom of the band at the end of travel, so the ruler reads as complete', () => {
    // 2800 is the last scrollable pixel here. Landing short of the bottom would say the
    // reader still has file left when they are looking at its final line.
    const indicator = rulerViewport(rulerView({ currentScrollTop: 2800 }))
    expect(indicator.top + indicator.height).toBe(RULER_TRACK)
  })

  it('stays visible in a very long file, where the window is a sliver of the whole', () => {
    expect(rulerViewport(rulerView({ contentHeight: 40000 })).height).toBe(MIN_VIEWPORT_PX)
  })

  it('covers the whole band for content shorter than its own window, where nothing scrolls', () => {
    expect(rulerViewport(rulerView({ contentHeight: 300 }))).toEqual({ top: 0, height: RULER_TRACK })
  })
})

describe('jumpScrollTop', () => {
  it('leaves the reader exactly where they were when they click the middle of the indicator', () => {
    // The round trip that makes the two halves of the ruler one control: the indicator
    // is drawn where this function would send a click on its own centre.
    const scrolled = rulerView({ currentScrollTop: 1400 })
    const indicator = rulerViewport(scrolled)
    expect(jumpScrollTop(indicator.top + indicator.height / 2, RULER_TRACK, scrolled)).toBe(1400)
  })

  it('centres the clicked position in the window rather than putting it at the top edge', () => {
    // Three quarters down the band names content pixel 2400, and the reader gets it
    // mid-screen — anchoring at the top would jump half a window on a click that meant
    // "stay about here".
    expect(jumpScrollTop(300, RULER_TRACK, rulerView())).toBe(2400 - 200)
  })

  it('stops at the top of the file for a click in the first half-screen, rather than asking for a negative scroll', () => {
    // Deliberately not asserted as an identity: everything above half a window maps to
    // scrollTop 0, because there is nowhere further up to go.
    expect(jumpScrollTop(0, RULER_TRACK, rulerView())).toBe(0)
  })

  it('stops at the last scrollable pixel for a click at the very bottom of the band', () => {
    expect(jumpScrollTop(RULER_TRACK, RULER_TRACK, rulerView())).toBe(3200 - 400)
  })

  it('asks for no scroll at all in content shorter than its own window', () => {
    expect(jumpScrollTop(200, RULER_TRACK, rulerView({ contentHeight: 300 }))).toBe(0)
  })

  it('leaves the scroll where it is for a band that has no height to read a position from', () => {
    expect(jumpScrollTop(0, 0, rulerView({ currentScrollTop: 1400 }))).toBe(1400)
  })
})

describe('segmentIndexAt', () => {
  it('names the block under a click that landed on its segment', () => {
    expect(segmentIndexAt([segment(0, 4, 0), segment(200, 4, 1)], 201)).toBe(1)
  })

  it('answers nothing for a click on bare track between two changes, which is what makes it a proportional jump', () => {
    expect(segmentIndexAt([segment(0, 4, 0), segment(200, 4, 1)], 100)).toBeNull()
  })

  it('counts the last pixel of a segment as a hit, so no part of a four-pixel target falls through', () => {
    expect(segmentIndexAt([segment(200, 4, 1)], 204)).toBe(1)
  })

  it('answers nothing for a click just past a segment, rather than claiming the nearest one', () => {
    expect(segmentIndexAt([segment(200, 4, 1)], 205)).toBeNull()
  })

  it('answers nothing for a band with no segments drawn on it at all', () => {
    expect(segmentIndexAt([], 50)).toBeNull()
  })

  it('gives the earlier change to a click on the seam where the minimum height stretched two into each other', () => {
    // Adjacent one-line changes in a long file both floor to four pixels and end up
    // overlapping; either answer is a pixel from the other, and scan order decides.
    expect(segmentIndexAt([segment(100, 4, 3), segment(102, 4, 4)], 103)).toBe(3)
  })
})
