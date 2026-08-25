import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useStore } from '../store'
import FileContentRenderer from './file-preview/FileContentRenderer'
import FileHeader, { statusConfigFor } from './file-preview/FileHeader'
import FileReviewCard from './file-preview/FileReviewCard'
import ReviewHeader from './file-preview/ReviewHeader'
import ChangeNavigator from './file-preview/ChangeNavigator'
import ChangeRuler, { RULER_GUTTER } from './file-preview/ChangeRuler'
import ReviewCommentsButton from './file-preview/ReviewCommentsButton'
import {
  blockScrollTop, countMarkerKinds, currentBlockIndex, jumpScrollTop, resolveBlockIndex,
  rulerSegments, rulerViewport, selectScrollTop,
  type MarkerPosition, type ScrollView,
} from '../utils/diffMarkers'
import {
  anchorScrollTop, buildReviewLayout, mergeRulerSegments, reviewFileKey, sumChangedFiles,
  EMPTY_REVIEW_LAYOUT, type FileMarkers, type ReviewLayout,
} from '../utils/reviewLayout'
import {
  collectReviewComments, type ReviewComment, type ReviewCommentGroup,
} from '../utils/reviewComments'
import { cumulativeOffsetTop, findScrollContainer } from '../utils/scrollGeometry'
import { useT } from '../i18n'

/**
 * How long a step between two changes takes.
 *
 * Short on purpose: this is a navigation control, and the arrows are meant to be
 * pressed in a row. Anything long enough to notice as an animation is long enough to
 * queue up behind, and the second press would land while the first is still moving.
 */
const SCROLL_MS = 180

/**
 * How far the container may sit from the position the panel last wrote and still be
 * considered untouched.
 *
 * Not zero: `scrollTop` is snapped to a device pixel on write, so the value read back
 * on a fractional-DPR display is a hair off the one asked for. One pixel is below what
 * any real scroll input produces and above that rounding.
 *
 * Used by two things now — the animated step, and the anchor below, which has to know
 * whether the reader has taken the scroll over since it last positioned the review.
 */
const SCROLL_TAKEOVER_PX = 1

/** Lines of unchanged code kept above a change, so it reads in context. */
const CONTEXT_LINES = 3

/** Only used if the first marked row measures zero, which layout should never give. */
const FALLBACK_LINE_HEIGHT = 18

/**
 * How much of the card above the anchor stays visible.
 *
 * Equal to the gap between cards, so the anchored card lands where a card sits in the
 * list rather than flush against the top of the view — which is what makes the position
 * read as "here, in a stack" instead of as the top of a document.
 */
const ANCHOR_MARGIN_PX = 12

/**
 * No comments anywhere in the review, as ONE array.
 *
 * `NO_COMMENTS`' reason, one level up: the memo below hands this to the bar, and a fresh
 * `[]` on every render of a panel that re-renders per scroll frame would defeat
 * `memo(ReviewCommentsButton)` and re-render the button and its portalled panel with it.
 */
const NO_GROUPS: ReviewCommentGroup[] = []

/** Nothing changed — what the bar reads before a measurement, and after a reset. */
const NO_CHANGES = { added: 0, removed: 0 }

/**
 * The surfaces inside the drawer that own their own keystrokes.
 *
 * Spelled once, because the two listeners below both have to test it and they must not be
 * able to disagree about what counts: the Escape one and the Alt+↑/↓ one, the second of
 * which prepends `.xterm` to it. A target test rather than a flag in the store — see the
 * Escape listener for why — so this is the whole registry, and the next inner surface is
 * one string edit rather than two in the right order.
 */
const KEY_OWNING_SURFACES = '[data-comment-composer], [data-comment-list]'

/**
 * The container's geometry, as one object.
 *
 * A plain function taking `contextPx` rather than a closure over it: this is read both
 * from the measurement sweep, which has the freshly measured value in hand and no
 * business waiting a render for state to catch up, and from the hook below, which has
 * the one in state. A captured `contextPx` could only ever serve the second.
 */
function readScrollView(container: HTMLElement, contextPx: number): ScrollView {
  return {
    viewportHeight: container.clientHeight,
    contentHeight: container.scrollHeight,
    currentScrollTop: container.scrollTop,
    contextPx,
  }
}

/**
 * `annotateShikiHtml` only ever writes "add" or "remove", and the row selector already
 * excluded rows with no attribute at all; anything else is a row this version does not
 * know, and colouring it as an addition beats dropping it.
 */
function kindOf(line: HTMLElement): MarkerPosition['kind'] {
  return line.dataset.diff === 'remove' ? 'remove' : 'add'
}

/**
 * The card for a file of the frozen list, by the index the measurement groups rows by.
 *
 * Spelled ONCE, because `data-file-index` is what makes "the file the ruler's marks belong
 * to", "the file the review scrolled to" and "the file a comment was left on" the same
 * identifier read three times — they cannot drift apart while they all come through here.
 */
function cardFor(content: HTMLElement, fileIndex: number): HTMLElement | null {
  return content.querySelector<HTMLElement>(`[data-file-index="${fileIndex}"]`)
}

/**
 * Where to put the container so `el` sits `marginPx` below the top of the view.
 *
 * The one piece of arithmetic behind every jump this panel makes, so a card and a
 * commented row land by the same rule and differ only in the margin they ask for.
 */
function scrollTargetFor(el: HTMLElement, containerTop: number, view: ScrollView, marginPx: number): number {
  return anchorScrollTop(cumulativeOffsetTop(el) - containerTop, view, marginPx)
}

/**
 * Where to put the container so the anchored card sits at the top of the view, or
 * `null` when there is no card to go to.
 *
 * An anchor path the frozen list does not hold falls back to the first card rather than
 * to nothing. That is not defensive padding: `validation.ts` reports a RENAME as the
 * literal path `"old -> new"`, so a review can legitimately be handed an anchor that
 * matches no entry. Opening at the top of the repository is a worse answer than opening
 * on the right file and a better one than an empty drawer.
 */
function anchorTargetFor(content: HTMLElement, containerTop: number, anchorIndex: number, view: ScrollView): number | null {
  const card = cardFor(content, anchorIndex >= 0 ? anchorIndex : 0)
  if (!card) return null
  return scrollTargetFor(card, containerTop, view, ANCHOR_MARGIN_PX)
}

