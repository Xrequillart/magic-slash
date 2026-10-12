import type { ReactNode } from 'react'
import { Text } from './Text'

/**
 * ONE FIELD OF A METADATA COLUMN: a quiet heading, and whatever it labels.
 *
 * `FactList`'s NEIGHBOUR AND NOT ITS RIVAL, and the line between them is what the VALUE
 * is. A fact is a string — an email address, a plan's name — so that component takes its
 * rows as data and typesets both halves. What goes under one of these is a set of chips,
 * a progress bar with a count over it, a link to another page: things the caller builds,
 * which is why this takes `children` and `FactList` does not. Reach for the list first;
 * reach for this when the value stopped being a sentence.
 *
 * IT STACKS rather than sitting the label beside the value, which is the other half of
 * the same distinction. A metadata column is 256px: a label and three chips on one line
 * leaves nothing for either, and `FactList`'s label-left/value-right row only works
 * because its value is short and can truncate.
 *
 * ── NO HAIRLINE BETWEEN THEM ──────────────────────────────────────────────────────
 *
 * These were separated by `border-b border-line-subtle last:border-b-0`, which is how
 * GitHub rules its own issue sidebar and is one rule per field down a column that already
 * has a plate around it. The separation is the SPACE now — the caller stacks them with a
 * `gap`, and the label's own quiet is what says a new field has started. A column of five
 * fields is then one card rather than five boxes sharing edges.
 */

export interface MetaBlockProps {
  /** What the field is called, already translated. Quiet, and never the loud thing here. */
  title: string
  /**
   * What it holds. Laid out as a WRAPPING ROW, because that is what nearly every one of
   * these is — a set of chips, a person, a count — and because a column this narrow will
   * wrap whatever it is given. A child that wants the full width says so itself
   * (`w-full`), which is what a progress bar and its caption do.
   */
  children: ReactNode
  /** Margins. Not the rhythm inside — that is the two lines this component is. */
  className?: string
}

export function MetaBlock({ title, children, className = '' }: MetaBlockProps) {
  return (
    <div className={`flex flex-col gap-2 min-w-0 ${className}`.trim()}>
      <Text weight="medium" tone="secondary">
        {title}
      </Text>
      <div className="flex flex-wrap items-center gap-1.5 min-w-0">{children}</div>
    </div>
  )
}
