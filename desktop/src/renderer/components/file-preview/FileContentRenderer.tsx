import { memo, useEffect, useMemo, useState } from 'react'
import type { ChangedLines, FilePreviewResult } from '../../../types'
import CodeView from './CodeView'
import MarkdownView from './MarkdownView'
import MarkdownCommentLayer from './MarkdownCommentLayer'
import ImageView from './ImageView'
import BinaryPlaceholder from './BinaryPlaceholder'
import { formatSize } from '../../utils/formatSize'
import { useCodeAppearance } from '../../hooks/useCodeAppearance'
import { evictToBudget } from '../../utils/boundedCache'
import { createTaskQueue } from '../../utils/taskQueue'
import { isMarkdownPath, type MarkdownMode } from '../../utils/markdownPath'
import { diffFingerprint, SPEC_FINGERPRINT } from '../../utils/commentAnchors'
import { useT } from '../../i18n'

interface Props {
  repoPath: string
  filePath: string
  status: string
  /**
   * Bump to re-read the file WITHOUT remounting. Omitted — the file-preview
   * drawer's case — nothing changes: the read stays keyed on the file alone.
   *
   * A remount would work too, but it would throw away the scroll position on
   * every keystroke Claude Code writes into a spec, which is precisely what the
   * live spec panel exists to preserve.
   */
  refreshToken?: number
  /**
   * What to show instead of the red "cannot read file" when the file is simply
   * not there yet. `/magic:plan` announces where the spec WILL be before writing
   * a byte, so "no such file" is that panel's normal FIRST state, not a failure.
   * Omitted, the hard error stands — a preview opened on a deleted file is an
   * error, and should look like one.
   */
  notFoundLabel?: string
  /**
   * How much room to hold open while this file is still being read, in pixels.
   *
   * For ONE caller and one reason: a review card has to keep its place in the stack
   * before its bytes arrive. Cards are read a few at a time, so a file near the top of
   * the review can resolve after one below it — and every card that lands without a
   * reservation pushes the cards under it down, which moves the anchor the panel
   * scrolled to and invalidates every offset it measured. Worse, the panel reads a
   * scroll position it did not write as the reader taking over, so it stops re-anchoring
   * altogether and the review settles wherever the last file happened to land.
   *
   * Taken as a NUMBER coming down rather than a `loading` flag going up. The component
   * that knows the read is still in flight is this one — it is drawing the placeholder —
   * so telling the parent so it could size a wrapper meant a callback, an effect to fire
   * it out of the render path, and a second copy of `loading` in the card. A `minHeight`
   * on the skeleton says the same thing with none of that, and it clears itself: the
   * skeleton unmounts when the content lands, so a file shorter than the estimate leaves
   * no blank space behind.
   *
   * Omitted — the spec panel's case — nothing is reserved and the skeleton is whatever
   * height its own lines make it.
   */
  reservedHeight?: number
  /**
   * Show the file end to end instead of just its changed regions. Default — false —
   * is the changes-only view, which is what a modified file opens as.
   *
   * A mode, not a second read: both renderings come back in the same IPC result, so
   * flipping this picks the other string that is already in hand. It is deliberately
   * NOT part of the cache key for that reason.
   */
  showWholeFile?: boolean
  /**
   * How a markdown file is drawn: as the raw document with its diff intact — the
   * default — or as the formatted rendering. Ignored for anything that is not markdown.
   *
   * Raw by DEFAULT because the rendered view throws the review away: `annotateShikiHtml`
   * marks the changed rows, and MarkdownView paints prose that has no rows to mark. A
   * modified `.md` opening as prose showed a reader no diff at all.
   *
   * A mode, not a second read: both readings are drawn from the same `content` the read
   * already returned — one through shiki's HTML, one through MarkdownView's parse — so
   * flipping this re-renders and nothing else. It is deliberately NOT part of the cache
   * key for that reason.
   */
  markdownMode?: MarkdownMode
  /**
   * Whether there is a collapsed rendering for a whole-file toggle to act on — the
   * header's only way to know whether it has a toggle to offer, since the read lives
   * in here.
   *
   * Reported rather than derived from the status: a modified file whose changes
   * already cover it gets no collapsed view either, and the status alone cannot
   * tell that.
   *
   * False as well whenever this is drawing a markdown file as prose, which no caller
   * could work out for itself: that branch returns before `showWholeFile` is ever read,
   * so a toggle offered on the strength of a `true` here would change nothing.
   */
  onCollapsibleChange?: (collapsible: boolean) => void
  /**
   * The `diffFingerprint` this render is commenting under — the LIVE version of the file.
   *
   * Reported because nothing above can compute it: the fingerprint is hashed from the read
   * result, and the read happens here. A parent that wants to tell a comment filed against
   * this version from one filed against a superseded one has no other way to know which
   * version is current.
   *
   * `undefined` whenever there is no key to file a comment under — not commentable, not read
   * yet, an error, or a non-utf8 file. A parent must read that as "unknown", never as
   * "no comments belong to this file": those are the states where it knows least, not most.
   */
  onFingerprintChange?: (fingerprint: string | undefined) => void
  /**
   * Whether the reader may comment on this file — and, if so, under WHICH key. FALSE by
   * default, and the default is the safe one. THE reason each caller differs is written down
   * here and nowhere else: CodeView's prop and every call site point at this comment.
   *
   * `true` is a FROZEN read — a review card — whose comments are filed under the
   * `diffFingerprint` derived below, so a comment stops resolving the moment the content or
   * the diff moves under it rather than re-attaching to whatever now sits at those lines.
   * `'spec'` is a LIVE document — the agent sidebar's spec panel — whose comments are filed
   * under `SPEC_FINGERPRINT`, one key for every version of the file, because a document the
   * agent rewrites every few seconds would otherwise mint a new key on each save and take the
   * reader's comment with it. `SPEC_FINGERPRINT` carries that argument in full.
   *
   * ONE prop rather than two, so "commentable, but keyed how?" is a state nobody can express:
   * a caller either opts in AND says what kind of document it is handing over, or it says
   * nothing at all. `commentsDiff` below is the single place that distinction is read back,
   * for the same reason — two ad-hoc comparisons are two things that can drift apart.
   *
   * The spec panel's key now MEANS something, which is what changed. `splitSpecPath` hands
   * this component a `repoPath` that is the spec file's parent directory rather than a
   * repository root, and under a content fingerprint its entries were indistinguishable in
   * kind from a review's while resolving in no review — which is what used to keep this prop
   * away from that panel. The sentinel settles it by construction and not by care: no read of
   * any file can produce that fingerprint, so no review can mint the key, and none can read it
   * back. `collectReviewComments` states the same invariant from its own side.
   *
   * The single-file preview (`FilePreviewPanel`) stays excluded, and it is excluded for no
   * reason of soundness at all: it keys perfectly well — a real repository path, a real status
   * — and is simply not wired for it. Which is the point of a flag. Turning it on there is a
   * decision someone takes, not a consequence of the props that caller was already passing.
   *
   * Handed down with the two paths and the fingerprint derived below — to CodeView for the
   * diff, and to MarkdownCommentLayer for a markdown file switched to its rendered view, which
   * takes comments on QUOTED PASSAGES rather than on lines. That is a departure from this
   * file's general rule that a store read beats a new prop; see CodeView's own props for why
   * the store cannot answer "which file is this". CodeView's prop stays a plain `boolean` and
   * `'spec'` must never reach it: a spec is rendered prose, so there is no diff there whose
   * lines could be commented on. All four remain a string or a boolean — a union of the two is
   * still a primitive — so `memo` below still holds.
   */
  commentable?: boolean | 'spec'
}

