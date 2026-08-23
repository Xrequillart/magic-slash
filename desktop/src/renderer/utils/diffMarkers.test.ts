import { describe, it, expect } from 'vitest'
import { groupMarkerBlocks, selectScrollTop, type MarkerBlock, type MarkerPosition, type ScrollView } from './diffMarkers'

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
