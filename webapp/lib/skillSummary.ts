import type { MessageKey } from './i18n'

/**
 * What each skill will ACTUALLY do on this repository, given its current settings.
 *
 * The four skill tabs each open with a summary of the run they configure. A static
 * one was a lie half the time: it said "creates the epic and its stories" to a repo
 * filing GitHub issues, and "asks first" to one that refuses protected branches
 * outright. So the summary is composed from the same resolved values the controls
 * below it are bound to, and every setting that changes the run changes a line here.
 *
 * PURE, and message KEYS rather than sentences: the copy is translated at render
 * time, and this module is unit-tested without a React tree or a language. This is the
 * twin of `desktop/src/renderer/utils/skillSummary.ts` — same keys, same branches. The
 * two builds cannot import each other, so they are kept identical and the root test
 * suite covers both; a step added on one side and forgotten on the other is two
 * surfaces describing one run differently, which is the bug this pairing prevents.
 *
 * The Jira type fallbacks are spelled out rather than read from DEFAULTS on purpose:
 * this module stays free of `lib/repositories`, so the root suite can run it without
 * the webapp's own dependencies installed.
 *
 * NO SETTING IS SPELLED OUT TWICE. A step exists when the option changes the shape of
 * the run ("splits as little as possible", "amends and force-pushes"); a flag that
 * merely adds something to the output gets a short noun phrase in `tail` instead. The
 * alternative — one step per setting — restates the rows underneath in the same words
 * and is longer than the settings it introduces.
 */

/** One line of a summary: a message, and the values it interpolates. */
export interface SkillSummaryStep {
  key: MessageKey
  vars?: Record<string, string>
}

/** A skill's block: the run as ordered steps, then the flags that do not need one. */
export interface SkillSummary {
  steps: SkillSummaryStep[]
  tail: SkillSummaryStep[]
}

/**
 * The issue-type names Jira falls back to when the fields are left empty — the same
 * two the fields show as their placeholder, and the same two the skill assumes.
 * Spelled here so a summary never reads "the epic ()" on an untouched repo.
 */
const DEFAULT_EPIC_TYPE = 'Epic'
const DEFAULT_STORY_TYPE = 'Story'

/**
 * The branches /magic:commit treats as protected whatever the repo says, plus the
 * repo's own development branch. See skills/magic-commit/SKILL.md step 4.6.
 */
const PROTECTED_BRANCHES = ['main', 'master', 'develop']

/**
 * Enum value to message key. Records rather than switches, with a fallback at every
 * lookup: these blocks are jsonb the webapp writes wholesale, so a value no build
 * has ever offered can arrive here, and a summary is not the place to throw.
 */
const SPLITTING_STEPS: Record<string, MessageKey> = {
  conservative: 'repo.plan.step.splitConservative',
  balanced: 'repo.plan.step.splitBalanced',
  eager: 'repo.plan.step.splitEager',
}

const ACCEPTANCE_STEPS: Record<string, MessageKey> = {
  checklist: 'repo.plan.step.acChecklist',
  gherkin: 'repo.plan.step.acGherkin',
  none: 'repo.plan.step.acNone',
}

const COMMIT_FORMAT_STEPS: Record<string, MessageKey> = {
  conventional: 'repo.commit.step.formatConventional',
  angular: 'repo.commit.step.formatAngular',
  gitmoji: 'repo.commit.step.formatGitmoji',
  none: 'repo.commit.step.formatNone',
}

const COMMIT_STYLE_STEPS: Record<string, MessageKey> = {
  'single-line': 'repo.commit.step.styleSingle',
  'multi-line': 'repo.commit.step.styleMulti',
}

const TEST_ACCOUNT_STEPS: Record<string, MessageKey> = {
  off: 'repo.pr.step.accountsOff',
  reference: 'repo.pr.step.accountsReference',
  inline: 'repo.pr.step.accountsInline',
}

const RESOLVE_COMMIT_STEPS: Record<string, MessageKey> = {
  new: 'repo.resolve.step.commitNew',
  amend: 'repo.resolve.step.commitAmend',
  ask: 'repo.resolve.step.commitAsk',
}

