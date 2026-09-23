import type { ReactNode } from 'react'
import { CommentableLine } from './CommentableLine'
import { Icon } from './Icon'
import { Boxes, Layers, Lightbulb, SlidersHorizontal } from './icons'
import type { IconComponent } from './types'

/**
 * HOW BIG A PLAN WAS JUDGED TO BE, and why: a spec's `## Sizing`, as a card of four facts
 * rather than four bullets that each open on a word and a colon.
 *
 * EACH FACT HAS ITS OWN MARK AND ITS OWN COLOUR, so the eye lands on the verdict first and
 * on the reasoning last, which is the order a reader asks about them: what did we decide,
 * how many things is it, how eager was the splitting, and why. The verdict is drawn a size
 * up; the justification, which is the one long fact, is drawn as prose.
 *
 * Each fact is a line to comment on WHOLE, `DecisionList`'s terms: one mark in the margin,
 * no selecting a few of its words, and lit orange all over once it carries a discussion.
 * Read, not written, for the same reason: the sizing is what the skill concluded, and
 * disagreeing with it is a conversation.
 *
 * THE CAPTIONS ARE PSEUDO-CONTENT off `data-label`, so no text walk reads one into the
 * quote a comment is anchored by. See `DecisionList`.
 *
 * `value` is a node for `DecisionList`'s reason: it is markdown the app rendered, and the
 * specs write their verdicts in bold and their splitting modes in code.
 */

export type SizingFactKind = 'verdict' | 'deliverables' | 'splitting' | 'justification'

export interface SizingFact {
  kind: SizingFactKind
  value: ReactNode
  /** The fact as a line that can be commented on, when the document is. See `DecisionListItem`. */
  comment?: {
    lineId: string
    count: number
    active: boolean
    label: string
    onOpen: () => void
  }
}

export interface SizingCardProps {
  /** In the order the spec wrote them. A kind may be missing; none is repeated. */
  facts: SizingFact[]
  /** Already translated: the caption over each kind of fact. */
  labels: Record<SizingFactKind, string>
  className?: string
}

/** The mark and the colour of each kind: its tile, its caption. Whole class names, for Tailwind. */
const KINDS: Record<SizingFactKind, { icon: IconComponent; tile: string; caption: string }> = {
  verdict: { icon: Layers, tile: 'bg-purple/15 text-purple', caption: 'before:text-purple' },
  deliverables: { icon: Boxes, tile: 'bg-blue/15 text-blue', caption: 'before:text-blue' },
  splitting: { icon: SlidersHorizontal, tile: 'bg-yellow/15 text-yellow', caption: 'before:text-yellow' },
  justification: { icon: Lightbulb, tile: 'bg-green/15 text-green', caption: 'before:text-green' },
}

const CAPTION = `before:block before:mb-0.5 before:content-[attr(data-label)] before:text-[11px]
  before:font-semibold before:uppercase before:tracking-wide`

/** How each kind's value is set: the verdict a size up, the long one as prose. */
const VALUE: Record<SizingFactKind, string> = {
  verdict: 'text-base font-semibold',
  deliverables: 'font-semibold tabular-nums',
  splitting: 'font-medium',
  justification: 'text-ink/80 leading-relaxed',
}

function SizingRow({ fact, label }: { fact: SizingFact; label: string }) {
  const kind = KINDS[fact.kind]
  const commented = (fact.comment?.count ?? 0) > 0
  const body = (
    <div className="flex select-none items-start gap-3 px-4 py-3">
      <span
        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${commented
          ? 'bg-orange/15 text-orange'
          : kind.tile}`}
      >
        <Icon glyph={kind.icon} tone="inherit" />
      </span>
      <div
        data-label={label}
        className={`min-w-0 flex-1 ${CAPTION} ${VALUE[fact.kind]} ${commented
          ? 'text-orange before:text-orange/80'
          : `${fact.kind === 'justification' ? '' : 'text-ink'} ${kind.caption}`}`}
      >
        {fact.value}
      </div>
    </div>
  )

  if (!fact.comment) return <div>{body}</div>
  /* Lit all over once it is written about. `DecisionList`'s rule, and its `[&&]`. */
  const lit = commented
    ? `ring-1 ring-inset ring-orange/50 ${fact.comment.active ? '[&&]:bg-orange/15' : '[&&]:bg-orange/10'}`
    : ''
  return (
    <CommentableLine
      as="div"
      lineId={fact.comment.lineId}
      count={fact.comment.count}
      active={fact.comment.active}
      label={fact.comment.label}
      onOpen={fact.comment.onOpen}
      className={lit}
    >
      {body}
    </CommentableLine>
  )
}

export function SizingCard({ facts, labels, className = '' }: SizingCardProps) {
  return (
    /* `overflow-hidden` rounds a lit first or last row with the card, and clips nothing
       else: the comment marks are placed against the document, which contains this box. */
    <div
      className={`my-4 overflow-hidden rounded-lg border border-line bg-ink/[0.03]
        [&>*+*]:border-t [&>*+*]:border-line-subtle ${className}`.trim()}
    >
      {facts.map((fact) => <SizingRow key={fact.kind} fact={fact} label={labels[fact.kind]} />)}
    </div>
  )
}
