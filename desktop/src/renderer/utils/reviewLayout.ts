/**
 * The arithmetic of a REPOSITORY review: every changed file stacked in one scroll.
 *
 * `diffMarkers` next door answers "where are the changes in this document" and knows
 * nothing about files. That is deliberate and stays that way — its `MarkerBlock` has
 * no file on it, and `rulerSegments`/`segmentIndexAt` keep handing back a BLOCK index
 * that goes straight into the panel's `goToBlock`. Teaching those about files would
 * change that index's meaning for every existing caller and test.
 *
 * So this module sits on top instead: it takes the rows measured under each card,
 * folds them into one repo-wide list, and answers the handful of questions a stack of
 * cards raises that a single document never did — which file a change belongs to, how
 * much room to hold open for a card still being read, and how to keep a ruler legible
 * once forty files' worth of marks are projected onto four hundred pixels of track.
 *
 * Free of DOM types like its neighbour, and for the same reason: the renderer suite
 * runs on node with no jsdom, so anything holding an Element could not be covered.
 */

import {
  countMarkerKinds, groupMarkerBlocks,
  type MarkerBlock, type MarkerCounts, type MarkerPosition, type RulerSegment, type ScrollView,
} from './diffMarkers'
import type { ChangedFile } from '../../types'

/**
 * How a file is named in the collapsed-card map.
 *
 * A single string rather than a nested `Record<repo, Record<path, boolean>>`: the map
 * is only ever read one file at a time, and a flat key cannot end up with a repository
 * entry left behind holding nothing. NUL as the separator because it is the one byte a
 * path cannot contain, so `a/b` + `c` and `a` + `b/c` stay distinct.
 */
export function reviewFileKey(repoPath: string, path: string): string {
  return `${repoPath}\u0000${path}`
}

/** The marked rows measured under one card, with the card they were found in. */
export interface FileMarkers {
  /** The card's `data-file-index` — its position in the review's frozen file list. */
  fileIndex: number
  markers: MarkerPosition[]
}

/**
 * Every change in the repository, as one list the navigator and the ruler can both
 * walk without knowing files exist.
 *
 * `blocks` is exactly what a single-file preview used to hand those two, which is the
 * point: previous/next crossing a file boundary is not a feature either of them has to
 * implement, it is what walking a flat list already does. Nothing downstream needs the
 * file back — the anchor resolves it from the DOM's own `data-file-index` instead — so
 * no parallel array rides along here, and `MarkerBlock` stays the shape `diffMarkers`
 * defines.
 */
export interface ReviewLayout {
  blocks: MarkerBlock[]
  counts: MarkerCounts
}

/** Nothing measured yet — what the panel reads before the first sweep, and after a reset. */
export const EMPTY_REVIEW_LAYOUT: ReviewLayout = { blocks: [], counts: { added: 0, removed: 0 } }

/**
 * Fold the rows measured under every card into one repo-wide list.
 *
 * Grouped PER FILE and only then merged, never the other way round: `groupMarkerBlocks`
 * joins rows separated by a pixel or less, and a change at the very bottom of one card
 * has a card header, a border and a gap between it and the top of the next — but that
 * is a fact about the layout, not something worth relying on. Grouping inside the file
 * says outright that two files' changes are two changes.
 *
 * Sorted by `top` afterwards because everything downstream depends on it:
 * `currentBlockIndex` walks the list assuming strictly increasing tops, and
 * `rulerSegments` paints in list order. Cards render in file order so the sort is
 * almost always a no-op — it is here so that a collapsed card, a card still loading, or
 * a `querySelectorAll` that ever stops being document-ordered cannot quietly produce a
 * navigator that walks backwards.
 */
