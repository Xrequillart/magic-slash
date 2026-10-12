import { useEffect, useMemo, useState } from 'react'
import { ShareButton, type ShareOption, type SharePerson } from '@ds/desktop'
import { Lock, ShieldCheck, UserLock, Users } from '@ds/desktop/icons'
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

/** The two levels a plan on a personal repository offers say so without an organization. */
const PERSONAL_REPO_HINT: Partial<Record<PlanEditPolicy, MessageKey>> = {
  personal: 'plans.access.personalHintNoOrg',
  invited: 'plans.access.invitedHintNoOrg',
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
 * A PLAN ON A PERSONAL REPOSITORY (a null `org_id`) has no organization to open it to, but
 * its author may still invite people onto it (20260925090000): anyone they share an
 * organization with, drawn from the rosters of ALL their organizations. Two levels only,
 * `personal` and `invited`: `org` and `admins` mean nothing without an organization, and
 * the database grants nothing under them there. No admin either, so nobody is left out of
 * the candidates for being one. An author in no organization at all has nobody to invite,
 * and is told so rather than shown a picker whose every choice leads nowhere.
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
 * admins (who always do too, under `invited`), and whoever is invited already. On a
 * personal repository, the members of every organization of the author's, minus the author
 * and whoever is invited already.
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
  onEditPolicySaved,
  onChange,
}: {
  session: PlanSession
  /** The signed-in user's id, undefined while it is not known. */
  viewerId?: string
  /** User ids, from the detail read. Null when that read failed: the list is unknown, not empty. */
  collaborators: string[] | null
  /** The policy write moved the row's `updated_at`: the spec editor's guard must follow. */
  onEditPolicySaved: (updatedAt: string, policy: PlanEditPolicy) => void
  /** Something changed (or was refused): the page reads the plan again. */
  onChange: () => void
}) {
  const t = useT()
  const orgId = session.orgId
  const personalRepo = !orgId
  const isAuthor = !!viewerId && viewerId === session.ownerId
  // Whose rosters the candidates come from: the plan's organization, or on a personal
  // repository every organization of its author's. Null while not known yet.
  const [rosterOrgIds, setRosterOrgIds] = useState<string[] | null>(orgId ? [orgId] : null)
  const [members, setMembers] = useState<Member[] | null>(null)
  const [orgsFailed, setOrgsFailed] = useState(false)
  const [rosterFailed, setRosterFailed] = useState(false)
  const membersFailed = orgsFailed || rosterFailed
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<'denied' | 'failed' | null>(null)

  // Only the author manages a personal-repository plan, so only the author lists their
  // organizations for it. A failed list is a failed roster, never "in no organization".
  useEffect(() => {
    if (orgId) { setRosterOrgIds([orgId]); return }
    setRosterOrgIds(null)
    setOrgsFailed(false)
    if (!isAuthor) return
    let cancelled = false
    window.electronAPI.org.list()
      .then((orgs) => { if (!cancelled) setRosterOrgIds(orgs.map((org) => org.id)) })
      .catch(() => { if (!cancelled) { setRosterOrgIds([]); setOrgsFailed(true) } })
    return () => { cancelled = true }
  }, [orgId, isAuthor])

  // The roster names the people on the list and the ones who could join it. One read per
  // organization, per plan opened by a manager; nobody else mounts this. `membersRead`, not
  // `members`: the latter answers [] on a failed RPC, which the panel would draw as
  // "everyone eligible is already invited". Someone in two of the organizations is one
  // person, listed once.
  const rosterKey = rosterOrgIds?.join(',') ?? null
  useEffect(() => {
    setMembers(null)
    setRosterFailed(false)
    if (rosterKey === null) return
    const ids = rosterKey ? rosterKey.split(',') : []
    let cancelled = false
    Promise.all(ids.map((id) => window.electronAPI.org.membersRead(id)))
      .then((reads) => {
        if (cancelled) return
        const byId = new Map<string, Member>()
        for (const read of reads) for (const member of read.members) if (!byId.has(member.userId)) byId.set(member.userId, member)
        setMembers([...byId.values()])
        setRosterFailed(reads.some((read) => !read.ok))
      })
      .catch(() => { if (!cancelled) { setMembers([]); setRosterFailed(true) } })
    return () => { cancelled = true }
  }, [rosterKey])
  const avatars = useMemberAvatars(useMemo(() => (rosterKey ? rosterKey.split(',') : []), [rosterKey]))

  const emailById = useMemo(() => {
    const byId: Record<string, string> = {}
    for (const member of members ?? []) if (member.email) byId[member.userId] = member.email
    return byId
  }, [members])

  const options: ShareOption[] = useMemo(
    () => PLAN_EDIT_POLICIES
      .filter((value) => isAuthor || value !== 'personal')
      .filter((value) => !personalRepo || value === 'personal' || value === 'invited')
      .map((value) => ({
        value,
        label: t(POLICY_LOOK[value].labelKey),
        hint: t(personalRepo ? PERSONAL_REPO_HINT[value] ?? POLICY_LOOK[value].hintKey : POLICY_LOOK[value].hintKey),
        icon: POLICY_LOOK[value].icon,
      })),
    [t, isAuthor, personalRepo],
  )

  const invited: SharePerson[] = useMemo(
    () => (collaborators ?? []).map((userId) => ({
      id: userId,
      name: planAuthor(userId, emailById),
      avatar: avatars[userId] ?? null,
    })),
    [collaborators, emailById, avatars],
  )

  // Admins are left out on a team plan only: they edit under `invited` without being asked.
  // A personal repository has none.
  const invitable: SharePerson[] = useMemo(() => {
    const taken = new Set(collaborators ?? [])
    return (members ?? [])
      .filter((member) => member.userId !== session.ownerId && (personalRepo || member.role !== 'admin') && !taken.has(member.userId))
      .map((member) => ({
        id: member.userId,
        name: member.email ?? member.userId.slice(0, 8),
        avatar: avatars[member.userId] ?? null,
      }))
  }, [members, collaborators, session.ownerId, avatars, personalRepo])

  if (!session.viewerCanManage) return null
  // In no organization at all: nobody to share with. Said only once the list is in, and
  // only when it answered: a failed list is drawn as a failed roster below.
  if (personalRepo && rosterOrgIds?.length === 0 && !membersFailed) {
    return (
      <ShareButton
        label={t('plans.access.share')}
        title={t('plans.access.title')}
        notice={{ text: t('plans.access.noOrgToShare') }}
      />
    )
  }
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
  // A personal-repository plan older than #305 was backfilled to `org`, which grants nothing
  // without an organization: it is, and is drawn as, the author's alone.
  const shownPolicy = personalRepo && !underInvited ? 'personal' : session.editPolicy

  return (
    <ShareButton
      label={t('plans.access.share')}
      title={t('plans.access.title')}
      options={options}
      value={shownPolicy}
      onChange={changePolicy}
      members={underInvited ? {
        heading: t('plans.access.invitedHeading'),
        people: collaborators === null ? [] : invited,
        empty: t(collaborators === null ? 'plans.access.collaboratorsFailed' : 'plans.access.noneInvited'),
        removeLabel: (name) => t('plans.access.remove', { name }),
        onRemove: remove,
      } : undefined}
      candidates={underInvited && collaborators !== null && members !== null ? {
        heading: t(personalRepo ? 'plans.access.inviteMenuNoOrg' : 'plans.access.inviteMenu'),
        people: membersFailed ? [] : invitable,
        empty: t(membersFailed
          ? (personalRepo ? 'plans.access.membersFailedNoOrg' : 'plans.access.membersFailed')
          : 'plans.access.noOneToInvite'),
        addLabel: (name) => t('plans.access.inviteNamed', { name }),
        onAdd: invite,
      } : undefined}
      error={error ? t(error === 'denied' ? 'plans.access.denied' : 'plans.access.failed') : undefined}
      busy={busy}
    />
  )
}
