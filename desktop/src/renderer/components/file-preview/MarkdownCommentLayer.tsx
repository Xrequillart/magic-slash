import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { MessageSquare } from 'lucide-react'
import MarkdownView from './MarkdownView'
import CommentCard, { CommentAffordance, CommentAnchorNotice } from './CommentCard'
import {
  clampQuote, commentAnchorKind, commentFileKey, type CommentTarget,
} from '../../utils/commentAnchors'
import { locateQuote } from '../../utils/quoteAnchors'
import { useStore, NO_COMMENTS, type FileComment } from '../../store'
import { useT } from '../../i18n'

/**
 * The CSS Custom Highlight API, as TypeScript's DOM library does not quite describe it.
 *
 * `HighlightRegistry` is maplike and `Highlight` is setlike in the specification, and both
 * are declared in `lib.dom.d.ts` with only their `forEach` — the generator that builds it
 * drops the maplike and setlike members. So the two methods this file actually calls are
 * declared here rather than reached through an `as any`, which would have taken the argument
 * types with them: `CSS.highlights.set(name, …)` with the arguments the wrong way round is
 * exactly the mistake a cast stops the compiler from catching.
 *
 * Chromium 120 — Electron 28 — implements both; the API landed in 105. `hasHighlights` below
 * is what stands between these declarations and a runtime that lacks them.
 */
declare global {
  interface HighlightRegistry {
    set(name: string, highlight: Highlight): void
    delete(name: string): boolean
  }
}

interface Props {
  /**
   * The markdown to render. Passed rather than taken as `children`, and both halves of that
   * matter: it is a STRING, so the layer can key its relocation pass on the document
   * actually being shown, and it keeps `MarkdownView` mounted by this component — which is
   * what makes it obvious that nothing here reaches inside it.
   */
  content: string
  /**
   * Which file this is, and which version of it — the three fields `commentFileKey` needs.
   *
   * Three strings rather than a `CommentTarget` object, for the reason spelled out on
   * `CodeView`'s own props: `memo(FileContentRenderer)` above holds only while every prop is
   * referentially stable across the panel's per-scroll-frame re-renders, and an object built
   * in a render is a new identity every time.
   */
  repoPath: string
  filePath: string
  fingerprint: string
}

/**
 * What this module puts between two blocks of the rendered document.
 *
 * ONE separator, used by the walk that CAPTURES a quote and by the walk that RELOCATES it,
 * which is the whole reason the walk is written out here instead of leaning on the platform.
 * `selection.toString()` puts a newline between two blocks; `container.textContent` puts
 * nothing at all — `<p>a</p><p>b</p>` reads as `"ab"`. Capture with one and search with the
 * other and every quote spanning two blocks (a heading and its paragraph, two list items) is
 * unfindable, and the layer reports a lost anchor about a passage sitting on screen.
 *
 * A newline rather than a space because the quote is shown to a reader and written out to the
 * agent: `formatReviewComments` prefixes the quote line by line, so the blocks the reader
 * picked stay separate lines there too.
 */
const BLOCK_BREAK = '\n'

/**
 * Element names that end the run of text before them.
 *
 * A tag list rather than `getComputedStyle(...).display`, and not only for the cost of a
 * forced style read per text node of forty documents: the list is what the WALK depends on,
 * so it has to answer the same thing on the capture pass and on every relocation pass
 * afterwards. Computed display can move under a stylesheet; a tag cannot.
 *
 * Everything react-markdown and remark-gfm emit as a block is here. Anything not in it —
 * `em`, `strong`, `a`, `code`, `del` — is inline, which is correct: a link in the middle of a
 * sentence must not break the sentence in two, or no quote could ever span one.
 */
const BLOCK_TAGS = new Set([
  'P', 'DIV', 'PRE', 'BLOCKQUOTE', 'HR',
  'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
  'UL', 'OL', 'LI', 'DL', 'DT', 'DD',
  'TABLE', 'THEAD', 'TBODY', 'TFOOT', 'TR', 'TH', 'TD', 'CAPTION',
  'SECTION', 'ARTICLE', 'ASIDE', 'HEADER', 'FOOTER', 'FIGURE', 'FIGCAPTION',
])