export function buildReviewLayout(files: FileMarkers[]): ReviewLayout {
  const blocks: MarkerBlock[] = []
  // Rows, not blocks, and accumulated over the same walk that groups them — the same
  // figure the header shows, arrived at once rather than summed a second way from a
  // flattened copy of every marker in the repository.
  const counts: MarkerCounts = { added: 0, removed: 0 }

  for (const file of files) {
    // Pushed one at a time rather than spread in: a generated file can group into more
    // blocks than an argument list is allowed to hold.
    for (const block of groupMarkerBlocks(file.markers)) blocks.push(block)
    const fileCounts = countMarkerKinds(file.markers)
    counts.added += fileCounts.added
    counts.removed += fileCounts.removed
  }
  // A plain sort on `top`, with no tie-break: `Array.prototype.sort` is stable, and the
  // blocks were pushed in file order, so equal tops keep it.
  blocks.sort((a, b) => a.top - b.top)

  return { blocks, counts }
}

/**
 * The repository's own +N/−N, summed over the frozen file list.
 *
 * Taken from the SNAPSHOT rather than from the measured rows, deliberately. The
 * measurement only sees the cards that are expanded and finished reading, so a header
 * fed by it would count up as the files resolved and back down as the reader collapsed
 * them — a total that moves while the repository has not changed. The snapshot is the
 * same number the sidebar's file list shows, which is where the reader just clicked.
 */
export function sumChangedFiles(files: ChangedFile[]): MarkerCounts {
  let added = 0
  let removed = 0
  for (const file of files) {
    added += file.additions
    removed += file.deletions
  }
  return { added, removed }
}

/** Below this a reserved card is a sliver that does not read as a file at all. */
const MIN_RESERVED_ROWS = 6

/**
 * Above this the reservation stops being a guess and starts being a scrollbar.
 *
 * A file with two thousand changed lines would otherwise hold open a page and a half
 * of nothing, and the reader would scroll through blank space to reach the next card.
 * Being SHORT is the recoverable error here — the content lands, the card grows, and
 * the panel re-anchors — while being far too tall pushes every card below off the end
 * of a scrollbar that then snaps back.
 */
const MAX_RESERVED_ROWS = 400

/**
 * Roughly how much unchanged code the collapsed rendering keeps around each region,
 * per side.
 *
 * Named apart from FilePreviewPanel's `CONTEXT_LINES`, which is a scroll-anchor margin
 * measured in pixels and an unrelated quantity that happens to share a number. This one
 * is an ESTIMATE of the main process's `DIFF_CONTEXT_LINES` and deliberately not
 * imported from it: nothing here can know how many regions a file's changes fall into,
 * so the reservation is approximate by construction and being a line out per side is
 * far below the error that already carries.
 */
const RESERVED_CONTEXT_LINES = 3

/**
 * How tall to hold a card open while its read is still in flight.
 *
 * Not cosmetic, and not about the spinner. Cards are read in parallel, so a file near
 * the top can resolve after one further down; without a reservation every card that
 * lands pushes the ones below it down, which moves the anchor the panel scrolled to
 * and invalidates every offset measured under it. Worse, the panel reads a scroll
 * position it did not write as the reader taking over and stops re-anchoring — so the
 * review would settle wherever the last file happened to land.
 *
 * Estimated from the snapshot's own figures because that is all that is known before
 * the bytes arrive: the changed rows, plus the context the collapsed rendering keeps
 * on each side of them. Deliberately not exact — nothing here can know how many
 * regions the changes fall into — just close enough that the settling is a nudge
 * rather than a jump.
 */
export function reservedCardHeight(file: ChangedFile, lineHeightPx: number): number {
  const changedRows = file.additions + file.deletions
  const rows = Math.min(Math.max(changedRows + 2 * RESERVED_CONTEXT_LINES, MIN_RESERVED_ROWS), MAX_RESERVED_ROWS)
  return rows * lineHeightPx
}

