'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Bot, Building2, FolderGit2, Laptop, SlidersHorizontal, UserRound } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useRequirePlatformAdmin } from '@/lib/session'
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
import { AppShell } from '@/components/AppShell'
import { SettingRow, SettingsCard } from '@/components/SettingRow'
import { Badge, Card, FullPageLoader, SectionHeader } from '@/components/ui'

/**
 * One user, as the platform sees them: identity, their whole `user_settings` row,
 * their devices, orgs, agents and repositories.
 *
 * Strictly read-only. There is no form, no control and no mutation on this page —
 * the five RPCs it calls are all `select`-shaped, and `lib/admin.ts` exports no
 * writer. Support reads this to understand a report; changing anything is the
 * user's own job in their own app, which is the boundary that makes a back-office
 * without an audit log defensible.
 *
 * A user with no `profiles` row and no `user_settings` row still renders: the
 * RPCs are driven off `auth.users`, and "never chose" is shown as such rather than
 * being papered over with the app's defaults.
 */

/**
 * How one settings value reads. NULL is rendered as "never chosen" rather than as
 * the default the app would apply: the difference is the whole point of the
 * nullable columns, and collapsing it here would make the page lie about what is
 * stored.
 */
function formatSetting(value: string | number | boolean | null): { text: string; unset: boolean } {
  if (value === null || value === undefined) return { text: 'never chosen', unset: true }
  if (typeof value === 'boolean') return { text: value ? 'on' : 'off', unset: false }
  return { text: String(value), unset: false }
}

/** Header row of the identity card. */
function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-0.5 truncate font-display text-sm font-bold text-ink">{value}</p>
    </div>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted">{children}</p>
}

/**
 * The four lists below — devices, orgs, agents, repositories — are the same card
 * with the same three states, and only the rows differ. Written out four times, the
 * count pill, the loading branch and the divider classes are four places to keep in
 * step; here each section supplies just its icon, its empty sentence and its row.
 *
 * `items === null` means "not fetched yet", mirroring the `useState<T[] | null>`
 * the page holds each list in.
 */
function ListSection<T>({
  icon,
  title,
  items,
  empty,
  row,
}: {
  icon: LucideIcon
  title: string
  items: T[] | null
  empty: string
  row: (item: T) => React.ReactNode
}) {
  return (
    <section>
      <SectionHeader
        icon={icon}
        title={title}
        action={items ? <span className="text-xs text-muted">{items.length}</span> : null}
      />
      <Card className="p-5">
        {items === null ? (
          <Empty>Loading…</Empty>
        ) : items.length === 0 ? (
          <Empty>{empty}</Empty>
        ) : (
          <ul className="divide-y divide-black/5">{items.map(row)}</ul>
        )}
      </Card>
    </section>
  )
}

