'use client'

import { WorkflowCanvas } from '@ds/desktop'
import type { DesktopTheme } from '@/lib/desktopTheme'
import { EntryHeader, EntrySection, PropsTable, Specimen, Stage, type PropRow } from '../parts'
import { usesOf } from './ids'
import { SAMPLE_LABELS, loopSubset, sampleSubset } from './workflowSample'

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

const PROPS: PropRow[] = [
  { name: 'data.node', type: 'WorkflowCanvasNode', required: true, description: 'The step. Its label and skill head the card, each outcome gets a row and a port whose handle id is the outcome’s name.' },
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
        note="A conditional link leaves from the row naming its outcome, so “review, on changes_requested, suggests resolve” reads off the card in a flow that has one. An unconditional link leaves from the header. Every outcome gets its row, linked or not: an outcome that leads nowhere is part of what the flow says."
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

      <EntrySection title="Props">
        <PropsTable rows={PROPS} />
      </EntrySection>
    </article>
  )
}
