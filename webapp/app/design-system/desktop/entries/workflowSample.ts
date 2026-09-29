import type { WorkflowCanvasLabels, WorkflowCanvasLink, WorkflowCanvasNode } from '@ds/desktop'

/**
 * The default workflow, as the four canvas entries draw it.
 *
 * A COPY, and it has to be: the flow lives in `desktop/src/workflow/defaultFlow.ts`,
 * which this app cannot import (the two builds share only `design-system/`). The
 * shape is what matters here, and it is the real one: the same seven steps, the same
 * outcomes, the same eight links in the same order, including the one `auto` link and
 * the review ⇄ resolve loop. If the default flow changes, this is a specimen that has
 * gone stale, not a bug.
 */

const node = (id: string, label: string, outcomes: string[]): WorkflowCanvasNode => ({
  id, label, skill: `magic-${id}`, outcomes,
})

export const SAMPLE_NODES: WorkflowCanvasNode[] = [
  node('plan', 'Plan', ['planned']),
  node('start', 'Start', ['implemented']),
  node('commit', 'Commit', ['committed']),
  node('pr', 'PR', ['pr_created', 'review_comments', 'ci_green']),
  node('review', 'Review', ['approved', 'changes_requested', 'commented']),
  node('resolve', 'Resolve', ['resolved']),
  node('done', 'Done', ['done']),
]

export const SAMPLE_LINKS: WorkflowCanvasLink[] = [
  { from: 'plan', to: 'start', kind: 'suggest' },
  { from: 'start', to: 'commit', kind: 'suggest' },
  { from: 'commit', to: 'pr', kind: 'suggest' },
  { from: 'pr', to: 'resolve', kind: 'auto', outcome: 'review_comments' },
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
}

/** A subset of the sample, by id: the nodes named, and only the links between them. */
export function sampleSubset(ids: string[]): { nodes: WorkflowCanvasNode[]; links: WorkflowCanvasLink[] } {
  return {
    nodes: SAMPLE_NODES.filter((n) => ids.includes(n.id)),
    links: SAMPLE_LINKS.filter((l) => ids.includes(l.from) && ids.includes(l.to)),
  }
}
