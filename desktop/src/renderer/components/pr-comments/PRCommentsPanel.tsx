import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { MessagesSquare } from 'lucide-react'
import { useStore } from '../../store'
import { DRAWER_HEADER, DrawerCloseButton } from '../file-preview/FileHeader'
import { cumulativeOffsetTop } from '../../utils/scrollGeometry'
import { prUrlParts } from '../agent-info-sidebar/PRWatchCard'
import PRThread from './PRThread'
import { useT, type MessageKey } from '../../i18n'
import type { PRReviewThread } from '../../../types'

/**
 * A pull request's conversation, in the sliding drawer.
 *
 * THE SAME SHELL as `FilePreviewPanel` — the `z-[59]` backdrop, the `w-[70%]` panel on
 * `z-[60]`, `animate-slide-in`/`animate-slide-out`, the two-phase close with its 310 ms
 * timer — and a separate component rather than a third mode of it. That panel is already
 * two modes (a repository review and a single file) sharing one body, and both of those
 * modes are the SAME substance: a diff, measured, with a ruler, a change navigator, an
 * Alt+↑/↓ walk and a comment composer over it. None of that applies to a conversation,
 * so a third mode would be an `if` around the entire component — every hook it owns
 * running for a panel that measures nothing. What the two genuinely share is the shell,
 * and the shell is thirty lines of class names; what they must not diverge on is the
 * z-order and the animation timing, which is why both are spelled out with the same
 * numbers and the same reasons.
 *
 * Mutual exclusion is enforced in the STORE, not here: `openPRComments` clears
 * `selectedFile` and `review`, and `setSelectedFile` / `openRepoReview` / `openModal`
 * clear `prComments`. Two panels sharing one backdrop is the failure that would
 * otherwise be reachable — the reader would dismiss the top one and find the second
 * still there with nothing behind it.
 *
 * Mounted once, globally, and driven purely by store state; it takes no props.
 */

/**
 * How long the exit is given before the panel is actually torn down.
 *
 * 10 ms over the 300 ms of `animate-slide-out` (see `tailwind.config.cjs`). The buffer
 * is what stops the last frame of the slide being replaced by an abrupt unmount on a
 * machine where the timer fires a hair early. The same number as `FilePreviewPanel`'s,
 * deliberately: the two panels are the same drawer, and a reader switching between them
 * must not be able to feel which one they are closing.
 */
const CLOSE_MS = 310

/**
 * How much of whatever precedes the anchored thread stays visible.
 *
 * Enough to show the section heading or the tail of the thread above, so the anchor
 * lands as "here, in a list" rather than as the top of a document — the same reasoning,
 * and the same value, as `ANCHOR_MARGIN_PX` in `FilePreviewPanel`.
 */
const ANCHOR_MARGIN_PX = 12

/**
 * The three groups, in reading order, keyed by the `kind` the threads already carry.
 *
 * Inline threads first because they are what a review IS — an argument about specific
 * lines — and what anybody opens this panel to read. The PR conversation and the review
 * summaries follow: both are singletons (see `PRReviewThread`), and both are context for
 * the threads rather than the substance of them.
 *
 * A section with nothing in it is not rendered at all, heading included. A PR with no
 * inline threads is the ordinary case for a bot-reviewed branch, and an empty "Review
 * threads" heading over a gap says the panel failed rather than that the PR has none.
 */
const SECTIONS: { kind: PRReviewThread['kind']; label: MessageKey }[] = [
  { kind: 'inline', label: 'prComments.sectionThreads' },
  { kind: 'conversation', label: 'prComments.sectionConversation' },
  { kind: 'review', label: 'prComments.sectionReviews' },
]

