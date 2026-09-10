import { memo, useId, useState } from 'react'
import { ChevronsDownUp, ChevronsUpDown } from 'lucide-react'
import {
  commentedRange, foldHunk, isCommentedLine, parseDiffHunk,
  type CommentAnchor, type HunkLine, type CommentedRange,
} from '../../utils/diffHunk'
import type { Translate } from '../../i18n'

/**
 * The lines a thread was written about, above the thread.
 *
 * The point of the panel: a review comment is an argument about a specific piece of
 * code, and reading it without that code is reading half of it. GitHub puts the hunk
 * above the conversation, and so does this.
 *
 * NOT the shiki pipeline `CodeView` uses, and not a second consumer of
 * `main/ipc/hunkView.ts`. Both of those operate on a highlighted document read off disk;
 * a `diffHunk` is a frozen excerpt of unified-diff TEXT that arrived on the comment, and
 * the file it came from may since have been rewritten or deleted. So there is no read to
 * make, nothing to highlight against, and this renders plain rows — see `utils/diffHunk`.
 *
 * What it does keep is `CodeView`'s visual vocabulary: `data-diff="add" | "remove"` on
 * the row, a `+`/`-` in the gutter before the line number, a tinted background and a
 * coloured left rule. The attribute is stamped even though `CodeView`'s CSS is scoped
 * under `.shiki code` and cannot reach it — the classes below are the Tailwind
 * equivalents of those rules, and stamping the attribute keeps one name for the concept
 * across the two renderers rather than two.
 *
 * Past thirty rows the run-up is folded away behind one row. Which thirty, and why the
 * tail, is `foldHunk`'s decision and documented there; here it is only drawn.
 */

/**
 * The row's fill and its left rule, by what happened to the line — two tables and not
 * one string apiece, because a commented row overrides the RULE without overriding the
 * fill. Bundled, the override could only append `border-accent` to a class list that
 * already held `border-green`, and which of two `border-color` utilities wins is decided
 * by Tailwind's emission order rather than by the order they are written in. Split, the
 * caller picks exactly one of each and there is nothing to arbitrate.
 */
const KIND_FILL = { add: 'bg-green/10', remove: 'bg-red/10', context: '' } as const
const KIND_RULE = { add: 'border-green', remove: 'border-red', context: 'border-transparent' } as const

/** The character in front of the number, matching `CodeView`'s `content: "+" attr(data-line)`. */
const KIND_MARKER = { add: '+', remove: '-', context: ' ' } as const

interface Props {
  /**
   * The thread's `diffHunk`, or nothing. Optional rather than guarded by the caller:
   * "this thread has no hunk" and "this hunk does not parse" are the same outcome — no
   * code block — and one component answering both is one branch at the call site
   * instead of two.
   */
  hunk?: string
  /**
   * The capture-time line numbers and the side, straight off the thread — the thread
   * itself is passed and the extra fields on it are simply not part of the type, which
   * is how `line`'s fallback chain is kept out of the highlight. See `CommentAnchor`.
   */
  anchor: CommentAnchor
  t: Translate
}

/**
 * One row, drawn identically above and below the fold.
 *
 * A plain function rather than a component: it takes the resolved range as an argument
 * and has no state, and making it a component would put a memo boundary nobody needs
 * between a hundred rows and the one prop they all share.
 */
function row(line: HunkLine, index: number, range: CommentedRange | null) {
  const commented = isCommentedLine(line, range)
  return (
    <div
      /* Index as the key, exceptionally and safely: a parsed hunk is a pure
         function of one immutable string, so this list never reorders, never
         grows and never shrinks for the life of the panel. The line numbers are
         not unique — a deletion and an addition share one — and the text is not
         either, so there is no better candidate that is actually stable. */
      key={index}
      data-diff={line.kind === 'context' ? undefined : line.kind}
      // The accent rule REPLACES the diff's own: it is the answer to "which lines
      // is this about", and that question is the reason the hunk is here at all.
      // The fill is only taken over on a context row, so an added line stays
      // visibly added while it is being pointed at.
      className={`flex border-l-2 ${commented ? 'border-accent' : KIND_RULE[line.kind]} ${
        commented && line.kind === 'context' ? 'bg-accent/10' : KIND_FILL[line.kind]
      }`}
    >
      {/* The gutter shows ONE number: the new-file line, falling back to the old
          one on a deletion, which has no new-file line to show. Two columns is
          what GitHub does with a full-width viewport and a file to navigate;
          here the hunk is five lines long and the second column would be five
          blanks and a number. */}
      <span className="shrink-0 w-14 pr-2 text-right tabular-nums select-none text-text-secondary/50">
        {KIND_MARKER[line.kind]}
        {line.newLine ?? line.oldLine ?? ''}
      </span>
      {/* `whitespace-pre` keeps the indentation the parser deliberately did not
          trim — in code it is structure, not formatting. */}
      <span className={`pr-4 whitespace-pre ${commented ? 'text-ink' : 'text-ink/70'}`}>
        {line.text || ' '}
      </span>
    </div>
  )
}

