'use client'

import { WorkflowCanvas } from '@ds/desktop'
import type { DesktopTheme } from '@/lib/desktopTheme'
import { EntryHeader, EntrySection, PropsTable, Specimen, Stage, type PropRow } from '../parts'
import { usesOf } from './ids'
import { SAMPLE_ENTRY, SAMPLE_LABELS, SAMPLE_LINKS, SAMPLE_NODES } from './workflowSample'

const PROPS: PropRow[] = [
  { name: 'label', type: 'string', required: true, description: 'Its accessible name, translated: “Minimap”. The ground, the border and the size are its own.' },
]

export function CanvasMinimapEntry({ theme, onOpen }: { theme: DesktopTheme; onOpen?: (id: string) => void }) {
  return (
    <article className="flex flex-col divide-y divide-hairline">
      <EntryHeader title="CanvasMinimap" uses={usesOf('canvasminimap')} onOpen={onOpen}>
        Where the view is, on a canvas bigger than it.
      </EntryHeader>

      <EntrySection
        title="The whole graph, in the corner"
        note="The part on screen is outlined in the accent. Drag the outline to move the view, scroll over it to zoom: on a long flow that is faster than panning the canvas itself. It reads the canvas’s store, so it only exists inside one, and WorkflowCanvas draws it itself rather than taking it as a child."
      >
        <Stage theme={theme}>
          <Specimen label="a short canvas, so most of the flow is off screen until you move">
            <WorkflowCanvas
              nodes={SAMPLE_NODES}
              links={SAMPLE_LINKS}
              entry={SAMPLE_ENTRY}
              labels={SAMPLE_LABELS}
              className="h-[300px]"
            />
          </Specimen>
        </Stage>
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          Its colours are xyflow’s <code>--xy-minimap-*</code> variables set to the theme’s
          roles, not props: a prop would need a colour value, and this folder only names
          roles.
        </p>
      </EntrySection>

      <EntrySection title="Props">
        <PropsTable rows={PROPS} />
      </EntrySection>
    </article>
  )
}
