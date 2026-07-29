'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import {
  getUser,
  listInstallations,
  listUserAgents,
  listUserOrgs,
  listUserRepositories,
  SETTING_LABELS,
  type AdminAgent,
  type AdminInstallation,
  type AdminOrg,
  type AdminRepository,
  type AdminUserDetail,
} from '@/lib/admin'
import { formatAbsoluteDate, formatDevicePlatform, formatRelative } from '@/lib/installations'
import { PageHead } from '@/components/regie/ConsoleShell'
import { DataTable, Mono, NoValue, type Column } from '@/components/regie/DataTable'
import { Empty, Field, Panel, Pill, SectionLabel } from '@/components/regie/primitives'

/**
 * One user's record: identity, their whole `user_settings` row, their devices,
 * orgs, agents and repositories.
 *
 * Read-only, and that is a boundary rather than an omission. The three write RPCs
 * this migration added are all org-scoped; nothing here mutates a person's own
 * account, because changing someone's settings for them is their job in their own
 * app. The lists became TABLES rather than the sentences-joined-by-middots they
 * were, so a user with eleven agents can be read down a column.
 *
 * A user with no `profiles` row and no `user_settings` row still renders: the RPCs
 * are driven off `auth.users`, and "jamais choisi" is shown as such rather than
 * papered over with the app's defaults.
 *
 * No guard: `app/admin/layout.tsx` owns it. The `cancelled` guard below is still
 * needed — it is about switching from one USER to another within the page, which
 * the layout knows nothing about.
 */

/**
 * How one settings value reads. NULL is "jamais choisi" rather than the default the
 * app would apply: the difference is the whole point of the nullable columns, and
 * collapsing it here would make the page lie about what is stored.
 */
function formatSetting(value: string | number | boolean | null): { text: string; unset: boolean } {
  if (value === null || value === undefined) return { text: 'jamais choisi', unset: true }
  if (typeof value === 'boolean') return { text: value ? 'on' : 'off', unset: false }
  return { text: String(value), unset: false }
}

