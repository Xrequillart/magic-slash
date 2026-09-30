import type { WorkflowCanvasLink, WorkflowCanvasNode, WorkflowSkillOption } from '@ds/desktop'
import type { Workflow } from '../../../workflow/model'
import {
  PLAN_NODE_ID, START_NODE_ID, isBuiltInNodeId, isCustomNodeId, type WorkflowOverlay, type WorkflowProblem,
} from '../../../workflow/overlay'
import type { ListingEntry } from '../../hooks/useSkills'

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
 *
 * Also the pure half of the Workflow tab's EDITOR (marks on the cards, the inspector's
 * hints, the skills a step may run, "is there anything to save"): everything the tab
 * decides that does not need React, so the root suite can hold it too.
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
 * What the editor draws ON the cards, beyond the flow itself. Both keyed by node id,
 * both optional: the read-only tab of before passes neither.
 */
export interface WorkflowCanvasMarks {
  /** The steps a problem names (`problemNodeIds`): drawn with a red border. */
  problems?: readonly string[]
  /** A warning per step, already translated: a badge whose tooltip is the text. */
  warnings?: Readonly<Record<string, string>>
}

/**
 * The engine's links and entry ARE the canvas's (same shape), so they go through as
 * they are: a link's `outcome` is both the port it leaves from and the label it wears.
 * Only the nodes are mapped, to gain the display name the engine does not carry, and
 * what the editor marks on them: a built-in step is `locked` (the overlay cannot
 * touch it), a custom one wears its `mode`, the only thing about it the admin chose.
 */
export function workflowCanvasData(flow: Workflow, marks: WorkflowCanvasMarks = {}): WorkflowCanvasData {
  return {
    nodes: flow.nodes.map((node) => {
      const drawn: WorkflowCanvasNode = {
        id: node.id,
        label: skillDisplayName(node.skill),
        skill: node.skill,
        outcomes: node.outcomes,
      }
      if (isBuiltInNodeId(node.id)) drawn.locked = true
      if (isCustomNodeId(node.id)) drawn.mode = node.mode
      if (marks.problems?.includes(node.id)) drawn.problem = true
      const warning = marks.warnings?.[node.id]
      if (warning) drawn.warning = warning
      return drawn
    }),
    links: flow.links,
    entry: flow.entry,
  }
}

/** The steps the problems name, for `marks.problems`. A problem about the whole flow names none. */
export function problemNodeIds(found: readonly WorkflowProblem[]): string[] {
  return found.flatMap((problem) => ('nodeId' in problem ? [problem.nodeId] : []))
}

/**
 * Facts about where a custom step sits that change WHEN it runs, for the inspector to
 * say in words (the caller translates each code):
 *
 *  - `on-review-comments`: the link into it is taken only on `review_comments`, the
 *    first hop of a split `pr → resolve`, so it runs only when the PR has comments;
 *  - `skipped-from-start`: it sits between plan and start, outside the entry, so a
 *    ticket started straight from /magic:start never passes through it.
 *
 * A built-in step gets none: its place is the product's, not the repository's.
 */
export type WorkflowStepHint = 'on-review-comments' | 'skipped-from-start'

export function stepHints(flow: Workflow, nodeId: string): WorkflowStepHint[] {
  if (!isCustomNodeId(nodeId)) return []
  const hints: WorkflowStepHint[] = []
  if (flow.links.some((link) => link.to === nodeId && link.outcome === 'review_comments')) hints.push('on-review-comments')
  const ids = flow.nodes.map((node) => node.id)
  const at = ids.indexOf(nodeId)
  const plan = ids.indexOf(PLAN_NODE_ID)
  const start = ids.indexOf(START_NODE_ID)
  if (plan !== -1 && start !== -1 && plan < at && at < start) hints.push('skipped-from-start')
  return hints
}

/** Where a listing entry comes from, in the picker's terms. Built-in skills are the line's own. */
const PICKABLE: readonly WorkflowSkillOption['source'][] = ['custom', 'repo', 'plugin']

/**
 * The skills a custom step may run, for the picker and the inspector's `Select`.
 *
 * Out of the listing Claude Code injects (`skills:listingEntries`), minus:
 *  - the built-in skills, which are already on the line and cannot be placed twice;
 *  - the OTHER repositories' skills, which do not exist in this one;
 *  - `hidden` entries (`disable-model-invocation`, an `off` override): the protocol
 *    chains a step by having Claude invoke it, which is exactly what they forbid.
 * One option per name: a skill both in `~/.claude/skills` and in the repository is the
 * repository's, since that is the copy every member has.
 *
 * `inWorkflow` are the skills already on the line: listed, greyed (`disabled`).
 */
export function skillOptions(
  entries: readonly ListingEntry[],
  repoName: string,
  inWorkflow: readonly string[],
): WorkflowSkillOption[] {
  const byName = new Map<string, WorkflowSkillOption>()
  for (const source of PICKABLE) {
    for (const entry of entries) {
      if (entry.source !== source || entry.mode === 'hidden') continue
      if (source === 'repo' && entry.origin !== repoName) continue
      const known = byName.get(entry.name)
      if (known && !(source === 'repo' && known.source === 'custom')) continue
      byName.set(entry.name, { name: entry.name, source, disabled: inWorkflow.includes(entry.name) })
    }
  }
  // Grouped by source by the picker itself; within a source, the listing's order.
  return [...byName.values()]
}

/**
 * The custom steps' skills that live in a file of ours (`~/.claude` or the repository's
 * `.claude`, as a skill folder or a command), i.e. the ones a teammate may be missing.
 * A plugin skill (`plugin:x`) comes with its plugin, so it is never one of them.
 */
export function folderSkillsOf(overlay: WorkflowOverlay): string[] {
  return overlay.steps.map((step) => step.skill).filter((skill) => !skill.includes(':'))
}
