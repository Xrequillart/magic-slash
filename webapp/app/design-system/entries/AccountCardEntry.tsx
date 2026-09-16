'use client'

import { AccountCard, type AccountCardAction } from '@ds/desktop'
import {
  AtSign,
  ImageOff,
  ImagePlus,
  KeyRound,
  LogIn,
  LogOut,
  Trash2,
  UserPlus,
} from '@ds/desktop/icons'
import type { DesktopTheme } from '@/lib/desktopTheme'
import { EntryHeader, EntrySection, PropsTable, Snippet, Specimen, Stage, type PropRow } from '../parts'
import { usesOf } from './ids'

const noop = () => undefined

/** The five the app hands over when somebody is signed in. */
const MANAGE: AccountCardAction[] = [
  { id: 'choose-photo', label: 'Change photo', icon: ImagePlus, onClick: noop },
  { id: 'remove-photo', label: 'Remove photo', icon: ImageOff, tone: 'danger', onClick: noop },
  { id: 'change-password', label: 'Change password', icon: KeyRound, onClick: noop },
  { id: 'change-email', label: 'Change email', icon: AtSign, onClick: noop },
  { id: 'delete', label: 'Delete account', icon: Trash2, tone: 'danger', trailing: true, onClick: noop },
]

const PROPS: PropRow[] = [
  {
    name: 'avatar',
    type: '{ src: string | null; alt: string }',
    description:
      'Absent is a STATE and not a missing prop: nobody is signed in, so there is no person to draw and the card opens on the name alone. { src: null } is the other case — somebody is signed in and has never uploaded a photo, which draws the badge. alt is the caller’s, because this folder cannot read a translation.',
  },
  {
    name: 'name · hint',
    type: 'string · string',
    required: true,
    description:
      'The email, or the line saying nobody is signed in — and the quieter line under it. Both translated.',
  },
  {
    name: 'actions',
    type: 'AccountCardAction[]',
    description:
      'Beside the identity: what acts on the SESSION — sign in, sign out, join with an invitation.',
  },
  {
    name: 'manage',
    type: 'AccountCardAction[]',
    description:
      'Under a rule: what acts on the ACCOUNT — the photo, the password, the email, deleting the whole thing. Empty draws no rule, because signed out there is nothing to manage and a hairline under nothing is a divider that divides nothing.',
  },
  {
    name: 'AccountCardAction',
    type: '{ id, label, onClick, icon?, tone?, busy?, disabled?, trailing? }',
    description:
      'Banner’s shape, plus the two states a control talking to a server needs. tone is neutral | accent | danger — at most one accent per card, and danger is tinted rather than filled because deleting an account should read as available, never as the obvious next step. trailing pushes one control to the far end of its row; exactly one asks for it.',
  },
  {
    name: 'className',
    type: 'string',
    fallback: "''",
    description: 'Margins and width. Not the ground, the padding or the radius.',
  },
]

export function AccountCardEntry({ theme, onOpen }: { theme: DesktopTheme; onOpen?: (id: string) => void }) {
  return (
    <article className="flex flex-col divide-y divide-hairline">
      <EntryHeader title="AccountCard" uses={usesOf('accountcard')} onOpen={onOpen}>
        Who is signed in, and everything you can do about it — the card at the top of the
        account page.
      </EntryHeader>

      <EntrySection
        title="One card for both states"
        note="The app drew it as two: a signed-in branch with a face, a name and a row of five controls, and a signed-out branch with two lines and a pair of buttons. They shared a plate and nothing else, which is how they had drifted into different button heights and different paddings. Here the difference is data — a face or no face, one row of actions or two — and the arrangement is the same either way."
      >
        <Stage theme={theme} className="flex flex-col gap-5">
          <Specimen label="signed in — a photo, or the badge when there is none">
            <AccountCard
              avatar={{ src: null, alt: 'Account photo' }}
              name="camille@acme.dev"
              hint="Your plans and repositories follow you across machines"
              actions={[{ id: 'sign-out', label: 'Sign out', icon: LogOut, onClick: noop }]}
              manage={MANAGE}
            />
          </Specimen>
          <Specimen label="signed out — no face, no rule, and one accent">
            <AccountCard
              name="Not signed in"
              hint="Sign in to sync your plans and share repositories with your team"
              actions={[
                { id: 'join', label: 'Join with an invitation', icon: UserPlus, onClick: noop },
                { id: 'sign-in', label: 'Sign in', icon: LogIn, tone: 'accent', onClick: noop },
              ]}
            />
          </Specimen>
        </Stage>
      </EntrySection>

      <EntrySection
        title="No border"
        note="It was bg-surface border border-line-strong rounded-xl, and a hairline around a plate that is already a different colour from the ground is the same thing said twice — Button’s header states the rule and RepositoryItem learned it the same way. The surface is what separates the card from the page behind it."
      >
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          The one rule that stayed is the one <em>inside</em>: it separates the session row
          from the manage row, and those two answer different questions. A reader looking
          for “how do I leave” and a reader looking for “how do I change my email” are not
          looking in the same place.
        </p>
      </EntrySection>

      <EntrySection
        title="The actions arrive as data"
        note="Banner made this move first and the argument is the same: the app was passing rendered buttons, so every call site re-decided the height, the tone and the gap — and two buttons meaning the same thing on two surfaces did not match. A list of { label, icon, onClick } lets the card draw all of them at one rung, and rank them, which a caller handing over finished markup cannot ask for."
      >
        <Stage theme={theme} className="flex flex-col gap-5">
          <Specimen label="busy — the photo is uploading, and the press is blocked">
            <AccountCard
              avatar={{ src: null, alt: 'Account photo' }}
              name="camille@acme.dev"
              hint="Your plans and repositories follow you across machines"
              actions={[{ id: 'sign-out', label: 'Sign out', icon: LogOut, onClick: noop }]}
              manage={MANAGE.map((action) =>
                action.id === 'choose-photo' ? { ...action, busy: true } : action,
              )}
            />
          </Specimen>
          <Specimen label="no photo yet — nothing to remove, so no button to remove it">
            <AccountCard
              avatar={{ src: null, alt: 'Account photo' }}
              name="camille@acme.dev"
              hint="Your plans and repositories follow you across machines"
              actions={[{ id: 'sign-out', label: 'Sign out', icon: LogOut, onClick: noop }]}
              manage={MANAGE.filter((action) => action.id !== 'remove-photo')}
            />
          </Specimen>
        </Stage>
      </EntrySection>

      <EntrySection title="Props">
        <PropsTable rows={PROPS} />
        <Snippet>{`import { AccountCard } from '@ds/desktop'

<AccountCard
  avatar={{ src: avatar, alt: t('cloud.avatar.alt') }}
  name={status.user?.email ?? t('cloud.signedInFallback')}
  hint={t('cloud.signedInHint')}
  actions={[{ id: 'sign-out', label: t('cloud.signOut'), icon: LogOut, onClick: logout }]}
  manage={[…]}
/>`}</Snippet>
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          The app’s <code>CloudAccountSection</code> is what does the wiring: the session,
          the avatar bytes, the translator, and the four dialogs behind the manage row.
        </p>
      </EntrySection>
    </article>
  )
}
