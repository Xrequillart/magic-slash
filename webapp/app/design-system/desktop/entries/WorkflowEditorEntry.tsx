'use client'

import { useMemo, useRef, useState } from 'react'
import {
  WorkflowEditor,
  type WorkflowHistoryItem,
  type WorkflowCanvasLink, type WorkflowCanvasNode, type WorkflowCanvasSelection, type WorkflowEditorLabels, type WorkflowInspectorTarget,
  type WorkflowProblemItem,
} from '@ds/desktop'
import type { DesktopTheme } from '@/lib/desktopTheme'
import { EntryHeader, EntrySection, PropsTable, Snippet, Specimen, Stage, type PropRow } from '../parts'
import { usesOf } from './ids'
import {
  DOCK_LABELS, EDIT_LABELS, EDIT_LINKS, EDIT_NODES, INSPECTOR_LABELS, PICKER_LABELS, SAMPLE_ENTRY, SAMPLE_SKILLS, START_PROBLEM,
  isSampleDefaultLink,
} from './workflowSample'

const SAMPLE_REPOSITORIES = [
  { value: 'magic-slash', label: 'magic-slash', color: '#8b5cf6' },
  { value: 'poppins-app', label: 'poppins-app', color: '#10b981' },
  { value: 'infra', label: 'infra', color: '#f59e0b' },
]

const NO_FACE = { src: null, alt: '' }

const SAMPLE_HISTORY: WorkflowHistoryItem[] = [
  {
    id: 'h3', actor: 'camille@example.com', avatar: NO_FACE, action: 'changed the start settings',
    date: '12 min ago', changes: ['Plan approval: on → off', 'Minimum score: 8 → 9'],
  },
  {
    id: 'h2', actor: 'alex@example.com', avatar: NO_FACE, action: 'edited the workflow',
    date: '2 h ago', changes: ['Added the Lint step', 'Commit → PR: Automatic'],
  },
  {
    id: 'h1', actor: 'alex@example.com', avatar: NO_FACE, action: 'edited the workflow',
    date: '3 d ago', changes: ['Turned off Resolve', 'Moved 2 cards on the canvas'],
  },
  {
    id: 'h0', actor: 'camille@example.com', avatar: NO_FACE, action: 'edited the workflow',
    date: '1 wk ago', changes: ['Added the Changelog step', 'Linked PR → Changelog (Suggested)', 'Changelog: carries on after a failure'],
  },
  {
    id: 'h-1', actor: 'alex@example.com', avatar: NO_FACE, action: 'changed the start settings',
    date: '2 wk ago', changes: ['Execution mode: Automatic → Always one agent', 'Critic iterations: 3 → 2'],
  },
  {
    id: 'h-2', actor: 'camille@example.com', avatar: NO_FACE, action: 'edited the workflow',
    date: '3 wk ago', changes: ['Added the Lint step', 'Linked Commit → Lint (Suggested)', 'Moved 4 cards on the canvas'],
  },
]

const HISTORY_LABELS = {
  title: 'History', close: 'Close', loading: 'Loading the history', empty: 'No change recorded yet.',
  failed: 'Couldn’t load the history.', retry: 'Retry', truncated: 'Only the latest changes are shown.',
}

