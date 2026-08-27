import * as fs from 'fs'
import * as path from 'path'
import { safeStorage } from 'electron'
import { CONFIG_DIR } from '../config/config'

/**
 * The Atlassian credential at rest — encrypted by the OS keychain, on this machine
 * only, never uploaded anywhere.
 *
 * Modelled on `cloud/session-store.ts`, the repo's only other `safeStorage` user,
 * down to the `CONFIG_DIR`-relative `.enc` file. Two deliberate divergences:
 *
 *  1. `writeFileSync` gets `{ mode: 0o600 }`. The ciphertext is only as private as
 *     the key protecting it, but on a shared machine there is no reason for another
 *     account to be able to copy the file and wait for a keychain prompt.
 *
 *  2. `save()` THROWS when encryption is unavailable, where `saveSession` no-ops.
 *     That is the important one. A silent no-op is right for the cloud session —
 *     losing it costs a re-login and the app keeps working — but here the caller
 *     goes on to report "Connected" and flip the integration flag. Claiming a
 *     credential is stored when it was discarded is a lie the user only discovers
 *     the next time they open Settings. `load()` and `clear()` stay non-throwing,
 *     exactly like the model: boot must never be blocked by this file.
 *
 * WHY NOT `types.ts`: the shape below is the SECRET, and `types.ts` is the surface
 * the renderer sees. Keeping `StoredJiraCredential` local to this module means no
 * component can hold one even by accident — the renderer only ever sees
 * `JiraAuthStatus`, which carries a name and a site URL and nothing else.
 */
export interface StoredJiraCredential {
  /** The long-lived half. ROTATED on every refresh — always persist the new one. */
  refresh_token: string
  /** One hour of usable life. Kept so a restart does not force a refresh round-trip. */
  access_token: string
  /** Epoch MILLISECONDS (not Atlassian's `expires_in` seconds) — a wall-clock deadline. */
  expires_at: number
  /** The `cloudId`; every Jira REST path is keyed by it and it cannot be derived. */
  cloud_id: string
  /** `https://acme.atlassian.net` — display only, so the user can tell sites apart. */
  site_url: string
  /** The Atlassian display name, from `myself`. Display only. */
  account_name: string
  /**
   * Set when Atlassian last refused this credential — a 401 on a Jira read, or a
   * rejected refresh grant.
   *
   * A MARK, never a deletion: a site outage answers 401 too, and throwing the
   * refresh token away over a five-minute incident turns a transient failure into a
   * mandatory browser round-trip. The UI reads this to offer "Reconnect" instead of
   * a generic error, and a later successful refresh clears it.
   */
  unverified?: boolean
}

const CREDENTIAL_FILE = path.join(CONFIG_DIR, 'jira-credential.enc')

/**
 * The keychain is not available, so nothing was stored.
 *
 * A CLASS rather than a message the caller pattern-matches, because the caller has to
 * tell this apart from every other reason a save can fail (a full disk, a permission
 * on `CONFIG_DIR`) and say something different about it. It is the one failure mode
 * the acceptance criteria name — "connecting fails with a stated reason" — and a
 * string comparison would drift out of step with the message the first time anyone
 * reworded it.
 *
 * Carries nothing but that fact: the message is about the MACHINE, never about the
 * credential, so it is safe to log and safe to translate a reason code from.
 */
export class KeychainUnavailableError extends Error {
  constructor() {
    super('The OS keychain is unavailable, so the Atlassian credential cannot be stored')
    this.name = 'KeychainUnavailableError'
  }
}

/**
 * Persist the credential, encrypted with safeStorage.
 *
 * THROWS when the keychain is unavailable or the write fails, and every caller must
 * let that reach the user rather than swallow it: this function returning is the
 * only proof there is that "Connected" is true. See the header.
 */
export function save(credential: StoredJiraCredential): void {
  if (!safeStorage.isEncryptionAvailable()) {
    // No credential text in the message, and nothing to log: the OS keychain is
    // locked or missing, which is a fact about the machine, not about the secret. Its
    // own class, so `connect.ts` can name this failure to the user instead of falling
    // back to "something went wrong" — see `KeychainUnavailableError`.
    throw new KeychainUnavailableError()
  }
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true })
  }
  const encrypted = safeStorage.encryptString(JSON.stringify(credential))
  fs.writeFileSync(CREDENTIAL_FILE, encrypted, { mode: 0o600 })
}

/**
 * Load and decrypt the stored credential. MUST NEVER throw — returns null on any
 * failure (no file, locked keychain, ciphertext from another OS user's key,
 * truncated write), so a bad file makes the feature look disconnected rather than
 * taking the app down with it.
 *
 * A credential missing its refresh token or its cloud id is treated as absent: it
 * could not be used for anything, and reporting it as connected would offer a
 * "Disconnect" button in place of the "Connect" one the user needs.
 */
export function load(): StoredJiraCredential | null {
  try {
    if (!fs.existsSync(CREDENTIAL_FILE)) return null
    if (!safeStorage.isEncryptionAvailable()) return null
    const decrypted = safeStorage.decryptString(fs.readFileSync(CREDENTIAL_FILE))
    const parsed = JSON.parse(decrypted) as StoredJiraCredential
    if (!parsed?.refresh_token || !parsed?.cloud_id) return null
    return parsed
  } catch (error) {
    // The error object from a decrypt failure carries no plaintext, but keep the log
    // to the fact rather than the object, on the principle that nothing from this
    // file's neighbourhood is ever worth printing.
    console.error('[Jira] Failed to load the stored credential:', error instanceof Error ? error.name : 'unknown error')
    return null
  }
}

/** Remove the stored credential (on disconnect). Never throws. */
export function clear(): void {
  try {
    if (fs.existsSync(CREDENTIAL_FILE)) {
      fs.unlinkSync(CREDENTIAL_FILE)
    }
  } catch (error) {
    console.error('[Jira] Failed to clear the stored credential:', error instanceof Error ? error.name : 'unknown error')
  }
}

/**
 * Flip the `unverified` mark on a credential the caller is already holding, keeping
 * everything else.
 *
 * Takes the credential rather than re-reading it: `connect.ts` caches the loaded one,
 * and a decrypt is a real OS round-trip (DPAPI, libsecret) on a path that runs once
 * per failed Jira read.
 *
 * Non-throwing on purpose, unlike `save()`: this is called from a failure path that is
 * already reporting something to the user, and a keychain that went away since the load
 * leaves the credential exactly as it was — still there, still unusable, and the next
 * read fails the same way. Returns the credential as it now stands so the caller can
 * build a status from it without a re-read.
 *
 * WHICH IS THE CREDENTIAL UNCHANGED WHEN THE WRITE FAILED. Note what that means for a
 * caller: the return value alone cannot tell "persisted" from "gave up", so nothing may
 * infer the MARK from it. `connect.ts`'s `markUnverified` applies the mark to its
 * in-memory copy either way — the prompt the mark exists to raise must not depend on a
 * keychain being available.
 */
export function setUnverified(
  current: StoredJiraCredential,
  unverified: boolean,
): StoredJiraCredential | null {
  if ((current.unverified ?? false) === unverified) return current
  const updated: StoredJiraCredential = { ...current, unverified }
  try {
    save(updated)
    return updated
  } catch (error) {
    console.error('[Jira] Failed to record the credential state:', error instanceof Error ? error.name : 'unknown error')
    return current
  }
}
