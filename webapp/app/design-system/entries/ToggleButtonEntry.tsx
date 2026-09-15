'use client'

import { useState } from 'react'
import { COMPONENT_SIZES, ToggleButton, type ToggleButtonSize } from '@ds/desktop'
import { Bell, BellOff, Columns, GitPullRequest, Search } from '@ds/desktop/icons'
import type { DesktopTheme } from '@/lib/desktopTheme'
import { EntryHeader, EntrySection, PropsTable, Snippet, Specimen, Stage, type PropRow } from '../parts'
import { usesOf } from './ids'

const PROPS: PropRow[] = [
  { name: 'icon', type: 'IconComponent', description: 'The mark. From @ds/desktop/icons. One of icon and flag is required.' },
  {
    name: 'flag',
    type: 'string',
    description:
      'A language code drawn as the marketing site’s round flag, filling the whole tile, for the one grid where the tiles are choices of one thing rather than features: the quick-settings sheet picks the app’s language from a row of these. The flag is the fill, so the one in force wears a ring of the accent and the others stand back at half strength, in colour.',
  },
  {
    name: 'offIcon',
    type: 'IconComponent',
    description:
      'The mark while OFF, when turning the feature off changes what it is rather than just its state — notifications become BellOff. Absent, the same glyph is drawn in both positions and the fill alone says which.',
  },
  {
    name: 'offTone',
    type: "'neutral' | 'danger'",
    fallback: "'neutral'",
    description:
      'What off looks like. neutral is the plate: off is simply not on. danger is a red tint for the one feature whose absence is itself a state worth seeing — notifications, where off means nothing will reach you. A tint and not a fill, because a filled circle is what on looks like.',
  },
  { name: 'checked', type: 'boolean', required: true, description: 'On or off. Controlled: the caller holds it.' },
  { name: 'onChange', type: '(next: boolean) => void', required: true, description: 'Takes effect the moment it fires. Nothing here has a save button behind it.' },
  {
    name: 'label',
    type: 'string',
    required: true,
    description:
      'The name of the feature — the tooltip, the accessible name and, from lg up, the caption under the circle. One string for all three, because a tile whose caption and whose accessible name disagreed would be lying to one of its readers.',
  },
  {
    name: 'caption',
    type: 'boolean',
    fallback: 'true',
    description: 'Whether the word is drawn under the circle. A grid of marks with no words is a grid only its author can read; a caller with the word already beside the tile turns it off.',
  },
  {
    name: 'size',
    type: "'2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'",
    fallback: "'2xl'",
    description:
      'ButtonIcon’s ladder — the same table, so a tile and a round SelectIcon in one row stand the same height. 2xl by default because a tile is the subject of its grid, not a row’s answer. Below lg the caption is not drawn at all: a 10px word under a 24px circle is a smudge.',
  },
  { name: 'disabled', type: 'boolean', fallback: 'false', description: 'Dimmed, no pointer, no press.' },
  { name: 'className', type: 'string', fallback: "''", description: 'Margins and placement. Not the size, the fill or the radius.' },
]

export function ToggleButtonEntry({ theme, onOpen }: { theme: DesktopTheme; onOpen?: (id: string) => void }) {
  const [split, setSplit] = useState(true)
  const [quick, setQuick] = useState(false)
  const [bell, setBell] = useState(true)
  const [pr, setPr] = useState(false)

  return (
    <article className="flex flex-col divide-y divide-hairline">
      <EntryHeader title="ToggleButton" uses={usesOf('togglebutton')} onOpen={onOpen}>
        A round switch with a mark on it — macOS’s Control Center tile, at this folder’s
        scale. A circle that is filled while the feature is on and a plate while it is off,
        with the mark saying which feature and the word under it saying so again.
      </EntryHeader>

      <EntrySection
        title="A grid of states"
        note="Press any of them. Every tile in a grid is a state and half of them are on at once, which is why the ON position fills the whole circle rather than tinting a plate the way ButtonIcon’s active does — a tint would leave the grid reading as four things hovered. The bell swaps its glyph when off; the others let the fill say it."
      >
        <Stage theme={theme}>
          <div className="grid grid-cols-4 gap-x-2 gap-y-4 justify-items-center w-72">
            <ToggleButton icon={Columns} checked={split} onChange={setSplit} label="Split view" />
            <ToggleButton icon={Search} checked={quick} onChange={setQuick} label="Quick Launch" />
            <ToggleButton icon={Bell} offIcon={BellOff} offTone="danger" checked={bell} onChange={setBell} label="Notifications" />
            <ToggleButton icon={GitPullRequest} checked={pr} onChange={setPr} label="PR watcher" />
          </div>
        </Stage>
      </EntrySection>

      <EntrySection
        title="The ladder"
        note="ButtonIcon’s seven rungs, and the caption appears at lg. Below that a tile is a circle and nothing else — the word would be smaller than the mark it explains."
      >
        <Stage theme={theme} className="flex items-end gap-5 flex-wrap">
          {COMPONENT_SIZES.map((size) => (
            <Specimen key={size} label={size}>
              <div className="flex items-start gap-2">
                <ToggleButton icon={Columns} checked onChange={() => {}} label="On" size={size as ToggleButtonSize} />
                <ToggleButton icon={Columns} checked={false} onChange={() => {}} label="Off" size={size as ToggleButtonSize} />
              </div>
            </Specimen>
          ))}
        </Stage>
      </EntrySection>

      <EntrySection title="Props">
        <PropsTable rows={PROPS} />
        <Snippet>{`import { ToggleButton } from '@ds/desktop'
import { Bell, BellOff } from '@ds/desktop/icons'

<ToggleButton
  icon={Bell}
  offIcon={BellOff}
  checked={enabled}
  onChange={setEnabled}
  label={t('controlCenter.notifications')}
/>`}</Snippet>
      </EntrySection>
    </article>
  )
}
