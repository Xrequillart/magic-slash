'use client'

import { useState } from 'react'
import { OrganizationCard, type OrganizationCardMember, type SelectOption } from '@ds/desktop'
import { Shield, User } from '@ds/desktop/icons'
import type { DesktopTheme } from '@/lib/desktopTheme'
import { EntryHeader, EntrySection, PropsTable, Snippet, Specimen, Stage, type PropRow } from '../parts'
import { usesOf } from './ids'

const noop = () => undefined

const ROLES: SelectOption[] = [
  { value: 'user', label: 'User', icon: User },
  { value: 'admin', label: 'Admin', icon: Shield },
]

const COLUMNS = { member: 'Member', role: 'Role', actions: 'Actions' }

/** Four people, as an admin sees them: every role a picker, everyone but you removable. */
const MEMBERS: OrganizationCardMember[] = [
  {
    id: '1',
    name: 'camille@acme.dev',
    note: ' (you)',
    role: 'admin',
    roleLabel: 'admin',
    roleStrong: true,
    roleOptions: ROLES,
    onRoleChange: noop,
  },
  {
    id: '2',
    name: 'jean-baptiste.dubois-lefevre@a-very-long-company-name.example',
    role: 'user',
    roleLabel: 'user',
    roleOptions: ROLES,
    onRoleChange: noop,
    remove: { title: 'Remove member', onClick: noop },
  },
  {
    id: '3',
    name: 'ada@acme.dev',
    role: 'user',
    roleLabel: 'user',
    busy: true,
    roleOptions: ROLES,
    onRoleChange: noop,
    remove: { title: 'Remove member', onClick: noop },
  },
]

const PROPS: PropRow[] = [
  {
    name: 'name',
    type: 'string',
    required: true,
    description: 'The organization, in the band at the top.',
  },
  {
    name: 'members',
    type: '{ label, empty, columns, rows }',
    required: true,
    description:
      'The band’s heading, what stands where the rows would be when there are none, the three column names for a screen reader alone, and the people. The table’s own headers are sr-only: the rows read perfectly without them — a face, an address, a role, a cross — and a visible header row above four people is a table pretending to be a spreadsheet.',
  },
  {
    name: 'OrganizationCardMember',
    type: '{ id, name, role, roleLabel, note?, avatar?, roleStrong?, roleOptions?, onRoleChange?, busy?, remove? }',
    description:
      'role is the VALUE (admin, user) and roleLabel is the same role as a word — two fields because the app has two catalogues for this and the casing differs between them: a pill reading “admin” in a sentence-shaped row, and “Admin” on a control you press. A member handed roleOptions gets a picker, one without gets a pill, and the two stand at the same 28px so a roster does not change height depending on whether you happen to be an admin.',
  },
  {
    name: 'invitations',
    type: '{ label, empty, rows, invite? }',
    description:
      'The people who have been asked. ABSENT IS A STATE: a reader who may not see them is handed none, and the band is not drawn at all — where an empty list would say “no invitation” to somebody not allowed to know. Only pending, expired and revoked belong here; an accepted invitation is a member now, listed with its role one band up.',
  },
  {
    name: 'leave · note',
    type: '{ label, onClick, busy? } · string',
    description:
      'One or the other, in the same place. The last admin cannot walk out without locking everyone else out, so the sentence saying so stands where the button would be. Which of the two it is, is the app’s: counting admins is not a card’s job.',
  },
  {
    name: 'archive',
    type: '{ label, onClick }',
    description:
      'The destructive one, held at the far edge whether or not Leave is beside it — they are not a pair to choose between. Admin only, and absent otherwise.',
  },
]

