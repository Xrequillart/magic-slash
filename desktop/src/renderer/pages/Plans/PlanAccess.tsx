import { useEffect, useMemo, useRef, useState } from 'react'
import { Banner, Button, ButtonIcon, Card, Label, Menu, Select, Text, type MenuItem, type SelectOption } from '@ds/desktop'
import { Lock, ShieldCheck, UserLock, UserPlus, Users, X } from '@ds/desktop/icons'
import { PLAN_EDIT_POLICIES, isPlanEditPolicy, type Member, type PlanCollaboratorWriteResult, type PlanEditPolicy, type PlanSession } from '../../../types'
import { useT, type MessageKey } from '../../i18n'
import { useMemberAvatars } from '../../hooks/useMemberAvatars'
import { planAuthor } from '../../utils/planRows'

/** What each policy is called in the picker, and the sentence under it. */
const POLICY_LOOK: Record<PlanEditPolicy, { labelKey: MessageKey; hintKey: MessageKey; icon: typeof Users }> = {
  personal: { labelKey: 'plans.access.personal', hintKey: 'plans.access.personalHint', icon: UserLock },
  org: { labelKey: 'plans.access.org', hintKey: 'plans.access.orgHint', icon: Users },
  admins: { labelKey: 'plans.access.admins', hintKey: 'plans.access.adminsHint', icon: ShieldCheck },
  invited: { labelKey: 'plans.access.invited', hintKey: 'plans.access.invitedHint', icon: Lock },
}

/**
 * WHO MAY SEE AND EDIT THIS PLAN, for the two people who may say (#305): its author, and an
 * admin of its organization. Drawn under the plan's links, in their shape, and only for a TEAM plan a
 * manager is reading — a personal plan has nobody to open it to, and a member who may not
 * manage it is told what they may do by the page's notice above the spec, not by a picker
 * they cannot use.
 *
 * THE DATABASE DECIDES, AS EVERYWHERE ON THIS PAGE. `viewerCanManage` is the server's own
 * answer (a computed column on the row), the policy change is refused by the guard trigger
 * for anyone else, and an invitation by `plan_collaborators`' policies — outsiders included.
 * What this offers is what those would let through; what it draws after a write is what the
 * page reads back, never what it asked for.
 *
 * THE INVITATION LIST IS KEPT UNDER EVERY POLICY, and drawn only under `invited`, which is
 * the one where it grants anything. An author who tries `admins` and comes back finds the
 * people they had invited.
 *
 * WHO CAN BE INVITED: the organization's members, minus the author (who always edits), the
 * admins (who always do too, under `invited`), and whoever is invited already.
 *
 * `personal` IS THE AUTHOR'S ALONE, as the guard trigger has it: only the author is offered
 * it, and only the author can leave it. An admin managing a colleague's shared plan picks
 * among the other three; a personal plan never reaches them (the organization does not see
 * it), and if one ever did this draws nothing rather than a picker whose every choice would
 * be refused. `viewerId` is the signed-in user, for that one test: whether the reader is the
 * author is the only thing here the page works out itself, and the database still decides.
 */
