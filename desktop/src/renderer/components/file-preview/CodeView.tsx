import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import CommentCard, { CommentAnchorNotice } from './CommentCard'
import { scrollCardIntoView, useInlineCommentHosts } from '../../hooks/useInlineCommentHosts'
import {
  clampQuote, commentAnchorKind, commentFileKey, edgesByRow, extendRange, lineIdentityFromRow,
  markersByRow, normalizeRange, rangeCovers, rowsForComment, visibleRowForComment,
  type CommentTarget, type GutterPick, type LineRange, type RowEdges, type RowIdentity,
} from '../../utils/commentAnchors'
import { useStore, NO_COMMENTS } from '../../store'
import { useT } from '../../i18n'
import { CODE_STYLES, GUTTER_ADVANCE_REM, GUTTER_WIDTH_REM } from '@ds/desktop/codeChrome'
import { DEFAULT_CODE_FONT_SIZE } from '../../../types'

interface Props {
  content: string
  highlightedHtml: string | null
  /**
   * Which appearance the HTML above was highlighted in — NOT the app's theme. The
   * two differ whenever the reader has pinned one in Settings, and everything this
   * component draws over the code (the line-number gutter, the +/- rails) has to
   * follow the CODE: a light theme's ink over a dark slab of code is the exact
   * unreadability this option exists to let people avoid.
   */
  appearance?: 'light' | 'dark'
  /**
   * Whether that appearance matches the interface's, in which case shiki's own
   * background is dropped and the code sits straight on the panel — one surface
   * instead of a slab floating in a drawer. Pinned the other way it is kept, since
   * it is then the only thing making the code legible.
   */
  blend?: boolean
  /**
   * Which file this is, for the comments left on it.
   *
   * Two plain strings coming DOWN, against the general rule in FileContentRenderer that
   * a store read beats a new prop: the store has nothing that says which file a given
   * CodeView is showing — three different callers mount it, one of them from a review of
   * forty files at once — so the identity has to arrive with the content. Being strings
   * is also what keeps `memo(FileContentRenderer)` holding across the panel's
   * per-scroll-event re-renders.
   */
  repoPath?: string
  filePath?: string
  /**
   * Which version of this file the comments on it belong to — `diffFingerprint` of the read
   * FileContentRenderer got, its content and its diff both. Undefined wherever there is no
   * read to fingerprint, which is every case that cannot be commented on anyway.
   *
   * Derived up there rather than here, and that is not an arbitrary split: the fingerprint
   * needs the read's `changedLines`, which is what makes the key move when HEAD moves and
   * which never reaches this component. It arrives as a STRING for the same reason the two
   * paths above do — `memo(FileContentRenderer)` holds only while every prop is
   * referentially stable, and `changedLines` is a fresh object on every read.
   */
  fingerprint?: string
  /**
   * Whether the reader may comment on this file. FALSE by default, and the default is the
   * safe one. Why each caller differs is written down ONCE, on `commentable` in
   * FileContentRenderer's props — the flag arrives here straight from there.
   */
  commentable?: boolean
}


/** Every `.line` shiki drew, in document order. */
function rowsOf(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>('.line'))
}

/** What line a row is, or `null` for an elision separator. All the meaning is in `commentAnchors`. */
function identityOf(row: HTMLElement): RowIdentity | null {
  return lineIdentityFromRow({
    line: row.dataset.line, diff: row.dataset.diff, anchor: row.dataset.anchor, elided: row.dataset.elided,
  })
}

/**
 * Which of the three edge rules a row wants — see them in `codeStyles`.
 *
 * One value out of two flags, because the two lines have to arrive in ONE box-shadow: the
 * stylesheet cannot combine a rule for the top with a rule for the bottom, so the row has to
 * say which case it is in rather than leaving CSS to add them up.
 */
const NO_EDGES: RowEdges = { top: false, bottom: false }

function edgeValue(edges: RowEdges): string {
  if (edges.top && edges.bottom) return 'both'
  return edges.top ? 'top' : 'bottom'
}

/**
 * The `.line` a node sits in, as long as it is one of OURS.
 *
 * The containment test is not paranoia: a review stacks forty of these documents in one
 * scroller, and `window.getSelection()` is the window's, not this component's. A drag
 * that started in the card above would otherwise be read as a selection in this file.
 */
function rowOf(node: Node | null, root: HTMLElement): HTMLElement | null {
  if (!node) return null
  const element = node instanceof Element ? node : node.parentElement
  const row = element?.closest<HTMLElement>('.line') ?? null
  return row && root.contains(row) ? row : null
}

