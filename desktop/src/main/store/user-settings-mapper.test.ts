import { describe, expect, it } from 'vitest'
import type { Config } from '../../types'
import { applySettingsDefaults } from '../config/defaults'
import {
  applySettingsRow,
  configToSettingsRow,
  diffSettingsRow,
  normalizeSettingsRow,
  USER_SETTINGS_COLUMN_NAMES,
  type UserSettingsRow,
} from './user-settings-mapper'

/** Every column NULL: "the user has never chosen any of these". */
const emptyRow = (): UserSettingsRow =>
  Object.fromEntries(USER_SETTINGS_COLUMN_NAMES.map((column) => [column, null])) as unknown as UserSettingsRow

describe('diffSettingsRow', () => {
  it('returns nothing for two equal rows', () => {
    const row = { ...emptyRow(), theme: 'light', sidebar_order: ['plans', 'tasks'] }
    expect(diffSettingsRow(row, { ...row, sidebar_order: ['plans', 'tasks'] })).toEqual({})
  })

  it('returns only the columns that moved, with the new values', () => {
    const base = { ...emptyRow(), theme: 'light', notifications_enabled: true }
    const next = { ...base, notifications_enabled: false, sidebar_hidden: ['skills'] }
    expect(diffSettingsRow(base, next)).toEqual({ notifications_enabled: false, sidebar_hidden: ['skills'] })
  })

  it('sees a column going back to NULL', () => {
    expect(diffSettingsRow({ ...emptyRow(), language: 'fr' }, emptyRow())).toEqual({ language: null })
  })

  it('compares lists by content and order', () => {
    const base = { ...emptyRow(), sidebar_order: ['plans', 'tasks'] }
    expect(diffSettingsRow(base, { ...base, sidebar_order: ['tasks', 'plans'] })).toEqual({ sidebar_order: ['tasks', 'plans'] })
  })
})

describe('normalizeSettingsRow', () => {
  it('reads a value this build does not know as NULL, as the config does', () => {
    const row = { ...emptyRow(), theme: 'from-the-future', language: 'fr' }
    expect(normalizeSettingsRow(row).theme).toBeNull()
    expect(normalizeSettingsRow(row).language).toBe('fr')
  })

  it('reads a NULL the app fills in as its default, so a default is never written as a choice', () => {
    const normalized = normalizeSettingsRow(emptyRow())
    expect(normalized.split_enabled).toBe(false)
    expect(normalized.atlassian_integration_enabled).toBe(true)
    expect(normalized.spotlight_enabled).toBe(true)
    expect(normalized.theme).toBeNull()
  })

  it('agrees with a config the row was applied to, so a load then a save has nothing to send', () => {
    const row = {
      ...emptyRow(),
      theme: 'light',
      notifications_enabled: false,
      notification_pr_review: true,
      spotlight_enabled: true,
      spotlight_shortcut: 'Alt+Space',
      atlassian_integration_enabled: false,
      sidebar_order: ['plans', 'tasks'],
      workflow_chain_limit: 3,
    }
    const config = { version: '1.0.0', repositories: {} } as Config
    applySettingsRow(config, row)
    applySettingsDefaults(config)
    expect(diffSettingsRow(normalizeSettingsRow(row), configToSettingsRow(config))).toEqual({})
  })
})
