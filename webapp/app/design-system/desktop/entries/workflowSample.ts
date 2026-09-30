import type {
  WorkflowCanvasLabels, WorkflowCanvasLink, WorkflowCanvasNode, WorkflowDockLabels, WorkflowInspectorLabels, WorkflowProblemItem,
  WorkflowProblemsLabels, WorkflowSkillOption, WorkflowSkillPickerLabels,
} from '@ds/desktop'

/**
 * The default workflow, as the four canvas entries draw it.
 *
 * A COPY, and it has to be: the flow lives in `desktop/src/workflow/defaultFlow.ts`,
 * which this app cannot import (the two builds share only `design-system/`). The
 * shape is what matters here, and it is the real one: the same six steps, the same
 * outcomes, the same five links in the same order, including the one `auto` link. If
 * the default flow changes, this is a specimen that has gone stale, not a bug.
 *
 * The default flow has no loop, so the loop specimens draw a custom flow instead
 * (LOOP_NODES / LOOP_LINKS): the same cycle with a review step that loops with resolve,
 * the shape a team that reviews every PR might give its own repository.
 */

const node = (id: string, label: string, outcomes: string[]): WorkflowCanvasNode => ({
  id, label, skill: `magic-${id}`, outcomes,
})

export const SAMPLE_NODES: WorkflowCanvasNode[] = [
  node('plan', 'Plan', ['planned']),
  node('start', 'Start', ['implemented']),
  node('commit', 'Commit', ['committed']),
  node('pr', 'PR', ['pr_created', 'review_comments', 'ci_green']),
  node('resolve', 'Resolve', ['resolved']),
  node('done', 'Done', ['done']),
]

export const SAMPLE_LINKS: WorkflowCanvasLink[] = [
  { from: 'plan', to: 'start', kind: 'suggest' },
  { from: 'start', to: 'commit', kind: 'suggest' },
  { from: 'commit', to: 'pr', kind: 'suggest' },
  { from: 'pr', to: 'resolve', kind: 'auto', outcome: 'review_comments' },
  { from: 'resolve', to: 'done', kind: 'suggest' },
]

/** A custom flow with a review ⇄ resolve loop, for the specimens the default flow cannot give. */
const LOOP_NODES: WorkflowCanvasNode[] = [
  ...SAMPLE_NODES.slice(0, 4),
  node('review', 'Review', ['approved', 'changes_requested', 'commented']),
  ...SAMPLE_NODES.slice(4),
]

const LOOP_LINKS: WorkflowCanvasLink[] = [
  ...SAMPLE_LINKS.slice(0, 4),
  { from: 'pr', to: 'review', kind: 'suggest', outcome: 'pr_created' },
  { from: 'review', to: 'resolve', kind: 'suggest', outcome: 'changes_requested' },
  { from: 'review', to: 'done', kind: 'suggest', outcome: 'approved' },
  { from: 'resolve', to: 'review', kind: 'suggest' },
]

export const SAMPLE_ENTRY = ['plan', 'start']

/** The desktop's English strings, verbatim, so the specimens read as the app does. */
export const SAMPLE_LABELS: WorkflowCanvasLabels = {
  canvas: 'Workflow of magic-slash',
  minimap: 'Minimap',
  auto: 'Automatic chaining',
  suggest: 'Suggested',
  anyExit: 'When done',
}

type Subset = { nodes: WorkflowCanvasNode[]; links: WorkflowCanvasLink[] }

function subset(nodes: WorkflowCanvasNode[], links: WorkflowCanvasLink[], ids: string[]): Subset {
  return {
    nodes: nodes.filter((n) => ids.includes(n.id)),
    links: links.filter((l) => ids.includes(l.from) && ids.includes(l.to)),
  }
}

/** A subset of the sample, by id: the nodes named, and only the links between them. */
export function sampleSubset(ids: string[]): Subset {
  return subset(SAMPLE_NODES, SAMPLE_LINKS, ids)
}

/** The same, out of the custom loop flow. */
export function loopSubset(ids: string[]): Subset {
  return subset(LOOP_NODES, LOOP_LINKS, ids)
}

/**
 * A REPOSITORY'S OWN FLOW, as the workflow editor draws it: the default six steps,
 * built in, with one custom step (`lint`, blocking) drawn between start and commit and
 * chained from start on its own. The default links are all still there: they are locked.
 * `lint` carries a warning, `plan` a problem and `done` is turned off, so the specimens
 * show all three.
 *
 * The problem is a real rule of the model: a link into start cannot be automatic, since
 * starting a ticket always opens a new agent. The sample breaks it on purpose.
 */