// `unreadable` is local to this component: the handler never returns it, it is
// what a thrown IPC call becomes. Kept apart from `not_found` so a dead channel
// is never softened by `notFoundLabel` into "the file is not written yet".
type FileResult = FilePreviewResult | { error: 'unreadable' }

// Re-exported from here rather than only from `utils/markdownPath`, because THIS is the
// module that decides what a markdown file is rendered as, and the markdown branch below
// is gated on this very function: a caller asking "is this markdown" is asking whether
// that decision applies to its file, and gets the same answer this component will act on.
// It lives one directory over because it has to be testable — the suite runs on the root
// node_modules, where `react` does not resolve.
export { isMarkdownPath }

/**
 * Last read per file, so coming back to a file shows it instantly instead of
 * flashing a loader over content that has not changed.
 *
 * This is what makes switching away from a planning agent and back feel free: the
 * spec panel remounts on every switch (its `key` is the spec path, which is how the
 * follow state gets reset), so without a cache every return paid for a full IPC
 * read plus a shiki highlight before showing a single character.
 *
 * Bounded by SIZE, not by a count of entries. Counting entries was the wrong unit by
 * orders of magnitude: one entry holds a file's whole content plus up to two highlighted
 * renderings of it, each capped at 10 MB on its own, so "ten entries" was anywhere
 * between a few kilobytes and a few hundred megabytes with nothing to say which. The
 * review drawer is what made that concrete — it reads every changed file of a repository
 * at once, so the cache now fills in one go instead of a file at a time.
 *
 * Insertion order is Map's own and `remember` deletes before setting, so the front of
 * the map is always the least recently used.
 */
