import { useState, useCallback, useMemo } from 'react'
import { Cloud, Users, Mail, Loader2, Building2, AlertTriangle, Archive, Plus, UserPlus } from '@ds/desktop/icons'
import { useAuth } from '../../hooks/useAuth'
import { useOrg } from '../../hooks/useOrg'
import { useMemberAvatars } from '../../hooks/useMemberAvatars'
import { useStore } from '../../store'
import { Modal } from '../../components/Modal'
import { RoleSelect, roleOptions } from './RoleSelect'
import { Input, OrganizationCard, SectionHeader, TabStrip } from '@ds/desktop'
import { TabSweep } from '../../components/TabSweep'
import { showToast } from '../../components/Toast'
import { useT } from '../../i18n'
import type { MessageKey, Translate } from '../../i18n'
import type { MembershipRole, Org } from '../../../types'
import { extractInviteToken, inviteLink } from '../../../urls'

/**
 * Which organization is open, given the user's pick and the list as it stands.
 *
 * Exported because the settings rail lists the organizations too and has to mark
 * the same one — and this is a FALLBACK, not a lookup: leaving or archiving the
 * open organization drops it from the list, and a rule applied in one place but
 * not the other would light a rail entry the page is not showing.
 */
export function resolveActiveOrgId(orgs: Org[], selected: string | null): string | undefined {
  if (selected && orgs.some((o) => o.id === selected)) return selected
  return orgs[0]?.id
}

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

/**
 * THE CARD IS `OrganizationCard` NOW, in the design system, and what is left in this file
 * is the wiring: the hooks, the six handlers, the four modals and the translator.
 *
 * It went whole — the identity band, the members table, the invitations and the two ways
 * out. What went with it is what was never about an organization: seven hand-built
 * controls, three plates spelled out here, and two roster pills with their own idea of
 * what an accent tint is. WHO MAY DO WHAT STAYS HERE, and it crosses over as the presence
 * or absence of a handler — a non-admin is handed no invitations, no role options and no
 * remove button, rather than a permission the design system would have to interpret.
 */

