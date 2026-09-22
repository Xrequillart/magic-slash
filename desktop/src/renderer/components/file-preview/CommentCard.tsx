import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { MessageSquare, MessageSquarePlus, Pencil, Reply, Trash2 } from '@ds/desktop/icons'
import { commentAnchorKind, commentLabel, type LineRange } from '../../utils/commentAnchors'
import { BTN_DANGER, BTN_GHOST, BTN_PRIMARY } from '../../theme/controls'
import type { FileComment } from '../../store'
import { useT, type MessageKey } from '../../i18n'
import { Banner, ButtonIcon, CommentCard as TurnCard, Input } from '@ds/desktop'

/**
 * The card's own box: a block in the code column, not a panel sitting on the file.
 *
 * Two things went, and both said "floating panel" rather than "part of the document":
 *
 * - the radius. Square corners are what let the box butt up against the row above and the
 *   row below it. A rounded box between two square-edged lines of code reads as an object
 *   dropped on them, however far into the flow it actually is.
 *
 *   ONE caller gets it back, and it is the same argument read backwards rather than an
 *   exception to it. The agent sidebar's live spec is PROSE: there is no square-edged row
 *   above or below for the box to meet, so square corners there read as a box that forgot
 *   its radius rather than as part of the document. `spec` on the props below is what asks
 *   for it, and `rounded-lg` is what the rest of the app spells a raised surface with.
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
 *
 * `font-sans` is not a default restated, it is a default RECOVERED. This card is portalled
 * into a node spliced between two rows of shiki's output, so it lives inside the code
 * slab's `<pre>` — and `font-family` inherits. Everything in here was therefore drawn in
 * the terminal's monospace: the label, the note, the textarea, the buttons. Declared once
 * on the box, since the card has no single text element to put it on, and the one thing
 * that SHOULD be monospaced keeps saying so for itself (see `Quote`).
 */
const CARD = 'bg-bg-tertiary border border-line p-3 flex gap-2.5 font-sans'

