import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import CommentCard, { CommentAffordance } from './CommentCard'
import {
  clampQuote, commentFileKey, edgesByRow, extendRange, lineIdentityFromRow,
  markersByRow, normalizeRange, rangeCovers, visibleRowForComment,
  type CommentTarget, type GutterPick, type LineRange, type RowEdges, type RowIdentity,
} from '../../utils/commentAnchors'
import { useStore, NO_COMMENTS, type FileComment } from '../../store'
import { useT } from '../../i18n'

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

/**
 * The chrome CodeView draws over shiki's output, per appearance.
 *
 * Fixed values rather than the app's theme tokens, deliberately: these sit ON the
 * highlighted code, so they belong to the code's palette, not the window's. They are
 * GitHub's own diff colours because the highlighting is GitHub's github-light /
 * github-dark — a second source of green would put two of them on one added line.
 */
interface CodeChrome {
  /** Line numbers, and the rule between them and the code. */
  gutter: string
  /** The same numbers under the pointer, and on a picked row: the gutter is a target. */
  gutterStrong: string
  rule: string
  add: string
  addBg: string
  addRule: string
  remove: string
  removeBg: string
  removeRule: string
  /** The rows currently picked, and the gutter cell of a row under the pointer. */
  pickBg: string
  pickStrong: string
  /**
   * A standing comment: the icon in its pill, and the lines closing its block off.
   *
   * GitHub's own severe/orange, which is the hue its diff greens and reds leave free — a
   * comment is not a change and must not read as one. It is also what now tells a comment
   * from a PICK, the blue above having been left to that: a transient selection and a
   * standing annotation are told apart by hue, which no alpha relationship could do as well.
   */
  comment: string
  /** The block's top and bottom lines: the same orange, opaque enough to read as an edge. */
  commentEdge: string
  /**
   * The wash over every row a comment covers.
   *
   * It no longer has to stay under `pickBg` to be told from a pick — that is the hue's job
   * now — so it is set by what actually reads: low, because it composites OVER the diff's
   * own green and red row tints and a commented added line has to go on reading as added.
   * Orange being the near neighbour of the red on a removed line, a heavy wash there would
   * blur the two into one warm band.
   */
  commentRow: string
}

const CHROME: Record<'light' | 'dark', CodeChrome> = {
  dark: {
    gutter: 'rgba(255,255,255,0.18)',
    gutterStrong: 'rgba(255,255,255,0.6)',
    rule: 'rgba(255,255,255,0.07)',
    add: '#2ea043',
    addBg: 'rgba(46,160,67,0.15)',
    addRule: 'rgba(46,160,67,0.3)',
    remove: '#f85149',
    removeBg: 'rgba(248,81,73,0.15)',
    removeRule: 'rgba(248,81,73,0.3)',
    pickBg: 'rgba(88,166,255,0.12)',
    pickStrong: 'rgba(88,166,255,0.28)',
    // GitHub dark's severe.fg. The brighter of its two oranges, because on #0d1117 the
    // darker one (#bc4c00, used in light below) sinks into the background.
    comment: '#f0883e',
    commentEdge: 'rgba(240,136,62,0.55)',
    commentRow: 'rgba(240,136,62,0.12)',
  },
  light: {
    // Heavier than the dark theme's mirror image: 18% black on white reads as a
    // smudge where 18% white on near-black reads as a number.
    gutter: 'rgba(27,31,36,0.4)',
    gutterStrong: 'rgba(27,31,36,0.75)',
    rule: 'rgba(27,31,36,0.12)',
    add: '#1a7f37',
    addBg: 'rgba(74,194,107,0.18)',
    addRule: 'rgba(26,127,55,0.3)',
    remove: '#cf222e',
    removeBg: 'rgba(255,129,130,0.2)',
    removeRule: 'rgba(207,34,46,0.3)',
    pickBg: 'rgba(9,105,218,0.10)',
    pickStrong: 'rgba(9,105,218,0.22)',
    // GitHub light's severe.fg. Darker and less saturated than the dark theme's orange,
    // which is what keeps a 14px icon reading on white rather than glowing on it — and
    // what keeps it clear of the #cf222e above, since a bright orange over white is a
    // shade of red.
    comment: '#bc4c00',
    commentEdge: 'rgba(188,76,0,0.45)',
    // Lighter than the dark theme's, unlike the gutter above: a saturated hue over white
    // already carries, where the same alpha over near-black is most of the way to a band.
    commentRow: 'rgba(188,76,0,0.09)',
  },
}

