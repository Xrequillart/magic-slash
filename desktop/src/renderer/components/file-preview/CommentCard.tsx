import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { MessageSquare, MessageSquarePlus, Pencil, Trash2 } from 'lucide-react'
import { commentAnchorKind, commentLabel, type LineRange } from '../../utils/commentAnchors'
import { BTN_DANGER, BTN_GHOST, BTN_PRIMARY, INPUT } from '../../theme/controls'
import type { FileComment } from '../../store'
import { useT, type MessageKey } from '../../i18n'

/**
 * The card's own box: a block in the code column, not a panel sitting on the file.
 *
 * Two things went, and both said "floating panel" rather than "part of the document":
 *
 * - the radius. Square corners are what let the box butt up against the row above and the
 *   row below it. A rounded box between two square-edged lines of code reads as an object
 *   dropped on them, however far into the flow it actually is.
 * - the vertical margin. There is no gap to put between the box and the lines it is
 *   about — the lines part by exactly its height and nothing else.
 *
 * The border is back on all four sides, where an earlier pass had it on two. That followed
 * from the box running the full width of the slab, edges included, and it no longer does: it
 * runs the width of the ROW, so left and right are its own edges and need drawing like the
 * other two.
 *
 * The width of the row, which means starting where the line NUMBER starts and not where the
 * code does. An earlier pass pushed it past the gutter, on the reasoning that a pull request's
 * form lines up with the code — and it left a strip of empty gutter beside the box with
 * nothing in it, which read as the box having failed to reach its own edge. The rows are what
 * this is anchored to, so the rows are what it lines up with.
 *
 * The `p-3` is the one padding this component owns, and it is what keeps the textarea off
 * that border.
 *
 * A ROW, where this was a column: the leading icon takes the first slot and everything that
 * was in the card goes in the second. The stack itself did not change — it moved one level in.
 *
 * `bg-bg-tertiary`, where this was `bg-bg-secondary` and therefore invisible: that is the
 * colour of the review card the code sits IN, so the box was painted exactly the shade of its
 * own surroundings and only the border said it was there. Tertiary is the next step of the
 * same ramp, so it reads as a raised surface rather than as a new colour, and it is defined by
 * all nine themes — a `surface` token would have been translucent and let the orange wash on
 * a commented row bleed up through a form.
 *
 * No shadow, and that was already true: the floating card carried `shadow-2xl` to lift it
 * off the document, and a shadow on something that IS the document reads as a second
 * surface.
 */
const CARD = 'bg-bg-tertiary border border-line p-3 flex gap-2.5'

interface InlinePanelProps {
  panelRef: React.RefObject<HTMLDivElement>
  /** Escape: this card closes, and the review behind it does not. */
  onEscape: () => void
  /** Any other key this particular card binds. */
  onKeyDown?: (e: React.KeyboardEvent) => void
  /**
   * How wide the box should be, in pixels — the code slab's case only.
   *
   * Measured because `width: 100%` cannot answer it here: a block inside a horizontally
   * scrollable `<pre>` resolves its percentage against the WIDEST LINE of the file, so in a
   * file with one 400-column line the box would be four screens across and its buttons would
   * be off the right of the world. The number handed down is the width of the slab the reader
   * can actually see, less its own padding — the same span a row of code occupies.
   *
   * It does NOT stay put when the code is scrolled sideways — an earlier pass pinned it with
   * `sticky left-0` and that was the wrong call: the box belongs to the lines it is about, so
   * it travels with them. The cost is real and is the one that was chosen: scroll far enough
   * along a very long line and the buttons go off the left with everything else.
   *
   * Omitted for prose, which has no horizontal scroll and no long-line problem: `w-full`
   * there is already the right answer.
   */
  width?: number
  children: React.ReactNode
}

/**
 * The surface the card is drawn on, in the document rather than over it.
 *
 * What survived from the `FloatingPanel` this replaced is exactly what was never about
 * floating: `data-comment-composer`, which FilePreviewPanel's Escape and Alt+↑/↓ listeners
 * bail on via `closest('[data-comment-composer]')` — a target test rather than a flag in the
 * store, on the model of the `.xterm` guard already there, so there is no state to keep in
 * step and nothing a card that unmounted can leave set. The keystroke has to ARRIVE here for
 * that to matter, which it only does if something in here holds the focus: hence
 * `tabIndex={-1}`, focusable by script and never a tab stop, and `stopPropagation` to keep
 * Escape off the `document` listeners.
 *
 * What did NOT survive is the outside-click dismissal, and its absence is deliberate. A
 * floating panel has to close when the reader clicks past it, or it hangs over the document
 * with no way out. A card in the flow has Cancel and Escape, and a mousedown on the code is
 * how a reader selects the next passage they want to write about — throwing away a
 * half-written comment for it is the behaviour GitHub does not have either.
 */
