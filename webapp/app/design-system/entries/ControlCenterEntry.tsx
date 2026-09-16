'use client'

import { useState } from 'react'
import { ControlCenter, ControlCenterGroup, SetupStatusCard, Stepper, ThemeGrid, ToggleButton } from '@ds/desktop'
import { DESKTOP_THEMES, DESKTOP_THEME_IDS } from '@/lib/desktopTheme'
import { Bell, BellOff, Columns, Search } from '@ds/desktop/icons'
import type { DesktopTheme } from '@/lib/desktopTheme'
import { EntryHeader, EntrySection, PropsTable, Snippet, Stage, type PropRow } from '../parts'
import { usesOf } from './ids'

const PROPS: PropRow[] = [
  { name: 'open', type: 'boolean', required: true, description: 'Down or up. The caller flips it; the component decides when the DOM can go, because the exit has to play first.' },
  { name: 'onClose', type: '() => void', required: true, description: 'Escape, a click anywhere off the column of controls, or anything the caller wires to it.' },
  { name: 'top', type: 'number', fallback: '0', description: 'Where the sheet begins, in pixels from the window’s top. The app passes TITLE_BAR_HEIGHT: the sheet starts UNDER the bar, so the button that opened it is still there to close it and the window is still draggable.' },
  { name: 'label', type: 'string', required: true, description: 'Names the menu for a screen reader — “Quick settings”.' },
  { name: 'children', type: 'ReactNode', required: true, description: 'The controls, grouped. ControlCenterGroup is the shape they come in; what is on the sheet is the app’s to decide, the way Modal is handed its card.' },
  { name: 'width', type: 'number', fallback: '440', description: 'How wide the column of controls may be. It hugs the right edge under the button that opened it, and this is what stops it stretching across a wide window.' },
  { name: 'portalTo', type: 'HTMLElement | null', fallback: 'document.body', description: 'Where to portal. The app’s theme variables are on :root; a drawing of the app puts them on one element and points this at it — which is what this very page does.' },
  { name: 'className', type: 'string', fallback: "''", description: 'Layout INSIDE the column. Not the motion. Each ControlCenterGroup lays its children on CONTROL_CENTER_GRID — four points to a row — on its own.' },
]

/** The site’s copy of the registry, as the five colours a swatch is made of. */
const THEMES = DESKTOP_THEME_IDS.map((id) => {
  const { label, vars } = DESKTOP_THEMES[id]
  return {
    id,
    label,
    colors: {
      floor: `rgb(${vars['--c-bg']})`,
      panel: vars['--c-surface-strong'],
      line: vars['--c-line-strong'],
      ink: `rgb(${vars['--c-ink']})`,
      accent: `rgb(${vars['--c-accent']})`,
    },
  }
})

export function ControlCenterEntry({ theme, onOpen }: { theme: DesktopTheme; onOpen?: (id: string) => void }) {
  const [open, setOpen] = useState(false)
  const [portal, setPortal] = useState<HTMLDivElement | null>(null)
  const [split, setSplit] = useState(true)
  const [quick, setQuick] = useState(false)
  const [bell, setBell] = useState(true)
  const [zoom, setZoom] = useState(100)
  const [themeId, setThemeId] = useState<string>(DESKTOP_THEME_IDS[0])
  const [lang, setLang] = useState('en')

  return (
    <article className="flex flex-col divide-y divide-hairline">
      <EntryHeader title="ControlCenter" uses={usesOf('controlcenter')} onOpen={onOpen}>
        The menu that comes down from the title bar — macOS’s Control Center, at this
        folder’s scale. No box, no border, no ground at all: a transparent sheet that slides
        down from under the bar, and controls that stand on their own opaque plates.
      </EntryHeader>

      <EntrySection
        title="A curtain, not a window"
        note="Open it. The sheet slides down from the top of THIS page — it is a fixed layer, and the stage below is only where its theme comes from — and leaves the same way, faster. Escape or a click off the controls closes it. What is on it is a drawing of the desktop’s own set: the setup verdict, the theme grid, the stepper, tiles and flags, each on the shared raised plate."
      >
        <Stage theme={theme}>
          <div ref={setPortal} />
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="rounded-lg bg-surface px-3 py-2 text-xs font-medium text-ink transition-colors hover:bg-surface-strong"
          >
            Pull the sheet down
          </button>
          <ControlCenter open={open} onClose={() => setOpen(false)} label="Quick settings" portalTo={portal}>
            <ControlCenterGroup label="Machine setup">
              <SetupStatusCard state="ready" label="Machine ready" openTitle="Open the machine setup" onOpen={() => undefined} refreshTitle="Check again" onRefresh={() => undefined} />
            </ControlCenterGroup>
            <ControlCenterGroup label="Appearance">
              <ThemeGrid themes={THEMES} value={themeId} onSelect={setThemeId} />
              <Stepper
                value={`${zoom}%`}
                label="Interface scale"
                className="col-span-3 w-full"
                onDecrement={() => setZoom((z) => Math.max(80, z - 10))}
                onIncrement={() => setZoom((z) => Math.min(150, z + 10))}
                canDecrement={zoom > 80}
                canIncrement={zoom < 150}
                decrementTitle="Zoom out"
                incrementTitle="Zoom in"
                onReset={() => setZoom(100)}
                canReset={zoom !== 100}
                resetTitle="Reset to 100%"
              />
              <ToggleButton icon={Columns} checked={split} onChange={setSplit} caption={false} label="Split view" />
            </ControlCenterGroup>
            <ControlCenterGroup label="Features">
              <ToggleButton icon={Search} checked={quick} onChange={setQuick} caption={false} label="Quick Launch" />
              <ToggleButton icon={Bell} offIcon={BellOff} offTone="danger" checked={bell} onChange={setBell} caption={false} label="Notifications" />
            </ControlCenterGroup>
            <ControlCenterGroup label="Language">
              <ToggleButton flag="en" checked={lang === 'en'} onChange={() => setLang('en')} caption={false} label="English" />
              <ToggleButton flag="fr" checked={lang === 'fr'} onChange={() => setLang('fr')} caption={false} label="Français" />
            </ControlCenterGroup>
          </ControlCenter>
        </Stage>
      </EntrySection>

      <EntrySection title="Props">
        <PropsTable rows={PROPS} />
        <Snippet>{`import { ControlCenter, ControlCenterGroup, TITLE_BAR_HEIGHT } from '@ds/desktop'

<ControlCenter open={open} onClose={close} top={TITLE_BAR_HEIGHT} label={t('controlCenter.title')}>
  <ControlCenterGroup label={t('controlCenter.features')}>
    <ToggleButton … />
  </ControlCenterGroup>
</ControlCenter>`}</Snippet>
      </EntrySection>
    </article>
  )
}
