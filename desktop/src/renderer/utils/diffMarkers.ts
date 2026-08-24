/**
 * Where the preview should sit when a changed file opens.
 *
 * Deliberately free of DOM types: the caller measures the rendered `.line[data-diff]`
 * rows and the scroll container, this module decides what to do with those numbers.
 * That split is what makes the decision testable at all — the renderer suite runs on
 * node with no jsdom, so anything holding an Element could not be covered here.
 */

/** What a single marked row is: the two values `data-diff` can carry. */
export type MarkerKind = 'add' | 'remove'

/**
 * What a BLOCK is, once a run of rows has been folded into one.
 *
 * `'mixed'` is not an exotic third case — it is the ordinary shape of an edited line.
 * The diff renders a modification as the removed row immediately followed by the added
 * one, the two touch, and `groupMarkerBlocks` therefore hands back one block covering
 * both. A file of pure insertions is what produces an `'add'` block.
 */
export type BlockKind = MarkerKind | 'mixed'

/** One marked row, in pixels relative to the top of the scrollable content. */
export interface MarkerPosition {
  top: number
  height: number
  kind: MarkerKind
}

/** A run of marked rows the reader perceives as a single change. */
export interface MarkerBlock {
  top: number
  bottom: number
  /**
   * Optional on purpose. Everything that ANCHORS a scroll — `blockScrollTop`,
   * `selectScrollTop`, `currentBlockIndex`, `resolveBlockIndex` — works on geometry
   * alone and has no opinion about what changed, so requiring the field would make
   * those callers (and their fixtures) carry a value none of them reads. Only the
   * ruler paints it, and it treats a block that never declared one as `'mixed'`.
   */
  kind?: BlockKind
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
 *
 * The kind is folded along the way rather than recomputed afterwards: a block is what
 * its rows agreed on, or `'mixed'` the moment two of them disagree. Once mixed it
 * stays mixed — a third row cannot un-mix a block that already holds both.
 */
export function groupMarkerBlocks(markers: MarkerPosition[], gapTolerance = 1): MarkerBlock[] {
  const sorted = [...markers].sort((a, b) => a.top - b.top)
  const blocks: MarkerBlock[] = []

  for (const marker of sorted) {
    const bottom = marker.top + marker.height
    const current = blocks[blocks.length - 1]
    if (current && marker.top - current.bottom <= gapTolerance) {
      current.bottom = Math.max(current.bottom, bottom)
      if (current.kind !== marker.kind) current.kind = 'mixed'
    } else {
      blocks.push({ top: marker.top, bottom, kind: marker.kind })
    }
  }

  return blocks
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/**
 * How far this container can actually travel.
 *
 * The floor at 0 is not defensive: content shorter than its own viewport gives a
 * NEGATIVE difference, and clamping a scroll target to that would ask for a negative
 * scrollTop. Named once and shared, because `blockScrollTop`'s clamp and
 * `currentBlockIndex`'s end-of-travel guard are only consistent with each other for
 * as long as they agree on this number.
 */
function maxScrollTop(view: ScrollView): number {
  return Math.max(0, view.contentHeight - view.viewportHeight)
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

  return blockScrollTop(first, view)
}

/**
 * The scrollTop that brings a block into view: its top pushed down by `contextPx`,
 * clamped into the real range of travel.
 *
 * THE anchoring rule of this module — `selectScrollTop` ends by delegating here
 * rather than restating it, so the place the panel opens on and the place the
 * navigator's arrows land on cannot drift apart. What that function adds on top is
 * its "already visible → leave the scroll alone" short-circuit, and that one is
 * deliberately absent here: it is the right answer when the panel moves on its own
 * initiative and the wrong one for a reader who has just clicked "next", since
 * answering "no movement" for a block that happens to share the viewport with the
 * current one would make the button look broken on exactly the files where changes
 * cluster.
 */
export function blockScrollTop(block: MarkerBlock, view: ScrollView): number {
  return clamp(block.top - view.contextPx, 0, maxScrollTop(view))
}

/**
 * Which block the reader is on, from where the container currently sits — so the
 * counter follows a hand scroll, not just the arrows.
 *
 * The general rule is the last block whose top has passed the anchor line
 * (`currentScrollTop + contextPx`), which is self-consistent with `blockScrollTop`:
 * after scrolling to block `i` that anchor sits exactly on `blocks[i].top`, and
 * blocks are strictly increasing in `top`, so the answer comes back `i`.
 *
 * The two clamp guards above it exist because that consistency breaks wherever the
 * scroll cannot actually reach the anchor:
 *
 * - At scrollTop 0, a first block sitting closer to the top than `contextPx` had its
 *   target clamped to 0. The general rule would then find several blocks at or below
 *   the anchor and answer with the LAST of them — the counter would open on change 3
 *   of a file the panel just anchored on change 1.
 * - At the end of travel the mirror image: the last blocks are past the anchor the
 *   container can offer, so without the guard they could never become current and the
 *   counter would stick a few changes short of the end.
 *
 * The empty case has to be tested first, or `blocks.length - 1` would answer `-1`
 * too and "no blocks" would be indistinguishable from "the last one".
 */
export function currentBlockIndex(blocks: MarkerBlock[], view: ScrollView): number {
  if (blocks.length === 0) return -1
  if (view.currentScrollTop <= 0) return 0
  if (view.currentScrollTop >= maxScrollTop(view)) return blocks.length - 1

  // `groupMarkerBlocks` hands these back in increasing `top`, so the first block past
  // the anchor ends the search — nothing after it can qualify. `index` staying at its
  // initial 0 is itself an answer, and the right one: a reader who has scrolled a
  // little but not yet down to the first change is still on change 1.
  const anchor = view.currentScrollTop + view.contextPx
  let index = 0
  for (let i = 0; i < blocks.length; i++) {
    if (blocks[i].top > anchor) break
    index = i
  }
  return index
}

/**
 * Half a pixel, for comparing a scroll target against the scrollTop the container
 * reports back afterwards.
 *
 * Both numbers come out of `blockScrollTop`, so they would be identical if the DOM
 * round-tripped them untouched — it does not: a fractional target is stored snapped to
 * the engine's layout grid, and an exact `===` would then fail on precisely the
 * fractional row heights the rest of this module goes out of its way to carry through.
 * Nothing is at risk from the looseness: `groupMarkerBlocks` only ever emits blocks
 * separated by more than a row, so two DIFFERENT targets are never this close.
 */
const SCROLL_EPSILON = 0.5

/**
 * Which block to show as current now the container has moved, given the one that was
 * current before.
 *
 * `currentBlockIndex` reads the scroll position and nothing else, which is the right
 * answer for a hand scroll and the wrong one immediately after an arrow click:
 * wherever two blocks resolve to the SAME clamped `blockScrollTop`, the position no
 * longer tells them apart and a coarser positional guess would overrule the block the
 * reader just asked for. That is not hypothetical — it is what the two clamps produce:
 *
 * - At the end of travel every remaining block targets `maxScrollTop`, and the
 *   end-of-travel guard answers the LAST of them. Clicking "next" onto the third
 *   change of a file whose last three all clamp there would renumber the counter to
 *   the last one, and the blocks in between could never be shown as current at all.
 * - At the top, two blocks within `contextPx` of offset 0 both target scrollTop 0, so
 *   moving between them fires no scroll event whatsoever — nothing moves on screen,
 *   and the position corroborates neither block over the other.
 *
 * So: keep `previous` for as long as it still EXPLAINS where the container sits —
 * scrolling to it lands exactly here — and fall back to the positional reading the
 * moment it does not, which is any real hand scroll. An out-of-range `previous`
 * (including the -1 of an empty file) indexes to `undefined` and falls through, so the
 * caller owes no validation of its own.
 */
export function resolveBlockIndex(blocks: MarkerBlock[], view: ScrollView, previous: number): number {
  const kept = blocks[previous]
  if (kept && Math.abs(blockScrollTop(kept, view) - view.currentScrollTop) <= SCROLL_EPSILON) return previous
  return currentBlockIndex(blocks, view)
}

/* -------------------------------------------------------------------------- *
 * The marker ruler: the same blocks again, projected onto the thin band pinned
 * to the right edge of the preview.
 *
 * Everything below works in TRACK SPACE — pixels down the band — while
 * everything above works in CONTENT SPACE, pixels down the scrollable document.
 * The two are related by one number, `trackHeight / contentHeight`, and keeping
 * the conversion in one place is what stops a segment and the indicator that is
 * supposed to sit over it from being drawn to two different scales.
 * -------------------------------------------------------------------------- */

/**
 * The shortest a segment may be drawn.
 *
 * A one-line change in a thousand-line file projects to a fraction of a pixel, which
 * is both invisible and unclickable — the ruler would silently drop exactly the
 * changes that are hardest to find by scrolling. Four pixels is a hairline that still
 * has a hit area, and it is the reason a segment's height is NOT a faithful reading of
 * how much of the file changed: the ruler is a set of handles, not a proportion chart.
 */
export const MIN_SEGMENT_PX = 4

/**
 * The shortest the viewport indicator may be drawn, same argument as above: in a very
 * long file the visible window is a sliver of the whole, and an indicator too thin to
 * see tells the reader nothing about where they are.
 */
export const MIN_VIEWPORT_PX = 12

/** A span of the track: a segment, or the viewport indicator, in track pixels. */
export interface RulerGeometry {
  top: number
  height: number
}

/** One block, projected onto the track. */
export interface RulerSegment extends RulerGeometry {
  kind: BlockKind
  /** Which block this came from, so a click on it can be handed back as a block index. */
  index: number
}

/**
 * Content pixels → track pixels.
 *
 * Zero for empty content rather than an Infinity or a NaN: with nothing to scroll every
 * projection collapses to the top of the track at its minimum height, which is a
 * drawable answer, where a NaN would reach the DOM as an invalid `style.top`.
 */
function trackScale(view: ScrollView, trackHeight: number): number {
  return view.contentHeight > 0 ? trackHeight / view.contentHeight : 0
}

/**
 * One content-space span, placed on the track.
 *
 * THE conversion — the segments and the indicator both come through here, which is what
 * makes the promise in the banner above ("one place") true rather than aspirational.
 *
 * `minPx` is why this is not a bare multiplication, and it is also what makes the second
 * clamp non-obvious: `top` is bounded by `trackHeight - height`, not by `trackHeight`. A
 * span in the last rows of a long file projects to within a pixel of the bottom, and the
 * floor then pushes its lower edge past the end of the band. Pinning the top instead
 * keeps it whole and inside the track, at the cost of sitting a couple of pixels higher
 * than strictly proportional — invisible, where the alternative is a mark cropped by
 * overflow exactly where the reader is looking for the end of the file.
 */
function project(startPx: number, spanPx: number, minPx: number, view: ScrollView, trackHeight: number): RulerGeometry {
  const scale = trackScale(view, trackHeight)
  const height = clamp(spanPx * scale, minPx, Math.max(trackHeight, minPx))
  return { top: clamp(startPx * scale, 0, Math.max(trackHeight - height, 0)), height }
}

/**
 * Every block, placed on the track.
 *
 * `trackHeight` defaults to `view.viewportHeight`, which is what it always is in this
 * app: the band is `top-0 bottom-0` inside the `relative flex-1 min-h-0 flex flex-col`
 * wrapper whose only in-flow child is the `flex-1` scroller, so the two boxes are the
 * same height by construction. It stays a parameter regardless — the assumption is the
 * CALLER's layout, not this module's arithmetic, and a band that one day gains a margin
 * should change the drawing rather than quietly skew it.
 */
export function rulerSegments(blocks: MarkerBlock[], view: ScrollView, trackHeight = view.viewportHeight): RulerSegment[] {
  return blocks.map((block, index) => ({
    ...project(block.top, block.bottom - block.top, MIN_SEGMENT_PX, view, trackHeight),
    // A block measured before this module knew about kinds paints as `'mixed'`, the
    // colour that claims the least: "something changed here" is always true.
    kind: block.kind ?? 'mixed',
    index,
  }))
}

/** The visible window, placed on the track — same projection, same clamps. */
export function rulerViewport(view: ScrollView, trackHeight = view.viewportHeight): RulerGeometry {
  return project(view.currentScrollTop, view.viewportHeight, MIN_VIEWPORT_PX, view, trackHeight)
}

/**
 * Where to scroll for a click at `offsetPx` down the band.
 *
 * The click names a point in the FILE, and the reader gets it in the middle of the
 * screen rather than at the top — which is what makes this the exact inverse of
 * `rulerViewport` while the clamps are slack: click the centre of the indicator and
 * nothing moves. Anchoring at the top instead would jump the view by half a screen on
 * a click that meant "stay here".
 *
 * At either end the clamp wins and the round trip stops being exact, necessarily so:
 * the first half-screen of the file all maps to scrollTop 0 because there is nowhere
 * above it to go. Callers must not expect identity there.
 */
export function jumpScrollTop(offsetPx: number, trackHeight: number, view: ScrollView): number {
  // A zero-height track has no position to read; leaving the scroll alone beats
  // dividing by it.
  if (trackHeight <= 0) return view.currentScrollTop
  const contentY = (offsetPx / trackHeight) * view.contentHeight
  return clamp(contentY - view.viewportHeight / 2, 0, maxScrollTop(view))
}

/**
 * Which block a click at `offsetPx` landed on, or `null` for the track itself.
 *
 * This is the whole difference between the ruler's two behaviours — jump to THAT
 * change, or scroll to roughly there — so it is decided here on the drawn geometry
 * rather than by the DOM. Hit-testing the rendered elements would answer for the boxes
 * the browser happens to have, and the minimum-height floor means those boxes are not
 * where the blocks are.
 *
 * The bounds are inclusive at both ends, so no pixel of a drawn segment falls through
 * to the background. That makes a shared edge ambiguous, and the earlier block wins by
 * scan order; a segment overlapping its neighbour is only ever the floor stretching
 * two adjacent changes into each other, where either answer is a pixel from the other.
 */
export function segmentIndexAt(segments: RulerSegment[], offsetPx: number): number | null {
  for (const segment of segments) {
    if (offsetPx >= segment.top && offsetPx <= segment.top + segment.height) return segment.index
  }
  return null
}
