import { AccountChecklistCard } from './AccountChecklistCard'
import { CloudAccountSection } from './CloudAccountSection'
import { ProfileSection } from './ProfileSection'

/**
 * Account tab: everything about *you* — the cloud identity you sign in with, and
 * the profile Claude reads to adapt its answers. The Organization tab keeps the
 * org-level concerns (members, invitations, integrations), and Connections keeps
 * the credentials this machine holds for outside services.
 *
 * The checklist opens the tab because it is the summary of everything below it
 * (and of the setup living in Application): read the verdict, then scroll only if
 * it says something is missing.
 */
export function AccountPage() {
  return (
    <div className="flex flex-col gap-8">
      <AccountChecklistCard />
      <CloudAccountSection />
      <ProfileSection />
    </div>
  )
}
