import { Select, type SelectOption } from '@ds/desktop'
import { Shield, User } from '@ds/desktop/icons'
import { useT } from '../../i18n'
import type { MessageKey, Translate } from '../../i18n'
import type { MembershipRole } from '../../../types'

// Catalogue keys, not labels — same reason as THEMES and SETTINGS_TABS: module
// scope is evaluated once at import, so a literal would freeze at the boot language.
const ROLE_OPTIONS: { value: MembershipRole; labelKey: MessageKey; icon: typeof Shield }[] = [
  { value: 'user', labelKey: 'role.user', icon: User },
  { value: 'admin', labelKey: 'role.admin', icon: Shield },
]

/**
 * Role picker for a member row.
 *
 * THE DRAWING IS `Select`'S NOW, and what is left is the two roles and what they mean.
 * The trigger used to wear the accent while the value was `admin`, which read as a
 * warning on a members table where being an admin is not one; every picker in the app
 * now tints for one reason only — being away from the default the page opens on — and a
 * role has no such default.
 *
 * TWO WORDS PER ROW, AND NOTHING UNDER THEM. Each role carried its help text as a second
 * line — `role.user.help` and its pair, which the old panel drew under every label and
 * which `Select` would put in the same place. It is a sentence of prose in a control 112
 * pixels wide: it wrapped to three lines, and it turned a list of two choices into a
 * paragraph to read. What a role grants belongs in the org's own documentation, not under
 * the cursor of somebody changing it. The two keys stay in `en.ts` and `fr.ts` — nothing
 * else reads them today, and deleting a translation is the expensive half to undo.
 *
 * THE WIDTH IS PINNED, and that is the one layout fact this file keeps: the trigger used
 * to shrink or grow with the selected label, so a members table showed a ragged column
 * of differently-sized pickers. The webapp's pins its width for the same reason.
 */
const WIDTH = 112

/**
 * The two roles as `Select` wants them, translated.
 *
 * Exported because the organization card draws this picker ITSELF, on every member row —
 * the design system's card takes its options as data rather than a rendered control. Two
 * lists of roles is one of them going stale, so there is one, and it is here.
 */
export function roleOptions(t: Translate): SelectOption[] {
  return ROLE_OPTIONS.map((option) => ({
    value: option.value,
    label: t(option.labelKey),
    icon: option.icon,
  }))
}

export function RoleSelect({
  value,
  onChange,
  disabled,
}: {
  value: MembershipRole
  onChange: (role: MembershipRole) => void
  disabled?: boolean
}) {
  const t = useT()

  return (
    <Select
      value={value}
      options={roleOptions(t)}
      onChange={(next) => onChange(next as MembershipRole)}
      width={WIDTH}
      disabled={disabled}
    />
  )
}
