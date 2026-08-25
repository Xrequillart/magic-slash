import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { ChevronDown } from 'lucide-react'
import FileContentRenderer, { isMarkdownPath } from './FileContentRenderer'
import ChangeCountChip from './ChangeCountChip'
import { MarkdownModeToggle, StatusBadge, WholeFileToggle } from './FileHeader'
import { reservedCardHeight, reviewFileKey } from '../../utils/reviewLayout'
import type { MarkdownMode } from '../../utils/markdownPath'
import { useStore } from '../../store'
import { useT } from '../../i18n'
import type { ChangedFile } from '../../../types'

/**
 * A rough code row, for sizing a card that has not been read yet.
 *
 * CodeView renders at `text-xs leading-relaxed` — 12 px on a 1.625 line-height, so
 * 19.5 px — and the reservation is an estimate on top of an estimate anyway (nothing
 * here can know how many regions a file's changes fall into). Twenty is that number
 * rounded to something a reader of this file can check against the class list.
 */
const ESTIMATED_LINE_HEIGHT_PX = 20

interface Props {
  repoPath: string
  /** From the review's FROZEN list, so this object's identity is stable for its lifetime. */
  file: ChangedFile
  /**
   * This card's place in that list. Written to the DOM as `data-file-index`, which is
   * how the panel's single measurement sweep tells one card's rows from another's —
   * the cards report nothing themselves.
   */
  fileIndex: number
  /**
   * The scroller this card lives in, as the panel's own stable ref object.
   *
   * Only ever read inside an effect, so the node is there by the time it matters:
   * React attaches a parent's ref in the layout phase, and passive effects run after
   * the whole of it.
   */
  scrollerRef: RefObject<HTMLDivElement>
}

/**
 * One changed file in a repository review: a header that says what it is, and the diff
 * under it.
 *
 * The card owns the three pieces of state that BELONG to a file rather than to the
 * drawer. The first two were panel-level while the drawer showed one file, and leaving
 * them there would have put a control for one file in a header describing forty:
 *
 * - `showWholeFile`, the story-220 toggle between the changed regions and the whole file
 * - `canExpand`, whether this particular read even produced a collapsed rendering
 * - `markdownMode`, raw diff or formatted document, for the markdown files among them
 *
 * Card-local state is also what makes those choices per file and forgotten when the
 * drawer is closed and opened again — the review reopens on the diff, which is the state
 * a reader coming back to it means to be in.
 *
 * It deliberately does NOT own whether it is collapsed. That lives in the store, so it
 * survives the drawer closing and opening again, and so a card folding shut re-renders
 * itself alone rather than the whole review.
 */