const PROPS: PropRow[] = [
  { name: 'nodes · links · entry · positions', type: 'WorkflowCanvasNode[] · WorkflowCanvasLink[] · string[] · Record<id, {x, y}>', required: true, description: 'The flow, as WorkflowCanvas draws it. A card without a position is laid out; a moved one stays where it was left.' },
  { name: 'selected · onSelect · target', type: 'WorkflowCanvasSelection | null · (selection) => void · WorkflowInspectorTarget | null', required: true, description: 'The selection, and what the floating inspector shows for it. The inspector is only drawn while something is selected; its X and a press on the ground both report null.' },
  { name: 'history', type: 'WorkflowEditorHistory', description: 'The first row of the actions dropdown right of the repository picker, whose trigger wears its word and when the flow last changed, and the panel it opens in the inspector’s place: who changed the flow and its start settings, and when, each save with what it changed (WorkflowHistory). Which of the history and the inspector shows is the caller’s. Not drawn without it.' },
  { name: 'duplicate', type: 'WorkflowEditorAction', description: 'The dropdown’s row that copies this flow onto another repository. Which one, and asking first, is the caller’s. Not drawn without it.' },
  { name: 'reset', type: 'WorkflowEditorAction', description: 'The dropdown’s red row that puts the repository back on the default flow. The confirmation is the caller’s. Not drawn without it.' },
  { name: 'repositories', type: 'WorkflowCanvasRepositories', description: 'A picker left of the legend, as tall as it, to edit another repository’s flow. The editor only reports the choice: switching is the caller’s. Not drawn without it.' },
  { name: 'onMove · onConnect', type: '(id, position) => void · (from, to, outcome?) => void', required: true, description: 'A card was dragged and let go; a link was drawn out of a port, the outcome being the row it left from.' },
  { name: 'onToggle', type: '(id, enabled: boolean) => void', required: true, description: 'A step’s eye was pressed, on its card or in the inspector: turn it on or off. Start’s is greyed (alwaysOn).' },
  { name: 'onAdd', type: '(skill: string, position: {x, y}) => void', required: true, description: 'A skill was picked off the dock’s +. The position is the middle of the view: the step lands where the admin is looking, linked to nothing.' },
  { name: 'canUndo · canRedo · onUndo · onRedo', type: 'boolean · () => void', required: true, description: 'The history is the caller’s. The keys are too: ⌘Z is bound by the app, not here.' },
  { name: 'problems · onFocusProblem', type: 'WorkflowProblemItem[] · (nodeId) => void', required: true, description: 'The dock’s red badge, and its menu of problems.' },
  { name: 'dirty · saving · canSave · onSave · onDiscard · onClose', type: 'boolean · () => void', required: true, description: 'The dock’s way out.' },
  { name: 'banners', type: 'WorkflowEditorBanner[]', description: 'A conflict, a change made elsewhere, a refused save: floating at the top centre.' },
  { name: 'leaving · onLeft', type: 'boolean · () => void', description: 'Play the way out (the dock drops, the canvas sinks, the layer fades), then say so: the caller unmounts on onLeft. Reduced motion shortens every animation to 1ms rather than removing it, so onLeft still fires.' },
  { name: 'readOnly', type: 'boolean', fallback: 'false', description: 'The same screen with nothing to change: no drag, no link, a dock of zoom and close.' },
  { name: 'title', type: 'string', required: true, description: 'In the middle of the title bar across the top: the app’s own AppTitleBar, so the window is still dragged by it while the editor covers everything.' },
  { name: 'trafficLightGutter', type: 'boolean', fallback: 'false', description: 'In the app: keep the title bar’s left corner clear of the traffic lights.' },
]

const LABELS: WorkflowEditorLabels = { canvas: EDIT_LABELS, inspector: INSPECTOR_LABELS, picker: PICKER_LABELS, dock: DOCK_LABELS, back: 'Back to settings' }

interface Flow {
  nodes: WorkflowCanvasNode[]
  links: WorkflowCanvasLink[]
  positions: Record<string, { x: number; y: number }>
}

/** The problem the sample can have: an automatic link into start. Recomputed as the flow changes. */
function problemsOf(links: WorkflowCanvasLink[]): WorkflowProblemItem[] {
  return links
    .filter((link) => link.to === 'start' && link.kind === 'auto')
    .map((link) => ({ id: `auto-into-start-${link.from}`, message: START_PROBLEM, nodeId: link.from }))
}

/**
 * THE EDITOR, WIRED: this specimen keeps its own flow and history, the way the app keeps
 * its overlay. Nothing here is the app's code, and nothing is saved.
 */