/**
 * The option labels a summary interpolates instead of describing — the resolve tab's
 * own format and style, which are the commit tab's values under another name.
 *
 * Exported for the caller to translate: a step carries strings, and these two are the
 * only values in any summary that are neither config text nor a product name.
 */
export const COMMIT_FORMAT_LABELS: Record<string, MessageKey> = {
  conventional: 'repo.commit.formatConventional',
  angular: 'repo.commit.formatAngular',
  gitmoji: 'repo.commit.formatGitmoji',
  none: 'repo.commit.formatNone',
}

export const COMMIT_STYLE_LABELS: Record<string, MessageKey> = {
  'single-line': 'repo.commit.styleSingle',
  'multi-line': 'repo.commit.styleMulti',
}

/**
 * `https://github.com/owner/repo/issues` → `owner/repo`.
 *
 * The Tracker tab shows the address, which is what you check a target with; a sentence
 * about where issues land reads better with the repository. Anything that is not a
 * GitHub URL comes back untouched — an `issues.githubIssuesUrl` override is free text.
 */
export function shortGitHubTarget(issuesUrl: string): string {
  const trimmed = issuesUrl.trim().replace(/\/+$/, '')
  const match = /^https?:\/\/[^/]+\/([^/]+\/[^/]+?)(?:\/issues)?$/.exec(trimmed)
  return match ? match[1] : trimmed
}

export interface PlanSummaryInput {
  /** PLAN_TRACKERS: 'jira' | 'github' | 'ask'. */
  tracker: string
  /** Resolved Jira project key, '' when the repo has none. */
  jiraProject: string
  /** Resolved GitHub issues URL, '' when the repo has no remote. */
  githubTarget: string
  /** Jira issue-type names as typed; '' means the documented default. */
  epicType: string
  storyType: string
  duplicateCheck: boolean
  splitting: string
  acceptanceCriteria: string
  assignToMe: boolean
  labels: string[]
  useRepoTemplates: boolean
}

export function planSummary(input: PlanSummaryInput): SkillSummary {
  const steps: SkillSummaryStep[] = [
    { key: input.duplicateCheck ? 'repo.plan.step.duplicateOn' : 'repo.plan.step.duplicateOff' },
    { key: SPLITTING_STEPS[input.splitting] ?? SPLITTING_STEPS.balanced },
    { key: ACCEPTANCE_STEPS[input.acceptanceCriteria] ?? ACCEPTANCE_STEPS.checklist },
    // The one step no setting can change: there is no switch for skipping the spec,
    // and saying so is the point — it is what makes the step after it safe.
    { key: 'repo.plan.step.spec' },
    ticketCreationStep(input),
  ]

  const tail: SkillSummaryStep[] = []
  if (input.assignToMe) tail.push({ key: 'repo.plan.tail.assign' })
  if (input.labels.length > 0) {
    tail.push({ key: 'repo.plan.tail.labels', vars: { labels: input.labels.join(', ') } })
  }
  if (input.useRepoTemplates) tail.push({ key: 'repo.plan.tail.templates' })

  return { steps, tail }
}

/** Where the tickets land — the one line the tracker setting rewrites entirely. */
function ticketCreationStep(input: PlanSummaryInput): SkillSummaryStep {
  if (input.tracker === 'ask') return { key: 'repo.plan.step.createAsk' }

  if (input.tracker === 'github') {
    const target = shortGitHubTarget(input.githubTarget)
    return target
      ? { key: 'repo.plan.step.createGithub', vars: { target } }
      : { key: 'repo.plan.step.createGithubNoTarget' }
  }

  // Jira, and anything unknown: `ask` and `github` are the only values that state
  // Jira is not involved, which is the same reading the Tracker tab's own mode uses.
  const vars = {
    epic: input.epicType || DEFAULT_EPIC_TYPE,
    story: input.storyType || DEFAULT_STORY_TYPE,
  }
  return input.jiraProject
    ? { key: 'repo.plan.step.createJira', vars: { ...vars, project: input.jiraProject } }
    : { key: 'repo.plan.step.createJiraNoProject', vars }
}