function InlinePanel({ panelRef, onEscape, onKeyDown, width, children }: InlinePanelProps) {
  /**
   * A passive effect, unlike the layout one that placed the floating card: there is nothing
   * to measure before painting, and the node is already in the flow by the time this runs.
   */
  useEffect(() => {
    panelRef.current?.focus()
  }, [panelRef])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation()
      onEscape()
      return
    }
    onKeyDown?.(e)
  }

  return (
    <div
      data-comment-composer
      ref={panelRef}
      tabIndex={-1}
      onKeyDown={handleKeyDown}
      /**
       * The one number the caller measures. No offset beside it: the box starts at its
       * container's content edge, which in the code slab is where the line numbers start.
       *
       * Nothing here is `position`ed either, so the box scrolls with the code — which is the
       * whole of "the card follows the code".
       */
      style={{ width }}
      /* `focus-visible:outline-none` for the same reason the drawer's scroller has it: the
         app paints a 2px accent ring on `:focus-visible` globally, and Chromium matches it
         on a `tabindex="-1"` element that was focused by script. The ring would frame the
         whole card on open and tell the reader nothing.

         `select-text` re-enables the selection the host node turns off — see
         `useInlineCommentHost` for why the host has to. A reader has to be able to select
         what they have written; what must stay unselectable is the gap AROUND the card
         inside the code, which the host still covers. */
      className={`${CARD} ${width === undefined ? 'w-full' : ''} select-text focus-visible:outline-none`}
    >
      {children}
    </div>
  )
}

/**
 * What was selected, as context rather than as content.
 *
 * Clamped to three lines: the quote is there to tell the reader — and the agent the review
 * is handed to — whether the lines still say what the comment was about. It is not a second
 * copy of the file.
 *
 * It stays clamped now that the card is full width and could afford more, because the reason
 * was never the width: the card sits BETWEEN two halves of the file, and one that grew with
 * the selection would push the lines below it off the screen.
 */
function Quote({ quote }: { quote: string }) {
  if (!quote.trim()) return null
  return (
    <pre className="max-h-16 overflow-hidden text-[11px] font-mono leading-snug text-text-secondary whitespace-pre-wrap break-all border-l-2 border-line pl-2">
      {quote}
    </pre>
  )
}

interface NoticeProps {
  /** How many comments the notice is about. Nothing is drawn for none — see the guard below. */
  count: number
  /** What to say about one, and about several. See the class docblock for why two keys. */
  one: MessageKey
  other: MessageKey
  /**
   * The horizontal padding to line the notice up with the content it sits above — the one
   * thing that genuinely differs between the two views, `px-4` for the code slab and `px-5`
   * for the prose, both taken from what the content below sets for itself.
   */
  className: string
}

/**
 * What a view says about this file's comments that it cannot show.
 *
 * ONE component for both directions, because it is one fact stated twice. The raw diff has no
 * row for a comment anchored to a quoted passage, and the rendered document may no longer
 * contain a passage a comment quotes; in both cases the comment is KEPT — toggling a view is
 * not a way to delete a comment, and losing the text a comment was about is not a reason to
 * lose the note — and in both cases the reader has to be told, because silence there is
 * indistinguishable from the comment having been dropped.
 *
 * It lives here rather than in the review's comment list, and here is the only place it can:
 * the list is portalled to `<body>` with no idea which of the forty cards behind it is
 * showing prose and which is showing a diff. Above the content rather than beside a row,
 * because it is a fact about the FILE — there is no row it belongs to, which is the very
 * thing it is saying.
 *
 * Two catalogue KEYS rather than one message with a plural rule, the convention this app
 * keeps throughout: a suffix rule that works in English does not survive translation.
 */
export function CommentAnchorNotice({ count, one, other, className }: NoticeProps) {
  const t = useT()
  // `<= 0`, not `=== 0`: the rendered view DERIVES its count as a shortfall between the
  // passages it is looking for and the pills it placed, and there is nothing to say about a
  // shortfall of none — which a negative number, from whichever of the two the render caught
  // first, is also not.
  if (count <= 0) return null
  return (
    <div className={`flex items-start gap-1.5 pt-3 text-[11px] text-text-secondary ${className}`}>
      <MessageSquare className="w-3 h-3 mt-0.5 shrink-0 text-orange" />
      <span>{count === 1 ? t(one) : t(other, { count })}</span>
    </div>
  )
}

