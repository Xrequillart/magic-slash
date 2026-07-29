'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatRelative, highestVersion } from '@/lib/installations'
import { filterRows } from '@/lib/regieTable'
import { useConsoleData } from '@/components/regie/ConsoleData'
import { PageHead } from '@/components/regie/ConsoleShell'
import { DataTable, Mono, NoValue, type Column } from '@/components/regie/DataTable'
import { Panel, Pill, Toolbar } from '@/components/regie/primitives'
import type { AdminUser } from '@/lib/admin'

/**
 * Every account, as a table.
 *
 * The list this replaces put five facts per row into one grey sentence joined by
 * middots — readable one row at a time, and impossible to compare down a column,
 * which is the only thing a list of accounts is for ("who is behind", "who has
 * most devices"). Columns and a sort make that comparison the default gesture.
 *
 * Rows are fetched by the layout's provider, not here: the version column needs the
 * whole FLEET to know which release is current, and Fleet needs the same rows.
 *
 * No guard: app/admin/layout.tsx owns it and does not mount this page until the
 * visitor is a confirmed platform admin.
 */

type Key = 'email' | 'name' | 'devices' | 'version' | 'orgs' | 'agents' | 'seen'

export default function AdminUsers() {
  const router = useRouter()
  const { users, installations, loading } = useConsoleData()
  const [query, setQuery] = useState('')

  // Nothing in this app knows which release is the newest, so "up to date" can
  // only mean "matches the highest version any device reports".
  const newest = highestVersion(installations)

  // Filtered here rather than inside the table, so the Toolbar's "shown / total"
  // describes the rows actually on screen. The uuid is searchable because an
  // operator arriving from a log line has an id and nothing else.
  const visible = useMemo(
    () => filterRows(users, query, (u) => [u.email, u.name, u.latestAppVersion, u.userId]),
    [users, query],
  )

  const columns: Column<AdminUser, Key>[] = [
    {
      key: 'email',
      label: 'Compte',
      width: 'w-[28%]',
      sortValue: (u) => u.email,
      cell: (u) => <Mono>{u.email ?? u.userId}</Mono>,
    },
    {
      key: 'name',
      label: 'Profil',
      sortValue: (u) => u.name,
      cell: (u) => (u.name ? <Mono dim>{u.name}</Mono> : <NoValue />),
    },
    {
      key: 'devices',
      label: 'Devices',
      align: 'right',
      defaultDirection: 'desc',
      sortValue: (u) => u.deviceCount,
      cell: (u) => <Mono dim={u.deviceCount === 0}>{u.deviceCount}</Mono>,
    },
    {
      key: 'version',
      label: 'Version',
      // Sorts on the version STRING, not on the pill: numeric collation puts
      // 0.9.0 before 0.10.0, and a user who never launched sorts last as a
      // missing value rather than as the lowest version.
      sortValue: (u) => u.latestAppVersion,
      cell: (u) =>
        u.latestAppVersion ? (
          <Pill tone={newest === null ? 'neutral' : u.latestAppVersion === newest ? 'brand' : 'yellow'}>
            {u.latestAppVersion}
          </Pill>
        ) : (
          <Pill tone="neutral">jamais lancé</Pill>
        ),
    },
    {
      key: 'orgs',
      label: 'Orgs',
      align: 'right',
      defaultDirection: 'desc',
      sortValue: (u) => u.orgCount,
      cell: (u) => <Mono dim={u.orgCount === 0}>{u.orgCount}</Mono>,
    },
    {
      key: 'agents',
      label: 'Agents',
      align: 'right',
      defaultDirection: 'desc',
      // Sorted on the ACTIVE count, which is the one that describes current
      // activity — a total of 40 closed agents says less than 2 open ones.
      sortValue: (u) => u.activeAgentCount,
      cell: (u) => (
        <Mono dim={u.agentCount === 0}>
          {u.activeAgentCount}
          <span className="text-regie-dim">/{u.agentCount}</span>
        </Mono>
      ),
    },
    {
      key: 'seen',
      label: 'Vu',
      align: 'right',
      defaultDirection: 'desc',
      sortValue: (u) => u.latestLastSeenAt,
      cell: (u) => (u.latestLastSeenAt ? <Mono dim>{formatRelative(u.latestLastSeenAt)}</Mono> : <NoValue />),
    },
  ]

  return (
    <>
      <PageHead
        path="admin / users"
        title="Users"
        description="Chaque compte, ce qu'il fait tourner et ce qu'il possède. Cliquer une ligne ouvre sa fiche."
      />

      <Toolbar
        query={query}
        onQueryChange={setQuery}
        placeholder="Filtrer : email, profil, version…"
        shown={visible.length}
        total={users.length}
        noun="comptes"
      />

      <Panel>
        <DataTable
          rows={visible}
          columns={columns}
          rowKey={(u) => u.userId}
          onRowClick={(u) => router.push(`/admin/users/${u.userId}`)}
          initialSort={{ key: 'seen', direction: 'desc' }}
          loading={loading}
          emptyLabel={query ? 'Aucun compte ne correspond au filtre.' : 'Aucun compte pour le moment.'}
        />
      </Panel>
    </>
  )
}
