import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { cleanSidebarPages, sidebarPageOrder, SIDEBAR_PAGE_IDS } from './types'

describe('cleanSidebarPages', () => {
  it('keeps known ids in order and drops unknown ones and repeats', () => {
    expect(cleanSidebarPages(['skills', 'inbox', 'plans', 'skills'])).toEqual(['skills', 'plans'])
  })

  it('reads a non-list as unset', () => {
    expect(cleanSidebarPages(null)).toBeUndefined()
    expect(cleanSidebarPages('plans')).toBeUndefined()
  })
})

describe('sidebarPageOrder', () => {
  it('is the default order when nothing was arranged', () => {
    expect(sidebarPageOrder(undefined)).toEqual([...SIDEBAR_PAGE_IDS])
    expect(sidebarPageOrder([])).toEqual([...SIDEBAR_PAGE_IDS])
  })

  it('puts the stored pages first and the missing ones back in their default place', () => {
    // A page a later release adds, or one an older list never named, is never lost.
    expect(sidebarPageOrder(['skills', 'plans'])).toEqual(['skills', 'plans', 'tasks', 'repositories'])
  })
})

describe('user_settings sidebar CHECKs', () => {
  // The columns refuse any element their CHECK does not list, so a page added to the
  // catalogue without a migration would fail every settings write of the account using it.
  it('list exactly the catalogue, for both columns', () => {
    const sql = readFileSync(
      resolve(__dirname, '../../supabase/migrations/20260929090000_user_settings_sidebar.sql'),
      'utf8',
    )
    for (const column of ['sidebar_order', 'sidebar_hidden']) {
      const list = sql.match(new RegExp(`${column} <@ array\\[([^\\]]*)\\]`))?.[1] ?? ''
      const ids = [...list.matchAll(/'([^']+)'/g)].map((m) => m[1])
      expect(ids.sort()).toEqual([...SIDEBAR_PAGE_IDS].sort())
    }
  })
})
