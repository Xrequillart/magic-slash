/**
 * Sorting and filtering for the back-office tables — pure, generic, and
 * dependency-free.
 *
 * It lives in `lib/` with no import of `./admin` on purpose: the root vitest run
 * covers `webapp/lib/**` while CI installs only the root's dependencies, so a
 * module that reached for `@supabase/supabase-js` would fail to resolve before
 * running an assertion. Callers pass accessors instead of row types.
 */

export type SortDirection = 'asc' | 'desc'

export interface SortState<K extends string> {
  key: K
  direction: SortDirection
}

/** What a column can sort on. `null`/`undefined` mean "this row has no value". */
export type SortValue = string | number | boolean | null | undefined

/**
 * Click behaviour for a column header: a new column starts at its own natural
 * direction, and clicking the active column flips it.
 *
 * `defaultDirection` exists because the natural first click differs per column
 * and guessing wrong is a wasted click every single time: names read A→Z, while
 * "devices" or "last seen" are asked about largest/most-recent first.
 */
export function toggleSort<K extends string>(
  current: SortState<K> | null,
  key: K,
  defaultDirection: SortDirection = 'asc',
): SortState<K> {
  if (current?.key !== key) return { key, direction: defaultDirection }
  return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
}

/**
 * Order two cell values.
 *
 * MISSING VALUES ALWAYS SORT LAST, in both directions — the one rule here that is
 * a decision rather than a mechanism. A device that never reported a version is
 * not "the lowest version": it has none. Treating null as smallest would fill the
 * top of an ascending version sort with rows that have nothing to say, which is
 * the opposite of what sorting by version is for.
 *
 * Strings compare with `numeric` collation so digit runs compare as numbers:
 * '0.9.0' lands before '0.10.0', where a plain codepoint compare inverts them.
 */
export function compareValues(a: SortValue, b: SortValue): number {
  const aMissing = a === null || a === undefined
  const bMissing = b === null || b === undefined
  if (aMissing && bMissing) return 0
  // Not negated for descending by the caller: `sortRows` applies the direction to
  // the comparison result and re-fixes missing values afterwards.
  if (aMissing) return 1
  if (bMissing) return -1

  if (typeof a === 'number' && typeof b === 'number') return a - b
  if (typeof a === 'boolean' && typeof b === 'boolean') return Number(a) - Number(b)

  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' })
}

/**
 * A copy of `rows` in sort order. Never mutates its input — the caller holds the
 * fetched array in state, and sorting a list in place makes the next render's
 * "unsorted" baseline whatever the last click produced.
 *
 * Stable: `Array.prototype.sort` is required to be stable, so rows the active
 * column cannot separate keep the order the database returned. That order is
 * itself meaningful (admins first, newest first), so preserving it is what makes
 * a sort on a coarse column still read sensibly.
 */
export function sortRows<T, K extends string>(
  rows: T[],
  sort: SortState<K> | null,
  value: (row: T, key: K) => SortValue,
): T[] {
  if (!sort) return [...rows]
  const factor = sort.direction === 'asc' ? 1 : -1

  return [...rows].sort((rowA, rowB) => {
    const a = value(rowA, sort.key)
    const b = value(rowB, sort.key)

    // Re-checked here rather than left to compareValues, because multiplying its
    // verdict by -1 would drag missing values to the TOP of a descending sort.
    const aMissing = a === null || a === undefined
    const bMissing = b === null || b === undefined
    if (aMissing || bMissing) return compareValues(a, b)

    return factor * compareValues(a, b)
  })
}

/**
 * Rows matching a free-text query.
 *
 * Every whitespace-separated token must match SOMEWHERE in the row, rather than
 * the whole query matching one field: an operator types `acme 0.57` meaning "the
 * Acme rows running 0.57", and those two facts live in different columns. Matching
 * the raw string would find nothing and read as a broken filter.
 *
 * Case-insensitive. An empty or whitespace-only query returns every row, so the
 * caller does not special-case the initial state.
 */
export function filterRows<T>(
  rows: T[],
  query: string,
  haystack: (row: T) => Array<string | null | undefined>,
): T[] {
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean)
  if (tokens.length === 0) return [...rows]

  return rows.filter((row) => {
    const fields = haystack(row)
      .filter((field): field is string => typeof field === 'string' && field.length > 0)
      .map((field) => field.toLowerCase())

    return tokens.every((token) => fields.some((field) => field.includes(token)))
  })
}
