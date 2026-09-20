import { Label } from './Label'
import { Text } from './Text'

/**
 * WHAT A TOTAL IS MADE OF, ranked: one row per contributor, the biggest first, each
 * naming itself and what it costs.
 *
 * IT IS A TABLE AND `NoticeCard`'s ROWS ARE EVIDENCE, which is the whole reason the two
 * lists are two components rather than one with a flag. Evidence is three or four names
 * under a sentence that already counted them — ragged right, read once, then gone. This
 * is twenty rows a reader SCANS down a column to find the one that is costing the most,
 * so the figure column is fixed-width and right-aligned and the tag at the end of every
 * row starts on the same x. The folder already makes this cut twice: `FactList` against
 * `FieldTable`, `RepairList` against `UsageTable`.
 *
 * IT DOES NOT SORT. The order is the caller's, because the ranking is usually computed
 * alongside the total the list is breaking down — sorting again in here would be a
 * second opinion about the same array.
 */

export interface BreakdownTag {
  /** The word on the plate, already translated. */
  label: string
  /**
   * The plate's hue, as a CSS VALUE — `Label.color`'s contract, so
   * `rgb(var(--c-blue, 59 130 246))` and never a class. What a colour MEANS is the
   * caller's; see `NoticeCardTag.color`, which this mirrors deliberately.
   */
  color?: string
}

export interface BreakdownRow {
  /** Stable across renders. */
  id: string
  /**
   * A plate BEFORE the name, for the one fact that sorts the list into kinds — where
   * each contributor came from.
   *
   * IN FRONT AND NOT AT THE END, which is the opposite of `tags`, and deliberate: this
   * is the column the eye runs down to group the rows, and a grouping key at the ragged
   * end of a truncating name is a key nobody can follow.
   */
  lead?: BreakdownTag
  /** What the contributor is called. Truncates, with the full string as its tooltip. */
  name: string
  /** Plates after the name — an exception worth flagging on this row and not the others. */
  tags?: BreakdownTag[]
  /**
   * WHAT IT COSTS, already formatted and translated — "142 tok".
   *
   * A STRING because the unit, the grouping and the abbreviation are all the caller's:
   * this folder cannot reach the app's i18n, and a list that took a number would have
   * to invent one of the three.
   */
  detail?: string
  /**
   * THE VERDICT ON THE FIGURE, at the very end — "High", "Medium", "Low".
   *
   * ITS OWN SLOT AND NOT ONE MORE OF `tags`, because it is a COLUMN: every row has one,
   * they come from a fixed set of three, and the reader runs down them. A plate sized to
   * its word would put "Low" and "Medium" at two different x and undo that. `tags` is
   * the opposite — a plate that appears on the exceptional row only, where a reserved
   * column would be an empty box on every other line.
   */
  verdict?: BreakdownTag
}

export interface BreakdownListProps {
  rows: BreakdownRow[]
  /** Margins and width. Not the rhythm or the columns. */
  className?: string
}

export function BreakdownList({ rows, className = '' }: BreakdownListProps) {
  if (rows.length === 0) return null

  return (
    <ul className={`flex flex-col gap-1.5 ${className}`.trim()}>
      {rows.map((row) => (
        <li key={row.id} className="flex items-center gap-2">
          {row.lead && (
            <Label size="2xs" color={row.lead.color} className="flex-shrink-0">
              {row.lead.label}
            </Label>
          )}
          {/* The name is what gives way: everything either side of it is short and
              fixed, and a truncated figure is not a figure. */}
          <Text className="min-w-0 flex-1 truncate capitalize" title={row.name}>
            {row.name}
          </Text>
          {row.tags?.map((tag, i) => (
            <Label key={`${tag.label}-${i}`} size="2xs" color={tag.color} className="flex-shrink-0">
              {tag.label}
            </Label>
          ))}
          {row.detail !== undefined && (
            // `w-14` AND `tabular-nums`: this is a column rather than a trailing word.
            // Ragged figures in a list ranked BY those figures is the one arrangement
            // that defeats the point of ranking it.
            <Text size="2xs" tone="secondary" className="w-14 flex-shrink-0 text-right tabular-nums opacity-70">
              {row.detail}
            </Text>
          )}
          {row.verdict && (
            // `w-14 justify-center`, the figure column's width: two fixed columns of one
            // width read as a table, two of different widths read as a row that ran out.
            <Label size="2xs" color={row.verdict.color} className="w-14 flex-shrink-0 justify-center">
              {row.verdict.label}
            </Label>
          )}
        </li>
      ))}
    </ul>
  )
}