/**
 * The pill's side, in pixels, and the step between two pills that landed on the same line.
 *
 * `0.9rem` in the diff's stylesheet, spelled in pixels here because these numbers are
 * written into inline `style` on an absolutely positioned box rather than into a rule.
 */
const PILL_PX = 14
const PILL_STEP_PX = PILL_PX + 2

/** No markers, as ONE array — so a pass that found none does not re-render on identity. */
const NO_MARKERS: Marker[] = []

/** Which card is open: one being written on a fresh selection, or one already stored. */
type OpenCard =
  | { mode: 'new'; quote: string }
  | { mode: 'existing'; id: string }

/** A relocated comment, as the overlay draws it: an id and a place inside the document. */
interface Marker {
  id: string
  top: number
  left: number
}

/** One text node of the rendered document, and the span of the rendered text it holds. */
interface TextSpan {
  node: Text
  start: number
  end: number
}

/**
 * The rendered document as ONE string, with the map that takes an offset back into the DOM.
 *
 * Both halves come out of the same walk, which is the point: the offsets in `spans` are
 * offsets into `text`, so turning a match back into a `Range` is arithmetic rather than a
 * second traversal that could disagree with the first about where a block break went.
 */
interface RenderedText {
  text: string
  spans: TextSpan[]
}

/** A place in the rendered document, as a `Range` boundary wants it. */
interface TextPosition {
  node: Text
  offset: number
}

/** Whether this runtime can paint a `Range` without touching the DOM. */
function hasHighlights(): boolean {
  return typeof Highlight === 'function' && typeof CSS !== 'undefined' && 'highlights' in CSS
}

/**
 * Which block a text node belongs to, or the root when it belongs to no inner one.
 *
 * The ROOT as the fallback rather than `null`, so two text nodes directly under it compare
 * equal and no break is emitted between them — `null` would have been a distinct value from
 * itself in no useful sense and would have broken every such pair apart.
 */
function blockOf(node: Node, root: Element): Element {
  let element = node.parentElement
  while (element && element !== root) {
    if (BLOCK_TAGS.has(element.tagName)) return element
    element = element.parentElement
  }
  return root
}

/**
 * The rendered text of a container, and the index back into its text nodes.
 *
 * The one extractor, used for capture and for relocation both — see `BLOCK_BREAK` for the
 * bug that makes having exactly one of these load-bearing rather than tidy.
 *
 * The overlay is REJECTED outright rather than merely skipped, because a rejected subtree is
 * not descended into: the pills live in it, and a marker that put characters into this string
 * would shift every offset after it and corrupt the next quote captured over that passage.
 * That is the same constraint the diff's marker obeys from the other side — `CodeView` draws
 * its pill as a `::after` precisely so it never lands in a row's `textContent`.
 *
 * `<br>` is the one element that contributes to the text, and it is why the walk sees
 * elements at all: a hard break inside a paragraph separates two lines the reader can pick
 * across, and without it their text would run together into a word that is in no document.
 */
function readRendered(root: HTMLElement): RenderedText {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, {
    acceptNode(node) {
      if (node.nodeType !== Node.ELEMENT_NODE) return NodeFilter.FILTER_ACCEPT
      const element = node as Element
      if (element.hasAttribute('data-comment-overlay')) return NodeFilter.FILTER_REJECT
      // SKIP, not REJECT: the element itself is nothing to us, its text is everything.
      return element.tagName === 'BR' ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP
    },
  })

  let text = ''
  const spans: TextSpan[] = []
  let block: Element | null = null

  while (walker.nextNode()) {
    const node = walker.currentNode
    if (node.nodeType === Node.ELEMENT_NODE) {
      // A `<br>`. Guarded on the tail so a break at the very start of the document, or two
      // in a row, cannot open the text with a separator that is not between anything.
      if (text !== '' && !text.endsWith(BLOCK_BREAK)) text += BLOCK_BREAK
      continue
    }
    const data = (node as Text).data
    if (data === '') continue
    const owner = blockOf(node, root)
    if (text !== '' && owner !== block && !text.endsWith(BLOCK_BREAK)) text += BLOCK_BREAK
    block = owner
    const start = text.length
    text += data
    spans.push({ node: node as Text, start, end: start + data.length })
  }

  return { text, spans }
}

