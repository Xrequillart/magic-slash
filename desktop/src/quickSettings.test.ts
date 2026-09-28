import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { cleanQuickSettings, DEFAULT_QUICK_SETTINGS, QUICK_SETTING_IDS } from './types'

describe('cleanQuickSettings', () => {
  it('keeps known ids in order and drops unknown ones and repeats', () => {
    expect(cleanQuickSettings(['split-view', 'teleport', 'notifications', 'split-view'])).toEqual(['split-view', 'notifications'])
  })

  it('keeps an empty sheet empty, and reads a non-list as unset', () => {
    expect(cleanQuickSettings([])).toEqual([])
    expect(cleanQuickSettings(null)).toBeUndefined()
    expect(cleanQuickSettings('notifications')).toBeUndefined()
  })

  it('defaults to switches the catalogue knows', () => {
    expect(DEFAULT_QUICK_SETTINGS.every((id) => QUICK_SETTING_IDS.includes(id))).toBe(true)
  })
})

describe('user_settings.quick_settings_items CHECK', () => {
  // The column refuses any element its CHECK does not list, so a switch added to the
  // catalogue without a migration would fail every settings write of the account using it.
  it('lists exactly the catalogue', () => {
    const sql = readFileSync(
      resolve(__dirname, '../../supabase/migrations/20260928150000_user_settings_quick_settings.sql'),
      'utf8',
    )
    const list = sql.match(/quick_settings_items <@ array\[([^\]]*)\]/)?.[1] ?? ''
    const ids = [...list.matchAll(/'([^']+)'/g)].map((m) => m[1])
    expect(ids.sort()).toEqual([...QUICK_SETTING_IDS].sort())
  })
})
