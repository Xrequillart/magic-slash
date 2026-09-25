'use client'

import { FieldTable, type FieldTableRow } from '@ds/desktop'
import { ImageOff, Pencil, Trash2 } from '@ds/desktop/icons'
import type { DesktopTheme } from '@/lib/desktopTheme'
import { EntryHeader, EntrySection, PropsTable, Snippet, Specimen, Stage, type PropRow } from '../parts'
import { usesOf } from './ids'

const noop = () => undefined

const ROWS: FieldTableRow[] = [
  {
    id: 'username',
    label: 'Username',
    value: 'camille',
    hint: 'Shown instead of your email address',
    actions: [{ id: 'edit', label: 'Edit', icon: Pencil, onClick: noop }],
  },
  {
    id: 'avatar',
    label: 'Avatar',
    value: 'Updated on 16 September 2026',
    actions: [
      { id: 'edit', label: 'Edit', icon: Pencil, onClick: noop },
      { id: 'remove', label: 'Remove', icon: ImageOff, tone: 'danger', onClick: noop },
    ],
  },
  { id: 'email', label: 'Email', value: 'camille@acme.dev', actions: [{ id: 'edit', label: 'Edit', icon: Pencil, onClick: noop }] },
  { id: 'password', label: 'Password', value: '• • • • • • • •', actions: [{ id: 'edit', label: 'Edit', icon: Pencil, onClick: noop }] },
  {
    id: 'delete',
    label: 'Delete my account',
    hint: 'Organizations where you are the only member are deleted with their data. The others pass to another member. This cannot be undone.',
    actions: [{ id: 'delete', label: 'Remove', icon: Trash2, tone: 'danger', onClick: noop }],
  },
]

const PROPS: PropRow[] = [
  {
    name: 'rows',
    type: 'FieldTableRow[]',
    required: true,
    description:
      'One per setting. Empty renders nothing at all — not an empty grid, which would draw a hairline across a card with no rows under it.',
  },
  {
    name: 'FieldTableRow',
    type: '{ id, label, actions, value?, unset?, hint? }',
    description:
      'Three cells, because they are three columns: label is the name of the setting, value is what it is set to, actions is what you can do about it. The table does not know WHICH kind of value it is drawing — an address, a stand-in for a password, a date, an absence are all the same prop — because drawing them differently would be the table claiming to understand what the app put there. unset is the one distinction it draws, and it draws it because the app said so. An absent value is legitimate: deleting an account is a thing you do, not a thing that is set to something, so that cell holds the hint alone.',
  },
  {
    name: 'FieldTableAction',
    type: '{ id, label, onClick, icon?, tone?, busy?, disabled? }',
    description:
      'The buttons in the third column, at size sm — the row is the object and these are what you do to it. tone is neutral | accent | danger, and danger is tinted rather than filled because deleting an account should read as available, never as the obvious next step.',
  },
  {
    name: 'flush',
    type: 'boolean',
    fallback: 'false',
    description:
      'Drop the hairline above the first row. The default draws it, because the usual caller puts something above the table — an identity band, an intro line — and that rule is what separates the two. A card whose whole body is the table wants it gone: a hairline across the top of a plate, with nothing above it, is a line dividing the card from its own edge.',
  },
  { name: 'className', type: 'string', fallback: "''", description: 'Margins and width. Not the columns, the padding or the dividers.' },
]

export function FieldTableEntry({ theme, onOpen }: { theme: DesktopTheme; onOpen?: (id: string) => void }) {
  return (
    <article className="flex flex-col divide-y divide-hairline">
      <EntryHeader title="FieldTable" uses={usesOf('fieldtable')} onOpen={onOpen}>
        A list of settings as a table — what each one is called, what it is set to, and
        what you can do about it.
      </EntryHeader>

      <EntrySection
        title="Three columns"
        note="The point of columns over a stack of self-contained lines is that the eye stops hunting: every value starts at the same x, so “what is my email” is one downward scan of one column rather than five left-to-right reads. It is also what makes the labels a list — they line up, so Avatar and Password read as members of one set rather than as two strings that happen to begin two rows."
      >
        <Stage theme={theme}>
          <Specimen label="the account card’s own rows, on the plate it draws them on">
            <div className="rounded-xl bg-surface p-4">
              <FieldTable rows={ROWS} flush />
            </div>
          </Specimen>
        </Stage>
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          <code>max-content minmax(0,1fr) auto</code>, and the order of those three is the
          layout. The labels take exactly the width of the longest of them and no more;
          the actions take what their buttons need; the value gets everything left over,
          because it is the only column whose contents can be arbitrarily long.{' '}
          <code>minmax(0,1fr)</code> and not <code>1fr</code> is the difference between a
          value that truncates and a card that a long address pushes off its own edge: a{' '}
          <code>1fr</code> track floors at <code>auto</code>, and an email address has no
          break opportunity, so that floor is the whole string.
        </p>
      </EntrySection>

      <EntrySection
        title="It is the rows, not the panel"
        note="The split this folder makes everywhere — CollapsibleLine/PullRequestCard, CommitLine/CommitCard. It holds no plate, no radius and no padding, because those belong to whatever card it sits in. AccountCard and ProfileCard are the two today, and they are why it exists: it was AccountCard’s own grid until a second card wanted the same thing, and two cards drawing their own three-column table is two tables that agree today and disagree after the next change to either."
      >
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          What it <em>does</em> draw is the hairline above each row. A caller spelling its
          own <code>border-t</code> is a caller that can forget one, and a{' '}
          <code>divide-y</code> on the stack is precisely the spelling that omits the
          first — which is the one separating the table from whatever sits above it.
        </p>
      </EntrySection>

      <EntrySection title="Props">
        <PropsTable rows={PROPS} />
        <Snippet>{`import { FieldTable } from '@ds/desktop'

<FieldTable
  flush
  rows={fields.map((field) => ({
    id: field,
    label: t(field.label),
    ...valueOf(field, draft, t),
    actions: [{ id: \`edit-\${field}\`, label: t('common.edit'), icon: Pencil, onClick: () => edit(field) }],
  }))}
/>`}</Snippet>
      </EntrySection>
    </article>
  )
}