/**
 * Where a DOM range starts and ends in the rendered text, or `null` if it covers none of it.
 *
 * Resolved by asking the RANGE about each text node rather than by reading the range's own
 * boundary containers, and that is what makes it total. A selection's boundary is a text node
 * when the reader dragged through words and an ELEMENT when the drag ended between two
 * blocks, and the element case has no offset into any string — `comparePoint` answers the
 * same question for either, in the range's own terms.
 *
 * `-1` before the range, `0` inside it, `1` after: so the first span whose END is not before
 * the range is the one holding the start, and the LAST span whose start is not after the range
 * is the one holding the end. The boundary containers are still used where they are the more
 * precise answer — the exact character the reader stopped on inside a node — and the node's
 * own edge stands in everywhere else.
 */
function offsetsOf(rendered: RenderedText, range: Range): { start: number; end: number } | null {
  let start: number | null = null
  let end: number | null = null

  for (const span of rendered.spans) {
    const length = span.node.data.length
    if (start === null && range.comparePoint(span.node, length) >= 0) {
      start = span.start + (range.startContainer === span.node ? Math.min(range.startOffset, length) : 0)
    }
    // The one comparison this loop cannot avoid, read for both purposes: `<= 0` says this
    // span still touches the range and carries the end so far, `> 0` says it lies wholly
    // past it — and the spans being in document order, so does every span after it. Without
    // the break, selecting a word in the first paragraph of a long README costs a DOM
    // tree-position comparison on every text node of the document.
    const after = range.comparePoint(span.node, 0)
    if (after <= 0) {
      end = span.start + (range.endContainer === span.node ? Math.min(range.endOffset, length) : length)
    } else if (start !== null) {
      break
    }
  }

  if (start === null || end === null || end <= start) return null
  return { start, end }
}

/**
 * The place in the DOM an offset into the rendered text names.
 *
 * `Math.max(0, …)` is for an offset that landed on a block break: the break belongs to no
 * text node, so the nearest real position is the first character of the span after it. It
 * cannot happen on a match found by `locateQuote` — a match never begins or ends on
 * whitespace — and it is handled anyway, because the alternative is a negative offset handed
 * to `Range.setStart`, which throws.
 */
function positionAt(spans: TextSpan[], offset: number): TextPosition | null {
  for (const span of spans) {
    if (offset <= span.end) return { node: span.node, offset: Math.max(0, offset - span.start) }
  }
  const last = spans[spans.length - 1]
  return last ? { node: last.node, offset: last.node.data.length } : null
}

/** A live DOM range over a span of the rendered text. Free, the index being built alongside it. */
function rangeOf(rendered: RenderedText, start: number, end: number): Range | null {
  const from = positionAt(rendered.spans, start)
  const to = positionAt(rendered.spans, end)
  if (!from || !to) return null
  const range = document.createRange()
  range.setStart(from.node, from.offset)
  range.setEnd(to.node, to.offset)
  return range
}

/** The rect to hang a panel or a pill off: the passage's FIRST line, not its bounding box. */
function firstRectOf(range: Range): DOMRect {
  const rects = range.getClientRects()
  return rects.length > 0 ? rects[0] : range.getBoundingClientRect()
}

/**
 * Where each relocated comment's pill goes, measured off its passage.
 *
 * Offsets are relative to the document's own box rather than to the viewport, because the
 * overlay is positioned inside it: they survive every scroll without being recomputed, and
 * only an actual re-wrap invalidates them.
 *
 * The one measuring pass, shared by the relocation effect and the reflow effect — which is
 * what lets the second of those skip the search entirely.
 */
function placeMarkers(root: HTMLElement, ranges: Map<string, Range>): Marker[] {
  const box = root.getBoundingClientRect()
  const placed: Marker[] = []
  // How many pills already sit on a given line, so two comments that relocated to the same
  // one are both clickable instead of one hiding the other. Rounded, because two rects on
  // the same line of text can differ by a subpixel.
  const perLine = new Map<number, number>()

  for (const [id, range] of ranges) {
    const top = Math.round(firstRectOf(range).top - box.top)
    const column = perLine.get(top) ?? 0
    perLine.set(top, column + 1)
    placed.push({ id, top, left: column * PILL_STEP_PX })
  }

  return placed
}