/**
 * `memo`, and not as a reflex: the panel re-renders every thread on its 30 s clock so the
 * "2 h ago" stamps stay honest, and without a boundary here that tick re-parses every
 * hunk on screen and rebuilds every row of it — up to fifty threads' worth, twice a
 * minute, to change some text in a header far above. All three props are stable across a
 * tick: `hunk` is a string, `anchor` is the thread object the store froze a copy of when
 * the panel opened (see `PRCommentsView`), and `t` only changes identity when the
 * interface language does — so the default shallow compare is exact.
 */
function DiffHunkView({ hunk, anchor, t }: Props) {
  /**
   * Owned by the reader, and never reset by the data: a hunk cannot change under an open
   * panel — the excerpt is frozen at capture — so there is nothing to re-derive this
   * from, unlike the thread fold next door which is seeded from a state GitHub reports.
   * Off, because the fold's whole point is that a long hunk does not open the panel on
   * six hundred pixels of run-up.
   */
  const [expanded, setExpanded] = useState(false)
  // For `aria-controls`: the folded block has to be nameable from the button, and there
  // is one of these per thread on screen.
  const foldId = useId()

  const lines = parseDiffHunk(hunk ?? '')
  // NOTHING, not an empty frame. A bordered box with no rows in it, or a container that
  // contributes its parent's `space-y` gap, would both read as "the diff failed to
  // load" on a thread that simply never had one — the PR conversation and the review
  // summaries are the ordinary case, and neither has a hunk.
  if (lines.length === 0) return null

  const range = commentedRange(anchor)
  const { folded, shown } = foldHunk(lines)
  const Chevron = expanded ? ChevronsDownUp : ChevronsUpDown

  return (
    /* `overflow-hidden` on the frame and the scroll on the track inside it: the fold's
       button is a header row and has to stay put — and stay readable — while the code
       under it is scrolled sideways. */
    <div className="rounded-lg border border-line-field bg-surface-sunken overflow-hidden font-mono text-xs leading-5">
      {folded.length > 0 && (
        <button
          type="button"
          onClick={() => setExpanded(v => !v)}
          aria-expanded={expanded}
          aria-controls={foldId}
          /* `font-sans` because the frame is `font-mono` and this is a sentence, not
             code. The row reads as chrome rather than as a line of the diff. */
          className="w-full flex items-center gap-2 px-3 py-1.5 font-sans text-[11px] text-text-secondary bg-surface-subtle border-b border-line-subtle hover:bg-surface hover:text-ink transition-colors"
        >
          <Chevron className="w-3.5 h-3.5 shrink-0 text-icon" />
          <span className="tabular-nums">
            {t(expanded ? 'prComments.hunkFold' : 'prComments.hunkUnfold', {
              count: folded.length,
              total: lines.length,
            })}
          </span>
        </button>
      )}
      {/* `overflow-x-auto` and not a wrap: a diff line wrapped mid-token stops being
          alignable with the one above it, and alignment is what makes a diff readable.
          The panel is wide, so this scrolls rarely and only inside itself. */}
      <div className="overflow-x-auto">
        {/* As wide as the widest line, and never narrower than the frame. Two things
            depend on it: the row tints and rules run the full scrollable width instead
            of stopping at the viewport, and the clipping box below can hide the folded
            rows VERTICALLY without also cutting their overflow sideways — a horizontal
            `overflow: hidden` there would truncate long lines outright, since CSS turns
            the other axis into a second scroller rather than leaving it visible. */}
        <div className="w-max min-w-full">
          {folded.length > 0 && (
            <div
              id={foldId}
              /* Folded away is not "there but short": rows on their way out must stop
                 answering the screen reader the moment they start leaving. The same
                 `0fr` → `1fr` track the settings rail folds on — the grid measures the
                 rows itself, so nothing here has to know how tall a row is. No mount
                 dance is needed either: the collapsed state is committed on the first
                 render, so the click is always the second value of the transition. */
              aria-hidden={!expanded}
              className={`grid transition-[grid-template-rows] duration-300 ease-out ${
                expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
              }`}
            >
              <div className="overflow-hidden">
                {folded.map((line, index) => row(line, index, range))}
              </div>
            </div>
          )}
          {shown.map((line, index) => row(line, folded.length + index, range))}
        </div>
      </div>
    </div>
  )
}

export default memo(DiffHunkView)
