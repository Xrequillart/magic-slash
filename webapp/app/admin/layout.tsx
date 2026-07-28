'use client'

import { useRequirePlatformAdmin } from '@/lib/session'
import { AdminTabs } from '@/components/AdminTabs'
import { AppShell } from '@/components/AppShell'
import { FullPageLoader } from '@/components/ui'

/**
 * The back-office shell: one guard and one chrome for every /admin route.
 *
 * The guard lives HERE rather than in each page, which is what makes it a
 * boundary instead of a habit — a route added under /admin is protected by
 * existing, not by remembering to call the hook. `children` are not rendered
 * while `pending`, so a page mounts only once the visitor is a confirmed platform
 * admin and can fetch on mount without re-checking anything itself.
 *
 * It also owns AppShell, which the pages used to own individually. That is what
 * gives the tab bar its behaviour: Next.js keeps a layout mounted across the
 * routes nested in it, so TopNav is not remounted when you switch tabs and the
 * entrance animation plays on ARRIVAL in the section rather than on every tab
 * click. Had AppShell stayed in the pages, each tab change would have unmounted
 * and replayed it.
 *
 * Still only a discovery gate: every admin_* RPC re-checks is_platform_admin() in
 * the database, so defeating this in the console yields an empty page.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { session, pending } = useRequirePlatformAdmin()

  if (pending || !session) return <FullPageLoader />

  return (
    <AppShell email={session.user.email ?? undefined} nav={<AdminTabs />}>
      {children}
    </AppShell>
  )
}
