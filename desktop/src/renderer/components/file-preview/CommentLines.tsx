import {
  Children, createContext, isValidElement, useContext, useLayoutEffect, useRef, type MouseEvent, type ReactNode,
} from 'react'
import { CommentableLine, RichTextBlock, type RichTextBlockProps } from '@ds/desktop'
import type { MarkdownLineProps } from './MarkdownView'
import type { SpecBlockType } from '../../utils/specEditing'
import { useT } from '../../i18n'

/**
 * The wiring between a rendered document and the layer that owns its comments: which line's
 * thread is open, how many comments each line holds, and how to open one.
 *
 * THROUGH A CONTEXT, and the alternative is what explains it. The lines are built by
 * react-markdown, three or four levels inside a component that is deliberately memoised on
 * the document STRING alone — opening a bubble would otherwise re-run remark, rehype and
 * the sanitiser over the whole spec. Props cannot reach them without going through that
 * memo and defeating it; a context reaches the lines and nothing else, so the state changes
 * re-render a few hundred cheap `<p>` wrappers and re-parse nothing.
 *
 * `null` is the ordinary case: every caller of `MarkdownView` that has no comments passes
 * no `line` renderer at all, so these components are never mounted for them.
 */
export interface CommentLinesState {
  /** The line whose bubble is open, by id. */
  open: string | null
  /** How many comments have been relocated onto a given line. */
  countOf: (lineId: string) => number
  /** Open this line: its thread if it has one, an empty composer if it has not. */
  onOpen: (lineId: string) => void
}

const CommentLinesContext = createContext<CommentLinesState | null>(null)

export function CommentLinesProvider({
  value,
  children,
}: {
  value: CommentLinesState
  children: ReactNode
}) {
  return <CommentLinesContext.Provider value={value}>{children}</CommentLinesContext.Provider>
}

/** A block the document can edit: its key, its tag, and where its markdown is. */
export interface EditableLine {
  key: string
  tag: string
  source: { start: number; end: number }
}

/**
 * A document EDITED IN PLACE: which block holds the caret, and everything a block does to
 * the document as it is written in. `null` — the ordinary case — is a document only read.
 *
 * A SECOND CONTEXT rather than more fields on the one above, because the two do not come
 * together: a plan's spec is editable before its comments have loaded, and after a read of
 * them failed, and `CommentLinesState` is absent in both.
 *
 * STABLE WHILE THE READER TYPES. Keystrokes go out through `onInput` and do not change this
 * value, so a paragraph gaining a word re-renders nothing but the page that holds the text —
 * not the few hundred lines of the document.
 */
export interface EditableLinesState {
  /** The line being written in, by key, or `null` while the reader is reading. */
  editing: string | null
  /** Where the caret goes in it when it opens. */
  caret?: RichTextBlockProps['caret']
  /**
   * A line to open as soon as it renders, and where its caret goes: the block Enter just made,
   * the block Backspace folded into, a block just turned into a heading. Its key only exists
   * in the document the change produced, so it is named here and picked up by the line itself.
   */
  pending: { keys: string[]; offset: number } | null
  /**
   * Every editable line currently rendered, by key — written by the lines as they render, so
   * the page can go from a block on screen to its markdown without walking the tree.
   */
  lines: Map<string, EditableLine>
  onStart: (line: EditableLine, caret: RichTextBlockProps['caret']) => void
  onInput: (host: HTMLElement, input?: { inputType: string; data: string | null }) => void
  onDone: () => void
  onEnter: (host: HTMLElement) => void
  onBackspaceAtStart: (host: HTMLElement) => void
  /** Turn the block under `key` into another kind — a heading, an item, a quote. */
  onRetype: (key: string, type: SpecBlockType) => void
  /**
   * Keep the open block open while the focus is briefly elsewhere — in the toolbar's link
   * field, whose address is about to be applied to the very selection the blur would end.
   */
  hold: (on: boolean) => void
  /** What the block is called for a screen reader while it is written in, already translated. */
  label: string
}

const EditableLinesContext = createContext<EditableLinesState | null>(null)

export function EditableLinesProvider({
  value,
  children,
}: {
  value: EditableLinesState | null
  children: ReactNode
}) {
  return <EditableLinesContext.Provider value={value}>{children}</EditableLinesContext.Provider>
}

/** The document being edited, for a surface beside it — the toolbar over a selection. */
export function useEditableLines(): EditableLinesState | null {
  return useContext(EditableLinesContext)
}

/**
 * What a click must leave alone: a link is followed, a control pressed, a disclosure opened.
 * A drag across words is not a caret either — it is a selection, and the toolbar's.
 */
const NOT_A_CARET = 'a, button, input, textarea, select, summary, [data-comment-overlay]'

/**
 * A list item's own words and its sublist, apart: the sublist's items are lines of their own,
 * and an item written in with its sublist inside it would edit them twice, once in each.
 */
function ownWords(tag: string, children: ReactNode): { words: ReactNode; rest: ReactNode } {
  if (tag !== 'li') return { words: children, rest: null }
  const kids = Children.toArray(children)
  const cut = kids.findIndex((kid) => isValidElement(kid) && (kid.type === 'ul' || kid.type === 'ol'))
  return cut === -1 ? { words: children, rest: null } : { words: kids.slice(0, cut), rest: kids.slice(cut) }
}