/**
 * Whether a pointer landed on the line-number gutter rather than on the code.
 *
 * `e.target` alone cannot answer this. The gutter is a `::before`, and a pseudo-element
 * hit-tests as the element it belongs to — so a click on a line number reports the `.line`
 * itself, which is exactly what a click on the empty space to the RIGHT of a short line
 * also reports (the row is a block and fills the width). Only the x-coordinate separates
 * the two, and it is read against the row's own left edge so the `<pre>`'s horizontal
 * scroll is already accounted for.
 *
 * On a row carrying the comment pill the target stops at the gutter CELL instead of at the
 * advance: the pill is drawn in the gap between the cell and the code, and it hit-tests as
 * the row for the same pseudo-element reason. Without this a click on it would be read as a
 * pick and would offer a new comment on the line it was trying to reopen. The whole gap goes
 * to the pill rather than only its own width — it is a 0.9rem target either way, and the few
 * pixels beside it are better spent widening that than on a pick the number cell already
 * covers.
 */
function inGutter(clientX: number, row: HTMLElement): boolean {
  const offsetRem = (clientX - row.getBoundingClientRect().left) / rootFontSize()
  const target = row.dataset.commentBadge === undefined ? GUTTER_ADVANCE_REM : GUTTER_WIDTH_REM
  return offsetRem <= target
}

/**
 * What one rem is worth in pixels, read once rather than per pointer event.
 *
 * `inGutter` runs on every mousedown, mouseup and click inside a diff, and
 * `getComputedStyle` is a forced style read each time — in a view that already re-renders
 * on every scroll frame. The value still comes from the same place, so the hit test cannot
 * drift away from the gutter the stylesheet draws.
 *
 * Dropped on `resize`, which is the only moment it can move: the window's zoom factor
 * changes the CSS viewport along with it, and a resize is how the renderer hears about
 * that. A theme or code-appearance switch cannot — `applyTheme` writes CSS variables and
 * `data-theme`, never a font size — and neither can a re-read of the file.
 *
 * At module scope, not per component: this is one fact about the window, and a review
 * mounts forty of these documents.
 */
let remPx: number | null = null
window.addEventListener('resize', () => { remPx = null })

function rootFontSize(): number {
  if (remPx === null) remPx = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
  return remPx
}

/**
 * The comment being written, if there is one: the lines it is about and what was selected.
 *
 * There used to be a second shape beside it for "a stored comment whose card is open", and it
 * went when every stored comment became permanently open. Which stored card exists is no
 * longer a decision — it is one per comment — so the only thing left to hold is the one card
 * that has no comment behind it yet.
 */
interface Composer {
  range: LineRange
  quote: string
}

/**
 * The host key for the composer, in the same map as the stored comments' own ids.
 *
 * A `#` prefix, which `newCommentId` cannot produce: the two live in one keyspace, and a
 * composer that collided with a comment id would replace that comment's card with itself.
 */
const COMPOSER_KEY = '#composer'

/** No anchors, as ONE map — see `NO_HOSTS` in the hook for why the identity matters. */
const NO_ANCHORS: ReadonlyMap<string, HTMLElement> = new Map()

/**
 * What the RAW diff says about the comments on this file that it cannot show.
 *
 * A comment left on the rendered markdown is anchored to a quoted passage and to nothing
 * else, so this view has no row to put its marker on — `markersByRow` skips a null anchor,
 * which is the correct arithmetic and also the whole problem: silence there is
 * indistinguishable from the comment having been dropped when the reader flipped the toggle.
 * It was not; `markdownMode` is deliberately no part of `commentFileKey`, so the store still
 * holds it and the rendered view still shows it in place.
 *
 * The widget is `CommentAnchorNotice` in `CommentCard`, shared with the mirror-image notice
 * the rendered view draws about a passage it can no longer find; only the two keys and the
 * padding are this view's. `px-4` matches the `<pre>` the notice sits above.
 */
function QuotedElsewhereNotice({ count }: { count: number }) {
  return (
    <CommentAnchorNotice
      count={count}
      one="filePreview.commentQuoteOtherView.one"
      other="filePreview.commentQuoteOtherView.other"
      className="px-4"
    />
  )
}

