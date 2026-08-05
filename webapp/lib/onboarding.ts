import type { Installation } from './installations'
import type { Org } from './orgs'
import { isProfileComplete, type UserProfile } from './profile'

/**
 * The four onboarding steps, derived from real data rather than a stored flag.
 * Shared between the checklist that renders them and the dashboard, which
 * watches the count to fire confetti and to decide when to show stats instead.
 *
 * They are ordered by what the next one needs: an organization holds the repos, the
 * profile shapes how Claude answers, the app is what runs an agent — and the last one
 * is the local path, which cannot be bound until the app is installed to bind it.
 *
 * `repoPath` earns its place next to the other three: every skill starts by `cd`-ing
 * into the repository (see step 3 of magic-start), so a repo with no path bound is one
 * /magic:start cannot run in at all. The desktop app already treats it that way — it
 * shows such a repo in a warning state and refuses to launch an agent on it
 * (desktop/src/main/config/repo-validation.ts). It was the one prerequisite the
 * checklist stayed silent about, which left people to discover it from a failing skill.
 */

export interface OnboardingState {
  org: boolean
  profile: boolean
  install: boolean
  repoPath: boolean
}

export const TOTAL_STEPS = 4

/**
 * Returns null while any source is still loading — `undefined` profile means
 * "not fetched yet", `null` means "fetched, no row". Callers render nothing
 * until this resolves, so no step ever flashes as pending.
 */
export function onboardingState(
  orgs: Org[] | null,
  profile: UserProfile | null | undefined,
  installs: Installation[] | null,
  boundRepos: number | null,
): OnboardingState | null {
  if (orgs === null || installs === null || profile === undefined || boundRepos === null) {
    return null
  }
  return {
    org: orgs.length > 0,
    profile: isProfileComplete(profile),
    install: installs.length > 0,
    // ONE bound repo is enough. Someone with five repos and one folder chosen has
    // understood the step and can work; holding the checklist open until all five are
    // bound would keep nagging about repos they may not have cloned on this machine.
    repoPath: boundRepos > 0,
  }
}

export function doneCount(state: OnboardingState): number {
  return (
    Number(state.org) + Number(state.profile) + Number(state.install) + Number(state.repoPath)
  )
}

/** All steps done — the checklist has nothing left to show. */
export function isOnboarded(state: OnboardingState | null): boolean {
  return !!state && doneCount(state) === TOTAL_STEPS
}
