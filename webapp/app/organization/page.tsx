'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Archive, Building2, Loader2, Mail, Plus, UserPlus, Users } from 'lucide-react'
import { useRequireSession } from '@/lib/session'
import { extractInviteToken } from '@/lib/inviteLink'
import {
  acceptInvitation,
  archiveOrg,
  createOrg,
  fetchMembers,
  fetchOrgs,
  leaveOrg,
  removeMember,
  updateMemberRole,
  type Member,
  type Org,
  type Role,
} from '@/lib/orgs'
import { createInvitation, deleteInvitation, fetchInvitations, type Invitation } from '@/lib/invitations'
import { useT } from '@/lib/i18n/useLanguage'
import { AppShell } from '@/components/AppShell'
import { Modal } from '@/components/Modal'
import { OrganizationCard } from '@/components/OrganizationCard'
import { TabStrip } from '@/components/TabStrip'
import { TabSweep } from '@/components/TabSweep'
import { Button, Card, FullPageLoader, Input, Select, SectionHeader } from '@/components/ui'

type Status = { kind: 'ok' | 'err'; msg: string } | null

function Note({ status }: { status: Status }) {
  if (!status) return null
  return <p className={`mt-2 text-xs ${status.kind === 'ok' ? 'text-green' : 'text-red'}`}>{status.msg}</p>
}

/** Empty-state / message panel. */
function Panel({ icon: Icon, title, hint }: { icon: typeof Users; title: string; hint: string }) {
  return (
    <Card className="p-8 text-center">
      <Icon className="mx-auto mb-3 h-8 w-8 text-black/15" />
      <p className="text-sm text-muted">{title}</p>
      <p className="mt-1 text-xs text-muted">{hint}</p>
    </Card>
  )
}

