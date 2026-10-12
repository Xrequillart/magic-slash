import type { UserProfile } from '../../types'

/**
 * The profile while it is being edited, and the two conversions either side of it.
 *
 * WHY A SEPARATE TYPE AT ALL. `UserProfile` cannot model a half-filled form: `name`,
 * `role` and `technical_level` are required there, and they have to be, because that
 * type is what the /magic:* skills read and a profile missing its level is a profile
 * that cannot do its job. A form, meanwhile, is half-filled by definition for as long as
 * somebody is filling it in. So the draft has every field PRESENT and possibly EMPTY,
 * and `profileFromDraft` is the one place the narrowing happens.
 *
 * IT LEFT `ProfileFields.tsx` WHEN THAT COMPONENT DIED. The drawing went to
 * `@ds/desktop`'s `ProfileCard`; this is the part that was never drawing — pure
 * functions over a shape, testable without a renderer, which is what the rest of
 * `utils/` is.
 */
export interface ProfileDraft {
  name: string
  role: UserProfile['role'] | ''
  technical_level: UserProfile['technical_level'] | ''
  communication_style: NonNullable<UserProfile['communication_style']> | ''
  languages: string[]
  freeText: string
}

/** A stored profile as a draft, or an empty draft when there is none yet. */
export function draftFromProfile(profile: UserProfile | null): ProfileDraft {
  return {
    name: profile?.name ?? '',
    role: profile?.role ?? '',
    technical_level: profile?.technical_level ?? '',
    communication_style: profile?.communication_style ?? '',
    languages: profile?.languages ?? [],
    freeText: profile?.freeText ?? '',
  }
}

/**
 * Narrow a draft to a profile, or null when a required field is still empty.
 *
 * NULL IS "NOT YET", NOT "BROKEN". Somebody halfway through filling the card in has a
 * draft this cannot narrow, and that is the normal state of the first thirty seconds —
 * which is why the caller answers it with a line of text rather than an error.
 *
 * THE OPTIONAL FIELDS ARE OMITTED RATHER THAN SENT EMPTY, and that is not tidiness: the
 * store writes every optional column as `?? null`, so an empty string here would land in
 * the database as a style nobody chose. An absent key and a null column are the same
 * fact — "not answered" — and this is where the empty string stops being one of the
 * three ways to say it.
 */
export function profileFromDraft(draft: ProfileDraft): UserProfile | null {
  if (!draft.name.trim() || !draft.role || !draft.technical_level) return null
  const profile: UserProfile = {
    name: draft.name.trim(),
    role: draft.role,
    technical_level: draft.technical_level,
  }
  if (draft.communication_style) profile.communication_style = draft.communication_style
  if (draft.languages.length > 0) profile.languages = draft.languages
  if (draft.freeText.trim()) profile.freeText = draft.freeText.trim()
  return profile
}
