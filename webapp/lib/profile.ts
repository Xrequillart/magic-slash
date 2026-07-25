import { getSupabase } from './supabase'

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

export const ROLE_LABELS: Record<ProfileRole, string> = {
  product: 'Product',
  dev: 'Dev',
  design: 'Design',
  qa: 'QA',
  ops: 'Ops',
  manager: 'Manager',
  other: 'Other',
}

export const LEVEL_LABELS: Record<ProfileLevel, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  expert: 'Expert',
}

export const STYLE_LABELS: Record<ProfileStyle, string> = {
  simple: 'Simple',
  technical: 'Technical',
  detailed: 'Detailed',
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

export async function saveProfile(p: UserProfile): Promise<void> {
  const supabase = getSupabase()
  const { data: userData } = await supabase.auth.getUser()
  const uid = userData.user?.id
  if (!uid) throw new Error('Not signed in')

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
