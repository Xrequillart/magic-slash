'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ArchiveRestore, Archive, ShieldMinus, ShieldPlus, XCircle } from 'lucide-react'
import {
  getOrgSkillCounts,
  listOrgInvitations,
  listOrgMembers,
  revokeInvitation,
  setMembershipRole,
  setOrgArchived,
  type AdminOrgInvitation,
  type AdminOrgMember,
} from '@/lib/admin'
import { formatAbsoluteDate } from '@/lib/installations'
// The list itself is shared with the user-space Organizations page: the console
// shares DATA with the user space and never components, and two copies of these
// eight rows would eventually disagree about what a team is shown.
import { TRACKED_SKILLS, totalTrackedRuns } from '@/lib/skills'
import { useConsoleData } from '@/components/regie/ConsoleData'
import { PageHead } from '@/components/regie/ConsoleShell'
import { DataTable, Mono, NoValue, type Column } from '@/components/regie/DataTable'
import {
  ConfirmAction,
  CopyButton,
  Empty,
  ErrorNote,
  InlineField,
  Panel,
  Pill,
  SectionLabel,
} from '@/components/regie/primitives'

/**
 * One tenant's record — and the only page in the console that writes.
 *
 * Three actions, each for a situation an org cannot fix from the inside:
 *
 *  * ROLE — promote or demote a member. The reason this exists is the adminless
 *    org (a deleted account leaves an owner-less membership): nobody inside can
 *    promote anybody, so without this the tenant is unrecoverable.
 *  * ARCHIVE / RESTORE — restoring exists only for platform admins. An org admin
 *    can archive their own tenant and cannot undo it.
 *  * REVOKE — kill a pending invitation, which invalidates its token immediately.
 *
 * Every one is two-click (see ConfirmAction) and every failure is shown with the
 * DATABASE's wording. That matters most for the last-admin trigger: 'cannot remove
 * or demote the last admin while other members remain' is the only place that rule
 * is expressed, and paraphrasing it here would be a second, drifting copy.
 *
 * After a write, both this page's lists AND the console-wide lists are refetched —
 * the counts in the nav and the org table describe what was just changed.
 */