export function OrganizationCardEntry({ theme, onOpen }: { theme: DesktopTheme; onOpen?: (id: string) => void }) {
  const [role, setRole] = useState('user')

  return (
    <article className="flex flex-col divide-y divide-hairline">
      <EntryHeader title="OrganizationCard" uses={usesOf('organizationcard')} onOpen={onOpen}>
        One organization, whole: who is in it, who has been asked, and the two ways out.
      </EntryHeader>

      <EntrySection
        title="Four bands, and the order is the component"
        note="The name, then the people, then the people who have been asked and have not answered, then what you can do that cannot be undone. A reader arrives asking “who is in this”, which is the second band and the tallest; the invitations are the same question about the future, so they follow it rather than the name; and the destructive pair goes last because a control you must not press by mistake belongs where the eye arrives last."
      >
        <Stage theme={theme}>
          <Specimen label="as an admin sees it — every role a picker, one row waiting on the server">
            <OrganizationCard
              name="Acme"
              members={{
                label: 'Members',
                empty: 'No members yet.',
                columns: COLUMNS,
                rows: MEMBERS.map((m) =>
                  m.id === '2' ? { ...m, role, roleLabel: role, onRoleChange: setRole } : m,
                ),
              }}
              invitations={{
                label: 'Invitations',
                empty: 'No pending invitation.',
                invite: { label: 'Invite', onClick: noop },
                rows: [
                  {
                    id: 'a',
                    email: 'nour@acme.dev',
                    status: 'pending',
                    pending: true,
                    copy: {
                      label: 'Invite link',
                      copiedLabel: 'Copied',
                      title: 'Copy invitation link',
                      copied: false,
                      onClick: noop,
                    },
                    remove: { title: 'Delete invitation', onClick: noop },
                  },
                  {
                    id: 'b',
                    email: 'sam@acme.dev',
                    status: 'expired',
                    remove: { title: 'Delete invitation', onClick: noop },
                  },
                ],
              }}
              leave={{ label: 'Leave organization', onClick: noop }}
              archive={{ label: 'Archive organization', onClick: noop }}
            />
          </Specimen>
        </Stage>
      </EntrySection>

      <EntrySection
        title="Who may do what arrives as a handler, or not at all"
        note="The card does not know what an admin is, and should not. A non-admin is handed no invitations, no role options, no remove buttons and no archive; what it draws is the presence or absence of each, rather than a permission this folder would have to interpret. The one thing it never loses is the roster: reading who you work with is not a privilege."
      >
        <Stage theme={theme}>
          <Specimen label="as a member sees it — pills, no invitations band, one way out">
            <OrganizationCard
              name="Acme"
              members={{
                label: 'Members',
                empty: 'No members yet.',
                columns: COLUMNS,
                rows: MEMBERS.map((m) => ({
                  ...m,
                  busy: false,
                  roleOptions: undefined,
                  onRoleChange: undefined,
                  remove: undefined,
                })),
              }}
              leave={{ label: 'Leave organization', onClick: noop }}
            />
          </Specimen>
        </Stage>
      </EntrySection>

      <EntrySection
        title="The sole admin cannot leave"
        note="The last admin walking out locks everyone else out of the organization, so the button is replaced by the sentence saying why. Same band, same place: a reader looking for the way out finds the answer where the way out was, rather than finding nothing and wondering whether the card failed to draw."
      >
        <Stage theme={theme}>
          <Specimen label="no Leave, and the reason where it stood">
            <OrganizationCard
              name="Acme"
              members={{
                label: 'Members',
                empty: 'No members yet.',
                columns: COLUMNS,
                rows: [MEMBERS[0]],
              }}
              invitations={{
                label: 'Invitations',
                empty: 'No pending invitation.',
                invite: { label: 'Invite', onClick: noop },
                rows: [],
              }}
              note="You are the only admin: promote somebody else before leaving, or archive the organization."
              archive={{ label: 'Archive organization', onClick: noop }}
            />
          </Specimen>
        </Stage>
      </EntrySection>

      <EntrySection title="Props">
        <PropsTable rows={PROPS} />
        <Snippet>{`import { OrganizationCard } from '@ds/desktop'

<OrganizationCard
  name={org.name}
  members={{
    label: t('org.members'),
    empty: t('org.membersEmpty'),
    columns: { member: t('org.colMember'), role: t('org.colRole'), actions: t('org.colActions') },
    rows: members.map((m) => ({
      id: m.userId,
      name: m.email ?? m.userId,
      note: m.userId === currentUserId ? t('org.you') : undefined,
      avatar: avatars[m.userId] ?? null,
      role: m.role,
      roleLabel: roleLabel(m.role, t),
      roleStrong: m.role === 'admin',
      roleOptions: isAdmin ? roleOptions(t) : undefined,
      onRoleChange: isAdmin ? (role) => changeRole(org.id, m.userId, role) : undefined,
    })),
  }}
/>`}</Snippet>
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          The app’s <code>OrgPage</code> does the wiring: the hooks, the six handlers, the
          four modals and the translator. What crossed over with the drawing is what was
          never about an organization — seven hand-built controls, three plates spelled
          out by hand, and two roster pills with their own idea of what an accent tint is.
        </p>
      </EntrySection>
    </article>
  )
}
