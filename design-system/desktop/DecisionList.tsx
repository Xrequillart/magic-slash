import type { ReactNode } from 'react'
import { ButtonIcon } from './ButtonIcon'
import { CommentableLine } from './CommentableLine'
import { ChevronDown, ChevronRight } from './icons'

/**
 * THE QUESTIONS A PLAN WAS FRAMED BY, and what was decided: one row per question, folded
 * to the question alone, unfolded to the decision in green and the reason behind it in blue.
 * A spec is scanned question by question first; the answers are there for the one being
 * read.
 *
 * It replaces a three-column table, and the table is what explains its shape. A table has
 * no line of its own to comment on — its rows are not blocks — so the most argued-over part
 * of a spec was the one part of it nobody could annotate. Each row here IS a line, and it is
 * commented on WHOLE: one mark, one thread, for the question and its decision together,
 * which is how a reader argues about them. So its words cannot be selected — a passage
 * picked out of a decision would be a second, smaller way to say the same thing — and a
 * row carrying a discussion takes the annotation colour all over, text, ground and border.
 *
 * READ, NOT WRITTEN. A decision is what was agreed with the person who answered; changing
 * it is a conversation, which is what the comment is for.
 *
 * ── THE DOM DOES NOT CHANGE WHEN A ROW FOLDS ─────────────────────────────────────────
 *
 * Question, decision, reason: always rendered, always in that order, and folding is a
 * `hidden` class. That is load-bearing. A comment is anchored to the TEXT of its line, read
 * by a walk over the DOM, so a row that rendered its answers only while open would quote
 * differently open and closed, and its comment would be reported lost the moment it folded.
 * For the same reason the two captions are drawn as `::before` content off `data-label`,
 * which no text walk sees.
 *
 * ── THE CELLS ARE THE CALLER'S ───────────────────────────────────────────────────────
 *
 * `question`, `decision` and `reason` are nodes, against this folder's rule of importing
 * children rather than receiving them, because what is in them cannot be drawn here: they
 * are markdown (code spans, links, emphasis) rendered by the app.
 */

export interface DecisionListItem {
  /** Stable across renders of the same list: the row's position is enough. */
  key: string
  question: ReactNode
  decision: ReactNode
  reason: ReactNode
  open: boolean
  onToggle: () => void
  /**
   * The row as a line that can be commented on, when the document is. See
   * `CommentableLine`: the fields are its own, already counted and already translated.
   */
  comment?: {
    lineId: string
    count: number
    active: boolean
    label: string
    onOpen: () => void
  }
}

export interface DecisionListProps {
  items: DecisionListItem[]
  /** Already translated: the captions over the decision and the reason, and the fold's two names. */
  labels: { decision: string; reason: string; expand: string; collapse: string }
  className?: string
}

/** A caption over a field, as pseudo-content so no text walk ever reads it into a quote. */
const CAPTION = `before:block before:mb-0.5 before:content-[attr(data-label)] before:text-[11px]
  before:font-semibold before:uppercase before:tracking-wide`

function DecisionRow({ item, labels }: { item: DecisionListItem; labels: DecisionListProps['labels'] }) {
  const { open } = item
  const commented = (item.comment?.count ?? 0) > 0
  const body = (
    <div
      onClick={item.onToggle}
      className="grid cursor-pointer select-none grid-cols-[1.25rem_minmax(0,1fr)] items-start gap-x-3 gap-y-2 px-3 py-3"
    >
      {/* The chevron's click stops here: the row's own click is the same fold, and both
          would run, open then closed again. */}
      <span className="row-start-1 col-start-1 mt-1 flex" onClick={(e) => e.stopPropagation()}>
        <ButtonIcon
          icon={open ? ChevronDown : ChevronRight}
          size="xs"
          tone="ghost"
          title={open ? labels.collapse : labels.expand}
          onClick={item.onToggle}
        />
      </span>
      <div className={`row-start-1 col-start-2 min-w-0 font-medium ${commented ? 'text-orange' : 'text-ink'}`}>
        {item.question}
      </div>
      {/* Unfolded, TWO ANSWERS IN TWO COLOURS: green for what was settled, blue for why,
          each on a rule of its own so neither reads as a footnote to the other. */}
      <div
        data-label={labels.decision}
        className={open
          ? `row-start-2 col-start-2 min-w-0 border-l-2 pl-3 font-medium ${CAPTION} ${commented
            ? 'border-orange text-orange before:text-orange/80'
            : 'border-green text-ink before:text-green'}`
          : 'hidden'}
      >
        {item.decision}
      </div>
      <div
        data-label={labels.reason}
        className={open
          ? `row-start-3 col-start-2 min-w-0 border-l-2 pl-3 ${CAPTION} ${commented
            ? 'border-orange/60 text-orange/90 before:text-orange/80'
            : 'border-blue text-ink/80 before:text-blue'}`
          : 'hidden'}
      >
        {item.reason}
      </div>
    </div>
  )

  if (!item.comment) return <div>{body}</div>
  /* A commented row is lit all over, ground and border, in the annotation colour: the whole
     decision is what was written about. `[&&]` outweighs the grey ground `CommentableLine`
     gives the open thread's line. */
  const lit = commented
    ? `ring-1 ring-inset ring-orange/50 ${item.comment.active ? '[&&]:bg-orange/15' : '[&&]:bg-orange/10'}`
    : ''
  return (
    <CommentableLine
      as="div"
      lineId={item.comment.lineId}
      count={item.comment.count}
      active={item.comment.active}
      label={item.comment.label}
      onOpen={item.comment.onOpen}
      className={lit}
    >
      {body}
    </CommentableLine>
  )
}

export function DecisionList({ items, labels, className = '' }: DecisionListProps) {
  return (
    /* `overflow-hidden` rounds a lit first or last row with the list. It clips nothing
       else: the comment marks are placed against the document, which contains this box. */
    <div
      className={`my-4 overflow-hidden rounded-lg border border-line
        [&>*+*]:border-t [&>*+*]:border-line-subtle ${className}`.trim()}
    >
      {items.map((item) => <DecisionRow key={item.key} item={item} labels={labels} />)}
    </div>
  )
}
