import type { Workflow, WorkflowLink, WorkflowNode } from './model'
import { SIDE_SKILLS, SKILLS } from './skills'

/**
 * The flow every repository follows until it has one of its own: today's cycle,
 * written down. The suggestions it yields are the ones the skills printed before
 * workflows existed, so a repository without a custom flow sees no change.
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
  review: { mode: 'advisory', required: false, outcomes: ['approved', 'changes_requested', 'commented'], provides: ['review'] },
  resolve: { mode: 'blocking', required: false, outcomes: ['resolved'], provides: ['fixes'] },
  done: { mode: 'advisory', required: true, outcomes: ['done'], provides: [] },
}

/**
 * Today's hand-offs. `ci_green`, `commented` and `done` lead nowhere on purpose: the
 * skills keep their closing text there. pr → resolve is the one `auto` link: review
 * comments already waiting on a PR are addressed without asking.
 */
export const DEFAULT_LINKS: WorkflowLink[] = [
  { from: 'plan', to: 'start', kind: 'suggest' },
  { from: 'start', to: 'commit', kind: 'suggest' },
  { from: 'commit', to: 'pr', kind: 'suggest' },
  { from: 'pr', to: 'resolve', kind: 'auto', outcome: 'review_comments' },
  { from: 'pr', to: 'review', kind: 'suggest', outcome: 'pr_created' },
  { from: 'review', to: 'resolve', kind: 'suggest', outcome: 'changes_requested' },
  { from: 'review', to: 'done', kind: 'suggest', outcome: 'approved' },
  { from: 'resolve', to: 'review', kind: 'suggest' },
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
  nodes: SKILLS.filter((skill) => !SIDE_SKILLS.includes(skill)).flatMap((skill) => {
    const id = nodeIdForSkill(skill)
    const traits = TRAITS[id]
    return traits ? [{ id, skill, ...traits }] : []
  }),
  links: DEFAULT_LINKS,
}
