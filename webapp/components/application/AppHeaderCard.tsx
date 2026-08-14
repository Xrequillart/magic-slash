'use client'

import { useEffect, useState } from 'react'
import { Download, Laptop } from 'lucide-react'
import { Badge, ButtonLink, Card } from '@/components/ui'
import {
  fetchInstallations,
  formatDevicePlatform,
  formatRelative,
  type Installation,
} from '@/lib/installations'
import { DESKTOP_DOWNLOAD_URL, LATEST_DESKTOP_VERSION } from '@/lib/desktopRelease'
import { compareVersions } from '@/lib/versions'
import { useT } from '@/lib/i18n/useLanguage'

/**
 * The page's header: which version of the desktop app this account is actually
 * running, on which machine, and whether it is behind. Rows come from
 * `app_installations`, which the app upserts on every launch — so "last active"
 * is really "last launched or still running".
 *
 * It is the FIRST card and it sits above the tabs deliberately: everything in the
 * tabs configures an app, and this says which app — a setting only means what the
 * version under it makes it mean. Being outside the tab strip is what keeps it on
 * screen whichever tab is open.
 *
 * /account → Devices lists the same machines as a security surface (where am I
 * signed in?). This answers a different question, so it leads with the version.
 *
 * "An update is available" is measured against `LATEST_DESKTOP_VERSION`. It used to be
 * measured against the highest version among THIS USER'S OWN machines — which compares
 * your laptop to your desktop and so can never tell you anything at all if you have one
 * machine. The badge was structurally unable to appear for most people.
 */
export function AppHeaderCard() {
  const { t, lang } = useT()
  const [installs, setInstalls] = useState<Installation[] | null>(null)
  useEffect(() => {
    fetchInstallations().then(setInstalls)
  }, [])

  // Rows arrive sorted by last_seen_at descending, so the head is the machine
  // used most recently — the honest answer to "what version am I on".
  const current = installs?.[0] ?? null
  const isBehind = (version: string) => compareVersions(version, LATEST_DESKTOP_VERSION) < 0

  if (installs === null) {
    return <Card className="p-6 text-sm text-muted">{t('common.loading')}</Card>
  }

  if (!current) {
    return (
      <Card className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="font-display text-lg font-black text-ink">{t('appStatus.notInUse')}</p>
          <p className="mt-1 text-xs text-muted">{t('appStatus.notInUseHint')}</p>
        </div>
        <ButtonLink href={DESKTOP_DOWNLOAD_URL} className="shrink-0">
          <Download className="h-4 w-4" />
          {t('common.download')}
        </ButtonLink>
      </Card>
    )
  }

  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="font-display text-4xl font-black leading-none tracking-tight text-ink">
          v{current.appVersion}
        </span>
        <Badge tone="green">{t('appStatus.inUse')}</Badge>
        {isBehind(current.appVersion) && (
          <Badge tone="yellow">
            {t('appStatus.updateAvailable', { version: LATEST_DESKTOP_VERSION })}
          </Badge>
        )}
        {/* Only offered when it would actually do something. On the newest version
            a download button is an invitation to reinstall what you already have. */}
        {isBehind(current.appVersion) && (
          <ButtonLink href={DESKTOP_DOWNLOAD_URL} variant="ghost" className="ml-auto shrink-0">
            <Download className="h-4 w-4" />
            {t('common.download')}
          </ButtonLink>
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
        <ul className="mt-5 divide-y divide-black/5 border-t border-black/5">
          {installs.slice(1).map((d) => (
            <li key={d.deviceId} className="flex items-center gap-3 py-3 last:pb-0">
              <Laptop className="h-3.5 w-3.5 shrink-0 text-muted" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-ink">{d.deviceName ?? t('devices.unknown')}</p>
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
    </Card>
  )
}
