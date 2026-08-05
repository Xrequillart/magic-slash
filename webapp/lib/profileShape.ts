import type { MessageKey } from './i18n'

/**
 * What a profile IS — its shape, the names its values go by on screen, and what makes
 * one filled in. No Supabase: `profile.ts` keeps the reads and writes and re-exports
 * everything here, so this split is invisible to anything that renders a profile.
 *
 * It exists because of how this repo runs its tests. The root vitest suite covers
 * `webapp/lib/**` on the ROOT node_modules and CI never installs the webapp's own, so a
 * module that reaches the Supabase client at ANY depth cannot be tested — it fails to
 * resolve rather than to assert (see vitest.config.ts). `onboarding.ts` needs one
 * predicate from here, `isProfileComplete`, and importing it from the data layer was
 * enough to drag `@supabase/supabase-js` into `onboarding.test.ts` and turn a green
 * local run into a red CI.
 *
 * Same shape as `teamRows.ts` beside `team.ts`, and `settingsCatalog.ts` beside
 * `settings.ts`: the rule lives where it can be checked, the round trip stays behind it.
 */

export type ProfileRole = 'product' | 'dev' | 'design' | 'qa' | 'ops' | 'manager' | 'other'
export type ProfileLevel = 'beginner' | 'intermediate' | 'expert'
export type ProfileStyle = 'simple' | 'technical' | 'detailed'

export interface UserProfile {
  name: string
  role: ProfileRole
  technicalLevel: ProfileLevel
  communicationStyle: ProfileStyle | null
  languages: string[]
  freeText: string
}

/**
 * How each stored profile value is named on screen — as message KEYS, not as text,
 * because these labels are rendered in whatever language the visitor picked while the
 * values themselves are what sits in the database.
 *
 * The maps are total, so adding a role without naming it is a tsc error. Mirrors
 * `desktop/src/i18n/profileLabels.ts`, which does the same thing for the same reason.
 */
export const ROLE_LABEL_KEYS: Record<ProfileRole, MessageKey> = {
  product: 'profile.role.product',
  dev: 'profile.role.dev',
  design: 'profile.role.design',
  qa: 'profile.role.qa',
  ops: 'profile.role.ops',
  manager: 'profile.role.manager',
  other: 'profile.role.other',
}

export const LEVEL_LABEL_KEYS: Record<ProfileLevel, MessageKey> = {
  beginner: 'profile.level.beginner',
  intermediate: 'profile.level.intermediate',
  expert: 'profile.level.expert',
}

export const STYLE_LABEL_KEYS: Record<ProfileStyle, MessageKey> = {
  simple: 'profile.style.simple',
  technical: 'profile.style.technical',
  detailed: 'profile.style.detailed',
}

export const EMPTY_PROFILE: UserProfile = {
  name: '',
  role: 'dev',
  technicalLevel: 'intermediate',
  communicationStyle: null,
  languages: [],
  freeText: '',
}

/**
 * Whether the user has actually filled their profile in. A row can exist with
 * only defaults, so the name — the one field the wizard requires — is the test.
 */
export function isProfileComplete(p: UserProfile | null): boolean {
  return !!p && p.name.trim().length > 0
}
