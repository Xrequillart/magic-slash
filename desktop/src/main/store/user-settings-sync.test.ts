import { beforeEach, describe, expect, it } from 'vitest'
import type { Config } from '../../types'
import { applySettingsDefaults } from '../config/defaults'
import { applySettingsRow, normalizeSettingsRow, USER_SETTINGS_COLUMN_NAMES, type UserSettingsRow } from './user-settings-mapper'
import {
  adoptLoadedSettingsRow,
  beginSettingsWrite,
  noteAppliedSettingsRow,
  rememberLoadedSettingsRow,
  resetUserSettingsSync,
  settingsBaseline,
  settingsChangesToSave,
  settingsWriteFailed,
  settingsWriteSucceeded,
  takeIncomingSettingsRow,
} from './user-settings-sync'

const emptyRow = (): UserSettingsRow =>
  Object.fromEntries(USER_SETTINGS_COLUMN_NAMES.map((column) => [column, null])) as unknown as UserSettingsRow

/** What the database holds before each scenario: a dark Mac with notifications on. */
const REMOTE: UserSettingsRow = { ...emptyRow(), theme: 'dark', notifications_enabled: true }

/** The config the app holds for `row`: applied, then defaulted like every installed config. */
const configFrom = (row: UserSettingsRow): Config => {
  const config = { version: '1.0.0', repositories: {} } as Config
  applySettingsRow(config, row)
  applySettingsDefaults(config)
  return config
}

/** A save the way CloudStore runs it, against a write that succeeds or fails. */
const save = (config: Config, ok = true): Partial<UserSettingsRow> | null => {
  const changes = settingsChangesToSave(config)
  if (!changes) return null
  beginSettingsWrite(changes)
  if (ok) settingsWriteSucceeded(changes)
  else settingsWriteFailed(changes)
  return changes
}

beforeEach(() => {
  resetUserSettingsSync()
})

describe('saving', () => {
  it('writes a toggle turned back while its first write is still out', () => {
    noteAppliedSettingsRow(REMOTE)
    const off = configFrom({ ...REMOTE, notifications_enabled: false })
    const first = settingsChangesToSave(off)!
    beginSettingsWrite(first)

    // Back on before the first write answered: the baseline still says on, the write does not.
    expect(settingsChangesToSave(configFrom(REMOTE))).toEqual({ notifications_enabled: true })
    settingsWriteSucceeded(first)
    expect(settingsChangesToSave(configFrom(REMOTE))).toEqual({ notifications_enabled: true })
  })

  it('sends the whole row while no row is known', () => {
    const changes = save(configFrom({ ...emptyRow(), theme: 'light' }))
    expect(changes).toEqual(normalizeSettingsRow({ ...emptyRow(), theme: 'light' }))
    // …after which the row is known.
    expect(settingsBaseline()?.theme).toBe('light')
  })

  it('sends nothing after a load when nothing changed', () => {
    const config = configFrom(REMOTE)
    noteAppliedSettingsRow(REMOTE)
    expect(settingsChangesToSave(config)).toBeNull()
  })

  it('sends only the column that moved', () => {
    const config = configFrom(REMOTE)
    noteAppliedSettingsRow(REMOTE)
    config.notifications = { ...config.notifications, enabled: false }
    expect(save(config)).toEqual({ notifications_enabled: false })
    expect(settingsChangesToSave(config)).toBeNull()
  })

  it('sends the column again after a failed write', () => {
    const config = configFrom(REMOTE)
    noteAppliedSettingsRow(REMOTE)
    config.language = 'fr'
    expect(save(config, false)).toEqual({ language: 'fr' })
    expect(settingsBaseline()?.language).toBeNull()
    expect(save(config)).toEqual({ language: 'fr' })
  })
})

describe('adopting a load', () => {
  it('takes the row of a load hydrateConfig kept', () => {
    const config = configFrom(REMOTE)
    rememberLoadedSettingsRow(config, REMOTE)
    adoptLoadedSettingsRow(config)
    expect(settingsBaseline()).toEqual(normalizeSettingsRow(REMOTE))
  })

  it('ignores a load that was never adopted, and a config no store remembered', () => {
    rememberLoadedSettingsRow(configFrom(REMOTE), REMOTE)
    adoptLoadedSettingsRow(configFrom(REMOTE))
    expect(settingsBaseline()).toBeNull()
  })

  it('forgets the row when the user has none, so the next save inserts all of it', () => {
    noteAppliedSettingsRow(REMOTE)
    const config = configFrom(emptyRow())
    rememberLoadedSettingsRow(config, null)
    adoptLoadedSettingsRow(config)
    expect(settingsBaseline()).toBeNull()
  })

  it('holds every write after a failed read, until a row is read', () => {
    noteAppliedSettingsRow(REMOTE)
    const config = configFrom(emptyRow())
    rememberLoadedSettingsRow(config, undefined)
    adoptLoadedSettingsRow(config)
    expect(settingsChangesToSave(config)).toBeNull()

    expect(takeIncomingSettingsRow(REMOTE)).toBeNull()
    expect(settingsChangesToSave(configFrom({ ...REMOTE, language: 'fr' }))).toEqual({ language: 'fr' })
  })
})

describe('the phone and the Mac in the same second', () => {
  // The phone picks a light theme; before its event arrives the Mac turns
  // notifications off. The phone's row still says notifications are on.
  const phoneRow = { ...REMOTE, theme: 'light' }
  const bothRow = { ...REMOTE, theme: 'light', notifications_enabled: false }

  it('the Mac sends only its own column, and the phone event brings only the theme', () => {
    const config = configFrom(REMOTE)
    noteAppliedSettingsRow(REMOTE)
    config.notifications = { ...config.notifications, enabled: false }

    expect(save(config)).toEqual({ notifications_enabled: false })
    expect(takeIncomingSettingsRow(phoneRow)).toEqual({ theme: 'light' })
    // The Mac's own event, which follows the phone's in commit order: nothing new.
    expect(takeIncomingSettingsRow(bothRow)).toEqual({})
    expect(settingsBaseline()).toEqual(normalizeSettingsRow(bothRow))
  })

  it('holds while the Mac write is still in flight', () => {
    const config = configFrom(REMOTE)
    noteAppliedSettingsRow(REMOTE)
    config.notifications = { ...config.notifications, enabled: false }
    const changes = settingsChangesToSave(config)!
    beginSettingsWrite(changes)

    expect(takeIncomingSettingsRow(phoneRow)).toEqual({ theme: 'light' })
    settingsWriteSucceeded(changes)
    expect(takeIncomingSettingsRow(bothRow)).toEqual({})
  })

  it('still takes a later change of the same column once the Mac’s echo came back', () => {
    const config = configFrom(REMOTE)
    noteAppliedSettingsRow(REMOTE)
    config.notifications = { ...config.notifications, enabled: false }
    save(config)
    takeIncomingSettingsRow(bothRow)

    // The phone turns them back on: no longer an old value, a new choice.
    expect(takeIncomingSettingsRow({ ...bothRow, notifications_enabled: true })).toEqual({ notifications_enabled: true })
  })

  it('applies the whole row while no row is known', () => {
    expect(takeIncomingSettingsRow(phoneRow)).toBeNull()
    expect(settingsBaseline()).toEqual(normalizeSettingsRow(phoneRow))
  })
})
