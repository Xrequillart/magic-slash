'use client'

import { ProfileCard, type FieldTableRow } from '@ds/desktop'
import { Pencil } from '@ds/desktop/icons'
import type { DesktopTheme } from '@/lib/desktopTheme'
import { EntryHeader, EntrySection, PropsTable, Snippet, Specimen, Stage, type PropRow } from '../parts'
import { usesOf } from './ids'

const noop = () => undefined

const edit = (id: string) => [{ id: `edit-${id}`, label: 'Edit', icon: Pencil, onClick: noop }]

const FILLED: FieldTableRow[] = [
  { id: 'name', label: 'First name', value: 'Camille', actions: edit('name') },
  { id: 'role', label: 'Role', value: 'Product', actions: edit('role') },
  { id: 'level', label: 'Technical level', value: 'Intermediate', actions: edit('level') },
  { id: 'style', label: 'Communication style', value: 'Simple', hint: 'optional', actions: edit('style') },
  { id: 'languages', label: 'Languages', value: 'English, Français', hint: 'optional', actions: edit('languages') },
  {
    id: 'freeText',
    label: 'Anything else',
    value: 'I prefer short answers, and I work mostly on the mobile app.',
    hint: 'optional',
    actions: edit('freeText'),
  },
]

/** The same six, as they read before anybody has answered one. */
const EMPTY: FieldTableRow[] = FILLED.map((row) => ({
  ...row,
  value: row.id === 'freeText' ? 'Nothing written yet' : row.id === 'languages' ? 'None chosen' : 'Not set',
  unset: true,
}))

const PROPS: PropRow[] = [
  {
    name: 'rows',
    type: 'FieldTableRow[]',
    required: true,
    description:
      'One per field: what it is called, what it says, and the button that edits it. The shape is FieldTable’s — the same table AccountCard draws, which is the point.',
  },
  {
    name: 'intro',
    type: 'string',
    description:
      'A line above the table, for the state where there is no profile yet: what this is for and why it is worth filling in. Absent once a profile exists, because by then the rows speak for themselves and a standing explanation is a sentence the reader has already read.',
  },
  {
    name: 'warning',
    type: 'string',
    description:
      'A line under the table, in the warning colour: a required field is still empty, so nothing is being saved. Not optional polish — every row writes on its own, and a profile missing its name, role or level cannot be written at all, so without this the card accepts six edits and keeps none of them while looking like a card that is working.',
  },
  { name: 'className', type: 'string', fallback: "''", description: 'Margins and width. Not the ground, the padding or the radius.' },
]

export function ProfileCardEntry({ theme, onOpen }: { theme: DesktopTheme; onOpen?: (id: string) => void }) {
  return (
    <article className="flex flex-col divide-y divide-hairline">
      <EntryHeader title="ProfileCard" uses={usesOf('profilecard')} onOpen={onOpen}>
        Who the human is, as the skills read it — a name, a role, a level, a style, the
        languages they want to be spoken to in, and whatever else they wrote.
      </EntryHeader>

      <EntrySection
        title="It is AccountCard’s table"
        note="The two cards sit one above the other on the account page and they answer the same kind of question about different subjects: one says what your account is set to, the other what you are like. Drawing them differently would have been two answers to one question, on one page. FieldTable is the shared drawing; this is the plate around it."
      >
        <Stage theme={theme} className="flex flex-col gap-5">
          <Specimen label="filled in — six values, an edit button each">
            <ProfileCard rows={FILLED} />
          </Specimen>
          <Specimen label="nothing answered yet — an intro above, a warning below, every value quiet">
            <ProfileCard
              rows={EMPTY}
              intro="Tell Claude who you are, and the skills will pitch their vocabulary and their level of detail at you."
              warning="A name, a role and a technical level are required. Nothing is saved until all three are answered."
            />
          </Specimen>
        </Stage>
      </EntrySection>

      <EntrySection
        title="An absence is named, never blank"
        note="A row whose value cell is empty reads as a rendering fault; a row that says “Not set” reads as a fact about the profile, and it is the one that tells somebody there is something here worth filling in. unset is what then draws it quiet, so the placeholder cannot be mistaken for an answer. The wording is the app’s: “Not set” is the language of a field with options, “Nothing written yet” is the language of prose, and “None chosen” is what an empty multi-select means."
      >
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          Which is also why the editing is behind a modal. Every field used to be a
          control sitting in the card — a row of pills per question, a text input pinned
          right, a textarea across the bottom. Pleasant to use, unreadable to scan: six
          controls stacked in a card are six controls whether or not you came to change
          one, and the values you came to <em>read</em> were whichever pill happened to be
          lit. It is also the only way the free-text field gets the room prose needs.
        </p>
      </EntrySection>

      <EntrySection
        title="No border, and the family radius"
        note="It had border border-line-strong, and a hairline around a plate that is already a different colour from the page is the same thing said twice. The hairlines between the rows stay: separating two things that are both here is a different job from drawing a line around the whole. bg-surface rounded-xl is the page’s card material, the one AccountCard and ChecklistCard stand on."
      >
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          The table is passed <code>flush</code>, which <code>AccountCard</code> does not.
          There, the rule over the first row separates the settings from the identity band
          above them; here the table <em>is</em> the body, and a hairline across the top of
          a plate with nothing above it is a line dividing the card from its own edge.
        </p>
      </EntrySection>

      <EntrySection title="Props">
        <PropsTable rows={PROPS} />
        <Snippet>{`import { ProfileCard } from '@ds/desktop'

<ProfileCard
  intro={profile ? undefined : t('profile.form.intro')}
  warning={profileFromDraft(draft) ? undefined : t('profile.form.requiredWarning')}
  rows={FIELDS.map(({ field, label, optional }) => ({
    id: field,
    label: t(label),
    ...valueOf(field, draft, t),
    hint: optional ? t('profile.form.optional') : undefined,
    actions: [{ id: \`edit-\${field}\`, label: t('common.edit'), icon: Pencil, onClick: () => setEditing(field) }],
  }))}
/>`}</Snippet>
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          The app’s <code>ProfileSection</code> is what does the wiring: the stored
          profile, the draft being edited, the words, and the one modal behind all six
          rows.
        </p>
      </EntrySection>
    </article>
  )
}
