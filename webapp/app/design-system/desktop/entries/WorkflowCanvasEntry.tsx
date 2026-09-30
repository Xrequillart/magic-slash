'use client'

import { useMemo, useRef, useState } from 'react'
import {
  WorkflowCanvas, WorkflowInspector, WorkflowProblems, WorkflowSkillPicker,
  type WorkflowCanvasLink, type WorkflowCanvasNode, type WorkflowCanvasSelection, type WorkflowInspectorTarget, type WorkflowProblemItem,
} from '@ds/desktop'
import type { DesktopTheme } from '@/lib/desktopTheme'
import { EntryHeader, EntrySection, PropsTable, Snippet, Specimen, Stage, type PropRow } from '../parts'
import { usesOf } from './ids'
import {
  EDIT_KINDS, EDIT_LABELS, EDIT_NODES, INSPECTOR_LABELS, PICKER_LABELS, PROBLEMS_LABELS, SAMPLE_ENTRY, SAMPLE_LABELS, SAMPLE_LINKS, SAMPLE_NODES,
  SAMPLE_SKILLS, START_PROBLEM, lineLinks,
} from './workflowSample'

const PROPS: PropRow[] = [
  { name: 'nodes', type: 'WorkflowCanvasNode[]', required: true, description: 'The steps: id, label, skill folder and outcomes. Drawn as WorkflowNode cards.' },
  { name: 'links', type: 'WorkflowCanvasLink[]', required: true, description: 'from, to, kind (auto or suggest) and an optional outcome. A link with an outcome leaves from that outcome’s port and carries its name.' },
  { name: 'entry', type: 'string[]', required: true, description: 'The node ids a ticket may start from. The layout counts its columns from them.' },
  { name: 'labels', type: 'WorkflowCanvasLabels', required: true, description: 'Every word the canvas draws or announces, translated by the caller: its accessible name, the minimap’s, and the legend’s two strokes.' },
  { name: 'className', type: 'string', description: 'The box. A height is required: the canvas fills its parent, and a parent with no height is a canvas zero pixels tall.' },
  { name: 'editable', type: 'boolean', fallback: 'false', description: 'Turns the editor on: cards and links can be pressed, a "+" sits in every insert slot, and cards take the keyboard. Off, the canvas is the read-only one above, unchanged.' },
  { name: 'selected · onSelect', type: 'WorkflowCanvasSelection | null · (selection) => void', description: 'Controlled selection: { type: "node", id } or { type: "link", from, to }. A press on a card or a link reports it, a press on the ground reports null. xyflow’s own selection stays off.' },
  { name: 'onInsert', type: '(slot: number, anchor: HTMLElement) => void', description: 'A "+" was pressed. `nodes` are read as the line: slot 0 is before the first node, i between nodes[i - 1] and nodes[i], nodes.length after the last. The button comes back as the anchor for the skill picker. No "+" is drawn without it.' },
  { name: 'focusRequest', type: '{ id: string; n: number } | null', description: 'Centres the view on a node, keeping the zoom unless it is too far out to read. Bump `n` to centre on the same node again.' },
  { name: 'WorkflowCanvasNode.locked · mode · warning · problem', type: 'boolean · "blocking" | "advisory" · string · boolean', description: 'What the editor draws on a card: a lock on a built-in step, a custom step’s mode, a warning badge whose tooltip is the warning, and a red border for a step a problem names. `labels.locked`, `blocking`, `advisory` and `insert` are the words they need.' },
]

/** The problem the sample can have: an automatic link into start. Recomputed as the line changes. */
function problemsOf(links: WorkflowCanvasLink[]): WorkflowProblemItem[] {
  return links
    .filter((link) => link.to === 'start' && link.kind === 'auto')
    .map((link) => ({ id: `auto-into-start-${link.from}`, message: START_PROBLEM, nodeId: link.from }))
}

/**
 * THE EDITOR, WIRED: the canvas, the inspector beside it, the problems above and the
 * skill picker off every "+". The state is this specimen's own, the way the app keeps
 * its overlay; nothing here is the app's code.
 */
