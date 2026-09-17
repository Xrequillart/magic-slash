'use client'

import { AccountCard, type AccountCardRow } from '@ds/desktop'
import {
  ImageOff,
  Jira,
  JIRA_CHIP_GROUND,
  Clock,
  Link2,
  LogIn,
  LogOut,
  MagicSlash,
  Pencil,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Trash2,
  Unlink,
  UserPlus,
} from '@ds/desktop/icons'
import type { DesktopTheme } from '@/lib/desktopTheme'
import { EntryHeader, EntrySection, PropsTable, Snippet, Specimen, Stage, type PropRow } from '../parts'
import { usesOf } from './ids'

const noop = () => undefined

/** The five rows the app hands over when somebody is signed in. */
const ROWS: AccountCardRow[] = [
  {
    id: 'username',
    label: 'Username',
    value: 'camille',
    hint: 'Shown instead of your email address',
    actions: [{ id: 'change-username', label: 'Edit', icon: Pencil, onClick: noop }],
  },
  {
    id: 'avatar',
    label: 'Avatar',
    value: 'Updated on 16 September 2026',
    actions: [
      { id: 'choose-photo', label: 'Edit', icon: Pencil, onClick: noop },
      { id: 'remove-photo', label: 'Remove', icon: ImageOff, tone: 'danger', onClick: noop },
    ],
  },
  {
    id: 'email',
    label: 'Email',
    value: 'camille@acme.dev',
    actions: [{ id: 'change-email', label: 'Edit', icon: Pencil, onClick: noop }],
  },
  {
    id: 'password',
    label: 'Password',
    // Thin spaces, composed by the app: the card has no idea this value stands in
    // for a password, and what the stand-in looks like is the app's choice.
    value: '• • • • • • • •',
    hint: 'Last changed on 16 September 2026',
    actions: [{ id: 'change-password', label: 'Edit', icon: Pencil, onClick: noop }],
  },
  {
    id: 'delete-account',
    label: 'Delete my account',
    hint: 'Organizations where you are the only member are deleted with their data. The others pass to another member. This cannot be undone.',
    actions: [{ id: 'delete-account', label: 'Remove', icon: Trash2, tone: 'danger', onClick: noop }],
  },
]

