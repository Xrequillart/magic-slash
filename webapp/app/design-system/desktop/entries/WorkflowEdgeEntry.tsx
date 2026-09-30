'use client'

import { WorkflowCanvas, type WorkflowCanvasLink, type WorkflowCanvasNode } from '@ds/desktop'
import type { DesktopTheme } from '@/lib/desktopTheme'
import { EntryHeader, EntrySection, PropsTable, Specimen, Stage, type PropRow } from '../parts'
import { usesOf } from './ids'
import { SAMPLE_LABELS, loopSubset, sampleSubset } from './workflowSample'

// Module scope, so the canvas is handed the same arrays on every render.
const AUTO = sampleSubset(['pr', 'resolve'])
const SUGGEST = sampleSubset(['start', 'commit'])
// The default flow has no loop: this one comes from a custom flow that keeps a review step.
const LOOP = loopSubset(['review', 'resolve'])
const AUTO_ENTRY = ['pr']
const SUGGEST_ENTRY = ['start']
const LOOP_ENTRY = ['review']

// A custom flow's shapes the default one never has: a loop of three steps, closing from
// its bottom card to its top one past the card between, and a step that retries itself.
const DETOUR_NODES: WorkflowCanvasNode[] = [
  { id: 'build', label: 'Build', skill: 'build-app', outcomes: ['built'] },
  { id: 'check', label: 'Check', skill: 'check-app', outcomes: ['drift'] },
  { id: 'fix', label: 'Fix', skill: 'fix-app', outcomes: ['fixed', 'retry'] },
]
const DETOUR_LINKS: WorkflowCanvasLink[] = [
  { from: 'build', to: 'check', kind: 'suggest', outcome: 'built' },
  { from: 'check', to: 'fix', kind: 'suggest', outcome: 'drift' },
  { from: 'fix', to: 'build', kind: 'suggest', outcome: 'fixed' },
  { from: 'fix', to: 'fix', kind: 'auto', outcome: 'retry' },
]
const DETOUR_ENTRY = ['build']

const PROPS: PropRow[] = [
  { name: 'data.kind', type: "'auto' | 'suggest'", required: true, description: 'auto: a solid accent line with a dot travelling along it (hidden under reduced motion). suggest: a grey line, lighter, standing still.' },
  { name: 'data.outcome', type: 'string', description: 'The outcome the link is taken on, drawn on a plate at its middle. Absent on an unconditional link.' },
  { name: 'data.route', type: "'forward' | 'down' | 'up' | 'side' | 'self'", required: true, description: 'Across columns, left to right, as a curve. Between two neighbouring steps of a loop stacked in one column, a straight line down or up. Past a card between its ends, a detour down the column’s right gap (side). From a step to itself, a loop over its own corner (self).' },
]

export function WorkflowEdgeEntry({ theme, onOpen }: { theme: DesktopTheme; onOpen?: (id: string) => void }) {
  return (
    <article className="flex flex-col divide-y divide-hairline">
      <EntryHeader title="WorkflowEdge" uses={usesOf('workflowedge')} onOpen={onOpen}>
        One link of a workflow: what may run after a step, and whether it does so on its own.
      </EntryHeader>

      <EntrySection
        title="Two strokes for two promises"
        note="Both strokes are solid. Colour does not carry the difference alone: an auto link is heavier and has a dot travelling along it, a suggestion is lighter and still, so the two stay apart in a theme whose accent sits close to its lines."
      >
        <Stage theme={theme} className="flex flex-col gap-6">
          <Specimen label="auto, on an outcome">
            <WorkflowCanvas nodes={AUTO.nodes} links={AUTO.links} entry={AUTO_ENTRY} labels={SAMPLE_LABELS} className="h-[260px]" />
          </Specimen>
          <Specimen label="suggest, unconditional">
            <WorkflowCanvas nodes={SUGGEST.nodes} links={SUGGEST.links} entry={SUGGEST_ENTRY} labels={SAMPLE_LABELS} className="h-[260px]" />
          </Specimen>
          <Specimen label="a loop: its two steps stacked, one link down and one up">
            <WorkflowCanvas nodes={LOOP.nodes} links={LOOP.links} entry={LOOP_ENTRY} labels={SAMPLE_LABELS} className="h-[260px]" />
          </Specimen>
          <Specimen label="a loop of three and a step that retries itself: detours, never through a card">
            <WorkflowCanvas nodes={DETOUR_NODES} links={DETOUR_LINKS} entry={DETOUR_ENTRY} labels={SAMPLE_LABELS} className="h-[420px]" />
          </Specimen>
        </Stage>
      </EntrySection>

      <EntrySection title="Props">
        <PropsTable rows={PROPS} />
      </EntrySection>
    </article>
  )
}