/**
 * The gutter's geometry, as ONE set of numbers.
 *
 * The stylesheet draws the gutter and the hit test below decides whether a click landed
 * in it, and the two have to agree to the pixel: a hit test a quarter of a rem wide of
 * the drawn box means either a strip of the gutter that does not pick a line, or a strip
 * of the code that does instead of selecting text. Spelling either number twice is how
 * that drifts, so each is spelled once — and only these two have to agree with anything.
 *
 * `ADVANCE` is what the hit test wants: the gutter cell plus the gap after it, which is
 * everything to the left of the first character of code — except on a row carrying a comment
 * pill, where the pill is drawn in that gap and `WIDTH` alone is the pick target, so the two
 * numbers are read by the stylesheet and the hit test both. The cell's own right padding is
 * NOT added on top of that, and is therefore not one of these numbers: `box-sizing:
 * border-box` comes from Tailwind's preflight and applies to pseudo-elements too, so the
 * padding sits inside the width and can never disagree with anything. It stays an ordinary
 * number in the stylesheet, like every other one there.
 */
const GUTTER_WIDTH_REM = 3
const GUTTER_GAP_REM = 1.25
const GUTTER_ADVANCE_REM = GUTTER_WIDTH_REM + GUTTER_GAP_REM

/**
 * Lucide's `message-square`, as a data URI to be used as a MASK.
 *
 * The pill is a `::after` drawing `content`, so a `lucide-react` component cannot go in it
 * — a React element has nowhere to mount inside a pseudo-element, and the whole reason the
 * pill is one is that an injected node would land in the row's `textContent` and therefore
 * in the next selection dragged over it, corrupting the very quote this feature stores.
 *
 * A mask rather than a `background-image`, so the colour stays in `CHROME` where every
 * other colour in this file lives: the element is painted with `background-color` and the
 * mask decides which pixels of it survive. An image would have carried the orange inside
 * the SVG, giving the appearance two places to disagree with itself.
 *
 * The path is copied from `lucide-react`'s own `message-square`, and the stroke attributes
 * are its `defaultAttributes`, so the icon is the one the rest of the app draws rather than
 * a lookalike. No dependency and no asset file: the icon set is already installed, but
 * nothing in it can be reached from inside a stylesheet.
 *
 * `stroke='black'` names no colour anybody sees — a mask reads the ALPHA channel, so all
 * that matters is that the stroke is opaque and the fill is not. Angle brackets are
 * percent-escaped because an unescaped `<` inside a `url()` is not portable, and single
 * quotes are used throughout so the URI itself can be double-quoted.
 */
const COMMENT_ICON =
  'url("data:image/svg+xml,'
  + "%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'"
  + " fill='none' stroke='black'"
  + " stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E"
  + "%3Cpath d='M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2"
  + " 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z'/%3E%3C/svg%3E\")"

