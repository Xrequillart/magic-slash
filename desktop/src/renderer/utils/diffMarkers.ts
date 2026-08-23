/**
 * Where the preview should sit when a changed file opens.
 *
 * Deliberately free of DOM types: the caller measures the rendered `.line[data-diff]`
 * rows and the scroll container, this module decides what to do with those numbers.
 * That split is what makes the decision testable at all — the renderer suite runs on
 * node with no jsdom, so anything holding an Element could not be covered here.
 */

/** One marked row, in pixels relative to the top of the scrollable content. */
export interface MarkerPosition {
  top: number
  height: number
}

/** A run of marked rows the reader perceives as a single change. */
export interface MarkerBlock {
  top: number
  bottom: number
}

export interface ScrollView {
  viewportHeight: number
  contentHeight: number
  currentScrollTop: number
  /** How much unchanged code to keep above the first change, in pixels. */
  contextPx: number
}

/**
 * Merge adjacent marked rows into blocks.
 *
 * Consecutive changed lines are one change to the reader, not five, and only the
 * first block's position is ever used — but grouping still has to happen, because
 * "the first marker" and "the top of the first block" only coincide once the input
 * is sorted and the run is collapsed. `gapTolerance` absorbs the sub-pixel seam
 * between two rows that visually touch; anything larger is a real stretch of
 * unchanged code and starts a new block.
 */
export function groupMarkerBlocks(markers: MarkerPosition[], gapTolerance = 1): MarkerBlock[] {
  const sorted = [...markers].sort((a, b) => a.top - b.top)
  const blocks: MarkerBlock[] = []

  for (const marker of sorted) {
    const bottom = marker.top + marker.height
    const current = blocks[blocks.length - 1]
    if (current && marker.top - current.bottom <= gapTolerance) {
      current.bottom = Math.max(current.bottom, bottom)
    } else {
      blocks.push({ top: marker.top, bottom })
    }
  }

  return blocks
}

/**
 * The scrollTop that brings the first change into view, or `null` for "leave the
 * scroll alone".
 *
 * `null` is a real answer rather than a failure, and it covers three cases that all
 * want the same thing — no movement:
 *
 * - No marked row at all. An unmarked file, and the live spec panel, which renders
 *   the same component with an empty status and therefore produces no marker: this
 *   function must never fight that panel's own follow-the-bottom scrolling.
 * - The first change is already on screen, with room to read it. "On screen" is not
 *   enough on its own: a change whose first row starts a few pixels above the fold is
 *   technically visible while showing the reader a sliver, so it has to clear the
 *   bottom by `contextPx` — the same margin the scroll would otherwise leave above
 *   it — before doing nothing counts as the right answer.
 * - Every line is marked (an added, untracked or deleted file), which lands on the
 *   case above by construction: the first marker sits at the top of the content, so
 *   it is already visible and the file opens at the top exactly as it always has.
 */
export function selectScrollTop(blocks: MarkerBlock[], view: ScrollView): number | null {
  const first = blocks[0]
  if (!first) return null

  const viewportBottom = view.currentScrollTop + view.viewportHeight
  if (first.top >= view.currentScrollTop && first.top + view.contextPx <= viewportBottom) return null

  const maxScrollTop = Math.max(0, view.contentHeight - view.viewportHeight)
  return Math.min(Math.max(first.top - view.contextPx, 0), maxScrollTop)
}
