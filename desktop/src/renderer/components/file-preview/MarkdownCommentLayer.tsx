import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type ComponentType, type ReactNode } from 'react'
import { MessageSquare } from '@ds/desktop/icons'
import { CommentBubble, holdsCommentDraft, COMMENT_GUTTER_PX, COMMENT_BUBBLE_PX } from '@ds/desktop'
import MarkdownView, { type MarkdownListProps, type MarkdownTableProps } from './MarkdownView'
import CommentCard, { CommentAnchorNotice, type CommentAuthor, type CommentThread } from './CommentCard'
import { CommentLine, CommentLinesProvider, lineElementOf, lineIdOf } from './CommentLines'
import { SpecSelectionToolbar } from './SpecSelectionToolbar'
import { scrollCardIntoView, useInlineCommentHosts } from '../../hooks/useInlineCommentHosts'
import {
  clampQuote, commentAnchorKind, commentFileKey, type CommentTarget,
} from '../../utils/commentAnchors'
import { locateQuote } from '../../utils/quoteAnchors'
import { useStore, NO_COMMENTS, type FileComment, type NewFileComment } from '../../store'
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
  /**
   * Whether this layer is the agent sidebar's live spec rather than a review's rendered file.
   *
   * Handed straight to every card and read nowhere else here: what it changes is what a CARD
   * paints, and this component's own job — capturing a passage, relocating it after a rewrite,
   * placing a host — is the same either way. See `CommentCard`'s `spec` for the two changes.
   *
   * NOT derived from `fingerprint === SPEC_FINGERPRINT`, which would have needed no new prop
   * at all. That value is a KEY, and a key is the wrong thing to read a presentation decision
   * off: the two would then be locked together, so a later story that wanted the spec's card
   * in a review's shape — or a second live document keyed some other way — would have to
   * change what the store files comments under to do it. A flag says which it is and costs one
   * boolean, which `memo` above still holds across.
   */
  spec?: boolean
  /**
   * The type scale `MarkdownView` renders at. Passed straight through, exactly as
   * `content` is.
   *
   * It exists because this layer has a SECOND caller now: a plan's detail page, which
   * renders the spec as a document rather than in a 70%-wide drawer. Before, that page
   * mounted `MarkdownView` itself and picked `document`; wrapping it in this layer without
   * the prop would have retyped the whole spec one size down, which is not a change
   * anybody asked for on the way to being able to comment on it.
   */
  variant?: 'panel' | 'document'
  /**
   * DRAW THE DOCUMENT AS LINES: a mark at the end of every block, in a gutter reserved for
   * it, a ground on the one whose thread is open, and a bubble under the pointer rather than
   * a card spliced into the prose.
   *
   * ONE FLAG FOR THE WHOLE INTERACTION, because the halves do not come apart. A gutter with
   * no bubble would be a mark that opens a card two paragraphs down; a bubble with no gutter
   * would be a thread reachable only by selecting the text it is about again. Either half
   * alone is worse than neither.
   *
   * THE PROSE ITSELF STAYS INERT. Nothing here binds a click on a line: the mark is the
   * control, and a paragraph that opened a panel when you clicked it could not be
   * double-clicked for a word or clicked for a link.
   *
   * WHAT IT REPLACES, on the surfaces that ask for it:
   *
   *  * the pills in the overlay. A comment's presence is said by the mark in the column,
   *    which is in one place down the page instead of wherever the passage happened to
   *    start, and which carries the count.
   *  * the cards in the flow. Nothing is spliced into the document at all — see
   *    `anchorBlocks`, which answers an empty map here — so a spec with a dozen comments on
   *    it is still the spec, at the length it was written.
   *  * the highlight on every located passage. A line comment quotes its whole line, so
   *    painting them all would wash half the document orange and fight the ground under the
   *    cursor. The mark is what says a line has been written about; the highlight is kept
   *    for the one case where the anchor is NOT a line, which is a passage somebody has just
   *    dragged across.
   *
   * Absent for the review's own views and for the agent sidebar's spec, which keep the card
   * in the flow: a review is read once, top to bottom, and the notes ARE the document.
   */
  lines?: boolean
  /**
   * WHERE THE COMMENTS LIVE, and what writing one does — injected, or the renderer's own
   * store by default.
   *
   * READS AND WRITES TOGETHER, and the second half is the load-bearing one. A read-only
   * override would have left `saveComposer` writing straight into zustand, so a comment
   * left on a colleague's plan would have gone into this machine's memory and nowhere
   * else — the exact behaviour this story exists to end, dressed up as a fix.
   *
   * Absent for `CodeView`, `FilePreviewPanel`, `specCard` and `ReviewCommentsButton`,
   * which are annotating a LOCAL review and have no business talking to the cloud: their
   * comments are this machine's notes, they are handed to an agent running on this
   * machine, and giving them a backend would mean uploading every note anybody takes on
   * every diff. The default IS the store, so those four call sites did not change.
   */
  source?: CommentSource
  /**
   * Draw the comments whose passage this layer could not find — asked, in render, with
   * the ones it could not place.
   *
   * See `CommentAnchorNotice`'s `children` for why they can only be drawn there: an
   * orphaned comment gets no range, therefore no host, therefore no card. WHICH of them
   * those are is this file's answer — locating a quote needs the text the document
   * currently renders as, and that comes out of a DOM walk in here — and HOW to draw one
   * is the caller's, because only it knows the author, the date and the thread.
   *
   * A CALLBACK CALLED DURING RENDER, and not a pair of props handing the ids out and the
   * nodes back. The layer already knows which comments it placed — `markers` is one pill
   * per located passage — so the set is derivable where it is needed. Reporting it to a
   * caller that stored it in state and answered with new nodes made a cycle: render, pass,
   * report, state, render, with the caller's `comments` array new each time and the
   * relocation pass re-run on every turn of it.
   *
   * Absent for every store-backed caller, which draws the bare sentence it always drew.
   */
  renderOrphans?: (lost: readonly FileComment[]) => ReactNode
  /**
   * Comments the CALLER already knows are orphaned — counted in the notice above, and
   * handed to `renderOrphans` with the ones the relocation pass could not find.
   *
   * There is a kind of orphan this layer cannot recognise on its own: a comment carrying no
   * quote at all. `commentAnchorKind` reads that as a note on the whole file, which is
   * exactly what it is for every store-backed caller, so this file cannot treat it as a lost
   * anchor without breaking the four views that rely on the other reading. But on a plan
   * there is no file to comment on, and an empty quote means the thread lost the head that
   * carried its passage — see `isOrphanedPlanCommentThread`. Whoever knows which world they
   * are in names them here.
   *
   * They are NOT in the relocation pass, which would have nothing to search for, and NOT in
   * `quoted`, which is what gets a pill and a card. Being in the lost set is their whole
   * presence in this view, and it is the difference between a comment shown under the
   * notice and a comment shown nowhere.
   *
   * Absent for every store-backed caller, whose whole-file comments are not orphans.
   */
  anchorless?: readonly FileComment[]
  /** Passed straight through to `MarkdownView`, exactly as `variant` is. */
  table?: ComponentType<MarkdownTableProps>
  /** Passed straight through to `MarkdownView`, exactly as `table` is. */
  list?: ComponentType<MarkdownListProps>
}