export const EDIT_LABELS: WorkflowCanvasLabels = {
  ...SAMPLE_LABELS,
  edit: 'Edit',
  disable: 'Turn off this step',
  enable: 'Turn on this step',
  alwaysOn: 'Start cannot be turned off: every other step runs from it',
  off: 'Turned off',
  blocking: 'Stops on failure',
  advisory: 'Goes on on failure',
}

export const LINT_DESCRIPTION = 'Runs the linters on the files the ticket changed, and fixes what they can fix on their own.'
export const LINT_WARNING = 'lint is not installed on this machine, so this step is skipped here.'
export const START_PROBLEM = 'A link into Start cannot be automatic: starting a ticket always opens a new agent.'

const locked = (n: WorkflowCanvasNode): WorkflowCanvasNode => ({ ...n, locked: true })

export const EDIT_NODES: WorkflowCanvasNode[] = [
  { ...locked(SAMPLE_NODES[0]), problem: true },
  { ...locked(SAMPLE_NODES[1]), alwaysOn: true },
  { id: 'custom:lint', label: 'Lint', skill: 'lint', outcomes: [], mode: 'blocking', color: '#6366F1', warning: LINT_WARNING },
  ...SAMPLE_NODES.slice(2).map(locked).map((n) => (n.id === 'done' ? { ...n, disabled: true } : n)),
]

/** The default links, plan → start turned auto (the problem), and the two drawn around lint. */
export const EDIT_LINKS: WorkflowCanvasLink[] = [
  { ...SAMPLE_LINKS[0], kind: 'auto' },
  ...SAMPLE_LINKS.slice(1),
  { from: 'start', to: 'custom:lint', kind: 'auto' },
  { from: 'custom:lint', to: 'commit', kind: 'suggest' },
]

/** Whether a link is one of the default flow's: locked, only its kind changes. */
export const isSampleDefaultLink = (from: string, to: string) =>
  SAMPLE_LINKS.some((link) => link.from === from && link.to === to)

/** What a repository could add, from the three places a skill comes from. `lint` is on the line already. */
export const SAMPLE_SKILLS: WorkflowSkillOption[] = [
  { name: 'lint', source: 'custom', disabled: true },
  { name: 'changelog', source: 'custom' },
  { name: 'security-scan', source: 'repo' },
  { name: 'design-check', source: 'repo' },
  { name: 'docs:sync', source: 'plugin' },
]

const SOURCES = { custom: 'Your skills', repo: 'This repository', plugin: 'Plugins' }

export const PICKER_LABELS: WorkflowSkillPickerLabels = {
  title: 'Add a step',
  empty: 'No skill to add. Create one in the Skills page first.',
  inWorkflow: 'In the workflow',
  sources: SOURCES,
}

export const INSPECTOR_LABELS: WorkflowInspectorLabels = {
  title: 'Selection',
  empty: 'Select a step or a link to edit it.',
  mode: 'If this step fails',
  color: 'Colour',
  kind: 'Chaining',
  outcome: 'Taken on',
  blocking: 'Stop the chain',
  advisory: 'Carry on anyway',
  auto: 'Automatic',
  suggest: 'Suggested',
  remove: 'Remove step',
  removeRow: 'Remove from the workflow',
  removeHint: 'Its links go with it.',
  builtIn: 'Built-in step: it cannot be removed or replaced, only turned off.',
  disable: 'Turn off this step',
  enable: 'Turn on this step',
  alwaysOn: 'Start cannot be turned off: every other step runs from it',
  offHint: 'Turned off: the skills skip it, and the steps before it lead straight to the ones after it.',
  removeLink: 'Remove the link',
  anyOutcome: 'Whatever the outcome',
  defaultLink: 'Default link: it cannot be removed, only its chaining changes.',
  close: 'Close',
}

export const DOCK_LABELS: WorkflowDockLabels = {
  dock: 'Workflow tools',
  add: 'Add a step',
  undo: 'Undo (⌘Z)',
  redo: 'Redo (⇧⌘Z)',
  zoomIn: 'Zoom in',
  zoomOut: 'Zoom out',
  fit: 'Recenter on the workflow',
  problems: '1 problem to fix before saving',
  discard: 'Discard changes',
  save: 'Save',
  close: 'Close the editor (Esc)',
}

export const SAMPLE_PROBLEMS: WorkflowProblemItem[] = [
  { id: 'auto-into-start', message: START_PROBLEM, nodeId: 'plan' },
]

export const PROBLEMS_LABELS: WorkflowProblemsLabels = {
  title: '1 problem to fix before saving',
  show: 'Show on the canvas',
}