export default function AdminUserDetailPage() {
  const params = useParams<{ userId: string }>()
  const userId = params.userId
  const { session, pending } = useRequirePlatformAdmin()

  // undefined = not fetched yet, null = fetched and there is no such user.
  const [user, setUser] = useState<AdminUserDetail | null | undefined>(undefined)
  const [devices, setDevices] = useState<AdminInstallation[] | null>(null)
  const [orgs, setOrgs] = useState<AdminOrg[] | null>(null)
  const [agents, setAgents] = useState<AdminAgent[] | null>(null)
  const [repos, setRepos] = useState<AdminRepository[] | null>(null)

  // Keyed on the viewer's id rather than the session object, which a token refresh
  // replaces for the same person — otherwise all five reads below re-fire hourly
  // for an identity that did not change.
  const viewerId = session?.user.id

  useEffect(() => {
    if (pending || !viewerId || !userId) return

    // Five independent reads that resolve in any order, against state that
    // survives a route change: without the two guards below, navigating from one
    // user to another renders TWO people as one. Resetting first clears the
    // previous user's rows instead of leaving them on screen under the new
    // user's name; `cancelled` drops responses for the id we already left, so a
    // slow listUserAgents for A cannot overwrite the fast one for B. Mixed-up
    // identity is exactly the failure a back-office must not have — nothing on
    // the page would say the agents belong to someone else.
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
  }, [pending, viewerId, userId])

  if (pending || !session) return <FullPageLoader />

  return (
    <AppShell email={session.user.email ?? undefined}>
      <Link
        href="/admin"
        className="inline-flex items-center gap-2 text-sm font-medium text-muted transition-colors hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" />
        Platform
      </Link>

      {user === undefined ? (
        <p className="mt-8 text-sm text-muted">Loading…</p>
      ) : user === null ? (
        <p className="mt-8 text-sm text-muted">No such user, or the account has been deleted.</p>
      ) : (
        <>
          <h1 className="mt-6 truncate font-display text-4xl font-black leading-tight tracking-tight text-ink">
            {user.email ?? user.userId}
          </h1>

          <div className="mt-10 space-y-8">
            {/* ── Who they are (name and role only — see the RPC allowlist) ── */}
            <section>
              <SectionHeader icon={UserRound} title="Profile" />
              <Card className="grid gap-5 p-5 sm:grid-cols-2 lg:grid-cols-4">
                <Fact label="Name" value={user.name ?? 'No profile'} />
                <Fact label="Role" value={user.role ?? '—'} />
                <Fact label="Signed up" value={formatAbsoluteDate(user.createdAt)} />
                <Fact label="Last sign-in" value={formatAbsoluteDate(user.lastSignInAt)} />
              </Card>
            </section>

            {/* ── The whole user_settings row, in reading order ───────────── */}
            <SettingsCard icon={SlidersHorizontal} title="App settings">
              {SETTING_LABELS.map(({ field, label }) => {
                const { text, unset } = formatSetting(user.settings[field])
                return (
                  <SettingRow key={field} label={label}>
                    <span className={`font-mono text-xs ${unset ? 'text-muted/60' : 'text-ink'}`}>{text}</span>
                  </SettingRow>
                )
              })}
            </SettingsCard>

            {/* ── Devices, with the version each one runs ─────────────────── */}
            <ListSection
              icon={Laptop}
              title="Devices"
              items={devices}
              empty="Never launched the desktop app."
              row={(d) => (
                <li key={d.deviceId} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">
                      {d.deviceName ?? 'Unknown device'}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-muted">
                      {[
                        formatDevicePlatform(d),
                        `last seen ${formatRelative(d.lastSeenAt)}`,
                        d.appVersionUpdatedAt
                          ? `on this version since ${formatRelative(d.appVersionUpdatedAt)}`
                          : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  </div>
                  <Badge tone="accent">v{d.appVersion}</Badge>
                </li>
              )}
            />

            {/* ── Orgs, archived ones included ────────────────────────────── */}
            <ListSection
              icon={Building2}
              title="Organizations"
              items={orgs}
              empty="Not a member of any organization."
              row={(o) => (
                <li key={o.orgId} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{o.name}</p>
                    <p className="mt-0.5 truncate text-xs text-muted">
                      member since {formatAbsoluteDate(o.createdAt)}
                    </p>
                  </div>
                  {o.archivedAt && <Badge tone="red">archived</Badge>}
                  <Badge tone={o.role === 'admin' ? 'purple' : 'neutral'}>{o.role}</Badge>
                </li>
              )}
            />

            {/* ── Agents, archived ones included ──────────────────────────── */}
            <ListSection
              icon={Bot}
              title="Agents"
              items={agents}
              empty="No agent yet."
              row={(a) => (
                <li key={a.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">
                      {a.ticketId ? `${a.ticketId} — ${a.name}` : a.name}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-muted">
                      {[
                        a.repoNames.length > 0 ? a.repoNames.join(', ') : 'no repository linked',
                        a.branchName
                          ? a.baseBranch
                            ? `${a.branchName} → ${a.baseBranch}`
                            : a.branchName
                          : null,
                        `created ${formatAbsoluteDate(a.createdAt)}`,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  </div>
                  {a.shared && <Badge tone="purple">shared</Badge>}
                  {a.archivedAt && <Badge tone="neutral">archived</Badge>}
                  {a.status && <Badge tone="accent">{a.status}</Badge>}
                </li>
              )}
            />

            {/* ── Repositories: their own, plus their orgs' team repos ────── */}
            <ListSection
              icon={FolderGit2}
              title="Repositories"
              items={repos}
              empty="No repository configured."
              row={(r) => (
                <li key={r.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{r.name}</p>
                    <p className="mt-0.5 truncate text-xs text-muted">
                      {[
                        r.keywords.length > 0 ? r.keywords.join(', ') : 'no keyword',
                        `added ${formatAbsoluteDate(r.createdAt)}`,
                      ].join(' · ')}
                    </p>
                  </div>
                  <Badge tone={r.orgId ? 'accent' : 'neutral'}>{r.orgName ?? 'personal'}</Badge>
                </li>
              )}
            />
          </div>
        </>
      )}
    </AppShell>
  )
}
