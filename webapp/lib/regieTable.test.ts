import { describe, it, expect } from 'vitest'
import {
  compareValues,
  filterRows,
  sortRows,
  toggleSort,
  type SortState,
} from './regieTable'

interface Row {
  email: string
  version: string | null
  devices: number
  archived: boolean
  org: string | null
}

const ROWS: Row[] = [
  { email: 'zoe@acme.io', version: '0.10.0', devices: 2, archived: false, org: 'Acme' },
  { email: 'al@acme.io', version: '0.9.0', devices: 10, archived: true, org: 'Acme' },
  { email: 'mid@nowhere.io', version: null, devices: 0, archived: false, org: null },
]

type Key = 'email' | 'version' | 'devices' | 'archived'

function value(row: Row, key: Key) {
  return row[key]
}

const emails = (rows: Row[]) => rows.map((r) => r.email)

describe('toggleSort', () => {
  it('starts a new column at its default direction', () => {
    expect(toggleSort<Key>(null, 'email')).toEqual({ key: 'email', direction: 'asc' })
    expect(toggleSort<Key>(null, 'devices', 'desc')).toEqual({ key: 'devices', direction: 'desc' })
  })

  it('flips the direction when the same column is clicked again', () => {
    const first: SortState<Key> = { key: 'devices', direction: 'desc' }
    expect(toggleSort(first, 'devices')).toEqual({ key: 'devices', direction: 'asc' })
    expect(toggleSort({ key: 'devices', direction: 'asc' }, 'devices', 'desc')).toEqual({
      key: 'devices',
      direction: 'desc',
    })
  })

  it('switching columns resets to the new column default rather than carrying the direction', () => {
    const current: SortState<Key> = { key: 'devices', direction: 'asc' }
    expect(toggleSort(current, 'email', 'asc')).toEqual({ key: 'email', direction: 'asc' })
  })
})

describe('compareValues', () => {
  it('compares numbers numerically, not as strings', () => {
    expect(compareValues(2, 10)).toBeLessThan(0)
  })

  it('compares digit runs inside strings as numbers', () => {
    // The reason `numeric` collation is on: a codepoint compare puts 0.10.0 first.
    expect(compareValues('0.9.0', '0.10.0')).toBeLessThan(0)
  })

  it('is case-insensitive on strings', () => {
    expect(compareValues('alpha', 'ALPHA')).toBe(0)
  })

  it('orders false before true', () => {
    expect(compareValues(false, true)).toBeLessThan(0)
  })

  it('reports two missing values as equal', () => {
    expect(compareValues(null, undefined)).toBe(0)
  })
})

describe('sortRows', () => {
  it('returns every row untouched when there is no sort', () => {
    expect(emails(sortRows(ROWS, null, value))).toEqual(emails(ROWS))
  })

  it('does not mutate the input array', () => {
    const before = emails(ROWS)
    sortRows(ROWS, { key: 'email', direction: 'asc' }, value)
    expect(emails(ROWS)).toEqual(before)
  })

  it('sorts strings ascending', () => {
    const sorted = sortRows(ROWS, { key: 'email', direction: 'asc' }, value)
    expect(emails(sorted)).toEqual(['al@acme.io', 'mid@nowhere.io', 'zoe@acme.io'])
  })

  it('sorts numbers descending', () => {
    const sorted = sortRows(ROWS, { key: 'devices', direction: 'desc' }, value)
    expect(emails(sorted)).toEqual(['al@acme.io', 'zoe@acme.io', 'mid@nowhere.io'])
  })

  it('keeps rows with no value LAST when ascending', () => {
    const sorted = sortRows(ROWS, { key: 'version', direction: 'asc' }, value)
    expect(emails(sorted)).toEqual(['al@acme.io', 'zoe@acme.io', 'mid@nowhere.io'])
  })

  it('keeps rows with no value last when DESCENDING too', () => {
    // The decision this module exists to encode: a missing version is not the
    // lowest version, so flipping the direction must not drag it to the top.
    const sorted = sortRows(ROWS, { key: 'version', direction: 'desc' }, value)
    expect(emails(sorted)).toEqual(['zoe@acme.io', 'al@acme.io', 'mid@nowhere.io'])
  })

  it('is stable, so the database order survives a coarse column', () => {
    // Two rows share `archived: false` and must keep their incoming order.
    const sorted = sortRows(ROWS, { key: 'archived', direction: 'asc' }, value)
    expect(emails(sorted)).toEqual(['zoe@acme.io', 'mid@nowhere.io', 'al@acme.io'])
  })
})

describe('filterRows', () => {
  const haystack = (row: Row) => [row.email, row.version, row.org]

  it('returns every row for an empty or whitespace-only query', () => {
    expect(filterRows(ROWS, '', haystack)).toHaveLength(3)
    expect(filterRows(ROWS, '   ', haystack)).toHaveLength(3)
  })

  it('matches case-insensitively on a single field', () => {
    expect(emails(filterRows(ROWS, 'ZOE', haystack))).toEqual(['zoe@acme.io'])
  })

  it('requires every token to match, across DIFFERENT fields', () => {
    // 'acme 0.9' is one fact from the org column and one from the version column.
    expect(emails(filterRows(ROWS, 'acme 0.9', haystack))).toEqual(['al@acme.io'])
  })

  it('returns nothing when one token matches and another does not', () => {
    expect(filterRows(ROWS, 'acme 9.9.9', haystack)).toEqual([])
  })

  it('ignores null fields rather than matching them', () => {
    expect(emails(filterRows(ROWS, 'nowhere', haystack))).toEqual(['mid@nowhere.io'])
  })

  it('does not mutate the input array', () => {
    const before = emails(ROWS)
    filterRows(ROWS, 'acme', haystack)
    expect(emails(ROWS)).toEqual(before)
  })
})
