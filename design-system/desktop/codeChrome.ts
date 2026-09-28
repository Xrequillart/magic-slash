/**
 * THE STYLESHEET HIGHLIGHTED CODE IS DRAWN WITH: the gutter, the diff rails, the elision
 * seam and the comment marks, over shiki's HTML, per appearance.
 *
 * It lived inside the app's `CodeView`, which was the only thing drawing shiki output.
 * `CodeSample` is the second, and a second copy of these rules would be two gutters
 * drifting one pixel at a time, so they sit here and both import them. `CodeView` keeps
 * what is the app's: the comment state, the pointer handlers, the hit test (which reads
 * the gutter numbers below, so they are exported and spelled once).
 *
 * Pure strings and numbers, no React: the root test suite can import it.
 */

/**
 * The chrome CodeView draws over shiki's output, per appearance.
 *
 * Fixed values rather than the app's theme tokens, deliberately: these sit ON the
 * highlighted code, so they belong to the code's palette, not the window's. They are
 * GitHub's own diff colours because the highlighting is GitHub's github-light /
 * github-dark — a second source of green would put two of them on one added line.
 */
export interface CodeChrome {
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
  /**
   * The rows currently picked, and the gutter cell of a row under the pointer.
   *
   * The SAME HUE as `comment` below, not the blue this used to be. A pick is the gesture
   * that becomes a comment, so it now previews what it is about to leave behind: the wash a
   * reader drags over three lines is the wash those lines keep once the card is saved.
   *
   * The cost is real and is accepted: hue no longer separates a transient selection from a
   * standing annotation, so `pickBg` and `commentRow` are the same colour at the same alpha
   * and a picked row is indistinguishable from an already-commented one. What still tells
   * them apart is everything else a standing comment draws and a pick does not — the pill in
   * the gutter, and the edge lines closing its block off (`commentEdge`).
   */
  pickBg: string
  pickStrong: string
  /**
   * A standing comment: the icon in its pill, and the lines closing its block off.
   *
   * GitHub's own severe/orange, which is the hue its diff greens and reds leave free — a
   * comment is not a change and must not read as one.
   *
   * `pickBg` above is now this same hue, so it no longer separates a comment from a pick
   * either. The pill and the block edges do that instead; see that field for the trade.
   */
  comment: string
  /** The block's top and bottom lines: the same orange, opaque enough to read as an edge. */
  commentEdge: string
  /**
   * The wash over every row a comment covers.
   *
   * Equal to `pickBg` now that the two share a hue, which is deliberate rather than a
   * collision — a pick previews the wash it is about to leave. The value is set by what
   * actually reads: low, because it composites OVER the diff's
   * own green and red row tints and a commented added line has to go on reading as added.
   * Orange being the near neighbour of the red on a removed line, a heavy wash there would
   * blur the two into one warm band.
   */
  commentRow: string
}

export const CHROME: Record<'light' | 'dark', CodeChrome> = {
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
    // The comment orange below, at the pick's own alphas. Selection and annotation share
    // the hue deliberately — see `pickBg` on the interface.
    pickBg: 'rgba(240,136,62,0.12)',
    pickStrong: 'rgba(240,136,62,0.28)',
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
    // The comment orange below, at the pick's own alphas, as in the dark theme.
    pickBg: 'rgba(188,76,0,0.10)',
    pickStrong: 'rgba(188,76,0,0.22)',
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
export const GUTTER_WIDTH_REM = 3
const GUTTER_GAP_REM = 1.25
export const GUTTER_ADVANCE_REM = GUTTER_WIDTH_REM + GUTTER_GAP_REM

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
     a glance rather than one badge somewhere in it. No cursor and no hit target: the comment's
     own card is mounted directly under the block, permanently, so there is nothing for a click
     on the row to reveal. The wash and the pill are markers now, not buttons.

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
    background-image: linear-gradient(${c.commentRow}, ${c.commentRow});
  }

  /* The top and the bottom of a BLOCK, on its first and last row — so two comments on
     consecutive lines read as two blocks instead of one continuous wash.

     A block is a comment's range OR the lines currently picked: a selection is closed off
     the same way, in the same orange, so it reads as the block it is about to become rather
     than as a wash that stops wherever the drag did. Hence data-edge and not
     data-comment-edge — the attribute says a block ends here, not what kind. The layout
     effect merges the two sources into it, and its comment there is where the reason lives.
     (No backticks in here: this comment lives inside a template literal.)

     edgesByRow decides which rows a comment's are, off the same marker map the wash above is
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
  .shiki code .line[data-edge="top"] { box-shadow: inset 0 1px 0 ${c.commentEdge}; }
  .shiki code .line[data-edge="bottom"] { box-shadow: inset 0 -1px 0 ${c.commentEdge}; }
  .shiki code .line[data-edge="both"] {
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
export const CODE_STYLES: Record<'light' | 'dark', string> = {
  dark: codeStyles(CHROME.dark),
  light: codeStyles(CHROME.light),
}
