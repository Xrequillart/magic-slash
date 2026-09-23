import type { ElementType, ReactNode } from 'react'
import { ButtonIcon } from './ButtonIcon'
import { Label } from './Label'
import { MessageSquare, MessageSquarePlus } from './icons'

/**
 * ONE LINE OF A DOCUMENT THAT CAN BE COMMENTED ON: the mark at the end of it, and the
 * ground it takes while its thread is open.
 *
 * WHAT A "LINE" IS here is the caller's business and not this file's. It renders whatever
 * tag it is given — a paragraph, a heading, a list item — which is what lets a rendered
 * markdown document hand it every block it wants annotated without this component knowing
 * that markdown exists. What it owns is the mark in the column, and whether the line is the
 * one being talked about.
 *
 * ── THE COLUMN IS RESERVED BY THE DOCUMENT, NOT BY THE LINE ───────────────────────────
 *
 * The mark is `absolute right-0` with NO `top`, and both halves of that are load-bearing.
 *
 * Without a `top` it keeps its STATIC POSITION — where it would have been in the flow —
 * which is the first line box of the block it opens. So it rides the block down the page
 * with no measuring, no observer and no re-placement on reflow: a wrapped paragraph, a
 * window resized, a font that landed late, all move the text and the mark together because
 * the mark is still, positionally, part of the text.
 *
 * `right-0` then resolves against the nearest POSITIONED ancestor, which is deliberately not
 * this element: the line is left static so the mark escapes it and lands on the right edge
 * of the document's own box. The document reserves that strip with a padding, and the marks
 * line up there whatever each block's own indent is. A `relative` here would pin every mark
 * to its own block instead, and the mark of an indented list item would stop short of the
 * others.
 *
 * AT THE END OF THE LINE AND NOT IN FRONT OF IT. A mark to the left of the first word sits
 * between the reader and the text, in the path of every line they read; at the end of the
 * line it is in the margin the eye leaves behind. It is also where the counts of a document
 * can be scanned in one column without reading a word of it.
 *
 * ── ONE GROUND, AND IT MEANS ONE THING ────────────────────────────────────────────────
 *
 * `bg-surface-strong` on the line whose thread is open, and nothing at any other time.
 *
 * There was a second ground under the cursor, and it went with the gesture it belonged to:
 * the whole line used to be the target, so it had to say so on the way past. THE TARGET IS
 * THE MARK NOW — a button, in the column, pressed on purpose — and a document that lit up
 * line by line under a pointer that could no longer do anything with them was an invitation
 * to a click that did nothing. What is left says exactly one thing: this is the line the
 * open bubble is about.
 *
 * ── ONE OF THEM IS A CONTROL AND THE OTHER IS A FACT ──────────────────────────────────
 *
 * An empty line OFFERS something: a button, plus-signed, that opens a box to write in. A
 * line that already carries a discussion has nothing to offer — the discussion is on screen,
 * in the margin, beside it — so its mark is a chip and not a button. It counts, and it is
 * read, and pressing it would be pressing a label.
 *
 * That corrects a shape this had for a revision, where both states were buttons of the same
 * width: the count OPENED something, back when the notes lived in a bubble that had to be
 * opened one at a time. Once every note is visible at once, a control to reveal what is
 * already revealed is a control that does nothing.
 *
 * THE COUNT INCLUDES THE REPLIES, which is the app's arithmetic and not this file's — the
 * number arrives counted. "3" beside a line means three things were said about it, not three
 * conversations: one line is one discussion, and what a reader wants to know before looking
 * is how much there is to read.
 *
 * ── WHEN THE MARK IS THERE ────────────────────────────────────────────────────────────
 *
 * A line that HAS been written about wears its mark permanently, in the annotation orange:
 * that is the whole of how an annotated document says where its notes are, and hiding it
 * until somebody happened to pass would hide the comments themselves.
 *
 * Every other line grows one under the pointer and loses it again. A column of three
 * hundred offers to comment is not a gutter, it is noise with a rule down the middle.
 *
 * ── AND WHY THAT REVEAL IS CSS AND NOT STATE ──────────────────────────────────────────
 *
 * `REVEAL` below is one selector, and it does what a `hovered` prop used to do with a
 * listener on the document, a piece of state and a re-render of every line in the spec
 * each time the pointer crossed a block boundary.
 *
 * It is not a plain `:hover` because these NEST — a list item inside a list item, a
 * paragraph inside a list item — and `:hover` matches every ancestor of the pointer, so
 * three marks would appear in the column for one cursor. `:not(:has([data-comment-line]:hover))`
 * is what narrows it to the INNERMOST line, which is the one the reader means. Chromium
 * 120 (Electron 28) has `:has()`; it landed in 105.
 *
 * ── AND WHY IT IS `opacity-0` AND NOT `invisible` ─────────────────────────────────────
 *
 * Because a hidden element cannot be hovered, and this one has to be.
 *
 * The mark sits in the margin the document reserves, which is OUTSIDE the line's own box.
 * So the pointer travelling from the words to the mark crosses ground that belongs to
 * neither, the line stops being hovered there, and with `visibility: hidden` the mark became
 * unhittable at exactly the moment it was being reached for. It was visible the whole time
 * you were reading and gone the instant you went for it. `opacity: 0` leaves the box in the
 * hit test, so the pointer arriving in the margin hovers the mark, the mark's own ancestor
 * is the line, and the rule lights it back up.
 *
 * `tabIndex={-1}` is what that costs, and it buys back the reason `invisible` was there:
 * an `opacity: 0` button is still focusable, and three hundred offers to comment would be
 * three hundred tab stops — each announcing itself — in front of a reader trying to reach
 * the next real control. The marks that CARRY a comment stay on the keyboard's path,
 * because a comment is content; the empty ones are a pointer affordance, and the keyboard's
 * way to the same bubble is to select the passage.
 */

