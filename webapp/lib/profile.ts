import { getSupabase } from './supabase'
import { t } from './i18n'
import { DEFAULT_LANGUAGE, type LanguageId } from './i18n/languages'
import { type ProfileLevel, type ProfileRole, type ProfileStyle, type UserProfile } from './profileShape'

/**
 * Reading and writing the profile row. The shape itself — types, label keys and what
 * counts as complete — lives in `profileShape.ts` and is re-exported below, so importing
 * from here still gets everything while a caller that only needs the RULE can reach for
 * the pure module instead. See that file for why the two are apart.
 */

export * from './profileShape'

interface ProfileRow {
  name: string | null
  role: string | null
  technical_level: string | null
  communication_style: string | null
  languages: string[] | null
  free_text: string | null
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
