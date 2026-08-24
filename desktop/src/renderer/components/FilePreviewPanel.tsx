import { useCallback, useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { useStore } from '../store'
import FileContentRenderer from './file-preview/FileContentRenderer'
import ChangeNavigator from './file-preview/ChangeNavigator'
import ChangeRuler, { RULER_GUTTER } from './file-preview/ChangeRuler'
import {
  blockScrollTop, jumpScrollTop, resolveBlockIndex, rulerSegments, rulerViewport,
  type MarkerBlock, type ScrollView,
} from '../utils/diffMarkers'

const STATUS_CONFIG: Record<string, { label: string; color: string; border: string }> = {
  modified:  { label: 'M', color: 'text-yellow  bg-yellow/10  border-yellow/20',  border: 'border-l-yellow' },
  added:     { label: 'A', color: 'text-green   bg-green/10   border-green/20',   border: 'border-l-green' },
  deleted:   { label: 'D', color: 'text-red     bg-red/10     border-red/20',     border: 'border-l-red' },
  renamed:   { label: 'R', color: 'text-accent  bg-accent/10  border-accent/20',  border: 'border-l-accent' },
  untracked: { label: 'U', color: 'text-orange  bg-orange/10  border-orange/20',  border: 'border-l-orange' },
}

/**
 * How long a step between two changes takes.
 *
 * Short on purpose: this is a navigation control, and the arrows are meant to be
 * pressed in a row. Anything long enough to notice as an animation is long enough to
 * queue up behind, and the second press would land while the first is still moving.
 */
const SCROLL_MS = 180

/**
 * How far the container may sit from the position the step last wrote and still be
 * considered untouched.
 *
 * Not zero: `scrollTop` is snapped to a device pixel on write, so the value read back
 * on a fractional-DPR display is a hair off the one asked for. One pixel is below what
 * any real scroll input produces and above that rounding.
 */
const SCROLL_TAKEOVER_PX = 1

const EXT_LABELS: Record<string, string> = {
  ts: 'TypeScript', tsx: 'TSX', js: 'JavaScript', jsx: 'JSX',
  py: 'Python', rs: 'Rust', go: 'Go', rb: 'Ruby', java: 'Java',
  md: 'Markdown', markdown: 'Markdown', json: 'JSON', yaml: 'YAML',
  yml: 'YAML', toml: 'TOML', css: 'CSS', scss: 'SCSS', html: 'HTML',
  sh: 'Shell', bash: 'Shell', vue: 'Vue', svelte: 'Svelte', sql: 'SQL',
  png: 'PNG', jpg: 'JPEG', jpeg: 'JPEG', gif: 'GIF', svg: 'SVG', webp: 'WebP',
}

function getExtLabel(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() ?? ''
  return EXT_LABELS[ext] ?? ext.toUpperCase()
}

/**
 * The container's geometry, as one object.
 *
 * A plain function taking `contextPx` rather than a closure over it: this is read both
 * from `handleBlocksMeasured`, which has the freshly measured value in hand and no
 * business waiting a render for state to catch up, and from the hook below, which has
 * the one in state. A captured `contextPx` could only ever serve the second.
 */
function readScrollView(container: HTMLDivElement, contextPx: number): ScrollView {
  return {
    viewportHeight: container.clientHeight,
    contentHeight: container.scrollHeight,
    currentScrollTop: container.scrollTop,
    contextPx,
  }
}

export default function FilePreviewPanel() {
  const selectedFile = useStore(s => s.selectedFile)
  const closeFilePreview = useStore(s => s.closeFilePreview)
  const activeTerminalId = useStore(s => s.activeTerminalId)
  const prevTerminalId = useRef(activeTerminalId)
  const [isClosing, setIsClosing] = useState(false)
  const isClosingRef = useRef(false)
  const [prevSelectedFile, setPrevSelectedFile] = useState(selectedFile)
  const [scrollSeq, setScrollSeq] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)
  const scrollAnimationRef = useRef<number | null>(null)
  /** Where the animated step last put the container, so a scroll it did not cause is recognisable. */
  const lastStepScrollTop = useRef<number | null>(null)
  const [blocks, setBlocks] = useState<MarkerBlock[]>([])
  const [contextPx, setContextPx] = useState(0)
  const [currentIndex, setCurrentIndex] = useState(0)
  /**
   * The container's geometry, in state rather than read at paint time.
   *
   * The navigator only needs it when something is clicked, and reads it live; the ruler
   * has to be REDRAWN whenever it changes, and a render is the only thing that redraws
   * anything. Null until the first measurement, which is also "no ruler yet".
   */
  const [scrollView, setScrollView] = useState<ScrollView | null>(null)
  /**
   * Whether there is a ruler at all — see the `ruler` object below for what the
   * condition means. Named here because the resize observer has to gate on it too, and
   * a condition spelled twice is a condition that gets edited once.
   */
  const hasBlocks = blocks.length > 0

  // Every selection — including re-clicking the file already on screen — is a fresh
  // object from `setSelectedFile`, so this fires on each one. That is the whole
  // point of it: on a re-click the path, the status and the cached content are all
  // unchanged, nothing below re-reads anything, and this is the only signal left to
  // tell CodeView to take the reader back to the first change after they have
  // scrolled away from it. Bumped inline during render rather than from an effect —
  // `selectedFile` already carries a fresh identity per click, so comparing it
  // against the previous render is enough; React applies the state update before
  // committing, with no extra effect-and-re-render round trip.
  //
  // Clearing the navigator and the ruler belongs here for a second reason on top of
  // that one: it has to happen BEFORE the new file's CodeView reports its blocks, and a
  // `useEffect` cannot. CodeView measures in a LAYOUT effect, which runs ahead of
  // this component's passive effects, and FileContentRenderer seeds its state from
  // `readCache` — so a file already read mounts CodeView in the very same commit, and
  // a reset landing afterwards would blank a card that had just been measured.
  if (selectedFile !== prevSelectedFile) {
    setPrevSelectedFile(selectedFile)
    if (selectedFile) setScrollSeq(n => n + 1)
    setBlocks([])
    setContextPx(0)
    setCurrentIndex(0)
    setScrollView(null)
  }

  // CodeView has just anchored the view on the first change, so that is where the
  // counter starts — no measurement of our own is needed to know it.
  const handleBlocksMeasured = useCallback((measured: MarkerBlock[], measuredContextPx: number) => {
    setBlocks(measured)
    setContextPx(measuredContextPx)
    setCurrentIndex(0)
    // Seed the ruler here rather than wait for a scroll event to bring the geometry in.
    // CodeView reports the blocks BEFORE it performs its anchor scroll, and when
    // `selectScrollTop` answers null there is no scroll at all and therefore no event
    // to correct a missing read — the band would stay unrendered on every file that
    // opens already showing its first change. Where the scroll DOES happen, the event
    // it fires replaces this read a frame later, so the stale `scrollTop` here never
    // reaches the screen. `measuredContextPx` is passed explicitly because the value in
    // state is still the 0 that predates the measurement being reported right now.
    const container = scrollRef.current
    setScrollView(container ? readScrollView(container, measuredContextPx) : null)
  }, [])

  /**
   * The container as it is RIGHT NOW. Never the heights CodeView measured at mount:
   * a `contentHeight` from before the last highlight would put the end-of-travel
   * comparison off, and that comparison is what makes the last changes reachable.
   * `contextPx` is the one number that legitimately comes from the measurement —
   * it is a row height, and rows do not change under the reader.
   */
  const readView = useCallback(
    (container: HTMLDivElement): ScrollView => readScrollView(container, contextPx),
    [contextPx],
  )

  const stopScrollAnimation = useCallback(() => {
    lastStepScrollTop.current = null
    if (scrollAnimationRef.current === null) return
    cancelAnimationFrame(scrollAnimationRef.current)
    scrollAnimationRef.current = null
  }, [])

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
   * duration scales with the distance — a jump across a long file takes half a second
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

  /**
   * Redraw the ruler when the container is resized.
   *
   * The band is drawn to the geometry of the last scroll, and a resize changes that
   * geometry without producing a scroll event. Left alone, the segments and the
   * indicator keep the scale they were measured at — and `segmentIndexAt` hit-tests
   * against those same offsets, so a click resolves to the wrong block or to none.
   * The failure is a quiet one: `handleJumpTo` reads the rect live and stays correct,
   * so bare-track clicks keep working while the segments lie, until the next scroll
   * event happens to fix it.
   *
   * Observing the scroller rather than listening for `resize` on the window is what
   * catches the rest of the cases — the drawer is 70% of the window, but the sidebar
   * collapsing or a devtools split resizes it with the window itself untouched.
   *
   * The observer fires once on `observe()`, which costs one redundant render and is
   * left in: the alternative is a first-callback flag to skip a read that is correct
   * anyway.
   */
  useEffect(() => {
    const container = scrollRef.current
    if (!container || !hasBlocks || typeof ResizeObserver === 'undefined') return

    const observer = new ResizeObserver(() => setScrollView(readView(container)))
    observer.observe(container)
    return () => observer.disconnect()
  }, [hasBlocks, readView])

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

  useEffect(() => {
    if (selectedFile) {
      isClosingRef.current = false
      setIsClosing(false)
    }
  }, [selectedFile])

  useEffect(() => {
    if (prevTerminalId.current !== activeTerminalId) {
      prevTerminalId.current = activeTerminalId
      handleClose()
    }
  }, [activeTerminalId, handleClose])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedFile !== null) {
        handleClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [selectedFile, handleClose])

  // Alt+↑/↓ walks the changes. Kept apart from the Escape listener above rather than
  // folded into it: that one is on `document` by the modal convention and closes the
  // panel, this one is a navigation shortcut and only ever fires while the drawer is
  // open on a file with somewhere to go.
  useEffect(() => {
    if (!selectedFile || blocks.length < 2) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!e.altKey || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return
      // A terminal owns its arrow keys — history, and whatever the running program
      // binds Alt+arrow to. xterm listens at the target phase and this listener
      // bubbles to the window, so it could not have cancelled that anyway; what it
      // must not do is act on a keystroke that was never aimed at the panel.
      // (`.xterm` is the class the library puts on the element it is opened into.)
      if (e.target instanceof Element && e.target.closest('.xterm')) return
      // preventDefault only on the branches that act, so an Alt+arrow this panel does
      // not use keeps whatever meaning it has elsewhere.
      e.preventDefault()
      // The card's own two steps, not a second copy of the arithmetic: the keyboard
      // and the arrows cannot end up disagreeing about what "next" means.
      if (e.key === 'ArrowUp') goToPrevious()
      else goToNext()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedFile, blocks.length, goToPrevious, goToNext])

  // Focus the drawer when it opens. This, not the `.xterm` check above, is what
  // actually keeps the terminal out of it: a focused panel is where the keystrokes
  // arrive in the first place. It also restores native arrow-key scrolling inside the
  // preview. `preventScroll` because the browser would otherwise scroll the freshly
  // focused container back to the top — straight over the anchoring CodeView just did.
  useEffect(() => {
    if (selectedFile) scrollRef.current?.focus({ preventScroll: true })
  }, [selectedFile])

  // The container outlives the file shown in it, so a step still in flight when the
  // reader switches files would keep writing scrollTop into the next one — fighting
  // the anchoring CodeView is doing for it at that exact moment. Also covers unmount,
  // where the callback would otherwise touch a detached element.
  useEffect(() => stopScrollAnimation, [selectedFile, stopScrollAnimation])

  if (!selectedFile) return null

  const fileName = selectedFile.path.split('/').pop() ?? selectedFile.path
  const relativePath = selectedFile.path
  // No fallback to `modified` for an EMPTY status. The fallback exists for a git
  // status this version does not know — showing "M" beats showing nothing there —
  // but an empty status means the file is not a git change at all (the live spec
  // panel opens the spec this way), and badging it "M" with a yellow rail states
  // something false about it.
  const statusCfg = selectedFile.status ? (STATUS_CONFIG[selectedFile.status] ?? STATUS_CONFIG.modified) : null
  const extLabel = getExtLabel(selectedFile.path)

  /**
   * The ruler's geometry, recomputed each render from the numbers in state — or `null`
   * for the files that get no ruler at all.
   *
   * ONE object, and one condition, because the answer is needed in three places: the
   * band itself, the gutter that keeps code from running under it, and the props. Three
   * separate tests of "is there a ruler" could be edited apart; this cannot.
   *
   * Gated on there being a block, which is the whole of the rule and needs no special
   * case of its own. A markdown or an image preview never calls `onBlocksMeasured`, and
   * an unchanged file renders no `.line[data-diff]`, so both arrive here with nothing to
   * draw. It also covers the case where CodeView found no scrollable container — content
   * shorter than its own viewport — which is right: a ruler over a view that cannot
   * scroll is a control with nowhere to send anyone.
   */
  const ruler = scrollView && hasBlocks
    ? { segments: rulerSegments(blocks, scrollView), viewport: rulerViewport(scrollView) }
    : null

  return (
    <>
      <div
        className="fixed inset-0 z-[59]"
        onClick={handleClose}
      />
      <div className={`fixed right-0 top-0 h-full w-[70%] z-[60] flex flex-col bg-bg-secondary border-l-4 ${statusCfg?.border ?? 'border-l-line'} ${isClosing ? 'animate-slide-out' : 'animate-slide-in'}`}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-line shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            {statusCfg && (
              <span className={`shrink-0 inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold border ${statusCfg.color}`}>
                {statusCfg.label}
              </span>
            )}
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-medium text-ink truncate">{fileName}</span>
              <span className="text-xs text-text-secondary truncate">{relativePath}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 ml-3 shrink-0">
            <span className="text-[10px] font-medium text-text-secondary bg-surface border border-line-field rounded px-1.5 py-0.5">
              {extLabel}
            </span>
            <button
              onClick={handleClose}
              className="p-1.5 rounded-md hover:bg-surface-strong text-text-secondary hover:text-ink transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>
        {/* The navigator and the ruler are SIBLINGS of the scroller, not children of
            it. An absolutely positioned descendant of an `overflow-auto` element joins
            that element's scrollable overflow, so `bottom-4` would anchor to the top of
            the document and the card would scroll off with the code — and the ruler's
            `top-0 bottom-0` would size itself to the whole file rather than to the
            window. This wrapper is the positioning context instead — same shape as
            SpecPanel's scroll-to-bottom button. `flex-1 min-h-0` moves onto it, since
            it is now the flex child. */}
        <div className="relative flex-1 min-h-0 flex flex-col">
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            tabIndex={-1}
            /* `RULER_GUTTER` matches the band's own width, and only appears with it:
               the `<pre>` inside CodeView scrolls horizontally on its own, so a long
               line dragged to the right would otherwise run under the band. It changes
               nothing vertically, so the geometry CodeView measured still holds. */
            className={`flex-1 min-h-0 overflow-auto [will-change:transform] ${ruler ? RULER_GUTTER : ''}`}
          >
            <FileContentRenderer
              repoPath={selectedFile.repoPath}
              filePath={selectedFile.path}
              status={selectedFile.status}
              scrollSeq={scrollSeq}
              onBlocksMeasured={handleBlocksMeasured}
            />
          </div>
          <ChangeNavigator
            current={currentIndex + 1}
            total={blocks.length}
            onPrevious={goToPrevious}
            onNext={goToNext}
          />
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
        </div>
      </div>
    </>
  )
}