export default function CodeView({
  content, highlightedHtml, appearance = 'dark', blend = true, repoPath, filePath, fingerprint,
  commentable = false,
}: Props) {
  const htmlRef = useRef<HTMLDivElement>(null)
  const t = useT()
  // Settings → Code & reviews. Written on the wrapper and inherited by shiki's `<pre>`,
  // which is why the `<pre>` carries no text size of its own.
  const fontSize = useStore(s => s.config?.codeFontSize) ?? DEFAULT_CODE_FONT_SIZE

  /**
   * Whether this document takes comments at all: the reader may, and everything needed to
   * file one under a version of this file arrived. Read as one fact rather than four checks
   * because it gates the store selector, the pointer handlers and the marker sweep alike.
   */
  const commenting = commentable && repoPath !== undefined && filePath !== undefined
    && fingerprint !== undefined

  /**
   * The file these comments are filed under: the two paths and that fingerprint.
   *
   * ONE object, read by the store selector below and by the three handlers at the bottom,
   * so the version the comments are READ under and the version they are WRITTEN under
   * cannot come to differ — which is the whole failure mode a fingerprint introduces.
   */
  const target: CommentTarget | null = commenting ? { repoPath, path: filePath, fingerprint } : null
  const commentKey = target ? commentFileKey(target) : null
  // `NO_COMMENTS` rather than `?? []`: zustand compares a selector's result by identity,
  // and a fresh array per call would re-render every mounted CodeView on every unrelated
  // store mutation — the terminal state, the config, the five-second git poll.
  const comments = useStore(s => (commentKey ? s.fileComments[commentKey] ?? NO_COMMENTS : NO_COMMENTS))
  // Store actions: their identity never changes, so they need no memoising.
  const addFileComment = useStore(s => s.addFileComment)
  const updateFileComment = useStore(s => s.updateFileComment)
  const removeFileComment = useStore(s => s.removeFileComment)

  /**
   * The review's request to take the reader to a comment, when the comment is one of THIS
   * document's — `null` in every other card.
   *
   * The key comparison is inside the SELECTOR rather than after it, and both halves of that
   * matter. Answering `null` for the other thirty-nine cards is what keeps a jump from
   * re-rendering every mounted shiki document; and short-circuiting on
   * `s.focusedComment !== null` first is what keeps the comparison off the hot path — with
   * no focus set there is not even a string built, on a store that mutates for the terminal
   * state, the config and the five-second git poll.
   *
   * The object itself comes back when it matches, so its identity is the store's and the
   * effect below is not re-run by a render of its own.
   */
  const focus = useStore(s => (
    s.focusedComment !== null && commentKey !== null
      && commentFileKey(s.focusedComment.target) === commentKey
      ? s.focusedComment
      : null
  ))

  const [composer, setComposer] = useState<Composer | null>(null)

  /**
   * Where a gutter pick began, in a REF rather than in state.
   *
   * Shift-click has to extend from the row the reader first clicked, and the open card is
   * not a safe place to remember it: a shift-click on a second row is a mousedown on the
   * code, which ends the pick in progress a few lines below — so a shift-click would be
   * extending from nothing. A ref survives that, and nothing renders from it.
   */
  const pickRef = useRef<GutterPick | null>(null)

  /**
   * The block the pointer is sweeping right now, while the button is down on the gutter.
   *
   * STATE, unlike the two refs around it, and that is the point of it: the wash on a picked
   * row is re-derived from `activeRange` by the marker effect, so a render is what makes the
   * growing block light up — there is no second highlighting path, and could not be one
   * without two things to keep in step. `null` whenever no drag is in progress, which is
   * also what arms the document listeners below; it is therefore set on MOUSEDOWN, from the
   * row pressed, so one piece of state says both "a drag is on" and "this is what it covers".
   *
   * Set on mousedown, where the PICK is still only committed on mouseup — see
   * `handleMouseDown` for the ordering that forces the two apart.
   */
  const [dragRange, setDragRange] = useState<LineRange | null>(null)

  /**
   * Whether a drag is under way, as a BOOLEAN, purely so the effect that binds the document
   * listeners has something that changes twice per drag to depend on. `dragRange` itself
   * changes on every row the pointer crosses, and an effect keyed on it would tear the
   * listeners down and rebind them mid-gesture.
   */
  const dragging = dragRange !== null

  /**
   * The pick that drag is building — where it began, and what it currently covers.
   *
   * A ref for `pickRef`'s reason and one of its own: the listeners below are bound once, for
   * the length of the drag, so anything they read has to be current at the time they run
   * rather than captured when they were bound. It is also the only synchronous answer to "is
   * a drag in progress", which is what `handleMouseUp` needs before React has re-rendered.
   */
  const dragRef = useRef<GutterPick | null>(null)

  /** Which `focusedComment.seq` this document has already acted on. See the effect below. */
  const focusRef = useRef<number | null>(null)

  /**
   * Label the elision rows. That is now this component's ONLY layout-time job.
   *
   * It used to also measure the changed rows, report them upwards, and scroll the
   * container onto the first one. All three moved to FilePreviewPanel, because the
   * drawer stopped being about one file: N cards mount in the same commit, and N copies
   * of this effect would each resolve the SAME scroller and each write `scrollTop` into
   * it — the last card to mount would win, so where the reader landed would depend on
   * the order forty reads happened to resolve in. Measuring is now a single sweep from
   * the panel, which is also the only place that can group rows by the file they are in.
   *
   * Labelling has to stay HERE, and in a LAYOUT effect: the markers arrive empty from
   * the main process, where no interface language is bound, and the label is what gives
   * the row its height. React runs a child's layout effects before its parent's, so
   * every card's labels are written — and every row below them is at its final offset —
   * by the time the panel's sweep runs. That ordering is the whole reason the panel can
   * measure the cards without asking them anything.
   *
   * `t` IS a dependency: its identity changes with the interface language, and these
   * labels are written straight into the DOM, where nothing else would ever come back
   * to retranslate them.
   */
  useLayoutEffect(() => {
    const root = htmlRef.current
    if (!root) return

    for (const row of root.querySelectorAll<HTMLElement>('.line[data-elided]')) {
      row.textContent = t('filePreview.linesHidden', { count: Number(row.dataset.elided) })
    }
  }, [highlightedHtml, t])

  /**
   * The lines to paint as PICKED: the block being dragged, else the one being written about.
   *
   * The drag comes first because while the button is down it is the only truthful answer to
   * where the reader is — and because it is the live feedback the gesture needs, drawn by the
   * wash that was already there rather than by anything new.
   *
   * Stored comments are deliberately absent. They light their own rows through
   * `data-comment-ids`, which is a separate wash keyed off `markersByRow`, and it has to be:
   * this is ONE range and there are as many commented blocks as there are comments.
   */
  const activeRange = dragRange ?? composer?.range ?? null

  /**
   * Re-derive every marker from the store, on every render that could have changed one.
   *
   * This effect is the answer to two of the acceptance criteria at once, and it is why
   * nothing anywhere holds a row. A theme change flips FileContentRenderer's cache key,
   * which re-reads the file over IPC and replaces the whole HTML string — every row the
   * markers were on is gone. A re-read does the same. Because the stamps are computed
   * from `data-line`/`data-diff` and the comments' own line numbers, the new document
   * gets them all back in the same commit it is painted in, in the right places, with no
   * bookkeeping to go stale.
   *
   * Cleared first and unconditionally: the stamps are DERIVED, so a comment that was just
   * deleted has to lose its marker in the same pass that redraws the rest.
   *
   * Nothing is ever stamped on an elision separator, and that is not a rule this effect
   * has to remember — `identityOf` answers `null` for them, so `markersByRow` cannot name
   * one. It matters because the label effect above writes `row.textContent` on exactly
   * those rows, which would wipe anything placed inside them.
   */
  useLayoutEffect(() => {
    const root = htmlRef.current
    if (!root) return

    // Cleared through the stamps themselves rather than by walking every row, and then
    // nothing is built at all unless there is something to draw. A review holds forty of
    // these documents at hundreds of rows each, and on all but the handful anyone has
    // commented both selectors match nothing — where a full sweep would read four
    // attributes and allocate two objects per row of every file, before paint, in the
    // same commit as FilePreviewPanel's own measurement pass. Only this effect writes
    // these attributes, so there is nothing else for the selectors to miss.
    //
    // One selector finds the badge too: it is only ever stamped on a row that also carries
    // the id list, so a row with a pill and no ids is a state this effect cannot produce.
    //
    // `data-edge` gets its OWN selector, and that is the one invariant here that changed
    // when the pick learned to draw edges: a selected row outside any comment carries an
    // edge and no id list, so clearing it through the list above would leave the orange
    // line behind after the selection moved on.
    for (const row of root.querySelectorAll<HTMLElement>('.line[data-comment-ids]')) {
      delete row.dataset.commentIds
      delete row.dataset.commentBadge
      row.removeAttribute('title')
    }
    for (const row of root.querySelectorAll<HTMLElement>('.line[data-edge]')) delete row.dataset.edge
    for (const row of root.querySelectorAll<HTMLElement>('.line[data-picked]')) delete row.dataset.picked
    if (comments.length === 0 && !activeRange) return

    // One identity pass, shared by the markers and the picks below — which is what keeps
    // the two jobs in one effect rather than in two with a dep list each.
    const rows = rowsOf(root)
    const identities = rows.map(identityOf)

    // Every row every comment covers, and every comment covering each of them — the
    // arithmetic for both lives in `markersByRow`, so it is the tested module that decides
    // which lines a range marks and in what order a row's comments come back.
    const markers = markersByRow(comments, identities)
    for (const [index, ids] of markers) {
      const row = rows[index]
      // What the row's wash is keyed off, and what the review panel's jump finds a row by.
      // Nothing WALKS them any longer — every one of these comments has its own card mounted
      // under its own block — so the attribute is an index, not a cursor.
      row.dataset.commentIds = ids.join(' ')
      // A `title` rather than an `aria-label`: the marker is a pseudo-element, so it is not
      // in the accessibility tree and cannot carry one, and the row it is on is a `<span>`
      // with no role for a label to describe.
      //
      // Since the pill draws an icon rather than a count, this number stays the ONLY place a
      // reader can learn that a row carries more than one comment — worth saying even now that
      // both cards are on screen, because the second one sits under the LAST row of its own
      // range and may be nowhere near this one.
      row.title = ids.length > 1
        ? t('filePreview.commentMarkers', { count: ids.length })
        : t('filePreview.commentMarker')
    }

    // The block's edges, and the pill on the row where it begins — both once per comment,
    // both from a second loop over the FINISHED map rather than from a branch inside the one
    // above: which row is a comment's first and which its last is only known once every row
    // of every comment has been collected, and reading the same map twice is what keeps the
    // pill, the edges and the wash from ever disagreeing about the range.
    //
    // Collected into a map rather than stamped straight onto the rows, because the PICK
    // below adds its own edges to the same attribute — see the merge there.
    const edges = new Map<number, RowEdges>()
    for (const [index, e] of edgesByRow(markers)) {
      edges.set(index, { top: e.top, bottom: e.bottom })
      // The pill belongs to a COMMENT, so it is stamped from this loop and not from the
      // merged map below: a selection draws the same orange edges and must NOT draw a badge.
      if (e.top) rows[index].dataset.commentBadge = ''
    }

    // The pick's edges, into that same map, so a selection is closed off top and bottom like
    // a finished comment — it reads as the block it is about to become rather than as a wash
    // that stops wherever the drag did.
    //
    // ONE attribute for both, because box-shadow is one property: a row that is the last
    // line of a selection and the first of a comment needs both lines in a single
    // declaration, and two attributes would leave only whichever won the cascade. Now that a
    // pick and a comment are the same orange there is no reason for two anyway — an edge says
    // "a block starts or ends here", not what kind of block it was.
    if (activeRange) {
      let first = -1
      let last = -1
      for (let i = 0; i < rows.length; i++) {
        const identity = identities[i]
        if (identity && rangeCovers(activeRange, identity.side, identity.line)) {
          rows[i].dataset.picked = ''
          if (first < 0) first = i
          last = i
        }
      }
      // A single picked row takes both, which the second `set` reads back off the first
      // rather than overwriting it — `edgeValue` then spells that `both`.
      if (first >= 0) {
        edges.set(first, { ...(edges.get(first) ?? NO_EDGES), top: true })
        edges.set(last, { ...(edges.get(last) ?? NO_EDGES), bottom: true })
      }
    }

    for (const [index, e] of edges) rows[index].dataset.edge = edgeValue(e)
  }, [highlightedHtml, comments, activeRange, t])

  /**
   * Which row each card hangs off: one entry per stored comment, plus the composer's.
   *
   * The LAST row a range covers, because a card goes UNDER the lines it is about — the one
   * thing "like a GitHub pull request" settles that a floating panel never had to answer.
   * `rowsForComment` walks the rows the range actually covers, so a range whose middle is
   * folded away still ends on its own last visible row; `visibleRowForComment` is the
   * fallback for a range with nothing rendered at all, and it is what keeps a comment on a
   * folded-away line anchored near where that line was instead of at the top of the file.
   *
   * Resolved from the NUMBERS every time it is asked, never from a remembered node, which is
   * what lets the cards survive the document being replaced under them.
   *
   * ONE walk of the rows for all of them. A per-comment callback would have meant a
   * `querySelectorAll` and a `map` per comment, and a file with a dozen notes on it would pay
   * for twelve passes over a document that has thousands of rows.
   *
   * A comment with no `anchor` is skipped: that is one left on the RENDERED markdown, which
   * has no line to hang off here. `QuotedElsewhereNotice` is what tells the reader it exists.
   *
   * The composer is NOT resolved from `activeRange`: the hosts are real nodes spliced into the
   * document, and hanging one off the drag would tear it out and re-insert it on every row the
   * pointer crossed.
   *
   * `highlightedHtml` is a dependency because it is what the rows are resolved against. A
   * re-read swaps the whole `<pre>`, detaching every host node in it — see
   * `useInlineCommentHosts`, whose only dependency is this callback's identity.
   */
  const anchorRows = useCallback((): ReadonlyMap<string, HTMLElement> => {
    const root = htmlRef.current
    if (!root) return NO_ANCHORS
    const rows = rowsOf(root)
    const identities = rows.map(identityOf)

    const lastRowOf = (range: LineRange): HTMLElement | null => {
      const covered = rowsForComment(range, identities)
      const index = covered.length > 0
        ? covered[covered.length - 1]
        : visibleRowForComment(range, identities)
      return index === null ? null : rows[index]
    }

    const anchors = new Map<string, HTMLElement>()
    for (const comment of comments) {
      if (!comment.anchor) continue
      const row = lastRowOf(comment.anchor)
      if (row) anchors.set(comment.id, row)
    }
    if (composer) {
      const row = lastRowOf(composer.range)
      if (row) anchors.set(COMPOSER_KEY, row)
    }
    return anchors
  }, [comments, composer, highlightedHtml])

  const hosts = useInlineCommentHosts(anchorRows)

  /**
   * Take the reader to the comment the review's list asked for.
   *
   * A SCROLL, where this used to open a card. Opening is not a thing that can be asked for
   * any more — every stored comment's card is already mounted — so the only part of the
   * request left to honour is getting it on screen.
   *
   * An EFFECT rather than something the click handler could have done, because the card being
   * jumped to is usually not mounted when the reader clicks: it is folded shut, or its read is
   * still in flight. This document may therefore not exist yet at that moment — and when it
   * mounts, this runs in its first render with a focus already waiting.
   *
   * Guarded on `seq` rather than on the target, so a second click on the same entry does the
   * jump again, and so an unrelated store write does not scroll the reader away from wherever
   * they have got to since. `hosts` is a dependency because the node has to EXIST to be
   * scrolled to, and the guard is what keeps that from re-scrolling every time the map is
   * rebuilt.
   */
  useEffect(() => {
    if (!focus || focusRef.current === focus.seq) return
    const host = hosts.get(focus.id)
    if (!host) return
    focusRef.current = focus.seq
    scrollCardIntoView(host)
  }, [focus, hosts])

  /**
   * How wide the card runs: the visible slab, less the `<pre>`'s own padding — which is exactly
   * the span a ROW of this file occupies, gutter included.
   *
   * The gutter is deliberately NOT subtracted. An earlier pass pushed the card past it so its
   * left edge sat on the first character of code, and what that produced was a strip of empty
   * gutter running down the side of the card: the card is anchored to the rows, and a card
   * narrower than the row it hangs off reads as one that failed to reach its own edge. Starting
   * at the content edge puts it under the line number, which is where the row starts.
   *
   * Measured at all because the containing block here is as wide as the file's LONGEST LINE —
   * see `InlinePanel`'s `width` prop — and observed rather than read once, so a card open while
   * the drawer is resized (or while the window's split moves) keeps matching the view.
   *
   * The `<pre>`'s padding is read rather than assumed to be `p-4`: the class is in this file's
   * own `className`, but the value behind it is Tailwind's.
   *
   * Bound only while this document actually has a card in it, which is what keeps a review of
   * forty files from holding forty idle ResizeObservers on the strength of one commented file.
   */
  const [slabWidth, setSlabWidth] = useState<number | null>(null)

  useLayoutEffect(() => {
    const pre = hosts.size > 0 ? htmlRef.current?.querySelector('pre') : null
    if (!pre) return
    const measure = () => {
      const style = getComputedStyle(pre)
      const width = pre.clientWidth
        - (parseFloat(style.paddingLeft) || 0)
        - (parseFloat(style.paddingRight) || 0)
      // Compared before it is stored: this runs from a ResizeObserver, and the card's own
      // size is one of the things that can change the `<pre>`'s scroll geometry. A fresh
      // number on every callback would be a loop.
      setSlabWidth(prev => (prev === width ? prev : width))
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(pre)
    return () => observer.disconnect()
  }, [hosts, highlightedHtml])

  const closeComposer = useCallback(() => setComposer(null), [])

  /**
   * Stop a gutter press from becoming a text drag through the code, and start the pick.
   *
   * "Start", not "make": the pick is still COMMITTED on mouseup, and the order is the
   * reason. A pick made on mousedown would open the card on the press, so a drag down three
   * rows would splice a card into the document under the pointer mid-gesture — moving the
   * very rows being dragged over.
   *
   * What mousedown does is record the drag's ANCHOR, and that is why the anchor lives in a
   * ref: nothing clears it, so a shift-click after the card has been closed still extends
   * from where the pick began. The range in `dragRange` is state because something has to be
   * painted, but nothing outside this component knows it exists — see its own comment.
   *
   * Shift is read here rather than on release, so a shift-DRAG is the same gesture as a
   * shift-click with a moving end: both extend from where the pick began.
   */
  const handleMouseDown = (e: React.MouseEvent) => {
    const root = htmlRef.current
    if (!commenting || !root || e.button !== 0) return
    const row = rowOf(e.target as Node, root)
    const identity = row ? identityOf(row) : null
    if (row && identity && inGutter(e.clientX, row)) {
      e.preventDefault()
      const drag = extendRange(e.shiftKey ? pickRef.current : null, identity)
      dragRef.current = drag
      setDragRange(drag.range)
      return
    }
    // A mousedown anywhere else ends the pick in progress, so the next gutter click starts
    // a fresh one rather than extending a block the reader has walked away from.
    pickRef.current = null
  }

  /**
   * Follow the drag wherever the pointer goes, and commit the pick when the button comes up.
   *
   * On `document`, and that is the whole reason this is an effect rather than two more
   * handlers on the container: the container never hears a release that happened outside it,
   * so a drag let go over the panel's chrome — or over the next file's card in a review of
   * forty — would leave the wash painted and the drag armed for ever. `document` hears every
   * release, and the listeners are bound only for the length of the drag, so an idle review
   * is not paying for a mousemove handler that fires on every pixel of every pointer move.
   *
   * The row is read from the event's target, so a drag that wanders sideways over the code
   * keeps extending on the row the pointer is on rather than aborting — which is what makes
   * the gesture forgiving, and what makes a row carrying a pill no obstacle: a pseudo-element
   * hit-tests as the row it belongs to, the same fact `inGutter` is built on. Off this
   * document entirely, `rowOf` answers null and the block stops growing where it was instead
   * of collapsing to nothing.
   */
  useEffect(() => {
    const root = htmlRef.current
    if (!dragging || !root) return

    // The row the pointer was last over. A mouse event that has not left it answers the
    // range object it already answered, which React compares by identity and skips: a fresh
    // object per event would re-render this component — and re-stamp every row of the
    // document — on every pixel of a drag across a file.
    let lastRow: HTMLElement | null = null

    /** The drag as it stands, extended to the row under the pointer if there is one. */
    const extend = (e: MouseEvent): GutterPick | null => {
      const drag = dragRef.current
      if (!drag) return null
      const row = rowOf(e.target as Node, root)
      if (!row || row === lastRow) return drag
      const identity = identityOf(row)
      if (!identity) return drag
      lastRow = row
      const next = extendRange(drag, identity)
      dragRef.current = next
      return next
    }

    const onMouseMove = (e: MouseEvent) => {
      const drag = extend(e)
      if (drag) setDragRange(drag.range)
    }

    const onMouseUp = (e: MouseEvent) => {
      // A drag begun with the primary button is ended by the primary button and by nothing
      // else. The secondary and middle buttons fire mouseup too, and releasing one of those
      // mid-drag has not ended anything — the primary one is still down.
      if (e.button !== 0) return
      const drag = extend(e)
      dragRef.current = null
      setDragRange(null)
      if (!drag) return
      // `pickRef` keeps the anchor, so a later shift-click extends from where this drag
      // began rather than from wherever it happened to stop.
      pickRef.current = drag
      // Straight to the composer, with no quote: a gutter pick names its lines and never
      // selected any text, so `commentLabel` reads the range and the card says "Lines 12-14".
      setComposer({ range: drag.range, quote: '' })
    }

    // The one release the page can never hear: the pointer left the window and the button
    // came up over another application. Losing focus is the signal that does arrive, and it
    // ABANDONS the drag rather than committing it — where the pointer went is unknown, and a
    // wash left painted over a block nobody picked is the state this must not end in.
    const onBlur = () => {
      dragRef.current = null
      setDragRange(null)
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
    window.addEventListener('blur', onBlur)
    return () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
      window.removeEventListener('blur', onBlur)
    }
  }, [dragging])

  /**
   * `e.button !== 0` on both handlers: native mouseup fires for the secondary and middle
   * buttons too, so without it a right-click on a line number opens a composer — and the
   * mousedown above would have preventDefault'd that button as well.
   */
  const handleMouseUp = (e: React.MouseEvent) => {
    const root = htmlRef.current
    if (!commenting || !root || e.button !== 0) return
    // A gutter pick — one click or a whole drag — is committed by the listener above,
    // wherever it was released. Standing aside rather than racing it: a drag released over
    // the code would otherwise fall through to the selection branch, find nothing selected
    // (its mousedown was preventDefault'd) and open a card on nothing.
    if (dragRef.current) return

    const selection = window.getSelection()
    if (selection && !selection.isCollapsed) {
      const anchor = rowOf(selection.anchorNode, root)
      const focus = rowOf(selection.focusNode, root)
      // One end of a drag can land on an elision separator, which is not a line of the
      // file. The other end still is one, and a selection with one usable end is a
      // selection of that line rather than nothing at all.
      const a = anchor ? identityOf(anchor) : null
      const b = focus ? identityOf(focus) : null
      const start = a ?? b
      const end = b ?? a
      if (start && end) {
        pickRef.current = null
        // The gutter numbers are NOT in here: `::before` content with `user-select: none`
        // is outside the selection, as are the elision labels — and now the open card too,
        // which is what `useInlineCommentHost` sets on the host node it splices in.
        setComposer({ range: normalizeRange(start, end), quote: clampQuote(selection.toString()) })
      }
    }
  }

  /**
   * Plain functions, like the three pointer handlers above — and that is the convention:
   * `useCallback` in this file MEANS the identity is read somewhere.
   *
   * A fresh identity every render costs these two nothing: they go to `CommentCard`, which
   * is not memoised and lands in no dep array. `anchorRow` and `closeCard` keep theirs
   * because `useInlineCommentHost` holds the first in its own effect deps — a new function
   * every render would splice the host node out and back in on every re-render of the
   * document, and the panel re-renders on every scroll frame.
   */
  /**
   * File what was being written, and let its own card take over.
   *
   * The composer closes and a STORED comment's card opens in the same commit, on the same
   * lines: `setComposer(null)` drops the composer's host, and `comments` gaining an entry adds
   * one keyed on the new id. The reader sees the note they just wrote stay exactly where they
   * wrote it. Saving used to close everything, which made a saved comment indistinguishable
   * from a discarded one.
   *
   * `addFileComment` answering the id is not needed for that — the anchors are rebuilt from
   * `comments` either way — and it is kept because it is the only thing that makes the swap
   * provable rather than incidental: the host that appears is the host for THIS comment.
   */
  const saveComposer = (body: string) => {
    if (!target || !composer) return
    addFileComment(target, { anchor: composer.range, quote: composer.quote, body })
    setComposer(null)
  }

  /**
   * Rewrite or drop one stored comment, named rather than inferred.
   *
   * The id is a parameter where it used to be read off the single open card: there are as many
   * cards as comments now, so "the card" is not a thing either of these can ask about.
   */
  const saveComment = (id: string, body: string) => {
    if (target) updateFileComment(target, id, body)
  }

  const deleteComment = (id: string) => {
    if (target) removeFileComment(target, id)
  }

  /**
   * This file's comments by id, so the render can go from a host key to its comment without a
   * linear scan per card.
   *
   * A plain `Map` built on every render rather than a memo: it is one pass over an array that
   * is almost always shorter than ten, and a `useMemo` keyed on `comments` would cost the same
   * comparison it saved.
   */
  const commentsById = new Map(comments.map(c => [c.id, c]))

  // How many of this file's comments are anchored to a passage of the rendered markdown, and
  // so have no row here to be marked on. Counted through `commentAnchorKind` rather than by
  // testing `!anchor` — an anchorless comment with no quote is a comment on the whole file,
  // which this view is not failing to show anything about.
  const quotedElsewhere = comments.filter(c => commentAnchorKind(c) === 'quote').length

  if (highlightedHtml) {
    return (
      <>
        <style>{CODE_STYLES[appearance]}</style>
        <QuotedElsewhereNotice count={quotedElsewhere} />
        <div
          ref={htmlRef}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          /* `!bg-transparent` beats the background shiki writes as an INLINE style on
             its own `<pre>` — nothing but `!important` can. Dropping it is what lets
             the panel's own surface show through, so the preview reads as one card
             rather than as a code slab sitting in a drawer. */
          className={`[&>pre]:p-4 [&>pre]:min-h-full [&>pre]:font-mono [&>pre]:leading-relaxed [&>pre]:overflow-auto ${blend ? '[&>pre]:!bg-transparent' : ''}`}
          style={{ fontSize }}
          dangerouslySetInnerHTML={{ __html: highlightedHtml }}
        />
        {/* One card per host, and the hosts are the truth about which cards exist: a card
            portals INTO its node, so there is nowhere to draw before `useInlineCommentHosts`
            has spliced that node in after the range's last row. Driven off the MAP rather than
            off `comments` for that reason — a comment whose lines are all folded away has no
            host and therefore no card, and iterating the comments would have needed the same
            test a second time to say so.

            One render behind the state, and deliberately: the effect that inserts the nodes is
            a layout one, so the node and the card it holds land in the same paint. */}
        {[...hosts].map(([key, host]) => (key === COMPOSER_KEY
          ? composer && (
            <CommentCard
              /* Keyed on its LINES rather than on the constant key: selecting a second
                 passage while the composer is open replaces the state without unmounting
                 anything, and under a stable key React would reuse the component — carrying
                 a half-written body onto lines it was not about. */
              key={`${key}:${composer.range.side}:${composer.range.startLine}-${composer.range.endLine}`}
              comment={null}
              range={composer.range}
              quote={composer.quote}
              host={host}
              width={slabWidth ?? undefined}
              onSave={saveComposer}
              /* Nothing to delete: this comment does not exist yet. Discarding it is what
                 Cancel does, which is `onClose`. */
              onDelete={closeComposer}
              onClose={closeComposer}
            />
          )
          : commentsById.get(key) && (
            <CommentCard
              key={key}
              comment={commentsById.get(key)!}
              range={commentsById.get(key)!.anchor}
              /* The stored comment carries its own quote; the card reads that in preference
                 to this. Empty rather than undefined because the prop is what a NEW comment
                 arrives by. */
              quote=""
              host={host}
              /* Undefined until the first measurement, which the card reads as "take your
                 container's full width". There is no honest number to give before then, and
                 the measurement is a LAYOUT effect — so nothing is painted in that state. */
              width={slabWidth ?? undefined}
              onSave={body => saveComment(key, body)}
              onDelete={() => deleteComment(key)}
              /* No `onClose`: a stored comment's card is never closed. See the prop. */
            />
          )
        ))}
      </>
    )
  }

  // The unhighlighted fallback carries the notice too. It offers no commenting of its own —
  // there is no gutter to pick from — but a file whose highlight failed can still hold
  // comments left on its rendered markdown, and dropping the notice on this path would make
  // those the one case where the silence really does look like a deletion.
  return (
    <>
      <QuotedElsewhereNotice count={quotedElsewhere} />
      <pre className="p-4 text-sm text-ink/80 font-mono whitespace-pre-wrap break-all">
        {content}
      </pre>
    </>
  )
}
