'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Archive,
  Building2,
  Check,
  ChevronRight,
  Copy,
  FolderGit2,
  Loader2,
  LogOut,
  Trash2,
  UserPlus,
  X,
} from 'lucide-react'
import { Badge, Button, Card, type BadgeTone } from '@/components/ui'
import { RoleSelect } from '@/components/RoleSelect'
import { inviteLink, type Invitation } from '@/lib/invitations'
import { fetchOrgRepositories, type Repository } from '@/lib/repositories'
import type { Member, Org, Role } from '@/lib/orgs'
import type { MessageKey } from '@/lib/i18n'
import { useT } from '@/lib/i18n/useLanguage'

/**
 * One organization, self-contained: identity, members, invitations, the repos
 * shared with it, and the destructive actions. A user can belong to several orgs,
 * so the page renders one card per membership.
 *
 * Mirrors the desktop app's OrganizationCard. The desktop's "Active / Switch to"
 * control is deliberately absent: an active org is a local desktop notion (it
 * drives which config the app writes) and means nothing on the web.
 */

const STATUS_TONE: Record<Invitation['status'], BadgeTone> = {
  pending: 'yellow',
  accepted: 'green',
  expired: 'neutral',
  revoked: 'neutral',
}

/** The stored status is an enum, so it is named rather than printed. */
const STATUS_LABEL: Record<Invitation['status'], MessageKey> = {
  pending: 'org.inviteStatus.pending',
  accepted: 'org.inviteStatus.accepted',
  expired: 'org.inviteStatus.expired',
  revoked: 'org.inviteStatus.revoked',
}

/** Sub-heading inside the card, one per block. */
function CardSection({
  label,
  count,
  action,
}: {
  label: string
  count?: number
  action?: React.ReactNode
}) {
  return (
    <div className="mb-2 flex h-7 items-center justify-between">
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted">
        <span>{label}</span>
        {count !== undefined && <span className="text-black/25">{count}</span>}
      </div>
      {action}
    </div>
  )
}

/** Small bordered pill — the card's inline actions. */
function MiniButton({
  onClick,
  disabled,
  title,
  tone = 'neutral',
  children,
}: {
  onClick: () => void
  disabled?: boolean
  title?: string
  tone?: 'neutral' | 'danger'
  children: React.ReactNode
}) {
  const tones = {
    neutral: 'border-black/10 text-muted hover:bg-black/[0.04] hover:text-ink',
    danger: 'border-black/10 text-muted hover:border-red/25 hover:bg-red/[0.06] hover:text-red',
  }
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`flex h-7 shrink-0 items-center gap-1.5 rounded-lg border px-2 font-display text-[11px] font-medium transition-colors disabled:opacity-40 ${tones[tone]}`}
    >
      {children}
    </button>
  )
}

const BLOCK = 'border-t border-black/5 px-5 py-4'

