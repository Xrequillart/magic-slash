'use client'

import { useRef, useState } from 'react'
import { Button, WorkflowSkillPicker } from '@ds/desktop'
import { Plus } from '@ds/desktop/icons'
import type { DesktopTheme } from '@/lib/desktopTheme'
import { EntryHeader, EntrySection, PropsTable, Snippet, Stage, type PropRow } from '../parts'
import { usesOf } from './ids'
import { PICKER_LABELS, SAMPLE_SKILLS } from './workflowSample'

const PROPS: PropRow[] = [
  { name: 'open · onClose', type: 'boolean · () => void', required: true, description: 'The caller owns whether it is down. Closes on Escape, an outside press, a scroll, a resize or a pick, like every Menu.' },
  { name: 'anchor', type: 'HTMLElement | null', required: true, description: 'What it hangs from: the "+" the canvas hands back to `onInsert`.' },
  { name: 'skills', type: 'WorkflowSkillOption[]', required: true, description: 'name, source (custom, repo or plugin) and disabled. Grouped by source in that order; a skill already on the line is greyed with `labels.inWorkflow`, never left out.' },
  { name: 'onPick', type: '(name: string) => void', required: true, description: 'The skill picked. Never fires for a disabled one.' },
  { name: 'labels', type: 'WorkflowSkillPickerLabels', required: true, description: 'The title, the three kinds of the first level and what each is for, the back row, the empty line, the in-workflow note and the skill groups’ headings.' },
  { name: 'portalTo', type: 'HTMLElement | null', description: 'Where to portal, see Menu. This page passes its own stage, where the theme is.' },
]

export function WorkflowSkillPickerEntry({ theme, onOpen }: { theme: DesktopTheme; onOpen?: (id: string) => void }) {
  const [open, setOpen] = useState<'full' | 'empty' | null>(null)
  const [picked, setPicked] = useState<string | null>(null)
  const fullRef = useRef<HTMLSpanElement>(null)
  const emptyRef = useRef<HTMLSpanElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)

  return (
    <article className="flex flex-col divide-y divide-hairline">
      <EntryHeader title="WorkflowSkillPicker" uses={usesOf('workflowskillpicker')} onOpen={onOpen}>
        Which skill a new step runs: the menu the workflow editor drops from a + on the canvas.
      </EntryHeader>

      <EntrySection
        title="Grouped by where the skill comes from"
        note="Your skills, then the repository’s, then the plugins’. lint is on the line already: it stays in the list, greyed, so the reader sees it is used rather than missing. Press either button."
      >
        <Stage theme={theme}>
          <div ref={stageRef} className="relative flex min-h-72 items-start justify-center gap-3 py-6">
            <span ref={fullRef} className="inline-flex">
              <Button size="sm" tone="neutral" icon={Plus} onClick={() => setOpen((was) => (was === 'full' ? null : 'full'))}>
                Add a step
              </Button>
            </span>
            <span ref={emptyRef} className="inline-flex">
              <Button size="sm" tone="ghost" icon={Plus} onClick={() => setOpen((was) => (was === 'empty' ? null : 'empty'))}>
                With no skills
              </Button>
            </span>
            <WorkflowSkillPicker
              open={open !== null}
              onClose={() => setOpen(null)}
              anchor={open === 'empty' ? emptyRef.current : fullRef.current}
              skills={open === 'empty' ? [] : SAMPLE_SKILLS}
              labels={PICKER_LABELS}
              onPick={setPicked}
              onPickNote={() => setPicked('End note')}
              onPickAction={() => setPicked('Slack action')}
              portalTo={stageRef.current}
            />
          </div>
          {picked && <p className="text-center text-xs text-muted">Picked: {picked}</p>}
        </Stage>
      </EntrySection>

      <EntrySection title="Props">
        <PropsTable rows={PROPS} />
        <Snippet>{`import { WorkflowSkillPicker } from '@ds/desktop'

<WorkflowSkillPicker
  open={picker !== null}
  onClose={() => setPicker(null)}
  anchor={picker?.anchor ?? null}
  skills={skills}
  labels={labels}
  onPick={(name) => insertStep(picker.slot, name)}
/>`}</Snippet>
      </EntrySection>
    </article>
  )
}