export interface CommitSummaryInput {
  format: string
  style: string
  allowOnProtectedBranch: boolean
  /** The repo's development branch, '' when unset — it is protected too. */
  developmentBranch: string
  coAuthor: boolean
  includeTicketId: boolean
}

export function commitSummary(input: CommitSummaryInput): SkillSummary {
  const branches = [...PROTECTED_BRANCHES]
  const development = input.developmentBranch.trim()
  if (development && !branches.includes(development)) branches.push(development)

  const steps: SkillSummaryStep[] = [
    // Atomic commits are not a setting: the skill splits multi-feature changes
    // without asking, which is the thing to know before reading any option below.
    { key: 'repo.commit.step.atomic' },
    { key: COMMIT_FORMAT_STEPS[input.format] ?? COMMIT_FORMAT_STEPS.angular },
    { key: COMMIT_STYLE_STEPS[input.style] ?? COMMIT_STYLE_STEPS['single-line'] },
    {
      key: input.allowOnProtectedBranch
        ? 'repo.commit.step.protectedAsk'
        : 'repo.commit.step.protectedBlock',
      vars: { branches: branches.join(', ') },
    },
  ]

  const tail: SkillSummaryStep[] = []
  if (input.coAuthor) tail.push({ key: 'repo.commit.tail.coAuthor' })
  if (input.includeTicketId) tail.push({ key: 'repo.commit.tail.ticketId' })

  return { steps, tail }
}

export interface PrSummaryInput {
  /** The tracker the ticket lives in, as the Tracker tab resolves it. */
  trackerMode: string
  autoLinkTickets: boolean
  testAccounts: string
  /** Explicit file or skill holding the accounts, '' when auto-detected. */
  testAccountsSource: string
  commentOnPR: boolean
  watchCI: boolean
}

export function prSummary(input: PrSummaryInput): SkillSummary {
  // A product name, so it needs no catalogue entry and cannot be mistranslated.
  const tracker = input.trackerMode === 'github' ? 'GitHub' : 'Jira'

  const steps: SkillSummaryStep[] = [
    { key: 'repo.pr.step.open' },
    input.autoLinkTickets
      ? { key: 'repo.pr.step.autoLinkOn', vars: { tracker } }
      : { key: 'repo.pr.step.autoLinkOff' },
    { key: TEST_ACCOUNT_STEPS[input.testAccounts] ?? TEST_ACCOUNT_STEPS.off },
    {
      key: input.commentOnPR ? 'repo.pr.step.ticketComment' : 'repo.pr.step.ticketQuiet',
      vars: { tracker },
    },
    { key: input.watchCI ? 'repo.pr.step.watchOn' : 'repo.pr.step.watchOff' },
  ]

  const tail: SkillSummaryStep[] = []
  // Only worth a line when accounts are mentioned at all, and only when the source was
  // pinned by hand: auto-detection is what an empty field means, not a missing answer.
  const source = input.testAccountsSource.trim()
  if (source && input.testAccounts !== 'off') {
    tail.push({ key: 'repo.pr.tail.accountsSource', vars: { source } })
  }

  return { steps, tail }
}

export interface ResolveSummaryInput {
  commitMode: string
  useCommitConfig: boolean
  /** Already translated — see COMMIT_FORMAT_LABELS / COMMIT_STYLE_LABELS. */
  formatLabel: string
  styleLabel: string
  replyToComments: boolean
}

export function resolveSummary(input: ResolveSummaryInput): SkillSummary {
  const steps: SkillSummaryStep[] = [
    { key: 'repo.resolve.step.read' },
    { key: RESOLVE_COMMIT_STEPS[input.commitMode] ?? RESOLVE_COMMIT_STEPS.new },
  ]

  // An amend rewrites the commit it lands on, so there is no message to format: the
  // step would describe a message the run never writes.
  if (input.commitMode !== 'amend') {
    steps.push(
      input.useCommitConfig
        ? { key: 'repo.resolve.step.formatInherit' }
        : {
            key: 'repo.resolve.step.formatCustom',
            vars: { format: input.formatLabel, style: input.styleLabel },
          },
    )
  }

  steps.push({
    key: input.replyToComments ? 'repo.resolve.step.replyOn' : 'repo.resolve.step.replyOff',
  })

  return { steps, tail: [] }
}
