import { useState, useEffect, useCallback } from 'react'
import type { Invitation, Member, MembershipRole } from '../../types'
import { useStore } from '../store'
import { useAuth } from './useAuth'

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

/**
 * Hydrate the store's organization list, for the views that READ it without being
 * the page that manages it.
 *
 * `orgs` is global state, but it used to be filled only as a side effect of mounting
 * a page that called `useOrg()` — the account's Organization tab, a repository's
 * detail. That held while the settings modal opened on the account tab, which mounted
 * one of them every time; the day settings opened straight onto the repository list,
 * nothing fetched the list any more and every TEAM repository vanished from that page,
 * because it groups by `orgs` and `orgs` was still `[]`.
 *
 * So the fetch belongs at the top of the app, once, rather than hanging off whichever
 * page happened to need it first. It re-runs when the signed-in state changes: signing
 * in has to bring the orgs in, and signing out has to clear them.
 *
 * The roster reads stay in `useOrg` — members and invitations are one round trip per
 * org and only the pages that draw them should pay for that.
 */
export function useOrgList(): void {
  const { status } = useAuth()
  const setActiveOrg = useStore((s) => s.setActiveOrg)
  const setOrgs = useStore((s) => s.setOrgs)

  const signedIn = status.enabled && status.loggedIn

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const [current, list] = await Promise.all([
          window.electronAPI.org.current(),
          window.electronAPI.org.list(),
        ])
        if (cancelled) return
        setActiveOrg(current)
        setOrgs(list)
      } catch {
        if (cancelled) return
        setActiveOrg(null)
        setOrgs([])
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [signedIn, setActiveOrg, setOrgs])
}
