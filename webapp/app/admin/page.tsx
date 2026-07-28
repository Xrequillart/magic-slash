'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, Cpu, Laptop, LayoutList, MoonStar, Users } from 'lucide-react'
import { useRequirePlatformAdmin } from '@/lib/session'
import {
  bucketByVersion,
  countBy,
  listInstallations,
  listUsers,
  outdatedInstallations,
  QUIET_DAYS,
  quietInstallations,
  type AdminInstallation,
  type AdminUser,
  type CountBucket,
} from '@/lib/admin'
import { formatRelative, highestVersion } from '@/lib/installations'
import { AppShell } from '@/components/AppShell'
import { Badge, Card, FullPageLoader, SectionHeader, type BadgeTone } from '@/components/ui'

/**
 * The platform back-office: every user, what they run, and what they own.
 *
 * Read-only, by construction rather than by convention — the six RPCs behind it
 * are all `select`-shaped and there is no write helper in `lib/admin.ts`. No
 * existing RLS policy was widened to build this page; each RPC is `SECURITY
 * DEFINER` with an explicit column allowlist in its signature, gated on
 * `is_platform_admin()`.
 *
 * Two round trips serve the whole page: one for the users, one for every device in
 * the fleet. The four rollups below (version histogram, outdated devices,
 * platform/arch breakdown, quiet devices) are all computed from that same device
 * list, so asking the database four aggregate questions would be four queries for
 * data already in hand.
 */

/** Bars thinner than this are invisible, which reads as "no devices" — not the same thing. */
const MIN_BAR_PERCENT = 2

/** Empty-state copy in the shape every card here uses. */
function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted">{children}</p>
}

/** One horizontal bar: label, bar, count. No chart library — a div is a bar. */
function Bar({ label, count, total }: { label: string; count: number; total: number }) {
  const percent = total === 0 ? 0 : (count / total) * 100
  return (
    <div className="flex items-center gap-3 py-1.5">
      <span className="w-24 shrink-0 truncate font-mono text-xs text-ink">{label}</span>
      <span className="h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-black/[0.05]">
        <span
          className="block h-full rounded-full bg-accent"
          style={{ width: `${Math.max(percent, MIN_BAR_PERCENT)}%` }}
        />
      </span>
      <span className="w-20 shrink-0 text-right text-xs text-muted">
        {count} · {Math.round(percent)}%
      </span>
    </div>
  )
}

/** Platform and arch use the same shape, so they share one renderer. */
function Breakdown({ buckets, total }: { buckets: CountBucket[]; total: number }) {
  if (buckets.length === 0) return <Empty>No device has reported yet.</Empty>
  return (
    <div>
      {buckets.map((b) => (
        <Bar key={b.value} label={b.value} count={b.count} total={total} />
      ))}
    </div>
  )
}

/** "bob-mbp · bob@example.com" — the two things that identify a device on sight. */
function deviceLabel(device: AdminInstallation): string {
  return [device.deviceName ?? 'Unknown device', device.email ?? device.userId].join(' · ')
}

/**
 * One device in the "outdated" and "quiet" lists. Both answer "which machine, how
 * long ago", differing only in badge tone and detail line, so the row is written
 * once rather than as two copies that drift on the next padding change.
 */
function DeviceRow({
  device,
  tone,
  children,
}: {
  device: AdminInstallation
  tone: BadgeTone
  children: React.ReactNode
}) {
  return (
    <li className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-ink">{deviceLabel(device)}</p>
        <p className="mt-0.5 truncate text-xs text-muted">{children}</p>
      </div>
      <Badge tone={tone}>v{device.appVersion}</Badge>
    </li>
  )
}