export default function AdminUserRecord() {
  const params = useParams<{ userId: string }>()
  const router = useRouter()
  const userId = params.userId

  // undefined = not fetched yet, null = fetched and there is no such user.
  const [user, setUser] = useState<AdminUserDetail | null | undefined>(undefined)
  const [devices, setDevices] = useState<AdminInstallation[] | null>(null)
  const [orgs, setOrgs] = useState<AdminOrg[] | null>(null)
  const [agents, setAgents] = useState<AdminAgent[] | null>(null)
  const [repos, setRepos] = useState<AdminRepository[] | null>(null)

  useEffect(() => {
    if (!userId) return

    // Five independent reads that resolve in any order, against state that
    // survives a route change: without the two guards below, navigating from one
    // user to another renders TWO people as one. Resetting first clears the
    // previous user's rows instead of leaving them on screen under the new user's
    // name; `cancelled` drops responses for the id we already left, so a slow
    // listUserAgents for A cannot overwrite the fast one for B. Mixed-up identity
    // is exactly the failure a back-office must not have — nothing on the page
    // would say the agents belong to someone else.
    setUser(undefined)
    setDevices(null)
    setOrgs(null)
    setAgents(null)
    setRepos(null)

    let cancelled = false
    const apply =
      <T,>(set: (value: T) => void) =>
      (value: T) => {
        if (!cancelled) set(value)
      }

    getUser(userId).then(apply(setUser))
    listInstallations(userId).then(apply(setDevices))
    listUserOrgs(userId).then(apply(setOrgs))
    listUserAgents(userId).then(apply(setAgents))
    listUserRepositories(userId).then(apply(setRepos))

    return () => {
      cancelled = true
    }
  }, [userId])

  const deviceColumns: Column<AdminInstallation, 'name' | 'platform' | 'version' | 'seen'>[] = [
    {
      key: 'name',
      label: 'Device',
      sortValue: (d) => d.deviceName,
      cell: (d) => <Mono>{d.deviceName ?? 'device inconnu'}</Mono>,
    },
    {
      key: 'platform',
      label: 'Plateforme',
      sortValue: (d) => formatDevicePlatform(d),
      cell: (d) => <Mono dim>{formatDevicePlatform(d)}</Mono>,
    },
    {
      key: 'version',
      label: 'Version',
      sortValue: (d) => d.appVersion,
      cell: (d) => (
        <span className="inline-flex items-center gap-2">
          <Pill tone="brand">{d.appVersion}</Pill>
          {d.appVersionUpdatedAt && (
            <span className="font-mono text-[11px] text-regie-dim">
              depuis {formatRelative(d.appVersionUpdatedAt)}
            </span>
          )}
        </span>
      ),
    },
    {
      key: 'seen',
      label: 'Vu',
      align: 'right',
      defaultDirection: 'desc',
      sortValue: (d) => d.lastSeenAt,
      cell: (d) => <Mono dim>{formatRelative(d.lastSeenAt)}</Mono>,
    },
  ]

  const orgColumns: Column<AdminOrg, 'name' | 'role' | 'since'>[] = [
    {
      key: 'name',
      label: 'Organisation',
      sortValue: (o) => o.name,
      cell: (o) => (
        <span className="inline-flex items-center gap-2">
          <Mono>{o.name}</Mono>
          {o.archivedAt && <Pill tone="red">archivée</Pill>}
        </span>
      ),
    },
    {
      key: 'role',
      label: 'Rôle',
      sortValue: (o) => o.role,
      cell: (o) => <Pill tone={o.role === 'admin' ? 'brand' : 'neutral'}>{o.role}</Pill>,
    },
    {
      key: 'since',
      label: 'Membre depuis',
      align: 'right',
      defaultDirection: 'desc',
      sortValue: (o) => o.createdAt,
      cell: (o) => <Mono dim>{formatAbsoluteDate(o.createdAt)}</Mono>,
    },
  ]

  const agentColumns: Column<AdminAgent, 'name' | 'repos' | 'branch' | 'status' | 'created'>[] = [
    {
      key: 'name',
      label: 'Agent',
      sortValue: (a) => a.ticketId ?? a.name,
      cell: (a) => <Mono>{a.ticketId ? `${a.ticketId} — ${a.name}` : a.name}</Mono>,
    },
    {
      key: 'repos',
      label: 'Repos',
      sortValue: (a) => a.repoNames.join(', '),
      cell: (a) => (a.repoNames.length > 0 ? <Mono dim>{a.repoNames.join(', ')}</Mono> : <NoValue />),
    },
    {
      key: 'branch',
      label: 'Branche',
      sortValue: (a) => a.branchName,
      cell: (a) =>
        a.branchName ? (
          <Mono dim>{a.baseBranch ? `${a.branchName} → ${a.baseBranch}` : a.branchName}</Mono>
        ) : (
          <NoValue />
        ),
    },
    {
      key: 'status',
      label: 'État',
      sortValue: (a) => a.status,
      cell: (a) => (
        <span className="inline-flex items-center gap-1.5">
          {a.status ? <Pill tone="brand">{a.status}</Pill> : <NoValue />}
          {a.shared && <Pill tone="neutral">partagé</Pill>}
          {a.archivedAt && <Pill tone="neutral">archivé</Pill>}
        </span>
      ),
    },
    {
      key: 'created',
      label: 'Créé',
      align: 'right',
      defaultDirection: 'desc',
      sortValue: (a) => a.createdAt,
      cell: (a) => <Mono dim>{formatAbsoluteDate(a.createdAt)}</Mono>,
    },
  ]

  const repoColumns: Column<AdminRepository, 'name' | 'owner' | 'keywords' | 'added'>[] = [
    {
      key: 'name',
      label: 'Repository',
      sortValue: (r) => r.name,
      cell: (r) => <Mono>{r.name}</Mono>,
    },
    {
      key: 'owner',
      label: 'Rattachement',
      sortValue: (r) => r.orgName,
      cell: (r) => <Pill tone={r.orgId ? 'brand' : 'neutral'}>{r.orgName ?? 'personnel'}</Pill>,
    },
    {
      key: 'keywords',
      label: 'Mots-clés',
      sortValue: (r) => r.keywords.join(', '),
      cell: (r) => (r.keywords.length > 0 ? <Mono dim>{r.keywords.join(', ')}</Mono> : <NoValue />),
    },
    {
      key: 'added',
      label: 'Ajouté',
      align: 'right',
      defaultDirection: 'desc',
      sortValue: (r) => r.createdAt,
      cell: (r) => <Mono dim>{formatAbsoluteDate(r.createdAt)}</Mono>,
    },
  ]

  return (
    <div className="animate-regie-record">
      <Link
        href="/admin/users"
        className="inline-flex items-center gap-1.5 font-display text-[11px] font-bold uppercase tracking-[0.08em] text-regie-dim transition-colors hover:text-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Users
      </Link>

      {user === undefined ? (
        <p className="mt-6 font-mono text-[13px] text-regie-dim">Chargement…</p>
      ) : user === null ? (
        <p className="mt-6 font-mono text-[13px] text-regie-dim">
          Aucun compte pour cet identifiant, ou le compte a été supprimé.
        </p>
      ) : (
        <div className="mt-3">
          <PageHead
            path={`admin / users / ${user.userId.slice(0, 8)}`}
            title={user.email ?? user.userId}
          />

          <div className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Name and role only — the RPC's column allowlist stops there. */}
              <Panel label="Identité">
                <dl>
                  <Field label="Nom" value={user.name ?? <span className="text-regie-dim">aucun profil</span>} />
                  <Field label="Rôle déclaré" value={user.role ?? <span className="text-regie-dim">—</span>} />
                  <Field label="Inscrit le" value={formatAbsoluteDate(user.createdAt)} />
                  <Field label="Dernière connexion" value={formatAbsoluteDate(user.lastSignInAt)} />
                  <Field label="User id" value={user.userId} />
                </dl>
              </Panel>

              {/* The whole user_settings row, in reading order. Two columns because
                  twenty single-file rows push everything below them off screen. */}
              <Panel label="Réglages de l'app">
                <dl className="grid sm:grid-cols-2">
                  {SETTING_LABELS.map(({ field, label }) => {
                    const { text, unset } = formatSetting(user.settings[field])
                    return (
                      <div
                        key={field}
                        className="flex items-baseline justify-between gap-3 border-b border-regie-rule-soft px-4 py-2"
                      >
                        <dt className="text-[11px] text-regie-dim">{label}</dt>
                        <dd
                          className={`shrink-0 font-mono text-[12px] ${unset ? 'text-regie-dim/70' : 'text-ink'}`}
                        >
                          {text}
                        </dd>
                      </div>
                    )
                  })}
                </dl>
              </Panel>
            </div>

            <Panel
              label="Devices"
              action={devices && <SectionLabel>{devices.length}</SectionLabel>}
            >
              {devices === null ? (
                <Empty>Chargement…</Empty>
              ) : (
                <DataTable
                  rows={devices}
                  columns={deviceColumns}
                  rowKey={(d) => d.deviceId}
                  initialSort={{ key: 'seen', direction: 'desc' }}
                  emptyLabel="N'a jamais lancé l'app desktop."
                />
              )}
            </Panel>

            <Panel label="Organisations" action={orgs && <SectionLabel>{orgs.length}</SectionLabel>}>
              {orgs === null ? (
                <Empty>Chargement…</Empty>
              ) : (
                <DataTable
                  rows={orgs}
                  columns={orgColumns}
                  rowKey={(o) => o.orgId}
                  // The one cross-entity jump in the console: from a person to the
                  // tenant, where the actions that concern them actually live.
                  onRowClick={(o) => router.push(`/admin/organizations/${o.orgId}`)}
                  initialSort={{ key: 'name', direction: 'asc' }}
                  emptyLabel="Membre d'aucune organisation."
                />
              )}
            </Panel>

            <Panel label="Agents" action={agents && <SectionLabel>{agents.length}</SectionLabel>}>
              {agents === null ? (
                <Empty>Chargement…</Empty>
              ) : (
                <DataTable
                  rows={agents}
                  columns={agentColumns}
                  rowKey={(a) => a.id}
                  initialSort={{ key: 'created', direction: 'desc' }}
                  emptyLabel="Aucun agent."
                />
              )}
            </Panel>

            <Panel label="Repositories" action={repos && <SectionLabel>{repos.length}</SectionLabel>}>
              {repos === null ? (
                <Empty>Chargement…</Empty>
              ) : (
                <DataTable
                  rows={repos}
                  columns={repoColumns}
                  rowKey={(r) => r.id}
                  initialSort={{ key: 'name', direction: 'asc' }}
                  emptyLabel="Aucun repository configuré."
                />
              )}
            </Panel>
          </div>
        </div>
      )}
    </div>
  )
}
