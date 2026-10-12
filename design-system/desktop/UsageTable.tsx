import { Fragment } from 'react'
import { EmptyLine } from './EmptyLine'
import { Text } from './Text'

/**
 * FIGURES OVER PERIODS: one row per stretch of time, one column per number.
 *
 * Today, this week, all time — against tokens and an estimated cost. A table and not
 * three cards, because the whole question a reader opens it with is comparative: "is
 * today heavy" is answered by the row above and below it, and a figure that has to be
 * compared has to be in a column.
 *
 * ── THREE STATES AND NOT TWO ──────────────────────────────────────────────────────
 *
 * A row is PENDING until its figures arrive, and the difference between "pending" and
 * "nothing to show" is the bug this shape exists to prevent: the app drew the empty copy
 * while the fold was still being read, which said "no history" to users who have plenty
 * of it. So a row with no `figures` draws its skeletons, `empty` covers the answered-and-
 * genuinely-empty case, and the caller keeps the two apart because only the caller knows
 * whether the read has come back.
 *
 * The skeletons are SIZED TO THE NUMBERS they stand in for, so nothing shifts when the
 * values land — a table that reflows on arrival is a table the eye has to find twice.
 *
 * ── THE FIGURES ARE STRINGS ───────────────────────────────────────────────────────
 *
 * `12,5 M` and `~$18.40` are formatted by the app: a thousands separator is a locale's
 * business, the compact unit for a billion is a catalogue entry (French says "Md"), and
 * a currency is neither of those. This table aligns them and says nothing about what
 * they mean — which is also why they are drawn in a mono face and right-aligned, the
 * two things that make a column of numbers comparable at a glance.
 */

export interface UsageTableRow {
  /** Stable across renders — 'today', 'week'. Not an index. */
  id: string
  /** The period, translated. */
  label: string
  /**
   * The figures, in the order of `columns`. ABSENT IS PENDING and draws the skeletons —
   * see the header. An answered row with nothing in it passes zeroes, formatted.
   */
  figures?: string[]
}

export interface UsageTableProps {
  /**
   * One heading per figure column, translated. The row's own label column is headed by
   * nothing: what a period is called needs no title.
   */
  columns: string[]
  rows: UsageTableRow[]
  /** The small print under the table — what the estimate is worth. Translated. */
  note?: string
  /**
   * What stands where the table would be. Translated, and shown ONLY when the caller
   * knows there is nothing: see the header.
   */
  empty?: string
  /** Margins and width. Not the columns or the alignment. */
  className?: string
}

/** Sized to the figure it stands in for. Two widths, so a row does not read as a bar chart. */
const SKELETON = ['w-16', 'w-14']

export function UsageTable({ columns, rows, note, empty, className = '' }: UsageTableProps) {
  if (rows.length === 0) return empty ? <EmptyLine>{empty}</EmptyLine> : null

  return (
    <div className={className}>
      {/* `1fr` for the periods and `auto` for every figure: the numbers take exactly what
          they need and the names take the rest, which is what keeps both figure columns
          hard against the right edge whatever the longest period is called. */}
      <div
        className="grid items-baseline gap-x-4 gap-y-2"
        style={{ gridTemplateColumns: `1fr repeat(${columns.length}, auto)` }}
      >
        <span />
        {columns.map((column) => (
          <Text key={column} size="xs" tone="secondary" className="text-right uppercase tracking-wider opacity-50">
            {column}
          </Text>
        ))}

        {rows.map((row) => (
          <Fragment key={row.id}>
            <Text size="sm" tone="secondary">
              {row.label}
            </Text>
            {columns.map((column, index) =>
              row.figures ? (
                <Text key={column} size="sm" className="text-right font-mono">
                  {row.figures[index] ?? ''}
                </Text>
              ) : (
                <span
                  key={column}
                  aria-hidden
                  className={`block h-4 ${SKELETON[index] ?? SKELETON[SKELETON.length - 1]} animate-pulse justify-self-end rounded bg-surface-strong`}
                />
              ),
            )}
          </Fragment>
        ))}
      </div>
      {note && (
        <Text size="2xs" tone="secondary" className="mt-3 block leading-snug opacity-40">
          {note}
        </Text>
      )}
    </div>
  )
}
