import type { ReactNode } from 'react'

/**
 * THE BUBBLE A LINE'S DISCUSSION OPENS IN: a plate floating over the document, hung under
 * the pointer that asked for it.
 *
 * ── WHY A BUBBLE AND NOT A MARGIN ─────────────────────────────────────────────────────
 *
 * The margin kept every note on screen at once, and it paid for that with a column the
 * document had to give up the moment anybody wrote a word: the prose re-wrapped narrower,
 * the page slid under the reader, and a spec with two comments on it read like a spec
 * squeezed against a wall. The document now keeps its full width whatever is said about it.
 * Where the discussions are is still said, by the orange lines and the counted marks at the
 * end of them; what is said is one press away, and appears where that press was.
 *
 * ── UNDER THE POINTER, AND IT SCROLLS WITH THE DOCUMENT ───────────────────────────────
 *
 * `top` and `left` arrive measured against the document's own box, not the window's, so the
 * bubble is part of what scrolls rather than something that has to follow it. Measuring is
 * the caller's: it is the one that knows where the pointer was and how wide the page is.
 *
 * `above` is the one decision this keeps: a bubble opened near the bottom of the window
 * grows upwards from the pointer instead of downwards off the screen. Spelled as a
 * translate rather than asked for as a height, because the height is the thread's and it
 * changes as the thread is answered.
 *
 * ── WHAT CLOSES IT ────────────────────────────────────────────────────────────────────
 *
 * Not this component. A press outside it, Escape, and a comment filed all close it, and
 * each of those is a decision about the comment rather than about the plate — see the
 * caller. What this owns is `data-comment-bubble`, which is what "outside" is tested
 * against.
 */

/** How wide the bubble is, in pixels — what the caller clamps `left` against. */
export const COMMENT_BUBBLE_PX = 320

/** The air between the pointer and the bubble, in pixels. */
export const COMMENT_BUBBLE_OFFSET_PX = 8

export interface CommentBubbleProps {
  /** Where the pointer was, in pixels from the top of the document's box. */
  top: number
  /** Where the bubble's left edge goes, in pixels from the left of the document's box. */
  left: number
  /** Grow upwards from `top` rather than downwards — for a press near the window's foot. */
  above?: boolean
  /**
   * The discussion, or the box to start one. NODES, for `CommentCard`'s reason: a comment
   * is a stateful thing the app owns — written in, edited, answered, refused — and this
   * owns only where it sits and what it sits on.
   */
  children: ReactNode
}

export function CommentBubble({ top, left, above = false, children }: CommentBubbleProps) {
  return (
    <div
      data-comment-bubble=""
      aria-live="polite"
      style={{
        top: above ? top - COMMENT_BUBBLE_OFFSET_PX : top + COMMENT_BUBBLE_OFFSET_PX,
        left,
        width: COMMENT_BUBBLE_PX,
        transform: above ? 'translateY(-100%)' : undefined,
      }}
      className="absolute z-20 max-h-[60vh] overflow-y-auto rounded-xl bg-bg-tertiary p-3 shadow-xl"
    >
      {children}
    </div>
  )
}

/**
 * Whether anything on screen is holding comment text that has not been filed.
 *
 * Asked of the DOM rather than of React, which is what makes it total: every box in a
 * bubble is a `<textarea>` or an `<input>` whatever component drew it, so a card, a reply
 * under it and whatever is put in the bubble next are all covered without any of them being
 * told about this rule.
 *
 * It lives here because the bubble is what the rule protects: opening another line, or
 * pressing past the bubble, would take it away — and a bubble holding three words must not
 * be taken away. The caller that opens and closes it and this file must not be able to
 * disagree about what a draft is, so there is one of these and it is exported.
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