interface InlinePanelProps {
  panelRef: React.RefObject<HTMLDivElement>
  /**
   * Escape: this card closes, and the review behind it does not.
   *
   * The ONLY key this panel binds. It carried an `onKeyDown` escape hatch for the card's
   * ⌘↩ while one of the card's boxes was hand-written; every box in there is a `Composer`
   * now, and each binds its own — which they have to, because they nest, and a keystroke
   * caught up here would file the outer draft on the way out of the inner one.
   */
  onEscape: () => void
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
  /**
   * Whether this box is the live spec's rather than a review's. See `spec` on `CommentCard`'s
   * own props for what it means and why one flag drives both of the things it changes; here
   * it buys the radius alone.
   */
  spec?: boolean
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
function InlinePanel({ panelRef, onEscape, width, spec, children }: InlinePanelProps) {
  /**
   * A passive effect, unlike the layout one that placed the floating card: there is nothing
   * to measure before painting, and the node is already in the flow by the time this runs.
   */
  useEffect(() => {
    panelRef.current?.focus()
  }, [panelRef])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'Escape') return
    e.stopPropagation()
    onEscape()
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
      className={`${CARD} ${spec ? 'rounded-lg' : ''} ${width === undefined ? 'w-full' : ''} select-text focus-visible:outline-none`}
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
export function Quote({ quote }: { quote: string }) {
  if (!quote.trim()) return null
  return (
    <pre className="max-h-16 overflow-hidden text-[11px] font-mono leading-snug text-text-secondary whitespace-pre-wrap break-all border-l-2 border-line pl-2">
      {quote}
    </pre>
  )
}

/**
 * What somebody wrote, as written — the one paragraph every card in this neighbourhood
 * ends in.
 *
 * `whitespace-pre-wrap` because a comment is typed prose and its line breaks are the
 * author's, and `break-words` because a pasted url has no spaces in it and would otherwise
 * push the card past the column it sits in. Four call sites spelled this string before it
 * was a component — the two states of a thread's head, a reply, and an orphan on the plans
 * page — which is three chances for one of them to be tweaked alone.
 */
export function CommentBody({ body }: { body: string }) {
  return <p className="text-xs text-ink whitespace-pre-wrap break-words">{body}</p>
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
  /**
   * The comments themselves, when the view has them to show — which turns the notice
   * from a sentence into a DISCLOSURE.
   *
   * THIS IS THE ONLY PLACE AN ORPHANED COMMENT CAN EXIST, and that is worth stating
   * plainly because the mechanics make it look like an oversight otherwise. A comment on
   * rendered prose is drawn by portalling its card into a host node spliced in after the
   * block its passage ends in; a comment whose passage the document no longer contains
   * gets no range, therefore no host, therefore nowhere to be. So it is drawn HERE,
   * outside the host mechanism entirely, under the sentence that says what happened to
   * it.
   *
   * Absent for the raw diff's use of this component, which really has nothing to show:
   * its comments are anchored to a passage of the RENDERED document and are one toggle
   * away, whole. Nothing is lost there, so there is nothing to disclose.
   *
   * Closed by default. The reader is looking at a document, and an orphan is a note about
   * a sentence that is not in it — worth being told about, not worth being interrupted by.
   */
  children?: ReactNode
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
export function CommentAnchorNotice({ count, one, other, className, children }: NoticeProps) {
  const t = useT()
  // `<= 0`, not `=== 0`: the rendered view DERIVES its count as a shortfall between the
  // passages it is looking for and the pills it placed, and there is nothing to say about a
  // shortfall of none — which a negative number, from whichever of the two the render caught
  // first, is also not.
  if (count <= 0) return null

  const sentence = (
    <>
      <MessageSquare className="w-3 h-3 mt-0.5 shrink-0 text-orange" />
      <span>{count === 1 ? t(one) : t(other, { count })}</span>
    </>
  )

  // No comments to show: the sentence, exactly as it was. The diff's notice, and the
  // rendered view's whenever the caller has nothing to hand over.
  if (!children) {
    return (
      <div className={`flex items-start gap-1.5 pt-3 text-[11px] text-text-secondary ${className}`}>
        {sentence}
      </div>
    )
  }

  /**
   * A native `<details>` and not a `useState` toggle, which is the same choice
   * `MarkdownView`'s own `[&_details]` rules are already written for: the disclosure has
   * no state anything else reads, the summary is focusable and operable by keyboard for
   * free, and find-in-page opens it in Chromium. A button plus a boolean would be three
   * more things to keep in step for the same two lines on screen.
   */
  return (
    <details className={`pt-3 text-[11px] text-text-secondary ${className}`}>
      <summary className="flex items-start gap-1.5 cursor-pointer select-none list-none marker:content-none">
        {sentence}
        <span className="underline opacity-70">{t('filePreview.commentQuoteLostShow')}</span>
      </summary>
      <div className="mt-2 flex flex-col gap-2">{children}</div>
    </details>
  )
}

/**
 * Who wrote a turn, resolved — this component never looks anybody up.
 *
 * `name` is whatever the caller decided is readable: on a plan that is the author's email,
 * falling back to the first segment of their uuid, exactly as the plans list names the
 * author of a plan (`planAuthor`). Deciding it here would mean a comment naming
 * somebody differently from the row their plan appears on.
 */
export interface CommentAuthor {
  name: string
  /** A `data:` URL. Absent for somebody who has no photo — the avatar draws its fallback. */
  avatarUrl?: string
}

/** One turn of a conversation under a comment. */
export interface CommentTurn {
  id: string
  author: CommentAuthor
  /** Already formatted, against the page's one clock. */
  date?: string
  body: string
  /**
   * Whether this reader may rewrite or delete it.
   *
   * THE INTERFACE HIDES THE BUTTONS; THE POLICIES REFUSE THE WRITE. This is `canEdit` from
   * `utils/planComments.ts` and it is the weaker of the two guards by design — a renderer
   * cannot be trusted about whose comment it is asking to delete, so `plan_comments`' own
   * policies are what actually stop it. What this buys is that the ordinary case looks
   * ordinary: a colleague's comment simply has no Delete on it.
   */
  canEdit: boolean
}

/**
 * The conversation a stored comment carries — absent for every card backed by the zustand
 * store, which has no authors and no replies.
 *
 * ONE OPTIONAL PROP FOR THE WHOLE VARIANT rather than six loose ones, because they arrive
 * together or not at all: a comment that has an author has a date, a permission and a
 * thread, and a comment that has none of those has none of the rest either. A card asked
 * to draw half of it would be a card in a state the app cannot produce.
 */
export interface CommentThread {
  author: CommentAuthor
  date?: string
  canEdit: boolean
  /** Oldest first. Empty for a comment nobody has answered. */
  replies: CommentTurn[]
  /**
   * THE THREE WRITES, AND EACH ONE ANSWERS WHETHER IT LANDED.
   *
   * `Promise<boolean>` rather than `void`, because every one of these goes to a table
   * behind a network and a policy: a reply refused by RLS, a connection that dropped, a
   * comment a colleague deleted from the webapp while this reader was rewriting it. A
   * `void` here made those three indistinguishable from success — the box closed, the card
   * went back to being read, and the next refetch quietly put the old words back.
   *
   * `false` is what keeps the box open with the typed text still in it. See the error
   * state on the card below: the retry is pressing Save again, so nothing needs saving
   * anywhere else.
   */
  onReply: (body: string) => Promise<boolean>
  onSaveReply: (id: string, body: string) => Promise<boolean>
  onDeleteReply: (id: string) => Promise<boolean>
}

/**
 * What a card says when a write did not land — one key per kind of write, and only two
 * because the reader's next move is the same for both.
 *
 * NOT A TOAST. The strip belongs to the card the action was taken from: with a dozen
 * comments open down a plan's spec, a message raised over the app names no comment, and
 * the one thing the reader has to be told is WHICH of their notes is not stored.
 */
const SAVE_FAILED: MessageKey = 'filePreview.commentSaveFailed'
const DELETE_FAILED: MessageKey = 'filePreview.commentDeleteFailed'

/**
 * A box to write in, with Cancel and Save — the composer, factored out of the card once
 * there were three of them: the comment itself, a reply, and a reply being edited.
 *
 * Save is disabled on an empty body for the card's own reason: an empty note is a marker
 * that says nothing, and deleting it would be the only way back out.
 */
function Composer({
  value,
  onChange,
  onSave,
  onCancel,
  placeholder,
  rows = 3,
  autoFocus,
}: {
  value: string
  onChange: (next: string) => void
  onSave: () => void
  onCancel: () => void
  placeholder: string
  rows?: number
  autoFocus?: boolean
}) {
  const t = useT()
  const ref = useRef<HTMLInputElement | HTMLTextAreaElement>(null)
  const saved = value.trim()

  useEffect(() => {
    if (autoFocus) ref.current?.focus()
  }, [autoFocus])

  return (
    <>
      <Input
        multiline
        ref={ref}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        rows={rows}
        className="w-full"
        onKeyDown={(e) => {
          // The one shortcut a box whose Enter has to insert a newline still wants.
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && saved) {
            e.preventDefault()
            // STOPPED, because these boxes nest: a reply's composer sits inside the card
            // that holds the head comment's, and a keystroke left to bubble would be heard
            // by both — filing the head's draft on the way out of the reply.
            e.stopPropagation()
            onSave()
          }
        }}
      />
      <div className="flex items-center justify-end gap-1.5">
        <button type="button" onClick={onCancel} className={BTN_GHOST}>
          {t('common.cancel')}
        </button>
        <button
          type="button"
          disabled={!saved}
          onClick={onSave}
          className={`${BTN_PRIMARY} disabled:opacity-40 disabled:cursor-not-allowed`}
        >
          {t('common.save')}
        </button>
      </div>
    </>
  )
}

/**
 * Delete and Edit, the two controls a turn offers its own author.
 *
 * ONE COMPONENT for the head of a thread and for a reply, because they are the same pair in
 * the same slot: the head's card and `ReplyTurn` differ in the avatar's size, the verb and
 * the indent, and nothing about what a reader may do to their own words. Two copies would
 * have drifted at the first change to either.
 *
 * Icon-only, with the name in the tooltip: the strip they sit in already carries an avatar,
 * a name and a timestamp, and two more words on the end of it would be the widest thing in
 * a card spliced into prose.
 */
function TurnActions({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  const t = useT()
  return (
    <>
      <ButtonIcon
        icon={Trash2}
        title={t('filePreview.commentDelete')}
        onClick={onDelete}
        tone="danger"
        size="xs"
      />
      <ButtonIcon icon={Pencil} title={t('common.edit')} onClick={onEdit} tone="ghost" size="xs" />
    </>
  )
}

/**
 * One reply, read or being rewritten.
 *
 * Drawn by the design system's own `CommentCard` — `ground="bare"`, because this one is
 * already inside a card spliced into the prose — so a reply here and a comment on a ticket
 * page are visibly the same object. What this file adds is the two states.
 */
function ReplyTurn({
  turn,
  onSave,
  onDelete,
}: {
  turn: CommentTurn
  onSave: (body: string) => Promise<boolean>
  onDelete: () => Promise<boolean>
}) {
  const t = useT()
  const [editing, setEditing] = useState(false)
  const [body, setBody] = useState(turn.body)
  /**
   * This reply's own failed write, if it has one.
   *
   * ITS OWN, and not the card's: a thread can have six replies open and the strip has to
   * be under the one whose Delete was refused. Each `ReplyTurn` holding its own is what
   * makes that automatic — the state cannot be shown on a turn other than the one that
   * set it.
   */
  const [error, setError] = useState<MessageKey | null>(null)

  /**
   * Leave edit mode only once the write has landed. A refusal keeps the box open with what
   * was typed still in it, which is what makes pressing Save again the retry.
   */
  const save = async () => {
    if (await onSave(body.trim())) {
      setError(null)
      setEditing(false)
      return
    }
    setError(SAVE_FAILED)
  }

  /**
   * Nothing to do on success: the reply is gone from the thread on the next read, and this
   * component with it. A refusal is the only outcome that leaves anything to say.
   */
  const remove = async () => {
    if (!await onDelete()) setError(DELETE_FAILED)
  }

  return (
    <TurnCard
      ground="bare"
      avatar={{ src: turn.author.avatarUrl ?? null, alt: '', size: 'sm' }}
      author={turn.author.name}
      date={turn.date}
      actions={!editing && turn.canEdit ? (
        <TurnActions
          onEdit={() => { setBody(turn.body); setError(null); setEditing(true) }}
          onDelete={() => { void remove() }}
        />
      ) : undefined}
      /* Under the body, which is where the design system's own card puts it — so a refused
         write on a reply reads exactly like a refused write on the comment above it. */
      alert={error ? { message: t(error) } : undefined}
      className="pl-2 border-l-2 border-line"
    >
      {editing ? (
        <Composer
          value={body}
          /* The strip goes the moment the reader touches the text again: a failure still
             showing over a box being retyped is a sentence about a write that no longer
             matches what is in front of it. */
          onChange={(next) => { setBody(next); setError(null) }}
          onSave={() => { void save() }}
          onCancel={() => { setBody(turn.body); setError(null); setEditing(false) }}
          placeholder={t('filePreview.commentReplyPlaceholder')}
          rows={2}
          autoFocus
        />
      ) : (
        <CommentBody body={turn.body} />
      )}
    </TurnCard>
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
  /**
   * Whether this card belongs to the agent sidebar's live spec rather than to a review.
   *
   * ONE flag for two changes, because they are one fact about where the card is: the spec's
   * card sits in prose, a few lines under the passage it is about, in a 720px rail that shows
   * the highlighted passage AT THE SAME TIME.
   *
   * - It draws no `Quote`. Echoing the passage inside the card is what a review needs, where
   *   forty files are stacked in a scroller and the lines a comment was about may be far off
   *   screen by the time it is read. Beside the highlight it is a second copy of a sentence
   *   the reader can already see, and in a narrow rail it is the copy that costs the room.
   * - It gets the radius back. See the `CARD` docblock above: square corners are for meeting
   *   square-edged rows of code, and prose has none to meet.
   *
   * The LABEL stays either way — it names the kind of anchor, which is the one thing the
   * highlight does not say — and so does everything the quote is read for besides drawing it:
   * `commentLabel` still discriminates on it, and the composer's prompt still asks about a
   * passage rather than about lines. Hiding the echo changes what is painted and nothing else.
   *
   * Named after the caller, like `commentable="spec"` on `FileContentRenderer` that this
   * travels down from, and false by default so a review card keeps what it had.
   */
  spec?: boolean
  /**
   * File the body, and say whether it was filed — `void` for a caller that cannot fail.
   *
   * THE UNION IS THE POINT, and it is what keeps the four store-backed callers from
   * having to learn about any of this. A comment written into this machine's own zustand
   * store is stored the instant the function returns; there is no answer to wait for and
   * nothing that could refuse it, so those callers go on passing exactly what they
   * passed. A comment on a plan goes through a table, a policy and a network, and a
   * `false` from there is the whole reason this file has an error state at all.
   *
   * `await`ed either way: awaiting `undefined` is `undefined`, so the two paths read the
   * same here and only `=== false` means anything.
   */
  onSave: (body: string) => Promise<boolean> | void
  onDelete: () => Promise<boolean> | void
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
  /**
   * Who wrote this, when, and what has been said under it — the PERSISTED variant.
   *
   * Absent for every card backed by the renderer's zustand store: those comments are this
   * machine's own notes on a review, they have never left it, and there is nobody to
   * attribute them to. Present for a comment on a plan, where the row carries an
   * `author_id` and a conversation. See `CommentThread`.
   */
  thread?: CommentThread
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
export default function CommentCard({ comment, range, quote, host, width, spec, onSave, onDelete, onClose, thread }: Props) {
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
  const panelRef = useRef<HTMLDivElement>(null)
  /**
   * The reply being written, or null while none is — the threaded variant's only state.
   *
   * Behind a Reply button rather than a box standing permanently open at the foot of every
   * thread: a plan's spec can carry a dozen of these, all mounted at once in the document's
   * own flow, and a dozen empty textareas between the paragraphs would be the page.
   */
  const [reply, setReply] = useState<string | null>(null)
  /** Whether this reader may rewrite or delete the comment itself. See `CommentTurn.canEdit`. */
  const canEdit = thread ? thread.canEdit : true

  /**
   * A WRITE ON THIS COMMENT THAT DID NOT LAND — the head's own, which is to say the
   * composer's while the comment does not exist yet.
   *
   * HELD HERE AND NOWHERE ELSE, on the same argument the edit state is held here on: this
   * component already owns whether it is being written in and what is in the box, and a
   * failure is a third fact about that same attempt. Lifting it would mean a caller
   * telling a card it had failed, which is a message that has to be routed to one card
   * out of a dozen mounted down a plan's spec.
   *
   * `null` is the ordinary state and draws nothing. Cleared on the next keystroke and on
   * the next attempt, so a strip is only ever about the body sitting under it.
   */
  const [error, setError] = useState<MessageKey | null>(null)
  /**
   * The reply being written, separately — it is a different box, with different words in
   * it, and a failure on one of them says nothing about the other. A reader whose edit was
   * refused can still be answering their own comment.
   */
  const [replyError, setReplyError] = useState<MessageKey | null>(null)

  /**
   * Hand the focus back to the panel when the box goes away.
   *
   * The other half of this used to live here too — focusing the textarea whenever there was
   * one — and it moved into `Composer`, which asks for the focus itself on mount. That is
   * the same moment: a composer is mounted exactly while `editing` is true. What is left is
   * the case a composer cannot speak for, which is its own absence: after a save or a
   * cancel the focus would otherwise be on a button that has just been unmounted, and the
   * panel's Escape and Alt+↑/↓ guards only see keystrokes that arrive inside it.
   */
  useEffect(() => {
    if (!editing) panelRef.current?.focus()
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
   *
   * AND ONLY IF IT WAS FILED. `onSave` answers now — see the prop — and a `false` leaves
   * every one of those things exactly as it was: the box open, the words in it, and a strip
   * under it saying so. Dropping out of edit mode over a refused write is what made a lost
   * comment look like a saved one, and for a NEW comment it is worse than it sounds: the
   * caller takes the card away with the only copy of what was typed.
   */
  const save = async () => {
    if (await onSave(saved) === false) {
      setError(SAVE_FAILED)
      return
    }
    setError(null)
    setEditing(false)
  }

  /**
   * Drop the comment, and say so when the drop is refused.
   *
   * Nothing on success: a deleted comment's card unmounts with the comment. A refusal is
   * what needs the strip, and needs it here rather than anywhere else — the hook refetches
   * even on a failed write, so the comment comes straight back and would otherwise read as
   * a Delete that simply did nothing.
   *
   * `=== false` and not `!ok`: a store-backed caller answers `undefined` and has not
   * refused anything.
   */
  const remove = async () => {
    if (await onDelete() === false) setError(DELETE_FAILED)
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
    // The strip goes with the typing it was about: Cancel is the reader saying they are
    // done with this attempt, and a failure left standing over a comment being read again
    // would be a sentence about text that is no longer on screen.
    setError(null)
    if (comment) {
      setBody(comment.body)
      setEditing(false)
      return
    }
    onClose?.()
  }

  /**
   * Type in the box, and the last failure stops applying.
   *
   * Reset on the KEYSTROKE rather than only on the next Save, because the strip names the
   * body under it: once that body has changed, the sentence is about a write nobody
   * attempted. A stale strip under a box somebody is retyping is worse than none.
   */
  const editBody = (next: string) => {
    setBody(next)
    setError(null)
  }

  /**
   * Answer the comment, and empty the box only once the answer is stored.
   *
   * The box used to be cleared on the way out, on the reasoning that a box still holding a
   * sent reply reads as a send that did not go through. That is exactly right and is why
   * this waits: a reply the server refused DID not go through, so the text has to stay
   * where it is — it is the only copy of it, and it is also the retry.
   */
  const sendReply = async () => {
    if (!thread || reply === null) return
    if (await thread.onReply(reply.trim())) {
      setReplyError(null)
      setReply(null)
      return
    }
    setReplyError(SAVE_FAILED)
  }

  // Escape is `InlinePanel`'s. ⌘↩ is `Composer`'s — every box in this card is one now, and
  // a second handler at the panel level is what made the composer's own stop the keystroke
  // on its way up, to keep a reply from filing the head comment's draft.

  return createPortal(
    <InlinePanel panelRef={panelRef} onEscape={dismiss} width={width} spec={spec}>
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
        {/* Drawn for a review, not for the spec — `spec` on the props carries the whole of why.
            The quote itself is still READ above it: it is what names the card and what shapes
            the composer's prompt, so this is the one of its three uses that goes. */}
        {!spec && <Quote quote={shownQuote} />}

        {/* THE AUTHORED, THREADED VARIANT. Everything above this line is identical in both:
            the icon, the label naming the anchor, and the quote when a review wants it. What
            changes below is that the note has a NAME AND A FACE on it and can be answered,
            which is the whole difference between a private annotation and a conversation.

            A separate branch rather than a pile of conditionals inside the one below, because
            the two footers have nothing in common — one ends in Delete and Edit, the other in
            a thread and a reply box — and interleaving them would leave every line of both
            guarded by the same question. */}
        {thread ? (
          <>
            {/* The design system's own comment card, bare: this one is already inside the
                plate `InlinePanel` draws, so a second one would be a box in a box. The verb
                is beside the name for the same reason a ticket's comments carry one — "ada@…
                commented" is a sentence, where a bare address over a paragraph is a header. */}
            <TurnCard
              ground="bare"
              avatar={{ src: thread.author.avatarUrl ?? null, alt: '', size: 'md' }}
              author={thread.author.name}
              verb={t('plans.comments.commented')}
              date={thread.date}
              actions={!editing && canEdit ? (
                <TurnActions
                  onEdit={() => { setError(null); setEditing(true) }}
                  onDelete={() => { void remove() }}
                />
              ) : undefined}
              /* A refused write on THIS turn, under its body — which for a comment being
                 rewritten puts the strip directly beneath the box it is about, and for a
                 refused Delete beneath the words that are still there because of it. The
                 design system's card decides the shape; this only says what happened. */
              alert={error ? { message: t(error) } : undefined}
            >
              {editing ? (
                <Composer
                  value={body}
                  onChange={editBody}
                  onSave={() => { void save() }}
                  onCancel={dismiss}
                  placeholder={t(kind === 'quote'
                    ? 'filePreview.commentQuotePlaceholder'
                    : 'filePreview.commentPlaceholder')}
                  /* The box asks for the focus itself, as every composer in this card does. */
                  autoFocus
                />
              ) : (
                <CommentBody body={comment?.body ?? ''} />
              )}
            </TurnCard>

            {thread.replies.map((turn) => (
              <ReplyTurn
                key={turn.id}
                turn={turn}
                onSave={(next) => thread.onSaveReply(turn.id, next)}
                onDelete={() => thread.onDeleteReply(turn.id)}
              />
            ))}

            {reply === null ? (
              <div className="flex items-center justify-end">
                <button type="button" onClick={() => setReply('')} className={BTN_GHOST}>
                  <Reply className="w-3.5 h-3.5" />
                  {t('filePreview.commentReply')}
                </button>
              </div>
            ) : (
              <>
                <Composer
                  value={reply}
                  onChange={(next) => { setReply(next); setReplyError(null) }}
                  /* Cleared once it is stored, and not before — see `sendReply`. */
                  onSave={() => { void sendReply() }}
                  onCancel={() => { setReply(null); setReplyError(null) }}
                  placeholder={t('filePreview.commentReplyPlaceholder')}
                  rows={2}
                  autoFocus
                />
                {/* THE ONE STRIP IN THIS FILE THAT IS NOT A CARD'S `alert`, and the reason
                    is that a reply being written has no card: it is a box at the foot of a
                    thread, under the turns that already exist. `Banner` is what the design
                    system's `CommentCard` draws an alert WITH, in the shape it draws it —
                    same variant, same layout, same outline — so the two read as one thing
                    even though only one of them has a turn to belong to. */}
                {replyError && (
                  <Banner variant="danger" layout="stacked" bordered>
                    {t(replyError)}
                  </Banner>
                )}
              </>
            )}
          </>
        ) : editing ? (
          <Composer
            value={body}
            onChange={editBody}
            onSave={() => { void save() }}
            onCancel={dismiss}
            /* Asked about the LINES or about the PASSAGE, whichever this comment is attached
               to. One placeholder for both said "these lines" over a quotation, which is the
               one thing the reader has to get right before typing. */
            placeholder={t(kind === 'quote'
              ? 'filePreview.commentQuotePlaceholder'
              : 'filePreview.commentPlaceholder')}
            autoFocus
          />
        ) : (
          <>
            <CommentBody body={comment?.body ?? ''} />
            <div className="flex items-center justify-end gap-1.5">
              <button type="button" onClick={() => { void remove() }} className={BTN_DANGER}>
                <Trash2 className="w-3.5 h-3.5" />
                {t('filePreview.commentDelete')}
              </button>
              <button type="button" onClick={() => { setError(null); setEditing(true) }} className={BTN_GHOST}>
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

        {/* The unthreaded card's failed write — the composer's, in practice, which is the
            one that matters most: a create refused with the card closed over it takes the
            typed body with it and leaves nothing on screen to say why.

            At the foot of the panel rather than on a turn, because this branch has no turn:
            there is a label, a quote and a box, and the panel itself is the card. `thread`
            guards it so the threaded branch cannot draw the same state twice — up there the
            head's own `alert` has it, beside the words it is about.

            Drawn with the `Banner` the design system's `CommentCard` draws an `alert` with,
            in the same shape, for the reply composer's reason above. */}
        {!thread && error && (
          <Banner variant="danger" layout="stacked" bordered>
            {t(error)}
          </Banner>
        )}
      </div>
    </InlinePanel>,
    host,
  )
}
