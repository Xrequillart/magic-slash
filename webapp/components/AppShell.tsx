'use client'

import { TopNav } from '@/components/TopNav'

/**
 * Signed-in app chrome: a sticky top nav over a centered content column.
 * Shared by the dashboard, organization, and settings pages.
 */
export function AppShell({ email, children }: { email?: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-canvas">
      <TopNav email={email} />
      <div className="mx-auto max-w-5xl px-5 py-12 sm:px-8">{children}</div>
    </div>
  )
}
