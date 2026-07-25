import { useState, useCallback } from 'react'
import { Cloud, Users, Mail, LogOut, Copy, Check, Loader2, Building2, Trash2, AlertTriangle, Archive, X, Plus, UserPlus, ArrowRightLeft } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useOrg } from '../../hooks/useOrg'
import { Modal } from '../../components/Modal'
import { RoleSelect } from './RoleSelect'
import { SectionHeader } from './SectionHeader'
import { showToast } from '../../components/Toast'
import type { Invitation, Member, MembershipRole, Org } from '../../../types'

/** Sub-heading inside an organization card. */
function CardSection({ label, count, action }: { label: string; count?: number; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between h-5 mb-2">
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-text-secondary/50">
        <span>{label}</span>
        {count !== undefined && <span className="text-text-secondary/30">{count}</span>}
      </div>
      {action}
    </div>
  )
}

interface OrganizationCardProps {
  org: Org
  members: Member[]
  invitations: Invitation[]
  isActive: boolean
  currentUserId?: string
  busyMember: string | null
  deletingInvite: string | null
  copiedToken: string | null
  leaving: boolean
  switching: boolean
  onSwitch: (orgId: string) => void
  onInvite: (org: Org) => void
  onChangeRole: (orgId: string, userId: string, role: MembershipRole) => void
  onRemoveMember: (orgId: string, userId: string) => void
  onCopyToken: (token: string) => void
  onDeleteInvitation: (id: string) => void
  onLeave: (orgId: string) => void
  onArchive: (org: Org) => void
}

/**
 * One organization, self-contained: identity, members, invitations and the
 * destructive actions. A user can belong to several orgs, so the page renders
 * one of these per membership rather than only showing the active one.
 */
