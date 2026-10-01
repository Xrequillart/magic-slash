'use client'

import { useState } from 'react'
import { OrganizationDialog, type OrganizationDialogKind } from '@ds/desktop'
import { Shield, User } from '@ds/desktop/icons'
import type { DesktopTheme } from '@/lib/desktopTheme'
import { EntryHeader, EntrySection, PropsTable, Snippet, Stage, type PropRow } from '../parts'
import { usesOf } from './ids'

const PROPS: PropRow[] = [
  { name: 'kind', type: '"create" | "join" | "invite"', required: true, description: 'Which of the three. Picks the submit button’s mark and the field’s type: an email address to invite, a token in mono to join.' },
  { name: 'title · help', type: 'string', required: true, description: 'The heading, and one line on what happens. Translated.' },
  { name: 'field', type: '{ value, onChange, placeholder? }', required: true, description: 'The one field. Enter in it submits.' },
  { name: 'role', type: '{ label, value, options, onChange }', description: 'Inviting only: the role picker under the field, from the same options as the members table.' },
  { name: 'submit', type: '{ label, onClick, busy?, disabled? }', required: true, description: 'The answer. Busy swaps its mark for a spinner and stops it answering.' },
  { name: 'cancelLabel · onCancel', type: 'string · () => void', required: true, description: 'Cancel. The header’s close button and a press on the dimmed ground are onCancel too. Escape is the caller’s to bind.' },
  { name: 'closeTitle', type: 'string', description: 'The header’s close button tooltip.' },
  { name: 'backdropClassName · className · onAnimationEnd · portalTo', type: 'string · string · (e) => void · HTMLElement | null', description: 'Passed straight to Modal: the caller’s animation, and where a drawing of the app portals it.' },
]

const ROLES = [
  { value: 'user', label: 'Member', icon: User },
  { value: 'admin', label: 'Admin', icon: Shield },
]

const COPY: Record<OrganizationDialogKind, { title: string; help: string; placeholder: string; submit: string }> = {
  create: {
    title: 'Create an organization',
    help: 'You will be its admin, and can invite your team right after.',
    placeholder: 'Organization name',
    submit: 'Create',
  },
  join: {
    title: 'Join an organization',
    help: 'Paste the invitation link you received, or just its token.',
    placeholder: 'https://invite.magic-slash.io/…',
    submit: 'Join',
  },
  invite: {
    title: 'Invite to Poppins',
    help: 'They get a link by email, and join with the role you pick.',
    placeholder: 'colleague@example.com',
    submit: 'Send invitation',
  },
}

/** Opens on a press, in each of its three kinds, the way the organization page opens it. */
function Demo() {
  const [portal, setPortal] = useState<HTMLDivElement | null>(null)
  const [open, setOpen] = useState<OrganizationDialogKind | null>(null)
  const [value, setValue] = useState('')
  const [role, setRole] = useState('user')
  const [busy, setBusy] = useState(false)
  const button = 'rounded-lg bg-surface px-3 py-2 text-xs font-medium text-ink transition-colors hover:bg-surface-strong'
  const show = (kind: OrganizationDialogKind) => { setValue(''); setRole('user'); setBusy(false); setOpen(kind) }
  const close = () => setOpen(null)
  const copy = open ? COPY[open] : null
  return (
    <div className="flex flex-col items-start gap-3">
      <div ref={setPortal} />
      <div className="flex flex-wrap gap-2">
        <button type="button" className={button} onClick={() => show('create')}>Create</button>
        <button type="button" className={button} onClick={() => show('join')}>Join</button>
        <button type="button" className={button} onClick={() => show('invite')}>Invite</button>
      </div>
      {open && copy && (
        <OrganizationDialog
          kind={open}
          title={copy.title}
          help={copy.help}
          field={{ value, onChange: setValue, placeholder: copy.placeholder }}
          role={open === 'invite' ? { label: 'Role', value: role, options: ROLES, onChange: setRole } : undefined}
          submit={{
            label: copy.submit,
            busy,
            disabled: !value.trim(),
            onClick: () => { setBusy(true); window.setTimeout(close, 900) },
          }}
          cancelLabel="Cancel"
          onCancel={close}
          closeTitle="Close (Esc)"
          portalTo={portal}
        />
      )}
    </div>
  )
}

export function OrganizationDialogEntry({ theme, onOpen }: { theme: DesktopTheme; onOpen?: (id: string) => void }) {
  return (
    <article className="flex flex-col divide-y divide-hairline">
      <EntryHeader title="OrganizationDialog" uses={usesOf('organizationdialog')} onOpen={onOpen}>
        Create an organization, join one, or invite someone into one: a line on what happens,
        one field, and the answer. Inviting adds the role picker.
      </EntryHeader>

      <EntrySection
        title="The three kinds"
        note="Where the app opens them: Settings → Organizations, from the header’s Create and Join, and from an organization card’s Invite. Type something to enable the answer."
      >
        <Stage theme={theme}>
          <Demo />
        </Stage>
      </EntrySection>

      <EntrySection title="Props">
        <PropsTable rows={PROPS} />
        <Snippet>{`import { OrganizationDialog } from '@ds/desktop'

<OrganizationDialog
  kind="invite"
  title={t('org.inviteModal.title', { name: org.name })}
  help={t('org.inviteModal.help')}
  field={{ value: email, onChange: setEmail, placeholder: t('org.inviteModal.emailPlaceholder') }}
  role={{ label: t('org.colRole'), value: role, options: roleOptions(t), onChange: setRole }}
  submit={{ label: t('org.inviteModal.send'), onClick: invite, busy: inviting, disabled: !email.trim() }}
  cancelLabel={t('common.cancel')}
  onCancel={close}
/>`}</Snippet>
      </EntrySection>
    </article>
  )
}
