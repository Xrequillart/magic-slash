import type { MessageKey } from './index'
import type { UserProfile } from '../types'

/**
 * Catalogue keys for the three enumerated profile fields, in the order they are
 * offered to the user — every surface that renders them (the onboarding wizard,
 * the inline profile form, the profile card) iterates these maps, so a role added
 * to `UserProfile` fails to compile until it has a label.
 *
 * They live here rather than in types.ts because that module is what i18n/
 * imports; a `MessageKey` reference from there would close an import cycle.
 * Resolution happens in the render path, through `useT()`.
 */
export const ROLE_LABEL_KEYS: Record<UserProfile['role'], MessageKey> = {
  product: 'profile.role.product',
  dev: 'profile.role.dev',
  design: 'profile.role.design',
  qa: 'profile.role.qa',
  ops: 'profile.role.ops',
  manager: 'profile.role.manager',
  other: 'profile.role.other',
}

export const LEVEL_LABEL_KEYS: Record<UserProfile['technical_level'], MessageKey> = {
  beginner: 'profile.level.beginner',
  intermediate: 'profile.level.intermediate',
  expert: 'profile.level.expert',
}

export const STYLE_LABEL_KEYS: Record<NonNullable<UserProfile['communication_style']>, MessageKey> = {
  simple: 'profile.style.simple',
  technical: 'profile.style.technical',
  detailed: 'profile.style.detailed',
}
