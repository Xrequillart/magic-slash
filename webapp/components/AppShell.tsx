'use client'

import { TopNav } from '@/components/TopNav'

/**
 * Signed-in app chrome: a sticky top nav over a centered content column.
 * Shared by the dashboard, organization, and settings pages.
 *
 * `nav` is forwarded to TopNav's header slot, which sits between the logo and the
 * account menu. Only the back-office fills it.
 */
export function AppShell({
  email,
  nav,
  children,
}: {
  email?: string
  nav?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-canvas">
      <TopNav email={email} nav={nav} />
      <div className="mx-auto max-w-5xl px-5 py-12 sm:px-8">{children}</div>
    </div>
  )
}