export function OrgPage() {
  const { status, loading: authLoading } = useAuth()
  const t = useT()
  const {
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
  } = useOrg()

  // Every org's faces, fetched once for the page rather than once per card: a person
  // in two orgs is one entry, and the main process caches the bytes behind this.
  const memberAvatars = useMemberAvatars(useMemo(() => orgs.map((o) => o.id), [orgs]))

  const [copiedToken, setCopiedToken] = useState<string | null>(null)
  const [deletingInvite, setDeletingInvite] = useState<string | null>(null)
  const [busyMember, setBusyMember] = useState<string | null>(null)
  const [leavingOrgId, setLeavingOrgId] = useState<string | null>(null)

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

  // Which organization's card is open. In the store rather than in this
  // component: the settings rail lists the organizations as well, and the two
  // have to agree on which one is showing.
  const settingsOrgId = useStore((s) => s.settingsOrgId)
  const setSettingsOrgId = useStore((s) => s.setSettingsOrgId)
  const activeOrgId = useMemo(() => resolveActiveOrgId(orgs, settingsOrgId), [orgs, settingsOrgId])


  // One organization at a time once there are several to choose from. Below two,
  // there is nothing to switch between, so the list renders whole and no strip
  // appears — a single tab is a label pretending to be a control.
  const visibleOrgs = orgs.length > 1 ? orgs.filter((o) => o.id === activeOrgId) : orgs

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
    const link = inviteLink(token)
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
          <Cloud className="w-8 h-8 text-icon-muted mx-auto mb-3" />
          <div className="text-sm text-text-secondary/60">{t('org.cloudDisabled')}</div>
          <div className="text-xs text-text-secondary/40 mt-1">{t('org.cloudDisabledHint')}</div>
        </div>
      </div>
    )
  }

  if (!status.loggedIn) {
    return (
      <div className="bg-surface border border-line-strong rounded-xl p-6 text-center">
        <Building2 className="w-8 h-8 text-icon-muted mx-auto mb-3" />
        <div className="text-sm text-text-secondary/60">{t('org.signInTitle')}</div>
        <div className="text-xs text-text-secondary/40 mt-1">{t('org.signInHint')}</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <SectionHeader
        icon={Building2}
        // The figure is `SectionHeader`'s and not part of the words, which is what the
        // repository lists one tab over already do: a count inside the title is a count
        // in the title's ink, and it reads as part of the name of the section rather
        // than as how many things are under it.
        title={t('org.sectionPlural')}
        count={orgs.length}
        spacing="none"
        actions={[
          { id: 'create', label: t('org.create'), icon: Plus, onClick: () => { setCreateName(''); setShowCreate(true) } },
          { id: 'join', label: t('org.join'), icon: UserPlus, onClick: () => { setJoinToken(''); setShowJoin(true) } },
        ]}
      />

      {orgLoading && orgs.length === 0 ? (
        <div className="flex items-center justify-center py-8 text-icon">
          <Loader2 className="w-4 h-4 animate-spin" />
        </div>
      ) : orgs.length === 0 ? (
        <div className="bg-surface border border-line-strong rounded-xl p-6 text-center">
          <Users className="w-8 h-8 text-icon-muted mx-auto mb-3" />
          <div className="text-sm text-text-secondary/60">{t('org.emptyTitle')}</div>
          <div className="text-xs text-text-secondary/40 mt-1">{t('org.emptyHint')}</div>
        </div>
      ) : (
        <>
          {orgs.length > 1 && (
            <TabStrip
              ariaLabel={t('org.section')}
              items={orgs.map((o) => ({ key: o.id, label: o.name }))}
              activeKey={activeOrgId}
              onSelect={setSettingsOrgId}
            />
          )}
          {/* The card travels the way the strip does — a tab further right arrives from
              the right. `order` is the tab order, which is the order the organizations
              are listed in, not the order of `visibleOrgs`: that one is filtered down to
              the active tab and knows nothing about which side the previous one was on. */}
          <TabSweep tabKey={activeOrgId} order={orgs.map((o) => o.id)} className="flex flex-col gap-4">
          {visibleOrgs.map((o) => {
            const orgMembers = membersByOrg[o.id] ?? []
            const isAdmin = o.role === 'admin'
            // Sole admin: the last admin cannot leave without locking everyone out — they
            // must promote someone or archive the organization instead. The card draws
            // the sentence where the Leave button would be; which of the two it gets is
            // decided here, because counting admins is not a card's job.
            const isSoleAdmin = isAdmin && orgMembers.filter((m) => m.role === 'admin').length <= 1
            // An accepted invitation is a member now — it is already listed above, with
            // its role and its actions, so repeating it here is pure noise. Only the ones
            // that still need attention are shown: pending, expired, revoked.
            const openInvitations = (invitationsByOrg[o.id] ?? []).filter((inv) => inv.status !== 'accepted')

            return (
              <OrganizationCard
                key={o.id}
                name={o.name}
                members={{
                  label: t('org.members'),
                  empty: t('org.membersEmpty'),
                  columns: {
                    member: t('org.colMember'),
                    role: t('org.colRole'),
                    actions: t('org.colActions'),
                  },
                  rows: orgMembers.map((m) => {
                    const isSelf = m.userId === currentUserId
                    return {
                      id: m.userId,
                      name: m.email ?? m.userId,
                      note: isSelf ? t('org.you') : undefined,
                      // The whole app's worth of faces, keyed on the PERSON: a colleague
                      // in two organizations is one entry, fetched once for the page.
                      avatar: memberAvatars[m.userId] ?? null,
                      role: m.role,
                      roleLabel: roleLabel(m.role, t),
                      roleStrong: m.role === 'admin',
                      // Only an admin may change a role, and the picker is simply absent
                      // otherwise — the pill takes its place.
                      roleOptions: isAdmin ? roleOptions(t) : undefined,
                      onRoleChange: isAdmin
                        ? (role: string) => handleChangeRole(o.id, m.userId, role as MembershipRole)
                        : undefined,
                      busy: busyMember === m.userId,
                      // Removing yourself is what "Leave organization" is for.
                      remove: isAdmin && !isSelf
                        ? { title: t('org.removeMember'), onClick: () => handleRemoveMember(o.id, m.userId) }
                        : undefined,
                    }
                  }),
                }}
                // Admin only, and absent rather than empty for a member: a non-admin read
                // yields [] anyway, so a band drawn from it would say "no invitation" to
                // somebody who is not allowed to know.
                invitations={isAdmin ? {
                  label: t('org.invitations'),
                  empty: t('org.invitationsEmpty'),
                  invite: { label: t('org.invite'), onClick: () => openInvite(o) },
                  rows: openInvitations.map((inv) => ({
                    id: inv.id,
                    email: inv.email,
                    status: inviteStatusLabel(inv.status, t),
                    pending: inv.status === 'pending',
                    copy: inv.status === 'pending' ? {
                      label: t('org.inviteLink'),
                      copiedLabel: t('common.copied'),
                      title: t('org.copyInviteLink'),
                      copied: copiedToken === inv.token,
                      onClick: () => handleCopyToken(inv.token),
                    } : undefined,
                    remove: {
                      title: t('org.deleteInvitation'),
                      busy: deletingInvite === inv.id,
                      onClick: () => handleDeleteInvitation(inv.id),
                    },
                  })),
                } : undefined}
                leave={isSoleAdmin ? undefined : {
                  label: t('org.leave'),
                  busy: leavingOrgId === o.id,
                  onClick: () => handleLeave(o.id),
                }}
                note={isSoleAdmin ? t('org.soleAdmin') : undefined}
                archive={isAdmin ? { label: t('org.archive'), onClick: () => setArchiveOrgTarget(o) } : undefined}
              />
            )
          })}
          </TabSweep>
        </>
      )}

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
          <Input
            type="email"
            value={inviteEmail}
            onChange={setInviteEmail}
            placeholder={t('org.inviteModal.emailPlaceholder')}
            autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter') handleInvite() }}
            className="w-full"
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
          <Input
            value={createName}
            onChange={setCreateName}
            placeholder={t('org.createModal.namePlaceholder')}
            autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter') handleCreate() }}
            className="w-full"
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
          <Input
            value={joinToken}
            onChange={setJoinToken}
            placeholder={t('org.joinModal.tokenPlaceholder')}
            autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter') handleJoin() }}
            className="w-full"
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