export function OrganizationCard({
  org,
  members,
  invitations,
  currentUserId,
  busyMember,
  deletingInvite,
  leaving,
  onInvite,
  onChangeRole,
  onRemoveMember,
  onDeleteInvitation,
  onLeave,
  onArchive,
}: {
  org: Org
  members: Member[] | null
  invitations: Invitation[] | null
  currentUserId?: string
  busyMember: string | null
  deletingInvite: string | null
  leaving: boolean
  onInvite: (org: Org) => void
  onChangeRole: (orgId: string, userId: string, role: Role) => void
  onRemoveMember: (orgId: string, userId: string) => void
  onDeleteInvitation: (id: string) => void
  onLeave: (orgId: string) => void
  onArchive: (org: Org) => void
}) {
  const { t } = useT()
  const [repos, setRepos] = useState<Repository[] | null>(null)
  const [copiedToken, setCopiedToken] = useState<string | null>(null)

  useEffect(() => {
    fetchOrgRepositories(org.id).then(setRepos)
  }, [org.id])

  const isAdmin = org.role === 'admin'
  // An accepted invitation is a member now — already listed above with its role
  // and actions, so repeating it here is noise. Only invitations still needing
  // attention are shown: pending, expired, revoked.
  const openInvitations = (invitations ?? []).filter((inv) => inv.status !== 'accepted')
  const adminCount = (members ?? []).filter((m) => m.role === 'admin').length
  // The last admin cannot leave without locking everyone out — they must promote
  // someone or archive the org instead.
  const isSoleAdmin = isAdmin && members !== null && adminCount <= 1

  const copyToken = (token: string) => {
    navigator.clipboard
      .writeText(inviteLink(token))
      .then(() => {
        setCopiedToken(token)
        window.setTimeout(() => setCopiedToken(null), 1500)
      })
      .catch(() => {})
  }

  return (
    <Card className="overflow-hidden">
      {/* Identity */}
      <div className="flex items-center gap-3 px-5 py-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand/10">
          <Building2 className="h-4 w-4 text-brand" />
        </span>
        <p className="min-w-0 flex-1 truncate font-display text-base font-bold text-ink">{org.name}</p>
        <Badge tone={isAdmin ? 'accent' : 'neutral'}>
          {isAdmin ? t('org.role.admin') : t('org.role.member')}
        </Badge>
      </div>

      {/* Members */}
      <div className={BLOCK}>
        <CardSection label={t('org.members')} count={members?.length} />
        {members === null ? (
          <p className="py-1 text-xs text-muted">{t('common.loading')}</p>
        ) : members.length === 0 ? (
          <p className="py-1 text-xs text-muted">{t('org.membersEmpty')}</p>
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
              <tbody className="divide-y divide-black/5">
                {members.map((m) => {
                  const isSelf = m.userId === currentUserId
                  const rowBusy = busyMember === m.userId
                  return (
                    <tr key={m.userId}>
                      <td className="max-w-0 px-1 py-2">
                        <span className="block truncate text-sm text-ink">
                          {m.email ?? m.userId}
                          {isSelf && <span className="text-muted">{t('org.you')}</span>}
                        </span>
                      </td>
                      <td className="w-px whitespace-nowrap px-1 py-2">
                        {rowBusy ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-muted" />
                        ) : isAdmin ? (
                          <RoleSelect
                            value={m.role}
                            onChange={(role) => onChangeRole(org.id, m.userId, role)}
                          />
                        ) : (
                          <Badge tone={m.role === 'admin' ? 'accent' : 'neutral'}>
                            {m.role === 'admin' ? t('org.role.admin') : t('org.role.member')}
                          </Badge>
                        )}
                      </td>
                      {isAdmin && (
                        <td className="w-px px-1 py-2">
                          {/* Removing yourself is what "Leave organization" is for. */}
                          {!isSelf && !rowBusy && (
                            <MiniButton
                              onClick={() => onRemoveMember(org.id, m.userId)}
                              title={t('org.removeMember')}
                              tone="danger"
                            >
                              <X className="h-3.5 w-3.5" />
                            </MiniButton>
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

      {/* Repositories shared with this org */}
      <div className={BLOCK}>
        <CardSection label={t('org.repositories')} count={repos?.length} />
        {repos === null ? (
          <p className="py-1 text-xs text-muted">{t('common.loading')}</p>
        ) : repos.length === 0 ? (
          <p className="py-1 text-xs text-muted">{t('org.reposEmpty')}</p>
        ) : (
          <ul className="-mx-2 space-y-0.5">
            {repos.map((repo) => (
              <li key={repo.id}>
                <Link
                  href={`/repository/${repo.id}`}
                  className="group flex items-center gap-3 rounded-xl px-2 py-1.5 transition-colors hover:bg-canvas"
                >
                  <span
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                    style={
                      repo.color
                        ? { backgroundColor: `${repo.color}1f`, color: repo.color }
                        : { backgroundColor: 'rgba(0,0,0,0.04)' }
                    }
                  >
                    <FolderGit2 className={`h-3.5 w-3.5 ${repo.color ? '' : 'text-muted'}`} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-ink">{repo.name}</span>
                    {repo.keywords.length > 0 && (
                      <span className="mt-0.5 block truncate font-mono text-[11px] text-muted">
                        {repo.keywords.join(' · ')}
                      </span>
                    )}
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-black/20 transition-all group-hover:translate-x-0.5 group-hover:text-brand" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Invitations (admin only — a non-admin read yields [] anyway) */}
      {isAdmin && (
        <div className={BLOCK}>
          <CardSection
            label={t('org.invitations')}
            count={invitations === null ? undefined : openInvitations.length}
            action={
              <MiniButton onClick={() => onInvite(org)}>
                <UserPlus className="h-3 w-3" />
                {t('org.invite')}
              </MiniButton>
            }
          />
          {invitations === null ? (
            <p className="py-1 text-xs text-muted">{t('common.loading')}</p>
          ) : openInvitations.length === 0 ? (
            <p className="py-1 text-xs text-muted">{t('org.invitationsEmpty')}</p>
          ) : (
            <ul className="space-y-1">
              {openInvitations.map((inv) => (
                <li key={inv.id} className="flex items-center gap-2 py-0.5">
                  <span className="min-w-0 flex-1 truncate text-sm text-ink">{inv.email}</span>
                  <Badge tone={STATUS_TONE[inv.status]}>{t(STATUS_LABEL[inv.status])}</Badge>
                  {inv.status === 'pending' && (
                    <MiniButton onClick={() => copyToken(inv.token)} title={t('org.copyInviteLink')}>
                      {copiedToken === inv.token ? (
                        <Check className="h-3 w-3 text-green" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                      {copiedToken === inv.token ? t('common.copied') : t('org.inviteLink')}
                    </MiniButton>
                  )}
                  <MiniButton
                    onClick={() => onDeleteInvitation(inv.id)}
                    disabled={deletingInvite === inv.id}
                    title={t('org.deleteInvitation')}
                    tone="danger"
                  >
                    {deletingInvite === inv.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                  </MiniButton>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Danger zone */}
      <div className={`${BLOCK} flex flex-wrap items-center gap-3`}>
        {isSoleAdmin ? (
          <p className="text-xs text-muted">{t('org.soleAdmin')}</p>
        ) : (
          <Button variant="ghost" onClick={() => onLeave(org.id)} disabled={leaving}>
            {leaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
            {t('org.leave')}
          </Button>
        )}
        {isAdmin && (
          <button
            onClick={() => onArchive(org)}
            className="ml-auto flex items-center gap-2 rounded-full border border-red/25 px-4 py-2 font-display text-xs font-medium text-red transition-colors hover:bg-red/[0.06]"
          >
            <Archive className="h-3.5 w-3.5" />
            {t('org.archive')}
          </button>
        )}
      </div>
    </Card>
  )
}
