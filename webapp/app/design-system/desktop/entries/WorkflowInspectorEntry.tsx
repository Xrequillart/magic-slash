'use client'

import { useState } from 'react'
import { WorkflowInspector, type WorkflowCanvasLinkKind, type WorkflowCanvasNodeMode } from '@ds/desktop'
import type { DesktopTheme } from '@/lib/desktopTheme'
import { EntryHeader, EntrySection, PropsTable, Snippet, Specimen, Stage, type PropRow } from '../parts'
import { usesOf } from './ids'
import { INSPECTOR_LABELS, LINT_DESCRIPTION, LINT_WARNING } from './workflowSample'

const PROPS: PropRow[] = [
  { name: 'target', type: 'WorkflowInspectorTarget | null', required: true, description: '{ type: "node", step } or { type: "link", link }, as data: the step’s id, label, skill, description, locked, disabled, alwaysOn, mode, warning and hints, or the link’s two ends, their labels, its kind, outcome, disabledKinds and hint. Null draws `labels.empty`.' },
  { name: 'labels', type: 'WorkflowInspectorLabels', required: true, description: 'Every word: the field names, the two modes, the two kinds, Remove, the built-in sentence, the switch’s tooltips.' },
  { name: 'readOnly', type: 'boolean', fallback: 'false', description: 'Every control disabled and Remove hidden, for a viewer who may not edit. The panel still says what is selected.' },
  { name: 'onChangeMode · onRemove · onToggle', type: '(nodeId, mode) · (nodeId) · (nodeId, enabled) => void', description: 'A custom step’s mode and Remove, and any step’s switch. A control whose callback is missing is disabled.' },
  { name: 'onChangeKind', type: '(from, to, kind) => void', description: 'A link’s kind. A kind in `disabledKinds` is listed, greyed, and never reported.' },
  { name: 'className', type: 'string', description: 'Margins and width.' },
]

export function WorkflowInspectorEntry({ theme, onOpen }: { theme: DesktopTheme; onOpen?: (id: string) => void }) {
  const [mode, setMode] = useState<WorkflowCanvasNodeMode>('blocking')
  const [color, setColor] = useState('#6366F1')
  const [kind, setKind] = useState<WorkflowCanvasLinkKind>('auto')
  const [removed, setRemoved] = useState(false)

  return (
    <article className="flex flex-col divide-y divide-hairline">
      <EntryHeader title="WorkflowInspector" uses={usesOf('workflowinspector')} onOpen={onOpen}>
        What is selected on the workflow canvas, and what can be done to it: the editor’s side panel.
      </EntryHeader>

      <EntrySection
        title="Three shapes"
        note="A custom step says what its skill does, and has a mode and Remove. A built-in step is locked and says so, with nothing to press. A link has its kind, and a kind the model refuses there stays listed, greyed, with the reason under it."
      >
        <Stage theme={theme} className="grid gap-4 md:grid-cols-3">
          <Specimen label="a custom step">
            <WorkflowInspector
              target={removed ? null : {
                type: 'node',
                step: { id: 'custom:lint', label: 'lint', skill: 'lint', description: LINT_DESCRIPTION, mode, color, warning: LINT_WARNING, hints: ['Runs after Start, before Commit.'] },
              }}
              labels={INSPECTOR_LABELS}
              onChangeMode={(_, next) => setMode(next)}
              onChangeColor={(_, next) => setColor(next)}
              onRemove={() => setRemoved(true)}
            />
          </Specimen>
          <Specimen label="a built-in step">
            <WorkflowInspector
              target={{ type: 'node', step: { id: 'commit', label: 'Commit', skill: 'magic-commit', locked: true } }}
              labels={INSPECTOR_LABELS}
            />
          </Specimen>
          <Specimen label="a link into Start">
            <WorkflowInspector
              target={{
                type: 'link',
                link: {
                  from: 'plan', to: 'start', fromLabel: 'Plan', toLabel: 'Start', kind,
                  disabledKinds: ['auto'],
                  hint: 'Starting a ticket always opens a new agent, so this link can only be suggested.',
                },
              }}
              labels={INSPECTOR_LABELS}
              onChangeKind={(_, __, next) => setKind(next)}
            />
          </Specimen>
          <Specimen label="a conditional link">
            <WorkflowInspector
              target={{ type: 'link', link: { from: 'pr', to: 'resolve', fromLabel: 'PR', toLabel: 'Resolve', kind: 'auto', outcome: 'review_comments' } }}
              labels={INSPECTOR_LABELS}
              onChangeKind={() => undefined}
            />
          </Specimen>
          <Specimen label="read-only">
            <WorkflowInspector
              target={{ type: 'node', step: { id: 'custom:lint', label: 'lint', skill: 'lint', mode: 'blocking' } }}
              labels={INSPECTOR_LABELS}
              readOnly
              onChangeMode={() => undefined}
              onRemove={() => undefined}
            />
          </Specimen>
          <Specimen label="nothing selected">
            <WorkflowInspector target={null} labels={INSPECTOR_LABELS} />
          </Specimen>
        </Stage>
      </EntrySection>

      <EntrySection title="Props">
        <PropsTable rows={PROPS} />
        <Snippet>{`import { WorkflowInspector } from '@ds/desktop'

<WorkflowInspector
  target={target}
  labels={labels}
  readOnly={!canEdit}
  onChangeMode={changeMode}
  onRemove={removeStep}
  onChangeKind={changeKind}
/>`}</Snippet>
      </EntrySection>
    </article>
  )
}
