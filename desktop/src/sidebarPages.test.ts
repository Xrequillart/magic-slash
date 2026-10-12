import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { cleanSidebarPages, isSidebarPageShown, sidebarPageOrder, SIDEBAR_PAGE_IDS } from './types'

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
    expect(sidebarPageOrder(['skills', 'plans'])).toEqual(['skills', 'plans', 'tasks', 'repositories', 'settings', 'account'])
  })
})

describe('isSidebarPageShown', () => {
  it('shows a page unless hidden, and an opt-in page only once shown', () => {
    expect(isSidebarPageShown('tasks', undefined, undefined)).toBe(true)
    expect(isSidebarPageShown('tasks', ['tasks'], undefined)).toBe(false)
    expect(isSidebarPageShown('settings', undefined, undefined)).toBe(false)
    expect(isSidebarPageShown('account', [], ['account'])).toBe(true)
    // `hidden` says nothing about an opt-in page, either way.
    expect(isSidebarPageShown('settings', [], [])).toBe(false)
  })
})

describe('user_settings sidebar CHECKs', () => {
  // The columns refuse any element their CHECK does not list, so a page added to the
  // catalogue without a migration would fail every settings write of the account using it.
  it('list exactly the catalogue, for every column', () => {
    const sql = readFileSync(
      resolve(__dirname, '../../supabase/migrations/20261006090000_user_settings_sidebar_opt_in_pages.sql'),
      'utf8',
    )
    for (const column of ['sidebar_order', 'sidebar_hidden', 'sidebar_shown']) {
      const list = sql.match(new RegExp(`${column} <@ array\\[([^\\]]*)\\]`))?.[1] ?? ''
      const ids = [...list.matchAll(/'([^']+)'/g)].map((m) => m[1])
      expect(ids.sort()).toEqual([...SIDEBAR_PAGE_IDS].sort())
    }
  })
})
