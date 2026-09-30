'use client'

import { useState } from 'react'
import { WorkflowCanvas } from '@ds/desktop'
import type { DesktopTheme } from '@/lib/desktopTheme'
import { EntryHeader, EntrySection, PropsTable, Snippet, Specimen, Stage, type PropRow } from '../parts'
import { usesOf } from './ids'
import { EDIT_LABELS, EDIT_LINKS, EDIT_NODES, SAMPLE_ENTRY, SAMPLE_LABELS, SAMPLE_LINKS, SAMPLE_NODES } from './workflowSample'

const PROPS: PropRow[] = [
  { name: 'nodes', type: 'WorkflowCanvasNode[]', required: true, description: 'The steps: id, label, skill folder and outcomes. Drawn as WorkflowNode cards.' },
  { name: 'links', type: 'WorkflowCanvasLink[]', required: true, description: 'from, to, kind (auto or suggest) and an optional outcome. A link with an outcome leaves from that outcome’s port and carries its name.' },
  { name: 'entry', type: 'string[]', required: true, description: 'The node ids a ticket may start from. The layout counts its columns from them.' },
  { name: 'labels', type: 'WorkflowCanvasLabels', required: true, description: 'Every word the canvas draws or announces, translated by the caller: its accessible name, the minimap’s, and the legend’s two strokes.' },
  { name: 'className', type: 'string', description: 'The box. A height is required: the canvas fills its parent, and a parent with no height is a canvas zero pixels tall.' },
  { name: 'positions', type: 'Record<id, { x, y }>', description: 'Where each card was left. A card missing from it is laid out; the links of a moved card become plain curves.' },
  { name: 'onEdit', type: '() => void', description: 'Read-only: an Edit button in the corner above the minimap (`labels.edit`), the way into WorkflowEditor.' },
  { name: 'editable', type: 'boolean', fallback: 'false', description: 'Turns the editor on: cards and links can be pressed, and cards take the keyboard. Off, the canvas is the read-only one above, unchanged.' },
  { name: 'selected · onSelect', type: 'WorkflowCanvasSelection | null · (selection) => void', description: 'Controlled selection: { type: "node", id } or { type: "link", from, to }. A press on a card or a link reports it, a press on the ground reports null. xyflow’s own selection stays off.' },
  { name: 'onMove', type: '(id, position) => void', description: 'Editable: cards drag, and this reports where one was let go. Nothing drags without it.' },
  { name: 'onConnect', type: '(from, to, outcome?) => void', description: 'Editable: links are drawn out of a card’s ports onto another card. From an outcome’s row, the link is taken on that outcome only. A second link between the same two cards, or a card to itself, cannot be drawn.' },
  { name: 'dock', type: 'WorkflowDockProps', description: 'The editor’s dock, floating at the bottom centre. Drawn inside the flow, since its zoom and its + read the flow’s store.' },
  { name: 'frameless · legend', type: 'boolean · "top-left" | "bottom-left"', description: 'A canvas that IS the screen: no border, no corners, and the legend out of the corner the editor’s title takes.' },
  { name: 'focusRequest', type: '{ id: string; n: number } | null', description: 'Centres the view on a node, keeping the zoom unless it is too far out to read. Bump `n` to centre on the same node again.' },
  { name: 'WorkflowCanvasNode.disabled · alwaysOn · mode · warning · problem', type: 'boolean · boolean · "blocking" | "advisory" · string · boolean', description: 'What the editor draws on a card: its switch, an eye open or shut (greyed on alwaysOn), a step turned off greyed with its links faded, a custom step’s mode, a warning badge whose tooltip is the warning, and a red border for a step a problem names. `labels.disable`, `enable`, `alwaysOn`, `off`, `blocking` and `advisory` are the words they need; `onToggle` is what the switch calls.' },
]

function EditButtonSpecimen() {
  const [pressed, setPressed] = useState(0)
  return (
    <div className="flex flex-col gap-2">
      <WorkflowCanvas
        nodes={EDIT_NODES}
        links={EDIT_LINKS}
        entry={SAMPLE_ENTRY}
        labels={EDIT_LABELS}
        className="h-[520px]"
        onEdit={() => setPressed((n) => n + 1)}
      />
      {pressed > 0 && <p className="text-xs text-muted">Edit pressed {pressed}×: the app opens WorkflowEditor here.</p>}
    </div>
  )
}

export function WorkflowCanvasEntry({ theme, onOpen }: { theme: DesktopTheme; onOpen?: (id: string) => void }) {
  return (
    <article className="flex flex-col divide-y divide-hairline">
      <EntryHeader title="WorkflowCanvas" uses={usesOf('workflowcanvas')} onOpen={onOpen}>
        A repository’s workflow on an infinite canvas, the way FigJam draws a board.
      </EntryHeader>

      <EntrySection
        title="The default flow"
        note="Every repository shows this until it has a flow of its own: six steps, one auto link (pr to resolve, when review comments are already waiting), on one line. Drag or scroll to pan, pinch or ⌘ + scroll to zoom, Space + drag works too."
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
          the link that closes a loop left out of the count. A card the editor moved keeps
          its place (`positions`), and the layout is what the others fall back to. The colours are xyflow’s own variables
          mapped onto the theme’s roles in <code>workflowCanvas.css</code>, so switching the
          theme above repaints the ground, the dots, the cards and the minimap together.
        </p>
      </EntrySection>

      <EntrySection
        title="With its Edit button"
        note="The Workflow tab of a repository: the canvas read-only, and an Edit button above the minimap that opens WorkflowEditor over the whole window. The flow is a repository’s own: a custom Lint step drawn between Start and Commit."
      >
        <Stage theme={theme}>
          <Specimen label="the Workflow tab, read-only, with the way into the editor">
            <EditButtonSpecimen />
          </Specimen>
        </Stage>
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
/>

// The tab: read-only, with the way into the editor.
<WorkflowCanvas
  nodes={data.nodes}
  links={data.links}
  entry={data.entry}
  labels={labels}
  positions={saved.positions}
  className="h-[520px]"
  onEdit={() => setEditing(true)}
/>`}</Snippet>
      </EntrySection>
    </article>
  )
}
