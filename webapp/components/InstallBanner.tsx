'use client'

import { Download, CheckCircle2 } from 'lucide-react'
import { ButtonLink } from '@/components/ui'
import { DOWNLOAD_URL, latestVersion, type Installation } from '@/lib/installations'

/**
 * Install state for the desktop app, in two shapes: a download call-to-action
 * until the user has launched it once, then a confirmation of the version they
 * actually run.
 *
 * `installs === null` means "still loading" — render nothing rather than flash
 * the download CTA at someone who already has the app.
 */
export function InstallBanner({ installs }: { installs: Installation[] | null }) {
  if (installs === null) return null

  if (installs.length === 0) {
    return (
      <div className="flex flex-col gap-4 rounded-2xl border border-black/5 bg-white p-5 sm:flex-row sm:items-center">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/10">
          <Download className="h-5 w-5 text-brand" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-base font-bold text-ink">Download the app</p>
          <p className="mt-0.5 text-sm text-muted">
            Magic Slash runs on your machine. Install it and sign in to get started.
          </p>
        </div>
        <ButtonLink href={DOWNLOAD_URL} target="_blank" rel="noopener noreferrer" className="shrink-0">
          Download
        </ButtonLink>
      </div>
    )
  }

  const version = latestVersion(installs)
  const device = installs[0]?.deviceName

  return (
    <div className="flex items-center gap-4 rounded-2xl border border-green/20 bg-green/[0.04] p-5">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green/10">
        <CheckCircle2 className="h-5 w-5 text-green" />
      </span>
      <div className="min-w-0">
        <p className="font-display text-base font-bold text-ink">App v{version} downloaded</p>
        <p className="mt-0.5 truncate text-sm text-muted">
          {installs.length === 1
            ? device ?? 'One device'
            : `${installs.length} devices · most recently ${device ?? 'unknown'}`}
        </p>
      </div>
    </div>
  )
}