/**
 * Whether two placements say the same thing, so an unchanged one can keep its identity.
 *
 * Both effects below place the pills, and most placements change nothing: the relocation pass
 * and the first reflow callback run back to back on mount, and a resize that only changes the
 * document's HEIGHT cannot move a pill at all. Handing React a fresh array for those is a
 * render and a commit per mounted card for no visible difference, so the setter compares
 * first — a few numbers against forty re-rendered documents.
 */
function sameMarkers(a: Marker[], b: Marker[]): boolean {
  return a.length === b.length
    && a.every((marker, i) => marker.id === b[i].id && marker.top === b[i].top && marker.left === b[i].left)
}

/** A passage the reader has just selected: the text to store, and a live range over it. */
interface Capture {
  quote: string
  range: Range | null
}

/**
 * The current selection as a quotation, or `null` when it is not one.
 *
 * A pure function of the root and the window's selection, which is why it is out here rather
 * than inside the handler: every way of not being a quotation is then a plain `return null`,
 * the same way `offsetsOf` and `locateQuote` already report a miss, and the handler is left
 * as the state machine it is — one call, one `setPending`.
 *
 * BOTH ends have to be inside this document, and that is deliberately stricter than the diff's
 * `const start = a ?? b`. One-ended tolerance is right there — a drag can legitimately end on
 * an elision separator, which is not a line — but here `window.getSelection()` is the window's
 * and a review stacks forty documents in one scroller, so accepting a drag that began in
 * another file would store a quote containing two files' text under this one's key.
 *
 * The quote comes from the WALK, never from `selection.toString()`: the two spell a block
 * boundary differently, and a quote captured by one and searched for by the other is a quote
 * whose anchor is reported lost the moment it is saved. See `BLOCK_BREAK`.
 *
 * The offsets are narrowed past the selection's own whitespace rather than the string being
 * trimmed afterwards, so the range kept for the panel covers exactly the characters stored.
 */
function captureQuote(root: HTMLElement): Capture | null {
  const selection = window.getSelection()
  if (!selection || selection.isCollapsed || selection.rangeCount === 0) return null
  if (!root.contains(selection.anchorNode) || !root.contains(selection.focusNode)) return null

  const rendered = readRendered(root)
  const at = offsetsOf(rendered, selection.getRangeAt(0))
  if (!at) return null

  const picked = rendered.text.slice(at.start, at.end)
  const start = at.start + (picked.length - picked.trimStart().length)
  const end = at.end - (picked.length - picked.trimEnd().length)
  // A drag that caught nothing but the gap between two blocks is not a quotation:
  // `commentAnchorKind` would call the comment it made a comment on the whole file, and
  // `locateQuote` would have nothing to find.
  if (end <= start) return null

  return { quote: clampQuote(rendered.text.slice(start, end)), range: rangeOf(rendered, start, end) }
}

/**
 * Commenting on the markdown as it is RENDERED, rather than only on its diff.
 *
 * The rendered view is the one a reader switches to in order to read properly, so it was
 * backwards for it to be the one view of a review that could not be annotated. Selecting text
 * in it offers the same floating card as the diff does, and the comment joins the same list
 * and the same hand-off to the agent.
 *
 * Anchored to a QUOTATION by decision, not by omission. The prose react-markdown paints
 * carries no mapping back to the file's lines — propagating remark's `node.position` through
 * to the DOM is real work for a marginal gain — so a comment here is `anchor: null` plus a
 * quote, which is something the agent can act on directly and is honest about what is known.
 * `commentAnchorKind` is the one place that reads those two fields together.
 *
 * It wraps `MarkdownView` instead of living inside it, and that is what makes two things true
 * by construction rather than by a rule someone has to remember. `MarkdownView` keeps its two
 * props and both of its Tailwind strings untouched, `SCALE.document`'s
 * `[&>*:first-child]:mt-0` included — nothing is inserted inside the styled div. And the
 * Skills document, which imports `MarkdownView` directly, cannot grow a comment affordance:
 * there is no code path from it to this file.
 *
 * The passage highlight is the CSS Custom Highlight API and not a wrapped `<span>`, which is
 * the same constraint the diff's pill obeys: an injected node lands in the container's text
 * and therefore in the next quote captured over it. A highlight paints from `Range` objects
 * with no DOM mutation at all, so it cannot, and it follows a reflow without being
 * re-measured. The absolutely positioned overlay is left carrying only the clickable pill.
 */
