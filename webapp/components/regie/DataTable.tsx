'use client'

import { useMemo, useState } from 'react'
import { ArrowDown, ArrowUp } from 'lucide-react'
import { sortRows, toggleSort, type SortDirection, type SortState, type SortValue } from '@/lib/regieTable'

/**
 * The back-office table. One component, every list.
 *
 * It owns SORT state only. Filtering belongs to the caller, because the Toolbar
 * above the table reports "shown / total" and a table that filtered internally
 * would leave that count describing rows it had already dropped. The ordering
 * itself lives in `lib/regieTable.ts`, which is pure and tested: the rules worth
 * getting right (missing values sort last in BOTH directions, stability preserving
 * the database's order) are the ones a component test would never reach
 * comfortably.
 *
 * Columns declare `align: 'right'` for numeric cells so digits line up against a
 * common edge, and `sortValue` separately from `cell`: what a column DISPLAYS is
 * often not what it should sort on — 'seen 2 hours ago' sorts by timestamp, a
 * version pill sorts by the version string, and a dash sorts as nothing at all.
 */

export interface Column<T, K extends string> {
  key: K
  /** Header text. Rendered uppercase; keep it short — these are labels, not sentences. */
  label: string
  /** The cell. Wrap data in <Mono> unless it is prose. */
  cell: (row: T) => React.ReactNode
  /**
   * What this column sorts on. Omit to make the column unsortable — which is the
   * right answer for a column of action buttons or a composite cell that has no
   * single ordering.
   */
  sortValue?: (row: T) => SortValue
  /** First-click direction. Counts and dates want 'desc'; names want 'asc'. */
  defaultDirection?: SortDirection
  align?: 'left' | 'right'
  /** Tailwind width utility, e.g. 'w-32'. Omit to let the column take its content. */
  width?: string
}

/** Monospace cell wrapper — every id, email, version, count and date goes through it. */
export function Mono({
  children,
  dim = false,
}: {
  children: React.ReactNode
  dim?: boolean
}) {
  return (
    <span className={`font-mono text-[13px] ${dim ? 'text-regie-dim' : 'text-ink'}`}>{children}</span>
  )
}

/** The em dash that means "no value", so absence looks the same in every column. */
export function NoValue() {
  return <span className="font-mono text-[13px] text-regie-dim">—</span>
}

export function DataTable<T, K extends string>({
  rows,
  columns,
  rowKey,
  onRowClick,
  selectedKey,
  initialSort = null,
  loading = false,
  emptyLabel,
}: {
  /** Already filtered by the caller. */
  rows: T[]
  columns: Column<T, K>[]
  rowKey: (row: T) => string
  /** Makes rows navigable. Omit for a read-only table. */
  onRowClick?: (row: T) => void
  /** The row the rail points at, if any. */
  selectedKey?: string | null
  initialSort?: SortState<K> | null
  loading?: boolean
  /** Shown when there are no rows. The caller words it — only it knows whether an
   *  empty table means "nothing on the platform" or "nothing matches the filter". */
  emptyLabel: string
}) {
  const [sort, setSort] = useState<SortState<K> | null>(initialSort)

  const visible = useMemo(() => {
    const byKey = new Map(columns.map((column) => [column.key, column]))
    return sortRows(rows, sort, (row, key) => byKey.get(key)?.sortValue?.(row))
  }, [rows, columns, sort])

  return (
    // The table's own horizontal scroll container: a console is full-bleed and its
    // tables are wide, so the OVERFLOW has to live here rather than on the page —
    // a body that scrolls sideways takes the rail and the nav with it.
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-regie-rule bg-regie-ground/40">
            {columns.map((column) => {
              const active = sort?.key === column.key
              const sortable = Boolean(column.sortValue)
              const Arrow = active && sort?.direction === 'desc' ? ArrowDown : ArrowUp

              return (
                <th
                  key={column.key}
                  scope="col"
                  aria-sort={active ? (sort?.direction === 'asc' ? 'ascending' : 'descending') : undefined}
                  className={`${column.width ?? ''} px-4 py-2.5 font-display text-[10px] font-bold uppercase tracking-[0.1em] ${
                    column.align === 'right' ? 'text-right' : 'text-left'
                  } ${active ? 'text-ink' : 'text-regie-dim'}`}
                >
                  {sortable ? (
                    <button
                      onClick={() => setSort(toggleSort(sort, column.key, column.defaultDirection))}
                      className={`inline-flex items-center gap-1 uppercase tracking-[0.12em] transition-colors hover:text-ink ${
                        column.align === 'right' ? 'flex-row-reverse' : ''
                      }`}
                    >
                      {column.label}
                      {/* Reserved space, so turning sorting on does not shift the
                          header text sideways by the width of an icon. */}
                      <Arrow className={`h-3 w-3 ${active ? 'opacity-100' : 'opacity-0'}`} />
                    </button>
                  ) : (
                    column.label
                  )}
                </th>
              )
            })}
          </tr>
        </thead>

        <tbody>
          {loading ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-6 font-mono text-[13px] text-regie-dim">
                Chargement…
              </td>
            </tr>
          ) : visible.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-6 text-[13px] text-regie-dim">
                {emptyLabel}
              </td>
            </tr>
          ) : (
            visible.map((row) => {
              const key = rowKey(row)
              const selected = selectedKey === key

              return (
                <tr
                  key={key}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  tabIndex={onRowClick ? 0 : undefined}
                  onKeyDown={
                    onRowClick
                      ? (event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault()
                            onRowClick(row)
                          }
                        }
                      : undefined
                  }
                  // A 2px brand marker down the left of the selected row, echoing
                  // the one on the active nav item so selection reads the same in
                  // both places.
                  //
                  // EVERY row carries the border and only its COLOUR changes:
                  // adding a border on selection would shift the row's content
                  // sideways by 2px at the moment of clicking it.
                  // The bottom rule is coloured with `border-b-*` rather than the
                  // all-sides `border-*`, which would also set border-left-color
                  // and collide with the marker below at equal specificity.
                  className={`border-b border-b-regie-rule-soft border-l-2 transition-colors last:border-b-0 ${
                    onRowClick ? 'cursor-pointer' : ''
                  } ${
                    selected
                      ? 'border-l-brand bg-regie-tint'
                      : `border-l-transparent ${onRowClick ? 'hover:bg-regie-tint' : ''}`
                  } focus:outline-none focus-visible:border-l-brand focus-visible:bg-regie-tint`}
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={`px-4 py-2 align-middle ${
                        column.align === 'right' ? 'text-right tabular-nums' : ''
                      }`}
                    >
                      {column.cell(row)}
                    </td>
                  ))}
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </div>
  )
}