function EditableSpecimen() {
  const [nodes, setNodes] = useState<WorkflowCanvasNode[]>(EDIT_NODES)
  const [kinds, setKinds] = useState(EDIT_KINDS)
  const [selected, setSelected] = useState<WorkflowCanvasSelection | null>(null)
  const [focus, setFocus] = useState<{ id: string; n: number } | null>(null)
  const [picker, setPicker] = useState<{ slot: number; anchor: HTMLElement } | null>(null)
  const stageRef = useRef<HTMLDivElement>(null)

  const links = useMemo(() => lineLinks(nodes, kinds), [nodes, kinds])
  const problems = useMemo(() => problemsOf(links), [links])
  const drawn = useMemo(
    () => nodes.map((node) => ({ ...node, problem: problems.some((p) => p.nodeId === node.id) })),
    [nodes, problems],
  )
  const skills = SAMPLE_SKILLS.map((skill) => ({ ...skill, disabled: nodes.some((node) => node.skill === skill.name) }))

  const focusOn = (id: string) => {
    setSelected({ type: 'node', id })
    setFocus((was) => ({ id, n: (was?.n ?? 0) + 1 }))
  }

  const rekey = (from: string, to: string | null) =>
    setKinds((was) => Object.fromEntries(Object.entries(was).flatMap(([key, kind]) => {
      const [a, b] = key.split('>')
      if (a !== from && b !== from) return [[key, kind]]
      if (to === null) return []
      return [[`${a === from ? to : a}>${b === from ? to : b}`, kind]]
    })))

  const target: WorkflowInspectorTarget | null = (() => {
    if (!selected) return null
    if (selected.type === 'node') {
      const index = nodes.findIndex((n) => n.id === selected.id)
      const node = nodes[index]
      if (!node) return null
      return {
        type: 'node',
        step: {
          id: node.id,
          label: node.label,
          skill: node.skill,
          locked: node.locked,
          mode: node.mode,
          warning: node.warning,
          hints: nodes[index - 1]?.id === 'pr' ? ['Runs only when there are review comments.'] : undefined,
        },
      }
    }
    const link = links.find((l) => l.from === selected.from && l.to === selected.to)
    if (!link) return null
    const label = (id: string) => nodes.find((n) => n.id === id)?.label ?? id
    const intoStart = link.to === 'start'
    return {
      type: 'link',
      link: {
        from: link.from,
        to: link.to,
        fromLabel: label(link.from),
        toLabel: label(link.to),
        kind: link.kind,
        outcome: link.outcome,
        disabledKinds: intoStart ? ['auto'] : undefined,
        hint: intoStart ? 'Starting a ticket always opens a new agent, so this link can only be suggested.' : undefined,
      },
    }
  })()

  return (
    <div ref={stageRef} className="flex flex-col gap-3">
      <WorkflowProblems problems={problems} onFocus={focusOn} labels={PROBLEMS_LABELS} />
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <WorkflowCanvas
          nodes={drawn}
          links={links}
          entry={SAMPLE_ENTRY}
          labels={EDIT_LABELS}
          className="h-[520px]"
          editable
          selected={selected}
          onSelect={setSelected}
          onInsert={(slot, anchor) => setPicker({ slot, anchor })}
          focusRequest={focus}
        />
        <WorkflowInspector
          target={target}
          skills={skills}
          labels={INSPECTOR_LABELS}
          className="self-start"
          onChangeSkill={(id, skill) => {
            const next = `custom:${skill}`
            setNodes((was) => was.map((n) => (n.id === id ? { ...n, id: next, label: skill, skill, warning: undefined } : n)))
            rekey(id, next)
            setSelected({ type: 'node', id: next })
          }}
          onChangeMode={(id, mode) => setNodes((was) => was.map((n) => (n.id === id ? { ...n, mode } : n)))}
          onRemove={(id) => {
            setNodes((was) => was.filter((n) => n.id !== id))
            rekey(id, null)
            setSelected(null)
          }}
          onChangeKind={(from, to, kind) => setKinds((was) => ({ ...was, [`${from}>${to}`]: kind }))}
        />
      </div>
      <WorkflowSkillPicker
        open={picker !== null}
        onClose={() => setPicker(null)}
        anchor={picker?.anchor ?? null}
        skills={skills}
        labels={PICKER_LABELS}
        portalTo={stageRef.current}
        onPick={(skill) => {
          if (!picker) return
          const id = `custom:${skill}`
          setNodes((was) => [
            ...was.slice(0, picker.slot),
            { id, label: skill, skill, outcomes: [], mode: 'advisory' },
            ...was.slice(picker.slot),
          ])
          focusOn(id)
        }}
      />
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
          the link that closes a loop left out of the count. A flow has no saved positions
          to show until something can edit one. The colours are xyflow’s own variables
          mapped onto the theme’s roles in <code>workflowCanvas.css</code>, so switching the
          theme above repaints the ground, the dots, the cards and the minimap together.
        </p>
      </EntrySection>

      <EntrySection
        title="Editable"
        note="The repository’s own line: six built-in steps, locked, and a custom Lint step between Start and Commit, chained from Start on its own. Press a card or a link to inspect it, a + to add a step there. The problem above is real: a link into Start cannot be automatic. Press it to centre the canvas on the step it names, then set the link back to Suggested."
      >
        <Stage theme={theme}>
          <Specimen label="the Workflow tab, editable, with its inspector and its problems">
            <EditableSpecimen />
          </Specimen>
        </Stage>
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          The canvas still owns nothing: the selection, the line and the focus are the
          caller’s, and every press is reported. Nothing drags and nothing connects, since
          the order of the line is the model’s; a step moves by being removed and added again.
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
/>

// Editable: the caller keeps the selection and the line.
<WorkflowCanvas
  nodes={line}
  links={links}
  entry={entry}
  labels={labels}
  className="h-[520px]"
  editable
  selected={selected}
  onSelect={setSelected}
  onInsert={(slot, anchor) => openPicker(slot, anchor)}
  focusRequest={focus}
/>`}</Snippet>
      </EntrySection>
    </article>
  )
}
