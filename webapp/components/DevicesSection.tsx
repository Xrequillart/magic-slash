'use client'

import { useEffect, useState } from 'react'
import { Laptop, MonitorSmartphone } from 'lucide-react'
import { Badge, ButtonLink, Card, SectionHeader } from '@/components/ui'
import {
  DOWNLOAD_URL,
  fetchInstallations,
  formatDevicePlatform,
  formatRelative,
  type Installation,
} from '@/lib/installations'

/**
 * Machines this account has signed in to the desktop app from.
 *
 * A device is identified by a hash of hostname+platform+arch, so renaming a
 * machine legitimately produces a second entry — these are sign-in records,
 * not a managed device registry.
 */
export function DevicesSection() {
  const [installs, setInstalls] = useState<Installation[] | null>(null)

  useEffect(() => {
    fetchInstallations().then(setInstalls)
  }, [])

  return (
    <section>
      <SectionHeader
        icon={MonitorSmartphone}
        title="Devices"
        action={installs?.length ? <span className="text-xs text-muted">{installs.length}</span> : null}
      />
      <Card className="p-5">
        {installs === null ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : installs.length === 0 ? (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted">No device yet. Install the app and sign in to see it here.</p>
            <ButtonLink href={DOWNLOAD_URL} target="_blank" rel="noopener noreferrer" className="shrink-0">
              Download
            </ButtonLink>
          </div>
        ) : (
          <ul className="divide-y divide-black/5">
            {installs.map((d) => (
              <li key={d.deviceId} className="flex items-center gap-4 py-4 first:pt-0 last:pb-0">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/[0.05]">
                  <Laptop className="h-4 w-4 text-muted" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{d.deviceName ?? 'Unknown device'}</p>
                  <p className="mt-0.5 truncate text-xs text-muted">
                    {[formatDevicePlatform(d), `last seen ${formatRelative(d.lastSeenAt)}`]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                </div>
                <Badge tone="accent">v{d.appVersion}</Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </section>
  )
}
