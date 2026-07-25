import type { Installation } from './installations'
import type { Org } from './orgs'
import { isProfileComplete, type UserProfile } from './profile'

/**
 * The three onboarding steps, derived from real data rather than a stored flag.
 * Shared between the checklist that renders them and the dashboard, which
 * watches the count to fire confetti and to decide when to show stats instead.
 */

export interface OnboardingState {
  org: boolean
  profile: boolean
  install: boolean
}

export const TOTAL_STEPS = 3

/**
 * Returns null while any source is still loading — `undefined` profile means
 * "not fetched yet", `null` means "fetched, no row". Callers render nothing
 * until this resolves, so no step ever flashes as pending.
 */
export function onboardingState(
  orgs: Org[] | null,
  profile: UserProfile | null | undefined,
  installs: Installation[] | null,
): OnboardingState | null {
  if (orgs === null || installs === null || profile === undefined) return null
  return {
    org: orgs.length > 0,
    profile: isProfileComplete(profile),
    install: installs.length > 0,
  }
}

export function doneCount(state: OnboardingState): number {
  return Number(state.org) + Number(state.profile) + Number(state.install)
}

/** All steps done — the checklist has nothing left to show. */
export function isOnboarded(state: OnboardingState | null): boolean {
  return !!state && doneCount(state) === TOTAL_STEPS
}
