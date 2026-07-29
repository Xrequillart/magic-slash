'use client'

import { TopNav } from '@/components/TopNav'

/**
 * Signed-in app chrome: a sticky top nav over a centered content column.
 * Shared by the dashboard, organization, and settings pages.
 *
 * NOT used by /admin. The back-office has its own shell — full bleed, and a nav bar
 * that is a bordered card where this header sits bare on the canvas
 * (components/regie/ConsoleShell) — so that being in it cannot be mistaken for
 * being in your own space. This one keeps the centered max-w-5xl column that every
 * user page is built on.
 */
export function AppShell({ email, children }: { email?: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-canvas">
      <TopNav email={email} />
      <div className="mx-auto max-w-5xl px-5 py-12 sm:px-8">{children}</div>
    </div>
  )
}
