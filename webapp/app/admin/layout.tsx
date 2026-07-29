'use client'

import { useRequirePlatformAdmin } from '@/lib/session'
import { ConsoleDataProvider, useConsoleData } from '@/components/regie/ConsoleData'
import { ConsoleShell } from '@/components/regie/ConsoleShell'

/**
 * The back-office shell: one guard and one chrome for every /admin route.
 *
 * The guard lives HERE rather than in each page, which is what makes it a
 * boundary instead of a habit — a route added under /admin is protected by
 * existing, not by remembering to call the hook. `children` are not rendered
 * while `pending`, so a page mounts only once the visitor is a confirmed platform
 * admin and can fetch on mount without re-checking anything itself.
 *
 * Still only a discovery gate: every admin_* RPC re-checks is_platform_admin() in
 * the database, so defeating this in the console yields an empty page and a row of
 * errors.
 *
 * It no longer uses AppShell. The console has its own chrome — a side nav card,
 * full-bleed content, monospace values — see components/regie/ConsoleShell.
 * Next.js keeps this layout mounted across the section's routes, which is what lets
 * ConsoleDataProvider fetch the platform lists once on arrival rather than on every
 * navigation.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { session, pending } = useRequirePlatformAdmin()

  // Not the app's FullPageLoader: that one paints the user space's canvas colour,
  // which is a lighter blue than the console's ground — close enough that flashing
  // it first reads as the page changing its mind about its own background.
  if (pending || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-regie-ground font-mono text-[13px] text-regie-dim">
        Chargement…
      </div>
    )
  }

  return (
    <ConsoleDataProvider>
      <ConsoleChrome email={session.user.email ?? undefined}>{children}</ConsoleChrome>
    </ConsoleDataProvider>
  )
}

/**
 * Split from the layout for one reason: the nav counts come from the provider, and
 * a component cannot consume a context it renders itself.
 */
function ConsoleChrome({ email, children }: { email?: string; children: React.ReactNode }) {
  const { users, orgs, installations, loading } = useConsoleData()

  return (
    <ConsoleShell
      email={email}
      // Omitted entirely while loading rather than sent as 0: a nav that reads
      // "Users 0" for a moment is a statement about the platform, and a wrong one.
      counts={
        loading
          ? {}
          : { users: users.length, orgs: orgs.length, devices: installations.length }
      }
    >
      {children}
    </ConsoleShell>
  )
}
