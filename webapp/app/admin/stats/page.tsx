'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, Cpu, Laptop, LayoutList, MoonStar } from 'lucide-react'
import {
  bucketByVersion,
  countBy,
  listInstallations,
  outdatedInstallations,
  QUIET_DAYS,
  quietInstallations,
  type AdminInstallation,
  type CountBucket,
} from '@/lib/admin'
import { formatRelative, highestVersion } from '@/lib/installations'
import { Badge, Card, SectionHeader, type BadgeTone } from '@/components/ui'

/**
 * What the fleet runs: version distribution, the devices behind it, the platforms
 * and architectures, and the ones that stopped launching.
 *
 * ONE round trip serves all five sections. Every rollup here is computed from the
 * same device list, so asking the database five aggregate questions would be five
 * queries for data already in hand.
 *
 * No guard and no AppShell — `app/admin/layout.tsx` owns both.
 */

/** Bars thinner than this are invisible, which reads as "no devices" — not the same thing. */
const MIN_BAR_PERCENT = 2

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

export default function AdminStats() {
  const [devices, setDevices] = useState<AdminInstallation[] | null>(null)

  useEffect(() => {
    let cancelled = false
    listInstallations().then((rows) => {
      if (!cancelled) setDevices(rows)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const fleet = devices ?? []
  const versions = bucketByVersion(fleet)
  const outdated = outdatedInstallations(fleet)
  // The version the fleet is measured against — the highest any device reports,
  // which is not necessarily the latest release (nothing here knows that).
  const newest = highestVersion(fleet)
  const quiet = quietInstallations(fleet, Date.now())

  return (
    <>
      <h1 className="font-display text-5xl font-black leading-none tracking-tight text-ink">Stats</h1>
      <p className="mt-3 text-sm text-muted">
        What the fleet runs, and which machines have fallen behind or gone quiet.
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
            action={devices ? <span className="text-xs text-muted">{outdated.length}</span> : null}
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
      </div>
    </>
  )
}
