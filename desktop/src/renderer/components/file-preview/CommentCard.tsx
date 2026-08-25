import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { MessageSquare, MessageSquarePlus, Pencil, Trash2 } from 'lucide-react'
import { useSelectionAnchoredPanel } from '../../hooks/useSelectionAnchoredPanel'
import { commentAnchorKind, commentLabel, type LineRange } from '../../utils/commentAnchors'
import { BTN_DANGER, BTN_GHOST, BTN_PRIMARY, INPUT } from '../../theme/controls'
import type { FileComment } from '../../store'
import { useT, type MessageKey } from '../../i18n'

/**
 * Wide enough for a sentence about a line of code without becoming a second document.
 *
 * A number rather than a Tailwind width, because the hook needs it: the panel is `fixed`
 * and clamped inside the window by hand, and a width only CSS knew about could not be
 * subtracted from `window.innerWidth`.
 */
const CARD_WIDTH = 340

/** The affordance is a single short verb — sized to it, not to the card. */
const AFFORDANCE_WIDTH = 132

/**
 * Above the drawer (`z-[60]`) and its backdrop (`z-[59]`), both of which this floats over.
 *
 * Portalled to `<body>`, so it is not a descendant of either — which is the point. The
 * drawer's scroller is `overflow-auto` with `will-change: transform`, so a panel rendered
 * inside it would be clipped by it AND would join its scrollable overflow.
 */
const FLOATING = 'z-[70] bg-bg-secondary border border-line rounded-xl shadow-2xl'

interface FloatingPanelProps {
  panelRef: React.RefObject<HTMLDivElement>
  style: React.CSSProperties
  /** Escape: this panel closes, and the review behind it does not. */
  onEscape: () => void
  /** Any other key this particular panel binds. */
  onKeyDown?: (e: React.KeyboardEvent) => void
  /** What this panel adds to `FLOATING`: its padding, and its own layout. */
  className: string
  children: React.ReactNode
}

/**
 * The surface both panels float on: the offer, and then the card.
 *
 * ONE component rather than the same three lines on each of them, because the offer is the
 * card in an earlier state and everything here is what a reader expects of both — starting
 * with the criterion "Escape closes the composer and does NOT close the review drawer",
 * which was true of the card alone for exactly as long as the attribute was spelled once.
 *
 * All three parts of that criterion live here. `data-comment-composer` is what
 * FilePreviewPanel's Escape and Alt+↑/↓ listeners bail on, via
 * `closest('[data-comment-composer]')` — a target test rather than a flag in the store, on
 * the model of the `.xterm` guard already there, so there is no state to keep in step and
 * nothing a panel that unmounted can leave set. The keystroke then has to ARRIVE here,
 * which it only does if something in here holds the focus: hence `tabIndex={-1}`, focusable
 * by script and never a tab stop. And `stopPropagation` is what keeps it off the `document`
 * listeners — the drawer's, and the outside-click helper's.
 *
 * A passive effect rather than a layout one: the hook places the panel from a LAYOUT
 * effect, and a `visibility: hidden` element cannot take focus.
 */
function FloatingPanel({ panelRef, style, onEscape, onKeyDown, className, children }: FloatingPanelProps) {
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

  return createPortal(
    <div
      data-comment-composer
      ref={panelRef}
      tabIndex={-1}
      onKeyDown={handleKeyDown}
      style={style}
      /* `focus-visible:outline-none` for the same reason the drawer's scroller has it: the
         app paints a 2px accent ring on `:focus-visible` globally, and Chromium matches it
         on a `tabindex="-1"` element that was focused by script. The ring would frame the
         whole panel on open and tell the reader nothing. */
      className={`${FLOATING} focus-visible:outline-none ${className}`}
    >
      {children}
    </div>,
    document.body,
  )
}

