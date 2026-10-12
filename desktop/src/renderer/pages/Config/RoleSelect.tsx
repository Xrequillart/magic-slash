import type { SelectOption } from '@ds/desktop'
import { Shield, User } from '@ds/desktop/icons'
import type { MessageKey, Translate } from '../../i18n'
import type { MembershipRole } from '../../../types'

// Catalogue keys, not labels — same reason as THEMES and SETTINGS_TABS: module
// scope is evaluated once at import, so a literal would freeze at the boot language.
const ROLE_OPTIONS: { value: MembershipRole; labelKey: MessageKey; icon: typeof Shield }[] = [
  { value: 'user', labelKey: 'role.user', icon: User },
  { value: 'admin', labelKey: 'role.admin', icon: Shield },
]

/**
 * The two roles as `Select` wants them, translated.
 *
 * The design system draws the picker itself — `OrganizationCard` on every member row,
 * `OrganizationDialog` under the invitation's address — and takes its options as data.
 * Two lists of roles is one of them going stale, so there is one, and it is here.
 */
export function roleOptions(t: Translate): SelectOption[] {
  return ROLE_OPTIONS.map((option) => ({
    value: option.value,
    label: t(option.labelKey),
    icon: option.icon,
  }))
}
