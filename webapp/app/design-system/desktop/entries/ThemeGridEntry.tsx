'use client'

import { useState } from 'react'
import { CONTROL_CENTER_GRID, ThemeGrid } from '@ds/desktop'
import { DESKTOP_THEME_IDS, type DesktopTheme } from '@/lib/desktopTheme'
import { THEME_SWATCHES as THEMES } from '../themeSwatches'
import { EntryHeader, EntrySection, PropsTable, Snippet, Stage, type PropRow } from '../parts'
import { usesOf } from './ids'

const PROPS: PropRow[] = [
  { name: 'themes', type: 'ThemeGridOption[]', required: true, description: 'Each theme as an id, a translated name and the FIVE colours a swatch is made of, already resolved to CSS values. The grid knows no theme: the registry is read by the main process too and cannot move into the design system.' },
  { name: 'value', type: 'string', required: true, description: 'The id in force, ringed in the accent.' },
  { name: 'onSelect', type: '(id: string) => void', required: true, description: 'Pressing the one in force does nothing; this fires for the others.' },
  { name: 'className', type: 'string', fallback: "''", description: 'Margins and placement. Not the ground, the padding or the radius.' },
]

export function ThemeGridEntry({ theme, onOpen }: { theme: DesktopTheme; onOpen?: (id: string) => void }) {
  const [value, setValue] = useState<string>(DESKTOP_THEME_IDS[0])
  return (
    <article className="flex flex-col divide-y divide-hairline">
      <EntryHeader title="ThemeGrid" uses={usesOf('themegrid')} onOpen={onOpen}>
        Eight themes to look at, four to a line, the one in force ringed — the quick-settings
        sheet’s theme picker. A theme is a look, and a look is chosen by looking, which is why
        this is not a picker with eight words in it.
      </EntryHeader>

      <EntrySection title="The swatch" note="Forty by thirty-two: the floor, a strip of the panel surface down the left, a line of the ink and a dot of the accent. It is a private drawing of the grid and is not exported — it has no life outside this grid of four.">
        <Stage theme={theme}>
          <div className={CONTROL_CENTER_GRID}>
            <ThemeGrid themes={THEMES} value={value} onSelect={setValue} />
          </div>
        </Stage>
      </EntrySection>

      <EntrySection title="Props">
        <PropsTable rows={PROPS} />
        <Snippet>{`import { ThemeGrid } from '@ds/desktop'

<ThemeGrid themes={themeOptions} value={activeTheme} onSelect={(id) => updateTheme(id)} />`}</Snippet>
      </EntrySection>
    </article>
  )
}
