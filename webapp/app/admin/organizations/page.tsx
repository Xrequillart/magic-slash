'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatAbsoluteDate } from '@/lib/installations'
import { filterRows } from '@/lib/regieTable'
import { useConsoleData } from '@/components/regie/ConsoleData'
import { PageHead } from '@/components/regie/ConsoleShell'
import { DataTable, Mono, NoValue, type Column } from '@/components/regie/DataTable'
import { Panel, Pill, Toolbar } from '@/components/regie/primitives'
import type { AdminOrgSummary } from '@/lib/admin'

/**
 * Every tenant, as a table. Clicking a row opens the record, which is where the
 * actions are.
 *
 * Driven off `organizations`, so an org with nothing attached still appears — one
 * created moments ago, or one whose last member left. That is the shape a list
 * built from memberships silently drops, and an operator looking for the org they
 * just made is exactly the person who would hit it.
 *
 * The `no admin` state gets a red pill rather than a footnote: it is the one row
 * state that means the tenant cannot administer itself, and it is the reason
 * admin_set_membership_role exists.
 */

type Key = 'name' | 'members' | 'repos' | 'agents' | 'invites' | 'creator' | 'created'

export default function AdminOrganizations() {
  const router = useRouter()
  const { orgs, loading } = useConsoleData()
  const [query, setQuery] = useState('')

  const visible = useMemo(
    () => filterRows(orgs, query, (o) => [o.name, o.createdByEmail, o.orgId]),
    [orgs, query],
  )

  const columns: Column<AdminOrgSummary, Key>[] = [
    {
      key: 'name',
      label: 'Organisation',
      width: 'w-[26%]',
      sortValue: (o) => o.name,
      cell: (o) => (
        <span className="inline-flex flex-wrap items-center gap-2">
          <Mono>{o.name}</Mono>
          {o.archivedAt && <Pill tone="red">archivée</Pill>}
          {o.adminCount === 0 && o.memberCount > 0 && <Pill tone="red">aucun admin</Pill>}
        </span>
      ),
    },
    {
      key: 'members',
      label: 'Membres',
      align: 'right',
      defaultDirection: 'desc',
      sortValue: (o) => o.memberCount,
      cell: (o) => (
        <Mono dim={o.memberCount === 0}>
          {o.memberCount}
          {/* Admins as a fraction of members: "1/6" is the fact an operator wants,
              and it puts the adminless case next to the number it contradicts. */}
          <span className="text-regie-dim">{` (${o.adminCount} adm)`}</span>
        </Mono>
      ),
    },
    {
      key: 'repos',
      label: 'Repos',
      align: 'right',
      defaultDirection: 'desc',
      sortValue: (o) => o.repoCount,
      cell: (o) => <Mono dim={o.repoCount === 0}>{o.repoCount}</Mono>,
    },
    {
      key: 'agents',
      label: 'Agents',
      align: 'right',
      defaultDirection: 'desc',
      sortValue: (o) => o.agentCount,
      cell: (o) => <Mono dim={o.agentCount === 0}>{o.agentCount}</Mono>,
    },
    {
      key: 'invites',
      label: 'Invitations',
      align: 'right',
      defaultDirection: 'desc',
      sortValue: (o) => o.pendingInvitationCount,
      cell: (o) =>
        o.pendingInvitationCount > 0 ? (
          <Pill tone="yellow">{o.pendingInvitationCount} en attente</Pill>
        ) : (
          <NoValue />
        ),
    },
    {
      key: 'creator',
      label: 'Créée par',
      sortValue: (o) => o.createdByEmail,
      cell: (o) =>
        o.createdByEmail ? (
          <Mono dim>{o.createdByEmail}</Mono>
        ) : (
          // An org outlives the account that created it, and the orphans are the
          // ones worth spotting.
          <Pill tone="neutral">créateur supprimé</Pill>
        ),
    },
    {
      key: 'created',
      label: 'Créée le',
      align: 'right',
      defaultDirection: 'desc',
      sortValue: (o) => o.createdAt,
      cell: (o) => <Mono dim>{formatAbsoluteDate(o.createdAt)}</Mono>,
    },
  ]

  const archived = orgs.filter((o) => o.archivedAt).length

  return (
    <>
      <PageHead
        path="admin / organizations"
        title="Organizations"
        description="Chaque tenant, ses membres et ce qui lui appartient. Cliquer une ligne ouvre sa fiche et ses actions."
      />

      <Toolbar
        query={query}
        onQueryChange={setQuery}
        placeholder="Filtrer : nom, créateur…"
        shown={visible.length}
        total={orgs.length}
        noun="organisations"
      >
        {/* Stated rather than left to be counted: "12 organisations" hides that 4 of
            them are archived, and archived orgs are invisible to their own members. */}
        {archived > 0 && <Pill tone="neutral">{archived} archivée{archived > 1 ? 's' : ''}</Pill>}
      </Toolbar>

      <Panel>
        <DataTable
          rows={visible}
          columns={columns}
          rowKey={(o) => o.orgId}
          onRowClick={(o) => router.push(`/admin/organizations/${o.orgId}`)}
          initialSort={{ key: 'created', direction: 'desc' }}
          loading={loading}
          emptyLabel={
            query ? 'Aucune organisation ne correspond au filtre.' : 'Aucune organisation pour le moment.'
          }
        />
      </Panel>
    </>
  )
}