interface Props {
  /** The comment being read or edited, or `null` while a new one is being written. */
  comment: FileComment | null
  /**
   * The lines it is attached to — re-derived by the caller, never remembered by this card.
   *
   * `null` when there are none, which is not merely the shape the store allows: a comment on
   * the RENDERED markdown is anchored to a quoted passage instead, because the prose has no
   * mapping back to the file's lines. `quote` below is then the anchor rather than context
   * beside one, and the two together are what `commentLabel` reads to name the card.
   */
  range: LineRange | null
  /** What was selected. Taken from `comment` when there is one, so this is the new-comment case. */
  quote: string
  /**
   * The node in the document's flow to render into, from `useInlineCommentHost` — inserted
   * after the last line the comment is about, which is what puts the card BELOW them.
   *
   * Taken as a prop rather than made here, because only the caller knows what "the last line"
   * means: a row of shiki's HTML for the diff, the block element a passage ends in for prose.
   */
  host: HTMLElement
  /** How wide the box should be, for the code slab. See `InlinePanel`'s own prop. */
  width?: number
  onSave: (body: string) => void
  onDelete: () => void
  /**
   * Discard this card entirely — passed ONLY for a comment being written.
   *
   * A stored comment has no close: every one of them is shown open, permanently, so there is
   * no state for closing to return to. Its Cancel leaves EDIT mode and its card goes on
   * standing where it was; a new comment's Cancel is the only one that makes a card go away,
   * because a new comment's card is the only one that was not already there.
   *
   * Absent rather than a no-op function, so the read-mode footer can tell the two apart
   * without being told twice.
   */
  onClose?: () => void
}

/**
 * The comment itself: written, then read, edited or deleted.
 *
 * One component for both states rather than a composer and a viewer, because they are the
 * same card in the same place — the reader clicks the marker on a line, reads what they
 * wrote, presses Edit, and the box they type in has to be exactly where the text they were
 * reading was.
 *
 * There is no longer an offer in front of it. Selecting lines opens this card directly, with
 * the box already focused: the intermediate "Comment" button existed to keep a plain copy
 * gesture from popping a composer, and the cost of that — two clicks to write every comment,
 * the second one on a target that had just appeared — was worse than the thing it avoided.
 * Escape and Cancel close a card being written without leaving anything behind, which is what
 * makes the accidental case cheap again.
 *
 * A STORED comment's card, by contrast, never goes away: the caller mounts one per comment and
 * leaves them all open, so this component's two states are the two states of a note that is
 * always on screen — being read, or being rewritten. `onClose` is what tells the two callers
 * apart; see its own comment.
 */