/**
 * A place to keep comments, and the three things a reader does to them.
 *
 * ONE OBJECT rather than four props, because they are one decision: a layer reading from
 * the cloud and writing to the store would be a bug with no reason to exist, and a partial
 * override is a state the callers cannot produce. Either all of it is injected or none of
 * it is.
 */
export interface CommentSource {
  /**
   * THE THREE WRITES ANSWER WHETHER THEY LANDED, and the answer is not optional.
   *
   * A source exists because the comments are somewhere this app does not control: behind a
   * table, a policy and a network. Every one of these can be refused — by RLS, by a
   * connection that dropped, by a row a colleague deleted from the webapp a second ago —
   * and a `void` here made a refusal indistinguishable from success: the card closed over
   * a comment that was never stored. `false` is what keeps it open with the text still in
   * it, which is the whole of the retry.
   *
   * THE STORE-BACKED BRANCH ANSWERS `true`, always, and is none of this source's business:
   * see the layer's own `saveComposer` below. Writing into this machine's zustand store
   * cannot fail, so the four callers that use it pass nothing at all and get the behaviour
   * they had.
   */
  comments: readonly FileComment[]
  /** File a new comment. The layer supplies `anchor: null` and the quote it captured. */
  add: (comment: NewFileComment) => Promise<boolean>
  update: (id: string, body: string) => Promise<boolean>
  remove: (id: string) => Promise<boolean>
  /**
   * Who wrote one comment and what has been said under it, when the source knows — which
   * turns its card into an attributed, answerable one. See `CommentThread`.
   *
   * A LOOKUP rather than a field on the comment, so `FileComment` stays the shape the
   * store defines and the four store-backed callers keep passing exactly what they passed.
   */
  thread?: (id: string) => CommentThread | undefined
  /**
   * WHO IS READING, when the comments are attributed — their name and their photo, for the
   * card of a comment that does not exist yet. See `CommentCard`'s own `viewer`.
   *
   * On the source rather than as a prop of the layer, because it belongs to the same
   * decision every other field here belongs to: a place where comments have authors is a
   * place where the person writing one has a name, and a layer backed by this machine's
   * store has neither. Either the whole object is injected or none of it is.
   */
  viewer?: CommentAuthor
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

/** No caller-named orphans, as ONE array — `NO_MARKERS`' reason, for `anchorless`' default. */
const NO_ANCHORLESS: readonly FileComment[] = []

/**
 * The comment being written, if there is one — the passage it quotes, which is its whole
 * anchor in this view.
 *
 * There used to be a second shape beside it for "a stored comment whose card is open", and it
 * went when every stored comment became permanently open. Which stored card exists is no
 * longer a decision — it is one per comment — so the only thing left to hold is the one card
 * that has no comment behind it yet.
 */
interface Composer {
  quote: string
}

/**
 * The open bubble, in `lines` mode: what it is about, and where it hangs.
 *
 * ONE STATE FOR BOTH WAYS IN. A reader reaches it by pressing a line's mark or by dragging
 * across a passage, and those differ in exactly one field: which line it belongs to, a
 * passage belonging to none. A line that already has comments shows them; anything else
 * shows the box to write the first one.
 *
 * THE POSITION IS TAKEN ONCE, AT THE PRESS, against the document's own box. It is where the
 * pointer was, so the bubble appears under the hand that asked for it, and it scrolls with
 * the document because it is measured against it.
 */
interface Composing {
  /** The line it was opened on, or `null` for a passage somebody selected. */
  lineId: string | null
  /** What a comment written here would be anchored to. */
  quote: string
  top: number
  left: number
  above: boolean
}

/** How recent a press has to be to say where a bubble goes — older, it was another gesture. */
const POINTER_FRESH_MS = 1000

/** No fragment comments, as ONE set. `NO_MARKERS`' reason, for the quoted ones. */
const NO_FRAGMENTS: ReadonlySet<string> = new Set()

/** Whether two sets hold the same ids, so an unchanged one keeps its identity. */
function sameIds(a: ReadonlySet<string>, b: ReadonlySet<string>): boolean {
  if (a.size !== b.size) return false
  for (const id of a) if (!b.has(id)) return false
  return true
}



/** No comments on any line, as ONE map — `NO_MARKERS`' reason, for the line index. */
const NO_LINE_COMMENTS: ReadonlyMap<string, string[]> = new Map()

/** No passages to paint, as ONE array. `NO_MARKERS`' reason again. */
const NO_RANGES: Range[] = []

/**
 * The text with no whitespace at all.
 *
 * Used for ONE comparison — is this passage the whole of its line — and it has to drop the
 * whitespace rather than collapse it, because the two sides of that comparison are produced
 * differently: `Range.toString()` runs two blocks together with NOTHING between them where
 * the document's own walk puts a break. Collapsed to one space, a line made of several
 * blocks — a framing decision's question, decision and reason — read `a?b` against `a? b`,
 * and every comment on the whole of it was taken for a fragment: its quote echoed, its words
 * washed. Neither difference says anything about which words were picked.
 */
function squash(text: string): string {
  return text.replace(/\s+/g, '')
}

/** The composer's host key, in the same keyspace as the comment ids. See CodeView's own. */
const COMPOSER_KEY = '#composer'

/** No anchors, as ONE map — see `NO_HOSTS` in the hook for why the identity matters. */
const NO_ANCHORS: ReadonlyMap<string, HTMLElement> = new Map()

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
 * The OUTERMOST block a node sits in — the one whose parent is the prose container itself.
 *
 * `blockOf` above answers the innermost, which is what the text walk wants: a break belongs
 * between two `<li>`s. This answers the other end of the same chain, because the card is
 * spliced in as a SIBLING of what it is about, and a `<div>` inserted after an `<li>` lands
 * inside the `<ul>` — rendered as a list item, indented under a bullet it has nothing to do
 * with. After the whole list, it is a block between two blocks.
 *
 * `null` when the node is not in this document at all, which is the same containment test
 * `captureQuote` makes for the same reason: a review stacks forty of these in one scroller.
 */
function topBlockOf(node: Node, prose: Element): HTMLElement | null {
  let element = node instanceof Element ? node : node.parentElement
  if (!element || !prose.contains(element)) return null
  while (element.parentElement && element.parentElement !== prose) {
    element = element.parentElement
  }
  return element.parentElement === prose ? (element as HTMLElement) : null
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
      if (element.hasAttribute('data-comment-overlay') || element.hasAttribute('data-comment-exempt')) {
        return NodeFilter.FILTER_REJECT
      }
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
 *
 * ── THE TWO EDGES ARE NOT THE SAME QUESTION, AND THAT IS THE WHOLE OF THIS FUNCTION ──
 *
 * An offset that falls exactly ON a boundary between two text nodes can be expressed twice:
 * as the END of the node before it, or as the START of the node after it. They describe the
 * same point and the same characters, and a `Range` built from either covers exactly the
 * same text — which is why this was invisible for as long as the range was only ever
 * PAINTED.
 *
 * It stopped being invisible the moment something asked the range WHERE IT IS. A comment is
 * attached to the line its range starts in, and that is read off `range.startContainer`; if
 * the start was expressed as the tail of the previous node, the answer is the previous
 * node's line — or no line at all, which is what actually happened. react-markdown puts a
 * whitespace text node between two blocks (`</h2>\n<p>`), and that node belongs to the
 * container rather than to any line, so EVERY comment whose passage began at the start of a
 * block was attributed to the container and silently dropped: no mark, no count, no thread.
 * Only the very first block of a document escaped it, having no node before it.
 *
 * So the START takes the first span that actually CONTAINS the character at the offset
 * (`offset < span.end`), and the END keeps taking the first span the offset touches
 * (`offset <= span.end`), which is the node the last covered character lives in. Two
 * questions, two comparisons.
 */
function positionAt(spans: TextSpan[], offset: number, edge: 'start' | 'end'): TextPosition | null {
  for (const span of spans) {
    const holds = edge === 'end' ? offset <= span.end : offset < span.end
    if (holds) return { node: span.node, offset: Math.max(0, offset - span.start) }
  }
  const last = spans[spans.length - 1]
  return last ? { node: last.node, offset: last.node.data.length } : null
}

/** A live DOM range over a span of the rendered text. Free, the index being built alongside it. */
function rangeOf(rendered: RenderedText, start: number, end: number): Range | null {
  const from = positionAt(rendered.spans, start, 'start')
  const to = positionAt(rendered.spans, end, 'end')
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

/**
 * Whether two line indexes say the same thing, so an unchanged one can keep its identity.
 *
 * `sameMarkers`' reason exactly, and it bites harder here: this map is handed to every line
 * of the document through a context, so a fresh one per relocation pass would re-render
 * three hundred wrappers every time the spec is re-read — including the one the reader is
 * typing a comment into.
 */
function sameLineComments(
  a: ReadonlyMap<string, string[]>,
  b: ReadonlyMap<string, string[]>,
): boolean {
  if (a.size !== b.size) return false
  for (const [line, ids] of a) {
    const other = b.get(line)
    if (!other || other.length !== ids.length) return false
    if (ids.some((id, i) => other[i] !== id)) return false
  }
  return true
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
/**
 * Whether a node sits in a block marked `data-comment-exempt`: part of the document, and
 * not something anybody comments on — a spec's header, its coordinates rather than a claim.
 * The walk leaves its text out, so it can neither be quoted nor searched for.
 */
function isExempt(node: Node | null): boolean {
  const element = node instanceof Element ? node : node?.parentElement
  return !!element?.closest('[data-comment-exempt]')
}

function captureQuote(root: HTMLElement): Capture | null {
  const selection = window.getSelection()
  if (!selection || selection.isCollapsed || selection.rangeCount === 0) return null
  if (!root.contains(selection.anchorNode) || !root.contains(selection.focusNode)) return null
  // A block the document says is not for commenting: a drag that starts or ends in it offers
  // nothing. Its text is out of the walk as well, so a drag across it quotes around it.
  if (isExempt(selection.anchorNode) || isExempt(selection.focusNode)) return null

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
export default function MarkdownCommentLayer({
  content, repoPath, filePath, fingerprint, spec, variant, lines, source, renderOrphans,
  anchorless = NO_ANCHORLESS, table, list,
}: Props) {
  const t = useT()
  const proseRef = useRef<HTMLDivElement>(null)

  const target: CommentTarget = { repoPath, path: filePath, fingerprint }
  const commentKey = commentFileKey(target)
  // `NO_COMMENTS` rather than `?? []`, for the reason it exists: zustand compares a
  // selector's result by identity, and a fresh array per call would re-render every mounted
  // layer on every unrelated store mutation.
  //
  // READ UNCONDITIONALLY, even when a `source` is going to win: a hook cannot be skipped,
  // and the selector is a map lookup. A layer with an injected source simply never has an
  // entry under its key, because nothing writes one.
  const storedComments = useStore(s => s.fileComments[commentKey] ?? NO_COMMENTS)
  const addFileComment = useStore(s => s.addFileComment)
  const updateFileComment = useStore(s => s.updateFileComment)
  const removeFileComment = useStore(s => s.removeFileComment)

  const comments = source?.comments ?? storedComments

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

  const [composer, setComposer] = useState<Composer | null>(null)
  const [markers, setMarkers] = useState<Marker[]>(NO_MARKERS)

  /** `lines` mode only, all of them. Nothing sets these on the surfaces that keep the cards. */
  const [composing, setComposing] = useState<Composing | null>(null)
  /**
   * The comments whose passage is a FRAGMENT of its line rather than the line itself.
   *
   * Two things read it and they are the two halves of the same answer: the passage is washed
   * in the document, and the bubble echoes it. Both exist because such a comment is the one
   * kind whose subject the reader cannot otherwise see — a line comment's subject is the
   * line, which is lit, and under the bubble.
   */
  const [fragments, setFragments] = useState<ReadonlySet<string>>(NO_FRAGMENTS)
  /** The box the bubble is placed against — the document, and the bubble over it. */
  const frameRef = useRef<HTMLDivElement>(null)
  /** The last press anywhere, so a bubble can open under it. See `bubbleAt`. */
  const pointerRef = useRef<{ x: number; y: number; at: number } | null>(null)
  /**
   * Which comments have been relocated onto which line — the counts the marks draw, and the
   * threads a bubble opens.
   *
   * DERIVED FROM THE RANGES, in the same pass that finds them, and never stored on a comment:
   * the anchor is the quotation and nothing else, so which line a comment sits on is a fact
   * about the document as it is currently rendered. A spec rewritten under the reader moves
   * its comments to different lines, and nothing has to be migrated for that to be true.
   */
  const [lineComments, setLineComments] = useState<ReadonlyMap<string, string[]>>(NO_LINE_COMMENTS)

  /**
   * The live range the open card is anchored to.
   *
   * A range rather than a rect, and it outlived the floating panel that needed it: a rect is
   * in viewport coordinates and stale one scroll event later, while a live `Range` survives
   * scrolling and reflow and can be asked again. The card no longer needs a POSITION, but it
   * still needs to know which block the passage ends in — see `anchorBlock`.
   *
   * A REF rather than state, because the selection that produced it is collapsed by the very
   * next click in the document: by then there is nothing left to read it back out of.
   *
   * Written by the selection, and RE-written by `composerBlock` when a re-read has detached it.
   * The quote is the durable anchor here as it is everywhere else in this file; this range is a
   * cache of where that quote currently is, which is why replacing it costs nothing.
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
   * The passages painted in `lines` mode: the comments that are about a FEW WORDS of a line
   * rather than about the line.
   *
   * A ref because two effects register the highlight and neither can depend on the other's
   * state: the relocation pass finds these, and the bubble opening and closing repaints
   * around them without searching for anything. See `paintHighlight`.
   */
  const partialRef = useRef<Range[]>(NO_RANGES)

  /**
   * The open bubble, readable from an effect that must not RUN when it changes.
   *
   * The relocation pass paints the highlight, and what it paints depends on whether a
   * passage is currently selected — but putting `bubble` in that effect's dependencies would
   * re-walk and re-search the whole document every time a bubble opened.
   */
  const composingRef = useRef<Composing | null>(null)
  composingRef.current = composing

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
  const highlightStyle = `::highlight(${highlightName}) { `
    + `color: rgb(var(--c-orange)); background-color: rgb(var(--c-orange) / 0.18); }`

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
   * WHICH of those quotations are no longer in the document — DERIVED, not counted, and not
   * reported to anybody.
   *
   * A quotation that is not found is one that got no marker, and `placeMarkers` emits exactly
   * one pill per passage it placed, so the ids on `markers` ARE the located set. Naming the
   * comments rather than the shortfall is what lets a caller draw the orphans themselves: a
   * number says how many notes lost their anchor and cannot say which, so one could be
   * counted in a sentence and never drawn anywhere.
   *
   * Nothing tears: the relocation pass is a layout effect, so the frame in which `quoted` is
   * new and `markers` is still the previous document's never reaches the screen.
   *
   * `anchorless` FIRST, and it is not derived at all: those are the comments the caller
   * already knows have no passage to look for, so no pass over the document could ever have
   * found them. They cannot be double-counted — `quoted` holds only the comments that DO
   * carry a quote, which is precisely what they do not.
   */
  const lostComments = useMemo(() => {
    const placed = new Set(markers.map(marker => marker.id))
    return [...anchorless, ...quoted.filter(comment => !placed.has(comment.id))]
  }, [anchorless, quoted, markers])

  /**
   * The rendered document, held across this component's OWN re-renders.
   *
   * `MarkdownView` is not memoised, and it lives in here now rather than beside this layer:
   * every pill placement, every reflow tick, every opening of a composer re-renders this
   * component, and each of those would otherwise re-run remark, rehype and the sanitiser
   * over the whole file. The ResizeObserver below bumps `reflow` on every frame of a drag,
   * so this is the difference between measuring a few rects per frame and re-parsing a
   * document per frame — which is the very cost `SpecBody`'s own `memo` was written to
   * avoid, one level up.
   */
  const prose = useMemo(
    () => (
      <MarkdownView
        content={content}
        variant={variant}
        /* A module-level function, so the identity is stable and this memo holds. What the
           lines READ changes whenever a bubble opens or a comment is filed; what BUILDS
           them does not, which is what keeps either of those from re-running remark over
           the whole spec. */
        line={lines ? CommentLine : undefined}
        table={table}
        list={list}
      />
    ),
    [content, variant, lines, table, list],
  )

  /**
   * Take a placement, keeping the previous array when it says the same thing.
   *
   * A `useCallback` because both effects below hold it in their dependency arrays — the
   * convention `CodeView` states, where memoising MEANS the identity is read somewhere.
   */
  const commitMarkers = useCallback((placed: Marker[]) => {
    setMarkers(previous => (sameMarkers(previous, placed) ? previous : placed))
  }, [])

  /**
   * Paint what is worth painting, in `lines` mode: every commented FRAGMENT, plus the
   * passage being commented on right now if there is one.
   *
   * WHOLE-LINE COMMENTS ARE NOT IN IT, and that is the whole reason this is a choice rather
   * than "paint the ranges". A line comment quotes its entire line, so painting them all
   * would wash half a spec orange and leave the open one indistinguishable. Those lines are
   * coloured instead — the line's own text takes the annotation colour, which is text and
   * not ground — and the wash is kept for the case it is the only available answer: three
   * words inside a sentence, which nothing else on screen could point at.
   *
   * One function, called from both effects, so the registration cannot end up with only
   * half of what belongs in it.
   */
  const paintHighlight = useCallback(() => {
    if (!hasHighlights()) return
    const painted = [...partialRef.current]
    // The composer's own passage, while it is a passage and not a line.
    const selection = composingRef.current?.lineId === null ? captureRef.current : null
    if (selection) painted.push(selection)
    if (painted.length === 0) CSS.highlights.delete(highlightName)
    else CSS.highlights.set(highlightName, new Highlight(...painted))
  }, [highlightName])

  /**
   * Where the last press was. Capture phase, so it is heard before whatever the press opens
   * reads it — the mark's click, the toolbar's Comment.
   */
  useEffect(() => {
    if (!lines) return
    const onDown = (e: PointerEvent) => {
      pointerRef.current = { x: e.clientX, y: e.clientY, at: e.timeStamp }
    }
    document.addEventListener('pointerdown', onDown, true)
    return () => document.removeEventListener('pointerdown', onDown, true)
  }, [lines])

  /**
   * A PRESS OUTSIDE THE BUBBLE CLOSES IT — unless it holds text nobody has filed.
   *
   * `mousedown` rather than `click`, so a press on another line's mark closes this bubble
   * before that mark's click opens the next one.
   *
   * THE DRAFT OUTRANKS THE PRESS. A stray click is not a reason to throw away what somebody
   * was writing; Cancel and Escape are, and both say so on purpose.
   */
  useEffect(() => {
    if (!composing) return
    const onDown = (e: MouseEvent) => {
      if (e.target instanceof Element && e.target.closest('[data-comment-bubble]')) return
      if (holdsCommentDraft(frameRef.current ?? document)) return
      setComposing(null)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [composing])

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
      // Comments that came back and carry no passage at all: every one of them is invisible
      // on the line it was written about. See the fuller report below.
      if (comments.length > 0) {
        console.warn(`[plan comments] ${comments.length} read, none carries a passage`)
      }
      setMarkers(NO_MARKERS)
      setLineComments(previous => (previous.size === 0 ? previous : NO_LINE_COMMENTS))
      setFragments(previous => (previous.size === 0 ? previous : NO_FRAGMENTS))
      partialRef.current = NO_RANGES
      if (lines) paintHighlight()
      else if (hasHighlights()) CSS.highlights.delete(highlightName)
      return
    }

    const rendered = readRendered(root)
    for (const comment of quoted) {
      const at = locateQuote(rendered.text, comment.quote)
      const range = at ? rangeOf(rendered, at.start, at.end) : null
      if (range) ranges.set(comment.id, range)
    }

    commitMarkers(placeMarkers(root, ranges))

    /**
     * A comment that exists and could not be put anywhere, said out loud.
     *
     * The interface already reports this — that is what `CommentAnchorNotice` above the
     * document is — but it reports it as a sentence at the top of a long page, behind a
     * disclosure, which a reader halfway down a spec will never see. The console line is for
     * whoever is asked "I wrote a comment and nothing appeared": it says, in one place, how
     * many came back, how many carried a passage, how many were placed, and which passages
     * were not found. Silent in the ordinary case, which is every comment placed.
     */
    if (ranges.size < quoted.length) {
      const missing = quoted.filter(comment => !ranges.has(comment.id))
      console.warn(
        `[plan comments] ${comments.length} read, ${quoted.length} anchored, ${ranges.size} placed`,
        missing.map(comment => comment.quote),
      )
    }

    /**
     * WHICH LINE EACH ONE LANDED ON, read off the same ranges the pills were placed from.
     *
     * The range's START, where the card in the flow is anchored off its END — and the two
     * differ for the same reason each is right where it is. A card goes UNDER everything its
     * passage covers, so it is placed by where the passage stops; a mark in the gutter says
     * "this is written about from here", so it belongs beside the line the passage begins on.
     * A quotation spanning three paragraphs gets one mark, on the first of them.
     *
     * A comment whose passage is in no line at all — text directly under the prose container,
     * which markdown does not produce but raw HTML can — is simply not counted. It keeps its
     * comment and loses its mark, which is the same bargain a lost anchor already strikes.
     */
    if (lines) {
      const byLine = new Map<string, string[]>()
      const partial: Range[] = []
      const fragmentIds = new Set<string>()
      for (const [id, range] of ranges) {
        const line = lineElementOf(range.startContainer, root)
        const key = line && lineIdOf(line)
        // A passage in no line at all — raw HTML dropped straight into the prose — keeps
        // its wash, which is the only mark it can have.
        if (!line || !key) {
          partial.push(range)
          fragmentIds.add(id)
          continue
        }
        /**
         * IS THIS COMMENT ABOUT THE LINE, OR ABOUT SOME WORDS IN IT?
         *
         * Asked of the text and not of the record, because the record cannot answer it: both
         * kinds are stored as a quotation and nothing else, and what tells them apart is
         * whether the quotation turned out to BE the line. That also makes the answer follow
         * the document — a fragment that grows to cover its whole line after a rewrite is,
         * from then on, a comment on that line, which is what a reader would say too.
         *
         * It decides ONE thing: whether the passage is washed. The line takes the annotation
         * colour either way, because it carries a discussion either way; the wash is what
         * says WHICH words, and on a whole-line comment there are no particular words to
         * point at.
         */
        const found = byLine.get(key)
        if (found) found.push(id)
        else byLine.set(key, [id])
        if (squash(range.toString()) !== squash(readRendered(line).text)) {
          partial.push(range)
          fragmentIds.add(id)
        }
      }
      setLineComments(previous => (sameLineComments(previous, byLine) ? previous : byLine))
      setFragments(previous => (sameIds(previous, fragmentIds) ? previous : fragmentIds))
      partialRef.current = partial.length === 0 ? NO_RANGES : partial
      paintHighlight()
      return
    }

    if (hasHighlights()) CSS.highlights.set(highlightName, new Highlight(...ranges.values()))
  }, [comments.length, quoted, content, highlightName, commitMarkers, paintHighlight, lines])

  /**
   * The ONE passage `lines` mode does paint: the one somebody has just dragged across, for
   * as long as its bubble is open.
   *
   * It is the only anchor in that mode the document does not already show by itself. A line
   * says which line it is by being lit under the bubble; a passage inside a line is three
   * words of a paragraph, and without the wash there is nothing to say which three.
   */
  useEffect(() => {
    if (lines) paintHighlight()
  }, [lines, composing, paintHighlight])

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
   * Which block the COMPOSER's card is spliced in after — the one anchor that is not a stored
   * comment's, and the one that had to be taught the rule the rest of this file already obeys.
   *
   * `captureRef` holds the `Range` the selection produced, and reading its `endContainer` is
   * right for as long as that node is still in the document. On a LIVE spec it stops being:
   * `/magic:plan` saves, the panel re-reads, `MarkdownView` replaces the prose wholesale, and
   * the captured range is left over nodes nothing contains. `topBlockOf` then answers null, the
   * composer gets no entry, and `useInlineCommentHosts` removes its host as orphaned — which
   * unmounts the card and takes the half-written comment with it. A stored comment never had
   * this problem because it is never read off a kept range: the relocation pass SEARCHES for
   * its quote in whatever text is on screen now.
   *
   * So the composer is relocated the same way, and only when it has to be. The captured range
   * is tried first — it is exact, it costs a parent walk, and it is what every render before
   * the first rewrite gets — and a detached one falls back to `locateQuote` over the current
   * document, exactly as `quoted` is relocated above. The recovered range is written back to
   * `captureRef` so the next pass is a parent walk again rather than a second search, and so
   * that saving files the passage as it now stands.
   *
   * A quotation the agent DELETED while it was being composed on finds nothing, and the draft
   * is lost as before. That is the residual case and it is not one this can fix: there is no
   * block to splice the card after when the text it is about is gone. What it does buy is that
   * the far more common rewrite — a section appended somewhere else in the document — no longer
   * touches the draft at all.
   *
   * A `useCallback` because `anchorBlocks` holds it in its dependency array, per this file's
   * convention that memoising MEANS the identity is read somewhere.
   */
  const composerBlock = useCallback((
    root: HTMLElement,
    prose: Element,
    quote: string,
  ): HTMLElement | null => {
    const captured = captureRef.current
    if (captured) {
      const block = topBlockOf(captured.endContainer, prose)
      if (block) return block
    }
    const rendered = readRendered(root)
    const at = locateQuote(rendered.text, quote)
    const range = at ? rangeOf(rendered, at.start, at.end) : null
    if (!range) return null
    captureRef.current = range
    return topBlockOf(range.endContainer, prose)
  }, [])

  /**
   * Which block each card is spliced in after: one per stored quotation, plus the composer's.
   *
   * `endContainer`, not the range's start, for the reason the diff anchors on its range's LAST
   * row — a card belongs under what it is about, and a quotation spanning three paragraphs is
   * about all three.
   *
   * Read off the live `Range`s rather than by searching for each passage again, the same way
   * the pills are placed: the ranges are kept as the document reflows, so this is a walk up a
   * parent chain per comment rather than a search of the whole document.
   *
   * A comment whose passage is no longer findable has no entry, so no card — `rangesRef` only
   * holds what the relocation pass could locate. Those are exactly the comments `lostComments`
   * names and `CommentAnchorNotice` reports, so a comment with nowhere to go still says so.
   *
   * `markers` and `quoted` are in the dependencies as PROXIES for `rangesRef` having been
   * rebuilt: the ranges live in a ref, which cannot be depended on, and the relocation pass that
   * fills it commits the markers in the same breath. Without them a comment saved on a fresh
   * passage would find no range here and get no card. BOTH, because either alone has a hole —
   * `markers` compares equal when a pill happens to land where the last one did, and `quoted`
   * does not change when a re-read moves a passage the comment list did not touch.
   */
  const anchorBlocks = useCallback((): ReadonlyMap<string, HTMLElement> => {
    // NOTHING IS SPLICED INTO A DOCUMENT DRAWN AS LINES. Every card it would have hosted is
    // in the bubble instead, so an empty map here is not a degraded state: it is the whole
    // of what `lines` promises about the document's length.
    if (lines) return NO_ANCHORS
    const root = proseRef.current
    const prose = root?.firstElementChild
    if (!root || !prose) return NO_ANCHORS
    const anchors = new Map<string, HTMLElement>()
    for (const [id, range] of rangesRef.current) {
      const block = topBlockOf(range.endContainer, prose)
      if (block) anchors.set(id, block)
    }
    if (composer) {
      const block = composerBlock(root, prose, composer.quote)
      if (block) anchors.set(COMPOSER_KEY, block)
    }
    return anchors
  }, [composer, composerBlock, content, lines, markers, quoted])

  const hosts = useInlineCommentHosts(anchorBlocks)

  /**
   * Take the reader to the comment the review's list asked for.
   *
   * A SCROLL, where this used to open a card — opening is not a thing that can be asked for any
   * more. Guarded on `seq` for the reason `CodeView`'s copy is: a second click on the same entry
   * does the jump again, and an unrelated store write does not scroll the reader away.
   *
   * Line-anchored comments have no host here and so are skipped — the whole reason they carry a
   * notice in the diff — which `hosts.get` answers without a second test.
   */
  useEffect(() => {
    if (!focus || focusRef.current === focus.seq) return
    const host = hosts.get(focus.id)
    if (!host) return
    focusRef.current = focus.seq
    scrollCardIntoView(host)
  }, [focus, hosts])

  const closeComposer = useCallback(() => setComposer(null), [])

  /**
   * Read the selection as a quotation, and open the card on it.
   *
   * The reading itself is `captureQuote` above — a pure function, so this is only the state
   * machine. The range is written on EVERY release, the failures included: a stale range left
   * behind by a previous selection is a range nothing may read, and the one assignment is
   * cheaper to trust than the invariant that nothing does.
   *
   * A release that captured nothing leaves the open card alone rather than closing it. The
   * card is in the flow now and holds text being written; a stray click in the prose is not a
   * reason to throw a draft away — Escape and Cancel are.
   */
  const handleMouseUp = (e: React.MouseEvent) => {
    const root = proseRef.current
    if (!root || e.button !== 0) return
    /**
     * A DOCUMENT DRAWN AS LINES DOES NOT COMMENT ON A SELECTION BY ITSELF any more: the
     * selection raises the format toolbar, and "Comment" is one of the things on it. A drag
     * across words is as often the start of making them bold as of writing about them, and a
     * composer opening on every one of them was a comment box in the way of the other.
     */
    if (lines) return
    const capture = captureQuote(root)
    captureRef.current = capture?.range ?? null
    if (!capture) return
    setComposer({ quote: capture.quote })
  }

  /**
   * Where a bubble opened now goes: under the last press when there has just been one, and
   * under `fallback` — the line, the passage — when it was opened from the keyboard.
   *
   * Clamped inside the document's width, so a press on the mark at the right edge does not
   * hang the bubble off the page; flipped above the pointer when the window has less room
   * left below it than above.
   */
  const bubbleAt = (fallback: DOMRect): Pick<Composing, 'top' | 'left' | 'above'> | null => {
    const frame = frameRef.current
    if (!frame) return null
    const box = frame.getBoundingClientRect()
    const pointer = pointerRef.current
    const fresh = pointer && performance.now() - pointer.at < POINTER_FRESH_MS ? pointer : null
    const x = fresh?.x ?? fallback.left
    const y = fresh?.y ?? fallback.bottom
    const below = window.innerHeight - y
    return {
      top: y - box.top,
      left: Math.max(0, Math.min(x - box.left - 16, box.width - COMMENT_BUBBLE_PX)),
      above: below < 320 && y > below,
    }
  }

  /**
   * Comment on the passage selected — the toolbar's "Comment". The range captured is what
   * the bubble hangs off: a passage is not an element, and its `Range` is the only thing that
   * knows where on screen it currently is.
   */
  const commentOnSelection = () => {
    const root = proseRef.current
    if (!root) return
    const capture = captureQuote(root)
    if (!capture) return
    // The draft guard `openLine` states: a comment being written must not be replaced.
    if (holdsCommentDraft()) return
    const at = bubbleAt(capture.range?.getBoundingClientRect() ?? root.getBoundingClientRect())
    if (!at) return
    captureRef.current = capture.range
    setComposing({ lineId: null, quote: capture.quote, ...at })
  }

  /**
   * Open a line: its thread if it has one, an empty box if it has not.
   *
   * THE QUOTE IS READ HERE AND NOT AT SAVE TIME, off the line's own rendered text, through
   * the very walk that will later be used to search for it again. That is what makes the
   * anchor findable: `readRendered` puts a break between two blocks where `textContent` puts
   * nothing, and a quote captured by one and searched for by the other is an anchor reported
   * lost the moment it is stored. The gutter mark and the count inside it are rejected by the
   * same walk, so a line already carrying two comments does not quote the digit `2`.
   *
   * Reading it even for a line that already HAS comments costs one walk of one block and
   * buys the case that follows: a reader opens a thread, answers it, and writes a second,
   * separate comment on the same line without the bubble having to be re-opened.
   */
  const openLine = useCallback((id: string) => {
    const root = proseRef.current
    // FOUND IN THE DOM RATHER THAN HANDED OVER, because what the mark can pass up is its
    // line's NAME and not its node: the button is drawn by a component in the design system,
    // which has no business holding a ref to the block it decorates. The name is on that
    // block as `data-comment-line`, which is the same attribute the relocation pass reads.
    const line = root?.querySelector(`[data-comment-line="${id}"]`)
    if (!(line instanceof HTMLElement)) return
    // THE OPEN BUBBLE'S DRAFT OUTRANKS THIS. It already refuses to close on a click outside
    // while it holds text — `holdsCommentDraft` is its own rule, imported rather than
    // restated — and opening another line would take that text away by replacing the card
    // that holds it, which is the same loss by another route. The reader still has Escape
    // and Cancel, both of which say they are done with it.
    if (holdsCommentDraft()) return
    const quote = clampQuote(readRendered(line).text.trim())
    if (!quote) return
    // A selection-anchored range left over from a previous bubble is not this one's: the
    // highlight effect reads it, and a stale range would paint a passage nobody picked.
    const at = bubbleAt(line.getBoundingClientRect())
    if (!at) return
    captureRef.current = null
    setComposing({ lineId: id, quote, ...at })
  }, [])

  /*
   * THERE IS NO CLICK HANDLER ON THE DOCUMENT, and its absence is a decision rather than an
   * omission.
   *
   * A click anywhere in a line used to open its bubble. It had to go the moment the mark
   * became a real button: two targets for one action, one of them the entire paragraph,
   * meant a reader could not put the caret in a sentence, could not double-click a word,
   * and could not click a link without the layer having an opinion about it first. The
   * mark in the gutter is the affordance now, and the prose is prose.
   *
   * What is left of the pointer here is `handleMouseUp` above — selecting a passage, which
   * is a different anchor and a different intent.
   */

  /**
   * Plain functions, the convention `CodeView` states: `useCallback` in a file like this MEANS
   * the identity is read somewhere. These go to the cards, which are not memoised and do not
   * put them in a dependency array.
   */

  /**
   * File what was being written, and let its own card take over — `CodeView`'s `saveComposer`
   * is where the shared reasoning lives.
   *
   * `anchor: null` and a quote: the shape story 5 defined for exactly this, which is why no
   * model change was needed. What tells it from a comment on the whole file is the quote, and
   * only `commentAnchorKind` reads that.
   *
   * One thing is this view's alone. The card that replaces the composer is anchored off
   * `rangesRef`, which the relocation pass fills by searching for each stored quote — so the
   * new comment's range has to be in there by the time the host effect asks. It is, and not by
   * luck: that pass is a layout effect declared above `useInlineCommentHosts`, so in the commit
   * that adds the comment it has already run. Moving either one across the other would leave
   * the comment with no card the instant it was saved.
   *
   * THE COMPOSER CLOSES ONLY ON A WRITE THAT LANDED, and the two branches reach that moment
   * differently. The store's is unchanged: `addFileComment` and `setComposer(null)` still run
   * in one synchronous pass, so the comment and the closing happen in the same commit and the
   * layout effect above is still what put the range there first. The source's returns a
   * promise, so the close lands a tick later, with the refetched comment arriving in a commit
   * of its own — which is the order it already had, since the write went to the network
   * either way. What is new is only that a REFUSED write never gets to that line: the card
   * stays open, holding the one copy of what was typed.
   */
  const saveComposer = async (body: string) => {
    if (!composer) return false
    const comment: NewFileComment = { anchor: null, quote: composer.quote, body }
    const ok = source ? await source.add(comment) : (addFileComment(target, comment), true)
    if (ok) setComposer(null)
    return ok
  }

  /**
   * Rewrite or drop one stored comment, named rather than inferred — there are as many cards as
   * comments now, so "the card" is not a thing either of these can ask about.
   *
   * Routed through the `source` when there is one, and to the store otherwise. The branch is
   * here rather than at the four call sites for the reason the prop's own docblock gives:
   * the writes have to follow the reads, or a comment on a colleague's plan is filed into
   * this machine's memory.
   *
   * Both answer whether the write landed, and the store's answers `true` without asking:
   * a zustand write is done by the time the call returns, so the card that awaits this gets
   * the behaviour it always had and only a source can ever say no. See `CommentSource`.
   */
  /**
   * The bubble's own save — `saveComposer`'s twin, and separate from it on purpose.
   *
   * The two differ in what they close, which is the one thing neither can get wrong: one
   * closes the card spliced into the flow, the other the bubble. Folding them
   * into one function with a branch inside would put that decision behind a flag at the
   * exact moment there is one copy of what somebody typed.
   *
   * THE BUBBLE CLOSES ON A WRITE THAT LANDED, and only then. The line takes the orange and
   * the counted mark, which is what opens the thread from now on.
   *
   * A refused write changes nothing at all: the box is exactly as it was, holding the only
   * copy of the text, with the failure written under it.
   */
  const saveBubbleComment = async (body: string) => {
    if (!composing) return false
    const comment: NewFileComment = { anchor: null, quote: composing.quote, body }
    const ok = source ? await source.add(comment) : (addFileComment(target, comment), true)
    if (ok) setComposing(null)
    return ok
  }

  const closeBubble = useCallback(() => setComposing(null), [])

  /**
   * What every line of the document reads: its own state, and the one way back in.
   *
   * MEMOISED because it is a context value handed to a few hundred consumers — a fresh
   * object per render would re-render every line of the spec on every keystroke in the
   * bubble.
   */
  const lineState = useMemo(() => ({
    /** WHICH LINE IS LIT: the one whose bubble is open, so the two read as one thing. */
    open: composing?.lineId ?? null,
    /**
     * HOW MUCH HAS BEEN SAID ABOUT THIS LINE, replies included.
     *
     * Not `ids.length`, which counts CONVERSATIONS: one line is one discussion, so that
     * number was almost always 1 whatever had been said, and a mark reading "1" beside a
     * thread eight turns long is a mark that answered the wrong question. What a reader
     * wants before looking is how much there is to read.
     */
    countOf: (id: string) => (lineComments.get(id) ?? []).reduce(
      (total, commentId) => total + 1 + (source?.thread?.(commentId)?.replies.length ?? 0),
      0,
    ),
    onOpen: openLine,
  }), [composing, lineComments, source, openLine])

  const saveComment = async (id: string, body: string) => (
    source ? await source.update(id, body) : (updateFileComment(target, id, body), true)
  )
  const deleteComment = async (id: string) => (
    source ? await source.remove(id) : (removeFileComment(target, id), true)
  )

  /**
   * This file's QUOTED comments by id — the only ones this view can show — so the render can go
   * from a host key to its comment without a linear scan per card.
   */
  const commentsById = new Map(quoted.map(c => [c.id, c]))

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
        count={lostComments.length}
        one="filePreview.commentQuoteLost.one"
        other="filePreview.commentQuoteLost.other"
        className="px-5"
      >
        {/* The orphans themselves, when the caller can draw them — the ONLY place they can
            exist, since a comment with no range gets no host and a card portals into one.
            Absent for the store-backed callers, which keep the bare sentence. */}
        {renderOrphans?.(lostComments)}
      </CommentAnchorNotice>

      {/* `relative` so the overlay below can be positioned against the document, and the
          mouseup handler so a selection anywhere in it is heard. `MarkdownView` itself is
          passed nothing it did not already take.

          THE PADDING IS THE GUTTER THE MARKS STAND IN, in `lines` mode and only there.
          Every mark is `absolute right-0` against THIS box, so the strip they line up in is
          the one this padding holds open: without it they would be drawn over the last
          words of every full line. See `COMMENT_GUTTER_PX`, which is the one place the
          width is written down.

          ONE POINTER HANDLER, and it is the one that was here before any of this: a
          selection anywhere in the document is a quotation. Opening a line goes through the
          button in its gutter and nothing else — see the note above `handleMouseUp`. */}
      {/* THE FRAME: the document and the bubble over it, in one box, so the bubble can be
          placed against the same origin the pointer is measured from. */}
      <div ref={frameRef} className="relative">
      <div
        ref={proseRef}
        className="relative"
        /* The gutter the marks stand in: every mark is `absolute right-0` against this box. */
        style={lines ? { paddingRight: COMMENT_GUTTER_PX } : undefined}
        onMouseUp={handleMouseUp}
      >
        {/* The provider wraps the document rather than the whole layer: what is inside it is
            exactly the set of components that read the line state, and the notice and the
            bubble above and below are not among them. */}
        {lines ? <CommentLinesProvider value={lineState}>{prose}</CommentLinesProvider> : prose}
        {lines && <SpecSelectionToolbar rootRef={proseRef} onComment={commentOnSelection} />}

        {/* THE PILLS, on every view but a document drawn as lines: there, the mark in the
            gutter says the same thing in one column down the page instead of wherever each
            passage happened to start, and it carries the count besides.

            `pointer-events-none` on the container and `auto` on each pill, and that pairing is
            load-bearing rather than tidy: a transparent box over an already-commented passage
            would otherwise swallow the mousedown and mouseup on it, making that text
            unselectable — which would kill the very gesture this feature is made of.

            `data-comment-overlay` is what the walk rejects, so nothing in here can reach the
            rendered text and shift the offsets a quote is stored against.

            `data-comment-ids` is the same attribute the diff's rows carry, so the review
            panel's jump finds a pill with the selector it already had — widened from
            `.line[…]` to match either. One id per pill: a pill IS a comment here, where a row
            of a diff can be covered by several. */}
        {!lines && (
          <div data-comment-overlay className="absolute inset-0 pointer-events-none">
            {markers.map(marker => (
              <button
                key={marker.id}
                type="button"
                data-comment-ids={marker.id}
                /* Scrolls to the card rather than opening it: every comment's card is already
                   mounted. Kept clickable where the diff's row markers were made inert, and
                   the two views differ for a real reason — a card goes after the whole BLOCK
                   its passage ends in, so a long list or table can put it well below the
                   pill, where a diff's card is always the next row down. */
                onClick={() => {
                  const host = hosts.get(marker.id)
                  if (host) scrollCardIntoView(host)
                }}
                aria-label={markerLabel}
                title={markerLabel}
                style={{ top: marker.top, left: marker.left, width: PILL_PX, height: PILL_PX }}
                className="absolute pointer-events-auto flex items-center justify-center p-0 rounded bg-transparent border-none text-orange cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* THE BUBBLE, under the press that opened it.
          Outside `proseRef` on purpose: everything inside that element is walked as the
          document's own text — for capturing a quotation and for finding one again — and a
          comment card in there would put its words into the document's. A sibling shares
          the frame's coordinates and none of its meaning. */}
      {lines && composing && (
        <CommentBubble top={composing.top} left={composing.left} above={composing.above}>
          {composing.lineId && lineComments.has(composing.lineId) ? (
            <div className="flex flex-col gap-4">
              {(lineComments.get(composing.lineId) ?? [])
                .map(id => commentsById.get(id))
                .filter((comment): comment is FileComment => comment !== undefined)
                .map(comment => (
                  <CommentCard
                    key={comment.id}
                    comment={comment}
                    range={null}
                    quote=""
                    bubble
                    spec={spec}
                    /* Drawn for a comment on a FRAGMENT of the line, where nothing else
                       says which words were picked. */
                    quoted={fragments.has(comment.id)}
                    onSave={body => saveComment(comment.id, body)}
                    onDelete={() => deleteComment(comment.id)}
                    thread={source?.thread?.(comment.id)}
                  />
                ))}
            </div>
          ) : (
            <CommentCard
              /* Keyed on the anchor: opening a composer on another line while this one
                 holds a draft must not carry the draft over to a passage it was not
                 written about. */
              key={composing.lineId ?? composing.quote}
              comment={null}
              range={null}
              quote={composing.quote}
              bubble
              spec={spec}
              /* A passage shows what was picked; a whole line does not — the line is
                 right there, lit, under the bubble. */
              quoted={composing.lineId === null}
              viewer={source?.viewer}
              onSave={saveBubbleComment}
              onDelete={closeBubble}
              onClose={closeBubble}
            />
          )}
        </CommentBubble>
      )}
      </div>


      {/* One card per host, and the hosts are the truth about which cards exist: a card
          portals INTO its node, so there is nowhere to draw before `useInlineCommentHosts` has
          spliced that node in after the block its passage ends in.

          No `width`: prose does not scroll sideways, so `w-full` inside the column's own
          padding already puts a card where the text it is about is. */}
      {[...hosts].map(([key, host]) => (key === COMPOSER_KEY
        ? composer && (
          <CommentCard
            /* Keyed on its QUOTE — the passage IS its identity here, the way the range is in
               the diff. Selecting a second passage while the composer is open replaces the
               state without unmounting anything, and under a stable key React would reuse the
               component, carrying a half-written body onto the next passage. */
            key={`${key}:${composer.quote}`}
            comment={null}
            /* No lines, and the card names itself from the quote instead — see its `range`. */
            range={null}
            quote={composer.quote}
            host={host}
            /* The reader's own face, as in the bubble — `undefined` for every store-backed
               caller, which keeps the mark it had. */
            viewer={source?.viewer}
            onSave={saveComposer}
            /* Nothing to delete: this comment does not exist yet. Discarding it is what Cancel
               does, which is `onClose`. */
            onDelete={closeComposer}
            onClose={closeComposer}
            spec={spec}
          />
        )
        : commentsById.get(key) && (
          <CommentCard
            key={key}
            comment={commentsById.get(key)!}
            range={null}
            /* The stored comment carries its own quote; the card reads that in preference to
               this. Empty rather than undefined because the prop is what a NEW comment arrives
               by. */
            quote=""
            host={host}
            onSave={body => saveComment(key, body)}
            onDelete={() => deleteComment(key)}
            spec={spec}
            /* Who wrote it and what has been said under it, when the source knows —
               `undefined` for a store-backed comment, which draws the card it always drew. */
            thread={source?.thread?.(key)}
            /* No `onClose`: a stored comment's card is never closed. See the prop. */
          />
        )
      ))}
    </>
  )
}
