'use client'

import { useState } from 'react'
import { ThemePreviewGrid, type ThemePreviewOption } from '@ds/desktop'
import { DESKTOP_THEMES, DESKTOP_THEME_IDS, type DesktopTheme } from '@/lib/desktopTheme'
import { EntryHeader, EntrySection, PropsTable, Snippet, Specimen, Stage, type PropRow } from '../parts'
import { usesOf } from './ids'

/**
 * The webapp's own copy of the registry, mapped the way the desktop maps its own — this
 * page is the one place the two can be compared side by side.
 */
const THEMES: ThemePreviewOption[] = DESKTOP_THEME_IDS.map((id) => {
  const { label, appearance, vars } = DESKTOP_THEMES[id]
  // The catalogue keeps its colours as the custom properties a `style` prop wants, so
  // the bare triples are wrapped and the `rgba()` ones are already values. Exactly the
  // mapping the desktop writes against its own registry.
  const rgb = (name: string) => `rgb(${vars[name]})`
  return {
    id,
    label,
    description: appearance === 'dark' ? 'Built on a dark ground' : 'Built on a light ground',
    colors: {
      floor: rgb('--c-bg'),
      bar: vars['--c-surface'],
      panel: vars['--c-surface-strong'],
      line: vars['--c-line-strong'],
      ink: rgb('--c-ink'),
      textSecondary: rgb('--c-text-secondary'),
      accent: rgb('--c-accent'),
      lights: [rgb('--c-red'), rgb('--c-yellow'), rgb('--c-green')],
    },
  }
})

const PROPS: PropRow[] = [
  {
    name: 'themes',
    type: 'ThemePreviewOption[]',
    required: true,
    description:
      'Each theme as an id, a name, a sentence saying what it is for, and the colours its miniature is painted with. It knows no theme — the registry lives in the app’s main process as well as its renderer and cannot move into this folder, so the colours arrive already resolved to CSS values.',
  },
  {
    name: 'colors',
    type: 'ThemePreviewColors',
    description:
      'ThemeSwatchColors plus the three a window has and a colour patch has not: the title bar’s band, the quieter line of text, and the three window lights. It extends the swatch’s type rather than restating it, so a caller that already builds swatches for the quick-settings sheet adds three fields instead of writing a second mapping — and the two pickers of one registry cannot disagree about which token is “the panel”.',
  },
  {
    name: 'value · onSelect',
    type: 'string · (id: string) => void',
    required: true,
    description:
      'The id in force — washed in the accent and ticked, with no edge of its own — and what fires for the others. Pressing the one in force does nothing: a radio that re-selects itself is a write with no change behind it.',
  },
]

export function ThemePreviewGridEntry({ theme, onOpen }: { theme: DesktopTheme; onOpen?: (id: string) => void }) {
  const [value, setValue] = useState(THEMES[0]?.id ?? '')

  return (
    <article className="flex flex-col divide-y divide-hairline">
      <EntryHeader title="ThemePreviewGrid" uses={usesOf('themepreviewgrid')} onOpen={onOpen}>
        Every theme as a little window, four to a line, each with its name and what it is
        for, the one in force washed in the accent.
      </EntryHeader>

      <EntrySection
        title="It is not ThemeGrid, and the difference is the room"
        note="ThemeGrid is the quick-settings sheet’s picker: swatches of 40 by 32, four colours each, in a sheet 256px wide. Its own file says why — “the Appearance page’s miniature draws a whole window, and shrunk to this size it was a smear of six-pixel rectangles”. This is the other half of that sentence. On a settings page there is room for the miniature, and a theme picked by looking should be shown at the size where looking works."
      >
        <Stage theme={theme}>
          <Specimen label="pick one — the tile is the control">
            <ThemePreviewGrid themes={THEMES} value={value} onSelect={setValue} />
          </Specimen>
        </Stage>
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          The tile carries no hairline. It had one, and the chosen tile swapped it for an
          accent one — which put two rectangles around every theme: the tile’s, and the
          little window’s inside it. Only the inner one means anything, so it stays and
          the outer one goes; the wash and the tick were already marking the choice.
        </p>
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          The miniature is a drawing and not a screenshot: a title bar with its three
          lights, a sidebar, two lines of text and a block of accent. It is the fewest
          parts that still read as this app rather than as a gradient — drop the lights
          and it is a rectangle, drop the accent and every theme looks alike.
        </p>
      </EntrySection>

      <EntrySection title="Props">
        <PropsTable rows={PROPS} />
        <Snippet>{`import { ThemePreviewGrid } from '@ds/desktop'

<ThemePreviewGrid
  themes={THEME_IDS.map((id) => ({
    id,
    label: t(THEMES[id].labelKey),
    description: t(THEMES[id].descriptionKey),
    colors: { floor: \`rgb(\${tokens.bgRgb})\`, bar: tokens.surface, panel: tokens.surfaceStrong, … },
  }))}
  value={active}
  onSelect={(id) => choose(id as ThemeId)}
/>`}</Snippet>
      </EntrySection>
    </article>
  )
}
