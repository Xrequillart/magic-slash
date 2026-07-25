'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Copy, Check, Trash2, Loader2 } from 'lucide-react'
import { useSession } from '@/lib/session'
import { fetchOrgs, fetchMembers, type Org, type Member, type Role } from '@/lib/orgs'
import {
  fetchInvitations,
  createInvitation,
  deleteInvitation,
  inviteLink,
  type Invitation,
} from '@/lib/invitations'
import { AppShell } from '@/components/AppShell'
import { Badge, Button, Card, Eyebrow, Input, Select, type BadgeTone } from '@/components/ui'

function initial(email: string | null): string {
  return (email?.trim()?.charAt(0) ?? '?').toUpperCase()
}

function RoleBadge({ role }: { role: Role }) {
  return (
    <Badge tone={role === 'admin' ? 'accent' : 'neutral'}>{role === 'admin' ? 'Admin' : 'Member'}</Badge>
  )
}

const STATUS_TONE: Record<Invitation['status'], BadgeTone> = {
  pending: 'yellow',
  accepted: 'green',
  expired: 'neutral',
  revoked: 'neutral',
}

export default function OrganizationPage() {
  const router = useRouter()
  const { session, loading } = useSession()
  const [orgs, setOrgs] = useState<Org[] | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [members, setMembers] = useState<Member[] | null>(null)
  const [invites, setInvites] = useState<Invitation[] | null>(null)

  // Invite form
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<Role>('user')
  const [inviting, setInviting] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    if (!loading && !session) router.replace('/')
  }, [loading, session, router])

  useEffect(() => {
    if (!session) return
    fetchOrgs().then((list) => {
      setOrgs(list)
      const requested = new URLSearchParams(window.location.search).get('org')
      setSelectedId(list.find((o) => o.id === requested)?.id ?? list[0]?.id ?? null)
    })
  }, [session])

  const selected = useMemo(() => orgs?.find((o) => o.id === selectedId) ?? null, [orgs, selectedId])
  const isAdmin = selected?.role === 'admin'

  const loadInvites = useCallback((orgId: string) => {
    fetchInvitations(orgId).then(setInvites)
  }, [])

  useEffect(() => {
    if (!selectedId) return
    setMembers(null)
    setInvites(null)
    fetchMembers(selectedId).then(setMembers)
    loadInvites(selectedId)
  }, [selectedId, loadInvites])

  const submitInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedId || inviting) return
    setInviting(true)
    setInviteError(null)
    try {
      await createInvitation(selectedId, inviteEmail, inviteRole)
      setInviteEmail('')
      setInviteRole('user')
      loadInvites(selectedId)
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : 'Failed to send invitation')
    } finally {
      setInviting(false)
    }
  }

  const copyLink = (token: string) => {
    navigator.clipboard.writeText(inviteLink(token)).then(() => {
      setCopied(token)
      setTimeout(() => setCopied(null), 1500)
    }).catch(() => {})
  }

  const removeInvite = async (id: string) => {
    if (!selectedId) return
    setDeletingId(id)
    try {
      await deleteInvitation(id)
      loadInvites(selectedId)
    } catch {
      /* surfaced by the list not changing */
    } finally {
      setDeletingId(null)
    }
  }

  if (loading || !session) {
    return <div className="flex min-h-screen items-center justify-center bg-canvas text-muted">Loading…</div>
  }

  return (
    <AppShell email={session.user.email ?? undefined}>
      <Eyebrow>/organization</Eyebrow>

      {orgs && orgs.length === 0 ? (
        <>
          <h1 className="font-display text-5xl font-black leading-none tracking-tight text-ink">Organization</h1>
          <div className="mt-8 rounded-2xl border border-black/5 bg-white p-8 text-center text-sm text-muted">
            You&apos;re not part of any organization yet.
          </div>
        </>
      ) : (
        <>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h1 className="font-display text-5xl font-black leading-none tracking-tight text-ink">
              {selected?.name ?? '…'}
            </h1>
            {orgs && orgs.length > 1 && (
              <Select
                value={selectedId ?? ''}
                onChange={(e) => setSelectedId(e.target.value)}
                className="w-auto"
              >
                {orgs.map((o) => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </Select>
            )}
          </div>
          {selected && (
            <p className="mt-3 text-muted">You are {selected.role === 'admin' ? 'an admin' : 'a member'} of this organization.</p>
          )}

          {/* Members */}
          <h2 className="mt-12 mb-4 flex items-center gap-2 font-mono text-xs font-medium tracking-tight text-muted">
            /members
            {members && <span className="rounded-full bg-black/[0.05] px-2 py-0.5 text-muted">{members.length}</span>}
          </h2>
          <Card className="overflow-hidden">
            {members === null ? (
              <p className="p-6 text-sm text-muted">Loading…</p>
            ) : (
              <ul className="divide-y divide-black/5">
                {members.map((m) => (
                  <li key={m.userId} className="flex items-center gap-3 px-5 py-3.5">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand/10 font-display text-sm font-bold text-brand">
                      {initial(m.email)}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm text-ink">
                      {m.email ?? m.userId}
                      {m.userId === session.user.id && <span className="ml-2 text-xs text-muted">(you)</span>}
                    </span>
                    <RoleBadge role={m.role} />
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* Invitations — admins only */}
          {isAdmin && (
            <>
              <h2 className="mt-12 mb-4 font-mono text-xs font-medium tracking-tight text-muted">/invitations</h2>

              <form
                onSubmit={submitInvite}
                className="flex flex-col gap-3 rounded-2xl border border-black/5 bg-white p-5 sm:flex-row sm:items-center"
              >
                <Input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="teammate@company.com"
                  className="flex-1"
                />
                <Select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as Role)}
                  className="sm:w-32"
                >
                  <option value="user">Member</option>
                  <option value="admin">Admin</option>
                </Select>
                <Button type="submit" disabled={inviting || !inviteEmail} className="shrink-0">
                  {inviting ? 'Sending…' : 'Send invite'}
                </Button>
              </form>
              {inviteError && <p className="mt-2 text-xs text-red">{inviteError}</p>}

              {invites && invites.length > 0 && (
                <Card className="mt-4 overflow-hidden">
                  <ul className="divide-y divide-black/5">
                    {invites.map((inv) => (
                      <li key={inv.id} className="flex items-center gap-3 px-5 py-3.5">
                        <span className="min-w-0 flex-1 truncate text-sm text-ink">{inv.email}</span>
                        <Badge tone={STATUS_TONE[inv.status]}>{inv.status}</Badge>
                        {inv.status === 'pending' && (
                          <button
                            onClick={() => copyLink(inv.token)}
                            className="flex items-center gap-1 rounded-lg border border-black/10 px-2 py-1 text-[11px] text-muted transition-colors hover:bg-black/[0.04] hover:text-ink"
                            title="Copy invitation link"
                          >
                            {copied === inv.token ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                            {copied === inv.token ? 'Copied' : 'Link'}
                          </button>
                        )}
                        <button
                          onClick={() => removeInvite(inv.id)}
                          disabled={deletingId === inv.id}
                          className="flex items-center justify-center rounded-lg p-1.5 text-muted transition-colors hover:bg-red/10 hover:text-red disabled:opacity-40"
                          title="Delete invitation"
                        >
                          {deletingId === inv.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        </button>
                      </li>
                    ))}
                  </ul>
                </Card>
              )}
            </>
          )}
        </>
      )}
    </AppShell>
  )
}