function EditorSpecimen() {
  const initial: Flow = { nodes: EDIT_NODES, links: EDIT_LINKS, positions: {} }
  const [flow, setFlow] = useState<Flow>(initial)
  const [history, setHistory] = useState<{ past: Flow[]; future: Flow[] }>({ past: [], future: [] })
  const [saved, setSaved] = useState<Flow>(initial)
  const [selected, setSelected] = useState<WorkflowCanvasSelection | null>(null)
  // The history panel takes the inspector's place: opening one closes the other.
  const [historyOpen, setHistoryOpen] = useState(false)
  const [focus, setFocus] = useState<{ id: string; n: number } | null>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  // The picker only: the flow stays the same whichever repository it says.
  const [repository, setRepository] = useState('magic-slash')

  const problems = useMemo(() => problemsOf(flow.links), [flow.links])
  const nodes = useMemo(
    () => flow.nodes.map((node) => ({ ...node, problem: problems.some((p) => p.nodeId === node.id) })),
    [flow.nodes, problems],
  )
  const skills = SAMPLE_SKILLS.map((skill) => ({ ...skill, disabled: flow.nodes.some((node) => node.skill === skill.name) }))

  const edit = (next: Flow) => {
    setHistory((was) => ({ past: [...was.past, flow], future: [] }))
    setFlow(next)
  }
  const travel = (from: 'past' | 'future') => {
    const stack = history[from]
    if (stack.length === 0) return
    const to = from === 'past' ? 'future' : 'past'
    setHistory({ ...history, [from]: stack.slice(0, -1), [to]: [...history[to], flow] } as typeof history)
    setFlow(stack[stack.length - 1])
    setSelected(null)
  }
  const focusOn = (id: string) => {
    setSelected({ type: 'node', id })
    setFocus((was) => ({ id, n: (was?.n ?? 0) + 1 }))
  }
  const label = (id: string) => flow.nodes.find((n) => n.id === id)?.label ?? id

  const target: WorkflowInspectorTarget | null = (() => {
    if (!selected) return null
    if (selected.type === 'node') {
      const node = flow.nodes.find((n) => n.id === selected.id)
      return node ? { type: 'node', step: node } : null
    }
    const link = flow.links.find((l) => l.from === selected.from && l.to === selected.to)
    if (!link) return null
    const intoStart = link.to === 'start'
    const locked = isSampleDefaultLink(link.from, link.to)
    return {
      type: 'link',
      link: {
        ...link,
        fromLabel: label(link.from),
        toLabel: label(link.to),
        disabledKinds: intoStart ? ['auto'] : undefined,
        hint: intoStart ? 'Starting a ticket always opens a new agent, so this link can only be suggested.' : undefined,
        locked,
        outcomes: locked ? undefined : flow.nodes.find((n) => n.id === link.from)?.outcomes,
      },
    }
  })()

  const mapLinks = (from: string, to: string, change: (link: WorkflowCanvasLink) => WorkflowCanvasLink) =>
    flow.links.map((link) => (link.from === from && link.to === to ? change(link) : link))

  return (
    <div ref={stageRef} className="h-[640px] overflow-hidden rounded-xl border border-line">
      <WorkflowEditor
        title={`Editing the workflow of ${repository}`}
        repositories={{ value: repository, options: SAMPLE_REPOSITORIES, onChange: setRepository, label: 'Repository' }}
        labels={{ ...LABELS, dock: { ...DOCK_LABELS, problems: `${problems.length} problem${problems.length === 1 ? '' : 's'} to fix before saving` } }}
        nodes={nodes}
        links={flow.links}
        entry={SAMPLE_ENTRY}
        positions={flow.positions}
        history={{
          label: 'History',
          detail: 'Updated 12 min ago',
          open: historyOpen,
          onToggle: () => {
            if (!historyOpen) setSelected(null)
            setHistoryOpen(!historyOpen)
          },
          panel: { state: 'ready', items: SAMPLE_HISTORY, labels: HISTORY_LABELS },
        }}
        selected={selected}
        onSelect={(next) => {
          setSelected(next)
          if (next) setHistoryOpen(false)
        }}
        onMove={(id, position) => edit({ ...flow, positions: { ...flow.positions, [id]: position } })}
        onConnect={(from, to, outcome) => {
          edit({ ...flow, links: [...flow.links, outcome ? { from, to, kind: 'suggest', outcome } : { from, to, kind: 'suggest' }] })
          setSelected({ type: 'link', from, to })
        }}
        focusRequest={focus}
        target={target}
        skills={skills}
        onChangeMode={(id, mode) => edit({ ...flow, nodes: flow.nodes.map((n) => (n.id === id ? { ...n, mode } : n)) })}
        onRemove={(id) => {
          edit({ ...flow, nodes: flow.nodes.filter((n) => n.id !== id), links: flow.links.filter((l) => l.from !== id && l.to !== id) })
          setSelected(null)
        }}
        onChangeKind={(from, to, kind) => edit({ ...flow, links: mapLinks(from, to, (l) => ({ ...l, kind })) })}
        onChangeOutcomes={(from, to, outcomes) => edit({ ...flow, links: mapLinks(from, to, ({ outcome: _was, ...l }) => (outcomes[0] ? { ...l, outcome: outcomes[0] } : l)) })}
        onRemoveLink={(from, to) => {
          edit({ ...flow, links: flow.links.filter((l) => l.from !== from || l.to !== to) })
          setSelected(null)
        }}
        onChangeColor={(id, color) => edit({ ...flow, nodes: flow.nodes.map((n) => (n.id === id ? { ...n, color } : n)) })}
        onToggle={(id, enabled) => edit({ ...flow, nodes: flow.nodes.map((n) => (n.id === id ? { ...n, disabled: !enabled } : n)) })}
        onAdd={(skill, position) => {
          const id = `custom:${skill}`
          edit({
            ...flow,
            nodes: [...flow.nodes, { id, label: skill, skill, outcomes: [], mode: 'advisory', warning: 'No link leads here: this step will never run.' }],
            positions: { ...flow.positions, [id]: position },
          })
          setSelected({ type: 'node', id })
        }}
        canUndo={history.past.length > 0}
        canRedo={history.future.length > 0}
        onUndo={() => travel('past')}
        onRedo={() => travel('future')}
        problems={problems}
        onFocusProblem={focusOn}
        dirty={flow !== saved}
        saving={false}
        canSave={problems.length === 0}
        onSave={() => setSaved(flow)}
        onDiscard={() => edit(saved)}
        onClose={() => setSelected(null)}
        portalTo={stageRef.current}
      />
    </div>
  )
}