export default function CommentCard({ comment, range, quote, host, width, onSave, onDelete, onClose }: Props) {
  const t = useT()
  /**
   * The quote, read ONCE: a stored comment's own, else the prop, which is the new-comment
   * case. Read here rather than at each of the three places below that want it, so the
   * label, the composer's prompt and the `Quote` cannot come to disagree about what this
   * card is showing.
   */
  const shownQuote = comment?.quote ?? quote

  /**
   * What this comment is about, as the reader reads it — and the shape the composer's prompt
   * takes with it. Both come off ONE reading of the discriminant.
   *
   * `commentLabel` picks the KEY rather than building a string, and picks between three of
   * them rather than testing `range` here: a range names its lines (singular and plural
   * being two keys, since "Lines 12–12" survives review in English and reads as a bug in
   * French), a quotation names itself, and a comment on neither names the file. That choice
   * lives in `commentAnchorKind` and nowhere else.
   */
  const anchoring = { anchor: range, quote: shownQuote }
  const kind = commentAnchorKind(anchoring)
  const label = commentLabel(anchoring)
  // A comment that does not exist yet opens straight into the box: nobody presses "Edit"
  // on an empty card.
  const [editing, setEditing] = useState(comment === null)
  const [body, setBody] = useState(comment?.body ?? '')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  /**
   * Which part of the card holds the focus `InlinePanel` has already taken for it: the box
   * being typed in whenever there is one, so the reader can start writing — and pressing
   * Edit moves it there without a second click.
   *
   * This is what makes a selection land in a composer rather than on a button. It was true
   * of the card before as well; what changed is that the card now opens on the selection
   * itself, so it is the FIRST thing that happens rather than the second.
   */
  useEffect(() => {
    if (editing) textareaRef.current?.focus()
    else panelRef.current?.focus()
  }, [editing])

  const saved = body.trim()

  /**
   * Hand the body up, then drop out of edit mode — the card stays open, showing what was
   * just written.
   *
   * The second half is only reached for a comment that ALREADY existed. A new one is re-keyed
   * by the caller the moment it has an id, so this component remounts and reads `editing` from
   * `comment === null` all over again — which is false, since it now has one. Doing it here
   * anyway is what keeps the two paths from needing to know about each other.
   */
  const save = () => {
    onSave(saved)
    setEditing(false)
  }

  /**
   * Back out of what is being done, which is not the same thing in the two cards.
   *
   * A stored comment returns to being read, with the body it had before this edit — so
   * Cancel undoes the typing rather than the comment. A new one has nothing to return to, so
   * its caller takes the card away.
   *
   * Bound to Cancel and to Escape both, so the key and the button cannot come to disagree.
   */
  const dismiss = () => {
    if (comment) {
      setBody(comment.body)
      setEditing(false)
      return
    }
    onClose?.()
  }

  /** Escape is `InlinePanel`'s. This is the one shortcut a box whose Enter key has to
   *  insert a newline still wants. */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && editing && saved) {
      e.preventDefault()
      save()
    }
  }

  return createPortal(
    <InlinePanel panelRef={panelRef} onEscape={dismiss} onKeyDown={handleKeyDown} width={width}>
      {/* The marker, repeated inside the thing it marks.
          The SAME icon the gutter pill draws — lucide's `message-square`, which CodeView has to
          reproduce as a CSS mask because a pseudo-element cannot hold a React element — and the
          same orange. That is what ties a card to the pill on the rows above it: a file with
          three notes on it has three pills and three cards, and the icon is what says which
          kind of thing each one is.

          `w-3.5` matches the pill's own 0.9rem, so the two read as one size. `mt-px` sits it on
          the optical line of the 11px label beside it rather than on the box's top edge.

          Plus-signed while there is nothing stored yet: this was the icon of the "Comment"
          button that used to stand in front of the composer, and it goes on meaning the same
          thing — a comment about to exist. `aria-hidden` because the label under it already
          names the card, in words, to anything reading the tree. */}
      {comment
        ? <MessageSquare className="w-3.5 h-3.5 mt-px shrink-0 text-orange" aria-hidden="true" />
        : <MessageSquarePlus className="w-3.5 h-3.5 mt-px shrink-0 text-orange" aria-hidden="true" />}

      {/* `min-w-0` so the quote's `break-all` and the textarea have something to shrink
          against: a flex child defaults to its content's width and would push the card wider
          than the row it is spliced into. */}
      <div className="flex flex-col gap-2 min-w-0 flex-1">
        <span className="text-[11px] font-medium text-text-secondary">{t(label.key, label.vars)}</span>
        <Quote quote={shownQuote} />

        {editing ? (
          <>
            <textarea
              ref={textareaRef}
              value={body}
              onChange={e => setBody(e.target.value)}
              /* Asked about the LINES or about the PASSAGE, whichever this comment is
                 attached to. One placeholder for both said "these lines" over a quotation,
                 which is the one thing the reader has to get right before typing. */
              placeholder={t(kind === 'quote'
                ? 'filePreview.commentQuotePlaceholder'
                : 'filePreview.commentPlaceholder')}
              /* Three, where the floating card wanted four: the box is the full width of the
                 view now, so a line of it holds two or three times the words it used to, and
                 four rows of that is a panel rather than a comment box. */
              rows={3}
              /* `INPUT` composed, never re-spelled: this is the same field box as every
                 other one in the app, plus the two things a comment box adds. */
              className={`${INPUT} w-full resize-none`}
            />
            <div className="flex items-center justify-end gap-1.5">
              <button type="button" onClick={dismiss} className={BTN_GHOST}>
                {t('common.cancel')}
              </button>
              {/* Disabled on an empty body rather than saving a comment with nothing in it:
                  an empty note is a marker on a line that says nothing, and the only way
                  back out of it would be to delete it. */}
              <button type="button" disabled={!saved} onClick={save} className={`${BTN_PRIMARY} disabled:opacity-40 disabled:cursor-not-allowed`}>
                {t('common.save')}
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-xs text-ink whitespace-pre-wrap break-words">{comment?.body}</p>
            <div className="flex items-center justify-end gap-1.5">
              <button type="button" onClick={onDelete} className={BTN_DANGER}>
                <Trash2 className="w-3.5 h-3.5" />
                {t('filePreview.commentDelete')}
              </button>
              <button type="button" onClick={() => setEditing(true)} className={BTN_GHOST}>
                <Pencil className="w-3.5 h-3.5" />
                {t('common.edit')}
              </button>
              {/* No Close beside them, and it was here for one revision.
                  It answered a real problem — saving left the card open with only Escape to get
                  out of it — that stopped existing when every stored comment became permanently
                  open: there is no closed state for a note to return to, so a button offering
                  one would either lie or hide a comment the file still has. Delete is how a
                  comment goes away now, and it says so. */}
            </div>
          </>
        )}
      </div>
    </InlinePanel>,
    host,
  )
}
