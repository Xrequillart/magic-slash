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
  const setConfig = useStore((s) => s.setConfig)

  const [members, setMembers] = useState<Member[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const current = await window.electronAPI.org.current()
      setActiveOrg(current)
      setOrgs(await window.electronAPI.org.list().catch(() => []))
      if (current) {
        setMembers(await window.electronAPI.org.members().catch(() => []))
        // Invitations are admin-only; a non-admin read simply yields [].
        setInvitations(await window.electronAPI.org.invitations().catch(() => []))
      } else {
        setMembers([])
        setInvitations([])
      }
    } catch {
      setActiveOrg(null)
      setOrgs([])
      setMembers([])
      setInvitations([])
    } finally {
      setLoading(false)
    }
  }, [setActiveOrg, setOrgs])

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

  const switchOrg = useCallback(
    async (orgId: string) => {
      // switchOrg re-applies the org's shared config (replace semantics) and
      // returns the updated local config — reflect it in the store immediately.
      const config = await window.electronAPI.org.switch(orgId)
      if (config) setConfig(config)
      await refresh()
    },
    [refresh, setConfig],
  )

  return {
    org: activeOrg,
    orgs,
    members,
    invitations,
    loading,
    refresh,
    invite,
    accept,
    removeMember,
    updateRole,
    leaveOrg,
    archiveOrg,
    switchOrg,
  }
}
