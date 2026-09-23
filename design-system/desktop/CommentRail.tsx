import type { ReactNode } from 'react'

/**
 * THE MARGIN A DOCUMENT IS ANNOTATED IN: a column beside the text, where each note sits
 * level with the line it is about.
 *
 * ── WHY A COLUMN AND NOT A PANEL ──────────────────────────────────────────────────────
 *
 * The three shapes this has had say it better than an argument would. A card spliced into
 * the prose parted the document to make room for itself, so a spec grew by the length of its
 * own conversation. A bubble floating over the text solved that and traded it for a panel
 * that covered the sentences either side of the one it was about, and that had to be opened
 * and closed one comment at a time. The margin has neither problem: the document keeps its
 * length and its layout, every note is visible at once, and each one is beside its own line,
 * which is what a reader is actually asking when they wonder what was said about a passage.
 *
 * It is the oldest answer there is. It is what a margin has been for since before paper.
 *
 * ── IT SCROLLS WITH THE DOCUMENT, BY DOING NOTHING ────────────────────────────────────
 *
 * The rail is positioned inside the document's own box, so it is part of what scrolls rather
 * than something that has to follow. There is no listener here and no transform: a note at
 * 900px down the document is at 900px down the document.
 *
 * ── WHAT IT DOES NOT DECIDE ───────────────────────────────────────────────────────────
 *
 * Where each note goes. `top` arrives measured, and the measuring belongs to whoever knows
 * where the lines are — that is a DOM read against the rendered document, which this folder
 * has no business doing. What it owns is the column: its width, the space it holds open, the
 * plate under a note, and what a note looks like while its line is the one being talked
 * about.
 */

/**
 * How wide the column is, in pixels — the whole of what the document reserves beside
 * itself, the air included.
 *
 * ONE NUMBER FOR THE CALLER, which is why the gap between the text and the notes is inside
 * this rather than beside it: a caller that had to reserve a width AND remember to add a
 * margin would eventually reserve one and forget the other, and the notes would sit against
 * the marks at the end of the lines.
 *
 * THE AIR IS A MARGIN ON THE NOTES AND NOT A PADDING ON THE COLUMN, which is not a
 * preference — a padding does not move an absolutely positioned child at all. `left: 0`
 * resolves against the containing block's PADDING BOX, so the notes sat flush against the
 * text with the padding declared and ignored. A margin on the note narrows it inside its own
 * `inset-x-0`, which is the one form that works.
 */
export const COMMENT_RAIL_PX = 324

/**
 * The smallest gap between two notes, in pixels.
 *
 * Exported because the caller is what enforces it: two comments on consecutive lines want
 * the same `top`, and only something that has measured both cards can push the second one
 * down. The number belongs here, with the column it is a rhythm of.
 */
export const COMMENT_RAIL_GAP_PX = 12

export interface CommentRailProps {
  /**
   * Whether there is a margin at all.
   *
   * It is not a fold — there is no control for that, and there was one for exactly one
   * revision. A margin with notes in it is what a plan under review looks like, and a button
   * to hide them was a button to hide the thing the reader came for. What this answers is
   * narrower: a document nobody has written on yet has no margin, and gets its full width.
   */
  open: boolean
  /**
   * The notes. NODES, for `CommentCard`'s reason one folder over: a comment is a stateful
   * thing the app owns — it is being written in, edited, answered, refused — and this owns
   * where it sits and what it sits on.
   */
  children: ReactNode
  className?: string
}

export function CommentRail({ open, children, className = '' }: CommentRailProps) {
  if (!open) return null
  return (
    /* `absolute inset-y-0 right-0`: the column spans the whole height of the document's box,
       so a note measured at 900px has 900px of column to be placed in. `pointer-events-none`
       on the column and `auto` on each note, so the empty stretches between notes do not
       swallow a click meant for the document — a margin is mostly empty, and all of it would
       otherwise be a wall. */
    <div
      aria-live="polite"
      style={{ width: COMMENT_RAIL_PX }}
      className={`pointer-events-none absolute inset-y-0 right-0 ${className}`.trim()}
    >
      {children}
    </div>
  )
}

/**
 * What a note is doing, which is the whole of what it looks like. See `state`.
 */
export type CommentNoteState = 'rest' | 'pointed' | 'singled' | 'faded'

/**
 * Four rungs of ONE ladder — how far off the page the note is.
 *
 * `z-10` on the singled one and nowhere else: it is the only note allowed to overlap its
 * neighbours, because it has left the stack to go and stand beside its own line. Without it
 * the note it lands on would be drawn over it, in document order, which is the one order
 * that means nothing here.
 *
 * ── THE BLUR, AND WHY IT IS NOT THE ONE THIS APP FORBIDS ──────────────────────────────
 *
 * `index.html` says it plainly: no `backdrop-filter` anywhere in this app, because a blur of
 * what lies BEHIND an element covers the whole window and is recomputed on every repaint —
 * that is what made fast scrolling stutter, and the frosted look comes from the native macOS
 * vibrancy instead.
 *
 * This is the other filter. `blur-[2px]` blurs the element's OWN pixels: a 300px plate, two
 * or three of them, and only while a reader is holding one note forward. Nothing behind it
 * is sampled and nothing outside it is touched. Two pixels rather than four, because these
 * notes are meant to stay legible — out of focus, not out of reach: pressing one is still
 * how a reader moves to it.
 */
