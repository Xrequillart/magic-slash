import { useState, useCallback } from 'react'
import { Cloud, Users, Mail, LogOut, Copy, Check, Loader2, Building2, Trash2, AlertTriangle, Archive, X, Plus, UserPlus, ArrowRightLeft } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useOrg } from '../../hooks/useOrg'
import { Modal } from '../../components/Modal'
import { RoleSelect } from './RoleSelect'
import { SectionHeader } from './SectionHeader'
import { showToast } from '../../components/Toast'
import { useT } from '../../i18n'
import type { MessageKey, Translate } from '../../i18n'
import type { Invitation, Member, MembershipRole, Org } from '../../../types'

/**
 * Enum values from the database, rendered as-is before: `role` and invitation
 * `status` are shown to the user, so they need a catalogue entry each. Both fall
 * back to the raw value — a status the desktop app does not know yet (a newer
 * backend) must still render, rather than showing an empty badge.
 */
const ROLE_KEYS: Record<MembershipRole, MessageKey> = {
  admin: 'org.role.admin',
  user: 'org.role.user',
}

const INVITE_STATUS_KEYS: Record<string, MessageKey> = {
  pending: 'org.inviteStatus.pending',
  accepted: 'org.inviteStatus.accepted',
  expired: 'org.inviteStatus.expired',
  revoked: 'org.inviteStatus.revoked',
}

function roleLabel(role: MembershipRole, t: Translate): string {
  const key = ROLE_KEYS[role]
  return key ? t(key) : role
}

