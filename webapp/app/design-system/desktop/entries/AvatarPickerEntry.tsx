'use client'

import { useState } from 'react'
import { AvatarPicker, DEFAULT_PORTRAIT_SRC, type AvatarPickerOption } from '@ds/desktop'
import type { DesktopTheme } from '@/lib/desktopTheme'
import { EntryHeader, EntrySection, PropsTable, Snippet, Stage, type PropRow } from '../parts'
import { usesOf } from './ids'

/**
 * The AvatarPicker entry.
 *
 * ONE FACE, TWELVE TIMES, and it has to be said out loud rather than hidden: the thirty
 * portraits are the desktop app's — they are its upload payload, and a quarter of a
 * megabyte of base64 this site would compile and never send. The only one that ships
 * with the component is the default, because `Avatar` draws it.
 *
 * That still documents what this component owns, which is everything except the faces:
 * the columns, the gap, the round tile, the accent ring on the chosen one and the
 * quieter ring under the pointer. What it cannot show is a grid you can tell apart at a
 * glance — for that, open the app.
 */

/** Twelve tiles of the one portrait that ships here. See the note above. */
const OPTIONS: AvatarPickerOption[] = Array.from({ length: 12 }, (_, i) => ({
  id: `portrait-${i + 1}`,
  src: DEFAULT_PORTRAIT_SRC,
  label: `Portrait ${i + 1}`,
}))

const PROPS: PropRow[] = [
  {
    name: 'options',
    type: 'AvatarPickerOption[]',
    required: true,
    description:
      'Each portrait as an id, a data: URL and a translated name. The catalogue is the app’s, because the same bytes are what gets uploaded — this draws what it is handed.',
  },
  {
    name: 'value',
    type: 'string | null',
    required: true,
    description:
      'The id in force, ringed in the accent — or null for none of them, which is what an account wearing an uploaded photograph looks like: the photo is the avatar and no tile in the grid is it.',
  },
  {
    name: 'onSelect',
    type: '(id: string) => void',
    required: true,
    description: 'Pressing the one already in force does nothing; this fires for the others.',
  },
  {
    name: 'ariaLabel',
    type: 'string',
    required: true,
    description:
      'The question the thirty answers belong to, announced when a screen reader enters the group. Translated, and required: a radiogroup with no name is thirty unrelated stops.',
  },
  {
    name: 'disabled',
    type: 'boolean',
    fallback: 'false',
    description: 'Nothing can be pressed while something is being saved.',
  },
  {
    name: 'className',
    type: 'string',
    fallback: "''",
    description: 'Margins and placement. Not the columns, the gap or the radius.',
  },
]

export function AvatarPickerEntry({
  theme,
  onOpen,
}: {
  theme: DesktopTheme
  onOpen?: (id: string) => void
}) {
  const [value, setValue] = useState<string | null>(OPTIONS[0].id)
  return (
    <article className="flex flex-col divide-y divide-hairline">
      <EntryHeader title="AvatarPicker" uses={usesOf('avatarpicker')} onOpen={onOpen}>
        Thirty drawn faces, six to a line, the one in force ringed — the half of “change my
        avatar” that is not a file dialog. It knows no faces: the pictures arrive as data,
        because the same bytes are the app’s upload payload.
      </EntryHeader>

      <EntrySection
        title="The grid"
        note="Twelve tiles of one face here — the catalogue belongs to the desktop app, and only the default portrait ships with the component. What this shows is the drawing: six columns, a round tile, the accent ring on the chosen one and a quieter one under the pointer."
      >
        <Stage theme={theme}>
          <div className="max-w-md">
            <AvatarPicker
              options={OPTIONS}
              value={value}
              onSelect={setValue}
              ariaLabel="Portraits"
            />
          </div>
        </Stage>
      </EntrySection>

      <EntrySection
        title="It ends nothing"
        note="No confirm, no cancel, no upload button. Pressing a face reports the face; what the dialog does about it, what else it offers and when it closes are the app’s — a footer here would be a design system deciding how a dialog ends."
      >
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          The tiles are <code>Avatar</code>’s own drawing —{' '}
          <code>rounded-full object-cover</code>, character for character — so what is chosen
          here looks exactly like what lands on the card afterwards. They are not{' '}
          <code>Avatar</code> itself, though: that component answers “this person, or the
          default face when there is none”, which is a question about an account. Every tile
          here has bytes, so routing through it would turn a missing one into a silent
          thirty-first default rather than the broken image that says so.
        </p>
      </EntrySection>

      <EntrySection title="Props">
        <PropsTable rows={PROPS} />
        <Snippet>{`import { AvatarPicker } from '@ds/desktop'

<AvatarPicker
  options={portraits}
  value={selected}
  onSelect={setSelected}
  ariaLabel={t('cloud.avatar.picker.group')}
/>`}</Snippet>
      </EntrySection>
    </article>
  )
}