export default function PRCommentsPanel() {
  const t = useT()
  const prComments = useStore(s => s.prComments)
  const closePRComments = useStore(s => s.closePRComments)
  const activeTerminalId = useStore(s => s.activeTerminalId)
  const prevTerminalId = useRef(activeTerminalId)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [isClosing, setIsClosing] = useState(false)
  /**
   * The re-entry guard, as a REF and not as the state beside it.
   *
   * Escape, the backdrop and the close button can all land inside the same 310 ms, and
   * state read from a closure is the value of the render that installed the handler — so
   * the second one would see `isClosing` false, start a second timer, and fire
   * `closePRComments` twice. The second call lands after the store has already dropped
   * the panel, which is harmless today and is exactly the kind of harmless that stops
   * being so. Same guard, same reason, as `FilePreviewPanel`.
   */
  const isClosingRef = useRef(false)
  /**
   * The pending exit timer, kept so a reopen can cancel it.
   *
   * Clearing the two flags below is not enough: the timeout is already scheduled, and its
   * callback ends in `closePRComments()`. Reopen the panel inside those 310 ms — activate
   * a focused thread row from the keyboard, which the backdrop does not cover — and the
   * store gets a fresh `prComments`, then the stale timer fires and drops it. The panel
   * opens and vanishes on its own.
   */
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isOpen = prComments !== null

  const handleClose = useCallback(() => {
    if (isClosingRef.current) return
    isClosingRef.current = true
    setIsClosing(true)
    closeTimerRef.current = setTimeout(() => {
      closeTimerRef.current = null
      isClosingRef.current = false
      setIsClosing(false)
      closePRComments()
    }, CLOSE_MS)
  }, [closePRComments])

  // Reopening must not inherit the last exit. The panel is not unmounted between two
  // opens — it is mounted for the life of the app — so without this a second open would
  // render straight into `animate-slide-out` and be invisible.
  //
  // Cancelling the timer is part of the same job, not a separate concern: an exit that is
  // still in flight owns a `closePRComments()` call, and only clearing it makes the reopen
  // actually stick.
  useEffect(() => {
    if (isOpen) {
      if (closeTimerRef.current !== null) {
        clearTimeout(closeTimerRef.current)
        closeTimerRef.current = null
      }
      isClosingRef.current = false
      setIsClosing(false)
    }
  }, [isOpen])

  // Changing agent dismisses the drawer, exactly as it does for the file preview: the
  // conversation on screen belongs to the PR of the agent being left.
  //
  // Guarded on `isOpen`, which the file preview's copy of this effect is not: every agent
  // switch would otherwise run the full two-phase close on a panel that is already shut —
  // two renders, a 310 ms timer, and a `set` that both persist layers answer with a
  // `partialize`, a `JSON.stringify` and a synchronous Web Storage write, to put null
  // where null already is.
  useEffect(() => {
    if (prevTerminalId.current === activeTerminalId) return
    prevTerminalId.current = activeTerminalId
    if (isOpen) handleClose()
  }, [activeTerminalId, isOpen, handleClose])

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
    // No `KEY_OWNING_SURFACES` guard, unlike `FilePreviewPanel`'s listener, and the
    // difference is not an oversight: that guard exists because the drawer CONTAINS
    // surfaces with their own Escape — a comment composer, a comment list — and this
    // panel contains none. Adding it here would read the `data-comment-list` marker on
    // this panel's own scroller and refuse to close on Escape the moment focus sat on a
    // thread heading, which is after the very first click anybody makes in here.
  }, [isOpen, handleClose])

  /**
   * Take the reader to the thread they clicked.
   *
   * Keyed on `anchorSeq` and NOT on `anchorThreadId`, which is the entire reason that
   * counter exists: clicking the same row twice has to scroll back to it the second
   * time, and every other field of the view is identical then. See `PRCommentsView`.
   *
   * `useLayoutEffect` and layout offsets rather than `scrollIntoView`: this runs while
   * the panel is midway through its 300 ms slide, and both a rect-based measurement and
   * the browser's own scrolling are post-transform — they would aim at where the panel
   * currently is rather than where it is going. `cumulativeOffsetTop` is pure layout and
   * immune to it, which is the same argument that put it in `scrollGeometry`.
   */
  useLayoutEffect(() => {
    const anchorId = prComments?.anchorThreadId
    const container = scrollRef.current
    if (!anchorId || !container) return
    const target = container.querySelector<HTMLElement>(`[data-thread-id="${CSS.escape(anchorId)}"]`)
    // No fallback scroll when the anchor is missing: the top of the list is where the
    // container already is, so there is nothing to do rather than something to undo.
    if (!target) return
    container.scrollTop = Math.max(
      0,
      cumulativeOffsetTop(target) - cumulativeOffsetTop(container) - ANCHOR_MARGIN_PX,
    )
  }, [prComments?.anchorSeq, prComments?.anchorThreadId])

  /**
   * The threads split into their three groups, empty groups dropped.
   *
   * One `filter` per section rather than a single grouping loop: three passes over at
   * most a hundred-odd threads, run once per open, is not worth a `Record` that then has
   * to be walked back into `SECTIONS` order to render.
   *
   * Memoised on the frozen list, so it survives every render caused by a thread being
   * folded or by the clock ticking — see `PRCommentsView` for why the list is a copy that
   * never moves.
   */
  const sections = useMemo(() => {
    const threads = prComments?.threads ?? []
    return SECTIONS
      .map(section => ({ ...section, threads: threads.filter(thread => thread.kind === section.kind) }))
      .filter(section => section.threads.length > 0)
  }, [prComments?.threads])

  /**
   * One clock for the whole panel, ticking on the same 30 s as the card's.
   *
   * Per panel and not per comment: forty comments each holding their own interval is
   * forty timers to say the same thing, and they would disagree — "2 h ago" and "3 h
   * ago" a second apart in one thread — because each would have started at its own mount.
   */
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!isOpen) return
    const id = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(id)
  }, [isOpen])

  if (!prComments) return null

  // The same read the card's header does, through the same helper — there is no PR title
  // anywhere in what this panel is given (see `PRCommentsView`), so the number and the
  // slug are the whole of the identification.
  const { repoSlug, prNumber } = prUrlParts(prComments.prUrl)
  const total = prComments.threads.length
  const threadsLabel = t(total === 1 ? 'prComments.threadCount' : 'prComments.threadsCount', { count: total })

  return (
    <>
      <div className="fixed inset-0 z-[59]" onClick={handleClose} />
      <div className={`fixed right-0 top-0 h-full w-[70%] z-[60] flex flex-col bg-bg border-l-4 border-l-blue ${isClosing ? 'animate-slide-out' : 'animate-slide-in'}`}>
        {/* `DRAWER_HEADER` and not a hand-rolled bar: `electron-no-drag` is load-bearing
            up here — see the constant — and a header that forgot it would have a close
            button macOS swallows every click on. */}
        <div className={DRAWER_HEADER}>
          <div className="flex items-center gap-2.5 min-w-0">
            <MessagesSquare className="w-4 h-4 shrink-0 text-blue" />
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-medium text-ink truncate">
                {prNumber ? t('agentInfo.pr.number', { number: prNumber }) : t('agentInfo.pr.title')}
              </span>
              <span className="text-xs text-text-secondary truncate" title={prComments.prUrl}>
                {repoSlug ? `${repoSlug} · ${threadsLabel}` : threadsLabel}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 ml-3 shrink-0">
            <DrawerCloseButton onClose={handleClose} />
          </div>
        </div>

        <div
          ref={scrollRef}
          /* The marker the drawer's keyboard listeners scope themselves with. Nothing
             can currently be open behind this panel to honour it — the store makes the
             three shapes of the drawer exclusive — so this is convention rather than a
             fix: the next surface that grows an Escape or an Alt+↑/↓ of its own inherits
             the right behaviour instead of rediscovering the registry. */
          data-comment-list
          /* `overscroll-contain`: without it a wheel at either end of this list chains
             into whatever is behind the drawer, which scrolls the page under a panel
             that covers 70% of it. Same pairing as the review comments list. */
          className="flex-1 overflow-y-auto overscroll-contain"
        >
          {sections.length === 0 ? (
            <div className="px-5 py-8 text-sm text-text-secondary/50">{t('prComments.empty')}</div>
          ) : (
            sections.map(section => (
              <section key={section.kind}>
                {/* Sticky, so the group being read stays named while its threads scroll
                    under it — the same treatment, and the same classes, as the review
                    comments list's per-file headings. */}
                <h2 className="sticky top-0 z-10 px-5 py-2 bg-bg-secondary text-[11px] font-medium text-text-secondary truncate">
                  {t(section.label)}
                </h2>
                <div className="px-5 py-4 space-y-6">
                  {section.threads.map(thread => (
                    <PRThread key={thread.id} thread={thread} now={now} t={t} />
                  ))}
                </div>
              </section>
            ))
          )}
        </div>
      </div>
    </>
  )
}