/**
 * The drawer, in its two shapes.
 *
 * A REPOSITORY REVIEW is the ordinary one: every changed file of a repository stacked as
 * collapsible cards in one scroll, anchored on the file the reader clicked. There is no
 * per-file mode beside it and no toggle between the two — clicking a file in the sidebar
 * opens the repository, and the file it names decides only where the scroll lands.
 *
 * A SINGLE FILE is what is left of the surface this component used to be, and it now has
 * exactly one caller: the spec panel, which opens a file that is not a git change at all
 * (`status: ''`, and a `repoPath` that is a directory rather than a repository root). It
 * gets no badge, no rail, no ruler and no navigator, because with no status there are no
 * `data-diff` rows to measure — which is the same rule as ever, arrived at by the same
 * route.
 *
 * Mounted once, globally, and driven purely by store state; it takes no props.
 */
export default function FilePreviewPanel() {
  const t = useT()
  const review = useStore(s => s.review)
  const selectedFile = useStore(s => s.selectedFile)
  const closeFilePreview = useStore(s => s.closeFilePreview)
  const activeTerminalId = useStore(s => s.activeTerminalId)
  // The whole map, unlike the cards, which each subscribe to their own boolean: this panel
  // has to count the folded ones, and there is no narrower selector for "how many". Its
  // identity only changes when a card is toggled, so the cost is one re-render per fold —
  // on a component that already re-renders on every scroll frame.
  const collapsedFiles = useStore(s => s.collapsedFiles)
  // The whole comment map, for the same reason and with the same cost: the bar reads over
  // every file of the review at once, and there is no narrower selector for "all of them".
  // Its identity only changes when a comment is written or deleted.
  const fileComments = useStore(s => s.fileComments)
  const focusedComment = useStore(s => s.focusedComment)
  // Store actions: their identity never changes, so they need no memoising.
  const focusFileComment = useStore(s => s.focusFileComment)
  const toggleReviewFileCollapsed = useStore(s => s.toggleReviewFileCollapsed)
  const prevTerminalId = useRef(activeTerminalId)
  const [isClosing, setIsClosing] = useState(false)
  const isClosingRef = useRef(false)
  const [prevSelectedFile, setPrevSelectedFile] = useState(selectedFile)
  const [prevReviewRepo, setPrevReviewRepo] = useState<string | null>(review?.repoPath ?? null)
  const [prevAnchorSeq, setPrevAnchorSeq] = useState(review?.anchorSeq ?? 0)
  const [scrollSeq, setScrollSeq] = useState(0)
  /**
   * Whether the SINGLE-FILE card is showing the file end to end.
   *
   * Panel state only for that one mode. In a review it is per CARD — the mode is a way
   * of reading one file, and a single toggle up here would claim to speak for forty.
   */
  const [showWholeFile, setShowWholeFile] = useState(false)
  const [prevShowWholeFile, setPrevShowWholeFile] = useState(false)
  /** Whether the single file on screen HAS two views to switch between. Per card in a review. */
  const [canExpand, setCanExpand] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  /**
   * The element that WRAPS the content, as opposed to the one that scrolls it.
   *
   * The two are different boxes and the difference is the point, twice over.
   *
   * For the resize observer: collapsing a card does not change the scroller's height by
   * a pixel, while it moves every offset below it. Watching the scroller — which is all
   * this component used to do — would miss every content change there is and catch only
   * window resizes.
   *
   * For the measurement: `findScrollContainer` walks up from the element it is GIVEN,
   * starting at that element's parent. Handed the scroller itself it would look for a
   * scrollable ancestor ABOVE the scroller, find none, and report every review as having
   * nothing to scroll. So the sweep is always given something strictly inside the
   * scroller, which is why this wrapper is rendered in both modes even though only the
   * review needs it for layout.
   */
  const contentRef = useRef<HTMLDivElement>(null)
  const scrollAnimationRef = useRef<number | null>(null)
  /** Where the animated step last put the container, so a scroll it did not cause is recognisable. */
  const lastStepScrollTop = useRef<number | null>(null)
  /**
   * What the anchor last wrote, and for which `scrollSeq`.
   *
   * The review re-anchors on every content change — cards land at their own pace, and
   * each one that grows moves the card the reader asked for — but it has to stop the
   * moment the reader scrolls, or reading the fifth file would be interrupted by the
   * fortieth finishing its read. Comparing the container against the position the
   * anchor itself last wrote is what tells those two apart, exactly as the animated
   * step does a few functions down.
   */
  const anchorRef = useRef<{ seq: number; lastTop: number | null }>({ seq: -1, lastTop: null })
  /**
   * The last `focusedComment.seq` the jump below has FINISHED — landed on the commented
   * row itself rather than on the card holding it.
   *
   * Two states, not one, because a comment is very often in a card that is folded shut or
   * still being read: the click unfolds it and the rows arrive some frames later. Until
   * they do, the jump goes to the card and stays unfinished, so the next content change
   * runs it again and it lands on the line. Recording the seq only once the row was found
   * is the whole of that logic.
   */
  const commentJumpRef = useRef<number | null>(null)
  /**
   * Every change in the repository, flattened.
   *
   * One list, in document order, with no notion of a file boundary in it — which is why
   * previous/next crossing from one file to the next needed nothing built for it.
   */
  const [layout, setLayout] = useState<ReviewLayout>(EMPTY_REVIEW_LAYOUT)
  const [contextPx, setContextPx] = useState(0)
  const [currentIndex, setCurrentIndex] = useState(0)
  /**
   * Bumped whenever the content or the viewport is resized, to re-run the sweep below.
   *
   * A counter rather than the measurement itself: the observer fires from outside React
   * and its job is only to say "the numbers you have are stale", not to produce new ones.
   */
  const [contentVersion, setContentVersion] = useState(0)
  /**
   * The container's geometry, in state rather than read at paint time.
   *
   * The navigator only needs it when something is clicked, and reads it live; the ruler
   * has to be REDRAWN whenever it changes, and a render is the only thing that redraws
   * anything. Null until the first measurement, which is also "no ruler yet".
   */
  const [scrollView, setScrollView] = useState<ScrollView | null>(null)

  const blocks = layout.blocks
  const hasBlocks = blocks.length > 0
  const isOpen = review !== null || selectedFile !== null

  /**
   * Clear everything the last measurement produced.
   *
   * Called from the render path, not from an effect, and that is deliberate: it has to
   * happen BEFORE the new content's rows are measured, and a `useEffect` cannot. Cards
   * seed their state from `readCache`, so a file already read mounts its CodeView in the
   * very same commit — and a reset landing afterwards would blank a review that had just
   * been measured.
   */
  const resetGeometry = () => {
    setLayout(EMPTY_REVIEW_LAYOUT)
    setContextPx(0)
    setCurrentIndex(0)
    setScrollView(null)
  }

  // ── What changed since the last render, and how much of the state it invalidates ──
  //
  // Three different answers, where there used to be one. The old panel reset everything
  // whenever `selectedFile` changed identity, because everything it knew described one
  // file. A review is not one document, so the reset is now scoped to what actually
  // moved.
  const reviewRepo = review?.repoPath ?? null
  const anchorSeq = review?.anchorSeq ?? 0

  if (selectedFile !== prevSelectedFile) {
    // A different single file — in practice, the spec panel opening or closing its
    // preview. Full reset: it is a different document.
    setPrevSelectedFile(selectedFile)
    if (selectedFile) setScrollSeq(n => n + 1)
    // Back to the changed regions on every file: the mode is a way of reading THIS
    // file, not a preference, and carrying it over would open the next file expanded
    // with a toggle the reader does not remember pressing.
    setShowWholeFile(false)
    setPrevShowWholeFile(false)
    setCanExpand(false)
    resetGeometry()
  } else if (!review && showWholeFile !== prevShowWholeFile) {
    // The single-file toggle replaced the document that was measured — every row below
    // the first elision moved — so the blocks and the ruler's geometry describe a layout
    // that no longer exists. In a REVIEW this branch never fires: the toggle is per card
    // there, and a card growing is a content-height change like any other, which the
    // observer below already catches without throwing the other cards' offsets away.
    setPrevShowWholeFile(showWholeFile)
    setScrollSeq(n => n + 1)
    resetGeometry()
  }

  if (reviewRepo !== prevReviewRepo) {
    // A different repository: different cards, different everything.
    setPrevReviewRepo(reviewRepo)
    setPrevAnchorSeq(anchorSeq)
    if (reviewRepo) setScrollSeq(n => n + 1)
    resetGeometry()
  } else if (anchorSeq !== prevAnchorSeq) {
    // The SAME repository, another file — or the same file clicked again. Scroll only.
    // The cards on screen are the same cards, every offset measured under them still
    // holds, and clearing the ruler here would blank it for a frame on a click that
    // moved nothing but the scroll position.
    setPrevAnchorSeq(anchorSeq)
    setScrollSeq(n => n + 1)
  }

  /**
   * The container as it is RIGHT NOW. Never the heights measured at mount: a
   * `contentHeight` from before the last card landed would put the end-of-travel
   * comparison off, and that comparison is what makes the last changes reachable.
   * `contextPx` is the one number that legitimately comes from the measurement — it is
   * a row height, and rows do not change under the reader.
   */
  const readView = useCallback(
    (container: HTMLElement): ScrollView => readScrollView(container, contextPx),
    [contextPx],
  )

  const stopScrollAnimation = useCallback(() => {
    lastStepScrollTop.current = null
    if (scrollAnimationRef.current === null) return
    cancelAnimationFrame(scrollAnimationRef.current)
    scrollAnimationRef.current = null
  }, [])

  /**
   * ONE measurement pass over the whole review, from the panel.
   *
   * This replaces the per-file measurement CodeView used to do, and the reason is not
   * tidiness. With N cards, N copies of that effect would each resolve the same scroller
   * and each write `scrollTop` into it in the same commit — the reader would land
   * wherever the last card to mount decided. Grouping rows by file is also something no
   * single card can do, and stable per-card callbacks would have had to be threaded
   * through a memoised component for every one of them.
   *
   * A LAYOUT effect, before paint, for two reasons that both matter. React runs a
   * child's layout effects before its parent's, so every card's elision labels are
   * already written and every row is already at its final height by the time this runs —
   * that ordering is what lets the panel measure the cards without asking them anything.
   * And the reader must never see the top of the review and then a jump away from it.
   *
   * It re-runs on every content-height change, not only on open, because a review is not
   * finished when it mounts: cards arrive as their reads come back, and each one that
   * lands moves every offset below it.
   */
  useLayoutEffect(() => {
    // Always the wrapper INSIDE the scroller, never the scroller itself — see
    // `contentRef` above for why handing this one the scroller would answer "nothing to
    // scroll" for every review there is.
    const content = contentRef.current
    if (!content) return

    const rows = [...content.querySelectorAll<HTMLElement>('.line[data-diff]')]

    // Resolved from the DOM rather than assumed to be `scrollRef`, because the answer
    // carries a second meaning: no scrollable ancestor means no scrollable overflow, so
    // every change is already on screen. The COUNTS are still worth reporting — the
    // navigator stands on them alone and drops its arrows below two blocks — but the
    // BLOCKS are not. Reporting them would put up arrows that move nothing
    // (`blockScrollTop` clamps every one to 0), leaving a counter walking 1 → 2 → 3 over
    // a view that never changes, and a ruler with nowhere to send anyone.
    const container = findScrollContainer(content)
    if (!container) {
      // `EMPTY_REVIEW_LAYOUT` for the common case, rather than a fresh object every
      // pass: with no row there is nothing to count either, and a new identity here
      // would re-render the panel on every resize of a preview that has no ruler.
      setLayout(rows.length === 0
        ? EMPTY_REVIEW_LAYOUT
        : { blocks: [], counts: countMarkerKinds(rows.map(line => ({ kind: kindOf(line) }))) })
      setContextPx(0)
      setCurrentIndex(0)
      setScrollView(null)
      return
    }

    const containerTop = cumulativeOffsetTop(container)

    // Grouped by the card each row sits in, which is the whole of what the cards are
    // asked to provide: a `data-file-index` on their outer element. Rows outside any
    // card — single-file mode — all belong to file 0.
    const byFile = new Map<number, MarkerPosition[]>()
    for (const line of rows) {
      const card = line.closest<HTMLElement>('[data-file-index]')
      const fileIndex = card ? Number(card.dataset.fileIndex) : 0
      const marker: MarkerPosition = {
        // Layout offsets, never `getBoundingClientRect`: this runs while the drawer is
        // midway through its slide-in, and a rect would be displaced by however far it
        // has slid — by a DIFFERENT amount for the cards measured early and the ones
        // measured late.
        top: cumulativeOffsetTop(line) - containerTop,
        height: line.offsetHeight,
        kind: kindOf(line),
      }
      const markers = byFile.get(fileIndex)
      if (markers) markers.push(marker)
      else byFile.set(fileIndex, [marker])
    }

    const files: FileMarkers[] = [...byFile].map(([fileIndex, markers]) => ({ fileIndex, markers }))
    const measured = buildReviewLayout(files)
    // The context margin, plus whatever a card's sticky header covers.
    //
    // `contextPx` is "how far below the top of the view a change should land", and
    // every consumer of it in `diffMarkers` reads it that way — `blockScrollTop`
    // subtracts it, `currentBlockIndex` adds it to find the anchor line, and the two
    // are self-consistent BECAUSE they read the same number. Folding the header into it
    // here therefore moves both together and needs no change to that module.
    //
    // Measured rather than assumed: the bar is two lines of text on a padding, so its
    // height follows the theme's type scale. Read from any card, since `truncate` keeps
    // every header on exactly one line each. Zero in single-file mode, which has no
    // cards and no sticky anything.
    const stickyHeaderPx = content.querySelector<HTMLElement>('[data-card-header]')?.offsetHeight ?? 0
    const measuredContextPx = CONTEXT_LINES * (rows[0]?.offsetHeight || FALLBACK_LINE_HEIGHT) + stickyHeaderPx

    // ── Anchor ──
    //
    // A fresh `scrollSeq` is a fresh anchor: the reader has just asked for a file, so
    // whatever they had scrolled to before stops counting.
    if (anchorRef.current.seq !== scrollSeq) anchorRef.current = { seq: scrollSeq, lastTop: null }

    const view = readScrollView(container, measuredContextPx)
    const lastAnchored = anchorRef.current.lastTop
    // Anything other than where the anchor last left the container was put there by the
    // reader — a wheel, a drag, an arrow key, the navigator's own animated step. The
    // position covers all of them at once, which is why this is not a list of events.
    const readerTookOver = lastAnchored !== null && Math.abs(container.scrollTop - lastAnchored) > SCROLL_TAKEOVER_PX

    if (!readerTookOver) {
      const target = review
        ? anchorTargetFor(content, containerTop, review.files.findIndex(f => f.path === review.anchorPath), view)
        // Single-file mode keeps the rule it always had: go to the first change, or
        // leave the scroll alone. With no `data-diff` row — the spec preview's case —
        // `selectScrollTop` answers null and that panel's own scrolling is untouched.
        : selectScrollTop(measured.blocks, view)

      if (target !== null) {
        // Written directly rather than animated: this is not a step the reader asked
        // for, it is the view being kept on the file they already chose while the cards
        // around it settle. An animation here would fight the next card that lands.
        stopScrollAnimation()
        container.scrollTop = target
        // Read back rather than trusting what was assigned: the browser snaps
        // `scrollTop` to a device pixel, and the snapped value is what the comparison
        // above will see next time.
        anchorRef.current.lastTop = container.scrollTop
      }
    }

    // Read AFTER the anchor, so the ruler is drawn to where the view actually ended up
    // rather than to where it was a moment before.
    const settled = readScrollView(container, measuredContextPx)
    setLayout(measured)
    setContextPx(measuredContextPx)
    setScrollView(settled)
    // Resolved from the position rather than reset to 0. The old panel could assume the
    // first change, because it had just scrolled onto it; a review anchored on the
    // twelfth file opens somewhere in the middle of its own list.
    setCurrentIndex(Math.max(0, currentBlockIndex(measured.blocks, settled)))
    // `review` is in the dependencies for its `files` and `anchorPath`; its identity only
    // changes when one of those does. `t` is deliberately absent — the panel writes no
    // text into the document, and a language change that alters a label's height reaches
    // here through the resize observer like any other content change.
  }, [scrollSeq, contentVersion, review, selectedFile, stopScrollAnimation])

  /**
   * Re-measure when the CONTENT is resized, and when the viewport is.
   *
   * Two different reasons, one observer. Content: cards arrive as their reads come back
   * and fold shut when the reader asks, and both move every offset below them — this is
   * what makes the review settle correctly instead of freezing on the geometry it had
   * when the first card happened to land. Viewport: the band is drawn to the geometry of
   * the last measurement, and a resize changes that geometry without producing a scroll
   * event, so the segments and the indicator would keep a scale they no longer have —
   * and `segmentIndexAt` hit-tests against those same offsets, so a click would resolve
   * to the wrong block or to none.
   *
   * Observing the scroller rather than listening for `resize` on the window is what
   * catches the rest of the viewport cases — the drawer is 70% of the window, but the
   * sidebar collapsing or a devtools split resizes it with the window itself untouched.
   *
   * The observer fires once on `observe()`, which costs one redundant pass and is left
   * in: the alternative is a first-callback flag to skip a measurement that is correct
   * anyway.
   */
  useEffect(() => {
    const scroller = scrollRef.current
    const content = contentRef.current
    if (!scroller || !content || typeof ResizeObserver === 'undefined') return

    const observer = new ResizeObserver(() => setContentVersion(v => v + 1))
    observer.observe(content)
    observer.observe(scroller)
    return () => observer.disconnect()
  }, [review, selectedFile])

  const handleScroll = useCallback(() => {
    const container = scrollRef.current
    if (!container || blocks.length === 0) return
    // Read live, and read once, OUTSIDE the updater further down: that updater is a
    // pure function of the index and may be replayed, while these numbers are only
    // right for the event being handled.
    const view = readView(container)
    // Handed to the ruler BEFORE the bail-out below, not after it. That branch skips
    // the frames the animated step produced — the right call for the counter, whose
    // destination is already known — but the indicator's whole job is to show the
    // travel: skipping them would freeze it for the full 180 ms of the step and then
    // snap it to the end, which reads as a stutter rather than as a scroll.
    setScrollView(view)
    if (scrollAnimationRef.current !== null) {
      // This event is either the step's own frame or the reader taking over, and the
      // position is what tells them apart: anything other than where the step last put
      // the container was put there by someone else. Deliberately not a list of input
      // events — cancelling on `wheel` covers a wheel and nothing else, while this
      // container is focused and therefore also scrolls from its own arrow keys, Page
      // Up/Down, Home/End, space, a scrollbar drag, a trackpad fling and whatever the
      // platform adds next. The position covers all of them at once.
      const stepPosition = lastStepScrollTop.current
      if (stepPosition !== null && Math.abs(container.scrollTop - stepPosition) <= SCROLL_TAKEOVER_PX) {
        // The step's own frame. The destination is already known — `goToBlock` set the
        // index before starting the travel — so reading the counter off a position
        // being flown over would run it through every block in between and land back
        // on the right one: a flicker, not information. The last frame clears the ref
        // before its own scroll event is dispatched, so exactly one of these gets
        // through, at the final position, and reconciles.
        return
      }
      // The reader moved it. Drop the step rather than fight it for the next few
      // frames, and handle this event as the manual scroll it is.
      stopScrollAnimation()
    }
    // The functional form is not a style choice. `goToBlock` sets the clicked index
    // optimistically and the scroll it starts brings us straight here, so this handler
    // has to compare against the index as it stands NOW — one captured in this closure
    // would still be the pre-click value, and `resolveBlockIndex` would find it no
    // longer explains the position and discard the very block just asked for. Keeping
    // it out of the closure also keeps it out of the dependencies, so the listener
    // identity no longer churns on every counter change.
    //
    // Most scroll events land inside the block already showing. React compares with
    // `Object.is` and bails out before scheduling anything when the value is
    // unchanged, so those cost no render and no guard of our own is needed here.
    setCurrentIndex(index => resolveBlockIndex(blocks, view, index))
  }, [blocks, readView, stopScrollAnimation])

  /**
   * Travel to `target` over a fixed short duration, rather than teleporting.
   *
   * Fixed, and not `scrollTo({ behavior: 'smooth' })`, for two reasons. The native
   * duration scales with the distance — a jump across a long review takes half a second
   * and stops feeling like a step — and it ends without telling anyone, while the
   * counter below needs to know exactly when the travel is over.
   *
   * The point of animating at all is continuity: the reader sees the code slide past
   * and keeps their bearings, where an instant jump makes every change look like a
   * different file. That only holds while the motion stays short enough to read
   * through rather than wait out.
   */
  const animateScrollTo = useCallback((container: HTMLDivElement, target: number) => {
    stopScrollAnimation()
    const from = container.scrollTop
    const distance = target - from
    // Already there, or the reader asked for less motion — the global CSS rule that
    // collapses animations cannot reach a scroll driven from script, so honour it here.
    if (distance === 0 || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      container.scrollTop = target
      return
    }

    // Seeded with the starting position rather than left empty. A step cancelled
    // mid-flight — two clicks in quick succession — can leave its last frame's scroll
    // event still queued; it reports exactly this position, and with no reference to
    // compare against it would read as a takeover and kill the step just started.
    lastStepScrollTop.current = from

    const start = performance.now()
    const step = (now: number) => {
      const progress = Math.min((now - start) / SCROLL_MS, 1)
      // easeOutCubic: leaves immediately and settles gently, so the motion reads as a
      // step that landed rather than a scroll that drifted.
      container.scrollTop = from + distance * (1 - (1 - progress) ** 3)
      // Read back rather than trusting what was just assigned: the browser snaps
      // `scrollTop` to a device pixel, and the snapped value is the one the scroll
      // event about to fire will report. Comparing against the unsnapped number would
      // read every frame as a takeover on a fractional-DPR display.
      lastStepScrollTop.current = container.scrollTop
      // Cleared BEFORE the last frame's scroll event is dispatched, which is what lets
      // `handleScroll` run once on the final position and reconcile the counter.
      scrollAnimationRef.current = progress < 1 ? requestAnimationFrame(step) : null
    }
    scrollAnimationRef.current = requestAnimationFrame(step)
  }, [stopScrollAnimation])

  /**
   * Go to a change by its index in the repo-wide list.
   *
   * The list is flat, so a step that happens to cross from one file's card into the
   * next's is the same arithmetic as a step inside one file. That is the whole of how
   * previous/next walks file boundaries — there is no boundary in the data.
   */
  const goToBlock = useCallback((index: number) => {
    const container = scrollRef.current
    if (!container || blocks.length === 0) return
    const clamped = Math.min(Math.max(index, 0), blocks.length - 1)
    setCurrentIndex(clamped)
    animateScrollTo(container, blockScrollTop(blocks[clamped], readView(container)))
  }, [blocks, readView, animateScrollTo])

  const goToPrevious = useCallback(() => goToBlock(currentIndex - 1), [goToBlock, currentIndex])
  const goToNext = useCallback(() => goToBlock(currentIndex + 1), [goToBlock, currentIndex])

  /**
   * A click on bare ruler track: go roughly there.
   *
   * `readView` rather than the `scrollView` in state, for the same reason `goToBlock`
   * does it: the state holds the last SCROLL, and a window the reader has resized since
   * would put the jump on the wrong scale. Animated like the arrows, so the two controls
   * move the panel the same way.
   *
   * `currentIndex` is deliberately left alone — the next scroll event resolves it from
   * the position, which is the honest answer for a jump that named no block.
   */
  const handleJumpTo = useCallback((offsetPx: number, trackHeight: number) => {
    const container = scrollRef.current
    if (!container) return
    animateScrollTo(container, jumpScrollTop(offsetPx, trackHeight, readView(container)))
  }, [readView, animateScrollTo])

  const handleClose = useCallback(() => {
    if (isClosingRef.current) return
    isClosingRef.current = true
    setIsClosing(true)
    setTimeout(() => {
      isClosingRef.current = false
      setIsClosing(false)
      closeFilePreview()
    }, 310)
  }, [closeFilePreview])

  const handleToggleWholeFile = useCallback(() => setShowWholeFile(v => !v), [])

  useEffect(() => {
    if (isOpen) {
      isClosingRef.current = false
      setIsClosing(false)
    }
  }, [isOpen])

  useEffect(() => {
    if (prevTerminalId.current !== activeTerminalId) {
      prevTerminalId.current = activeTerminalId
      handleClose()
    }
  }, [activeTerminalId, handleClose])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // A comment composer owns its own Escape: it closes the card, not the review behind
      // it — a reader who has just typed three lines about a diff and pressed Escape to
      // dismiss the box has not asked for the diff to go away too. Same shape as the
      // `.xterm` guard on the navigation listener below: a target test rather than a flag
      // in the store, so there is no state to keep in step, nothing a card that unmounted
      // can leave set, and it works for two composers open at once.
      //
      // The comment LIST owns its own Escape the same way, and `useAnchoredPanel` is what
      // closes it. The marker is stamped on the bar's button as well as on the panel,
      // because the focus never leaves that button while the list is open — so this test
      // is what it matches on.
      if (e.target instanceof Element && e.target.closest(KEY_OWNING_SURFACES)) return
      if (e.key === 'Escape' && isOpen) {
        handleClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, handleClose])

  // Alt+↑/↓ walks the changes — every change in the repository, in one list. Kept apart
  // from the Escape listener above rather than folded into it: that one is on `document`
  // by the modal convention and closes the panel, this one is a navigation shortcut and
  // only ever fires while the drawer is open on something with somewhere to go.
  useEffect(() => {
    if (!isOpen || blocks.length < 2) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!e.altKey || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return
      // A terminal owns its arrow keys — history, and whatever the running program
      // binds Alt+arrow to. xterm listens at the target phase and this listener
      // bubbles to the window, so it could not have cancelled that anyway; what it
      // must not do is act on a keystroke that was never aimed at the panel.
      // (`.xterm` is the class the library puts on the element it is opened into.)
      //
      // A comment composer is guarded the same way and for the same reason: Alt+↑/↓ in a
      // textarea moves the caret, and jumping the review to another file out from under
      // someone mid-sentence would take the box they were typing in off screen.
      // The comment list is guarded for the third time on the same grounds: reading through
      // a review's comments must not fly the review off to another file underneath them.
      if (e.target instanceof Element && e.target.closest(`.xterm, ${KEY_OWNING_SURFACES}`)) return
      // preventDefault only on the branches that act, so an Alt+arrow this panel does
      // not use keeps whatever meaning it has elsewhere.
      e.preventDefault()
      // The bar's own two steps, not a second copy of the arithmetic: the keyboard
      // and the arrows cannot end up disagreeing about what "next" means.
      if (e.key === 'ArrowUp') goToPrevious()
      else goToNext()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, blocks.length, goToPrevious, goToNext])

  // Focus the drawer when it opens, and again whenever the reader asks for another
  // file. This, not the `.xterm` check above, is what actually keeps the terminal out of
  // it: a focused panel is where the keystrokes arrive in the first place. It also
  // restores native arrow-key scrolling inside the preview. `preventScroll` because the
  // browser would otherwise scroll the freshly focused container back to the top —
  // straight over the anchoring done a moment earlier.
  useEffect(() => {
    if (isOpen) scrollRef.current?.focus({ preventScroll: true })
  }, [isOpen, scrollSeq])

  // The container outlives what is shown in it, so a step still in flight when the
  // reader switches repositories would keep writing scrollTop into the next one —
  // fighting the anchoring being done for it at that exact moment. Also covers unmount,
  // where the callback would otherwise touch a detached element.
  useEffect(() => stopScrollAnimation, [selectedFile, review, stopScrollAnimation])

  // The repository's own total, from the frozen list rather than from the measurement:
  // it must not count up as cards resolve or down as the reader folds them away.
  const repoCounts = useMemo(() => (review ? sumChangedFiles(review.files) : NO_CHANGES), [review])

  /**
   * How many cards are folded shut over changed lines — the navigator's own reason to stay
   * on screen with nothing mounted to walk. See its `foldedFiles` prop for why a count of
   * files answers a question about blocks.
   *
   * Files with no changed line are skipped: a folded card that never had a marked row in it
   * is not hiding a block, and counting it would put the bar over a review of forty
   * unchanged files.
   *
   * The frozen list is what it walks, which is the same list the cards are rendered from —
   * so a key built here cannot name a file the review does not hold.
   */
  const foldedFiles = useMemo(() => {
    if (!review) return 0
    let folded = 0
    for (const file of review.files) {
      if (file.additions + file.deletions === 0) continue
      if (collapsedFiles[reviewFileKey(review.repoPath, file.path)]) folded++
    }
    return folded
  }, [review, collapsedFiles])

  /**
   * The live `diffFingerprint` of every file a card has actually read, by path.
   *
   * The panel is the only thing that sees every file at once, so it is the only thing that
   * can tell a comment filed against the CURRENT version of a file from one filed against a
   * version that has since moved. The cards are the only things that read a file, so they are
   * the only source: each reports its own once its read lands.
   *
   * A card reporting `undefined` deletes its entry rather than writing a blank, so a file that
   * became unreadable stops claiming a version instead of claiming an empty one.
   */
  const [liveFingerprints, setLiveFingerprints] = useState<Record<string, string>>({})

  // Dropped with the review, not left to be overwritten path by path. The paths belong to the
  // repository that was open, so carrying them into the next one would let a file of the same
  // name inherit a fingerprint from a different repository — and that is the one way this map
  // can produce a WRONG answer rather than merely an unknown one: a stale entry filters real
  // comments out of the list, where a missing entry only declines to filter.
  useEffect(() => { setLiveFingerprints({}) }, [review])

  // STABLE for the life of the panel — `useCallback` with no dependencies, closing over
  // nothing but the setter. The cards rely on that: an unstable handler here defeats
  // `FileReviewCard`'s memo and, through it, `FileContentRenderer`'s, which is forty shiki
  // documents re-rendered on a panel that re-renders per scroll frame.
  //
  // The functional update bails out when the value has not changed, so a re-read that hashes
  // the same content schedules no render at all.
  const reportFingerprint = useCallback((path: string, fingerprint: string | undefined) => {
    setLiveFingerprints(current => {
      if (fingerprint === undefined) {
        if (!(path in current)) return current
        const next = { ...current }
        delete next[path]
        return next
      }
      if (current[path] === fingerprint) return current
      return { ...current, [path]: fingerprint }
    })
  }, [])

  /**
   * Every comment of the review, grouped by file — and, just below, how many that is.
   *
   * ONE computation, with the count derived from its result rather than counted again,
   * because the two must not be able to disagree: the count is what keeps the bar on
   * screen, and the groups are what the panel it opens draws. A count from one source and
   * a list from another is the state where the bar says "3" over an empty list.
   *
   * `liveFingerprints` is what keeps a superseded version's comments out of both. A path
   * nothing has reported yet is absent from that map, and `collectReviewComments` reads absent
   * as UNKNOWN rather than as superseded — see its docblock for why that distinction is the
   * whole safety of this.
   *
   * The arithmetic itself is in `reviewComments`, where it is tested. Worth memoising for
   * the ordinary reason in this file: the panel re-renders on every scroll event, and this
   * walks the review's file list against the comment map.
   */
  const commentGroups = useMemo(
    () => (review
      ? collectReviewComments(fileComments, review.files, review.repoPath, liveFingerprints)
      : NO_GROUPS),
    [review, fileComments, liveFingerprints],
  )
  // Derived on the spot rather than memoised: the result is a NUMBER, so there is no
  // identity to stabilise, and one addition per commented file is cheaper than the hook
  // cell and the dependency compare that would guard it. Deriving it off the memo above
  // is what makes it the same arithmetic as the list — which is the whole point.
  const commentCount = commentGroups.reduce((total, group) => total + group.comments.length, 0)

  /**
   * Take the reader from the comment list to the comment.
   *
   * Two things, in this order. The card is UNFOLDED if it is folded shut — otherwise there
   * is nothing to scroll to and nothing to highlight — and `toggleReviewFileCollapsed` is
   * a toggle, so the current state has to be read first or a jump into an open card would
   * fold it. Then the comment is FOCUSED, which is store state rather than a call into the
   * card: see `focusedComment` for why nothing here can reach the rows yet.
   *
   * The scroll is not done here. It is the effect below, which re-runs as the card's rows
   * arrive — the card just unfolded has none in this frame.
   *
   * `collapsedFiles` is read off the store rather than closed over, so folding a card does
   * not give this callback a new identity: it is a prop of a MEMOISED child, and the fold
   * map changes far more often than anything the child draws. Read at call time, which is
   * the only moment its value matters — nothing here reacts to it.
   */
  const handleJumpToComment = useCallback((group: ReviewCommentGroup, comment: ReviewComment) => {
    if (!review) return
    if (useStore.getState().collapsedFiles[reviewFileKey(review.repoPath, group.path)]) {
      toggleReviewFileCollapsed(review.repoPath, group.path)
    }
    focusFileComment(
      { repoPath: review.repoPath, path: group.path, fingerprint: comment.fingerprint },
      comment.id,
    )
  }, [review, toggleReviewFileCollapsed, focusFileComment])

  /**
   * Scroll onto the focused comment, and keep trying until its line is actually there.
   *
   * The row is found through the marker CodeView stamps — `data-comment-ids` is a
   * space-separated list of the comments on that row, which is exactly what `~=` matches —
   * so this asks the same document the highlight is drawn on rather than re-deriving line
   * numbers here. Until that row exists the scroll falls back to the card, which is the
   * best answer available while the file is still being read, and `commentJumpRef` keeps
   * the jump open so the next content change finishes it.
   *
   * Animated, unlike the anchor a few effects up, because this one IS a step the reader
   * asked for — the same travel the navigator's arrows make, for the same reason. It also
   * has the side effect of leaving the container somewhere the anchor did not put it, which
   * is precisely how the anchor knows to stop re-anchoring.
   */
  useEffect(() => {
    if (!review || !focusedComment) return
    if (commentJumpRef.current === focusedComment.seq) return
    const container = scrollRef.current
    const content = contentRef.current
    if (!container || !content) return

    const fileIndex = review.files.findIndex(f => f.path === focusedComment.target.path)
    if (fileIndex < 0) return
    const card = cardFor(content, fileIndex)
    if (!card) return
    const row = card.querySelector<HTMLElement>(`.line[data-comment-ids~="${focusedComment.id}"]`)
    // Only a landing on the ROW counts as done. Reaching the card is a stop on the way.
    if (row) commentJumpRef.current = focusedComment.seq

    const view = readView(container)
    animateScrollTo(container, scrollTargetFor(
      row ?? card,
      cumulativeOffsetTop(container),
      view,
      // The row lands where a change lands — below the sticky header, with a few lines of
      // context above it — while a card lands where the review's own anchor puts one, by
      // the same `ANCHOR_MARGIN_PX` `anchorTargetFor` hands it.
      row ? view.contextPx : ANCHOR_MARGIN_PX,
    ))
    // `contentVersion` is the retry: it is bumped by the resize observer, which is what
    // fires when the card being jumped into unfolds or its read lands.
  }, [review, focusedComment, contentVersion, readView, animateScrollTo])

  /**
   * The ruler's MARKS, which depend on the shape of the review and not on where it is
   * scrolled to.
   *
   * `rulerSegments` projects every block through `trackHeight / contentHeight`, so the
   * only two numbers it reads out of the view are the content's height and the
   * viewport's. `currentScrollTop` reaches the band through `rulerViewport` alone — the
   * moving indicator — which is exactly why that one stays on the render path below
   * while this does not.
   *
   * Worth a memo because the panel re-renders on EVERY scroll event to move that
   * indicator, and a repository review is where the marks stopped being cheap: a few
   * hundred blocks, each a projection, then a sort and a copy per mark inside
   * `mergeRulerSegments`. Recomputing the lot sixty times a second also handed the band
   * a fresh array every frame, so every mark in it reconciled on a redraw that could not
   * have moved any of them.
   */
  const rulerMarks = useMemo(
    () => (scrollView && hasBlocks ? mergeRulerSegments(rulerSegments(blocks, scrollView)) : null),
    // The two fields rather than `scrollView` itself: keying on the object would defeat
    // the memo on the very path it exists for, and those two are the whole of what
    // `rulerSegments` reads out of it.
    [blocks, hasBlocks, scrollView?.contentHeight, scrollView?.viewportHeight],
  )

  if (!isOpen) return null

  // Only for the drawer's left rail. A REVIEW gets the neutral one: `statusConfigFor`
  // answers for one status, and a repository holds several — painting the rail from any
  // one file's would state something false about the other thirty-nine.
  const statusCfg = selectedFile ? statusConfigFor(selectedFile.status) : null

  /**
   * The ruler's geometry, recomputed each render from the numbers in state — or `null`
   * for the previews that get no ruler at all.
   *
   * ONE object, and one condition, because the answer is needed in three places: the
   * band itself, the gutter that keeps code from running under it, and the props. Three
   * separate tests of "is there a ruler" could be edited apart; this cannot.
   *
   * Gated on there being a block, which is the whole of the rule and needs no special
   * case of its own. A markdown card IN RENDERED MODE, or an image card, produces no
   * `.line[data-diff]` — MarkdownView paints prose, not annotated rows — and neither
   * does the spec preview's empty status, so all of them arrive here with nothing to
   * draw. A markdown card in its default RAW mode is an ordinary CodeView and does
   * contribute rows, which is the point of that default.
   *
   * So the repository-wide total the ruler and the counter stand on shifts as a reader
   * flips one card to rendered and back. That is correct rather than a leak: the sweep
   * at `useLayoutEffect` re-runs on the content-height change the swap causes, and a
   * navigator that stepped to a change no longer on screen would be worse. It also
   * covers the case where the content is shorter than its own viewport,
   * which is right: a ruler over a view that cannot scroll is a control with nowhere to
   * send anyone.
   *
   * `mergeRulerSegments` — folded into `rulerMarks` above — is what keeps the band
   * legible once a repository's worth of marks is projected onto it. It is a no-op on
   * anything sparse, so a one-file review is drawn exactly as it has always been.
   *
   * Only the INDICATOR is computed here: it is the one part that moves with the scroll,
   * and it is a single projection rather than one per block.
   */
  const ruler = rulerMarks && scrollView
    ? { segments: rulerMarks, viewport: rulerViewport(scrollView) }
    : null

  return (
    <>
      <div
        className="fixed inset-0 z-[59]"
        onClick={handleClose}
      />
      <div className={`fixed right-0 top-0 h-full w-[70%] z-[60] flex flex-col bg-bg border-l-4 ${statusCfg?.border ?? 'border-l-line'} ${isClosing ? 'animate-slide-out' : 'animate-slide-in'}`}>
        {review ? (
          <ReviewHeader
            repoName={review.repoName}
            repoPath={review.repoPath}
            fileCount={review.files.length}
            counts={repoCounts}
            onClose={handleClose}
          />
        ) : selectedFile && (
          <FileHeader
            filePath={selectedFile.path}
            status={selectedFile.status}
            canExpand={canExpand}
            showWholeFile={showWholeFile}
            counts={layout.counts}
            onToggleWholeFile={handleToggleWholeFile}
            onClose={handleClose}
          />
        )}
        {/* The navigator and the ruler are SIBLINGS of the scroller, not children of it.
            An absolutely positioned descendant of an `overflow-auto` element joins that
            element's scrollable overflow, so the navigator's `bottom-4` would anchor to
            the top of the document and the card would scroll off with the code — and the
            ruler's `top-0 bottom-0` would size itself to the whole review rather than to
            the window. This wrapper is the positioning context instead. `flex-1 min-h-0`
            moves onto it, since it is now the flex child. */}
        <div className="relative flex-1 min-h-0 flex flex-col">
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            tabIndex={-1}
            /* `RULER_GUTTER` matches the band's own width, and only appears with it:
               the `<pre>` inside CodeView scrolls horizontally on its own, so a long
               line dragged to the right would otherwise run under the band. It changes
               nothing vertically, so the geometry measured still holds.

               `focus-visible:outline-none` because the app paints a 2px accent ring on
               `:focus-visible` globally (renderer/index.css), and Chromium matches it on
               a `tabindex="-1"` element that takes focus — it cannot tell the modality —
               so opening the drawer drew that ring around the whole code area. Suppressed
               HERE and nowhere else: this element is deliberately out of the tab order
               and exists as a scroll target, so a keyboard user never arrives on it and
               the ring tells them nothing. Every control that IS tabbable keeps it. */
            className={`flex-1 min-h-0 overflow-auto [will-change:transform] focus-visible:outline-none ${ruler ? RULER_GUTTER : ''}`}
          >
            {/* The content wrapper: what the resize observer watches, and what the
                measurement sweep is handed. Rendered in BOTH modes — the single-file one
                gets no classes of its own, so it adds a box and changes no layout, but
                it is what keeps `findScrollContainer` resolving the scroller rather than
                looking above it.

                In a review, cards are NEVER unmounted when they scroll out of view.
                That, and not the read cache, is what makes a long review scroll without
                re-reading anything: a virtualised list would unmount a card, throw away
                its measured rows, and mount it again a scroll later at a different
                height — moving every offset below it each time. */}
            <div ref={contentRef} className={review ? 'p-3 space-y-3' : undefined}>
              {review ? (
                review.files.length === 0 ? (
                  <div className="flex items-center justify-center h-32 text-text-secondary text-sm italic">
                    {t('filePreview.noChangedFiles')}
                  </div>
                ) : (
                  review.files.map((file, index) => (
                    <FileReviewCard
                      key={file.path}
                      repoPath={review.repoPath}
                      file={file}
                      fileIndex={index}
                      // The ref OBJECT, not the node: `useRef` keeps one identity for
                      // the life of the panel, so handing it down costs the memo below
                      // nothing. A card needs it to observe itself against the scroller
                      // — resolving that by walking the DOM would not work here, because
                      // `findScrollContainer` only answers once the content overflows,
                      // and cards mount before their reads have given them any height.
                      scrollerRef={scrollRef}
                      // Stable by construction — see `reportFingerprint` above.
                      onFingerprintChange={reportFingerprint}
                    />
                  ))
                )
              ) : selectedFile && (
                /* Pinned to the rendered view, and no toggle beside it: the one caller
                   left is the spec panel's Maximize button, whose file is read with
                   `status: ''` and therefore carries no diff to go back to. */
                <FileContentRenderer
                  repoPath={selectedFile.repoPath}
                  filePath={selectedFile.path}
                  status={selectedFile.status}
                  markdownMode="rendered"
                  showWholeFile={showWholeFile}
                  onCollapsibleChange={setCanExpand}
                />
              )}
            </div>
          </div>
          {/* A segment goes through `goToBlock`, the arrows' own step, so clicking a
              mark and clicking "next" onto it land on exactly the same pixel. */}
          {ruler && (
            <ChangeRuler
              segments={ruler.segments}
              viewport={ruler.viewport}
              onSelectBlock={goToBlock}
              onJumpTo={handleJumpTo}
            />
          )}
          {/* Repo-wide, all of them: the counter reads over every change in the
              repository and the arrows walk the same flat list.

              `foldedFiles` is what keeps the bar on screen when the cards are folded away:
              the blocks are measured off the rows that are MOUNTED, so folding a card takes
              its changes out of `total` while they are still there to come back to. It is
              deliberately NOT the repository's `+N −M` — that is true of a one-change review
              as well, which is how this bar came to stand over a review with two greyed-out
              arrows and nothing to point them at. A single-file preview has no cards to fold,
              so it passes zero and keeps the behaviour it has always had.

              The comments button is mounted for every REVIEW, count or no count, and
              disables itself at zero — the same rule the arrows follow at the ends of the
              list, and for the same reason: a control that appears the moment there is
              something in it changes the bar's shape under the cursor. The single-file
              preview gets none: it is not a review, and nothing there can be commented. */}
          <ChangeNavigator
            current={currentIndex + 1}
            total={blocks.length}
            foldedFiles={foldedFiles}
            /* Both of the next two come from `commentGroups`, which is what keeps the bar's
               guard and the panel it opens from ever disagreeing. */
            commentCount={commentCount}
            trailing={review ? (
              <ReviewCommentsButton
                repoPath={review.repoPath}
                groups={commentGroups}
                total={commentCount}
                onJump={handleJumpToComment}
                /* The paste is waiting for Enter in a prompt that is behind this drawer. */
                onSent={handleClose}
              />
            ) : undefined}
            onPrevious={goToPrevious}
            onNext={goToNext}
          />
        </div>
      </div>
    </>
  )
}
