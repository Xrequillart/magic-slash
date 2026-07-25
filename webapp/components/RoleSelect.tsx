'use client'

import { Shield, User } from 'lucide-react'
import { Dropdown, type DropdownOption } from '@/components/Dropdown'
import type { Role } from '@/lib/orgs'

/**
 * Role picker for a member row — the generic Dropdown with the two membership
 * roles and their consequences spelled out, sized to sit inside a table cell.
 */

const ROLE_OPTIONS: DropdownOption<Role>[] = [
  {
    value: 'user',
    label: 'Member',
    description: 'Can see the team and work on shared repositories',
    icon: User,
  },
  {
    value: 'admin',
    label: 'Admin',
    description: 'Can invite, change roles and archive the organization',
    icon: Shield,
  },
]

export function RoleSelect({
  value,
  onChange,
  disabled,
}: {
  value: Role
  onChange: (role: Role) => void
  disabled?: boolean
}) {
  return (
    <Dropdown
      value={value}
      options={ROLE_OPTIONS}
      onChange={onChange}
      disabled={disabled}
      width={260}
      size="sm"
      className="w-[7.5rem]"
    />
  )
}
