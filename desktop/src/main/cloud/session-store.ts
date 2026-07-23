import * as fs from 'fs'
import * as path from 'path'
import { safeStorage } from 'electron'
import { CONFIG_DIR } from '../config/config'

// Persisted Supabase session, encrypted at rest with the OS keychain via
// Electron safeStorage (zero extra native deps). Only the fields we need to
// restore a session are stored.
export interface StoredSession {
  access_token: string
  refresh_token: string
  expires_at?: number
  user?: {
    id: string
    email?: string
  }
}

const SESSION_FILE = path.join(CONFIG_DIR, 'cloud-session.enc')

/**
 * Persist a session to disk, encrypted with safeStorage. No-ops silently if
 * encryption is unavailable — cloud auth is optional and must never crash.
 */
export function saveSession(session: StoredSession): void {
  try {
    if (!safeStorage.isEncryptionAvailable()) return
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true })
    }
    const encrypted = safeStorage.encryptString(JSON.stringify(session))
    fs.writeFileSync(SESSION_FILE, encrypted)
  } catch (error) {
    console.error('[cloud] Failed to save session:', error)
  }
}

/**
 * Load and decrypt the persisted session. MUST NEVER throw — returns null on
 * any error (missing file, encryption unavailable, corrupted data) so boot is
 * never blocked by the cloud layer.
 */
export function loadSession(): StoredSession | null {
  try {
    if (!fs.existsSync(SESSION_FILE)) return null
    if (!safeStorage.isEncryptionAvailable()) return null
    const encrypted = fs.readFileSync(SESSION_FILE)
    const decrypted = safeStorage.decryptString(encrypted)
    const parsed = JSON.parse(decrypted) as StoredSession
    if (!parsed?.access_token || !parsed?.refresh_token) return null
    return parsed
  } catch (error) {
    console.error('[cloud] Failed to load session:', error)
    return null
  }
}

/** Remove the persisted session (on sign-out). Never throws. */
export function clearSession(): void {
  try {
    if (fs.existsSync(SESSION_FILE)) {
      fs.unlinkSync(SESSION_FILE)
    }
  } catch (error) {
    console.error('[cloud] Failed to clear session:', error)
  }
}