/**
 * Show this line's mark while the pointer is on THIS line and on no line inside it.
 *
 * Spelled once, as a constant, because it is unreadable enough that a second copy would
 * never be recognised as the same rule.
 */
const REVEAL = '[&:hover:not(:has([data-comment-line]:hover))_[data-comment-overlay]]:opacity-100'

/**
 * The strip the marks live in, in pixels — the padding the DOCUMENT has to carry for them
 * to have somewhere to be, and the width of the mark's own box.
 *
 * Exported because the two are one measurement: a document that reserves less than this
 * draws its prose over the marks, and one that reserves more leaves a gutter with nothing
 * in it. Spelled once here, read by whoever lays the document out.
 *
 * 56px, and the number is measured rather than chosen: the mark of a line carrying one
 * comment is 44px wide and of one carrying twelve is 51 — a glyph, a gap and a digit or two
 * inside a button's own padding. 56 holds the widest of those with a little air.
 *
 * It is also the width of the mark's own box, so the box meets the line's right edge with
 * nothing in between — and the pointer still crosses the mark's own empty half on its way
 * in, which is what `opacity-0` on it is for rather than `invisible`. See the component's
 * docblock.
 */
export const COMMENT_GUTTER_PX = 56

export interface CommentableLineProps {
  /**
   * The element to draw — `'p'`, `'li'`, `'h2'`, whatever the document says this block is.
   *
   * It matters that this is the REAL tag and not a wrapper around it: the document's own
   * typography is a sheet of descendant selectors (`[&_li]:mb-1.5`, `[&_h2]:border-b`), and
   * a `<div>` standing in for a list item loses its marker, its margins and its rules all at
   * once.
   */
  as: ElementType
  /**
   * A name for this line, written onto it as `data-comment-line`.
   *
   * IT IS A DOM HANDLE AND THAT IS THE POINT. A comment is anchored to the TEXT it was left
   * on, not to a React element, so matching a stored comment to the line it currently sits
   * on happens in the DOM: the document is searched for the passage, and the line the match
   * landed in is found by walking up to the nearest node carrying this attribute. React has
   * no way to pass that answer back up, which is why the attribute exists rather than a ref.
   */
  lineId?: string
  /**
   * How many comments are already on this line. Zero is the offer that appears under the
   * pointer; anything else is a mark that stands there permanently, with the number beside
   * it.
   *
   * THE NUMBER IS DRAWN FROM ONE, not from two. A mark on its own says a line has been
   * written about; it cannot say whether that is one note or a conversation, and which of
   * the two it is changes whether a reader opens it now or later. `label` says it in words
   * as well, for the pointer and for anything reading the page.
   */
  count?: number
  /** Whether this line's thread is the one currently open. */
  active?: boolean

