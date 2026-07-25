'use client'

import { useRequireSession } from '@/lib/session'
import { AppShell } from '@/components/AppShell'
import { CloudAccountSection } from '@/components/CloudAccountSection'
import { DevicesSection } from '@/components/DevicesSection'
import { ProfileSection } from '@/components/ProfileSection'
import { FullPageLoader } from '@/components/ui'

/**
 * Account page: everything about *you* — the identity you sign in with, the
 * profile Claude reads to adapt its answers, and the machines you run the app
 * on. Laid out like the desktop app's Account tab. Org-level concerns live on
 * the Organization page.
 */
export default function Account() {
  const { session, pending } = useRequireSession()

  if (pending || !session) return <FullPageLoader />

  return (
    <AppShell email={session.user.email ?? undefined}>
      <h1 className="font-display text-5xl font-black leading-none tracking-tight text-ink">Account</h1>

      <div className="mt-10 space-y-8">
        <CloudAccountSection email={session.user.email ?? ''} />
        <ProfileSection />
        <DevicesSection />
      </div>
    </AppShell>
  )
}