/** The front the Connections tab hands over, in all four of its states. */
const JIRA_MARK = { glyph: Jira, title: 'Jira', tint: JIRA_CHIP_GROUND }

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
      'Who this is: the handle they picked, the email address while they have not picked one, or the line saying nobody is signed in. Which of those it is, is the app’s decision. Both translated.',
  },
  {
    name: 'actions',
    type: 'AccountCardAction[]',
    description:
      'Beside the identity: what acts on the SESSION — sign in, sign out, join with an invitation. Everything else acts on one setting and belongs to that setting’s line.',
  },
  {
    name: 'rows',
    type: 'AccountCardRow[]',
    description:
      'One line per setting, under a rule. Empty draws no rule, because signed out there is nothing to change and a hairline under nothing is a divider that divides nothing.',
  },
  {
    name: 'AccountCardRow',
    type: '{ id, label, actions, value?, unset?, hint? }',
    description:
      'Three cells, because they are three columns: label is the name of the setting, value is what it is set to, actions is what you can do about it. They are separate props rather than one composed string because a column only reads as one if every row puts the same kind of thing in it. The card does not know WHICH kind of value it is drawing — an address, a stand-in for a password, a date, an absence are all the same prop — because drawing them differently would be the card claiming to understand what the app put there. unset is the one distinction it draws, and it draws it because the app said so. An absent value is legitimate: deleting an account is a thing you do, not a thing that is set to something, so that cell holds the hint alone.'
  },
  {
    name: 'AccountCardAction',
    type: '{ id, label, onClick, icon?, tone?, busy?, disabled? }',
    description:
      'Banner’s shape, plus the two states a control talking to a server needs. tone is neutral | accent | danger — at most one accent per card, and danger is tinted rather than filled because deleting an account should read as available, never as the obvious next step.',
  },
  {
    name: 'mark',
    type: '{ glyph, title, tint? }',
    description:
      'The front, for an account that is not a person’s: a service’s logo on its own tile where the avatar draws a face. It sits on Avatar’s lg geometry, read from the ladder rather than respelled, so the identity band is exactly as tall either way — and it is square where the face is round, because every one of these logos is drawn on a square grid and a circle crops it. tint is a value and never a token: a brand’s colour belongs to that brand, and a class in this palette would be the app claiming it. With avatar and not beside it — a card has one subject, so it has one front.',
  },
  {
    name: 'alert',
    type: '{ message, hint?, variant?, icon?, actions? }',
    description:
      'The account is listed but not working — a revoked authorisation, a credential the service has started refusing. Banner draws it in its inset layout, full-bleed across the card, and the card gives back its own padding so the band reaches its edges. It is not a row, because a row is a setting: a thing with a value you can change. This has no value and nothing to set; it is the reason the account above it does not work. danger unless stated.',
  },
  {
    name: 'note',
    type: 'string',
    description:
      'The last line, under a hairline: what holds true for the whole card — where a credential is kept, and who never sees it. Not a row for the alert’s reason, and not a hint, because that line belongs to the identity above while this one belongs to the card. Translated.',
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
        title="The settings are a table"
        note="The five things you can change about an account used to be five buttons in a wrapping row under a rule, ranked only by order and by one ml-auto holding the destructive one apart. That arrangement answers “what can I press” and refuses to answer “what is it set to”: a row of verbs has nowhere to put the email address the change-email button is about to change."
      >
        <Stage theme={theme} className="flex flex-col gap-5">
          <Specimen label="signed in — name, value, actions, in three columns">
            <AccountCard
              avatar={{ src: null, alt: 'Account photo' }}
              name="camille"
              hint="Signed in to Magic Slash cloud"
              actions={[{ id: 'sign-out', label: 'Sign out', icon: LogOut, onClick: noop }]}
              rows={ROWS}
            />
          </Specimen>
          <Specimen label="signed out — no face, no table, no rule, and one accent">
            <AccountCard
              name="Not signed in"
              hint="Sign in to manage your organization (optional)"
              actions={[
                { id: 'join', label: 'Join with an invitation', icon: UserPlus, onClick: noop },
                { id: 'sign-in', label: 'Sign in', icon: LogIn, tone: 'accent', onClick: noop },
              ]}
            />
          </Specimen>
        </Stage>
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          <code>max-content 1fr auto</code>, and the order of those three is the layout.
          The labels take exactly the width of the longest of them and no more, so that
          column is as narrow as its contents allow; the actions take what their buttons
          need; and the value gets everything left over, because it is the only column
          whose contents can be arbitrarily long. It is <em>one</em> grid and not a grid
          per row: a row that sized its own columns would align with nothing, and five of
          them would be five tables stacked up.
        </p>
      </EntrySection>

      <EntrySection
        title="An absence is not a value"
        note="No username yet is a placeholder standing where a handle would be, and left at full strength it reads as a handle somebody chose. unset is what the card draws it quiet with — the only thing it infers about a value, and it infers it because the app said so rather than by inspecting the string. The password row makes a related distinction in words rather than in weight: GoTrue records no password timestamp, so the app records its own, and a column that postdates most accounts cannot say “never changed” — only that no change has been recorded."
      >
        <Stage theme={theme} className="flex flex-col gap-5">
          <Specimen label="nothing chosen yet — two quiet values, and one button fewer">
            <AccountCard
              avatar={{ src: null, alt: 'Account photo' }}
              name="camille@acme.dev"
              hint="Signed in to Magic Slash cloud"
              actions={[{ id: 'sign-out', label: 'Sign out', icon: LogOut, onClick: noop }]}
              rows={ROWS.map((row) => {
                if (row.id === 'username') return { ...row, value: 'No username yet', unset: true }
                // No photo, no remove button — there is nothing to undo.
                if (row.id === 'avatar') {
                  return {
                    ...row,
                    value: 'No photo',
                    unset: true,
                    actions: row.actions.filter((a) => a.id !== 'remove-photo'),
                  }
                }
                if (row.id === 'password') {
                  return {
                    ...row,
                    hint: 'No change recorded since the account was created on 4 March 2026',
                  }
                }
                return row
              })}
            />
          </Specimen>
        </Stage>
      </EntrySection>

      <EntrySection
        title="The value truncates, the hint wraps"
        note="Opposite on purpose. A value is a value: an address cut short still shows its beginning and keeps a title to recover the rest, and a table whose row heights depended on how long somebody’s email is would be ragged. A hint is a sentence, and half a sentence is not a shorter sentence — the clause that gets cut is the one at the end, which is where “this cannot be undone” lives. A label never truncates either: a name cut in half names nothing."
      >
        <Stage theme={theme}>
          <Specimen label="a long address beside a three-clause warning">
            <AccountCard
              avatar={{ src: null, alt: 'Account photo' }}
              name="camille"
              hint="Signed in to Magic Slash cloud"
              actions={[{ id: 'sign-out', label: 'Sign out', icon: LogOut, onClick: noop }]}
              rows={ROWS.map((row) =>
                row.id === 'email'
                  ? { ...row, label: 'camille.dubois-lefevre@a-very-long-company-name.example' }
                  : row,
              )}
            />
          </Specimen>
        </Stage>
      </EntrySection>

      <EntrySection
        title="No border"
        note="It was bg-surface border border-line-strong rounded-xl, and a hairline around a plate that is already a different colour from the ground is the same thing said twice — Button’s header states the rule and RepositoryItem learned it the same way. The surface is what separates the card from the page behind it."
      >
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          The rules that stayed are the ones <em>inside</em>, and the first of them is the
          one that matters: it separates the settings from the identity, and those two
          answer different questions. A reader looking for “how do I leave” and a reader
          looking for “how do I change my email” are not looking in the same place. It is
          each line’s own <code>border-t</code> and not a <code>divide-y</code> on the
          stack, because <code>divide-y</code> is precisely the spelling that omits it.
        </p>
      </EntrySection>

      <EntrySection
        title="The actions arrive as data"
        note="Banner made this move first and the argument is the same: the app was passing rendered buttons, so every call site re-decided the height, the tone and the gap — and two buttons meaning the same thing on two surfaces did not match. A list of { label, icon, onClick } lets the card draw all of them at one rung, which a caller handing over finished markup cannot ask for."
      >
        <Stage theme={theme}>
          <Specimen label="busy — the photo is uploading, and the press is blocked">
            <AccountCard
              avatar={{ src: null, alt: 'Account photo' }}
              name="camille"
              hint="Signed in to Magic Slash cloud"
              actions={[{ id: 'sign-out', label: 'Sign out', icon: LogOut, onClick: noop }]}
              rows={ROWS.map((row) =>
                row.id === 'avatar'
                  ? {
                      ...row,
                      actions: row.actions.map((a) =>
                        a.id === 'choose-photo' ? { ...a, busy: true } : { ...a, disabled: true },
                      ),
                    }
                  : row,
              )}
            />
          </Specimen>
        </Stage>
      </EntrySection>

      <EntrySection
        title="An account is not always a person"
        note="The Connections tab holds the same card about a service: who you are on Atlassian, where, and the one button that ends it. It was drawn by hand there — its own plate, its own hairline, its own BTN_PRIMARY string — and it had already drifted into a different button height and a different padding from this one, which is the exact drift this card was extracted to stop. So the three things that block did and this one could not are props: a mark, an alert and a note."
      >
        <Stage theme={theme} className="flex flex-col gap-5">
          <Specimen label="connected — a logo for a front, and the promise at the foot">
            <AccountCard
              mark={JIRA_MARK}
              name="Camille Dubois"
              hint="Connected to acme.atlassian.net"
              actions={[{ id: 'disconnect', label: 'Disconnect', icon: Unlink, onClick: noop }]}
              note="The credential is yours alone, encrypted by this machine’s keychain. It never reaches our servers."
            />
          </Specimen>
          <Specimen label="revoked — the credential is still here and no longer accepted">
            <AccountCard
              mark={JIRA_MARK}
              name="Camille Dubois"
              hint="Connected to acme.atlassian.net"
              actions={[{ id: 'disconnect', label: 'Disconnect', icon: Unlink, onClick: noop }]}
              alert={{
                icon: ShieldAlert,
                message: 'Atlassian is refusing this credential',
                hint: 'The app was probably revoked from your Atlassian account. Reconnect to authorise it again.',
                actions: [{ label: 'Reconnect', icon: RefreshCw, primary: true, onClick: noop }],
              }}
              note="The credential is yours alone, encrypted by this machine’s keychain. It never reaches our servers."
            />
          </Specimen>
          <Specimen label="not connected — one accent, and nothing to say about a credential that does not exist">
            <AccountCard
              mark={JIRA_MARK}
              name="Not connected"
              hint="Connect Atlassian to read your sprint and open your tickets from here"
              actions={[{ id: 'connect', label: 'Connect Atlassian', icon: Link2, tone: 'accent', onClick: noop }]}
              note="The credential is yours alone, encrypted by this machine’s keychain. It never reaches our servers."
            />
          </Specimen>
          <Specimen label="no tint — the app's own mark, on the theme's plate">
            <AccountCard
              mark={{ glyph: MagicSlash, title: 'Magic Slash' }}
              name="Magic Slash"
              hint="v0.96.4"
              actions={[
                { id: 'changelog', label: 'Changelog', icon: Clock, onClick: noop },
                { id: 'whats-new', label: 'What’s new', icon: Sparkles, tone: 'accent', onClick: noop },
              ]}
            />
          </Specimen>
        </Stage>
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          <code>tint</code> is for a colour this system does not own. The About tab’s card
          is about the app itself, whose accent is a <em>token</em> that moves with the
          theme — so it passes none, and the tile falls back to the neutral plate the mark
          takes its ink from.
        </p>
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          The band is <code>Banner</code> in its <code>inset</code> layout — the one built
          to be part of a card rather than a strip on a page — and the card gives back its
          own <code>p-4</code> so it reaches the edges. It is not a row: a row is a
          setting, a thing with a value you can change, and “Atlassian is refusing this
          credential” has no value and nothing to set. It is the reason the account above
          it does not work.
        </p>
      </EntrySection>

      <EntrySection title="Props">
        <PropsTable rows={PROPS} />
        <Snippet>{`import { AccountCard } from '@ds/desktop'

<AccountCard
  avatar={{ src: avatar, alt: t('cloud.avatar.alt') }}
  name={username ?? status.user?.email ?? t('cloud.signedInFallback')}
  hint={t('cloud.signedInHint')}
  actions={[{ id: 'sign-out', label: t('cloud.signOut'), icon: LogOut, onClick: logout }]}
  rows={[
    {
      id: 'username',
      label: t('cloud.row.username'),
      value: username ?? t('cloud.username.none'),
      unset: username === null,
      hint: t('cloud.username.hint'),
      actions: [{ id: 'change-username', label: t('common.edit'), icon: Pencil, onClick: openUsernameModal }],
    },
    …
  ]}
/>`}</Snippet>
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          The app’s <code>CloudAccountSection</code> is what does the wiring: the session,
          the handle, the avatar bytes, the dates, the translator, and the five dialogs
          behind the rows.
        </p>
      </EntrySection>
    </article>
  )
}
