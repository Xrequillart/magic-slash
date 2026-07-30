'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatAbsoluteDate, formatRelative, highestVersion } from '@/lib/installations'
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
 * which is the only thing a list of accounts is for ("who just signed up", "who is
 * behind"). Columns and a sort make that comparison the default gesture.
 *
 * The columns answer WHO and WHERE — account, profile, organisation, repositories —
 * then WHEN. Device, org and agent counts used to sit here and no longer do: three
 * numeric columns made the row read as a scoreboard, and each is one click away on
 * the record page, where the rows behind the number are too.
 *
 * Rows are fetched by the layout's provider, not here: the version column needs the
 * whole FLEET to know which release is current, and Fleet needs the same rows.
 *
 * No guard: app/admin/layout.tsx owns it and does not mount this page until the
 * visitor is a confirmed platform admin.
 */

type Key = 'email' | 'name' | 'org' | 'repos' | 'version' | 'seen' | 'created'

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
    () =>
      filterRows(users, query, (u) => [
        u.email,
        u.name,
        u.latestAppVersion,
        u.userId,
        // Every org name, not just the displayed one: searching "acme" must find
        // the member for whom Acme is the second membership and hidden behind +1.
        ...u.orgNames,
      ]),
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
      key: 'org',
      label: 'Organisation',
      // Sorts on the name that is DISPLAYED, so two clicks group the table the
      // way it reads. A user in no org sorts last as a missing value rather than
      // first as an empty string.
      sortValue: (u) => u.orgNames[0] ?? null,
      cell: (u) =>
        u.orgNames.length > 0 ? (
          <span className="inline-flex items-baseline gap-1.5">
            <Mono>{u.orgNames[0]}</Mono>
            {/* The overflow, once the Orgs count column is gone: without it a
                member of four orgs is indistinguishable from a member of one,
                and the first name would quietly stand for all of them. */}
            {u.orgNames.length > 1 && (
              <span className="font-mono text-[11px] text-regie-dim" title={u.orgNames.join(', ')}>
                +{u.orgNames.length - 1}
              </span>
            )}
          </span>
        ) : (
          <NoValue />
        ),
    },
    {
      key: 'repos',
      label: 'Repos',
      align: 'right',
      defaultDirection: 'desc',
      sortValue: (u) => u.repoCount,
      cell: (u) => <Mono dim={u.repoCount === 0}>{u.repoCount}</Mono>,
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
      key: 'seen',
      label: 'Vu',
      align: 'right',
      defaultDirection: 'desc',
      sortValue: (u) => u.latestLastSeenAt,
      cell: (u) => (u.latestLastSeenAt ? <Mono dim>{formatRelative(u.latestLastSeenAt)}</Mono> : <NoValue />),
    },
    {
      key: 'created',
      label: 'Inscrit',
      align: 'right',
      defaultDirection: 'desc',
      // Absolute, where "Vu" beside it is relative: a signup date is a fixed
      // point in an account's story and "il y a 8 mois" is the wrong shape for
      // it, while last-seen only matters as a distance from now.
      sortValue: (u) => u.createdAt,
      cell: (u) => (u.createdAt ? <Mono dim>{formatAbsoluteDate(u.createdAt)}</Mono> : <NoValue />),
    },
  ]

  return (
    <>
      <PageHead
        title="Users"
        description="Tous les comptes de la plateforme."
      />

      <Toolbar
        query={query}
        onQueryChange={setQuery}
        placeholder="Filtrer : email, profil, organisation, version…"
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
          // Newest signup first: the question this list gets asked on opening is
          // "who arrived", and it is the one ordering an operator cannot
          // reconstruct by eye from any other column.
          initialSort={{ key: 'created', direction: 'desc' }}
          loading={loading}
          emptyLabel={query ? 'Aucun compte ne correspond au filtre.' : 'Aucun compte pour le moment.'}
        />
      </Panel>
    </>
  )
}
