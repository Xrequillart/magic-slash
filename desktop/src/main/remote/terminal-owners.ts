import { loadSession } from '../cloud/session-store'

/**
 * The account each terminal was started under (#352).
 *
 * A session refused by the server (revoked elsewhere, expired) suspends the relay but leaves
 * the PTYs running: only an explicit sign-out kills them. If another account then signs in on
 * this Mac, the relay must not seal those terminals for the new account's phones. So the
 * owner is recorded at creation, and a snapshot only carries the terminals whose recorded
 * owner IS the account the relay is serving. A terminal with no recorded owner is never sent:
 * fail closed.
 */
const owners = new Map<string, string>()

/** The signed-in account right now, lower-case, or null. */
function currentUserId(): string | null {
  const id = loadSession()?.user?.id
  return typeof id === 'string' && id ? id.toLowerCase() : null
}

/**
 * Record who owns `terminalId`: `uid` when given, else the account signed in at this moment.
 * Signed out records nothing (and drops any previous owner), so the terminal is never sent.
 */
export function recordTerminalOwner(terminalId: string, uid: string | null = currentUserId()): void {
  if (uid) owners.set(terminalId, uid.toLowerCase())
  else owners.delete(terminalId)
}

/** The recorded owner of `terminalId`, or null when none was. */
export function terminalOwner(terminalId: string): string | null {
  return owners.get(terminalId) ?? null
}

export function forgetTerminalOwner(terminalId: string): void {
  owners.delete(terminalId)
}

export function clearTerminalOwners(): void {
  owners.clear()
}
