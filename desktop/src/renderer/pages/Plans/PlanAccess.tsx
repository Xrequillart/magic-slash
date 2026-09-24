import { useEffect, useMemo, useState } from 'react'
import { ShareButton, type ShareOption, type SharePerson } from '@ds/desktop'
import { FolderGit2, Lock, ShieldCheck, UserLock, Users } from '@ds/desktop/icons'
import { PLAN_EDIT_POLICIES, isPlanEditPolicy, type Member, type PlanCollaboratorWriteResult, type PlanEditPolicy, type PlanSession } from '../../../types'
import { useT, type MessageKey } from '../../i18n'
import { useMemberAvatars } from '../../hooks/useMemberAvatars'
import { useStore } from '../../store'
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
 * admin of its organization. A "Share" button in the plan's header, between the rework
 * action and the status, and only for a TEAM plan a manager is reading — a member who may
 * not manage it is told what they may do by the page's notice above the spec, not by a
 * button whose every choice would be refused.
 *
 * THE DRAWING IS `ShareButton`'s. What is left here is the plan's side of it: which levels
 * this reader is offered, who is invited, who could be, and the writes.
 *
 * A PLAN ON A PERSONAL REPOSITORY has nobody to open it to: its `org_id` follows its
 * repository's, and the database grants nothing on a null one. The author is told so
 * instead of being shown nothing — an empty place is where they went looking for sharing —
 * with the way out: share the repository, and its plans follow. The panel's action opens
 * that repository's settings, and only when this machine has it configured
 * (`repoConfigKey`); the sentence stands alone otherwise.
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
 * it), and if one ever did this draws nothing rather than a panel whose every choice would
 * be refused. `viewerId` is the signed-in user, for that one test: whether the reader is the
 * author is the only thing here the page works out itself, and the database still decides.
 */
export function PlanAccess({
  session,
  viewerId,
  collaborators,
  repoConfigKey,
  onEditPolicySaved,
  onChange,
}: {
  session: PlanSession
  /** The signed-in user's id, undefined while it is not known. */
  viewerId?: string
  /** User ids, from the detail read. Null when that read failed: the list is unknown, not empty. */
  collaborators: string[] | null
  /** The plan's repository's key in the local config. Undefined when not cloned here. */
  repoConfigKey?: string
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
  const openRepoSettings = useStore((s) => s.openRepoSettings)

  // The roster names the people on the list and the ones who could join it. One read per
  // plan opened by a manager; nobody else mounts this. `membersRead`, not `members`: the
  // latter answers [] on a failed RPC, which the panel would draw as "everyone eligible is
  // already invited".
  useEffect(() => {
    setMembers(null)
    setMembersFailed(false)
    if (!orgId) return
    let cancelled = false
    window.electronAPI.org.membersRead(orgId)
      .then((next) => { if (!cancelled) { setMembers(next.members); setMembersFailed(!next.ok) } })
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

  const options: ShareOption[] = useMemo(
    () => PLAN_EDIT_POLICIES
      .filter((value) => isAuthor || value !== 'personal')
      .map((value) => ({
        value,
        label: t(POLICY_LOOK[value].labelKey),
        hint: t(POLICY_LOOK[value].hintKey),
        icon: POLICY_LOOK[value].icon,
      })),
    [t, isAuthor],
  )

  const invited: SharePerson[] = useMemo(
    () => (collaborators ?? []).map((userId) => ({
      id: userId,
      name: planAuthor(userId, emailById),
      avatar: avatars[userId] ?? null,
    })),
    [collaborators, emailById, avatars],
  )

  const invitable: SharePerson[] = useMemo(() => {
    const taken = new Set(collaborators ?? [])
    return (members ?? [])
      .filter((member) => member.userId !== session.ownerId && member.role !== 'admin' && !taken.has(member.userId))
      .map((member) => ({
        id: member.userId,
        name: member.email ?? member.userId.slice(0, 8),
        avatar: avatars[member.userId] ?? null,
      }))
  }, [members, collaborators, session.ownerId, avatars])

  if (!orgId && isAuthor) {
    return (
      <ShareButton
        label={t('plans.access.share')}
        title={t('plans.access.title')}
        notice={{
          text: t('plans.access.personalRepo'),
          action: repoConfigKey
            ? { label: t('plans.access.shareRepo'), icon: FolderGit2, onPress: () => openRepoSettings(repoConfigKey) }
            : undefined,
        }}
      />
    )
  }
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

  // THE INVITATION LIST IS DRAWN ONLY UNDER `invited`, the one policy where it grants
  // anything. When it could not be read, it is said so and nothing is offered that assumes
  // it is known: no removal, and no candidates that might already be on it.
  const underInvited = session.editPolicy === 'invited'

  return (
    <ShareButton
      label={t('plans.access.share')}
      title={t('plans.access.title')}
      options={options}
      value={session.editPolicy}
      onChange={changePolicy}
      members={underInvited ? {
        heading: t('plans.access.invitedHeading'),
        people: collaborators === null ? [] : invited,
        empty: t(collaborators === null ? 'plans.access.collaboratorsFailed' : 'plans.access.noneInvited'),
        removeLabel: (name) => t('plans.access.remove', { name }),
        onRemove: remove,
      } : undefined}
      candidates={underInvited && collaborators !== null && members !== null ? {
        heading: t('plans.access.inviteMenu'),
        people: membersFailed ? [] : invitable,
        empty: t(membersFailed ? 'plans.access.membersFailed' : 'plans.access.noOneToInvite'),
        addLabel: (name) => t('plans.access.inviteNamed', { name }),
        onAdd: invite,
      } : undefined}
      error={error ? t(error === 'denied' ? 'plans.access.denied' : 'plans.access.failed') : undefined}
      busy={busy}
    />
  )
}
