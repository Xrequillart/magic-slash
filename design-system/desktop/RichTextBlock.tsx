import {
  useLayoutEffect, useRef, type ClipboardEvent, type DragEvent, type KeyboardEvent, type ReactNode,
} from 'react'

/**
 * A BLOCK OF A DOCUMENT, WRITTEN IN WHERE IT IS READ — formatting and all. The Notion
 * gesture: a click on a paragraph puts a caret in it, bold stays bold, a link stays a link,
 * and nothing on the page moves by a pixel.
 *
 * ── IT IS THE TEXT, NOT A FIELD OVER IT ───────────────────────────────────────────────
 *
 * An inline `<span>` around the block's own rendered children, made `contentEditable` while
 * the block is being written in. There is no second copy of the words and no box with a look
 * of its own: the caret lands in the very `<strong>` the reader was looking at, which is why
 * the text cannot move — nothing replaced it. The span is there when the block is only read
 * too, and draws nothing: an inline box around inline content has no geometry of its own.
 *
 * ── THE DOM IS THE READER'S WHILE THEY WRITE ──────────────────────────────────────────
 *
 * Typing mutates the nodes React rendered, so React must not touch them again: the caller
 * keeps `children` referentially stable for as long as `editing` holds, and REMOUNTS the
 * block — a new `key` — once it ends, so the next render starts from fresh markup rather
 * than reconciling against nodes the reader has rewritten. What was typed goes out through
 * `onInput`, as the host element, for the caller to read back into its own format.
 *
 * ── THE KEYS A DOCUMENT NEEDS ─────────────────────────────────────────────────────────
 *
 * Escape leaves the block (and is stopped here, so the page around it does not also act on
 * it — a caller whose own Escape listener runs in the capture phase must stand aside for
 * `[data-inline-editor]`). Enter is the caller's, to split the block; Shift+Enter is a line
 * break inside it; in a code block Enter is just a new line. Backspace at the very start is
 * the caller's, to fold the block into the one above. A paste is taken as plain text: a
 * paragraph copied out of a web page would otherwise arrive with its fonts and its spans.
 */
export interface RichTextBlockProps {
  editing: boolean
  children?: ReactNode
  /**
   * Where the caret goes when `editing` turns on: under a point (the click that started
   * it), at a character offset into the block's text, or `keep` for a selection the caller
   * has already made and will restore. Read once, at that moment.
   */
  caret?: { x: number; y: number } | { offset: number } | 'keep'
  /** A code block: Enter is a newline, never a split. */
  code?: boolean
  /** What the block is, for a screen reader, while it is being written in. */
  label: string
  /**
   * The block's content changed. `input` is what the browser says changed it — `insertText`
   * and the character typed, for a caller that reacts to what is typed (markdown shortcuts).
   */
  onInput?: (host: HTMLElement, input: { inputType: string; data: string | null }) => void
  onDone?: () => void
  onEnter?: (host: HTMLElement) => void
  onBackspaceAtStart?: (host: HTMLElement) => void
  /** Written onto the host, so a caller can find a block's neighbours in the document. */
  lineKey?: string
}

/** How many characters of `host`'s text lie before the caret. */
export function caretOffsetIn(host: HTMLElement): number | null {
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0) return null
  const range = selection.getRangeAt(0)
  if (!host.contains(range.startContainer)) return null
  const before = document.createRange()
  before.selectNodeContents(host)
  before.setEnd(range.startContainer, range.startOffset)
  return before.toString().length
}

/** Put the caret `offset` characters into `host`'s text — the end when it is past it. */
export function placeCaretAt(host: HTMLElement, offset: number) {
  const walker = document.createTreeWalker(host, NodeFilter.SHOW_TEXT)
  let left = offset
  let node = walker.nextNode() as Text | null
  let last: Text | null = null
  while (node) {
    if (left <= node.data.length) break
    left -= node.data.length
    last = node
    node = walker.nextNode() as Text | null
  }
  const range = document.createRange()
  if (node) range.setStart(node, left)
  else if (last) range.setStart(last, last.data.length)
  else range.setStart(host, 0)
  range.collapse(true)
  const selection = window.getSelection()
  selection?.removeAllRanges()
  selection?.addRange(range)
}

export function RichTextBlock({
  editing,
  children,
  caret,
  code = false,
  label,
  onInput,
  onDone,
  onEnter,
  onBackspaceAtStart,
  lineKey,
}: RichTextBlockProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const caretRef = useRef(caret)
  caretRef.current = caret

  useLayoutEffect(() => {
    const host = ref.current
    if (!editing || !host) return
    const at = caretRef.current
    // `keep`: the caller holds a selection it is about to restore, and focusing would move it.
    if (at === 'keep') return
    host.focus({ preventScroll: true })
    if (at && 'x' in at) {
      const point = document.caretRangeFromPoint?.(at.x, at.y)
      if (point && host.contains(point.startContainer)) {
        const selection = window.getSelection()
        selection?.removeAllRanges()
        selection?.addRange(point)
        return
      }
    }
    placeCaretAt(host, at && 'offset' in at ? at.offset : Number.MAX_SAFE_INTEGER)
  }, [editing])

  const onKeyDown = (e: KeyboardEvent<HTMLSpanElement>) => {
    const host = e.currentTarget
    if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      host.blur()
      return
    }
    if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
      e.preventDefault()
      if (code) document.execCommand('insertText', false, '\n')
      else if (e.shiftKey || !onEnter) document.execCommand('insertLineBreak')
      else onEnter(host)
      return
    }
    if (e.key === 'Backspace' && onBackspaceAtStart && window.getSelection()?.isCollapsed && caretOffsetIn(host) === 0) {
      e.preventDefault()
      onBackspaceAtStart(host)
    }
  }

  const onPaste = (e: ClipboardEvent<HTMLSpanElement>) => {
    e.preventDefault()
    document.execCommand('insertText', false, e.clipboardData.getData('text/plain'))
  }

  return (
    <span
      ref={ref}
      data-rich-block={lineKey ?? ''}
      data-inline-editor={editing ? '' : undefined}
      contentEditable={editing || undefined}
      suppressContentEditableWarning
      role={editing ? 'textbox' : undefined}
      aria-multiline={editing || undefined}
      aria-label={editing ? label : undefined}
      spellCheck={false}
      onInput={onInput ? (e) => {
        const native = e.nativeEvent as InputEvent
        onInput(e.currentTarget, { inputType: native.inputType ?? '', data: native.data ?? null })
      } : undefined}
      onBlur={editing ? onDone : undefined}
      onKeyDown={editing ? onKeyDown : undefined}
      onPaste={editing ? onPaste : undefined}
      onDrop={editing ? (e: DragEvent) => e.preventDefault() : undefined}
      /* No outline, and inline: see the docblock. `caret-accent` is the one mark of the
         writing that shows, and it is the caret. */
      style={{ outline: 'none' }}
      className="caret-accent"
    >
      {children}
    </span>
  )
}