/**
 * What was selected, as context rather than as content.
 *
 * Clamped to three lines: the quote is there to tell the reader — and, in story 5, the
 * agent — whether the lines still say what the comment was about. It is not a second copy
 * of the file, and a card that grew with the selection would cover the code it describes.
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

interface AffordanceProps {
  /**
   * Where the affordance should sit, asked again on every scroll frame. See
   * `useSelectionAnchoredPanel` for why this is a function.
   */
  anchorRect: () => DOMRect | null
  /** Confirmed — open the composer on this selection. */
  onConfirm: () => void
  /** Dismissed with Escape, or by a click that landed somewhere else. */
  onDismiss: () => void
}

/**
 * The offer, before the card.
 *
 * Selecting text is not a request to comment — it is also how code gets copied — so the
 * composer does not open on a selection. This button is what turns one into the other,
 * and it is the reason the criterion reads "offers to comment, and CONFIRMING opens a
 * floating card".
 *
 * `onMouseDown` is cancelled so that pressing it does not collapse the selection it was
 * offered for: the quote is read at mouseup on the code, but the highlight the reader can
 * still see is what makes the offer legible.
 */
export function CommentAffordance({ anchorRect, onConfirm, onDismiss }: AffordanceProps) {
  const t = useT()
  const { panelRef, style } = useSelectionAnchoredPanel(onDismiss, AFFORDANCE_WIDTH, anchorRect)

  return (
    <FloatingPanel panelRef={panelRef} style={style()} onEscape={onDismiss} className="p-1">
      <button
        type="button"
        onMouseDown={e => e.preventDefault()}
        onClick={onConfirm}
        className={`${BTN_GHOST} w-full justify-center`}
      >
        <MessageSquarePlus className="w-3.5 h-3.5" />
        {t('filePreview.comment')}
      </button>
    </FloatingPanel>
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
  anchorRect: () => DOMRect | null
  onSave: (body: string) => void
  onDelete: () => void
  onClose: () => void
}

/**
 * The comment itself: written, then read, edited or deleted.
 *
 * One component for both states rather than a composer and a viewer, because they are the
 * same card in the same place — the reader clicks the marker on a line, reads what they
 * wrote, presses Edit, and the box they type in has to be exactly where the text they were
 * reading was.
 *
 * Everything that makes it a floating panel — the attribute the drawer's keyboard listeners
 * bail on, the focus, Escape — is `FloatingPanel` above, shared with the offer.
 */
export default function CommentCard({ comment, range, quote, anchorRect, onSave, onDelete, onClose }: Props) {
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
  const { panelRef, style } = useSelectionAnchoredPanel(onClose, CARD_WIDTH, anchorRect)

  /**
   * Which part of the card holds the focus `FloatingPanel` has already taken for it: the
   * box being typed in whenever there is one, so the reader can start writing — and
   * pressing Edit moves it there without a second click.
   */
  useEffect(() => {
    if (editing) textareaRef.current?.focus()
    else panelRef.current?.focus()
  }, [editing, panelRef])

  const saved = body.trim()

  /** Escape is `FloatingPanel`'s. This is the one shortcut a box whose Enter key has to
   *  insert a newline still wants. */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && editing && saved) {
      e.preventDefault()
      onSave(saved)
    }
  }

  return (
    <FloatingPanel
      panelRef={panelRef}
      style={style()}
      onEscape={onClose}
      onKeyDown={handleKeyDown}
      className="p-3 flex flex-col gap-2"
    >
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
            rows={4}
            /* `INPUT` composed, never re-spelled: this is the same field box as every
               other one in the app, plus the two things a comment box adds. */
            className={`${INPUT} w-full resize-none`}
          />
          <div className="flex items-center justify-end gap-1.5">
            <button type="button" onClick={onClose} className={BTN_GHOST}>
              {t('common.cancel')}
            </button>
            {/* Disabled on an empty body rather than saving a comment with nothing in it:
                an empty note is a marker on a line that says nothing, and the only way
                back out of it would be to delete it. */}
            <button type="button" disabled={!saved} onClick={() => onSave(saved)} className={`${BTN_PRIMARY} disabled:opacity-40 disabled:cursor-not-allowed`}>
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
          </div>
        </>
      )}
    </FloatingPanel>
  )
}