export function WorkflowEditorEntry({ theme, onOpen }: { theme: DesktopTheme; onOpen?: (id: string) => void }) {
  return (
    <article className="flex flex-col divide-y divide-hairline">
      <EntryHeader title="WorkflowEditor" uses={usesOf('workfloweditor')} onOpen={onOpen}>
        A repository’s workflow, edited full screen: the canvas edge to edge, and everything else floating on it.
      </EntryHeader>

      <EntrySection
        title="Editing a flow"
        note="Drag a card to move it. Draw a link out of a card’s exit (an outcome’s row, or When done) onto another card. The dock’s + adds a step in the middle of the view, linked to nothing. Press a card or a link for the inspector; the red badge in the dock lists the problem the sample has on purpose (Plan to Start is automatic)."
      >
        <Stage theme={theme}>
          <Specimen label="the editor the Workflow tab’s Edit button opens, here in a box rather than the whole window">
            <EditorSpecimen />
          </Specimen>
        </Stage>
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          The editor owns the picker’s anchor and nothing else. The flow, the selection and
          the history are the caller’s, and so is the keyboard: which layer answers Escape
          or ⌘Z is a fact about the app, not about the shape of an editor.
        </p>
      </EntrySection>

      <EntrySection title="Props">
        <PropsTable rows={PROPS} />
        <Snippet>{`import { WorkflowEditor } from '@ds/desktop'

// In the app: a fixed layer over the whole window.
<div className="fixed inset-0 z-[55]">
  <WorkflowEditor
    title={title}
    labels={labels}
    nodes={data.nodes}
    links={data.links}
    entry={data.entry}
    positions={draft.positions}
    selected={selected}
    onSelect={setSelected}
    onMove={move}
    onConnect={connect}
    target={target}
    skills={skills}
    onAdd={add}
    /* inspector, history, problems, save… */
    trafficLightGutter
  />
</div>`}</Snippet>
      </EntrySection>
    </article>
  )
}
