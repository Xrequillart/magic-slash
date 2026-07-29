'use client'

import {
  bucketByVersion,
  countBy,
  outdatedInstallations,
  QUIET_DAYS,
  quietInstallations,
  type AdminInstallation,
  type CountBucket,
} from '@/lib/admin'
import { formatDevicePlatform, formatRelative, highestVersion } from '@/lib/installations'
import { useConsoleData } from '@/components/regie/ConsoleData'
import { PageHead } from '@/components/regie/ConsoleShell'
import { DataTable, Mono, NoValue, type Column } from '@/components/regie/DataTable'
import { Empty, Panel, Pill, SectionLabel } from '@/components/regie/primitives'

/**
 * What the fleet runs: version distribution, the devices behind it, the platforms
 * and architectures, and the ones that stopped launching.
 *
 * Every rollup is computed from the SAME device list, so asking the database five
 * aggregate questions would be five queries for data already in hand. That list now
 * comes from the console's provider rather than a fetch of its own — the layout
 * already loaded it for the nav counts, and the Users table needs it too.
 *
 * The rollups themselves (`lib/adminRollups.ts`) are untouched: this page changed
 * its clothes, not its arithmetic.
 */

/** Bars thinner than this are invisible, which reads as "no devices" — not the same thing. */
const MIN_BAR_PERCENT = 2

/**
 * One horizontal bar. No chart library — a div is a bar.
 *
 * The track is the console's blue ground rather than a grey wash, so the bar reads
 * as a measurement against a scale that belongs to this page.
 */
function Bar({ label, count, total }: { label: string; count: number; total: number }) {
  const percent = total === 0 ? 0 : (count / total) * 100
  return (
    <div className="flex items-center gap-3 px-4 py-1.5">
      <span className="w-28 shrink-0 truncate font-mono text-[12px] text-ink">{label}</span>
      <span className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-regie-ground">
        <span
          className="block h-full rounded-full bg-brand"
          style={{ width: `${Math.max(percent, MIN_BAR_PERCENT)}%` }}
        />
      </span>
      <span className="w-20 shrink-0 text-right font-mono text-[12px] tabular-nums text-regie-dim">
        {count} · {Math.round(percent)}%
      </span>
    </div>
  )
}

/** Platform and arch use the same shape, so they share one renderer. */
function Breakdown({ buckets, total }: { buckets: CountBucket[]; total: number }) {
  if (buckets.length === 0) return <Empty>Aucun device n&apos;a encore reporté.</Empty>
  return (
    <div className="py-2">
      {buckets.map((bucket) => (
        <Bar key={bucket.value} label={bucket.value} count={bucket.count} total={total} />
      ))}
    </div>
  )
}

type DeviceKey = 'device' | 'owner' | 'platform' | 'version' | 'seen'

/**
 * The columns for both device lists. Outdated and quiet answer the same question —
 * which machine, whose, how long ago — so they share one definition rather than two
 * copies that drift on the next change.
 *
 * `versionTone` is the only difference: a device behind the fleet is a warning, a
 * device that stopped launching is not (it may be on the newest version and simply
 * unused).
 */
function deviceColumns(versionTone: 'yellow' | 'neutral'): Column<AdminInstallation, DeviceKey>[] {
  return [
    {
      key: 'device',
      label: 'Device',
      sortValue: (d) => d.deviceName,
      cell: (d) => <Mono>{d.deviceName ?? 'device inconnu'}</Mono>,
    },
    {
      key: 'owner',
      label: 'Compte',
      sortValue: (d) => d.email,
      cell: (d) => <Mono dim>{d.email ?? d.userId}</Mono>,
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
      cell: (d) => <Pill tone={versionTone}>{d.appVersion}</Pill>,
    },
    {
      key: 'seen',
      label: 'Vu',
      align: 'right',
      defaultDirection: 'desc',
      sortValue: (d) => d.lastSeenAt,
      cell: (d) =>
        d.lastSeenAt ? <Mono dim>{formatRelative(d.lastSeenAt)}</Mono> : <NoValue />,
    },
  ]
}

export default function AdminFleet() {
  const { installations: fleet, loading } = useConsoleData()

  const versions = bucketByVersion(fleet)
  const outdated = outdatedInstallations(fleet)
  // The version the fleet is measured against — the highest any device reports,
  // which is not necessarily the latest release (nothing here knows that).
  const newest = highestVersion(fleet)
  const quiet = quietInstallations(fleet, Date.now())

  return (
    <>
      <PageHead
        title="Fleet"
        description="Ce que tourne le parc, et quelles machines ont décroché ou se sont tues."
      />

      <div className="space-y-6">
        <Panel
          label="Versions installées"
          action={!loading && <SectionLabel>{`${fleet.length} devices`}</SectionLabel>}
        >
          {loading ? (
            <Empty>Chargement…</Empty>
          ) : versions.length === 0 ? (
            <Empty>Aucun device n&apos;a encore lancé l&apos;app.</Empty>
          ) : (
            <div className="py-2">
              {versions.map((version) => (
                <Bar
                  key={version.version}
                  label={version.version}
                  count={version.count}
                  total={fleet.length}
                />
              ))}
            </div>
          )}
        </Panel>

        <Panel
          label="Devices en retard"
          action={!loading && <SectionLabel>{outdated.length}</SectionLabel>}
        >
          {loading ? (
            <Empty>Chargement…</Empty>
          ) : (
            <DataTable
              rows={outdated}
              columns={deviceColumns('yellow')}
              rowKey={(d) => `${d.userId}-${d.deviceId}`}
              initialSort={{ key: 'seen', direction: 'desc' }}
              emptyLabel={
                fleet.length === 0
                  ? "Aucun device n'a encore lancé l'app."
                  : `Tous les devices sont en ${newest}.`
              }
            />
          )}
        </Panel>

        <div className="grid gap-6 sm:grid-cols-2">
          <Panel label="Plateformes">
            {loading ? <Empty>Chargement…</Empty> : <Breakdown buckets={countBy(fleet, 'platform')} total={fleet.length} />}
          </Panel>

          <Panel label="Architectures">
            {loading ? <Empty>Chargement…</Empty> : <Breakdown buckets={countBy(fleet, 'arch')} total={fleet.length} />}
          </Panel>
        </div>

        <Panel
          label={`Silencieux depuis ${QUIET_DAYS} jours ou plus`}
          action={!loading && <SectionLabel>{quiet.length}</SectionLabel>}
        >
          {loading ? (
            <Empty>Chargement…</Empty>
          ) : (
            <DataTable
              rows={quiet}
              columns={deviceColumns('neutral')}
              rowKey={(d) => `${d.userId}-${d.deviceId}`}
              initialSort={{ key: 'seen', direction: 'asc' }}
              emptyLabel={
                fleet.length === 0
                  ? "Aucun device n'a encore lancé l'app."
                  : `Tous les devices ont lancé l'app dans les ${QUIET_DAYS} derniers jours.`
              }
            />
          )}
        </Panel>
      </div>
    </>
  )
}
