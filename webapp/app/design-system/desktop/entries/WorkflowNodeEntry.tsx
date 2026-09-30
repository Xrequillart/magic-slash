'use client'

import { WorkflowCanvas } from '@ds/desktop'
import type { DesktopTheme } from '@/lib/desktopTheme'
import { EntryHeader, EntrySection, PropsTable, Specimen, Stage, type PropRow } from '../parts'
import { usesOf } from './ids'
import { EDIT_LABELS, EDIT_NODES, SAMPLE_LABELS, loopSubset, sampleSubset } from './workflowSample'

// Module scope, so the canvas is handed the same arrays on every render.
// Review has the most outcomes of any step; it comes from a custom flow, the default having none.
const REVIEW = loopSubset(['review'])
const REVIEW_ENTRY = ['review']
const PR = sampleSubset(['pr'])
const PR_ENTRY = ['pr']
const CUSTOM = {
  nodes: [{ id: 'design', label: 'Design Check', skill: 'design-check', outcomes: ['conform', 'drift'] }],
  links: [],
  entry: ['design'],
}

// The editor's marks: a built-in step a problem names, a blocking custom step with a
// warning, an advisory one turned off. Editable, but with nothing to report to: marks only.
const MARKS = {
  nodes: [
    EDIT_NODES[0],
    EDIT_NODES[2],
    { id: 'custom:changelog', label: 'Changelog', skill: 'changelog', outcomes: [], mode: 'advisory' as const, disabled: true },
  ],
  links: [
    { from: EDIT_NODES[0].id, to: EDIT_NODES[2].id, kind: 'suggest' as const },
    { from: EDIT_NODES[2].id, to: 'custom:changelog', kind: 'suggest' as const },
  ],
  entry: [EDIT_NODES[0].id],
}

const PROPS: PropRow[] = [
  { name: 'data.node', type: 'WorkflowCanvasNode', required: true, description: 'The step. Its label and skill head the card, each outcome gets a row and a port whose handle id is the outcome’s name. `disabled`, `alwaysOn`, `mode`, `warning` and `problem` add the editor’s marks.' },
  { name: 'data.selected', type: 'boolean', description: 'Drawn with a ring in the accent. Set by the editable canvas from its `selected` prop, never by xyflow.' },
  { name: 'data.labels', type: 'WorkflowNodeLabels', description: 'The lock’s tooltip and the two modes’ words. The editable canvas passes them from its own labels; without them neither mark is drawn.' },
]

export function WorkflowNodeEntry({ theme, onOpen }: { theme: DesktopTheme; onOpen?: (id: string) => void }) {
  return (
    <article className="flex flex-col divide-y divide-hairline">
      <EntryHeader title="WorkflowNode" uses={usesOf('workflownode')} onOpen={onOpen}>
        One step of a workflow, as a card: the skill’s glyph and name, and a port for every
        way it can end.
      </EntryHeader>

      <EntrySection
        title="The ports are the outcomes"
        note="A conditional link leaves from the row naming its outcome, so “review, on changes_requested, suggests resolve” reads off the card in a flow that has one. Links arrive at the one port on the header’s left, and the header has no way out: an unconditional link leaves from the last row, When done, or from the one row of a card with a single outcome, which says the same. Every outcome gets its row, linked or not: an outcome that leads nowhere is part of what the flow says."
      >
        <Stage theme={theme} className="flex flex-col gap-6">
          <Specimen label="three outcomes">
            <WorkflowCanvas nodes={REVIEW.nodes} links={REVIEW.links} entry={REVIEW_ENTRY} labels={SAMPLE_LABELS} className="h-[240px]" />
          </Specimen>
          <Specimen label="an auto link leaving a port">
            <WorkflowCanvas nodes={PR.nodes} links={PR.links} entry={PR_ENTRY} labels={SAMPLE_LABELS} className="h-[240px]" />
          </Specimen>
          <Specimen label="a custom skill: the fallback glyph">
            <WorkflowCanvas nodes={CUSTOM.nodes} links={CUSTOM.links} entry={CUSTOM.entry} labels={SAMPLE_LABELS} className="h-[240px]" />
          </Specimen>
        </Stage>
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          Never placed by hand: <code>WorkflowCanvas</code> registers it as its only node
          type and hands it everything in <code>data</code>, already translated. The ground
          is opaque, unlike most of this folder’s surfaces, so a link running under a card
          does not show through it.
        </p>
      </EntrySection>

      <EntrySection
        title="The editor’s marks"
        note="On the editable canvas only. Every step wears its switch, an eye open or shut, greyed on start; a step turned off is greyed, its links faded; a custom step wears its mode; a warning is a badge whose tooltip says it; a step a problem names wears a red border. The read-only canvas draws none of them."
      >
        <Stage theme={theme}>
          <Specimen label="built in with a problem, blocking with a warning, advisory, turned off">
            <WorkflowCanvas nodes={MARKS.nodes} links={MARKS.links} entry={MARKS.entry} labels={EDIT_LABELS} editable className="h-[240px]" />
          </Specimen>
        </Stage>
      </EntrySection>

      <EntrySection title="Props">
        <PropsTable rows={PROPS} />
      </EntrySection>
    </article>
  )
}
