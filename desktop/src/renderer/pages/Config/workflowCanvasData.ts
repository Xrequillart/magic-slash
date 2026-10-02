import type { WorkflowCanvasLink, WorkflowCanvasNode, WorkflowSkillOption } from '@ds/desktop'
import { workflowStepColor } from '@ds/desktop/palette'
import { DEFAULT_WORKFLOW } from '../../../workflow/defaultFlow'
import type { Workflow } from '../../../workflow/model'
import {
  PLAN_NODE_ID, START_NODE_ID, canDisable, customNodeId, isBuiltInNodeId, isCustomNodeId, noteNodeId, type WorkflowOverlay, type WorkflowProblem,
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
  /** The steps turned off (the overlay's `disabled`): drawn greyed. */
  disabled?: readonly string[]
  /** A custom step's ground, by node id (`stepColors`). */
  colors?: Readonly<Record<string, string>>
  /** What an end note with no text yet says on its card: "Empty note". */
  emptyNote?: string
  /** What an action with no channel nor instruction yet says on its card: "Slack message to write". */
  emptyAction?: string
}

/** Every custom step's ground, by node id: its own, or the one its place hands it (`workflowStepColor`). */
export function stepColors(overlay: WorkflowOverlay): Record<string, string> {
  const notes = overlay.notes ?? []
  // No action here: it has no colour, its card wears its service's mark.
  return Object.fromEntries([
    ...overlay.steps.map((step, i) => [customNodeId(step.skill), workflowStepColor(step.color, i)]),
    // A note's own colour, else the next one along after the steps': two notes added in a row differ.
    ...notes.map((note, i) => [noteNodeId(note.id), workflowStepColor(note.color, overlay.steps.length + i)]),
  ])
}

/**
 * The engine's links and entry ARE the canvas's (same shape), so they go through as
 * they are: a link's `outcome` is both the port it leaves from and the label it wears.
 * Only the nodes are mapped, to gain the display name the engine does not carry, and
 * what the editor marks on them: a built-in step is `locked` (the overlay cannot
 * remove it), a custom one wears its `mode`, the only thing about it the admin chose,
 * and every one its switch: `disabled` when it is off, `alwaysOn` on start.
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
      const color = isCustomNodeId(node.id) ? marks.colors?.[node.id] : undefined
      if (color) drawn.color = color
      if (!canDisable(node.id)) drawn.alwaysOn = true
      if (marks.disabled?.includes(node.id)) drawn.disabled = true
      if (marks.problems?.includes(node.id)) drawn.problem = true
      const warning = marks.warnings?.[node.id]
      if (warning) drawn.warning = warning
      return drawn
    }).concat((flow.notes ?? []).map((note) => {
      // An end note is a card too, with no port out: `note` is what tells the canvas so.
      const drawn: WorkflowCanvasNode = { id: note.id, label: note.text || (marks.emptyNote ?? ''), skill: '', outcomes: [], note: note.text }
      const color = marks.colors?.[note.id]
      if (color) drawn.color = color
      if (marks.problems?.includes(note.id)) drawn.problem = true
      const warning = marks.warnings?.[note.id]
      if (warning) drawn.warning = warning
      return drawn
    })).concat((flow.actions ?? []).map((action) => {
      // An action is a card like a note, no port out: `action` is what tells the canvas so.
      const { type, channel, prompt } = action
      const drawn: WorkflowCanvasNode = { id: action.id, label: marks.emptyAction ?? '', skill: '', outcomes: [], action: { type, channel, prompt } }
      if (marks.problems?.includes(action.id)) drawn.problem = true
      const warning = marks.warnings?.[action.id]
      if (warning) drawn.warning = warning
      return drawn
    })),
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
 *  - `on-review-comments`: a link into it is taken only on `review_comments`, so it runs
 *    only when the PR has comments;
 *  - `skipped-from-start`: it is reached from plan, never from start, so a ticket started
 *    straight from /magic:start never passes through it.
 *
 * A built-in step gets none: its place is the product's, not the repository's. A step
 * nothing reaches gets none either: its card already says it never runs.
 */
export type WorkflowStepHint = 'on-review-comments' | 'skipped-from-start'

/** The node ids reachable from `from`, itself included. */
function reachableFrom(flow: Workflow, from: string): Set<string> {
  const seen = new Set([from])
  const queue = [from]
  while (queue.length > 0) {
    const id = queue.shift()!
    for (const link of flow.links) {
      if (link.from === id && !seen.has(link.to)) {
        seen.add(link.to)
        queue.push(link.to)
      }
    }
  }
  return seen
}

