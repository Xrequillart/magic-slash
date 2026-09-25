'use client'

import { useState } from 'react'
import { COMPONENT_SIZES, Stepper, type StepperSize } from '@ds/desktop'
import type { DesktopTheme } from '@/lib/desktopTheme'
import { EntryHeader, EntrySection, PropsTable, Snippet, Specimen, Stage, type PropRow } from '../parts'
import { usesOf } from './ids'

/** The desktop’s own zoom steps — uneven on purpose, which is why the stepper owns none of them. */
const STEPS = [0.8, 0.9, 1, 1.1, 1.25, 1.5]

const PROPS: PropRow[] = [
  { name: 'value', type: 'string', required: true, description: 'The readout, already formatted — 100%. A string, so the caller decides the unit.' },
  { name: 'onDecrement · onIncrement', type: '() => void', required: true, description: 'The two arrows. The steps are the caller’s: the zoom walks 0.8, 0.9, 1, 1.1, 1.25, 1.5 and a stepper that added one would be wrong at every rung.' },
  { name: 'canDecrement · canIncrement', type: 'boolean', fallback: 'true', description: 'False at the end of the range: the arrow dims and stops rather than disappearing, so the control keeps its width and the reader keeps their place.' },
  { name: 'decrementTitle · incrementTitle', type: 'string', required: true, description: 'The arrows’ names. Each is an icon-only control, so each is required.' },
  { name: 'onReset', type: '() => void', description: 'Pressing the readout puts the value back — the platform’s own convention. Given, the readout becomes a button; absent, it is text.' },
  { name: 'resetTitle', type: 'string', description: 'The readout’s tooltip and accessible name while it is a button.' },
  { name: 'canReset', type: 'boolean', fallback: 'true', description: 'False when the value is already the default: the readout dims and stops.' },
  { name: 'label', type: 'string', required: true, description: 'Names the whole control for a screen reader — “Interface scale”.' },
  { name: 'size', type: "'2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'", fallback: "'2xl'", description: 'ButtonIcon’s ladder. The pill is the rung’s height and the arrows are that rung’s ghost buttons drawn round, so a stepper beside a ToggleButton is one row of 40px controls.' },
  { name: 'disabled', type: 'boolean', fallback: 'false', description: 'Both arrows and the readout stop.' },
  { name: 'className', type: 'string', fallback: "''", description: 'Margins and placement. Not the height, the ground or the radius.' },
]

function Demo({ size }: { size?: StepperSize }) {
  const [index, setIndex] = useState(2)
  return (
    <Stepper
      value={`${Math.round(STEPS[index] * 100)}%`}
      label="Interface scale"
      onDecrement={() => setIndex((i) => Math.max(0, i - 1))}
      onIncrement={() => setIndex((i) => Math.min(STEPS.length - 1, i + 1))}
      canDecrement={index > 0}
      canIncrement={index < STEPS.length - 1}
      decrementTitle="Zoom out"
      incrementTitle="Zoom in"
      onReset={() => setIndex(2)}
      canReset={index !== 2}
      resetTitle="Reset to 100%"
      size={size}
    />
  )
}

export function StepperEntry({ theme, onOpen }: { theme: DesktopTheme; onOpen?: (id: string) => void }) {
  return (
    <article className="flex flex-col divide-y divide-hairline">
      <EntryHeader title="Stepper" uses={usesOf('stepper')} onOpen={onOpen}>
        <code>(−) 100% (+)</code> — a value walked up and down in steps the caller owns. One
        pill, so the value is visibly BETWEEN the two controls that change it, and so it can
        stand in a row of round tiles as one of them.
      </EntryHeader>

      <EntrySection
        title="It does not know the number"
        note="Walk it to either end: the arrow dims rather than vanishing. Then press the readout — it is a button when onReset is given, and it dims too once the value is back where it started. The steps here are the desktop’s own zoom factors, uneven on purpose."
      >
        <Stage theme={theme}>
          <Demo />
        </Stage>
      </EntrySection>

      <EntrySection title="The ladder" note="ButtonIcon’s seven rungs. The readout’s type and its floor width follow — tabular figures handle the glyphs, the floor handles the count, so 90% and 125% leave the arrows where they were.">
        <Stage theme={theme} className="flex items-center gap-5 flex-wrap">
          {COMPONENT_SIZES.map((size) => (
            <Specimen key={size} label={size}>
              <Demo size={size as StepperSize} />
            </Specimen>
          ))}
        </Stage>
      </EntrySection>

      <EntrySection title="Props">
        <PropsTable rows={PROPS} />
        <Snippet>{`import { Stepper } from '@ds/desktop'

<Stepper
  value={\`\${Math.round(zoom * 100)}%\`}
  label={t('settings.appearance.scale')}
  onDecrement={() => step(-1)}
  onIncrement={() => step(1)}
  canDecrement={zoom > MIN_ZOOM}
  canIncrement={zoom < MAX_ZOOM}
  decrementTitle={t('menu.zoomOut')}
  incrementTitle={t('menu.zoomIn')}
  onReset={() => set(DEFAULT_ZOOM)}
  canReset={zoom !== DEFAULT_ZOOM}
  resetTitle={t('settings.appearance.zoomReset')}
/>`}</Snippet>
      </EntrySection>
    </article>
  )
}
