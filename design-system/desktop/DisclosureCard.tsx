import { Card } from './Card'
import { Check, X } from './icons'
import { SettingRow, type SettingRowProps } from './SettingRow'
import { Text } from './Text'

/**
 * WHAT A FEATURE RECORDS AND WHAT IT NEVER TOUCHES — the switch, and the two lists
 * that let someone decide whether to leave it on.
 *
 * ── WHY THE LISTS ARE THE COMPONENT ───────────────────────────────────────────────
 *
 * Because the honest answer to "what am I sharing?" is two columns and never a
 * paragraph. The app had the paragraph first; nobody read it, and the people who most
 * wanted to know — the ones about to switch the thing off — were the ones it served
 * worst. Side by side, ticked against crossed, the answer is readable in the two
 * seconds someone actually spends on it.
 *
 * SO THE SHAPE CARRIES THE PROMISE, and that is what makes this a component rather than
 * a card with a list in it: an app that can only draw this arrangement cannot quietly
 * grow a version with the right-hand column missing.
 *
 * ── IT IS DRAWN TWICE AND WAS WRITTEN TWICE ───────────────────────────────────────
 *
 * The desktop's Application tab and the webapp's feature settings both carry this block,
 * and the desktop's copy had a comment asking the next person to keep the two diffable
 * by hand. They had already drifted — a 10px heading against an 11px one, `text-muted`
 * against `text-text-secondary/50` — which is the whole argument for the shape living
 * here instead: two surfaces making the same promise about the same data cannot be left
 * to agree by hand.
 *
 * ── THE COLUMNS ARE OPTIONAL, THE SWITCH IS NOT ───────────────────────────────────
 *
 * A caller that drops them draws the row alone: what is being collected is a question
 * with no answer while nothing is being collected, and the app hides the breakdown when
 * the switch is off. What it never hides is the small print — see `note`.
 */

/** One side of the breakdown: what it is called, and the short lines under it. */
export interface DisclosureColumn {
  /** The heading, in small caps over the list. Translated. */
  title: string
  /** One short line each. Translated, and written as things rather than sentences. */
  items: string[]
}

export interface DisclosureCardProps {
  /**
   * The switch, as `SettingRow`'s props — which is what `useToggleRow` hands back, so
   * the optimistic write the app puts under every switch comes along unchanged.
   */
  row: SettingRowProps
  /** The ticked column: what this feature does record. Absent draws no breakdown. */
  collected?: DisclosureColumn
  /** The crossed column: what it never touches. Absent draws no breakdown. */
  excluded?: DisclosureColumn
  /**
   * The small print under everything: who can read what was recorded, and what carries
   * on regardless of this switch. A list is several paragraphs, in order. Translated.
   */
  note?: string | string[]
  /** Margins and width. Not the ground, the padding, the radius or the gaps. */
  className?: string
}

export function DisclosureCard({ row, collected, excluded, note, className = '' }: DisclosureCardProps) {
  const notes = note === undefined ? [] : Array.isArray(note) ? note : [note]
  // Both or neither: one column of a comparison is not a comparison, and a lone ticked
  // list making a promise the crossed one is supposed to bound is the failure this
  // component exists to prevent.
  const columns =
    collected && excluded
      ? ([
          { side: 'collected' as const, column: collected, Mark: Check, tone: 'text-green' },
          { side: 'excluded' as const, column: excluded, Mark: X, tone: 'text-red' },
        ])
      : []

  return (
    <Card className={`flex flex-col gap-4 ${className}`.trim()}>
      <SettingRow {...row} />
      {columns.length > 0 && (
        <div className="grid gap-x-6 gap-y-4 border-t border-line-subtle pt-4 sm:grid-cols-2">
          {columns.map(({ side, column, Mark, tone }) => (
            <div key={side}>
              <Text size="2xs" tone="secondary" className="mb-2 block uppercase tracking-wider opacity-50">
                {column.title}
              </Text>
              <ul className="space-y-1.5">
                {column.items.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    {/* The mark keeps its own floor at 14px while the line beside it sits
                        at 12: a tick and a cross have to be told apart at a glance, and
                        below that they read as "coloured" and "not". */}
                    <Mark className={`mt-px h-3.5 w-3.5 shrink-0 ${tone}`} />
                    <Text size="xs" tone="secondary" className="block leading-snug">
                      {item}
                    </Text>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
      {notes.map((line) => (
        <Text key={line} size="xs" tone="secondary" className="block leading-snug opacity-50">
          {line}
        </Text>
      ))}
    </Card>
  )
}
