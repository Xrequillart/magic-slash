import { useState, useEffect, useCallback } from 'react'
import type { Invitation, Member, MembershipRole, Org } from '../../types'

/**
 * Organization state (membership + invitations). All calls degrade gracefully:
 * when cloud is disabled or the user is logged out, everything is empty/null and
 * nothing throws.
 */
export function useOrg() {
  const [org, setOrg] = useState<Org | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const current = await window.electronAPI.org.current()
      setOrg(current)
      if (current) {
        setMembers(await window.electronAPI.org.members().catch(() => []))
        // Invitations are admin-only; a non-admin read simply yields [].
        setInvitations(await window.electronAPI.org.invitations().catch(() => []))
      } else {
        setMembers([])
        setInvitations([])
      }
    } catch {
      setOrg(null)
      setMembers([])
      setInvitations([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const invite = useCallback(
    async (email: string, role: MembershipRole = 'user') => {
      const invitation = await window.electronAPI.org.invite(email, role)
      await refresh()
      return invitation
    },
    [refresh],
  )

  const accept = useCallback(
    async (token: string) => {
      const result = await window.electronAPI.org.accept(token)
      await refresh()
      return result
    },
    [refresh],
  )

  return { org, members, invitations, loading, refresh, invite, accept }
}
