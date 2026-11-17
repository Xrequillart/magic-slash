import type { Workflow, WorkflowLink, WorkflowNode } from './model'
import { HIDDEN_SKILLS, SIDE_SKILLS, SKILLS } from './skills'

/**
 * The flow every repository follows until it has one of its own: today's cycle,
 * written down as a line: plan, start, commit, pr, auto-review, resolve, done.
 * /magic:review, the review of a colleague's PR, is not on it (see SIDE_SKILLS).
 *
 * The nodes are DERIVED from the shipped skills list rather than spelled out a ninth
 * time: every skill of the cycle, minus the side doors (SIDE_SKILLS). What that list
 * cannot know — what each skill ends on, what it hands over, whether its failure
 * stops a chain — is the table below, keyed by node id.
 */

type NodeTraits = Omit<WorkflowNode, 'id' | 'skill'>

const TRAITS: Record<string, NodeTraits> = {
  plan: { mode: 'advisory', required: false, outcomes: ['planned'], provides: ['spec', 'tickets'] },
  start: { mode: 'blocking', required: true, outcomes: ['implemented'], provides: ['worktree', 'branch'] },
  commit: { mode: 'blocking', required: true, outcomes: ['committed'], provides: ['commits'] },
  pr: { mode: 'blocking', required: true, outcomes: ['pr_created', 'review_comments', 'ci_green'], provides: ['pr'] },
  'auto-review': { mode: 'advisory', required: false, outcomes: ['clean', 'findings'], provides: ['review'] },
  resolve: { mode: 'blocking', required: false, outcomes: ['resolved'], provides: ['fixes'] },
  done: { mode: 'advisory', required: true, outcomes: ['done'], provides: [] },
}

/**
 * Today's hand-offs. Once the PR exists (`pr_created`, or `ci_green` when /magic:pr
 * watched the CI), /magic:auto-review reviews it on its own and posts what it found on
 * GitHub: its `findings` are then addressed by /magic:resolve without asking, like the
 * review comments /magic:pr already found waiting (`review_comments`, which goes
 * straight to resolve). A `clean` review, or a resolve, suggests /magic:done, taken when
 * the PR is merged. `done` leads nowhere: the skill keeps its closing text.
 *
 * pr → auto-review is ONE link of the product on two outcomes, so it is written twice:
 * the overlay keys a default link by its two ends (`pr>auto-review`), so taking it off
 * or changing its kind applies to both lines (overlay.ts, removeLink / setLinkKind).
 */
export const DEFAULT_LINKS: WorkflowLink[] = [
  { from: 'plan', to: 'start', kind: 'suggest' },
  { from: 'start', to: 'commit', kind: 'suggest' },
  { from: 'commit', to: 'pr', kind: 'suggest' },
  { from: 'pr', to: 'auto-review', kind: 'auto', outcome: 'pr_created' },
  { from: 'pr', to: 'auto-review', kind: 'auto', outcome: 'ci_green' },
  { from: 'pr', to: 'resolve', kind: 'auto', outcome: 'review_comments' },
  { from: 'auto-review', to: 'resolve', kind: 'auto', outcome: 'findings' },
  { from: 'auto-review', to: 'done', kind: 'suggest', outcome: 'clean' },
  { from: 'resolve', to: 'done', kind: 'suggest' },
]

/** `magic-commit` → `commit`. */
export function nodeIdForSkill(skill: string): string {
  return skill.replace(/^magic-/, '')
}

export const DEFAULT_WORKFLOW: Workflow = {
  id: 'default',
  entry: ['plan', 'start'],
  // A cycle skill missing from TRAITS is left out rather than invented: the test
  // suite fails on it, the running app does not.
  nodes: SKILLS.filter((skill) => !SIDE_SKILLS.includes(skill) && !HIDDEN_SKILLS.includes(skill)).flatMap((skill) => {
    const id = nodeIdForSkill(skill)
    const traits = TRAITS[id]
    return traits ? [{ id, skill, ...traits }] : []
  }),
  links: DEFAULT_LINKS,
}