const readCache = new Map<string, FileResult>()

/**
 * The cache's budget, in JavaScript string units — so roughly twice this many bytes of
 * memory, since strings are UTF-16.
 *
 * Sized to hold an ordinary review of a couple of dozen source files comfortably while
 * refusing to sit on hundreds of megabytes because someone once opened a generated
 * bundle. It is a cache: the cost of being wrong is one re-read.
 */
const MAX_CACHED_CHARS = 8_000_000

/**
 * How much of the budget one entry uses.
 *
 * An ERROR measures zero, deliberately — errors are never cached anyway (see the read
 * below), and giving the failure path a size would be a rule nothing exercises. A binary
 * entry carries no content at all, only a size and a mime hint.
 */
function cacheEntryChars(value: FileResult): number {
  if ('error' in value) return 0
  const content = typeof value.content === 'string' ? value.content.length : 0
  if (value.encoding !== 'utf8') return content
  return content + (value.highlightedHtml?.length ?? 0) + (value.changesOnlyHtml?.length ?? 0)
}

/**
 * How many files may be read at once.
 *
 * `config:readFile` runs `git diff HEAD -- <file>` SYNCHRONOUSLY in the main process, so
 * a review of forty files mounting together would put forty read messages in that
 * process's queue at once — ahead of every PTY data message behind them. The reads are
 * serialised by the main process either way; what floods is the QUEUE, and the symptom
 * is every terminal in the app freezing for the length of the whole batch rather than
 * for one read. Holding the tail here means at most three are ever waiting over there,
 * so anything else that needs the main loop gets it in between.
 *
 * Three rather than one because the highlighting and the IPC round trip are real time
 * that a single-file queue would spend idle, and the first screenful of a review should
 * not arrive one file at a time.
 *
 * Module scope: the gate is shared by every mounted renderer, which is the only place it
 * could possibly work — a per-component queue would be forty queues of three.
 */
const readQueue = createTaskQueue(3)

/**
 * `appearance` is part of the key, not an afterthought: the highlighted HTML comes
 * back from the main process already painted in one appearance, so an entry cached
 * under the dark one is not an answer to a question asked in the light one. Keying on
 * it is also what makes switching theme repaint the file already on screen — the key
 * changes, the cache misses, the read runs again.
 */
function cacheKeyFor(repoPath: string, filePath: string, status: string, appearance: string) {
  return `${repoPath}\u0000${filePath}\u0000${status}\u0000${appearance}`
}

function remember(key: string, value: FileResult) {
  // Delete before set, so a re-read moves the key to the BACK of the map. That is what
  // makes insertion order an LRU order, which is what `evictToBudget` walks.
  readCache.delete(key)
  readCache.set(key, value)
  evictToBudget(readCache, cacheEntryChars, MAX_CACHED_CHARS)
}

/**
 * Pulsing lines standing in for the document, rather than a bare "Loading…".
 *
 * `reservedHeight` is a `minHeight` rather than a height: the lines below still draw at
 * their own size, and the reservation only stops the card from collapsing to them.
 */
