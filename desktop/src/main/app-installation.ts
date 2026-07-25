import * as os from 'os'
import { createHash } from 'crypto'
import type { AppInstallationInfo } from '../types'
import { getStore } from './store/Store'

// Records which app version this machine runs, in the cloud `app_installations`
// table. Called once per launch from the connectivity gate (after auth +
// reachability are established), so the DB is refreshed at every start — and
// therefore after every auto-update, since applying an update restarts the app.

/**
 * Stable per-machine identifier: sha256 of hostname|platform|arch, hex.
 *
 * DERIVED rather than generated-and-stored because the app deliberately keeps no
 * local state (the database is the single source of truth), so there is nowhere
 * to persist a random id. The trade-offs of the inputs: hostname alone can
 * collide across two machines with the same default name, and renaming a machine
 * mints a new row — both acceptable for version reporting. The hash also means
 * the raw hostname is not what identifies the row.
 */
export function computeDeviceId(): string {
  const fingerprint = `${os.hostname()}|${process.platform}|${process.arch}`
  return createHash('sha256').update(fingerprint).digest('hex')
}

/** This machine's installation info for the given app version. */
export function getAppInstallationInfo(appVersion: string): AppInstallationInfo {
  return {
    deviceId: computeDeviceId(),
    deviceName: os.hostname(),
    appVersion,
    platform: process.platform,
    arch: process.arch,
  }
}

/**
 * Best-effort: push this launch's version to the store. Version telemetry must
 * never block or break startup, so a failure is logged and swallowed rather than
 * surfaced through the store's write-error handler (which would toast the user
 * and trigger a re-hydration for data they never edited).
 */
export async function recordAppInstallation(appVersion: string): Promise<void> {
  try {
    await getStore().recordAppInstallation(getAppInstallationInfo(appVersion))
  } catch (error) {
    console.error('[app-installation] failed to record app version:', error)
  }
}
