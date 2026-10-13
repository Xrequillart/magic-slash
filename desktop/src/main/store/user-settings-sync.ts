import type { Config } from '../../types'
import {
  configToSettingsRow,
  diffSettingsRow,
  normalizeSettingsRow,
  settingValueKey,
  USER_SETTINGS_COLUMN_NAMES,
  type UserSettingsRow,
} from './user-settings-mapper'

// ---------------------------------------------------------------------------
// What the desktop believes public.user_settings holds, so that it only ever
// writes, and only ever takes, the columns that actually moved.
//
// The row has two writers since the iPhone edits settings too, each one column at
// a time. Upserting the WHOLE row on every toggle, as the desktop used to, puts
// back whatever the desktop last saw in every other column: a theme picked on the
// phone a second before a notification toggled on the Mac was silently undone.
// With a baseline:
//
//  - a save sends the difference between the config and the baseline (nothing at
//    all when they agree), so the phone's column is never in it;
//  - an incoming Realtime row is applied only where it differs from the baseline,
//    so the phone's event, which carries the Mac's OLD value for the column the Mac
//    just changed, cannot revert that change, even for a moment.
//
// The baseline moves only where a row is really adopted: a kept load (hydrateConfig
// through adoptLoadedSettingsRow), an applied Realtime row, a write that succeeded.
// A load thrown away because a local edit landed mid-flight never touches it.
//
// Its own module, free of any Supabase or Electron import, for the mapper's reason:
// CloudStore (the writes), config.ts (the loads) and remote-sync (the events) all
// share it, and the last two are tested without the network.
// ---------------------------------------------------------------------------

/** The normalized row the database is believed to hold. null: unknown, so saves send it all. */
let baseline: UserSettingsRow | null = null

/**
 * The last load could not read the row. Sending it all would put the app's defaults over
 * whatever the database, and the phone, hold: no settings write goes out until a row is read.
 */
let unreadable = false

/**
 * Columns this app wrote whose own Realtime event has not come back yet: the JSON of
 * the value sent, and the values it replaced. Until the echo arrives, an event still
 * carrying a replaced value is older than the write and is not applied — the case
 * where the phone's event lands after the Mac's upsert returned but before its echo.
 */
const awaitingEcho = new Map<keyof UserSettingsRow, { sent: string; stale: Set<string> }>()

/** The row each loaded config was built from, until hydrateConfig keeps or drops it. */
const loadedRows = new WeakMap<Config, UserSettingsRow | null | undefined>()

/**
 * A whole row was applied to the config (a kept load, or no baseline yet): it IS the
 * baseline. null: the user has none. undefined: the read failed, see `unreadable`.
 */
export function noteAppliedSettingsRow(row: UserSettingsRow | null | undefined): void {
  baseline = row ? normalizeSettingsRow(row) : null
  unreadable = row === undefined
  awaitingEcho.clear()
}

/**
 * Called by the store's loadConfig: `config` was built from `row` (null: the user has
 * none, undefined: the read failed).
 */
export function rememberLoadedSettingsRow(config: Config, row: UserSettingsRow | null | undefined): void {
  loadedRows.set(config, row)
}

/** Called by hydrateConfig once it KEEPS `config`. A config no store remembered changes nothing. */
export function adoptLoadedSettingsRow(config: Config): void {
  if (!loadedRows.has(config)) return
  noteAppliedSettingsRow(loadedRows.get(config))
  loadedRows.delete(config)
}

/**
 * What a save of `config` must upsert: the columns that differ from the baseline, the
 * whole row when there is no baseline, or null when there is nothing to write, or when
 * the row could not be read.
 */
export function settingsChangesToSave(config: Config): Partial<UserSettingsRow> | null {
  if (unreadable) return null
  const next = configToSettingsRow(config)
  if (!baseline) return next
  const changes = diffSettingsRow(baseline, next)
  return Object.keys(changes).length > 0 ? changes : null
}

/** The upsert of `changes` is about to go out. */
export function beginSettingsWrite(changes: Partial<UserSettingsRow>): void {
  // Without a baseline the replaced values are unknown, so there is nothing to guard.
  if (!baseline) return
  for (const column of Object.keys(changes) as (keyof UserSettingsRow)[]) {
    const previous = awaitingEcho.get(column)
    const stale = new Set(previous ? [...previous.stale, previous.sent] : [])
    stale.add(settingValueKey(baseline[column]))
    const sent = settingValueKey(changes[column])
    stale.delete(sent)
    awaitingEcho.set(column, { sent, stale })
  }
}

/** The upsert of `changes` succeeded: the database now holds them. */
export function settingsWriteSucceeded(changes: Partial<UserSettingsRow>): void {
  if (baseline) {
    baseline = { ...baseline, ...changes }
    return
  }
  const row = Object.fromEntries(USER_SETTINGS_COLUMN_NAMES.map((column) => [column, null])) as unknown as UserSettingsRow
  baseline = normalizeSettingsRow({ ...row, ...changes })
}

/**
 * The upsert of `changes` failed. The baseline stays where it was, so the next save
 * sends these columns again; nothing will echo, so nothing is awaited.
 */
export function settingsWriteFailed(changes: Partial<UserSettingsRow>): void {
  for (const column of Object.keys(changes) as (keyof UserSettingsRow)[]) {
    if (awaitingEcho.get(column)?.sent === settingValueKey(changes[column])) awaitingEcho.delete(column)
  }
}

/**
 * Take an incoming Realtime row, and return the columns the config must apply: those
 * that differ from the baseline, minus any still older than this app's own write. null
 * means there was no baseline, so the whole row applies. Advances the baseline.
 */
export function takeIncomingSettingsRow(row: UserSettingsRow): Partial<UserSettingsRow> | null {
  const next = normalizeSettingsRow(row)
  if (!baseline) {
    noteAppliedSettingsRow(row)
    return null
  }
  const changes = diffSettingsRow(baseline, next)
  for (const [column, entry] of awaitingEcho) {
    const value = settingValueKey(next[column])
    if (value === entry.sent) {
      awaitingEcho.delete(column)
    } else if (entry.stale.has(value)) {
      delete changes[column]
      Object.assign(next, { [column]: baseline[column] })
    }
  }
  baseline = next
  return changes
}

/** Forget everything (sign-out, tests): the next user starts with no baseline. */
export function resetUserSettingsSync(): void {
  baseline = null
  unreadable = false
  awaitingEcho.clear()
}

/** The current baseline. For tests. */
export function settingsBaseline(): UserSettingsRow | null {
  return baseline
}