export default function MarkdownCommentLayer({ content, repoPath, filePath, fingerprint }: Props) {
  const t = useT()
  const proseRef = useRef<HTMLDivElement>(null)

  const target: CommentTarget = { repoPath, path: filePath, fingerprint }
  const commentKey = commentFileKey(target)
  // `NO_COMMENTS` rather than `?? []`, for the reason it exists: zustand compares a
  // selector's result by identity, and a fresh array per call would re-render every mounted
  // layer on every unrelated store mutation.
  const comments = useStore(s => s.fileComments[commentKey] ?? NO_COMMENTS)
  const addFileComment = useStore(s => s.addFileComment)
  const updateFileComment = useStore(s => s.updateFileComment)
  const removeFileComment = useStore(s => s.removeFileComment)

  /**
   * The review's request to take the reader to a comment, when the comment is one of THIS
   * document's — `null` in every other card, so a jump does not re-render forty of them.
   * The same selector `CodeView` runs, and its own docblock is where the reasoning lives.
   */
  const focus = useStore(s => (
    s.focusedComment !== null && commentFileKey(s.focusedComment.target) === commentKey
      ? s.focusedComment
      : null
  ))

  /**
   * The passage offered for a comment, before the reader has confirmed anything.
   *
   * The quote itself, not an object carrying it. `CodeView`'s wrapper earns its keep by
   * holding a range alongside the text; here the anchor IS the text, so there is no second
   * field for a wrapper to keep it company — and `captureQuote` guarantees a non-empty
   * string, so `null` is the whole of "nothing is offered".
   */
  const [pending, setPending] = useState<string | null>(null)
  const [card, setCard] = useState<OpenCard | null>(null)
  const [markers, setMarkers] = useState<Marker[]>(NO_MARKERS)

  /**
   * The live range the OFFER and the card that follows it are anchored to.
   *
   * A ref, and a range rather than a rect. A rect is in viewport coordinates and is stale one
   * scroll event later, which is the whole reason `useSelectionAnchoredPanel` asks for a
   * function; a live `Range` survives scrolling and reflow and can be asked again. And a REF
   * rather than state because the selection is collapsed by the very click that confirms the
   * offer — by then there is nothing left to read it back out of.
   */
  const captureRef = useRef<Range | null>(null)

  /**
   * Where each stored comment's passage currently is, by id.
   *
   * Rebuilt wholesale by the relocation pass below, never patched, for the same reason the
   * diff's markers are re-derived on every render: the document is replaced outright by a
   * re-read or a theme change, and a range kept across that points into detached nodes.
   */
  const rangesRef = useRef(new Map<string, Range>())

  /** Which `focusedComment.seq` this document has already acted on. */
  const focusRef = useRef<number | null>(null)

  /**
   * A reflow counter, bumped by the observer below.
   *
   * The pills are placed from their passage's own client rect, so anything that re-wraps the
   * document — the drawer resized, the sidebar opened, a web font landing — moves every one of
   * them. The HIGHLIGHT needs none of this, which is exactly why the observer only has to bump
   * a number: it paints from the ranges themselves and follows the text without being asked.
   */
  const [reflow, setReflow] = useState(0)

  /**
   * This layer's own highlight name.
   *
   * `CSS.highlights` is a registry on the DOCUMENT and a review stacks forty cards in one
   * scroller, so the name cannot be shared: each layer's registration would replace the
   * previous layer's, leaving only whichever card relocated last with a painted passage — and
   * unmounting any card would clear every other card's highlight with it.
   *
   * `useId` rather than a module counter, on the precedent of `Flag`'s clip-path id and for the
   * same reason: React owns per-instance identity, and a counter incremented in the render
   * phase is a side effect there — one StrictMode double-invoke and the name is not the name
   * the previous render registered. The colons `useId` puts in are stripped because a CSS
   * `<custom-ident>` may not contain them.
   */
  const highlightName = `ms-quote-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`

  /**
   * The `::highlight()` rule, inline, on the precedent of `CODE_STYLES` in `CodeView`.
   *
   * There is nowhere else it could go: the name is minted per instance, so no static
   * stylesheet could carry a selector for it. The orange is the app's own token rather than
   * the code appearance's — this is prose on the panel's surface, not a slab of highlighted
   * code — and `::highlight()` may set only a handful of properties, so the passage keeps its
   * own colour and takes a wash behind it.
   */
  const highlightStyle = `::highlight(${highlightName}) { background-color: rgb(var(--c-orange) / 0.22); }`

  /**
   * This file's comments that are anchored to a passage, which are the only ones this view
   * can mark. The same filter `CodeView` counts with, so the view that draws a pill and the
   * view that says it cannot draw one are reading the same set.
   */
  const quoted = useMemo(
    () => comments.filter(c => commentAnchorKind(c) === 'quote'),
    [comments],
  )

  /**
   * How many of those quotations are no longer in the document — DERIVED, not counted.
   *
   * A quotation that is not found is one that got no marker, so this is exactly the shortfall,
   * and a `missing++` in the relocation loop would only be recounting what the loop already
   * says. Nothing tears: the pass below is a layout effect, so the frame in which `quoted` is
   * new and `markers` is still the previous document's never reaches the screen.
   */
  const lost = quoted.length - markers.length

  /**
   * Take a placement, keeping the previous array when it says the same thing.
   *
   * A `useCallback` because both effects below hold it in their dependency arrays — the
   * convention `CodeView` states, where memoising MEANS the identity is read somewhere.
   */
  const commitMarkers = useCallback((placed: Marker[]) => {
    setMarkers(previous => (sameMarkers(previous, placed) ? previous : placed))
  }, [])

  useEffect(() => {
    const root = proseRef.current
    // Guarded like `FilePreviewPanel`'s and `TabStrip`'s sweeps, which is the app's rule for
    // this API rather than a nicety about ancient runtimes.
    if (!root || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(() => setReflow(n => n + 1))
    observer.observe(root)
    return () => observer.disconnect()
  }, [])

  /**
   * Find every quotation again and paint it.
   *
   * Everything is re-derived, nothing is remembered. That is what makes a re-read, a theme
   * change and an edit to the file all work without bookkeeping: the anchor is the quote, and
   * the quote is searched for in whatever text is on screen now.
   *
   * A LAYOUT effect, because `placeMarkers` measures: a passive one would let the browser
   * paint a frame with the previous document's pills still in their old places.
   *
   * Keyed on the COMMENTS and the CONTENT, and pointedly not on `reflow`. The search is the
   * expensive half — one `TreeWalker` pass over the whole document, then a `locateQuote` per
   * comment that collapses the document's text again whenever an exact match misses — and a
   * re-wrap changes none of its answers: the same characters are in the same order, at
   * different coordinates. The ranges follow the text on their own, and so does the highlight
   * painted from them, so a resize has nothing to find again. It only has to re-measure, which
   * is the effect below.
   *
   * A quotation that is NOT found is left out rather than dropped. The comment stays in the
   * store and in the review's list either way — the anchor is what was lost, not the note —
   * and the notice below is what says so. It has to be said here and cannot be said anywhere
   * else: the comment list is portalled to `<body>` and holds none of this document's DOM, so
   * it has no way to know whether a passage is still on screen.
   */
  useLayoutEffect(() => {
    const root = proseRef.current
    if (!root) return

    const ranges = new Map<string, Range>()
    rangesRef.current = ranges

    if (quoted.length === 0) {
      setMarkers(NO_MARKERS)
      if (hasHighlights()) CSS.highlights.delete(highlightName)
      return
    }

    const rendered = readRendered(root)
    for (const comment of quoted) {
      const at = locateQuote(rendered.text, comment.quote)
      const range = at ? rangeOf(rendered, at.start, at.end) : null
      if (range) ranges.set(comment.id, range)
    }

    commitMarkers(placeMarkers(root, ranges))
    if (hasHighlights()) CSS.highlights.set(highlightName, new Highlight(...ranges.values()))
  }, [quoted, content, highlightName, commitMarkers])

  /**
   * Put the pills back where the text now is, without looking for the text again.
   *
   * This is the whole of what a reflow costs: `rangesRef` already holds a live `Range` per
   * relocated comment, and a `Range` follows the nodes it is over. So a drawer being dragged
   * wider re-reads a handful of client rects per frame instead of re-walking forty documents
   * and re-searching every quotation in them.
   *
   * Nothing to do before the pass above has run, which is what the empty-map check says — and
   * it is also why the effect can be keyed on `reflow` alone: the pass above sets the markers
   * for its own document itself.
   */
  useLayoutEffect(() => {
    const root = proseRef.current
    if (!root || rangesRef.current.size === 0) return
    commitMarkers(placeMarkers(root, rangesRef.current))
  }, [reflow, commitMarkers])

  /**
   * Take the registration down with the layer.
   *
   * `CSS.highlights` is the document's, so a name left in it after the card unmounted would
   * hold a `Range` over detached nodes for as long as the app ran — and a review scrolls
   * through cards for a living.
   */
  useEffect(() => () => {
    if (hasHighlights()) CSS.highlights.delete(highlightName)
  }, [highlightName])

  /**
   * Open the card the review's comment list asked for.
   *
   * Modelled on `CodeView`'s, guard included: keyed on `seq` rather than on the target, so a
   * second click on the same entry does the jump again and an unrelated store write does not
   * reopen a card the reader has since dismissed.
   *
   * Line-anchored comments are left alone rather than opened here. This view has nothing to
   * anchor a card to for one of them — the whole reason they carry a notice in the diff — and
   * a card hanging off no passage would sit at the corner of the window saying nothing.
   */
  useEffect(() => {
    if (!focus || focusRef.current === focus.seq) return
    // `quoted` rather than `comments`, which IS the "left alone" above: a line-anchored
    // comment is simply not in this set.
    if (!quoted.some(c => c.id === focus.id)) return
    focusRef.current = focus.seq
    setPending(null)
    setCard({ mode: 'existing', id: focus.id })
  }, [focus, quoted])

  /**
   * The comment the open card is showing, or `null` while a new one is being written.
   *
   * Read back out of the store rather than remembered when the card was opened, the same rule
   * the markers follow: the store is the only thing that survives the document being re-read.
   */
  const openComment: FileComment | null =
    card?.mode === 'existing' ? comments.find(c => c.id === card.id) ?? null : null

  /**
   * Where the floating panel should sit right now, asked again on every scroll frame.
   *
   * Read off a live `Range` rather than by searching for the passage again, which is what
   * keeps a hook that runs on every scroll event from walking the whole document sixty times
   * a second. A zero-sized rect is answered as `null` — that is a range whose nodes have gone,
   * and the hook reads `null` as "the anchor is not on screen" and hides the panel, which is
   * the truthful answer rather than pinning a card to the corner of the window.
   */
  const anchorRect = useCallback((): DOMRect | null => {
    const range = card?.mode === 'existing'
      ? rangesRef.current.get(card.id) ?? null
      : captureRef.current
    if (!range) return null
    const rect = firstRectOf(range)
    return rect.width === 0 && rect.height === 0 ? null : rect
  }, [card])

  const dismissPending = useCallback(() => setPending(null), [])
  const closeCard = useCallback(() => setCard(null), [])

  /**
   * Read the selection as a quotation, and offer to comment on it.
   *
   * The reading itself is `captureQuote` above — a pure function, so this is only the state
   * machine. Both the range and the offer are written on EVERY release, the failures included:
   * a stale range left behind by a previous selection is a range nothing may read, and the one
   * assignment is cheaper to trust than the invariant that nothing does.
   */
  const handleMouseUp = (e: React.MouseEvent) => {
    const root = proseRef.current
    if (!root || e.button !== 0) return
    const capture = captureQuote(root)
    captureRef.current = capture?.range ?? null
    setPending(capture?.quote ?? null)
  }

  /**
   * Plain functions, the convention `CodeView` states: `useCallback` in a file like this MEANS
   * the identity is read somewhere. These three go to the offer and the card, neither of which
   * is memoised and neither of which puts them in a dependency array.
   */
  const handleConfirm = () => {
    if (!pending) return
    setCard({ mode: 'new', quote: pending })
    setPending(null)
  }

  const handleSave = (body: string) => {
    if (!card) return
    // `anchor: null` and a quote — the shape story 5 defined for exactly this, which is why
    // no model change was needed. What tells it from a comment on the whole file is the
    // quote, and only `commentAnchorKind` reads that.
    if (card.mode === 'new') addFileComment(target, { anchor: null, quote: card.quote, body })
    else updateFileComment(target, card.id, body)
    setCard(null)
  }

  const handleDelete = () => {
    if (card?.mode === 'existing') removeFileComment(target, card.id)
    setCard(null)
  }

  const openMarker = (id: string) => {
    setPending(null)
    setCard({ mode: 'existing', id })
  }

  const markerLabel = t('filePreview.commentMarker')

  return (
    <>
      <style>{highlightStyle}</style>

      {/* The mirror image of the notice the diff draws, and the same widget: this one is about
          a passage the document no longer contains, and it says the comments are KEPT, which is
          the point — an anchor that no longer resolves is not a reason to lose a note the
          reader wrote. `px-5` is `MarkdownView`'s own `SCALE.panel` padding, so the notice
          lines up with the prose below it. */}
      <CommentAnchorNotice
        count={lost}
        one="filePreview.commentQuoteLost.one"
        other="filePreview.commentQuoteLost.other"
        className="px-5"
      />

      {/* `relative` so the overlay below can be positioned against the document, and the
          mouseup handler so a selection anywhere in it is heard. `MarkdownView` itself is
          passed nothing it did not already take. */}
      <div ref={proseRef} className="relative" onMouseUp={handleMouseUp}>
        <MarkdownView content={content} />

        {/* `pointer-events-none` on the container and `auto` on each pill, and that pairing is
            load-bearing rather than tidy: a transparent box over an already-commented passage
            would otherwise swallow the mousedown and mouseup on it, making that text
            unselectable — which would kill the very gesture this feature is made of.

            `data-comment-overlay` is what the walk rejects, so nothing in here can reach the
            rendered text and shift the offsets a quote is stored against.

            `data-comment-ids` is the same attribute the diff's rows carry, so the review
            panel's jump finds a pill with the selector it already had — widened from
            `.line[…]` to match either. One id per pill: a pill IS a comment here, where a row
            of a diff can be covered by several. */}
        <div data-comment-overlay className="absolute inset-0 pointer-events-none">
          {markers.map(marker => (
            <button
              key={marker.id}
              type="button"
              data-comment-ids={marker.id}
              onClick={() => openMarker(marker.id)}
              aria-label={markerLabel}
              title={markerLabel}
              style={{ top: marker.top, left: marker.left, width: PILL_PX, height: PILL_PX }}
              className="absolute pointer-events-auto flex items-center justify-center p-0 rounded bg-transparent border-none text-orange cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5" />
            </button>
          ))}
        </div>
      </div>

      {/* The offer, and then the card. Never both: confirming the one opens the other, and a
          second floating panel over the same passage would cover it. */}
      {pending && !card && (
        <CommentAffordance
          anchorRect={anchorRect}
          onConfirm={handleConfirm}
          onDismiss={dismissPending}
        />
      )}
      {card && (card.mode === 'new' || openComment !== null) && (
        <CommentCard
          /* Keyed on WHICH comment, so clicking a second pill while the first card is open
             remounts it rather than inheriting the previous comment's draft body and its
             read/edit mode, both of which are state local to the card. */
          key={card.mode === 'new' ? 'new' : card.id}
          comment={openComment}
          /* No lines, and the card names itself from the quote instead — see its `range`. */
          range={null}
          quote={card.mode === 'new' ? card.quote : ''}
          anchorRect={anchorRect}
          onSave={handleSave}
          onDelete={handleDelete}
          onClose={closeCard}
        />
      )}
    </>
  )
}
