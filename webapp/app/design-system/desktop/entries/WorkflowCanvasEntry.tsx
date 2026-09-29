'use client'

import { WorkflowCanvas } from '@ds/desktop'
import type { DesktopTheme } from '@/lib/desktopTheme'
import { EntryHeader, EntrySection, PropsTable, Snippet, Specimen, Stage, type PropRow } from '../parts'
import { usesOf } from './ids'
import { SAMPLE_ENTRY, SAMPLE_LABELS, SAMPLE_LINKS, SAMPLE_NODES } from './workflowSample'

const PROPS: PropRow[] = [
  { name: 'nodes', type: 'WorkflowCanvasNode[]', required: true, description: 'The steps: id, label (translated), skill folder, outcomes, mode, required. Drawn as WorkflowNode cards.' },
  { name: 'links', type: 'WorkflowCanvasLink[]', required: true, description: 'from, to, kind (auto or suggest) and an optional outcome. A link with an outcome leaves from that outcome’s port and carries its name.' },
  { name: 'entry', type: 'string[]', required: true, description: 'The node ids a ticket may start from. The layout counts its columns from them.' },
  { name: 'labels', type: 'WorkflowCanvasLabels', required: true, description: 'Every word the canvas draws or announces, translated by the caller: its accessible name, the minimap’s, the legend’s two strokes, the two modes and the lock’s tooltip.' },
  { name: 'className', type: 'string', description: 'The box. A height is required: the canvas fills its parent, and a parent with no height is a canvas zero pixels tall.' },
]

export function WorkflowCanvasEntry({ theme, onOpen }: { theme: DesktopTheme; onOpen?: (id: string) => void }) {
  return (
    <article className="flex flex-col divide-y divide-hairline">
      <EntryHeader title="WorkflowCanvas" uses={usesOf('workflowcanvas')} onOpen={onOpen}>
        A repository’s workflow on an infinite canvas, the way FigJam draws a board.
      </EntryHeader>

      <EntrySection
        title="The default flow"
        note="Every repository shows this until it has a flow of its own: seven steps, one auto link (pr to resolve, when review comments are already waiting) and the review ⇄ resolve loop, its two steps stacked in one column so no link runs over or under a card. Drag or scroll to pan, pinch or ⌘ + scroll to zoom, Space + drag works too."
      >
        <Stage theme={theme}>
          <Specimen label="the Workflow tab of a repository’s settings, read-only">
            <WorkflowCanvas
              nodes={SAMPLE_NODES}
              links={SAMPLE_LINKS}
              entry={SAMPLE_ENTRY}
              labels={SAMPLE_LABELS}
              className="h-[520px]"
            />
          </Specimen>
        </Stage>
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          The layout is computed, not passed: columns by longest path from the entry nodes,
          the link that closes a loop left out of the count. A flow has no saved positions
          to show until something can edit one. The colours are xyflow’s own variables
          mapped onto the theme’s roles in <code>workflowCanvas.css</code>, so switching the
          theme above repaints the ground, the dots, the cards and the minimap together.
        </p>
      </EntrySection>

      <EntrySection title="Props">
        <PropsTable rows={PROPS} />
        <Snippet>{`import { WorkflowCanvas } from '@ds/desktop'

<WorkflowCanvas
  nodes={data.nodes}
  links={data.links}
  entry={data.entry}
  labels={labels}
  className="h-[520px]"
/>`}</Snippet>
      </EntrySection>
    </article>
  )
}
