import { createContext, useContext, type ReactNode } from 'react'
import { CommentableLine } from '@ds/desktop'
import type { MarkdownLineProps } from './MarkdownView'
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
export function CommentLine({ tag, lineKey, className, children }: MarkdownLineProps) {
  const t = useT()
  const state = useContext(CommentLinesContext)
  /**
   * The tag, as a type React will accept.
   *
   * `tag` is a string off a hast node, and a `string` is not an `ElementType` to TypeScript
   * — any string could be, and most are not. The set it actually comes from is
   * `MarkdownView`'s own `LINE_TAGS`, all ten of them intrinsic elements, so the assertion
   * is narrowing a value this file cannot be handed anything else for.
   */
  const Tag = tag as 'p'

  if (!state || !lineKey) return <Tag className={className}>{children}</Tag>

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
      className={className}
    >
      {children}
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