function OrganizationCard({
  org,
  members,
  invitations,
  isActive,
  currentUserId,
  busyMember,
  deletingInvite,
  copiedToken,
  leaving,
  switching,
  onSwitch,
  onInvite,
  onChangeRole,
  onRemoveMember,
  onCopyToken,
  onDeleteInvitation,
  onLeave,
  onArchive,
}: OrganizationCardProps) {
  const isAdmin = org.role === 'admin'
  const adminCount = members.filter((m) => m.role === 'admin').length
  // Sole admin: the last admin cannot leave without locking everyone out — they
  // must promote someone or archive the org instead.
  const isSoleAdmin = isAdmin && adminCount <= 1

  return (
    <div className="bg-white/[0.06] border border-white/[0.15] rounded-xl overflow-hidden">
      {/* Identity */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5">
        <div className="p-1.5 bg-accent/10 rounded-lg shrink-0">
          <Building2 className="w-4 h-4 text-accent" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium truncate">{org.name}</div>
        </div>
        {isActive ? (
          <span className="flex items-center h-7 px-2 rounded-lg text-[11px] font-medium bg-green/10 text-green shrink-0">
            Active
          </span>
        ) : (
          <button
            onClick={() => onSwitch(org.id)}
            disabled={switching}
            className="flex items-center gap-1.5 h-7 px-2 text-[11px] font-medium text-text-secondary bg-white/[0.06] border border-white/10 rounded-lg hover:bg-white/10 hover:text-white transition-all disabled:opacity-40 shrink-0"
            title="Make this the active organization"
          >
            {switching ? <Loader2 className="w-3 h-3 animate-spin" /> : <ArrowRightLeft className="w-3 h-3" />}
            Switch to
          </button>
        )}
      </div>

      {/* Members */}
      <div className="px-4 py-3 border-b border-white/5">
        <CardSection label="Members" count={members.length} />
        {members.length === 0 ? (
          <div className="text-xs text-text-secondary/40 py-1">No members yet.</div>
        ) : (
          <div className="space-y-1">
            {members.map((m) => {
              const isSelf = m.userId === currentUserId
              const rowBusy = busyMember === m.userId
              return (
                <div key={m.userId} className="flex items-center justify-between gap-2 py-0.5">
                  <span className="text-sm truncate flex-1 min-w-0">
                    {m.email ?? m.userId}
                    {isSelf && <span className="text-text-secondary/40"> (you)</span>}
                  </span>
                  {rowBusy ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-text-secondary/50" />
                  ) : isAdmin ? (
                    <div className="flex items-center gap-2">
                      <RoleSelect value={m.role} onChange={(role) => onChangeRole(org.id, m.userId, role)} />
                      {!isSelf && (
                        <button
                          onClick={() => onRemoveMember(org.id, m.userId)}
                          className="flex items-center justify-center h-7 w-7 shrink-0 text-text-secondary/60 bg-white/[0.06] border border-white/10 rounded-lg hover:text-red hover:border-red/20 hover:bg-red/10 transition-all"
                          title="Remove member"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ) : (
                    <span className={`flex items-center h-7 px-2 rounded-lg text-[11px] font-medium ${
                      m.role === 'admin' ? 'bg-accent/15 text-accent' : 'bg-white/10 text-text-secondary'
                    }`}>
                      {m.role}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Invitations (admin only — a non-admin read yields [] anyway) */}
      {isAdmin && (
        <div className="px-4 py-3 border-b border-white/5">
          <CardSection
            label="Invitations"
            count={invitations.length}
            action={
              <button
                onClick={() => onInvite(org)}
                className="flex items-center gap-1.5 h-7 px-2 text-[11px] font-medium text-text-secondary bg-white/[0.06] border border-white/10 rounded-lg hover:bg-white/10 hover:text-white transition-all"
              >
                <UserPlus className="w-3 h-3" />
                Invite
              </button>
            }
          />
          {invitations.length === 0 ? (
            <div className="text-xs text-text-secondary/40 py-1">No invitation sent.</div>
          ) : (
            <div className="space-y-1">
              {invitations.map((inv) => (
                <div key={inv.id} className="flex items-center gap-2 text-sm py-0.5">
                  <span className="flex-1 truncate min-w-0">{inv.email}</span>
                  <span className={`flex items-center h-7 px-2 rounded-lg text-[11px] font-medium ${
                    inv.status === 'pending' ? 'bg-yellow/10 text-yellow'
                      : inv.status === 'accepted' ? 'bg-green/10 text-green'
                      : 'bg-white/10 text-text-secondary'
                  }`}>
                    {inv.status}
                  </span>
                  {inv.status === 'pending' && (
                    <button
                      onClick={() => onCopyToken(inv.token)}
                      className="flex items-center gap-1 h-7 px-2 text-[11px] font-medium text-text-secondary bg-white/[0.06] border border-white/10 rounded-lg hover:bg-white/10 hover:text-white transition-all"
                      title="Copy invitation link"
                    >
                      {copiedToken === inv.token ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      {copiedToken === inv.token ? 'Copied' : 'Invite link'}
                    </button>
                  )}
                  <button
                    onClick={() => onDeleteInvitation(inv.id)}
                    disabled={deletingInvite === inv.id}
                    className="flex items-center justify-center h-7 w-7 shrink-0 text-text-secondary/60 bg-white/[0.06] border border-white/10 rounded-lg hover:text-red hover:border-red/20 hover:bg-red/10 transition-all disabled:opacity-50"
                    title="Delete invitation"
                  >
                    {deletingInvite === inv.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Danger zone */}
      <div className="px-4 py-3 flex items-center gap-2">
        {isSoleAdmin ? (
          <p className="text-xs text-text-secondary/50">
            You are the last admin. Promote another member before leaving, or archive the organization.
          </p>
        ) : (
          <button
            onClick={() => onLeave(org.id)}
            disabled={leaving}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-secondary border border-white/10 rounded-lg hover:bg-white/10 hover:text-white transition-all disabled:opacity-40"
          >
            {leaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LogOut className="w-3.5 h-3.5" />}
            Leave organization
          </button>
        )}
        {isAdmin && (
          <button
            onClick={() => onArchive(org)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red border border-red/20 rounded-lg hover:bg-red/10 transition-all ml-auto"
          >
            <Archive className="w-3.5 h-3.5" />
            Archive organization
          </button>
        )}
      </div>
    </div>
  )
}

/** Accept both a raw token and a full invite link pasted from an email. */
function extractInviteToken(input: string): string {
  const trimmed = input.trim()
  const match = trimmed.match(/\/invite\/([^/?#\s]+)/)
  return match ? match[1] : trimmed
}

export function OrgPage() {
  const { status, loading: authLoading } = useAuth()
  const {
    org: activeOrg,
    orgs,
    membersByOrg,
    invitationsByOrg,
    loading: orgLoading,
    invite,
    createOrg,
    accept,
    deleteInvitation,
    removeMember,
    updateRole,
    leaveOrg,
    archiveOrg,
    switchOrg,
  } = useOrg()

  const [copiedToken, setCopiedToken] = useState<string | null>(null)
  const [deletingInvite, setDeletingInvite] = useState<string | null>(null)
  const [busyMember, setBusyMember] = useState<string | null>(null)
  const [leavingOrgId, setLeavingOrgId] = useState<string | null>(null)
  const [switchingOrgId, setSwitchingOrgId] = useState<string | null>(null)

  // Modals. Each holds the org it acts on, so the same modal serves every card.
  const [inviteOrg, setInviteOrg] = useState<Org | null>(null)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<MembershipRole>('user')
  const [inviting, setInviting] = useState(false)

  const [archiveOrgTarget, setArchiveOrgTarget] = useState<Org | null>(null)
  const [archiving, setArchiving] = useState(false)

  const [showCreate, setShowCreate] = useState(false)
  const [createName, setCreateName] = useState('')
  const [creating, setCreating] = useState(false)

  const [showJoin, setShowJoin] = useState(false)
  const [joinToken, setJoinToken] = useState('')
  const [joining, setJoining] = useState(false)

  const currentUserId = status.user?.id

  const handleChangeRole = useCallback(async (orgId: string, userId: string, role: MembershipRole) => {
    setBusyMember(userId)
    try {
      await updateRole(orgId, userId, role)
      showToast('Role updated', 'success')
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to update role', 'error')
    } finally {
      setBusyMember(null)
    }
  }, [updateRole])

  const handleRemoveMember = useCallback(async (orgId: string, userId: string) => {
    setBusyMember(userId)
    try {
      await removeMember(orgId, userId)
      showToast('Member removed', 'success')
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to remove member', 'error')
    } finally {
      setBusyMember(null)
    }
  }, [removeMember])

  const handleLeave = useCallback(async (orgId: string) => {
    setLeavingOrgId(orgId)
    try {
      await leaveOrg(orgId)
      showToast('You left the organization', 'success')
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to leave organization', 'error')
    } finally {
      setLeavingOrgId(null)
    }
  }, [leaveOrg])

  const handleSwitch = useCallback(async (orgId: string) => {
    setSwitchingOrgId(orgId)
    try {
      await switchOrg(orgId)
      showToast('Switched organization', 'success')
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to switch organization', 'error')
    } finally {
      setSwitchingOrgId(null)
    }
  }, [switchOrg])

  const handleArchive = useCallback(async () => {
    if (!archiveOrgTarget || archiving) return
    setArchiving(true)
    try {
      await archiveOrg(archiveOrgTarget.id)
      showToast('Organization archived', 'success')
      setArchiveOrgTarget(null)
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to archive organization', 'error')
    } finally {
      setArchiving(false)
    }
  }, [archiveOrgTarget, archiving, archiveOrg])

  const openInvite = useCallback((org: Org) => {
    setInviteOrg(org)
    setInviteEmail('')
    setInviteRole('user')
  }, [])

  const handleInvite = useCallback(async () => {
    if (!inviteOrg || inviting || !inviteEmail.trim()) return
    setInviting(true)
    try {
      await invite(inviteEmail.trim(), inviteRole, inviteOrg.id)
      showToast('Invitation created', 'success')
      setInviteOrg(null)
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to create invitation', 'error')
    } finally {
      setInviting(false)
    }
  }, [inviteOrg, inviting, inviteEmail, inviteRole, invite])

  const handleCreate = useCallback(async () => {
    if (creating || !createName.trim()) return
    setCreating(true)
    try {
      await createOrg(createName.trim())
      showToast(`Organization "${createName.trim()}" created`, 'success')
      setShowCreate(false)
      setCreateName('')
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to create organization', 'error')
    } finally {
      setCreating(false)
    }
  }, [creating, createName, createOrg])

  const handleJoin = useCallback(async () => {
    if (joining || !joinToken.trim()) return
    setJoining(true)
    try {
      await accept(extractInviteToken(joinToken))
      showToast('You joined the organization', 'success')
      setShowJoin(false)
      setJoinToken('')
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to join organization', 'error')
    } finally {
      setJoining(false)
    }
  }, [joining, joinToken, accept])

  const handleCopyToken = useCallback((token: string) => {
    const link = `https://app.magic-slash.io/invite/${token}`
    navigator.clipboard.writeText(link).then(() => {
      setCopiedToken(token)
      setTimeout(() => setCopiedToken(null), 1500)
    }).catch(() => {})
  }, [])

  const handleDeleteInvitation = useCallback(async (id: string) => {
    setDeletingInvite(id)
    try {
      await deleteInvitation(id)
      showToast('Invitation deleted', 'success')
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to delete invitation', 'error')
    } finally {
      setDeletingInvite(null)
    }
  }, [deleteInvitation])

  // Cloud disabled entirely (no Supabase env baked in) → hide cloud features.
  if (!authLoading && !status.enabled) {
    return (
      <div className="flex flex-col gap-6">
        <SectionHeader icon={Cloud} title="Organization" spacing="none" />
        <div className="bg-white/[0.06] border border-white/[0.15] rounded-xl p-6 text-center">
          <Cloud className="w-8 h-8 text-text-secondary/30 mx-auto mb-3" />
          <div className="text-sm text-text-secondary/60">Cloud features are not configured in this build.</div>
          <div className="text-xs text-text-secondary/40 mt-1">Magic Slash works fully offline — no account required.</div>
        </div>
      </div>
    )
  }

  if (!status.loggedIn) {
    return (
      <div className="bg-white/[0.06] border border-white/[0.15] rounded-xl p-6 text-center">
        <Building2 className="w-8 h-8 text-text-secondary/30 mx-auto mb-3" />
        <div className="text-sm text-text-secondary/60">Sign in to manage your organization.</div>
        <div className="text-xs text-text-secondary/40 mt-1">Settings → Account → Cloud account.</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <SectionHeader icon={Building2} title={`Organizations (${orgs.length})`} spacing="none" />

      {orgLoading && orgs.length === 0 ? (
        <div className="flex items-center justify-center py-8 text-text-secondary/50">
          <Loader2 className="w-4 h-4 animate-spin" />
        </div>
      ) : orgs.length === 0 ? (
        <div className="bg-white/[0.06] border border-white/[0.15] rounded-xl p-6 text-center">
          <Users className="w-8 h-8 text-text-secondary/30 mx-auto mb-3" />
          <div className="text-sm text-text-secondary/60">You do not belong to any organization.</div>
          <div className="text-xs text-text-secondary/40 mt-1">Create one, or join with an invitation.</div>
        </div>
      ) : (
        orgs.map((o) => (
          <OrganizationCard
            key={o.id}
            org={o}
            members={membersByOrg[o.id] ?? []}
            invitations={invitationsByOrg[o.id] ?? []}
            isActive={o.id === activeOrg?.id}
            currentUserId={currentUserId}
            busyMember={busyMember}
            deletingInvite={deletingInvite}
            copiedToken={copiedToken}
            leaving={leavingOrgId === o.id}
            switching={switchingOrgId === o.id}
            onSwitch={handleSwitch}
            onInvite={openInvite}
            onChangeRole={handleChangeRole}
            onRemoveMember={handleRemoveMember}
            onCopyToken={handleCopyToken}
            onDeleteInvitation={handleDeleteInvitation}
            onLeave={handleLeave}
            onArchive={setArchiveOrgTarget}
          />
        ))
      )}

      {/* Create / join */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => { setCreateName(''); setShowCreate(true) }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-secondary bg-white/[0.06] border border-white/[0.15] rounded-lg hover:bg-white/[0.12] hover:text-white transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          Create an organization
        </button>
        <button
          onClick={() => { setJoinToken(''); setShowJoin(true) }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-secondary bg-white/[0.06] border border-white/[0.15] rounded-lg hover:bg-white/[0.12] hover:text-white transition-all"
        >
          <UserPlus className="w-3.5 h-3.5" />
          Join an organization
        </button>
      </div>

      {/* Invite a member */}
      <Modal
        isOpen={inviteOrg !== null}
        onClose={() => setInviteOrg(null)}
        title={inviteOrg ? `Invite to ${inviteOrg.name}` : 'Invite'}
        footer={
          <>
            <button
              onClick={() => setInviteOrg(null)}
              className="px-3 py-1.5 text-xs font-medium text-text-secondary border border-white/10 rounded-lg hover:bg-white/10 hover:text-white transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleInvite}
              disabled={inviting || !inviteEmail.trim()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-accent hover:bg-accent-hover rounded-lg transition-all disabled:opacity-40"
            >
              {inviting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
              Send invitation
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-xs text-text-secondary/60">
            An invitation link is generated — copy it from the list and send it to your colleague.
          </p>
          <input
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="colleague@example.com"
            autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter') handleInvite() }}
            className="w-full px-3 py-2 bg-white/[0.06] border border-white/[0.08] rounded-lg text-sm text-white focus:outline-none focus:border-accent transition-colors placeholder:text-text-secondary/30"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-text-secondary/60">Role</span>
            <RoleSelect value={inviteRole} onChange={setInviteRole} />
          </div>
        </div>
      </Modal>

      {/* Create an organization */}
      <Modal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        title="Create an organization"
        footer={
          <>
            <button
              onClick={() => setShowCreate(false)}
              className="px-3 py-1.5 text-xs font-medium text-text-secondary border border-white/10 rounded-lg hover:bg-white/10 hover:text-white transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={creating || !createName.trim()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-accent hover:bg-accent-hover rounded-lg transition-all disabled:opacity-40"
            >
              {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              Create
            </button>
          </>
        }
      >
        <div className="space-y-2">
          <p className="text-xs text-text-secondary/60">
            You become its admin. It is not made active — use “Switch to” on the card when you want to work in it.
          </p>
          <input
            type="text"
            value={createName}
            onChange={(e) => setCreateName(e.target.value)}
            placeholder="Organization name"
            autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter') handleCreate() }}
            className="w-full px-3 py-2 bg-white/[0.06] border border-white/[0.08] rounded-lg text-sm text-white focus:outline-none focus:border-accent transition-colors placeholder:text-text-secondary/30"
          />
        </div>
      </Modal>

      {/* Join an organization */}
      <Modal
        isOpen={showJoin}
        onClose={() => setShowJoin(false)}
        title="Join an organization"
        footer={
          <>
            <button
              onClick={() => setShowJoin(false)}
              className="px-3 py-1.5 text-xs font-medium text-text-secondary border border-white/10 rounded-lg hover:bg-white/10 hover:text-white transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleJoin}
              disabled={joining || !joinToken.trim()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-accent hover:bg-accent-hover rounded-lg transition-all disabled:opacity-40"
            >
              {joining ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
              Join
            </button>
          </>
        }
      >
        <div className="space-y-2">
          <p className="text-xs text-text-secondary/60">
            Paste the invitation link you received, or just its token.
          </p>
          <input
            type="text"
            value={joinToken}
            onChange={(e) => setJoinToken(e.target.value)}
            placeholder="https://app.magic-slash.io/invite/…"
            autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter') handleJoin() }}
            className="w-full px-3 py-2 bg-white/[0.06] border border-white/[0.08] rounded-lg text-sm text-white focus:outline-none focus:border-accent transition-colors placeholder:text-text-secondary/30"
          />
        </div>
      </Modal>

      {/* Archive organization (danger) */}
      <Modal
        isOpen={archiveOrgTarget !== null}
        onClose={() => setArchiveOrgTarget(null)}
        title="Archive organization"
        footer={
          <>
            <button
              onClick={() => setArchiveOrgTarget(null)}
              className="px-3 py-1.5 text-xs font-medium text-text-secondary border border-white/10 rounded-lg hover:bg-white/10 hover:text-white transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleArchive}
              disabled={archiving}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-red hover:bg-red/80 rounded-lg transition-all disabled:opacity-40"
            >
              {archiving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Archive className="w-3.5 h-3.5" />}
              Archive organization
            </button>
          </>
        }
      >
        <div className="flex items-start gap-3">
          <div className="p-2 bg-red/10 rounded-lg flex-shrink-0">
            <AlertTriangle className="w-4 h-4 text-red" />
          </div>
          <div className="space-y-1">
            <p className="text-sm text-white">Archive {archiveOrgTarget?.name ?? 'this organization'}?</p>
            <p className="text-xs text-text-secondary/60">
              The organization and its members lose access — it disappears for everyone. Its data is retained, not deleted, but this cannot be undone from the app.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  )
}