export function stepHints(flow: Workflow, nodeId: string): WorkflowStepHint[] {
  if (!isCustomNodeId(nodeId)) return []
  const hints: WorkflowStepHint[] = []
  if (flow.links.some((link) => link.to === nodeId && link.outcome === 'review_comments')) hints.push('on-review-comments')
  if (reachableFrom(flow, PLAN_NODE_ID).has(nodeId) && !reachableFrom(flow, START_NODE_ID).has(nodeId)) hints.push('skipped-from-start')
  return hints
}

/**
 * Whether a step's mode changes anything: only a link leaving it `auto` is held back
 * (blocking) or taken anyway (advisory) when it fails. With nothing but suggestions out
 * of it, the choice has no effect, and the inspector says so.
 */
export function modeHasEffect(flow: Workflow, nodeId: string): boolean {
  return flow.links.some((link) => link.from === nodeId && link.kind === 'auto')
}

/** Where a listing entry comes from, in the picker's terms. Built-in skills are the line's own. */
const PICKABLE: readonly WorkflowSkillOption['source'][] = ['custom', 'repo', 'plugin']

/**
 * The skills a custom step may run, for the picker and the inspector's `Select`.
 *
 * The built-in steps first, by their display name: one taken off the canvas is put back
 * from here (start never leaves it, so it is not offered). Then, out of the listing Claude
 * Code injects (`skills:listingEntries`), minus:
 *  - the built-in skills, offered above;
 *  - the OTHER repositories' skills, which do not exist in this one;
 *  - `hidden` entries (`disable-model-invocation`, an `off` override): the protocol
 *    chains a step by having Claude invoke it, which is exactly what they forbid.
 * One option per name: a skill both in `~/.claude/skills` and in the repository is the
 * repository's, since that is the copy every member has.
 *
 * `inWorkflow` are the skills already in the flow: listed, greyed (`disabled`).
 */
export function skillOptions(
  entries: readonly ListingEntry[],
  repoName: string,
  inWorkflow: readonly string[],
): WorkflowSkillOption[] {
  const builtIn: WorkflowSkillOption[] = DEFAULT_WORKFLOW.nodes
    .filter((node) => node.id !== START_NODE_ID)
    .map((node) => ({ name: node.skill, source: 'builtin', label: skillDisplayName(node.skill), disabled: inWorkflow.includes(node.skill) }))
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
  return [...builtIn, ...byName.values()]
}

/**
 * What a custom step's skill says it does, its SKILL.md's `description`, for the
 * inspector. The copy the step runs is the one `skillOptions` would pick: this
 * repository's first, then `~/.claude`'s, then a plugin's. A hidden skill still has
 * one. Undefined when no copy here has a description.
 */
export function skillDescription(entries: readonly ListingEntry[], repoName: string, skill: string): string | undefined {
  const copies = entries.filter((entry) => entry.name === skill && (entry.source !== 'repo' || entry.origin === repoName))
  const ranked = (['repo', 'custom', 'plugin'] as const).flatMap((source) => copies.filter((entry) => entry.source === source))
  return ranked.find((entry) => entry.description)?.description
}

/**
 * What a custom step's skill says it can end on, its SKILL.md's `outcomes:`, from the
 * copy `skillDescription` reads. Undefined when that copy declares none.
 */
export function skillOutcomes(entries: readonly ListingEntry[], repoName: string, skill: string): string[] | undefined {
  const copies = entries.filter((entry) => entry.name === skill && (entry.source !== 'repo' || entry.origin === repoName))
  const ranked = (['repo', 'custom', 'plugin'] as const).flatMap((source) => copies.filter((entry) => entry.source === source))
  return ranked.find((entry) => entry.outcomes && entry.outcomes.length > 0)?.outcomes
}

/**
 * The custom steps' skills that live in a file of ours (`~/.claude` or the repository's
 * `.claude`, as a skill folder or a command), i.e. the ones a teammate may be missing.
 * A plugin skill (`plugin:x`) comes with its plugin, so it is never one of them.
 */
export function folderSkillsOf(overlay: WorkflowOverlay): string[] {
  return overlay.steps.map((step) => step.skill).filter((skill) => !skill.includes(':'))
}