function codeStyles(c: CodeChrome): string {
  return `
  .shiki code { white-space: normal; }

  .shiki code .line { display: block; white-space: pre; }

  /* The number comes off the ROW, not off a CSS counter.
     A counter counts the rows that were drawn, and the changes-only view drops
     whole regions of them — the gutter would then read 1, 2, 3… against a file
     whose lines are 1, 2, 3, 40, 41. data-line is stamped in the main process
     from the file itself and survives any elision. A row without the attribute
     (an elision marker) resolves attr() to the empty string, which leaves the
     gutter box drawn and blank — exactly what that row wants. */
  .shiki code .line::before {
    content: "\\00a0" attr(data-line);
    display: inline-block;
    width: ${GUTTER_WIDTH_REM}rem;
    margin-right: ${GUTTER_GAP_REM}rem;
    padding-right: 0.75rem;
    text-align: right;
    color: ${c.gutter};
    border-right: 1px solid ${c.rule};
    user-select: none;
    -webkit-user-select: none;
  }

  /* diff: added lines */
  .shiki code .line[data-diff="add"] {
    background-color: ${c.addBg};
    border-left: 2px solid ${c.add};
    margin-left: -1px;
  }
  .shiki code .line[data-diff="add"]::before {
    content: "+" attr(data-line);
    color: ${c.add};
    border-right-color: ${c.addRule};
  }

  /* diff: removed lines */
  .shiki code .line[data-diff="remove"] {
    background-color: ${c.removeBg};
    border-left: 2px solid ${c.remove};
    margin-left: -1px;
  }
  .shiki code .line[data-diff="remove"]::before {
    content: "-" attr(data-line);
    color: ${c.remove};
    border-right-color: ${c.removeRule};
  }

  /* Where the unchanged middle of the file was left out.
     Carries no data-diff on purpose: FilePreviewPanel's sweep walks .line[data-diff]
     to build the ruler and the navigator, and a separator is not a change to navigate
     to. Its label is written in by the layout effect above rather than by content:,
     because it is translated. */
  /* Taller than a line of code on purpose: this row is a seam between two regions of
     the file, and at code line-height it read as just another line. The padding is what
     gives it that weight — it is applied in the stylesheet, so it is already in place
     before anything measures the rows below it. */
  .shiki code .line[data-elided] {
    color: ${c.gutter};
    background-color: ${c.rule};
    font-style: italic;
    padding-top: 0.45rem;
    padding-bottom: 0.45rem;
    margin-top: 0.25rem;
    margin-bottom: 0.25rem;
    user-select: none;
    -webkit-user-select: none;
  }

  /* ── Commenting ───────────────────────────────────────────────────────────────
     All of it lives HERE, in the string built once per appearance at module scope,
     rather than in inline styles written per row: a review holds forty of these
     documents and thousands of rows, and a rule is one selector however many rows
     match it. */

  /* The gutter is the pick target, and this is the only hint that says so. It reacts to
     the whole ROW because a pseudo-element has no :hover of its own — there is no
     ::before:hover in CSS — so the hint is broader than the target by design. The cursor
     cannot be narrowed either, for the same reason, and is left alone rather than made to
     lie about where the pointer is. */
  .shiki code .line:hover::before {
    color: ${c.gutterStrong};
    background-color: ${c.pickBg};
  }

  /* The lines currently picked — a gutter click, a shift-click range, or the lines a card
     is open on. Stamped from the layout effect below and cleared in the same pass. */
  .shiki code .line[data-picked] { background-color: ${c.pickBg}; }
  .shiki code .line[data-picked]::before {
    color: ${c.gutterStrong};
    background-color: ${c.pickStrong};
  }

  /* Every row a comment covers, washed in orange, so the reader sees the commented RANGE at
     a glance rather than one badge somewhere in it. The whole row is also the way back into
     the comment — see handleClick — which is why the cursor is set here.

     A background-IMAGE rather than a background-color, and that is what keeps a commented
     added line reading as added: the [data-diff] rules above paint the row's background
     COLOR, an image paints OVER that colour, so the two composite instead of one of them
     winning the cascade — which is all source order could have decided here, both rules
     being one class and one attribute deep. The green stays green under the wash, and the
     + and the left rail go on saying "added" in either appearance.

     A flat gradient because that is how CSS spells "a solid layer": there is no second
     background-color to paint with.

     No box of its own — no padding, no border, no inline content — so the tint cannot move
     a row by a pixel. FilePreviewPanel's measurement sweep and ChangeRuler's offsets both
     stand on that. */
  .shiki code .line[data-comment-ids] {
    cursor: pointer;
    background-image: linear-gradient(${c.commentRow}, ${c.commentRow});
  }

  /* The top and the bottom of each comment's BLOCK, on its first and last covered row — so
     two comments on consecutive lines read as two blocks instead of one continuous wash.
     edgesByRow decides which rows those are, off the same marker map the wash above is
     keyed from, so the two cannot disagree about where a comment stops.

     An inset box-shadow, and NOT a border: a border adds to the row's height, and the whole
     marker design exists to avoid exactly that — FilePreviewPanel's ResizeObserver sweep and
     ChangeRuler's offsets both stand on a commented row measuring the same as an uncommented
     one. An inset shadow is painted over the background, inside the box, and is worth zero
     pixels of layout. It also leaves the [data-diff] rows' own border-left alone: an inset
     shadow is drawn inside the border, so the 2px add/remove rail keeps its colour and the
     row still reads as added or removed under the wash.

     Three rules rather than two, because box-shadow is one property: a row that is both the
     end of one comment and the start of the next needs BOTH lines in a single declaration,
     and two rules each setting box-shadow would leave only whichever won the cascade. Hence
     one attribute with three values rather than two independent attributes — the layout
     effect already knows which case a row is in, and this way the stylesheet does not have
     to be talked out of a specificity accident. */
  .shiki code .line[data-comment-edge="top"] { box-shadow: inset 0 1px 0 ${c.commentEdge}; }
  .shiki code .line[data-comment-edge="bottom"] { box-shadow: inset 0 -1px 0 ${c.commentEdge}; }
  .shiki code .line[data-comment-edge="both"] {
    box-shadow: inset 0 1px 0 ${c.commentEdge}, inset 0 -1px 0 ${c.commentEdge};
  }

  /* The pill: ONCE per comment, on the topmost row that comment marks. Two attributes
     doing two jobs — data-comment-ids is on every covered row and says "covered",
     data-comment-badge is on one and says "draw the badge here". edgesByRow picks which:
     the row a comment BEGINS on, so the pills over a file add up to the comments on it
     rather than to the lines they cover.

     It draws an icon rather than a count. A row carrying two comments therefore looks like
     a row carrying one, and the row's title is what says otherwise — see the layout effect,
     which is also where the plural form teaches that clicking again brings the next.

     Still a ::after rather than a node inserted into the row, and still not a stylistic
     preference: an injected element lands in the row's textContent and therefore in the
     next selection the reader drags over it — corrupting the very quote this feature stores.
     It is also what forces the icon to be a mask on an empty box rather than an <svg>: see
     COMMENT_ICON.

     Out of flow, which is what takes it out of the code:
     — it sits in the gap between the gutter rule and the first character of code, so it is
       left of the code and right of the numbers, in space nothing else uses;
     — it cannot hide a line number: the numbers are right-aligned INSIDE the gutter cell and
       the pill starts where that cell ends. The 1rem of <pre> padding further left could
       not have held it — at 12px monospace a four-digit number and its +/- already fill
       the cell to its left edge, and a five-digit file spills into that padding;
     — being out of flow it adds nothing to the row's height and nothing to the code's
       horizontal advance, so a covered row and an uncovered one align to the pixel;
     — it scrolls away with the row when the <pre> is scrolled right, exactly as the line
       numbers do. Pinning it would leave a pill floating over the code — the very thing the
       reader asked to be rid of — and would part it from the line it names.

     left is measured from the row's PADDING box, so a diff row's 2px rail moves the pill
     and the line number by the same 2px and the two stay together. */
  .shiki code .line[data-comment-badge] { position: relative; }
  .shiki code .line[data-comment-badge]::after {
    content: "";
    position: absolute;
    left: ${GUTTER_WIDTH_REM}rem;
    /* Centred on the row, since out of flow there is no baseline to sit on: a 0.9rem pill
       in a 19.5px row (12px on a 1.625 line-height) leaves 2.5px either side. */
    top: 50%;
    transform: translateY(-50%);
    /* A fixed square, where the count pill had a min-width and padding it could grow past:
       an icon has one size, and 0.9rem keeps it inside the ${GUTTER_GAP_REM}rem gap whatever
       the widest line number in the file is. */
    width: 0.9rem;
    height: 0.9rem;
    /* The background is the colour and the icon is the stencil, so the orange is read from
       CHROME exactly once. Prefixed first: Electron 28 is Chromium 120, which is the very
       release the unprefixed properties landed in, and the prefixed form has worked for a
       decade. contain rather than cover, so a 24-unit-square icon is never cropped. */
    background-color: ${c.comment};
    -webkit-mask: ${COMMENT_ICON} center / contain no-repeat;
    mask: ${COMMENT_ICON} center / contain no-repeat;
  }
`
}

