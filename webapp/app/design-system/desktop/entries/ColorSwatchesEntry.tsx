'use client'

import { useState } from 'react'
import { ColorSwatches } from '@ds/desktop'
import { WORKFLOW_STEP_COLORS } from '@ds/desktop/palette'
import type { DesktopTheme } from '@/lib/desktopTheme'
import { EntryHeader, EntrySection, PropsTable, Snippet, Specimen, Stage, type PropRow } from '../parts'
import { usesOf } from './ids'

const PROPS: PropRow[] = [
  { name: 'colors', type: 'readonly string[]', required: true, description: 'The colours offered, in the order drawn. A palette of the design system’s, never typed at the call site.' },
  { name: 'value', type: 'string', description: 'The one picked, compared without case. Absent: none is outlined.' },
  { name: 'onChange', type: '(color: string) => void', required: true, description: 'A swatch was picked. Re-picking the one already picked reports nothing.' },
  { name: 'label', type: 'string', required: true, description: 'The group’s accessible name; each swatch’s is the label and its value.' },
  { name: 'disabled', type: 'boolean', fallback: 'false', description: 'Read-only: every swatch refuses.' },
]

export function ColorSwatchesEntry({ theme, onOpen }: { theme: DesktopTheme; onOpen?: (id: string) => void }) {
  const [color, setColor] = useState(WORKFLOW_STEP_COLORS[8])
  return (
    <article className="flex flex-col divide-y divide-hairline">
      <EntryHeader title="ColorSwatches" uses={usesOf('colorswatches')} onOpen={onOpen}>
        One colour picked among a few: a radio group whose options are their own colour. A
        <code>SettingRow</code> control (<code>kind: &apos;swatches&apos;</code>), which is how a workflow step picks its card.
      </EntryHeader>

      <EntrySection title="The workflow steps’ palette" note="The picked swatch is outlined, not ringed, so the gap stays see-through on any ground.">
        <Stage theme={theme} className="flex flex-col gap-6">
          <Specimen label="interactive">
            <ColorSwatches colors={WORKFLOW_STEP_COLORS} value={color} onChange={setColor} label="Colour" />
          </Specimen>
          <Specimen label="disabled">
            <ColorSwatches colors={WORKFLOW_STEP_COLORS} value={color} onChange={() => undefined} label="Colour" disabled />
          </Specimen>
        </Stage>
      </EntrySection>

      <EntrySection title="Props">
        <PropsTable rows={PROPS} />
        <Snippet>{`import { ColorSwatches, WORKFLOW_STEP_COLORS } from '@ds/desktop'

<ColorSwatches colors={WORKFLOW_STEP_COLORS} value={color} onChange={setColor} label={t('color')} />`}</Snippet>
      </EntrySection>
    </article>
  )
}
