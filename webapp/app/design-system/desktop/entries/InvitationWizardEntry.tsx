'use client'

import { useState } from 'react'
import { InvitationWizard, type InvitationWizardRepo, type InvitationWizardStep } from '@ds/desktop'
import type { DesktopTheme } from '@/lib/desktopTheme'
import { EntryHeader, EntrySection, PropsTable, Snippet, Stage, type PropRow } from '../parts'
import { usesOf } from './ids'

const PROPS: PropRow[] = [
  { name: 'step', type: '1 | 2 | 3', required: true, description: 'Accept the invitation, bind the repositories, done. Decides the footer: back on step 2 only, skip until done, one answer per step.' },
  { name: 'title · closeTitle', type: 'string', required: true, description: 'The header, with its envelope mark and close button.' },
  { name: 'accept', type: '{ title, help, token, account, email, password }', required: true, description: 'Step 1. Each field is { value, onChange, placeholder }; account is the new or existing switch. Enter in the password accepts.' },
  { name: 'repos', type: '{ title, help, destination?, empty, rows, addOther }', required: true, description: 'Step 2. destination is where clones land; each row is an InvitationWizardRepo.' },
  { name: 'repos.rows[]', type: 'InvitationWizardRepo', description: 'name, path or missingLabel, clone? and link buttons, and at most one note: pending (a question, with link anyway), warning or error.' },
  { name: 'done', type: '{ title, body }', required: true, description: 'Step 3.' },
  { name: 'error', type: 'string', description: 'The step’s failure, as a danger banner under it.' },
  { name: 'labels', type: '{ back, skip, accept, continue, done }', required: true, description: 'The footer’s words.' },
  { name: 'busy', type: 'boolean', description: 'The step’s answer is out: its button spins.' },
  { name: 'onBack · onAccept · onContinue · onClose', type: '() => void', required: true, description: 'The answers. onClose is skip, done, the close button and the dimmed ground. Escape is the caller’s to bind.' },
  { name: 'backdropClassName · className · onAnimationEnd · portalTo', type: 'string · string · (e) => void · HTMLElement | null', description: 'Passed straight to Modal.' },
]

const ROWS: InvitationWizardRepo[] = [
  {
    id: 'webapp',
    name: 'poppins-webapp',
    path: '~/dev/poppins-webapp',
    missingLabel: 'No folder on this machine',
    link: { label: 'Change folder', onClick: () => {} },
  },
  {
    id: 'api',
    name: 'poppins-api',
    missingLabel: 'No folder on this machine',
    clone: { label: 'Clone', busyLabel: 'Cloning…', remoteUrl: 'git@github.com:poppins/poppins-api.git', onClick: () => {} },
    link: { label: 'Link folder', onClick: () => {} },
  },
  {
    id: 'mobile',
    name: 'poppins-mobile',
    missingLabel: 'No folder on this machine',
    link: { label: 'Link folder', onClick: () => {} },
    pending: {
      message: 'The folder “app” does not look like poppins-mobile. Link it anyway?',
      confirmLabel: 'Link anyway',
      cancelLabel: 'Cancel',
      onConfirm: () => {},
      onCancel: () => {},
    },
  },
]

function Demo() {
  const [portal, setPortal] = useState<HTMLDivElement | null>(null)
  const [step, setStep] = useState<InvitationWizardStep | null>(null)
  const [token, setToken] = useState('')
  const [isNew, setIsNew] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const button = 'rounded-lg bg-surface px-3 py-2 text-xs font-medium text-ink transition-colors hover:bg-surface-strong'
  return (
    <div className="flex flex-col items-start gap-3">
      <div ref={setPortal} />
      <button type="button" className={button} onClick={() => setStep(1)}>Open the invitation</button>
      {step && (
        <InvitationWizard
          step={step}
          title="Join an organization"
          closeTitle="Close (Esc)"
          accept={{
            title: 'Accept the invitation',
            help: 'Paste the link from the email, then sign up or sign in.',
            token: { value: token, onChange: setToken, placeholder: 'https://invite.magic-slash.io/…' },
            account: { ariaLabel: 'Account', isNew, onChange: setIsNew, newLabel: 'New account', existingLabel: 'I have an account' },
            email: { value: email, onChange: setEmail, placeholder: 'you@example.com' },
            password: { value: password, onChange: setPassword, placeholder: 'Password' },
          }}
          repos={{
            title: 'The organization’s repositories',
            help: 'Point each one at its folder on this machine, or clone it.',
            destination: { label: 'Clones go to', path: '~/dev', changeLabel: 'Change', onChange: () => {} },
            empty: 'This organization has no repository yet.',
            rows: ROWS,
            addOther: { label: 'Add another repository', onClick: () => {} },
          }}
          done={{ title: 'You are in', body: 'Welcome to Poppins.' }}
          labels={{ back: 'Back', skip: 'Skip', accept: 'Accept', continue: 'Continue', done: 'Done' }}
          onBack={() => setStep(1)}
          onAccept={() => setStep(2)}
          onContinue={() => setStep(3)}
          onClose={() => setStep(null)}
          portalTo={portal}
        />
      )}
    </div>
  )
}

export function InvitationWizardEntry({ theme, onOpen }: { theme: DesktopTheme; onOpen?: (id: string) => void }) {
  return (
    <article className="flex flex-col divide-y divide-hairline">
      <EntryHeader title="InvitationWizard" uses={usesOf('invitationwizard')} onOpen={onOpen}>
        Joining an organization from an invitation, in three steps: accept it, bind the
        organization’s repositories to folders on this machine, done.
      </EntryHeader>

      <EntrySection
        title="From the invitation to the repositories"
        note="Where the app opens it: an invitation link, or Settings → Account. Accept and Continue move through the steps; the sample repositories show a bound row, a row to clone, and a folder whose name does not match."
      >
        <Stage theme={theme}>
          <Demo />
        </Stage>
      </EntrySection>

      <EntrySection title="Props">
        <PropsTable rows={PROPS} />
        <Snippet>{`import { InvitationWizard } from '@ds/desktop'

<InvitationWizard
  step={step}
  title={t('invite.wizard.title')}
  accept={{ title, help, token, account, email, password }}
  repos={{ title, help, destination, empty, rows, addOther }}
  done={{ title, body }}
  labels={{ back, skip, accept, continue: next, done }}
  busy={busy}
  onBack={back}
  onAccept={accept}
  onContinue={finish}
  onClose={close}
/>`}</Snippet>
      </EntrySection>
    </article>
  )
}
