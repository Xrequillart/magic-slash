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
  /**
   * The `avatars` Storage object path of the profile photo, or null.
   *
   * READ-ONLY on this side. The photo is set and removed from the desktop app's
   * Account tab, which is the only place that can talk to Storage; the webapp
   * carries the field so it round-trips through `fetchProfile` and so nothing
   * here believes a profile is a shape without it. It is deliberately NOT part
   * of `profileUpsertPayload` — see that function.
   */
  avatarUrl: string | null
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
  avatarUrl: null,
}

/**
 * Whether the user has actually filled their profile in. A row can exist with
 * only defaults, so the name — the one field the wizard requires — is the test.
 */
export function isProfileComplete(p: UserProfile | null): boolean {
  return !!p && p.name.trim().length > 0
}

/**
 * The `profiles` row a save writes — every column the webapp owns, and NOT
 * `avatar_url`.
 *
 * WHY THIS IS A FUNCTION AND NOT AN INLINE LITERAL
 * ---------------------------------------------------------------------------
 * Because the literal was a trap, and an invisible one. `saveProfile` upserts,
 * and an upsert writes exactly the columns it is given: leave `avatar_url` out
 * and PostgREST does not touch it, put it in and whatever the form happens to
 * hold overwrites the photo. The webapp's form has no avatar control at all, so
 * a well-meant "harmonise the payload with the interface" — adding the field
 * because `UserProfile` now has it — would send `avatar_url: null` and silently
 * delete the photo the user set in the desktop app, on every profile save.
 *
 * Extracted so that failure mode has a test rather than a comment: the payload
 * is now a value that can be inspected without a Supabase client anywhere near
 * it (profileShape.test.ts). The same rule holds one process over, in
 * `desktop/src/main/store/CloudStore.saveProfile`, for the same reason.
 *
 * `avatarUrl` is therefore read from the row and dropped on the way back: it is
 * the desktop's to write, through its own single-column upsert.
 */
export interface ProfileUpsertPayload {
  user_id: string
  name: string
  role: ProfileRole
  technical_level: ProfileLevel
  communication_style: ProfileStyle | null
  languages: string[]
  free_text: string | null
}

export function profileUpsertPayload(p: UserProfile, uid: string): ProfileUpsertPayload {
  return {
    user_id: uid,
    name: p.name.trim(),
    role: p.role,
    technical_level: p.technicalLevel,
    communication_style: p.communicationStyle,
    languages: p.languages,
    free_text: p.freeText.trim() || null,
  }
}
