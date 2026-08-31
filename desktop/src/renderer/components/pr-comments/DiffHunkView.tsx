import { memo } from 'react'
import { commentedRange, isCommentedLine, parseDiffHunk, type CommentAnchor } from '../../utils/diffHunk'

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
}

/**
 * `memo`, and not as a reflex: the panel re-renders every thread on its 30 s clock so the
 * "2 h ago" stamps stay honest, and without a boundary here that tick re-parses every
 * hunk on screen and rebuilds every row of it — up to fifty threads' worth, twice a
 * minute, to change some text in a header far above. Both props are stable across a tick:
 * `hunk` is a string, and `anchor` is the thread object the store froze a copy of when
 * the panel opened (see `PRCommentsView`), so the default shallow compare is exact.
 */
function DiffHunkView({ hunk, anchor }: Props) {
  const lines = parseDiffHunk(hunk ?? '')
  // NOTHING, not an empty frame. A bordered box with no rows in it, or a container that
  // contributes its parent's `space-y` gap, would both read as "the diff failed to
  // load" on a thread that simply never had one — the PR conversation and the review
  // summaries are the ordinary case, and neither has a hunk.
  if (lines.length === 0) return null

  const range = commentedRange(anchor)

  return (
    /* `overflow-x-auto` and not a wrap: a diff line wrapped mid-token stops being
       alignable with the one above it, and alignment is what makes a diff readable.
       The panel is wide, so this scrolls rarely and only inside itself. */
    <div className="rounded-lg border border-line-field bg-surface-sunken overflow-x-auto font-mono text-xs leading-5">
      {lines.map((line, index) => {
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
      })}
    </div>
  )
}

export default memo(DiffHunkView)
