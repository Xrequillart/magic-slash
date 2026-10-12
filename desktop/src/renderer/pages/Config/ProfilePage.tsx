import { ProfileSection } from './ProfileSection'

/**
 * WHO CLAUDE IS TALKING TO: the profile the /magic:* skills read before they answer.
 *
 * It was the last section of Account, under the sign-in and the checklist, where it read
 * as one more fact about the cloud account. It is not one: the account is who the APP is
 * signed in as, the profile is how CLAUDE should speak to you, and the two are edited for
 * different reasons. A page of its own, right after Account, with the sentence under its
 * heading that says what it changes.
 */
export function ProfilePage() {
  return <ProfileSection />
}