/**
 * One block of the document, drawn as a line that can be commented on.
 *
 * Handed to `MarkdownView` as its `line` renderer. It is the app's half of the design
 * system's `CommentableLine`: the component owns what the three states look like, and this
 * owns which state this particular block is in and what its mark says in the reader's
 * language.
 *
 * A BLOCK WITH NO KEY IS DRAWN PLAIN. `lineKey` is the block's offset in the markdown
 * source and `rehype-raw` does not always carry one through embedded HTML — see
 * `MarkdownLineProps`. Without it there is nothing to match a comment against and nothing
 * to name in `onOpen`, so the block renders as the bare tag it always was: not commentable,
 * rather than commentable and unable to remember where the comment went.
 */
export function CommentLine({ tag, lineKey, source, className, children }: MarkdownLineProps) {
  const t = useT()
  const state = useContext(CommentLinesContext)
  const edit = useContext(EditableLinesContext)
  /**
   * The tag, as a type React will accept.
   *
   * `tag` is a string off a hast node, and a `string` is not an `ElementType` to TypeScript
   * — any string could be, and most are not. The set it actually comes from is
   * `MarkdownView`'s own `LINE_TAGS`, all ten of them intrinsic elements, so the assertion
   * is narrowing a value this file cannot be handed anything else for.
   */
  const Tag = tag as 'p'

  const editable = !!edit && !!lineKey && !!source
  const editing = editable && edit.editing === lineKey
  if (editable) edit.lines.set(lineKey, { key: lineKey, tag, source })

  /**
   * A NEW KEY EACH TIME THE LINE STOPS BEING WRITTEN IN, so the block remounts from the
   * markdown rather than reconciling against the nodes the reader typed into. See
   * `RichTextBlock`. A ref bumped during render: StrictMode's second pass bumps it again,
   * which is only a different number for the same fresh mount.
   */
  const generation = useRef(0)
  const wasEditing = useRef(false)
  if (editing) wasEditing.current = true
  else if (wasEditing.current) {
    wasEditing.current = false
    generation.current++
  }

  // The block Enter, Backspace or a change of kind just produced: open it the moment it exists.
  const pending = editable && !editing && edit.pending?.keys.includes(lineKey) ? edit.pending : null
  useLayoutEffect(() => {
    if (pending && edit && lineKey && source) edit.onStart({ key: lineKey, tag, source }, { offset: pending.offset })
  })

  const onClick = editable && !editing
    ? (e: MouseEvent<HTMLElement>) => {
      if (!(e.target instanceof Element) || e.target.closest(NOT_A_CARET)) return
      // A line whose inner line is the one clicked: the innermost takes the caret.
      if (e.target.closest('[data-comment-line], [data-editable-line]') !== e.currentTarget) return
      if (!(window.getSelection()?.isCollapsed ?? true)) return
      edit.onStart({ key: lineKey, tag, source }, { x: e.clientX, y: e.clientY })
    }
    : undefined

  const { words, rest } = ownWords(tag, children)
  const body = editable
    ? (
      <>
        <RichTextBlock
          key={generation.current}
          editing={editing}
          caret={editing ? edit.caret : undefined}
          code={tag === 'pre'}
          label={edit.label}
          lineKey={lineKey}
          onInput={edit.onInput}
          onDone={edit.onDone}
          onEnter={edit.onEnter}
          onBackspaceAtStart={edit.onBackspaceAtStart}
        >
          {words}
        </RichTextBlock>
        {rest}
      </>
    )
    : children

  if (!state || !lineKey) {
    return (
      <Tag
        className={`${className ?? ''} ${editable ? 'cursor-text' : ''}`.trim() || undefined}
        onClick={onClick}
        data-editable-line={editable ? '' : undefined}
      >
        {body}
      </Tag>
    )
  }

  const count = state.countOf(lineKey)
  return (
    <CommentableLine
      as={Tag}
      lineId={lineKey}
      count={count}
      active={state.open === lineKey}
      /* Three states, three sentences: the gesture on a line with nothing on it, the one
         comment there is to read, and how many there are. The plural is picked here rather
         than by the catalogue for the reason every plural in this app is: `t` resolves a key
         and does not count, so "1 comment" never gets written in a language that would not
         say it that way. */
      label={count === 0
        ? t('filePreview.commentOnLine')
        : count === 1
          ? t('filePreview.commentsOnLine.one')
          : t('filePreview.commentsOnLine.other', { count })}
      onOpen={() => state.onOpen(lineKey)}
      onClick={onClick}
      className={className}
    >
      {body}
    </CommentableLine>
  )
}

/**
 * The line a node sits in, or `null` when it sits in none.
 *
 * The one place the `data-comment-line` attribute is read, so counting a stored comment onto
 * a line and finding that line again to hang a bubble off it agree about what "the line" is:
 * the INNERMOST one, which is what `closest` answers. A paragraph inside a list item inside
 * a list item is three lines by the DOM's reckoning and one by the reader's.
 */
export function lineElementOf(node: Node | null, root: HTMLElement): HTMLElement | null {
  const start = node instanceof Element ? node : node?.parentElement
  if (!start || !root.contains(start)) return null
  const line = start.closest('[data-comment-line]')
  return line instanceof HTMLElement && root.contains(line) ? line : null
}

/** A line's id, as the attribute spells it. */
export function lineIdOf(element: HTMLElement): string | null {
  return element.getAttribute('data-comment-line')
}