  /**
   * What the mark says to a pointer and to a screen reader, ALREADY TRANSLATED and already
   * counted: "Comment on this line", "2 comments". A component in this folder cannot know
   * which language it is rendering in, and the plural rule belongs to the app's catalogue.
   */
  label: string
  /**
   * Start the first comment on this line.
   *
   * ONLY EVER THE FIRST. A line that already carries a discussion draws a chip rather than a
   * button — see the docblock — so this is not reached for one: a second note on a sentence
   * somebody has already written about is an answer to them, and Reply is where that is
   * offered.
   *
   * THE ONLY WAY IN from this component. The line itself is inert — no click handler, no
   * cursor change — because prose is for reading and selecting, and a paragraph that
   * swallowed a click would take the double-click that selects a word with it.
   */
  onOpen: () => void
  children?: ReactNode
  /** Passed straight through, so the document's own classes on this block survive. */
  className?: string
}

export function CommentableLine({
  as: Tag,
  lineId,
  count = 0,
  active = false,
  label,
  onOpen,
  children,
  className = '',
}: CommentableLineProps) {
  const commented = count > 0

  return (
    <Tag
      data-comment-line={lineId}
      /* NO RADIUS on the ground. A rounded band reads as a chip laid over the prose; a
         square one reads as the line itself being lit, which is what it is. */
      /* THE WHOLE LINE TAKES THE ANNOTATION COLOUR the moment it carries a discussion.
         `[&&]` is the class written twice, which is how a utility outweighs the document's
         own typography: those rules are descendant selectors (`.prose p { color: … }`) and a
         single class on the element loses to them. Two classes win on specificity, without
         `!important` winning against things it has no business winning against. */
      className={`transition-colors ${REVEAL} ${commented ? '[&&]:text-orange' : ''}
        ${active ? 'bg-surface-strong' : ''} ${className}`.trim()}
    >
      {/* `data-comment-overlay` does two jobs and both are load-bearing. It is what `REVEAL`
          targets, and it is what the document's own text walk REJECTS — the walk that
          captures a quoted passage and the one that searches for it again both skip this
          subtree, so nothing the mark ever draws can land in the middle of a stored
          quotation and shift every offset after it.

          THE POSITIONING IS THE WRAPPER'S, not the mark's: `ButtonIcon` and `Label` both
          own their size, their ground and their hover, and neither takes an `absolute`. A
          span around them is where one belongs — and having one means the two states of the
          mark are placed by the same box rather than by two sets of classes that could
          drift apart. */}
      <span
        data-comment-overlay
        /* THE WIDTH IS THE MARGIN'S, and it is load-bearing rather than tidy: this box has
           to meet the end of the line, or the pointer on its way out to the mark crosses
           ground that belongs to neither. See `COMMENT_GUTTER_PX`.

           `justify-end` so the pill hugs the outer edge and the slack is on the INSIDE —
           which is the side the pointer arrives from, and therefore the side the bridge is
           wanted on. */
        style={{ width: COMMENT_GUTTER_PX }}
        className={`absolute right-0 mt-0.5 flex select-none items-center justify-end gap-0.5
          ${commented || active ? '' : 'opacity-0'}`}
      >
        {/* ONE CONTROL IN TWO STATES, and the same box in both.
            The count is the LABEL rather than a digit beside the button — the glyph and the
            number are one target, which is what they mean. `tint` with the app's orange is
            the mechanism `Button` already has for a control in a colour of its own, rather
            than a tone added to its table for one caller.

            `min-w-11` is the empty state matching the full one: 44px is what a mark with a
            one-digit count measures, so the offer that appears under the pointer is the same
            size as the thing it becomes, and the column does not twitch as the cursor runs
            down it. A `min` and not a fixed width, because a three-figure discussion is
            still allowed to be wider than its own offer.

            `tabIndex={-1}` on the empty state alone: a spec has a few hundred lines, and an
            offer nobody has taken up is for the pointer — see the docblock. The ones
            carrying a discussion stay on the keyboard's path, because a comment is content. */}
        {commented ? (
          /* A CHIP AND NOT A BUTTON: the discussion is already on screen beside it. */
          <Label icon={MessageSquare} color="rgb(var(--c-orange))" title={label}>
            {String(count)}
          </Label>
        ) : (
          /* Plus-signed: the same glyph the composer wears, saying the same thing — a
             comment about to exist rather than one to read. `md` is 28px, a target sized for
             the pointer rather than for a row of controls: it stands alone in a margin and
             it is the only way into a comment on a line. */
          <ButtonIcon
            icon={MessageSquarePlus}
            title={label}
            onClick={onOpen}
            tone="ghost"
            size="md"
            /* See the docblock: an offer nobody has taken up yet is for the pointer. */
            tabIndex={-1}
          />
        )}
      </span>
      {children}
    </Tag>
  )
}
