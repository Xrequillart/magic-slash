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
import { LATEST_DESKTOP_VERSION } from '@/lib/desktopRelease'
import { compareVersions } from '@/lib/versions'
import { useT } from '@/lib/i18n/useLanguage'

/**
 * Whether the desktop app is actually being used on this account, and on which
 * version. Rows come from `app_installations`, which the app upserts on every
 * launch — so "last active" is really "last launched or still running".
 *
 * /account → Devices lists the same machines as a security surface (where am I
 * signed in?). This card answers a different question — am I up and running,
 * and on what — so it leads with the version rather than with the machine.
 *
 * "An update is available" is measured against `LATEST_DESKTOP_VERSION`. It used to be
 * measured against `highestVersion(installs)` — the highest version among THIS USER'S
 * OWN machines — which compares your laptop to your desktop and so can never tell you
 * anything at all if you have one machine. The badge was structurally unable to appear
 * for most people.
 */
export function AppStatusSection() {
  const { t, lang } = useT()
  const [installs, setInstalls] = useState<Installation[] | null>(null)
  useEffect(() => {
    fetchInstallations().then(setInstalls)
  }, [])

  // Rows arrive sorted by last_seen_at descending, so the head is the machine
  // used most recently — the honest answer to "what version am I on".
  const current = installs?.[0] ?? null
  const isBehind = (version: string) => compareVersions(version, LATEST_DESKTOP_VERSION) < 0

  return (
    <section>
      <SectionHeader icon={MonitorSmartphone} title={t('appStatus.title')} />
      <Card className="p-5">
        {installs === null ? (
          <p className="text-sm text-muted">{t('common.loading')}</p>
        ) : !current ? (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="font-display text-sm font-bold text-ink">{t('appStatus.notInUse')}</p>
              <p className="mt-0.5 text-xs text-muted">{t('appStatus.notInUseHint')}</p>
            </div>
            <ButtonLink href={DOWNLOAD_URL} target="_blank" rel="noopener noreferrer" className="shrink-0">
              {t('common.download')}
            </ButtonLink>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="font-display text-3xl font-black leading-none tracking-tight text-ink">
                v{current.appVersion}
              </span>
              <Badge tone="green">{t('appStatus.inUse')}</Badge>
              {isBehind(current.appVersion) && (
                <Badge tone="yellow">
                  {t('appStatus.updateAvailable', { version: LATEST_DESKTOP_VERSION })}
                </Badge>
              )}
            </div>
            <p className="mt-2 text-xs text-muted">
              {[
                current.deviceName,
                t('appStatus.lastActive', { when: formatRelative(current.lastSeenAt, lang) }),
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>

            {installs.length > 1 && (
              <ul className="mt-4 divide-y divide-black/5 border-t border-black/5">
                {installs.slice(1).map((d) => (
                  <li key={d.deviceId} className="flex items-center gap-3 py-3 last:pb-0">
                    <Laptop className="h-3.5 w-3.5 shrink-0 text-muted" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-ink">
                        {d.deviceName ?? t('devices.unknown')}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-muted">
                        {[
                          formatDevicePlatform(d),
                          t('appStatus.lastActive', { when: formatRelative(d.lastSeenAt, lang) }),
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                    </div>
                    <Badge tone={isBehind(d.appVersion) ? 'yellow' : 'neutral'}>v{d.appVersion}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </Card>
    </section>
  )
}