export function PlanAccess({
  session,
  viewerId,
  collaborators,
  heading,
  onEditPolicySaved,
  onChange,
}: {
  session: PlanSession
  /** The signed-in user's id, undefined while it is not known. */
  viewerId?: string
  /** User ids, from the detail read. */
  collaborators: string[]
  /** The section heading, drawn by the page so every section shares one. */
  heading: (title: string) => JSX.Element
  /** The policy write moved the row's `updated_at`: the spec editor's guard must follow. */
  onEditPolicySaved: (updatedAt: string, policy: PlanEditPolicy) => void
  /** Something changed (or was refused): the page reads the plan again. */
  onChange: () => void
}) {
  const t = useT()
  const orgId = session.orgId
  const [members, setMembers] = useState<Member[] | null>(null)
  const [membersFailed, setMembersFailed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<'denied' | 'failed' | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const inviteRef = useRef<HTMLButtonElement>(null)

  // The roster names the people on the list and in the menu. One read per plan opened by a
  // manager; nobody else mounts this.
  useEffect(() => {
    setMembers(null)
    setMembersFailed(false)
    if (!orgId) return
    let cancelled = false
    window.electronAPI.org.members(orgId)
      .then((next) => { if (!cancelled) setMembers(next) })
      .catch(() => { if (!cancelled) { setMembers([]); setMembersFailed(true) } })
    return () => { cancelled = true }
  }, [orgId])
  const avatars = useMemberAvatars(useMemo(() => (orgId ? [orgId] : []), [orgId]))

  const emailById = useMemo(() => {
    const byId: Record<string, string> = {}
    for (const member of members ?? []) if (member.email) byId[member.userId] = member.email
    return byId
  }, [members])

  const isAuthor = !!viewerId && viewerId === session.ownerId

  const policyOptions: SelectOption[] = useMemo(
    () => PLAN_EDIT_POLICIES
      .filter((value) => isAuthor || value !== 'personal')
      .map((value) => ({ value, label: t(POLICY_LOOK[value].labelKey), icon: POLICY_LOOK[value].icon })),
    [t, isAuthor],
  )

  const invitable: MenuItem[] = useMemo(() => {
    const taken = new Set(collaborators)
    return (members ?? [])
      .filter((member) => member.userId !== session.ownerId && member.role !== 'admin' && !taken.has(member.userId))
      .map((member) => ({ id: member.userId, label: member.email ?? member.userId.slice(0, 8) }))
  }, [members, collaborators, session.ownerId])

  if (!orgId || !session.viewerCanManage) return null
  // Not the author's, and personal: nothing here that reader could change. See above.
  if (!isAuthor && session.editPolicy === 'personal') return null

  /** One write at a time, and the page reads the plan again after each — refused or not. */
  const run = async (write: () => Promise<{ status: PlanCollaboratorWriteResult['status'] }>) => {
    if (busy) return
    setBusy(true)
    let status: PlanCollaboratorWriteResult['status']
    try {
      status = (await write()).status
    } catch {
      status = 'failed'
    }
    setBusy(false)
    setError(status === 'saved' ? null : status)
    onChange()
  }

  const changePolicy = (value: string) => {
    if (!isPlanEditPolicy(value) || value === session.editPolicy) return
    if (!isAuthor && value === 'personal') return
    const policy = value
    void run(async () => {
      const result = await window.electronAPI.plans.setEditPolicy({ id: session.id, policy })
      if (result.status === 'saved') onEditPolicySaved(result.updatedAt, policy)
      return result
    })
  }

  const invite = (userId: string) => {
    void run(() => window.electronAPI.plans.addCollaborator({ sessionId: session.id, userId }))
  }

  const remove = (userId: string) => {
    void run(() => window.electronAPI.plans.removeCollaborator({ sessionId: session.id, userId }))
  }

  const policy = session.editPolicy

  return (
    <>
      {heading(t('plans.access.title'))}
      <Card className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Select
            value={policy}
            options={policyOptions}
            onChange={changePolicy}
            disabled={busy}
            ariaLabel={t('plans.access.policyLabel')}
            icon={POLICY_LOOK[policy].icon}
            fit
          />
          <Text size="xs" tone="secondary" className="min-w-0 flex-1">{t(POLICY_LOOK[policy].hintKey)}</Text>
        </div>

        {policy === 'invited' && (
          <div className="flex flex-wrap items-center gap-2">
            {collaborators.length === 0 && (
              <Text size="xs" tone="secondary">{t('plans.access.noneInvited')}</Text>
            )}
            {collaborators.map((userId) => {
              const name = planAuthor(userId, emailById)
              return (
                <span key={userId} className="inline-flex min-w-0 items-center gap-1">
                  <Label avatar={{ src: avatars[userId] ?? null, alt: '' }} truncate>{name}</Label>
                  <ButtonIcon
                    icon={X}
                    size="xs"
                    tone="ghost"
                    title={t('plans.access.remove', { name })}
                    onClick={() => remove(userId)}
                    disabled={busy}
                  />
                </span>
              )
            })}
            <Button
              ref={inviteRef}
              size="xs"
              tone="ghost"
              icon={UserPlus}
              onClick={() => setMenuOpen((open) => !open)}
              disabled={busy || members === null}
            >
              {t('plans.access.invite')}
            </Button>
            <Menu
              open={menuOpen}
              onClose={() => setMenuOpen(false)}
              anchor={inviteRef.current}
              label={t('plans.access.inviteMenu')}
              groups={[{
                label: t('plans.access.inviteMenu'),
                items: invitable.length > 0
                  ? invitable
                  : [{ id: '', label: t(membersFailed ? 'plans.access.membersFailed' : 'plans.access.noOneToInvite'), disabled: true }],
              }]}
              onSelect={(item) => { if (item.id) invite(item.id) }}
            />
          </div>
        )}

        {error && (
          <Banner variant="danger" bordered>
            {t(error === 'denied' ? 'plans.access.denied' : 'plans.access.failed')}
          </Banner>
        )}
      </Card>
    </>
  )
}
