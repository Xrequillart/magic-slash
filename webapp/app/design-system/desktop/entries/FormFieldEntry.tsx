'use client'

import { useState } from 'react'
import { FormField } from '@ds/desktop'
import type { DesktopTheme } from '@/lib/desktopTheme'
import { EntryHeader, EntrySection, PropsTable, Snippet, Specimen, Stage, type PropRow } from '../parts'
import { usesOf } from './ids'

const PROPS: PropRow[] = [
  { name: 'label', type: 'string', required: true, description: 'The field’s name. Already translated.' },
  {
    name: 'hint',
    type: 'string',
    description:
      'Under the BOX and not under the label: it explains what to type, so it is read after the reader has seen where to type it. SettingRow.hint sits under the name for the opposite reason — there, the control is already on the same line.',
  },
  {
    name: 'input',
    type: 'InputProps',
    required: true,
    description:
      'The box, as Input’s own props — the whole union, so a field is single-line or a textarea depending on nothing but what is passed. className is the one thing this overrides: a field’s box is as wide as the field, always.',
  },
]

export function FormFieldEntry({ theme, onOpen }: { theme: DesktopTheme; onOpen?: (id: string) => void }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('Create atomic commits with conventional messages')

  return (
    <article className="flex flex-col divide-y divide-hairline">
      <EntryHeader title="FormField" uses={usesOf('formfield')} onOpen={onOpen}>
        A label, the box under it, and the line that explains it — one entry of a form the
        reader fills in.
      </EntryHeader>

      <EntrySection
        title="Anything you choose is a row; anything you author is a field"
        note="SettingRow is a SETTING: a name on the left, a switch or a picker on the right, and the two read as one sentence because the control is small enough to sit at the end of it. This is a FIELD, whose control is a box you type a paragraph into — there is no right edge to put it against."
      >
        <Stage theme={theme}>
          <Specimen label="a line, a hint, a textarea, and one that is code">
            <div className="flex w-full flex-col gap-4">
              <FormField
                label="Name"
                hint="Lower-case letters, numbers and hyphens only"
                input={{ value: name, onChange: setName, placeholder: 'my-skill' }}
              />
              <FormField
                label="Description"
                input={{ multiline: true, value: description, onChange: setDescription, rows: 3 }}
              />
              <FormField
                label="Allowed tools"
                input={{ value: 'Bash(*), Read, Edit', onChange: () => undefined, mono: true }}
              />
            </div>
          </Specimen>
        </Stage>
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          The input arrives as DATA and not as a child, which is{' '}
          <code>SettingRow.control</code>’s rule and this folder’s. A field that received
          its own box would be a field every call site can give a different height, tone
          and rung — which is what the skills editor had: five{' '}
          <code>&lt;label className=&quot;block text-base font-medium …&quot;&gt;</code>{' '}
          written one after another, and a sixth that had dropped the margin.
        </p>
      </EntrySection>

      <EntrySection title="Props">
        <PropsTable rows={PROPS} />
        <Snippet>{`import { FormField } from '@ds/desktop'

<FormField
  label={t('skills.editor.name')}
  hint={isNew ? t('skills.editor.nameHelp') : undefined}
  input={{ value: name, onChange: setName, disabled: !isNew, placeholder: 'my-skill' }}
/>`}</Snippet>
      </EntrySection>
    </article>
  )
}
