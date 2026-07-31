'use client'

import { Shield, User } from 'lucide-react'
import { Dropdown, type DropdownOption } from '@/components/Dropdown'
import type { Role } from '@/lib/orgs'
import { useT } from '@/lib/i18n/useLanguage'

/**
 * Role picker for a member row — the generic Dropdown with the two membership
 * roles and their consequences spelled out, sized to sit inside a table cell.
 */

export function RoleSelect({
  value,
  onChange,
  disabled,
}: {
  value: Role
  onChange: (role: Role) => void
  disabled?: boolean
}) {
  const { t } = useT()

  const options: DropdownOption<Role>[] = [
    {
      value: 'user',
      label: t('org.role.member'),
      description: t('org.role.member.help'),
      icon: User,
    },
    {
      value: 'admin',
      label: t('org.role.admin'),
      description: t('org.role.admin.help'),
      icon: Shield,
    },
  ]

  return (
    <Dropdown
      value={value}
      options={options}
      onChange={onChange}
      disabled={disabled}
      width={260}
      size="sm"
      className="w-[7.5rem]"
    />
  )
}
