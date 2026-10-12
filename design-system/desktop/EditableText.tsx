import { useEffect, useLayoutEffect, useRef } from 'react'
import type { KeyboardEvent } from 'react'
import { PenLine } from './icons'
import { Icon, type IconSize } from './Icon'

/**
 * Text you can click into and change — the agent's title and its description are both
 * this, and so is anything else the app lets you rewrite in place.
 *
 * IT IS NOT A FORM FIELD. There is no border in either state, because these are not
 * inputs sitting in a form; they are the thing itself, read far more often than they
 * are written, and a box drawn permanently around each one turns a card into a
 * settings panel. Editing announces itself with the GROUND alone — no outline, no
 * accent rule — so clicking never swaps one object for another.
 *
 * THE GROUND APPEARS ON HOVER AND STAYS FOR THE EDIT. The same one, so the field shows
 * up under the pointer and then simply stays put when the caret arrives. `surface` and
 * not `surface-strong`: the surface tokens are translucent, so a field wearing the
 * card's own weight is not invisible against it — it composites to about half a step
 * above (0.07 over 0.07 on midnight, against the strong weight's 0.12). One notch is
 * all a hover wants for something whose job is to say "this is editable".
 *
 * NOTHING MOVES WHEN IT OPENS, and that is the hardest part of this component. Type
 * size, leading, padding and the column the pencil reserves are identical in both
 * states, so the words land on exactly the same pixels before and after the click.
 * Multi-line grows the box to its content rather than taking a fixed `rows`, because a
 * textarea at `rows={3}` is a second, shorter box dropped over a ten-line description,
 * and everything below it jumps up the card.
 *
 * IT SPELLS ITS TYPOGRAPHY RATHER THAN DRAWING A `Text`. Both states have to agree to
 * the pixel and only one of them can host a component — an `<input>` has no children.
 * So each variant is one string used twice, which is the only arrangement where the
 * two states cannot drift apart.
 */

/**
 * The two readings the app has, and they are a pair: a name, and the paragraph under it.
 *
 * Each carries the typography AND the right padding that matches it, because those two
 * are the same decision. Reading spends the right-hand column on the pencil; editing
 * has no pencil, so the input pays for it in padding instead. Get that wrong and the
 * text rewraps the moment the caret arrives.
 */
export type EditableTextVariant = 'title' | 'body'

const VARIANTS: Record<
  EditableTextVariant,
  { type: string; empty: string; pencil: IconSize; editPad: string }
> = {
  title: {
    type: 'text-sm font-semibold text-ink leading-tight',
    /**
     * SPELLED OUT and not derived from `type` — the size is all an empty field keeps.
     * Building it by subtracting a colour from the string above would be a class
     * Tailwind never sees in the source, which is rule 2 of this folder's README.
     */
    empty: 'text-sm',
    pencil: 'sm',
    /** 8px of padding, plus the 14px pencil and its 8px gap. */
    editPad: 'pr-[30px]',
  },
  body: {
    type: 'text-xs text-ink/70 leading-relaxed',
    empty: 'text-xs',
    pencil: 'xs',
    /** 8px of padding, plus the 12px pencil and its 8px gap. */
    editPad: 'pr-7',
  },
}

/**
 * THE GEOMETRY BOTH STATES SHARE — everything except the background and the right
 * padding, which are the only two things allowed to differ.
 *
 * The background is deliberately absent: two background utilities in one class string
 * are settled by Tailwind's own ordering rather than by which was written last, so each
 * state states its own and there is nothing to override.
 */
const FIELD = 'w-full text-left border-none rounded-lg pl-2 py-1.5 transition-colors'

/**
 * The pencil. ALWAYS IN THE FLOW — it is what reserves the column the text wraps
 * against — but only painted under the pointer, so a card at rest is the agent's own
 * words and nothing else. Hiding it with `hidden` would hand the text 20px back on
 * every hover and rewrap it under the cursor.
 */
const PENCIL = 'opacity-0 transition-opacity group-hover/field:opacity-100'