/** Built once per appearance at module scope — a render must not assemble a stylesheet. */
const CODE_STYLES: Record<'light' | 'dark', string> = {
  dark: codeStyles(CHROME.dark),
  light: codeStyles(CHROME.light),
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

/** Which card is open: one being written, or one already stored. */
type OpenCard =
  | { mode: 'new'; range: LineRange; quote: string }
  | { mode: 'existing'; id: string }

export default function CodeView({
  content, highlightedHtml, appearance = 'dark', blend = true, repoPath, filePath, fingerprint,
  commentable = false,
}: Props) {
  const htmlRef = useRef<HTMLDivElement>(null)
  const t = useT()

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
   * The lines offered for a comment, and the text that was selected — the state the
   * affordance is drawn from, before the reader has confirmed anything.
   */
  const [pending, setPending] = useState<{ range: LineRange; quote: string } | null>(null)
  const [card, setCard] = useState<OpenCard | null>(null)

  /**
   * Where a gutter pick began, in a REF rather than in state.
   *
   * Shift-click has to extend from the row the reader first clicked, and `pending` is not
   * a safe place to remember it: the affordance closes on the mousedown of the very click
   * that is about to extend the pick (that is what its outside-mousedown listener is for),
   * so a shift-click would be extending from nothing. A ref survives that, and nothing
   * renders from it.
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
   * Setting state on mousedown is safe where setting `pending` is not: what closes the
   * affordance on an outside mousedown is `useClickOutside`, and all it does is clear the
   * panel's own state. Nothing anywhere clears this.
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

  /**
   * How far the last marker click had walked into the comments on one row.
   *
   * A REF for the same reason `pickRef` above is one: the open card dismisses itself on the
   * mousedown of the very click that is about to walk to the next comment, so by the time
   * the click lands `card` is already `null` and could not say where the walk had got to.
   * Keyed on the row's own list of ids, so adding or deleting a comment starts again at the
   * oldest rather than resuming at an index that now means a different comment.
   */
  const cycleRef = useRef<{ ids: string; index: number } | null>(null)

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
   * The comment the open card is showing, or `null` while a new one is being written.
   *
   * A plain const, like `activeRange` below: every branch answers a reference that already
   * exists — the store's own comment object, or `null` — so memoising it would buy exactly
   * the referential stability it already has, and the effects and callbacks that depend on
   * it are no less stable for it.
   */
  const openComment: FileComment | null =
    card?.mode === 'existing' ? comments.find(c => c.id === card.id) ?? null : null

  /**
   * The lines the open card is attached to.
   *
   * Read back out of the STORE for a stored comment rather than remembered when the card
   * was opened, which is the same rule the markers follow: the anchor is the numbers, and
   * the numbers are the only thing that survives the document being re-read.
   *
   * No `card` guard of its own: `openComment` above is already `null` whenever no card is
   * open, so the second branch answers `null` for that case as well.
   */
  const cardRange: LineRange | null = card?.mode === 'new'
    ? card.range
    : openComment?.anchor ?? null

  /**
   * The lines to paint as picked: the block being dragged, else the card's, else the offer's.
   *
   * The drag comes FIRST because while the button is down it is the only truthful answer to
   * where the reader is — and because it is the live feedback the gesture needs, drawn by the
   * wash that was already there rather than by anything new.
   */
  const activeRange = dragRange ?? cardRange ?? pending?.range ?? null

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
    // One selector finds the badge and the edges too: both are only ever stamped on a row
    // that also carries the id list, so a row with a pill or an edge and no ids is a state
    // this effect cannot produce.
    for (const row of root.querySelectorAll<HTMLElement>('.line[data-comment-ids]')) {
      delete row.dataset.commentIds
      delete row.dataset.commentBadge
      delete row.dataset.commentEdge
      row.removeAttribute('title')
    }
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
      // The ids are what `handleClick` walks — what makes the second comment on a line
      // reachable at all — and what the row's wash is keyed off. There is no per-row COUNT
      // any more: the pill is stamped once, below, so a count on every row would be an
      // attribute nothing draws.
      row.dataset.commentIds = ids.join(' ')
      // A `title` rather than an `aria-label`: the marker is a pseudo-element, so it is
      // not in the accessibility tree and cannot carry one, and the row it is on is a
      // `<span>` with no role for a label to describe. The tooltip is also what tells a
      // reader who has not clicked one yet that the pill is a way back in — and, on a row
      // carrying several, how many and that clicking again brings the next one. Since the
      // pill draws an icon rather than a count, that number is the ONLY place a reader can
      // learn that a row holds more than one comment, which is why it is passed in.
      row.title = ids.length > 1
        ? t('filePreview.commentMarkers', { count: ids.length })
        : t('filePreview.commentMarker')
    }

    // The block's edges, and the pill on the row where it begins — both once per comment,
    // both from a second loop over the FINISHED map rather than from a branch inside the one
    // above: which row is a comment's first and which its last is only known once every row
    // of every comment has been collected, and reading the same map twice is what keeps the
    // pill, the edges and the wash from ever disagreeing about the range.
    for (const [index, edges] of edgesByRow(markers)) {
      const row = rows[index]
      row.dataset.commentEdge = edgeValue(edges)
      if (edges.top) row.dataset.commentBadge = ''
    }

    if (!activeRange) return
    for (let i = 0; i < rows.length; i++) {
      const identity = identities[i]
      if (identity && rangeCovers(activeRange, identity.side, identity.line)) rows[i].dataset.picked = ''
    }
  }, [highlightedHtml, comments, activeRange, t])

  /**
   * Where the floating panel should sit right now.
   *
   * Resolved from the numbers every time it is asked, which is what lets a card stay put
   * over the line it belongs to while the review scrolls under it — and what makes it
   * survive the document being replaced. `visibleRowForComment` is also what keeps a card
   * anchored when its own line has been folded away, rather than leaving it stranded at
   * the top of the file.
   *
   * ONE callback for both panels, because `activeRange` is already the range of whichever
   * of them is mounted and they are never mounted together.
   */
  const anchorRect = useCallback((): DOMRect | null => {
    const root = htmlRef.current
    if (!root || !activeRange) return null
    const rows = rowsOf(root)
    const index = visibleRowForComment(activeRange, rows.map(identityOf))
    return index === null ? null : rows[index].getBoundingClientRect()
  }, [activeRange])

  const dismissPending = useCallback(() => setPending(null), [])
  const closeCard = useCallback(() => setCard(null), [])

  /**
   * Stop a gutter press from becoming a text drag through the code, and start the pick.
   *
   * "Start", not "make": the pick is still COMMITTED on mouseup, and the order is the
   * reason. The affordance closes itself on any mousedown that lands outside it, and that
   * listener is on `document` — so it runs AFTER React's own handlers on this container. A
   * pick made on mousedown would be set and then immediately cleared by it. On mouseup the
   * sequence is the other way round, and shift-clicking a second row extends the pick
   * instead of flickering it away.
   *
   * What mousedown does is record the drag's ANCHOR, and that is why the anchor lives in a
   * ref: a ref is untouched by the affordance clearing its own state a moment later. The
   * range in `dragRange` is state because something has to be painted, but nothing outside
   * this component knows it exists — see its own comment.
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
      setPending({ range: drag.range, quote: '' })
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
   * buttons too, so without it a right-click on a line number pops the offer — and the
   * mousedown above would have preventDefault'd that button as well.
   */
  const handleMouseUp = (e: React.MouseEvent) => {
    const root = htmlRef.current
    if (!commenting || !root || e.button !== 0) return
    // A gutter pick — one click or a whole drag — is committed by the listener above,
    // wherever it was released. Standing aside rather than racing it: a drag released over
    // the code would otherwise fall through to the selection branch, find nothing selected
    // (its mousedown was preventDefault'd) and clear the very offer the drag is making.
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
        // is outside the selection, as are the elision labels.
        setPending({ range: normalizeRange(start, end), quote: clampQuote(selection.toString()) })
        return
      }
    }

    setPending(null)
  }

  /**
   * Open the comment a marker stands for.
   *
   * Delegated from the container rather than bound per row: the rows are shiki's HTML, so
   * there is nothing to bind a handler to without walking thousands of them after every
   * read. The whole row is the target because a `::after` hit-tests as its own element —
   * the same reason `inGutter` exists — and a marker a reader cannot aim at is a marker
   * that does not reopen anything.
   *
   * A row can carry SEVERAL comments — the row's tooltip says how many, the pill drawing an
   * icon rather than a count — and clicking it again walks to the next one and wraps. That is
   * the whole gesture for reaching the second comment on a line: no new surface, and the card
   * it opens in is already the place to read, edit or delete whichever one it landed on.
   */
  const handleClick = (e: React.MouseEvent) => {
    const root = htmlRef.current
    if (!commenting || !root) return
    const row = rowOf(e.target as Node, root)
    const stamped = row?.dataset.commentIds
    if (!row || !stamped) return
    // The gutter belongs to picking, and a drag that happens to end on a commented row is
    // a selection, not a click on its marker.
    if (inGutter(e.clientX, row)) return
    const selection = window.getSelection()
    if (selection && !selection.isCollapsed) return
    const ids = stamped.split(' ')
    const previous = cycleRef.current
    const index = previous && previous.ids === stamped ? (previous.index + 1) % ids.length : 0
    cycleRef.current = { ids: stamped, index }
    setPending(null)
    setCard({ mode: 'existing', id: ids[index] })
  }

  /**
   * Plain functions, like the three pointer handlers above — and that is the convention:
   * `useCallback` in this file MEANS the identity is read somewhere.
   *
   * A fresh identity every render costs these three nothing. They go to
   * `CommentAffordance` and `CommentCard`, neither of which is memoised, and neither lands
   * in any dep array. `anchorRect`, `dismissPending` and `closeCard` keep theirs because
   * the panel hook holds them in its own effect deps, where a new function every render
   * would tear the listeners down and rebind them on every scroll frame.
   */
  const handleConfirm = () => {
    // Read straight out of `pending` rather than out of a `setPending` updater: the
    // affordance is only mounted WHILE `pending` is non-null, so there is no staler value
    // an updater could be protecting against — and a `setCard` inside one would fire twice
    // under StrictMode in dev.
    if (!pending) return
    setCard({ mode: 'new', range: pending.range, quote: pending.quote })
    setPending(null)
  }

  const handleSave = (body: string) => {
    if (!target || !card) return
    if (card.mode === 'new') {
      addFileComment(target, { anchor: card.range, quote: card.quote, body })
    } else {
      updateFileComment(target, card.id, body)
    }
    setCard(null)
  }

  const handleDelete = () => {
    if (target && card?.mode === 'existing') removeFileComment(target, card.id)
    setCard(null)
  }

  if (highlightedHtml) {
    return (
      <>
        <style>{CODE_STYLES[appearance]}</style>
        <div
          ref={htmlRef}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onClick={handleClick}
          /* `!bg-transparent` beats the background shiki writes as an INLINE style on
             its own `<pre>` — nothing but `!important` can. Dropping it is what lets
             the panel's own surface show through, so the preview reads as one card
             rather than as a code slab sitting in a drawer. */
          className={`text-sm [&>pre]:p-4 [&>pre]:min-h-full [&>pre]:font-mono [&>pre]:text-xs [&>pre]:leading-relaxed [&>pre]:overflow-auto ${blend ? '[&>pre]:!bg-transparent' : ''}`}
          dangerouslySetInnerHTML={{ __html: highlightedHtml }}
        />
        {/* The offer, and then the card. Never both: confirming the one opens the other,
            and a second floating panel over the same line would cover it. */}
        {pending && !card && (
          <CommentAffordance
            anchorRect={anchorRect}
            onConfirm={handleConfirm}
            onDismiss={dismissPending}
          />
        )}
        {card && cardRange && (
          <CommentCard
            /* Keyed on WHICH comment, so clicking a second marker while the first card is
               open remounts the card rather than reusing it. Without this the new card
               would inherit the previous comment's draft body and its read/edit mode,
               both of which are state local to the card. */
            key={card.mode === 'new' ? 'new' : card.id}
            comment={openComment}
            range={cardRange}
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

  return (
    <pre className="p-4 text-sm text-ink/80 font-mono whitespace-pre-wrap break-all">
      {content}
    </pre>
  )
}
