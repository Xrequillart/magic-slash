import { describe, expect, it } from 'vitest'
import { doneCount, isOnboarded, onboardingState, TOTAL_STEPS } from './onboarding'
import type { Installation } from './installations'
import type { Org } from './orgs'
import type { UserProfile } from './profileShape'

/**
 * What breaks when a step is added, and why nothing else would catch it.
 *
 * `TOTAL_STEPS`, the `OnboardingState` fields and the sum in `doneCount` are three
 * places that have to agree, and `tsc` sees no relation between them. Add a fourth
 * field, forget the constant, and `isOnboarded` can never be true again: the checklist
 * shows "4/3" and stays on the dashboard forever, hiding the team view behind it. No
 * error, no crash — just a page that will not move on.
 *
 * The state is derived from live rows, so these check the DERIVATION, not the copy: the
 * loading protocol (nothing renders until every source has answered) and the rule that
 * one bound repository is enough.
 */

/** Fully built rather than cast: a cast would survive the field it forgot. */
const ORG: Org = { id: 'o1', name: 'Acme', role: 'admin', createdBy: null }
const PROFILE: UserProfile = {
  name: 'Ada',
  role: 'dev',
  technicalLevel: 'expert',
  communicationStyle: 'technical',
  languages: ['en'],
  freeText: '',
}
const INSTALL: Installation = {
  deviceId: 'd1',
  deviceName: 'laptop',
  appVersion: '0.64.3',
  platform: 'darwin',
  arch: 'arm64',
  firstSeenAt: '2026-08-01T00:00:00Z',
  lastSeenAt: '2026-08-05T00:00:00Z',
}

const complete = () => onboardingState([ORG], PROFILE, [INSTALL], 1)

describe('onboardingState', () => {
  it('counts every step it exposes, so a finished checklist can finish', () => {
    const state = complete()
    expect(state).not.toBeNull()
    expect(doneCount(state!), 'doneCount misses a field of OnboardingState').toBe(TOTAL_STEPS)
    expect(Object.keys(state!), 'a step with no field, or a field with no step').toHaveLength(
      TOTAL_STEPS,
    )
    expect(isOnboarded(state)).toBe(true)
  })

  it('waits for every source before showing a step as pending', () => {
    // `undefined` profile is "not fetched", `null` is "fetched, no row" — only the
    // second is an answer. Same for a null count against a zero one.
    expect(onboardingState(null, PROFILE, [INSTALL], 1)).toBeNull()
    expect(onboardingState([ORG], undefined, [INSTALL], 1)).toBeNull()
    expect(onboardingState([ORG], PROFILE, null, 1)).toBeNull()
    expect(onboardingState([ORG], PROFILE, [INSTALL], null)).toBeNull()
    expect(onboardingState([], null, [], 0)).not.toBeNull()
  })

  it('ticks the path step off the first bound repository', () => {
    expect(onboardingState([ORG], PROFILE, [INSTALL], 0)?.repoPath).toBe(false)
    expect(onboardingState([ORG], PROFILE, [INSTALL], 1)?.repoPath).toBe(true)
    expect(onboardingState([ORG], PROFILE, [INSTALL], 7)?.repoPath).toBe(true)
  })

  it('does not call a checklist done because most of it is', () => {
    const state = onboardingState([ORG], PROFILE, [INSTALL], 0)
    expect(doneCount(state!)).toBe(TOTAL_STEPS - 1)
    expect(isOnboarded(state)).toBe(false)
  })
})