function ContentSkeleton({ reservedHeight }: { reservedHeight?: number }) {
  return (
    <div
      className="px-5 py-4 space-y-2.5 animate-pulse"
      aria-hidden="true"
      style={reservedHeight ? { minHeight: reservedHeight } : undefined}
    >
      {['w-2/5', 'w-full', 'w-11/12', 'w-4/5', 'w-1/3', 'w-full', 'w-3/4'].map((w, i) => (
        <div key={i} className={`h-3 rounded bg-ink/10 ${w}`} />
      ))}
    </div>
  )
}

/** The diff positions of a read, or undefined wherever the read describes no diff. */
function changedLinesOf(value: FileResult): ChangedLines | undefined {
  if ('error' in value || value.encoding !== 'utf8') return undefined
  return value.changedLines
}

/**
 * Whether a fresh read says the same thing as the one on screen, so the previous object can
 * be KEPT — which is what stops a refresh that found no change from re-running the markdown
 * parse over the whole document.
 *
 * The bytes are not the whole of "the same thing", and that is the point of this function
 * rather than one comparison inline. `diffFingerprint` reads `changedLines` as well as the
 * content, so keeping the previous object when HEAD has moved under unchanged bytes would
 * keep the previous comment key — exactly the case the diff half of the fingerprint exists
 * for. Compared by VALUE, since the read hands back a new object every time.
 */
function sameRead(prev: FileResult | null, next: FileResult): boolean {
  if (!prev || !('content' in prev) || !('content' in next)) return false
  if (prev.content !== next.content) return false
  const before = changedLinesOf(prev)
  const after = changedLinesOf(next)
  if (before === undefined || after === undefined) return before === after
  return sameNumbers(before.added, after.added) && sameNumbers(before.removedBefore, after.removedBefore)
}

function sameNumbers(a: number[], b: number[]): boolean {
  return a.length === b.length && a.every((n, i) => n === b[i])
}

/** The collapsed rendering of `result`, or undefined when the read produced none. */
function changesOnlyOf(result: FileResult | null): string | undefined {
  if (!result || 'error' in result || result.encoding !== 'utf8') return undefined
  return result.changesOnlyHtml
}