export default function AdminOrgRecord() {
  const params = useParams<{ orgId: string }>()
  const router = useRouter()
  const orgId = params.orgId

  const { orgs, loading: consoleLoading, refresh: refreshConsole } = useConsoleData()
  // The summary comes from the list already in memory rather than a per-org RPC:
  // admin_list_orgs computed every count on this row, and there is no admin_get_org.
  const org = orgs.find((candidate) => candidate.orgId === orgId)

  const [members, setMembers] = useState<AdminOrgMember[] | null>(null)
  const [invitations, setInvitations] = useState<AdminOrgInvitation[] | null>(null)
  // Run counts per skill. Not part of `load()` below: none of this page's three
  // writes can change how many times the org has run magic-commit, so refetching
  // them after a role change would be a query for an answer that cannot have moved.
  const [skills, setSkills] = useState<Map<string, number> | null>(null)
  const [error, setError] = useState<string | null>(null)
  /** The id of the row whose write is in flight, so only its own button waits. */
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    const [nextMembers, nextInvitations] = await Promise.all([
      listOrgMembers(orgId),
      listOrgInvitations(orgId),
    ])
    setMembers(nextMembers)
    setInvitations(nextInvitations)
  }, [orgId])

  useEffect(() => {
    if (!orgId) return
    // Reset before fetching, and drop late responses: navigating from one org to
    // another must not render one tenant's members under another's name.
    setMembers(null)
    setInvitations(null)
    setSkills(null)
    setError(null)

    let cancelled = false
    Promise.all([listOrgMembers(orgId), listOrgInvitations(orgId), getOrgSkillCounts(orgId)]).then(
      ([nextMembers, nextInvites, nextSkills]) => {
        if (cancelled) return
        setMembers(nextMembers)
        setInvitations(nextInvites)
        setSkills(nextSkills)
      },
    )

    return () => {
      cancelled = true
    }
  }, [orgId])

  /**
   * One wrapper for all three writes: clear the previous error, mark the row busy,
   * run it, then refetch BOTH scopes. The error is kept on screen until the next
   * attempt rather than auto-dismissed — the operator has to be able to read the
   * last-admin rule after the click that hit it.
   */
  const runAction = useCallback(
    async (rowId: string, action: () => Promise<void>) => {
      setError(null)
      setBusyId(rowId)
      try {
        await action()
        await Promise.all([load(), refreshConsole()])
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : String(cause))
      } finally {
        setBusyId(null)
      }
    },
    [load, refreshConsole],
  )

  const memberColumns: Column<AdminOrgMember, 'email' | 'name' | 'role' | 'since' | 'actions'>[] = [
    {
      key: 'email',
      label: 'Membre',
      sortValue: (m) => m.email,
      cell: (m) => <Mono>{m.email ?? m.userId}</Mono>,
    },
    {
      key: 'name',
      label: 'Profil',
      sortValue: (m) => m.name,
      cell: (m) => (m.name ? <Mono dim>{m.name}</Mono> : <NoValue />),
    },
    {
      key: 'role',
      label: 'Rôle',
      sortValue: (m) => m.role,
      cell: (m) => <Pill tone={m.role === 'admin' ? 'brand' : 'neutral'}>{m.role}</Pill>,
    },
    {
      key: 'since',
      label: 'Depuis',
      align: 'right',
      defaultDirection: 'desc',
      sortValue: (m) => m.createdAt,
      cell: (m) => <Mono dim>{formatAbsoluteDate(m.createdAt)}</Mono>,
    },
    {
      key: 'actions',
      label: '',
      align: 'right',
      // No sortValue: a column of buttons has no ordering.
      cell: (m) => {
        const promoting = m.role !== 'admin'
        return (
          <ConfirmAction
            label={promoting ? 'Promouvoir' : 'Rétrograder'}
            confirmLabel="Confirmer"
            icon={promoting ? ShieldPlus : ShieldMinus}
            busy={busyId === m.userId}
            disabled={busyId !== null && busyId !== m.userId}
            onConfirm={() =>
              runAction(m.userId, () => setMembershipRole(orgId, m.userId, promoting ? 'admin' : 'user'))
            }
          />
        )
      },
    },
  ]

  const invitationColumns: Column<
    AdminOrgInvitation,
    'email' | 'role' | 'status' | 'inviter' | 'created' | 'actions'
  >[] = [
    {
      key: 'email',
      label: 'Invité',
      sortValue: (i) => i.email,
      cell: (i) => <Mono>{i.email}</Mono>,
    },
    {
      key: 'role',
      label: 'Rôle',
      sortValue: (i) => i.role,
      cell: (i) => <Pill tone={i.role === 'admin' ? 'brand' : 'neutral'}>{i.role}</Pill>,
    },
    {
      key: 'status',
      label: 'État',
      sortValue: (i) => i.status,
      cell: (i) => (
        <Pill
          tone={
            i.status === 'pending'
              ? 'yellow'
              : i.status === 'accepted'
                ? 'green'
                : i.status === 'expired'
                  ? 'neutral'
                  : 'red'
          }
        >
          {i.status}
        </Pill>
      ),
    },
    {
      key: 'inviter',
      label: 'Invité par',
      sortValue: (i) => i.invitedByEmail,
      cell: (i) => (i.invitedByEmail ? <Mono dim>{i.invitedByEmail}</Mono> : <NoValue />),
    },
    {
      key: 'created',
      label: 'Envoyée le',
      align: 'right',
      defaultDirection: 'desc',
      sortValue: (i) => i.createdAt,
      cell: (i) => <Mono dim>{formatAbsoluteDate(i.createdAt)}</Mono>,
    },
    {
      key: 'actions',
      label: '',
      align: 'right',
      cell: (i) =>
        // Only a pending invite can be revoked — the RPC raises on anything else,
        // so offering the button would be offering a guaranteed error. An expired
        // one is already dead: its token cannot be accepted.
        i.status === 'pending' ? (
          <ConfirmAction
            label="Révoquer"
            confirmLabel="Confirmer"
            tone="danger"
            icon={XCircle}
            busy={busyId === i.id}
            disabled={busyId !== null && busyId !== i.id}
            onConfirm={() => runAction(i.id, () => revokeInvitation(i.id))}
          />
        ) : null,
    },
  ]

  if (consoleLoading) {
    return <p className="font-mono text-[13px] text-regie-dim">Chargement…</p>
  }

  if (!org) {
    return (
      <div>
        <BackLink />
        <p className="mt-6 font-mono text-[13px] text-regie-dim">
          Aucune organisation pour cet identifiant.
        </p>
      </div>
    )
  }

  const archived = Boolean(org.archivedAt)

  return (
    <div className="animate-regie-record">
      <BackLink />

      <div className="mt-3">
        <PageHead
          title={org.name}
          // The uuid under the name, exactly as the user record carries it under the
          // email: the title is what a human calls this tenant, this is what a log
          // line and a SQL query call it. Copyable rather than selectable because a
          // double-click on a uuid takes one hyphen-separated group and leaves the
          // rest. It used to be the last cell of the Tenant card below, where it read
          // as a property of the org among others rather than as its identifier.
          meta={
            <span className="inline-flex items-center gap-1.5">
              <span className="break-all font-mono text-[12px] text-regie-dim">{org.orgId}</span>
              <CopyButton value={org.orgId} label="l'identifiant" />
            </span>
          }
          action={
            <ConfirmAction
              label={archived ? 'Restaurer' : 'Archiver'}
              confirmLabel="Confirmer"
              tone={archived ? 'default' : 'danger'}
              icon={archived ? ArchiveRestore : Archive}
              busy={busyId === org.orgId}
              disabled={busyId !== null && busyId !== org.orgId}
              onConfirm={() => runAction(org.orgId, () => setOrgArchived(org.orgId, !archived))}
            />
          }
        />

        {error && (
          <div className="mb-5">
            <ErrorNote>{error}</ErrorNote>
          </div>
        )}

        <div className="space-y-6">
          {/* The same identity card the user record opens with, one fact per column:
              five facts is too many to read as a sentence and too few to stack down a
              card, and on a row they answer "what is this tenant, and how big" without
              pushing the members table below the fold.
              A column below lg, where five cells in a row would truncate the only value
              anyone came here to read — the creator's email. */}
          <Panel label="Tenant">
            <dl className="flex flex-col divide-y divide-regie-rule-soft lg:flex-row lg:divide-x lg:divide-y-0">
              <InlineField label="État">
                {archived ? (
                  <span className="text-red">archivée le {formatAbsoluteDate(org.archivedAt)}</span>
                ) : (
                  <span className="text-green">active</span>
                )}
              </InlineField>
              {/* Widest of the five, and copyable, for the same reason the user
                  record's email cell is: it is the one value here that gets pasted
                  somewhere else — into a support thread, or into the console's own
                  user search. `createdByEmail` is null once the creator's account is
                  deleted, which the org survives. */}
              <InlineField label="Créée par" className="lg:flex-[1.75]">
                {org.createdByEmail ? (
                  <>
                    <span className="min-w-0">{org.createdByEmail}</span>
                    <CopyButton value={org.createdByEmail} label="l'email du créateur" />
                  </>
                ) : (
                  <span className="text-regie-dim">créateur supprimé</span>
                )}
              </InlineField>
              <InlineField label="Créée le">{formatAbsoluteDate(org.createdAt)}</InlineField>
              {/* How big the tenant is, the two counts read side by side. Both come
                  from the console-wide list (`admin_list_orgs` computes them per row),
                  so they cost no fetch here and are refreshed with everything else
                  after a write.
                  Members repeats what the table below counts, deliberately: the card
                  exists so the shape of the org is one glance, without scrolling to a
                  table to learn it has four people in it. Repositories is the opposite
                  case — the one number on this page with no table to read it off.
                  Both narrower than the rest: a count is two characters, and at an
                  equal share they would take the width the email needs. */}
              <InlineField label="Membres" className="lg:flex-[0.8]">
                {org.memberCount}
                {org.adminCount > 0 && (
                  <span className="text-regie-dim">· {org.adminCount} admin</span>
                )}
              </InlineField>
              <InlineField label="Repositories" className="lg:flex-[0.6]">
                {org.repoCount}
              </InlineField>
            </dl>
            {archived && (
              // Said here because it is the fact that makes "Restaurer" worth
              // offering: archiving hides the tenant, it does not destroy it.
              <p className="border-t border-regie-rule-soft px-4 py-2.5 text-[12px] text-regie-dim">
                Une organisation archivée disparaît de toutes les lectures de ses membres, mais ses
                données sont conservées. La restaurer la remet dans l&apos;état où ils l&apos;ont laissée.
              </p>
            )}
          </Panel>

          {/* WHAT THEY ACTUALLY RUN, between the identity card and the members.
              Deliberately above the tables: every count above this says how BIG the
              tenant is, and none of them says whether it is used. An org with nine
              members and four commits between them is a failed rollout that reads as
              healthy from member and repo counts alone, and that is the single most
              useful thing this page can tell an operator.
              One tile per stage of the cycle, so a gap in it is a shape rather than a
              number to compare by hand. */}
          <Panel
            label="Skills"
            action={
              skills && (
                // The sum of the EIGHT shown, not of every skill logged: it is the
                // total of what is on screen, so it always adds up to the tiles
                // below it. An org leaning on a custom skill of its own is not
                // counted here.
                <SectionLabel>{`${totalTrackedRuns(skills)} runs`}</SectionLabel>
              )
            }
          >
            {skills === null ? (
              <Empty>Chargement…</Empty>
            ) : (
              <>
                {/* Boxed tiles rather than cells divided by rules: the count is even at
                    every width today, but it has changed twice and a gap-px separator
                    grid draws the empty cells of a partly filled last row as solid
                    blocks. Tiles carry their own border and an empty grid area is
                    simply panel background.
                    Same box as the feature groups on the user record — the console's
                    established "section inside a card" shape. */}
                <dl className="grid grid-cols-2 gap-2 p-4 sm:grid-cols-4 lg:grid-cols-8">
                  {TRACKED_SKILLS.map(({ skill, label }) => {
                    // Absent from the map means never run. `?? 0` is where absence
                    // becomes the number to print — the RPC returns no row at all
                    // rather than a zero, so this is the only place it is decided.
                    const total = skills.get(skill) ?? 0
                    return (
                      <div
                        key={skill}
                        className="rounded-xl border border-regie-rule-soft bg-regie-ground/40 px-3 py-2.5"
                      >
                        <dt className="truncate text-[11px] uppercase tracking-[0.08em] text-regie-dim">
                          {label}
                        </dt>
                        {/* Monospace and large: it is a count, which the console sets
                            in mono everywhere because these are read by scanning ACROSS
                            the row and compared. A zero is dimmed rather than hidden —
                            the tile has to stay in its place for the row to be
                            comparable, but the eye should skip it. */}
                        <dd
                          className={`mt-1.5 font-mono text-[22px] leading-none ${
                            total === 0 ? 'text-regie-dim/70' : 'text-ink'
                          }`}
                        >
                          {total}
                        </dd>
                      </div>
                    )
                  })}
                </dl>

                {skills.size === 0 && (
                  // Said only when the org has run NOTHING, which is the one state an
                  // operator is likely to read as a broken page rather than as data.
                  // Both halves matter: the hook has to be installed for anything to
                  // be logged at all, and a run is attributed through its agent's
                  // repositories — so a team whose members work on personal repos
                  // shows zeros here while being perfectly active.
                  <p className="border-t border-regie-rule-soft px-4 py-2.5 text-[12px] text-regie-dim">
                    Aucun run enregistré pour cette organisation. Les runs sont rattachés à
                    l&apos;organisation via les repositories de l&apos;agent qui les lance : le travail
                    fait sur un repository personnel n&apos;apparaît donc ici pour personne.
                  </p>
                )}
              </>
            )}
          </Panel>

          <Panel
            label="Membres"
            action={members && <SectionLabel>{`${members.length} · ${org.adminCount} admin`}</SectionLabel>}
          >
            {members === null ? (
              <Empty>Chargement…</Empty>
            ) : (
              <>
                <DataTable
                  rows={members}
                  columns={memberColumns}
                  rowKey={(m) => m.userId}
                  onRowClick={(m) => router.push(`/admin/users/${m.userId}`)}
                  initialSort={{ key: 'role', direction: 'desc' }}
                  emptyLabel="Aucun membre — l'organisation existe sans personne dedans."
                />
                {members.length > 0 && org.adminCount === 0 && (
                  <p className="border-t border-regie-rule-soft px-4 py-2.5 text-[12px] text-red">
                    Aucun admin : personne dans cette organisation ne peut la gérer. Promouvoir un
                    membre ci-dessus est le seul moyen de la débloquer.
                  </p>
                )}
              </>
            )}
          </Panel>

          <Panel
            label="Invitations"
            action={invitations && <SectionLabel>{invitations.length}</SectionLabel>}
          >
            {invitations === null ? (
              <Empty>Chargement…</Empty>
            ) : (
              <DataTable
                rows={invitations}
                columns={invitationColumns}
                rowKey={(i) => i.id}
                initialSort={{ key: 'created', direction: 'desc' }}
                emptyLabel="Aucune invitation envoyée."
              />
            )}
          </Panel>
        </div>
      </div>
    </div>
  )
}

function BackLink() {
  return (
    <Link
      href="/admin/organizations"
      className="inline-flex items-center gap-1.5 font-display text-[11px] font-bold uppercase tracking-[0.08em] text-regie-dim transition-colors hover:text-ink"
    >
      <ArrowLeft className="h-3.5 w-3.5" />
      Organizations
    </Link>
  )
}
