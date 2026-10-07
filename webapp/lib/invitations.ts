export type InvitationStatus = 'pending' | 'accepted' | 'revoked' | 'expired'

/**
 * A still-pending invite past its expiry reads as expired (derived at read time).
 *
 * Exported because the rule has two call sites and no home in the database:
 * `accept_invitation` cannot persist the flip (its RAISE would roll the write
 * back), so the stored status stays 'pending' and every reader derives the same
 * answer. The back-office (`./admin`) and the desktop app each need it.
 */
export function effectiveStatus(status: InvitationStatus, expiresAt: string | null): InvitationStatus {
  if (status === 'pending' && expiresAt && Date.parse(expiresAt) < Date.now()) return 'expired'
  return status
}
