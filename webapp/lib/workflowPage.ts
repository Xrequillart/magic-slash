import type { DesktopFact, DesktopIcon } from './desktopPage'
import type { MessageKey } from './i18n'
import type { WorkflowStepId } from './workflow'

/**
 * WHAT `/workflow` SAYS AROUND THE FIVE STEPS, pinned from the root suite.
 *
 * `lib/workflow.ts` owns the steps themselves: their order, their tones, the commands each
 * one runs and the title and sentence the homepage band and this page both print. This
 * module is everything the PAGE adds on top of that list to sell it: the hero's copy, the
 * three claims under each step, and the two bands that follow the loop, on what a whole
 * day with it is like and on what stays in the reader's hands.
 *
 * SAME SHAPE AS `lib/desktopPage.ts` AND FOR THE SAME REASONS. `tsc` never runs on
 * `webapp/` in CI, `t()` has no per-key fallback, so a `MessageKey` typed into a component
 * guarantees nothing and a renamed entry ships as a heading with a hole under it. Named
 * here, every key goes through `workflowPage.test.ts`, which looks each one up in both
 * catalogues for real and refuses an em dash in any of them.
 *
 * ZERO RUNTIME IMPORTS: type imports only. The root suite runs on the root `node_modules`
 * and a `react` or `lucide-react` import at any depth from here would fail to RESOLVE
 * rather than fail the test. The icons below are therefore lucide NAMES, and they are
 * `/desktop`'s vocabulary (`DesktopIcon`) rather than a third one: the two bands under the
 * loop are drawn by `desktop/FactList.tsx`, which resolves through `DESKTOP_ICONS`, and one
 * page's claims sharing another page's glyph names is cheaper than a second map that has
 * to agree with the first. `workflowPage.test.ts` reads `desktop/icons.ts` as text and
 * checks every name lands there.
 *
 * NO COMMAND NAME IN ANY KEY, the rule every marketing module on this site keeps: the
 * `/magic:…` strings are printed by the page from `lib/commands.ts`, whose template-literal
 * type makes a typo a compile error. In a catalogue they would be strings a translator can
 * edit and nothing can check.
 */

/** The hero, and the line the page closes on. */
export const WORKFLOW_PAGE_CHROME = {
  /** The pill above the headline. */
  eyebrow: 'site.workflowPage.eyebrow',
  /** The page's `h1`. */
  title: 'site.workflowPage.title',
  /** The paragraph under it. */
  subtitle: 'site.workflowPage.subtitle',
  /** The secondary button, which scrolls to the first step. */
  stepsCta: 'site.workflowPage.stepsCta',
} as const satisfies Record<string, MessageKey>

/**
 * Where the hero's secondary button lands: the first step's band. The ids are
 * `step-{WorkflowStepId}` and `StepBand.tsx` derives them the same way, so the anchor
 * and the band cannot come to disagree.
 */
export const stepAnchor = (id: WorkflowStepId) => `step-${id}`

/** One claim under a step: a glyph and a short bold line. */
export type WorkflowClaim = { icon: DesktopIcon; label: MessageKey }

/**
 * THREE CLAIMS PER STEP, in the order they are read, and every one of them is something
 * the skill actually does. Where a step runs two commands, the third claim is the second
 * command's: the pull request under commit, the pushback under review.
 *
 * `Record<WorkflowStepId, …>` so a sixth step is a compile error here rather than a band
 * with a heading and nothing under it. Three each, which the test pins: a fourth is the
 * slot somebody has to fill, and a second is a list that looks unfinished.
 */
export const STEP_CLAIMS: Record<WorkflowStepId, readonly WorkflowClaim[]> = {
  plan: [
    { icon: 'Pencil', label: 'site.workflowPage.planClaimSpec' },
    { icon: 'ShieldCheck', label: 'site.workflowPage.planClaimApprove' },
    { icon: 'Ticket', label: 'site.workflowPage.planClaimTickets' },
  ],
  start: [
    { icon: 'GitBranch', label: 'site.workflowPage.startClaimBranch' },
    { icon: 'ListChecks', label: 'site.workflowPage.startClaimPlan' },
    { icon: 'Bot', label: 'site.workflowPage.startClaimAgent' },
  ],
  commit: [
    { icon: 'GitCommitHorizontal', label: 'site.workflowPage.commitClaimAtomic' },
    { icon: 'Tag', label: 'site.workflowPage.commitClaimFormat' },
    { icon: 'GitPullRequest', label: 'site.workflowPage.commitClaimPr' },
  ],
  review: [
    { icon: 'MessageSquare', label: 'site.workflowPage.reviewClaimLines' },
    { icon: 'Wrench', label: 'site.workflowPage.reviewClaimFix' },
    { icon: 'MessagesSquare', label: 'site.workflowPage.reviewClaimArgue' },
  ],
  done: [
    { icon: 'GitMerge', label: 'site.workflowPage.doneClaimMerge' },
    { icon: 'BadgeCheck', label: 'site.workflowPage.doneClaimTicket' },
    { icon: 'FolderGit2', label: 'site.workflowPage.doneClaimClean' },
  ],
}