function FileReviewCard({ repoPath, file, fileIndex, scrollerRef }: Props) {
  const t = useT()
  // Built once per file rather than inside the selector: zustand runs every subscriber's
  // selector on every store mutation, and this store is a busy one — terminal state,
  // config, the git poll. With forty cards mounted, a key rebuilt in the selector is
  // forty string concatenations per unrelated action.
  const key = useMemo(() => reviewFileKey(repoPath, file.path), [repoPath, file.path])
  // Subscribed to per card, not handed down: a boolean selector means collapsing one
  // card re-renders that card, while the other thirty-nine — each holding a shiki
  // document — are left alone.
  const collapsed = useStore(s => s.collapsedFiles[key] ?? false)
  // A store action, so its identity never changes and `memo` below keeps holding.
  const toggleCollapsed = useStore(s => s.toggleReviewFileCollapsed)

  const [showWholeFile, setShowWholeFile] = useState(false)
  const [canExpand, setCanExpand] = useState(false)
  const [markdownMode, setMarkdownMode] = useState<MarkdownMode>('raw')

  // From the PATH, not from the read: the header is drawn while the body is still a
  // skeleton, and a toggle that appeared a beat after its card would read as a glitch.
  const isMarkdown = isMarkdownPath(file.path)

  // Whether the header is currently pinned to the top of the scroller, which is only
  // ever used to square off its top corners: rounded corners flush against the window
  // edge read as a card that has escaped its list.
  //
  // There is no CSS for this on Chromium 120 — `:stuck` and scroll-state container
  // queries landed well after the Electron this app ships. So: a zero-height sentinel at
  // the top of the card, watched against the scroller. When it leaves the top, the
  // header has taken its place. That is what an IntersectionObserver is for, and it
  // keeps the question off the scroll path entirely — no handler, no measurement, no
  // work on the frames where nothing crosses.
  //
  // React state rather than a class toggled onto the node: the panel re-renders on every
  // scroll frame and would wipe an imperative class on the next pass. The cost is one
  // re-render of THIS card as it crosses, and `FileContentRenderer` below is memoised on
  // stable props, so React bails out before touching the shiki document underneath.
  const [stuck, setStuck] = useState(false)
  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const sentinel = sentinelRef.current
    const root = scrollerRef.current
    if (!sentinel || !root) return
    const observer = new IntersectionObserver(
      ([entry]) => setStuck(!entry.isIntersecting),
      { root, threshold: 0 },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [scrollerRef])

  const handleToggleCollapsed = useCallback(
    () => toggleCollapsed(repoPath, file.path),
    [toggleCollapsed, repoPath, file.path],
  )
  const handleToggleWholeFile = useCallback(() => setShowWholeFile(v => !v), [])

  const fileName = file.path.split('/').pop() ?? file.path
  const bodyId = `review-file-${fileIndex}`
  const collapseLabel = t(collapsed ? 'filePreview.expandFile' : 'filePreview.collapseFile')

  return (
    <section
      // The one thing the panel's sweep needs from a card. It stays on the OUTER
      // element rather than on the body, so a row's `closest('[data-file-index]')`
      // resolves whether or not the body is currently rendered.
      data-file-index={fileIndex}
      // NO `overflow-hidden` here, deliberately, however much the rounded corners below
      // ask for it: `overflow: hidden` makes this element a scroll container, and a
      // `sticky` child sticks to its NEAREST scrolling ancestor. The header would then
      // be pinned to a box that never scrolls — laid out correctly, and never sticking
      // to anything. The body clips its own corners instead.
      className="rounded-xl border border-line"
    >
      {/* Zero height, no margin, nothing to see: it exists only to be watched. It marks
          where the top of the card WOULD be, which is the one thing a stuck header can
          no longer tell you about itself. */}
      <div ref={sentinelRef} className="h-0" aria-hidden />

      {/* `bg-surface` against the drawer's `bg-bg-secondary`: the header is the part
          that has to be findable while scrolling past forty of them, and a tint plus a
          border is what separates it from the code below without a second rule.

          STICKY, which is the whole point of the card being a `section` with the header
          as its first child: sticky is constrained to its containing block, so this one
          pins to the top of the scroller while its own file is on screen and is then
          pushed out by the next card's header arriving underneath it. That gives the
          replace-on-file-change behaviour with no scroll handler and no measurement —
          the constraint does it.

          The background has to be OPAQUE for that, and `bg-surface` is NOT: every
          `surface*` token in the palette is an rgba white at a few percent, meant as a
          TINT over something else — `--c-surface` is `rgba(255,255,255,0.06)`. On a card
          sitting on the drawer that reads as a solid panel; under a header floating over
          scrolling code it lets every line through.

          So the same two layers are stacked explicitly: the drawer's own opaque
          background as the background-COLOR, and that tint over it as a flat
          background-IMAGE. Composites to exactly what the header looked like before, and
          stays theme-safe — both halves are the variables the theme rewrites.

          Two utilities rather than one comma-separated `bg-[…]` on purpose: Tailwind
          infers colour-versus-image from the shape of an arbitrary value, and a list
          opening with `linear-gradient(` is read as an image — which would make the
          opaque half an invalid image layer that paints nothing, putting the
          transparency straight back.

          `z-10` puts it above the rows of its own card. It does not compete with the
          ruler or the navigator: those are siblings of the SCROLLER, which has
          `will-change: transform` and therefore its own stacking context, so everything
          in here is painted as one layer underneath them.

          `data-card-header` is read once per measurement sweep, to keep the height of
          this bar out of the margin the scroll leaves above a block — without it, every
          "next change" would land the block under this header. */}
      <div
        data-card-header
        className={`sticky top-0 z-10 flex items-center gap-2.5 px-3 py-2.5 bg-bg-secondary bg-[linear-gradient(var(--c-surface),var(--c-surface))] ${stuck ? '' : 'rounded-t-xl'} ${collapsed ? 'rounded-b-xl' : ''}`}
      >
        <button
          type="button"
          onClick={handleToggleCollapsed}
          aria-expanded={!collapsed}
          aria-controls={bodyId}
          title={collapseLabel}
          aria-label={collapseLabel}
          className="shrink-0 p-1 -m-1 rounded text-text-secondary hover:text-ink hover:bg-surface-strong transition-colors border-none cursor-pointer bg-transparent"
        >
          {/* Rotated rather than swapped for a second icon, so the state reads as one
              control turning — the same gesture PRWatchCard uses for its checks list. */}
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${collapsed ? '-rotate-90' : ''}`} />
        </button>

        {/* The same badge the drawer's own header draws, never a second one — table and
            rendering both, so the two cannot drift. */}
        <StatusBadge status={file.status} />

        {/* The whole path, not just the file name: two files called `index.ts` in one
            review are the ordinary case, and the name alone would not tell them apart.
            The name is repeated above it at reading weight so the list is scannable.

            Clickable, but a plain element rather than a second button — it folds the
            card because a title bar that does nothing when clicked is a surprise, and
            the chevron beside it is already the labelled, focusable control that does
            the same thing. Making this one focusable too would put two tab stops on one
            action; hiding it from assistive tech instead would hide the file's name. */}
        <div
          onClick={handleToggleCollapsed}
          className="flex flex-col min-w-0 flex-1 cursor-pointer"
        >
          <span className="text-sm font-medium text-ink truncate">{fileName}</span>
          <span className="text-xs text-text-secondary truncate" title={file.path}>{file.path}</span>
        </div>

        {/* This file's OWN figures, from the snapshot rather than from the measurement:
            they have to be right while the card is still loading, and they have to stay
            right while it is collapsed and there is nothing to measure. */}
        <ChangeCountChip counts={{ added: file.additions, removed: file.deletions }} surface="bg-bg-secondary" />

        {/* Only for markdown, which is the one file type with two readings. Per card and
            hidden while folded, for the same reasons as the fold toggle beside it. */}
        {isMarkdown && !collapsed && (
          <MarkdownModeToggle mode={markdownMode} onChange={setMarkdownMode} />
        )}

        {/* Per card, because the mode belongs to a FILE. A single toggle in the review
            header would claim to speak for forty of them. Hidden while the card is
            folded shut — there is nothing on screen for it to change.

            `canExpand` already covers rendered markdown: the renderer reports false
            whenever it is drawing prose, so there is no second test to make here. */}
        {canExpand && !collapsed && (
          <WholeFileToggle showWholeFile={showWholeFile} onToggle={handleToggleWholeFile} />
        )}
      </div>

      {/* `overflow-hidden` belongs on the BODY rather than on the section, so the card's
          bottom corners still clip the code without turning the section into a scroll
          container and killing the header's stickiness. Safe for long lines: CodeView
          gives its `<pre>` its own `overflow-auto`, so horizontal scrolling happens
          inside it and never reaches this box. */}
      {!collapsed && (
        <div id={bodyId} className="border-t border-line-subtle rounded-b-xl overflow-hidden">
          {/* `reservedHeight` holds the card open while its read is in flight, and only
              while it is — the renderer applies it to its own skeleton, which unmounts
              the moment the content lands, so a file shorter than the estimate leaves no
              blank space behind.

              It matters because cards resolve in whatever order their reads come back:
              without a reservation a file landing near the top pushes every card below
              it down, which moves the anchor the panel scrolled to and invalidates every
              offset measured under it. The panel would then read a scroll position it did
              not write as the reader taking over, and stop re-anchoring altogether.

              A number computed from the frozen file rather than a `loading` flag reported
              back up: the component that knows it is still reading is the one drawing the
              placeholder, so the size goes down instead of the state coming up.

              Every prop here is a string, a number, or a raw state setter — React
              guarantees setter identity for the life of this component — which is what
              keeps FileContentRenderer's memoisation holding across the panel's
              per-scroll-event re-renders. With N cards mounted, one unstable prop is N
              shiki documents re-rendered sixty times a second. */}
          <FileContentRenderer
            repoPath={repoPath}
            filePath={file.path}
            status={file.status}
            showWholeFile={showWholeFile}
            markdownMode={markdownMode}
            onCollapsibleChange={setCanExpand}
            reservedHeight={reservedCardHeight(file, ESTIMATED_LINE_HEIGHT_PX)}
            /* The ONE caller that turns commenting on — see `commentable` on
               FileContentRenderer's props for why, and why the other two do not. */
            commentable
          />
        </div>
      )}
    </section>
  )
}

/**
 * Memoised, and its props are chosen so the memo actually holds.
 *
 * The panel re-renders on every scroll event to move the ruler's viewport indicator.
 * `repoPath` is a string, `fileIndex` a number, and `file` comes from the review's
 * frozen list — so its identity is stable for as long as the review is open, which is
 * precisely what freezing that list bought. Nothing else is passed in: the collapsed
 * state and its setter are read from the store INSIDE the card, so neither the panel nor
 * a callback identity can be the thing that re-renders forty diffs.
 */
export default memo(FileReviewCard)