/**
 * Where to scroll so a card's top sits at the top of the view.
 *
 * The card's TOP, not its first change: the reader clicked a file name, and the answer
 * to "take me to that file" is its header — the badge, the path and the counts — with
 * the first hunk under it. Anchoring on the first change instead would open the review
 * with the card's own title scrolled off, which is exactly the "which file am I looking
 * at" question a stack of files creates.
 *
 * `marginPx` leaves a sliver of the previous card visible, so the anchor reads as a
 * position in a list rather than as the top of a document.
 */
export function anchorScrollTop(cardTop: number, view: ScrollView, marginPx = 0): number {
  const maxScrollTop = Math.max(0, view.contentHeight - view.viewportHeight)
  return Math.min(Math.max(cardTop - marginPx, 0), maxScrollTop)
}

/**
 * The tallest a merged mark may grow before the next overlap starts a new one.
 *
 * This bound is the whole design, not a safety rail. Merging without one CHAINS: at
 * forty files every mark overlaps its neighbour, each merge extends the run, and the
 * band ends up as a single full-height segment carrying block 0 — so every click on
 * the ruler goes to the first change in the repository. That is strictly worse than
 * not merging at all, because an unmerged list at least hit-tests to whichever mark
 * the click landed inside.
 *
 * Three times `MIN_SEGMENT_PX`, so a saturated band becomes a row of readable handles
 * roughly a thirtieth of the review apart rather than either a solid bar or two hundred
 * overdrawn hairlines.
 */
const MAX_MERGED_SEGMENT_PX = 12

/**
 * The widest seam between two marks that still counts as them touching.
 *
 * A single pixel: a hairline gap between two hairlines is not something a pointer can
 * aim at, so leaving the two apart buys a target nobody can hit while costing a mark
 * that reads as noise.
 */
const TOUCHING_GAP_PX = 1

/**
 * Collapse ruler marks that have been drawn into each other, up to a bounded height.
 *
 * `rulerSegments` floors every mark at `MIN_SEGMENT_PX` so a one-line change in a long
 * file stays clickable. That is right for one file and untenable for forty: two hundred
 * blocks at four pixels each need eight hundred pixels of a track that is four hundred
 * tall, so the band paints as a solid bar of two hundred absolutely positioned elements
 * — and the panel re-renders on every scroll event to move the viewport indicator, so
 * that is two hundred nodes reconciled sixty times a second.
 *
 * The FIRST block's index survives a merge, and that is the contract: `segmentIndexAt`
 * hands it to `goToBlock`, so a click on a merged mark lands on the topmost change
 * inside it and the arrows walk on from there — never on a block the reader would have
 * to scroll backwards to reach. The kind folds to `'mixed'` the moment two disagree,
 * the same rule `groupMarkerBlocks` uses one level down.
 *
 * `TOUCHING_GAP_PX` also joins marks that merely touch: a one-pixel seam between two
 * hairlines is not a gap anyone can aim at.
 *
 * A sparse review — anything where the marks were already apart — comes back
 * untouched, which is what keeps a one-file repository's ruler exactly the ruler it
 * has always been.
 */
export function mergeRulerSegments(segments: RulerSegment[]): RulerSegment[] {
  const sorted = [...segments].sort((a, b) => a.top - b.top || a.index - b.index)
  const merged: RulerSegment[] = []

  for (const segment of sorted) {
    const current = merged[merged.length - 1]
    if (current && segment.top - (current.top + current.height) <= TOUCHING_GAP_PX) {
      const height = Math.max(current.top + current.height, segment.top + segment.height) - current.top
      if (height <= MAX_MERGED_SEGMENT_PX) {
        current.height = height
        if (current.kind !== segment.kind) current.kind = 'mixed'
        continue
      }
      // Too tall to keep growing: this mark starts a run of its own, so the reader
      // gets a handle every MAX_MERGED_SEGMENT_PX instead of one handle for the lot.
    }
    // Copied rather than pushed by reference: the caller's array comes from
    // `rulerSegments`, and widening a segment in place would mutate it.
    merged.push({ ...segment })
  }

  return merged
}