export default function OrganizationPage() {
  const { session, pending } = useRequireSession()
  const { t, lang } = useT()

  const [orgs, setOrgs] = useState<Org[] | null>(null)
  const [membersByOrg, setMembersByOrg] = useState<Record<string, Member[]>>({})
  const [invitesByOrg, setInvitesByOrg] = useState<Record<string, Invitation[]>>({})

  const [busyMember, setBusyMember] = useState<string | null>(null)
  const [deletingInvite, setDeletingInvite] = useState<string | null>(null)
  const [leavingOrgId, setLeavingOrgId] = useState<string | null>(null)
  const [pageStatus, setPageStatus] = useState<Status>(null)

  // Which organization's card is open. `undefined` = not chosen yet, so the
  // fallback below can follow the data once it loads instead of freezing on a
  // tab that does not exist. Same shape as the dashboard's scope tabs.
  const [selectedOrgId, setSelectedOrgId] = useState<string | undefined>(undefined)

  // Falls back to the first organization whenever the chosen one is gone — the
  // user just left it or archived it, and the list re-renders without it. A raw
  // `selectedOrgId` would leave every card hidden behind a tab nobody can click.
  const activeOrgId = useMemo(() => {
    if (selectedOrgId && orgs?.some((o) => o.id === selectedOrgId)) return selectedOrgId
    return orgs?.[0]?.id
  }, [selectedOrgId, orgs])

  // Each modal holds the org it acts on, so one modal serves every card.
  const [inviteOrg, setInviteOrg] = useState<Org | null>(null)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<Role>('user')
  const [inviting, setInviting] = useState(false)
  const [inviteStatus, setInviteStatus] = useState<Status>(null)

  const [archiveTarget, setArchiveTarget] = useState<Org | null>(null)
  const [archiving, setArchiving] = useState(false)
  const [archiveStatus, setArchiveStatus] = useState<Status>(null)

  const [showCreate, setShowCreate] = useState(false)
  const [createName, setCreateName] = useState('')
  const [creating, setCreating] = useState(false)
  const [createStatus, setCreateStatus] = useState<Status>(null)

  const [showJoin, setShowJoin] = useState(false)
  const [joinToken, setJoinToken] = useState('')
  const [joining, setJoining] = useState(false)
  const [joinStatus, setJoinStatus] = useState<Status>(null)

  const currentUserId = session?.user.id

  /** Reload the org list and, for each, its members and invitations. */
  const reload = useCallback(async () => {
    const list = await fetchOrgs()
    setOrgs(list)
    const entries = await Promise.all(
      list.map(async (o) => {
        const [members, invites] = await Promise.all([fetchMembers(o.id), fetchInvitations(o.id)])
        return [o.id, members, invites] as const
      }),
    )
    setMembersByOrg(Object.fromEntries(entries.map(([id, members]) => [id, members])))
    setInvitesByOrg(Object.fromEntries(entries.map(([id, , invites]) => [id, invites])))
  }, [])

  useEffect(() => {
    if (!session) return
    reload()
  }, [session, reload])

  /** Runs an action, surfaces its error, and refreshes on success. */
  const run = useCallback(
    async (action: () => Promise<unknown>, fallback: string, setStatus: (s: Status) => void) => {
      setStatus(null)
      try {
        await action()
        await reload()
        return true
      } catch (err) {
        setStatus({ kind: 'err', msg: err instanceof Error ? err.message : fallback })
        return false
      }
    },
    [reload],
  )

  const changeRole = async (orgId: string, userId: string, role: Role) => {
    setBusyMember(userId)
    await run(() => updateMemberRole(orgId, userId, role), t('org.error.role'), setPageStatus)
    setBusyMember(null)
  }

  const kickMember = async (orgId: string, userId: string) => {
    setBusyMember(userId)
    await run(() => removeMember(orgId, userId), t('org.error.removeMember'), setPageStatus)
    setBusyMember(null)
  }

  const leave = async (orgId: string) => {
    setLeavingOrgId(orgId)
    await run(() => leaveOrg(orgId), t('org.error.leave'), setPageStatus)
    setLeavingOrgId(null)
  }

  const removeInvite = async (id: string) => {
    setDeletingInvite(id)
    await run(() => deleteInvitation(id), t('org.error.deleteInvitation'), setPageStatus)
    setDeletingInvite(null)
  }

  const submitInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteOrg || inviting || !inviteEmail.trim()) return
    setInviting(true)
    const ok = await run(
      () => createInvitation(inviteOrg.id, inviteEmail, inviteRole),
      t('org.error.createInvitation'),
      setInviteStatus,
    )
    setInviting(false)
    if (ok) setInviteOrg(null)
  }

  const submitCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (creating || !createName.trim()) return
    setCreating(true)
    const ok = await run(
      () => createOrg(createName, lang),
      t('org.error.createOrg'),
      setCreateStatus,
    )
    setCreating(false)
    if (ok) {
      setShowCreate(false)
      setCreateName('')
    }
  }

  const submitJoin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (joining || !joinToken.trim()) return
    setJoining(true)
    const ok = await run(
      () => acceptInvitation(extractInviteToken(joinToken)),
      t('org.error.join'),
      setJoinStatus,
    )
    setJoining(false)
    if (ok) {
      setShowJoin(false)
      setJoinToken('')
    }
  }

  const submitArchive = async () => {
    if (!archiveTarget || archiving) return
    setArchiving(true)
    const ok = await run(
      () => archiveOrg(archiveTarget.id),
      t('org.error.archive'),
      setArchiveStatus,
    )
    setArchiving(false)
    if (ok) setArchiveTarget(null)
  }

  if (pending || !session) return <FullPageLoader />

  return (
    <AppShell email={session.user.email ?? undefined}>
      <h1 className="font-display text-5xl font-black leading-none tracking-tight text-ink">
        {t('org.title')}
      </h1>

      <div className="mt-10">
        <SectionHeader
          icon={Building2}
          title={
            orgs ? t('org.yourOrgsCount', { count: orgs.length }) : t('org.yourOrgs')
          }
          action={
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                onClick={() => {
                  setCreateName('')
                  setCreateStatus(null)
                  setShowCreate(true)
                }}
                className="border border-black/10"
              >
                <Plus className="h-4 w-4" />
                {t('org.create')}
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setJoinToken('')
                  setJoinStatus(null)
                  setShowJoin(true)
                }}
                className="border border-black/10"
              >
                <UserPlus className="h-4 w-4" />
                {t('org.join')}
              </Button>
            </div>
          }
        />

        {orgs === null ? (
          <Card className="flex items-center justify-center p-8 text-muted">
            <Loader2 className="h-4 w-4 animate-spin" />
          </Card>
        ) : orgs.length === 0 ? (
          <Panel
            icon={Users}
            title={t('org.emptyTitle')}
            hint={t('org.emptyHint')}
          />
        ) : (
          <div className="space-y-4">
            {/* One organization at a time once there are several to choose from.
                Below two there is nothing to switch between, so the list renders
                whole — a single tab is a label pretending to be a control. */}
            {orgs.length > 1 && (
              <TabStrip
                ariaLabel={t('org.yourOrgs')}
                items={orgs.map((o) => ({ key: o.id, label: o.name }))}
                activeKey={activeOrgId}
                onSelect={setSelectedOrgId}
              />
            )}
            {/* The card travels the way the strip does — a tab further right arrives from
                the right. `order` is the full list, which is the tab order: the filtered
                list below is one organization and knows nothing about which side the
                previous one was on. */}
            <TabSweep tabKey={activeOrgId} order={orgs.map((o) => o.id)} className="space-y-4">
            {(orgs.length > 1 ? orgs.filter((o) => o.id === activeOrgId) : orgs).map((o) => (
              <OrganizationCard
                key={o.id}
                org={o}
                members={membersByOrg[o.id] ?? null}
                invitations={invitesByOrg[o.id] ?? null}
                currentUserId={currentUserId}
                busyMember={busyMember}
                deletingInvite={deletingInvite}
                leaving={leavingOrgId === o.id}
                onInvite={(org) => {
                  setInviteOrg(org)
                  setInviteEmail('')
                  setInviteRole('user')
                  setInviteStatus(null)
                }}
                onChangeRole={changeRole}
                onRemoveMember={kickMember}
                onDeleteInvitation={removeInvite}
                onLeave={leave}
                onArchive={(org) => {
                  setArchiveTarget(org)
                  setArchiveStatus(null)
                }}
              />
            ))}
            </TabSweep>
          </div>
        )}

        <Note status={pageStatus} />
      </div>

      {/* Invite a member */}
      <Modal
        open={inviteOrg !== null}
        onClose={() => setInviteOrg(null)}
        icon={Mail}
        title={
          inviteOrg
            ? t('org.inviteModal.title', { name: inviteOrg.name })
            : t('org.inviteModal.titleFallback')
        }
      >
        <form onSubmit={submitInvite} className="space-y-3 pb-1">
          <p className="text-xs text-muted">{t('org.inviteModal.help')}</p>
          <Input
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder={t('org.inviteModal.emailPlaceholder')}
            autoFocus
          />
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-muted">{t('org.inviteModal.role')}</span>
            <Select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as Role)}
              className="w-auto"
            >
              <option value="user">{t('org.role.member')}</option>
              <option value="admin">{t('org.role.admin')}</option>
            </Select>
          </div>
          <div className="flex items-center gap-2 pt-2">
            <Button variant="ghost" type="button" onClick={() => setInviteOrg(null)} className="mr-auto">
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={inviting || !inviteEmail.trim()}>
              {inviting ? t('org.inviteModal.sending') : t('org.inviteModal.send')}
            </Button>
          </div>
          <Note status={inviteStatus} />
        </form>
      </Modal>

      {/* Create an organization */}
      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        icon={Plus}
        title={t('org.create')}
      >
        <form onSubmit={submitCreate} className="space-y-2 pb-1">
          <p className="text-xs text-muted">{t('org.createModal.help')}</p>
          <Input
            type="text"
            value={createName}
            onChange={(e) => setCreateName(e.target.value)}
            placeholder={t('org.createModal.namePlaceholder')}
            autoFocus
          />
          <div className="flex items-center gap-2 pt-2">
            <Button variant="ghost" type="button" onClick={() => setShowCreate(false)} className="mr-auto">
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={creating || !createName.trim()}>
              {creating ? t('common.creating') : t('common.create')}
            </Button>
          </div>
          <Note status={createStatus} />
        </form>
      </Modal>

      {/* Join an organization */}
      <Modal
        open={showJoin}
        onClose={() => setShowJoin(false)}
        icon={UserPlus}
        title={t('org.join')}
      >
        <form onSubmit={submitJoin} className="space-y-2 pb-1">
          <p className="text-xs text-muted">{t('org.joinModal.help')}</p>
          <Input
            type="text"
            value={joinToken}
            onChange={(e) => setJoinToken(e.target.value)}
            placeholder={t('org.joinModal.placeholder')}
            autoFocus
          />
          <div className="flex items-center gap-2 pt-2">
            <Button variant="ghost" type="button" onClick={() => setShowJoin(false)} className="mr-auto">
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={joining || !joinToken.trim()}>
              {joining ? t('org.joinModal.submitting') : t('org.join')}
            </Button>
          </div>
          <Note status={joinStatus} />
        </form>
      </Modal>

      {/* Archive organization (danger) */}
      <Modal
        open={archiveTarget !== null}
        onClose={() => setArchiveTarget(null)}
        icon={Archive}
        title={t('org.archiveModal.title')}
        tone="danger"
        footer={
          <>
            <Button variant="ghost" onClick={() => setArchiveTarget(null)} className="mr-auto">
              {t('common.cancel')}
            </Button>
            <Button variant="danger" onClick={submitArchive} disabled={archiving}>
              {archiving ? t('org.archiveModal.archiving') : t('org.archive')}
            </Button>
          </>
        }
      >
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red/10">
            <AlertTriangle className="h-4 w-4 text-red" />
          </span>
          <div>
            <p className="text-sm text-ink">
              {t('org.archiveModal.confirm', {
                name: archiveTarget?.name ?? t('org.archiveModal.thisOrganization'),
              })}
            </p>
            <p className="mt-1 text-xs text-muted">{t('org.archiveModal.body')}</p>
          </div>
        </div>
        <Note status={archiveStatus} />
      </Modal>
    </AppShell>
  )
}