function FileContentRenderer({ repoPath, filePath, status, refreshToken, notFoundLabel, reservedHeight, showWholeFile = false, markdownMode = 'raw', onCollapsibleChange, onFingerprintChange, commentable = false }: Props) {
  const t = useT()
  const { appearance, blend } = useCodeAppearance()
  const key = cacheKeyFor(repoPath, filePath, status, appearance)
  // Seeded from the cache so a remount on a known file paints immediately; the read
  // below still runs and replaces this the moment it resolves.
  const [result, setResult] = useState<FileResult | null>(() => readCache.get(key) ?? null)
  const [loading, setLoading] = useState(() => !readCache.has(key))

  // Two effects, not one, and the split is the whole point of `refreshToken`.
  //
  // Blanking to the spinner belongs to the FILE changing: a re-read of the same
  // file must not flash "Loading…" over content that is already on screen, or a
  // spec being written would strobe once per save.
  useEffect(() => {
    const cached = readCache.get(key)
    setResult(cached ?? null)
    setLoading(!cached)
  }, [key])

  useEffect(() => {
    let cancelled = false
    readQueue
      .run<FileResult | null>(() => {
        // Checked again HERE, on the way out of the queue, not only in `.then` below.
        // A card whose drawer closed while it waited its turn has nothing to render,
        // and the read it would have run is a synchronous `git diff` in the main
        // process — the one cost worth skipping rather than discarding afterwards.
        if (cancelled) return Promise.resolve(null)
        return window.electronAPI.config.readFile(repoPath, filePath, status)
      })
      // An unchanged read keeps the previous object, so a refresh that found nothing new
      // does not re-run the markdown parse over the whole document — see `sameRead` for
      // why "unchanged" is the bytes AND the diff.
      .then((res: FileResult | null) => {
        if (cancelled || res === null) return
        remember(key, res)
        setResult(prev => (sameRead(prev, res) ? prev : res))
      })
      // A failed read is never cached: the next mount must retry rather than serve
      // the error back instantly forever.
      .catch(() => { if (!cancelled) setResult({ error: 'unreadable' }) })
      .finally(() => { if (!cancelled) setLoading(false) })
    // Two reads can be in flight at once now that a refresh no longer remounts;
    // without this the slower one wins and the panel shows a stale spec.
    return () => { cancelled = true }
  }, [repoPath, filePath, status, refreshToken, key])

  const changesOnlyHtml = changesOnlyOf(result)

  /**
   * Whether the document being commented on is a FROZEN read with a diff behind it, as
   * opposed to the live spec — the one question `commentable`'s two truthy values answer.
   *
   * Named once and read twice, at the fingerprint below and at the CodeView call at the
   * bottom, rather than comparing the prop against `true` in both places: those are two
   * statements of the same rule, and a rule stated twice is a rule that can end up meaning
   * two things. It also gives CodeView's `boolean` prop a value of the right type by
   * construction, which is what keeps `'spec'` out of a component that draws diffs.
   */
  const commentsDiff = commentable === true

  /**
   * Which VERSION of this file the comments on it belong to — see `diffFingerprint`, and
   * `SPEC_FINGERPRINT` beside it for the case where the answer is deliberately "always this
   * one".
   *
   * Derived HERE rather than down in CodeView because this is where the read result lives,
   * and the fingerprint needs the diff's shape as well as the bytes: `changedLines` is what
   * makes the key move when HEAD moves, and it exists only on the IPC result.
   *
   * What goes down is the STRING, never `changedLines` itself. `memo` below holds only while
   * every prop is referentially stable across the panel's per-scroll-frame re-renders, and
   * the read hands back a fresh `changedLines` object every time — passing it would re-render
   * forty shiki documents sixty times a second. A string cannot.
   *
   * The three guards on `result` stand for the spec case as well, which is not a detail the
   * sentinel makes redundant: they are not there to protect the hash, they are what makes
   * `undefined` mean "there is no key to file a comment under yet". A spec panel opens on a
   * file `/magic:plan` has not written a byte of, and reporting a key for a read that failed
   * or has not landed would offer to comment on a document nobody is looking at.
   *
   * MEMOISED, because in the frozen case it is a walk of the whole file and this component
   * re-renders for reasons that have nothing to do with it. `result` only changes when a read
   * lands, so it is the only dependency there is to have beyond the two props — and a preview
   * nobody may comment on hashes nothing at all.
   */
  const fingerprint = useMemo(() => {
    if (!commentable || !result || 'error' in result || result.encoding !== 'utf8') return undefined
    return commentsDiff ? diffFingerprint(result.content, result.changedLines) : SPEC_FINGERPRINT
  }, [commentable, commentsDiff, result])

  // Whether this render ends at MarkdownView rather than CodeView. Derived from the
  // PROPS, above the early returns, so the effect below can read it — and so it says the
  // same thing whether or not the read has landed yet.
  const rendersProse = markdownMode === 'rendered' && isMarkdownPath(filePath)

  // Told to the parent from an effect, never from the render path: this is a message
  // out of the component, and a parent state update issued while a child renders is
  // exactly the pattern React warns about. The value is a boolean, so a re-read that
  // reaches the same answer bails out before scheduling anything.
  //
  // `rendersProse` is folded in HERE rather than re-tested by each header, because the
  // whole point of this prop is that a caller does not have to know what this component
  // decided to draw.
  useEffect(() => {
    onCollapsibleChange?.(!rendersProse && changesOnlyHtml !== undefined)
  }, [rendersProse, changesOnlyHtml, onCollapsibleChange])

  // Same rule as the effect above and for the same reason: a message OUT of the component
  // belongs in an effect, never in the render path. `fingerprint` is memoised on the read, so
  // a re-render that reaches the same string schedules nothing.
  //
  // Placed above the early returns so it runs in every branch: a file this component ends up
  // refusing to draw still has to correct a fingerprint it reported earlier, and the way it
  // does that is by reporting `undefined`.
  useEffect(() => {
    onFingerprintChange?.(fingerprint)
  }, [fingerprint, onFingerprintChange])

  if (loading) return <ContentSkeleton reservedHeight={reservedHeight} />

  if (!result) return null

  if ('error' in result) {
    if (result.error === 'too_large') {
      return (
        <div className="flex items-center justify-center h-32 text-text-secondary text-sm">
          File too large to preview ({formatSize(result.size)})
        </div>
      )
    }
    if (result.error === 'not_found' && notFoundLabel) {
      return (
        <div className="flex items-center justify-center h-32 text-text-secondary text-sm italic">
          {notFoundLabel}
        </div>
      )
    }
    return (
      <div className="flex items-center justify-center h-32 text-red text-sm">
        {t('filePreview.unreadable')}
      </div>
    )
  }

  if (result.encoding === 'image') {
    return <ImageView dataUrl={result.content} alt={filePath} />
  }

  if (result.encoding === 'binary') {
    return <BinaryPlaceholder size={result.size} />
  }

  // Only when the reader asked for it. Raw markdown falls through to CodeView below,
  // which is the branch that carries the `+`/`-` annotation — the rendered document has
  // no rows to annotate, so taking this branch unconditionally silently dropped the diff
  // of every changed `.md` in a review.
  //
  // The comment layer WRAPS MarkdownView here rather than reaching inside it, which is what
  // keeps that component at its two props and both of its Tailwind strings untouched — and
  // what makes the Skills document's own use of it incapable of growing a comment affordance,
  // there being no path from it to the layer at all.
  //
  // Gated on the same opt-in CodeView is, `commentable` plus a fingerprint to file the
  // comments under — but on EITHER of its truthy values, where CodeView below takes only
  // `true`. This is the branch a spec renders through, and a quotation is the only anchor
  // rendered prose has to offer. `repoPath` and `filePath` are not tested because they are
  // required props of this component: CodeView takes them optionally and has to, this does not.
  if (rendersProse) {
    if (!commentable || fingerprint === undefined) return <MarkdownView content={result.content} />
    return (
      <MarkdownCommentLayer
        content={result.content}
        repoPath={repoPath}
        filePath={filePath}
        fingerprint={fingerprint}
      />
    )
  }

  return (
    <CodeView
      content={result.content}
      /* The changed regions unless the reader asked for the whole file — and the
         whole file anyway wherever the read produced no collapsed rendering, which
         is every path where collapsing would have hidden nothing. */
      highlightedHtml={showWholeFile ? result.highlightedHtml : (changesOnlyHtml ?? result.highlightedHtml)}
      appearance={appearance}
      blend={blend}
      /* The file's identity, for the comments left on it. Only ever read when
         `commentable` says this is a review card — see the prop above. */
      repoPath={repoPath}
      filePath={filePath}
      fingerprint={fingerprint}
      /* `commentsDiff` and not `commentable`, which is now a union: a diff is the only thing
         CodeView can anchor a comment to, so `'spec'` reaching here would be an offer to
         comment on lines of a document that is never drawn as lines. */
      commentable={commentsDiff}
    />
  )
}

/**
 * Memoised, because the file-preview panel now re-renders on every scroll event to
 * move the ruler's viewport indicator.
 *
 * EVERY prop must be referentially stable across a scroll, and the review drawer is
 * where that stopped being a nicety. The panel re-renders on every scroll event to move
 * the ruler's viewport indicator, and it now has N of these mounted at once: one
 * unstable callback would re-render N shiki documents sixty times a second.
 *
 * What makes that hold is that nothing unstable is passed: `reservedHeight` is a number,
 * and the one callback left is a state SETTER — a review card passes `setCanExpand`
 * straight through, and React guarantees that identity for the life of the component,
 * rather than wrapping it in a `useCallback` whose dependency list someone could later
 * widen. `onBlocksMeasured` used to be the awkward one; it is gone entirely, because the
 * panel now measures every card in one sweep of its own instead of being told by each of
 * them.
 *
 * The code appearance is read from a hook rather than taken as a prop, which memoisation
 * does not block: a theme change re-renders this component and re-reads the file,
 * exactly as it should. Nothing here writes `scrollTop` from the render path, so there
 * is no loop to guard against either way; this is purely about not paying for the redraw.
 */
export default memo(FileContentRenderer)
