import { useCallback, useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { useStore } from '../store'
import FileContentRenderer from './file-preview/FileContentRenderer'
import ChangeNavigator from './file-preview/ChangeNavigator'
import { blockScrollTop, resolveBlockIndex, type MarkerBlock, type ScrollView } from '../utils/diffMarkers'

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

function getExtLabel(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() ?? ''
  const MAP: Record<string, string> = {
    ts: 'TypeScript', tsx: 'TSX', js: 'JavaScript', jsx: 'JSX',
    py: 'Python', rs: 'Rust', go: 'Go', rb: 'Ruby', java: 'Java',
    md: 'Markdown', markdown: 'Markdown', json: 'JSON', yaml: 'YAML',
    yml: 'YAML', toml: 'TOML', css: 'CSS', scss: 'SCSS', html: 'HTML',
    sh: 'Shell', bash: 'Shell', vue: 'Vue', svelte: 'Svelte', sql: 'SQL',
    png: 'PNG', jpg: 'JPEG', jpeg: 'JPEG', gif: 'GIF', svg: 'SVG', webp: 'WebP',
  }
  return MAP[ext] ?? ext.toUpperCase()
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
  const [blocks, setBlocks] = useState<MarkerBlock[]>([])
  const [contextPx, setContextPx] = useState(0)
  const [currentIndex, setCurrentIndex] = useState(0)

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
  // Clearing the navigator belongs here for a second reason on top of that one: it
  // has to happen BEFORE the new file's CodeView reports its blocks, and a
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
  }

  // CodeView has just anchored the view on the first change, so that is where the
  // counter starts — no measurement of our own is needed to know it.
  const handleBlocksMeasured = useCallback((measured: MarkerBlock[], measuredContextPx: number) => {
    setBlocks(measured)
    setContextPx(measuredContextPx)
    setCurrentIndex(0)
  }, [])

  /**
   * The container as it is RIGHT NOW. Never the heights CodeView measured at mount:
   * a `contentHeight` from before the last highlight would put the end-of-travel
   * comparison off, and that comparison is what makes the last changes reachable.
   * `contextPx` is the one number that legitimately comes from the measurement —
   * it is a row height, and rows do not change under the reader.
   */
  const readView = useCallback((container: HTMLDivElement): ScrollView => ({
    viewportHeight: container.clientHeight,
    contentHeight: container.scrollHeight,
    currentScrollTop: container.scrollTop,
    contextPx,
  }), [contextPx])

  const handleScroll = useCallback(() => {
    const container = scrollRef.current
    if (!container || blocks.length === 0) return
    // Every frame of an animated step fires one of these, and the destination is
    // already known — `goToBlock` set the index before starting the travel. Reading
    // the counter off the positions being flown over would run it through every block
    // in between and land back on the right one: a flicker, not information. The last
    // frame clears the ref before its own scroll event is dispatched, so exactly one
    // of these gets through, at the final position, and reconciles.
    if (scrollAnimationRef.current !== null) return
    // Read live, and read once, OUTSIDE the updater below: the updater is a pure
    // function of the index and may be replayed, while these three numbers are only
    // right for the event being handled.
    const view = readView(container)
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
  }, [blocks, readView])

  const stopScrollAnimation = useCallback(() => {
    if (scrollAnimationRef.current === null) return
    cancelAnimationFrame(scrollAnimationRef.current)
    scrollAnimationRef.current = null
  }, [])

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

    const start = performance.now()
    const step = (now: number) => {
      const progress = Math.min((now - start) / SCROLL_MS, 1)
      // easeOutCubic: leaves immediately and settles gently, so the motion reads as a
      // step that landed rather than a scroll that drifted.
      container.scrollTop = from + distance * (1 - (1 - progress) ** 3)
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
        {/* The navigator is a SIBLING of the scroller, not a child of it. An
            absolutely positioned descendant of an `overflow-auto` element joins that
            element's scrollable overflow, so `bottom-4` would anchor to the top of the
            document and the card would scroll off with the code. This wrapper is the
            positioning context instead — same shape as SpecPanel's scroll-to-bottom
            button. `flex-1 min-h-0` moves onto it, since it is now the flex child. */}
        <div className="relative flex-1 min-h-0 flex flex-col">
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            // A hand on the wheel wins over a step in flight. Without this the two
            // write scrollTop in the same frame and the panel drags against the
            // reader for the rest of the animation.
            onWheel={stopScrollAnimation}
            tabIndex={-1}
            className="flex-1 min-h-0 overflow-auto [will-change:transform]"
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
        </div>
      </div>
    </>
  )
}
