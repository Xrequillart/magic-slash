import { CloudAccountSection } from './CloudAccountSection'
import { ProfileSection } from './ProfileSection'

/**
 * Account tab: everything about *you* — the cloud identity you sign in with, and
 * the profile Claude reads to adapt its answers. The Organization tab keeps the
 * org-level concerns (members, invitations, integrations).
 */
export function AccountPage() {
  return (
    <div className="flex flex-col gap-8">
      <CloudAccountSection />
      <ProfileSection />
    </div>
  )
}
