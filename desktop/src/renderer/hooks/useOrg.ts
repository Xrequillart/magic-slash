import { useState, useEffect, useCallback } from 'react'
import type { Invitation, Member, MembershipRole } from '../../types'
import { useStore } from '../store'

/**
 * Organization state (active org, org list, members, invitations) + the member-
 * management actions. The active org and the org list live in the global store
 * so the switcher, the org page, and any other view react live to the same
 * source of truth. Everything degrades gracefully: when cloud is disabled or the
 * user is logged out, lists are empty / org is null and nothing throws.
 */
export function useOrg() {
  const activeOrg = useStore((s) => s.activeOrg)
  const orgs = useStore((s) => s.orgs)
  const setActiveOrg = useStore((s) => s.setActiveOrg)
  const setOrgs = useStore((s) => s.setOrgs)

  const [members, setMembers] = useState<Member[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  // Per-org rosters, keyed by org id. A user can belong to several orgs
  // (memberships is unique on (org_id, user_id), not on user_id), and the
  // settings page renders one card per org — so it needs all of them, not just
  // the active one. `members`/`invitations` above stay scoped to the active org
  // for the callers that only care about it.
  const [membersByOrg, setMembersByOrg] = useState<Record<string, Member[]>>({})
  const [invitationsByOrg, setInvitationsByOrg] = useState<Record<string, Invitation[]>>({})
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const current = await window.electronAPI.org.current()
      setActiveOrg(current)
      const list = await window.electronAPI.org.list().catch(() => [])
      setOrgs(list)

      // One round-trip pair per org, all in flight together.
      const rosters = await Promise.all(
        list.map(async (o) => ({
          orgId: o.id,
          members: await window.electronAPI.org.members(o.id).catch(() => []),
          // Invitations are admin-only; a non-admin read simply yields [].
          invitations: await window.electronAPI.org.invitations(o.id).catch(() => []),
        })),
      )

      const byOrgMembers: Record<string, Member[]> = {}
      const byOrgInvitations: Record<string, Invitation[]> = {}
      for (const r of rosters) {
        byOrgMembers[r.orgId] = r.members
        byOrgInvitations[r.orgId] = r.invitations
      }
      setMembersByOrg(byOrgMembers)
      setInvitationsByOrg(byOrgInvitations)
      setMembers(current ? byOrgMembers[current.id] ?? [] : [])
      setInvitations(current ? byOrgInvitations[current.id] ?? [] : [])
    } catch {
      setActiveOrg(null)
      setOrgs([])
      setMembers([])
      setInvitations([])
      setMembersByOrg({})
      setInvitationsByOrg({})
    } finally {
      setLoading(false)
    }
  }, [setActiveOrg, setOrgs])

  useEffect(() => {
    refresh()
  }, [refresh])

  const invite = useCallback(
    async (email: string, role: MembershipRole = 'user', orgId?: string) => {
      const invitation = await window.electronAPI.org.invite(email, role, orgId)
      await refresh()
      return invitation
    },
    [refresh],
  )

  const createOrg = useCallback(
    async (name: string) => {
      const orgId = await window.electronAPI.org.create(name)
      await refresh()
      return orgId
    },
    [refresh],
  )

  const deleteInvitation = useCallback(
    async (id: string) => {
      await window.electronAPI.org.deleteInvitation(id)
      await refresh()
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

  const removeMember = useCallback(
    async (orgId: string, userId: string) => {
      await window.electronAPI.org.removeMember(orgId, userId)
      await refresh()
    },
    [refresh],
  )

  const updateRole = useCallback(
    async (orgId: string, userId: string, role: MembershipRole) => {
      await window.electronAPI.org.updateRole(orgId, userId, role)
      await refresh()
    },
    [refresh],
  )

  const leaveOrg = useCallback(
    async (orgId: string) => {
      await window.electronAPI.org.leave(orgId)
      await refresh()
    },
    [refresh],
  )

  const archiveOrg = useCallback(
    async (orgId: string) => {
      await window.electronAPI.org.archive(orgId)
      await refresh()
    },
    [refresh],
  )

  return {
    org: activeOrg,
    orgs,
    members,
    invitations,
    membersByOrg,
    invitationsByOrg,
    loading,
    refresh,
    invite,
    createOrg,
    deleteInvitation,
    accept,
    removeMember,
    updateRole,
    leaveOrg,
    archiveOrg,
  }
}
