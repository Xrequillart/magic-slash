'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

// Where the binaries come from is still TBD (see plan). For now we link to the
// GitHub Releases "latest" page, which the release CI already publishes. Swap
// RELEASES_URL (or wire the Releases API for a direct .dmg) when finalized.
const RELEASES_URL = 'https://github.com/xrequillart/magic-slash/releases/latest'

export default function Download() {
  const [isMac, setIsMac] = useState<boolean | null>(null)

  useEffect(() => {
    const p = `${navigator.platform} ${navigator.userAgent}`.toLowerCase()
    setIsMac(p.includes('mac'))
  }, [])

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-6 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">Download Magic Slash</h1>
      <p className="mt-3 text-text-secondary">
        The desktop app for macOS (Apple Silicon). Download, open, and sign in — your team
        membership is already set up.
      </p>

      {isMac === false && (
        <div className="mt-5 rounded-lg border border-yellow/30 bg-yellow/10 px-4 py-2 text-sm text-yellow">
          Magic Slash is currently macOS-only. Open this page on a Mac to install it.
        </div>
      )}

      <a
        href={RELEASES_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-8 rounded-lg bg-accent px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
      >
        Download for macOS
      </a>

      <Link href="/" className="mt-6 text-sm text-text-secondary transition-colors hover:text-white">
        ← Back
      </Link>
    </main>
  )
}