export interface EditableTextProps {
  /** What is saved. Empty draws `placeholder` in its place, in italic. */
  value: string
  /** What to show when there is nothing — "Add a title". Translated. */
  placeholder: string
  /** The ghost inside the field while editing. Translated. */
  editPlaceholder?: string
  /**
   * Whether the field is open. THE CALLER'S, and not a piece of state this holds: a
   * field can be open while the agent behind it is switched, and only the caller knows
   * that happened.
   */
  editing: boolean
  /** The working copy. Separate from `value` so Escape has something to throw away. */
  draft: string
  onDraftChange: (value: string) => void
  onStartEditing: () => void
  /** Enter, and blur. Blur saving is what makes losing a Save button safe. */
  onSave: () => void
  /** Escape. */
  onCancel: () => void
  variant?: EditableTextVariant
  /**
   * Shift+Enter puts in a newline instead of saving, and the box grows to its content.
   * Enter still saves — a description in a card is a line or two, not a document, and
   * Enter is what the title above it has always done.
   */
  multiline?: boolean
  /** A quiet line under the open field: the keyboard rule, in words. Translated. */
  hint?: string
  /**
   * What the reading state IS. A `div` by default; `h2` where the text is the card's
   * heading. A heading LEVEL is the page's business and not this component's, which is
   * why it is a prop and not a consequence of the variant.
   */
  as?: 'div' | 'h2' | 'h3'
  className?: string
}

export function EditableText({
  value,
  placeholder,
  editPlaceholder,
  editing,
  draft,
  onDraftChange,
  onStartEditing,
  onSave,
  onCancel,
  variant = 'body',
  multiline = false,
  hint,
  as: Tag = 'div',
  className = '',
}: EditableTextProps) {
  const spec = VARIANTS[variant]
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null)

  /**
   * THE FOCUS IS THIS COMPONENT'S, which is the one behaviour it took OFF its callers.
   * The app held a ref per field and a `setTimeout(focus, 0)` per field, because on the
   * frame the click lands the input does not exist yet. A layout effect runs after the
   * DOM is written and before the frame is painted, which is the same fix without the
   * timer and without the ref travelling through two components to get here.
   */
  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  /**
   * Grown to its content, measured after the DOM is written and before the frame is
   * painted, so the box is never seen at the wrong height. Reset to `auto` first, or
   * `scrollHeight` only ever reports the height the box already has.
   */
  useLayoutEffect(() => {
    if (!multiline || !editing) return
    const el = inputRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [multiline, editing, draft])

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (event.key === 'Escape') return onCancel()
    if (event.key !== 'Enter') return
    if (multiline && event.shiftKey) return
    // Or the newline lands in the value a moment before it is saved.
    event.preventDefault()
    onSave()
  }

  const editClass = `${FIELD} ${spec.editPad} ${spec.type} bg-surface focus:outline-none ${className}`

  if (editing) {
    // Written out twice rather than shared through one spread object: an `<input>` and
    // a `<textarea>` take different change events, and a shape loose enough for both
    // is a shape that type-checks nothing.
    if (multiline) {
      return (
        <div className="space-y-1.5">
          <textarea
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            value={draft}
            onChange={(e) => onDraftChange(e.target.value)}
            onKeyDown={onKeyDown}
            onBlur={onSave}
            placeholder={editPlaceholder}
            // One row is only the starting point; the effect above sets the real
            // height. `overflow-hidden` because a box always exactly as tall as its
            // text has nothing to scroll, and the scrollbar gutter would shift the
            // words.
            rows={1}
            className={`${editClass} resize-none overflow-hidden`}
          />
          {hint && <span className="block text-[10px] text-text-secondary/40">{hint}</span>}
        </div>
      )
    }

    return (
      <input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        type="text"
        value={draft}
        onChange={(e) => onDraftChange(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={onSave}
        placeholder={editPlaceholder}
        className={editClass}
      />
    )
  }

  return (
    /**
     * `role="button"` ON A DIV, and not a `<button>`, for the reason `PlanRow` gives:
     * a real button may only contain phrasing content, and the reading state holds an
     * `h2` or a block of pre-wrapped text. The cost is that the keyboard half is ours
     * to write — which is a gain here rather than a cost, because these fields were
     * mouse-only before and could not be opened from the keyboard at all.
     */
    <Tag
      role="button"
      tabIndex={0}
      onClick={onStartEditing}
      onKeyDown={(event: KeyboardEvent<HTMLElement>) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onStartEditing()
        }
      }}
      className={`${FIELD} group/field pr-2 hover:bg-surface cursor-pointer flex items-start gap-2 ${className}`}
    >
      {value ? (
        <span className={`flex-1 break-words ${multiline ? 'whitespace-pre-wrap' : ''} ${spec.type}`}>
          {value}
        </span>
      ) : (
        // ITALIC AND QUIET, so an empty field reads as an invitation rather than as a
        // value someone typed.
        <span className={`flex-1 italic text-text-secondary/40 ${spec.empty}`}>
          {placeholder}
        </span>
      )}
      <Icon
        glyph={PenLine}
        size={spec.pencil}
        tone="muted"
        className={`flex-shrink-0 mt-0.5 ${PENCIL}`}
      />
    </Tag>
  )
}
