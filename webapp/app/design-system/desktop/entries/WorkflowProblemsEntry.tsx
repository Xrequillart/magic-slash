'use client'

import { useState } from 'react'
import { WorkflowProblems } from '@ds/desktop'
import type { DesktopTheme } from '@/lib/desktopTheme'
import { EntryHeader, EntrySection, PropsTable, Snippet, Specimen, Stage, type PropRow } from '../parts'
import { usesOf } from './ids'
import { PROBLEMS_LABELS, SAMPLE_PROBLEMS } from './workflowSample'

const TWO = [
  ...SAMPLE_PROBLEMS,
  { id: 'duplicate-skill', message: 'changelog runs twice: remove one of its two steps.', nodeId: 'custom:changelog' },
  { id: 'invalid', message: 'The flow has no step a ticket can start from.' },
]

const PROPS: PropRow[] = [
  { name: 'problems', type: 'WorkflowProblemItem[]', required: true, description: 'id, message and an optional nodeId. A problem with a nodeId is a button; one about the flow as a whole is a line of text. Empty renders nothing at all.' },
  { name: 'onFocus', type: '(nodeId: string) => void', required: true, description: 'A problem’s step was pressed. The caller centres the canvas on it (focusRequest) and selects it.' },
  { name: 'labels', type: 'WorkflowProblemsLabels', required: true, description: 'The heading, counted by the caller, and the rows’ tooltip.' },
  { name: 'className', type: 'string', description: 'Margins and width.' },
]

export function WorkflowProblemsEntry({ theme, onOpen }: { theme: DesktopTheme; onOpen?: (id: string) => void }) {
  const [focused, setFocused] = useState<string | null>(null)

  return (
    <article className="flex flex-col divide-y divide-hairline">
      <EntryHeader title="WorkflowProblems" uses={usesOf('workflowproblems')} onOpen={onOpen}>
        Why the workflow cannot be saved, one row per problem. A problem that belongs to a
        step takes you to it.
      </EntryHeader>

      <EntrySection
        title="Rows that go somewhere"
        note="The first two name a step and are buttons: in the editor, pressing one centres the canvas on it. The third is about the flow as a whole and has nowhere to go. With nothing wrong, nothing is drawn."
      >
        <Stage theme={theme} className="flex flex-col gap-4">
          <Specimen label="three problems">
            <WorkflowProblems
              problems={TWO}
              onFocus={setFocused}
              labels={{ ...PROBLEMS_LABELS, title: '3 problems to fix before saving' }}
            />
          </Specimen>
          {focused && <p className="text-xs text-muted">Focus requested: {focused}</p>}
        </Stage>
      </EntrySection>

      <EntrySection title="Props">
        <PropsTable rows={PROPS} />
        <Snippet>{`import { WorkflowProblems } from '@ds/desktop'

<WorkflowProblems
  problems={problems}
  onFocus={(nodeId) => { select(nodeId); focus(nodeId) }}
  labels={labels}
/>`}</Snippet>
      </EntrySection>
    </article>
  )
}
