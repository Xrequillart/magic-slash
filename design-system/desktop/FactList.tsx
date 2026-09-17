import { EmptyLine } from './EmptyLine'
import { Status } from './Status'
import { Text } from './Text'

/**
 * A LIST OF FACTS: what each one is called, and what it says. Nothing to press.
 *
 * ── IT IS NOT `FieldTable`, AND THE DIFFERENCE IS THE POINT ───────────────────────
 *
 * That one is a list of SETTINGS — three columns, a hairline over every row, and a
 * button at the end of each saying what you can do about it. This is a list of things
 * that are simply TRUE: the Claude account read off `~/.claude` is a name, an address,
 * an organization and a plan, and there is no control anywhere on it because none of it
 * is this app's to change.
 *
 * So the arrangement is a definition list and not a table: the name at the left edge,
 * the value at the RIGHT one, and no rule between them. A reader scans the right-hand
 * column for the value they came for, which is the only column that varies — where
 * `FieldTable`'s reader is looking for the row whose button they need.
 *
 * ── THE VALUE IS A STRING, AND ONE OF THEM MAY BE A BADGE ─────────────────────────
 *
 * `badge` is the only thing this list draws differently, and it draws it because the
 * caller said so rather than by inspecting the value. A plan name is a CLASS of account
 * — "Max", "Team Premium" — where a display name and an address are that account's own
 * particulars; the pill is what says the difference at a glance.
 */

export interface FactListRow {
  /** Stable across renders — 'email', 'plan'. Not an index. */
  id: string
  /** What the fact is called. Already translated. */
  label: string
  /** What it says. A string, already formatted: this list does not know what a plan is. */
  value: string
  /**
   * Draws the value as a pill in the accent rather than as words.
   *
   * At most one per list in practice. Two badges is a list with no hierarchy, and
   * three is a row of chips that happens to have labels.
   */
  badge?: boolean
}

export interface FactListProps {
  rows: FactListRow[]
  /**
   * What stands where the rows would be when there are none. Translated.
   *
   * An EMPTY LIST IS A STATE and not a mistake: the account is read off disk and the
   * disk may hold nothing yet. Without this the card would draw an empty plate, which
   * says the read failed rather than that there is nothing to say.
   */
  empty?: string
  /** Margins and width. Not the ground or the rhythm. */
  className?: string
}

export function FactList({ rows, empty, className = '' }: FactListProps) {
  if (rows.length === 0) return empty ? <EmptyLine>{empty}</EmptyLine> : null

  return (
    <div className={`flex flex-col gap-2 ${className}`.trim()}>
      {rows.map((row) => (
        <div key={row.id} className="flex items-center justify-between gap-4">
          <Text size="sm" tone="secondary" className="shrink-0 opacity-60">
            {row.label}
          </Text>
          {row.badge ? (
            /* `Status` and not a plate spelled here: a pill naming a tier is the same
               object as a pill naming a state, and the app had two spellings of it. */
            <Status label={row.value} tone="accent" strength="strong" size="sm" />
          ) : (
            <Text size="sm" weight="medium" className="min-w-0 truncate text-right" title={row.value}>
              {row.value}
            </Text>
          )}
        </div>
      ))}
    </div>
  )
}
