import type { WorkflowCanvasLink, WorkflowCanvasNode } from '@ds/desktop'
import type { Workflow } from '../../../workflow/model'

/**
 * The engine's workflow, as the design system's canvas wants it.
 *
 * Two models on purpose: `workflow/model.ts` is what the skills read and the main
 * process validates, and it has no business carrying a display name; the canvas's
 * types (`@ds/desktop`) cannot import app code. This is the one place the two meet,
 * pure so the root suite can hold it to the default flow.
 *
 * `import type` only: the barrel it names pulls React and xyflow, which a type
 * import erases and a value import would drag into a test that cannot load them.
 */

export interface WorkflowCanvasData {
  nodes: WorkflowCanvasNode[]
  links: WorkflowCanvasLink[]
  entry: string[]
}

/** Words that are initials, drawn in capitals: `magic-pr` is "PR", not "Pr". */
const INITIALS = new Set(['pr', 'ci', 'qa', 'ui'])

/**
 * What a node is called on the canvas: the skill's name without the `magic-` prefix,
 * word by word in title case (`magic-plan-change` → "Plan Change", `magic-pr` → "PR").
 *
 * Not translated, like the slash commands it names: "/magic:commit" is "Commit" in
 * both languages, and a custom skill's folder name is its author's word, not ours.
 */
export function skillDisplayName(skill: string): string {
  return skill
    .replace(/^magic-/, '')
    .split(/[-_]+/)
    .filter(Boolean)
    .map((word) => (INITIALS.has(word) ? word.toUpperCase() : word[0].toUpperCase() + word.slice(1)))
    .join(' ')
}

/**
 * The engine's links and entry ARE the canvas's (same shape), so they go through as
 * they are: a link's `outcome` is both the port it leaves from and the label it wears.
 * Only the nodes are mapped, to gain the display name the engine does not carry.
 */
export function workflowCanvasData(flow: Workflow): WorkflowCanvasData {
  return {
    nodes: flow.nodes.map((node) => ({
      id: node.id,
      label: skillDisplayName(node.skill),
      skill: node.skill,
      outcomes: node.outcomes,
    })),
    links: flow.links,
    entry: flow.entry,
  }
}