const NOTE_STATE: Record<CommentNoteState, string> = {
  rest: 'shadow-md',
  pointed: 'shadow-xl',
  singled: 'z-10 shadow-xl',
  faded: 'opacity-40 blur-[2px] shadow-md',
}

export interface CommentRailNoteProps {
  /**
   * A name for this note, written onto it as `data-comment-note`.
   *
   * IT IS A DOM HANDLE, for `CommentableLine`'s `lineId` reason: two notes wanted at the
   * same height have to be pushed apart, and only something that has MEASURED both of them
   * can do it. The measuring is a DOM read the caller makes, and this is what it reads.
   */
  noteId: string
  /** Where the top of this note goes, in pixels from the top of the document's box. */
  top: number
  /**
   * Which of the four things this note currently is — see `CommentNoteState`.
   *
   * ONE PROP AND NOT THREE BOOLEANS, because they are one fact: a column of plates floating
   * over a document has exactly one language for "which of these am I looking at", and it is
   * how far off the page each one sits.
   */
  state?: CommentNoteState
  /**
   * The pointer arriving on this note and leaving it — which is what lights its LINE, in
   * the document, a column away. A note and the sentence it is about are one thing in two
   * places, and the only way to see that is for one to answer for the other.
   */
  onHover?: (over: boolean) => void
  /**
   * Singling this note out: it comes forward, drops to the exact height of its own line, and
   * the others dim behind it — see the caller, which owns what that means.
   *
   * NOT FIRED BY A CLICK ON SOMETHING THAT ALREADY DOES SOMETHING. A note is full of
   * controls and text: Reply, Edit, Delete, a box being typed in, a passage being selected
   * to copy. Every one of those is a click inside the note, and treating them as a request
   * to rearrange the margin would make the note impossible to use. So the target is tested,
   * once, here — rather than in each caller, which is where it would be forgotten.
   */
  onSelect?: () => void
  children: ReactNode
}

export function CommentRailNote({
  noteId,
  top,
  state = 'rest',
  onHover,
  onSelect,
  children,
}: CommentRailNoteProps) {
  return (
    /* `transition-[top]` so a note that has to move — because the one above it grew a reply,
       or the document re-wrapped — travels instead of jumping. `duration-150` is the app's
       step for something the reader did rather than something happening to them.

       NO OUTLINE ON THE NOTE BEING WRITTEN IN, and it had one for a revision. A ring around
       the composer said "this one" about the only note on screen that already had a cursor
       in it, beside a line already lit and already coloured — three ways of saying the same
       thing, one of which drew a box round a plate that is otherwise edgeless. */
    <div
      data-comment-note={noteId}
      style={{ top }}
      onMouseEnter={onHover ? () => onHover(true) : undefined}
      onMouseLeave={onHover ? () => onHover(false) : undefined}
      onClick={onSelect
        ? (e) => {
            // See `onSelect`: a press on anything that is already a control is that
            // control's, and a drag that selected text is a reader copying, not choosing.
            if (e.target instanceof Element && e.target.closest('button, textarea, input, a')) return
            if (!window.getSelection()?.isCollapsed) return
            onSelect()
          }
        : undefined}
      /* `cursor-pointer` ONLY WHERE THERE IS SOMETHING TO PRESS, which is why it rides on
         `onSelect` rather than being spelled unconditionally: a note in a rail that cannot
         be singled out is a plate with words on it, and a hand over it would promise
         something that does not happen. The boxes and buttons inside keep their own
         cursors — a caret over a textarea, a hand over a button — because `cursor` is
         inherited and both of those set theirs. */
      className={`pointer-events-auto absolute inset-x-0 ml-6 rounded-xl bg-bg-tertiary p-3
        transition-[top,box-shadow,opacity,filter] duration-150 ease-out
        ${onSelect ? 'cursor-pointer' : ''}
        ${NOTE_STATE[state]}`}
    >
      {children}
    </div>
  )
}

/**
 * Whether anything on screen is holding comment text that has not been filed.
 *
 * Asked of the DOM rather than of React, which is what makes it total: every box in a note
 * is a `<textarea>` or an `<input>` whatever component drew it, so a card, a reply under it
 * and whatever is put in the rail next are all covered without any of them being told about
 * this rule.
 *
 * It lives here because the rail is what the rule protects: opening another line's thread
 * replaces the composer, and a composer holding three words must not be replaced. The caller
 * that opens threads and this file must not be able to disagree about what a draft is, so
 * there is one of these and it is exported.
 *
 * TRIMMED, so a box holding a stray newline is not a draft: a reader would be refused for
 * whitespace they never typed.
 */
export function holdsCommentDraft(root: ParentNode = document): boolean {
  const boxes = root.querySelectorAll(
    '[data-comment-composer] textarea, [data-comment-composer] input[type="text"]',
  )
  return [...boxes].some((box) => (box as HTMLTextAreaElement).value.trim() !== '')
}