export default function Admin() {
  const { session, pending } = useRequirePlatformAdmin()

  const [users, setUsers] = useState<AdminUser[] | null>(null)
  const [devices, setDevices] = useState<AdminInstallation[] | null>(null)

  // Keyed on the user id rather than the session object, which a token refresh
  // replaces for the same person — re-fetching the whole fleet hourly for an
  // unchanged identity is work nobody asked for.
  const userId = session?.user.id

  useEffect(() => {
    if (pending || !userId) return
    listUsers().then(setUsers)
    listInstallations().then(setDevices)
  }, [pending, userId])

  if (pending || !session) return <FullPageLoader />

  const fleet = devices ?? []
  const versions = bucketByVersion(fleet)
  const outdated = outdatedInstallations(fleet)
  // The version the fleet is measured against — the highest any device reports,
  // which is not necessarily the latest release (nothing here knows that).
  const newest = highestVersion(fleet)
  const quiet = quietInstallations(fleet, Date.now())

  return (
    <AppShell email={session.user.email ?? undefined}>
      <h1 className="font-display text-5xl font-black leading-none tracking-tight text-ink">Platform</h1>
      <p className="mt-3 text-sm text-muted">
        Every account, what it runs and what it owns. Read-only — nothing on these pages writes.
      </p>

      <div className="mt-10 space-y-8">
        {/* ── Version distribution, per DEVICE ───────────────────────────── */}
        <section>
          <SectionHeader
            icon={LayoutList}
            title="App versions"
            action={
              devices ? (
                <span className="text-xs text-muted">
                  {fleet.length} device{fleet.length === 1 ? '' : 's'}
                </span>
              ) : null
            }
          />
          <Card className="p-5">
            {devices === null ? (
              <Empty>Loading…</Empty>
            ) : versions.length === 0 ? (
              <Empty>No device has launched the app yet.</Empty>
            ) : (
              <div>
                {versions.map((v) => (
                  <Bar key={v.version} label={`v${v.version}`} count={v.count} total={fleet.length} />
                ))}
              </div>
            )}
          </Card>
        </section>

        {/* ── Behind the rest of the fleet ────────────────────────────────── */}
        <section>
          <SectionHeader
            icon={AlertTriangle}
            title="Outdated devices"
            action={
              devices ? <span className="text-xs text-muted">{outdated.length}</span> : null
            }
          />
          <Card className="p-5">
            {devices === null ? (
              <Empty>Loading…</Empty>
            ) : outdated.length === 0 ? (
              <Empty>
                {fleet.length === 0
                  ? 'No device has launched the app yet.'
                  : `Every device is on v${newest}.`}
              </Empty>
            ) : (
              <ul className="divide-y divide-black/5">
                {outdated.map((d) => (
                  <DeviceRow key={`${d.userId}-${d.deviceId}`} device={d} tone="yellow">
                    last seen {formatRelative(d.lastSeenAt)}
                    {d.appVersionUpdatedAt && ` · updated ${formatRelative(d.appVersionUpdatedAt)}`}
                  </DeviceRow>
                ))}
              </ul>
            )}
          </Card>
        </section>

        {/* ── What the fleet runs on ──────────────────────────────────────── */}
        <div className="grid gap-8 sm:grid-cols-2">
          <section>
            <SectionHeader icon={Laptop} title="Platforms" />
            <Card className="p-5">
              {devices === null ? (
                <Empty>Loading…</Empty>
              ) : (
                <Breakdown buckets={countBy(fleet, 'platform')} total={fleet.length} />
              )}
            </Card>
          </section>

          <section>
            <SectionHeader icon={Cpu} title="Architectures" />
            <Card className="p-5">
              {devices === null ? (
                <Empty>Loading…</Empty>
              ) : (
                <Breakdown buckets={countBy(fleet, 'arch')} total={fleet.length} />
              )}
            </Card>
          </section>
        </div>

        {/* ── Inactivity, straight off last_seen_at ───────────────────────── */}
        <section>
          <SectionHeader
            icon={MoonStar}
            title={`Quiet for ${QUIET_DAYS}+ days`}
            action={devices ? <span className="text-xs text-muted">{quiet.length}</span> : null}
          />
          <Card className="p-5">
            {devices === null ? (
              <Empty>Loading…</Empty>
            ) : quiet.length === 0 ? (
              <Empty>
                {fleet.length === 0
                  ? 'No device has launched the app yet.'
                  : `Every device has launched the app in the last ${QUIET_DAYS} days.`}
              </Empty>
            ) : (
              <ul className="divide-y divide-black/5">
                {quiet.map((d) => (
                  <DeviceRow key={`${d.userId}-${d.deviceId}`} device={d} tone="neutral">
                    last seen {formatRelative(d.lastSeenAt)}
                  </DeviceRow>
                ))}
              </ul>
            )}
          </Card>
        </section>

        {/* ── Everyone, including the accounts that never got started ─────── */}
        <section>
          <SectionHeader
            icon={Users}
            title="Users"
            action={users ? <span className="text-xs text-muted">{users.length}</span> : null}
          />
          <Card className="p-5">
            {users === null ? (
              <Empty>Loading…</Empty>
            ) : users.length === 0 ? (
              <Empty>No account yet.</Empty>
            ) : (
              <ul className="divide-y divide-black/5">
                {users.map((u) => (
                  <li key={u.userId}>
                    <Link
                      href={`/admin/${u.userId}`}
                      className="-mx-2 flex items-center gap-4 rounded-xl px-2 py-3 transition-colors hover:bg-canvas"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-ink">
                          {u.email ?? u.userId}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-muted">
                          {[
                            u.name ?? 'No profile',
                            `${u.deviceCount} device${u.deviceCount === 1 ? '' : 's'}`,
                            `${u.orgCount} org${u.orgCount === 1 ? '' : 's'}`,
                            `${u.activeAgentCount}/${u.agentCount} agent${u.agentCount === 1 ? '' : 's'}`,
                            u.latestLastSeenAt
                              ? `seen ${formatRelative(u.latestLastSeenAt)}`
                              : 'never seen',
                          ].join(' · ')}
                        </p>
                      </div>
                      {u.latestAppVersion ? (
                        <Badge tone={u.latestAppVersion === newest ? 'accent' : 'yellow'}>
                          v{u.latestAppVersion}
                        </Badge>
                      ) : (
                        <Badge tone="neutral">never launched</Badge>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </section>
      </div>
    </AppShell>
  )
}
