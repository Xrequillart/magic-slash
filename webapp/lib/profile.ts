import { getSupabase } from './supabase'
import { t, type MessageKey } from './i18n'
import { DEFAULT_LANGUAGE, type LanguageId } from './i18n/languages'

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

interface ProfileRow {
  name: string | null
  role: string | null
  technical_level: string | null
  communication_style: string | null
  languages: string[] | null
  free_text: string | null
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

export async function fetchProfile(): Promise<UserProfile | null> {
  const supabase = getSupabase()
  const { data: userData } = await supabase.auth.getUser()
  const uid = userData.user?.id
  if (!uid) return null

  const { data, error } = await supabase
    .from('profiles')
    .select('name, role, technical_level, communication_style, languages, free_text')
    .eq('user_id', uid)
    .maybeSingle()
  if (error || !data) return null

  const r = data as ProfileRow
  return {
    name: r.name ?? '',
    role: (r.role as ProfileRole) || 'dev',
    technicalLevel: (r.technical_level as ProfileLevel) || 'intermediate',
    communicationStyle: (r.communication_style as ProfileStyle) || null,
    languages: r.languages ?? [],
    freeText: r.free_text ?? '',
  }
}

export async function saveProfile(
  p: UserProfile,
  lang: LanguageId = DEFAULT_LANGUAGE,
): Promise<void> {
  const supabase = getSupabase()
  const { data: userData } = await supabase.auth.getUser()
  const uid = userData.user?.id
  if (!uid) throw new Error(t('common.notSignedIn', lang))

  const { error } = await supabase.from('profiles').upsert(
    {
      user_id: uid,
      name: p.name.trim(),
      role: p.role,
      technical_level: p.technicalLevel,
      communication_style: p.communicationStyle,
      languages: p.languages,
      free_text: p.freeText.trim() || null,
    },
    { onConflict: 'user_id' },
  )
  if (error) throw new Error(error.message)
}