function inviteStatusLabel(status: string, t: Translate): string {
  const key = INVITE_STATUS_KEYS[status]
  return key ? t(key) : status
}

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
  const t = useT()
  const isAdmin = org.role === 'admin'
  // An accepted invitation is a member now — it is already listed (with its role
  // and actions) in Members just above, so repeating it here is pure noise. Only
  // invitations that still need attention are shown: pending, expired, revoked.
  const openInvitations = invitations.filter((inv) => inv.status !== 'accepted')
  const adminCount = members.filter((m) => m.role === 'admin').length
  // Sole admin: the last admin cannot leave without locking everyone out — they
  // must promote someone or archive the org instead.
  const isSoleAdmin = isAdmin && adminCount <= 1

  return (
    <div className="bg-surface border border-line-strong rounded-xl overflow-hidden">
      {/* Identity */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-line-subtle">
        <div className="p-1.5 bg-accent/10 rounded-lg shrink-0">
          <Building2 className="w-4 h-4 text-accent" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium truncate">{org.name}</div>
        </div>
        {isActive ? (
          <span className="flex items-center h-7 px-2 rounded-lg text-[11px] font-medium bg-green/10 text-green shrink-0">
            {t('org.active')}
          </span>
        ) : (
          <button
            onClick={() => onSwitch(org.id)}
            disabled={switching}
            className="flex items-center gap-1.5 h-7 px-2 text-[11px] font-medium text-text-secondary bg-surface border border-line rounded-lg hover:bg-surface-strong hover:text-ink transition-all disabled:opacity-40 shrink-0"
            title={t('org.switchToTitle')}
          >
            {switching ? <Loader2 className="w-3 h-3 animate-spin" /> : <ArrowRightLeft className="w-3 h-3" />}
            {t('org.switchTo')}
          </button>
        )}
      </div>

      {/* Members */}
      <div className="px-4 py-3 border-b border-line-subtle">
        <CardSection label={t('org.members')} count={members.length} />
        {members.length === 0 ? (
          <div className="text-xs text-text-secondary/40 py-1">{t('org.membersEmpty')}</div>
        ) : (
          <div className="-mx-1 overflow-x-auto">
            <table className="w-full min-w-[22rem] border-collapse text-left">
              {/* Headers are visually hidden: the rows read fine without them,
                  but a screen reader still needs the columns named. */}
              <thead className="sr-only">
                <tr>
                  <th scope="col">{t('org.colMember')}</th>
                  <th scope="col">{t('org.colRole')}</th>
                  {isAdmin && <th scope="col">{t('org.colActions')}</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-line-subtle">
                {members.map((m) => {
                  const isSelf = m.userId === currentUserId
                  const rowBusy = busyMember === m.userId
                  return (
                    <tr key={m.userId}>
                      {/* max-w-0 lets a long email truncate instead of widening
                          the column past the card. */}
                      <td className="max-w-0 px-1 py-2">
                        <span className="block truncate text-sm">
                          {m.email ?? m.userId}
                          {isSelf && <span className="text-text-secondary/40">{t('org.you')}</span>}
                        </span>
                      </td>
                      <td className="w-px whitespace-nowrap px-1 py-2">
                        {rowBusy ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-text-secondary/50" />
                        ) : isAdmin ? (
                          <RoleSelect value={m.role} onChange={(role) => onChangeRole(org.id, m.userId, role)} />
                        ) : (
                          <span className={`inline-flex items-center h-7 px-2 rounded-lg text-[11px] font-medium ${
                            m.role === 'admin' ? 'bg-accent/15 text-accent' : 'bg-surface-strong text-text-secondary'
                          }`}>
                            {roleLabel(m.role, t)}
                          </span>
                        )}
                      </td>
                      {isAdmin && (
                        <td className="w-px px-1 py-2">
                          {/* Removing yourself is what "Leave organization" is for. */}
                          {!isSelf && !rowBusy && (
                            <button
                              onClick={() => onRemoveMember(org.id, m.userId)}
                              className="flex items-center justify-center h-7 w-7 shrink-0 text-text-secondary/60 bg-surface border border-line rounded-lg hover:text-red hover:border-red/20 hover:bg-red/10 transition-all"
                              title={t('org.removeMember')}
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Invitations (admin only — a non-admin read yields [] anyway) */}
      {isAdmin && (
        <div className="px-4 py-3 border-b border-line-subtle">
          <CardSection
            label={t('org.invitations')}
            count={openInvitations.length}
            action={
              <button
                onClick={() => onInvite(org)}
                className="flex items-center gap-1.5 h-7 px-2 text-[11px] font-medium text-text-secondary bg-surface border border-line rounded-lg hover:bg-surface-strong hover:text-ink transition-all"
              >
                <UserPlus className="w-3 h-3" />
                {t('org.invite')}
              </button>
            }
          />
          {openInvitations.length === 0 ? (
            <div className="text-xs text-text-secondary/40 py-1">{t('org.invitationsEmpty')}</div>
          ) : (
            <div className="space-y-1">
              {openInvitations.map((inv) => (
                <div key={inv.id} className="flex items-center gap-2 text-sm py-0.5">
                  <span className="flex-1 truncate min-w-0">{inv.email}</span>
                  <span className={`flex items-center h-7 px-2 rounded-lg text-[11px] font-medium ${
                    inv.status === 'pending' ? 'bg-yellow/10 text-yellow' : 'bg-surface-strong text-text-secondary'
                  }`}>
                    {inviteStatusLabel(inv.status, t)}
                  </span>
                  {inv.status === 'pending' && (
                    <button
                      onClick={() => onCopyToken(inv.token)}
                      className="flex items-center gap-1 h-7 px-2 text-[11px] font-medium text-text-secondary bg-surface border border-line rounded-lg hover:bg-surface-strong hover:text-ink transition-all"
                      title={t('org.copyInviteLink')}
                    >
                      {copiedToken === inv.token ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      {copiedToken === inv.token ? t('common.copied') : t('org.inviteLink')}
                    </button>
                  )}
                  <button
                    onClick={() => onDeleteInvitation(inv.id)}
                    disabled={deletingInvite === inv.id}
                    className="flex items-center justify-center h-7 w-7 shrink-0 text-text-secondary/60 bg-surface border border-line rounded-lg hover:text-red hover:border-red/20 hover:bg-red/10 transition-all disabled:opacity-50"
                    title={t('org.deleteInvitation')}
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
            {t('org.soleAdmin')}
          </p>
        ) : (
          <button
            onClick={() => onLeave(org.id)}
            disabled={leaving}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-secondary border border-line rounded-lg hover:bg-surface-strong hover:text-ink transition-all disabled:opacity-40"
          >
            {leaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LogOut className="w-3.5 h-3.5" />}
            {t('org.leave')}
          </button>
        )}
        {isAdmin && (
          <button
            onClick={() => onArchive(org)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red border border-red/20 rounded-lg hover:bg-red/10 transition-all ml-auto"
          >
            <Archive className="w-3.5 h-3.5" />
            {t('org.archive')}
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
  const t = useT()
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
      showToast(t('toast.roleUpdated'), 'success')
    } catch (e) {
      showToast(e instanceof Error ? e.message : t('toast.roleUpdateFailed'), 'error')
    } finally {
      setBusyMember(null)
    }
  }, [updateRole])

  const handleRemoveMember = useCallback(async (orgId: string, userId: string) => {
    setBusyMember(userId)
    try {
      await removeMember(orgId, userId)
      showToast(t('toast.memberRemoved'), 'success')
    } catch (e) {
      showToast(e instanceof Error ? e.message : t('toast.memberRemoveFailed'), 'error')
    } finally {
      setBusyMember(null)
    }
  }, [removeMember])

  const handleLeave = useCallback(async (orgId: string) => {
    setLeavingOrgId(orgId)
    try {
      await leaveOrg(orgId)
      showToast(t('toast.orgLeft'), 'success')
    } catch (e) {
      showToast(e instanceof Error ? e.message : t('toast.orgLeaveFailed'), 'error')
    } finally {
      setLeavingOrgId(null)
    }
  }, [leaveOrg])

  const handleSwitch = useCallback(async (orgId: string) => {
    setSwitchingOrgId(orgId)
    try {
      await switchOrg(orgId)
      showToast(t('toast.orgSwitched'), 'success')
    } catch (e) {
      showToast(e instanceof Error ? e.message : t('toast.orgSwitchFailed'), 'error')
    } finally {
      setSwitchingOrgId(null)
    }
  }, [switchOrg])

  const handleArchive = useCallback(async () => {
    if (!archiveOrgTarget || archiving) return
    setArchiving(true)
    try {
      await archiveOrg(archiveOrgTarget.id)
      showToast(t('toast.orgArchived'), 'success')
      setArchiveOrgTarget(null)
    } catch (e) {
      showToast(e instanceof Error ? e.message : t('toast.orgArchiveFailed'), 'error')
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
      showToast(t('toast.invitationCreated'), 'success')
      setInviteOrg(null)
    } catch (e) {
      showToast(e instanceof Error ? e.message : t('toast.invitationCreateFailed'), 'error')
    } finally {
      setInviting(false)
    }
  }, [inviteOrg, inviting, inviteEmail, inviteRole, invite])

  const handleCreate = useCallback(async () => {
    if (creating || !createName.trim()) return
    setCreating(true)
    try {
      await createOrg(createName.trim())
      showToast(t('toast.orgCreated', { name: createName.trim() }), 'success')
      setShowCreate(false)
      setCreateName('')
    } catch (e) {
      showToast(e instanceof Error ? e.message : t('toast.orgCreateFailed'), 'error')
    } finally {
      setCreating(false)
    }
  }, [creating, createName, createOrg])

  const handleJoin = useCallback(async () => {
    if (joining || !joinToken.trim()) return
    setJoining(true)
    try {
      await accept(extractInviteToken(joinToken))
      showToast(t('toast.orgJoined'), 'success')
      setShowJoin(false)
      setJoinToken('')
    } catch (e) {
      showToast(e instanceof Error ? e.message : t('toast.orgJoinFailed'), 'error')
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
      showToast(t('toast.invitationDeleted'), 'success')
    } catch (e) {
      showToast(e instanceof Error ? e.message : t('toast.invitationDeleteFailed'), 'error')
    } finally {
      setDeletingInvite(null)
    }
  }, [deleteInvitation])

  // Cloud disabled entirely (no Supabase env baked in) → hide cloud features.
  if (!authLoading && !status.enabled) {
    return (
      <div className="flex flex-col gap-6">
        <SectionHeader icon={Cloud} title={t('org.section')} spacing="none" />
        <div className="bg-surface border border-line-strong rounded-xl p-6 text-center">
          <Cloud className="w-8 h-8 text-text-secondary/30 mx-auto mb-3" />
          <div className="text-sm text-text-secondary/60">{t('org.cloudDisabled')}</div>
          <div className="text-xs text-text-secondary/40 mt-1">{t('org.cloudDisabledHint')}</div>
        </div>
      </div>
    )
  }

  if (!status.loggedIn) {
    return (
      <div className="bg-surface border border-line-strong rounded-xl p-6 text-center">
        <Building2 className="w-8 h-8 text-text-secondary/30 mx-auto mb-3" />
        <div className="text-sm text-text-secondary/60">{t('org.signInTitle')}</div>
        <div className="text-xs text-text-secondary/40 mt-1">{t('org.signInHint')}</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <SectionHeader icon={Building2} title={t('org.sectionCount', { count: orgs.length })} spacing="none" />

      {orgLoading && orgs.length === 0 ? (
        <div className="flex items-center justify-center py-8 text-text-secondary/50">
          <Loader2 className="w-4 h-4 animate-spin" />
        </div>
      ) : orgs.length === 0 ? (
        <div className="bg-surface border border-line-strong rounded-xl p-6 text-center">
          <Users className="w-8 h-8 text-text-secondary/30 mx-auto mb-3" />
          <div className="text-sm text-text-secondary/60">{t('org.emptyTitle')}</div>
          <div className="text-xs text-text-secondary/40 mt-1">{t('org.emptyHint')}</div>
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
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-secondary bg-surface border border-line-strong rounded-lg hover:bg-surface-strong hover:text-ink transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          {t('org.create')}
        </button>
        <button
          onClick={() => { setJoinToken(''); setShowJoin(true) }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-secondary bg-surface border border-line-strong rounded-lg hover:bg-surface-strong hover:text-ink transition-all"
        >
          <UserPlus className="w-3.5 h-3.5" />
          {t('org.join')}
        </button>
      </div>

      {/* Invite a member */}
      <Modal
        isOpen={inviteOrg !== null}
        onClose={() => setInviteOrg(null)}
        title={inviteOrg ? t('org.inviteModal.title', { name: inviteOrg.name }) : t('org.inviteModal.titleFallback')}
        footer={
          <>
            <button
              onClick={() => setInviteOrg(null)}
              className="px-3 py-1.5 text-xs font-medium text-text-secondary border border-line rounded-lg hover:bg-surface-strong hover:text-ink transition-all"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={handleInvite}
              disabled={inviting || !inviteEmail.trim()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-on-brand bg-accent hover:bg-accent-hover rounded-lg transition-all disabled:opacity-40"
            >
              {inviting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
              {t('org.inviteModal.send')}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-xs text-text-secondary/60">
            {t('org.inviteModal.help')}
          </p>
          <input
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder={t('org.inviteModal.emailPlaceholder')}
            autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter') handleInvite() }}
            className="w-full px-3 py-2 bg-surface border border-line-field rounded-lg text-sm text-ink focus:outline-none focus:border-accent transition-colors placeholder:text-text-secondary/30"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-text-secondary/60">{t('org.colRole')}</span>
            <RoleSelect value={inviteRole} onChange={setInviteRole} />
          </div>
        </div>
      </Modal>

      {/* Create an organization */}
      <Modal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        title={t('org.create')}
        footer={
          <>
            <button
              onClick={() => setShowCreate(false)}
              className="px-3 py-1.5 text-xs font-medium text-text-secondary border border-line rounded-lg hover:bg-surface-strong hover:text-ink transition-all"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={handleCreate}
              disabled={creating || !createName.trim()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-on-brand bg-accent hover:bg-accent-hover rounded-lg transition-all disabled:opacity-40"
            >
              {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              {t('org.createModal.submit')}
            </button>
          </>
        }
      >
        <div className="space-y-2">
          <p className="text-xs text-text-secondary/60">
            {t('org.createModal.help')}
          </p>
          <input
            type="text"
            value={createName}
            onChange={(e) => setCreateName(e.target.value)}
            placeholder={t('org.createModal.namePlaceholder')}
            autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter') handleCreate() }}
            className="w-full px-3 py-2 bg-surface border border-line-field rounded-lg text-sm text-ink focus:outline-none focus:border-accent transition-colors placeholder:text-text-secondary/30"
          />
        </div>
      </Modal>

      {/* Join an organization */}
      <Modal
        isOpen={showJoin}
        onClose={() => setShowJoin(false)}
        title={t('org.join')}
        footer={
          <>
            <button
              onClick={() => setShowJoin(false)}
              className="px-3 py-1.5 text-xs font-medium text-text-secondary border border-line rounded-lg hover:bg-surface-strong hover:text-ink transition-all"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={handleJoin}
              disabled={joining || !joinToken.trim()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-on-brand bg-accent hover:bg-accent-hover rounded-lg transition-all disabled:opacity-40"
            >
              {joining ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
              {t('org.joinModal.submit')}
            </button>
          </>
        }
      >
        <div className="space-y-2">
          <p className="text-xs text-text-secondary/60">
            {t('org.joinModal.help')}
          </p>
          <input
            type="text"
            value={joinToken}
            onChange={(e) => setJoinToken(e.target.value)}
            placeholder={t('org.joinModal.tokenPlaceholder')}
            autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter') handleJoin() }}
            className="w-full px-3 py-2 bg-surface border border-line-field rounded-lg text-sm text-ink focus:outline-none focus:border-accent transition-colors placeholder:text-text-secondary/30"
          />
        </div>
      </Modal>

      {/* Archive organization (danger) */}
      <Modal
        isOpen={archiveOrgTarget !== null}
        onClose={() => setArchiveOrgTarget(null)}
        title={t('org.archive')}
        footer={
          <>
            <button
              onClick={() => setArchiveOrgTarget(null)}
              className="px-3 py-1.5 text-xs font-medium text-text-secondary border border-line rounded-lg hover:bg-surface-strong hover:text-ink transition-all"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={handleArchive}
              disabled={archiving}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-on-brand bg-red hover:bg-red/80 rounded-lg transition-all disabled:opacity-40"
            >
              {archiving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Archive className="w-3.5 h-3.5" />}
              {t('org.archive')}
            </button>
          </>
        }
      >
        <div className="flex items-start gap-3">
          <div className="p-2 bg-red/10 rounded-lg flex-shrink-0">
            <AlertTriangle className="w-4 h-4 text-red" />
          </div>
          <div className="space-y-1">
            <p className="text-sm text-ink">{t('org.archiveModal.confirm', { name: archiveOrgTarget?.name ?? t('org.archiveModal.thisOrganization') })}</p>
            <p className="text-xs text-text-secondary/60">
              {t('org.archiveModal.body')}
            </p>
          </div>
        </div>
      </Modal>
    </div>
  )
}