/**
 * The words the page's drawings print that are language rather than what a tool or a
 * platform prints: the merged state of the button in `workflow/ControlArt.tsx`, and the
 * approved card the review terminal ends on in `workflow/StepTerminal.tsx`. Everything else
 * in those drawings is a transcript or GitHub's own words and stays English in both
 * languages.
 */
export const ART_COPY = {
  merged: 'site.workflowPage.mergedLabel',
  approved: 'site.workflowPage.approvedLabel',
} as const satisfies Record<string, MessageKey>

/** The two bands after the loop: a title and a subtitle each, nothing above them. */
export const WORKFLOW_BANDS = {
  /** A whole day with it, on the dark sheet. */
  day: {
    title: 'site.workflowPage.dayTitle',
    subtitle: 'site.workflowPage.daySubtitle',
  },
  /** What stays in the reader's hands, on white. */
  control: {
    title: 'site.workflowPage.controlTitle',
    subtitle: 'site.workflowPage.controlSubtitle',
  },
} as const satisfies Record<string, Record<'title' | 'subtitle', MessageKey>>

/**
 * THE DAY, IN FOUR FACTS: the loop above is one ticket's life, and this is what happens
 * when a reader has several. Picking one back up (the one command with no step, see
 * `lib/workflow.ts`), running several at once, the context living in the app rather than
 * in their head, and the app calling them when an agent stops.
 *
 * `DesktopFact` and not a shape of this page's own, because `desktop/FactList.tsx` is what
 * draws it and a second row type is how two bands set identically come to disagree.
 */
export const DAY_FACTS: readonly DesktopFact[] = [
  {
    id: 'continue',
    icon: 'History',
    title: 'site.workflowPage.dayContinueTitle',
    description: 'site.workflowPage.dayContinueDesc',
  },
  {
    id: 'parallel',
    icon: 'Columns',
    title: 'site.workflowPage.dayParallelTitle',
    description: 'site.workflowPage.dayParallelDesc',
  },
  {
    id: 'context',
    icon: 'PanelRight',
    title: 'site.workflowPage.dayContextTitle',
    description: 'site.workflowPage.dayContextDesc',
  },
  {
    id: 'notify',
    icon: 'BellRing',
    title: 'site.workflowPage.dayNotifyTitle',
    description: 'site.workflowPage.dayNotifyDesc',
  },
]

/**
 * WHAT STAYS YOURS, IN FOUR FACTS, and each one answers the objection a developer has
 * before letting an agent near their repository: the spec waits for a yes, the plan comes
 * before the code, the commits can be read one by one, and nothing in the loop presses
 * the merge button. The last one is the claim this page could most easily get wrong, and
 * it is checked against `skills/magic-done/SKILL.md`: the skill verifies a merge, it does
 * not perform one.
 */
export const CONTROL_FACTS: readonly DesktopFact[] = [
  {
    id: 'spec',
    icon: 'ShieldCheck',
    title: 'site.workflowPage.controlSpecTitle',
    description: 'site.workflowPage.controlSpecDesc',
  },
  {
    id: 'plan',
    icon: 'ListChecks',
    title: 'site.workflowPage.controlPlanTitle',
    description: 'site.workflowPage.controlPlanDesc',
  },
  {
    id: 'commits',
    icon: 'GitCommitHorizontal',
    title: 'site.workflowPage.controlCommitsTitle',
    description: 'site.workflowPage.controlCommitsDesc',
  },
  {
    id: 'merge',
    icon: 'GitMerge',
    title: 'site.workflowPage.controlMergeTitle',
    description: 'site.workflowPage.controlMergeDesc',
  },
]
