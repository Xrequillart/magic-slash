import { describe, it, expect } from 'vitest'
import { en } from './i18n/en'
import { fr } from './i18n/fr'
import {
  commitSummary,
  planSummary,
  prSummary,
  resolveSummary,
  shortGitHubTarget,
  type PlanSummaryInput,
  type SkillSummary,
} from './skillSummary'

/**
 * The summaries the four skill tabs open with.
 *
 * Two kinds of assertion here, and the second matters more than the first: that a
 * given setting produces the line it should, and that EVERY line any setting can
 * produce is a real message with the right placeholders. The second is what catches
 * the failure this module is most exposed to — a branch added here, its copy added to
 * `en` only, and a French user reading a raw key.
 *
 * The twin of `desktop/src/renderer/utils/skillSummary.test.ts`, over the twin module:
 * the two must agree line for line, and a divergence should fail on one side.
 */

const PLAN: PlanSummaryInput = {
  tracker: 'jira',
  jiraProject: 'PROJ',
  githubTarget: 'https://github.com/acme/api/issues',
  epicType: '',
  storyType: '',
  duplicateCheck: true,
  splitting: 'balanced',
  acceptanceCriteria: 'checklist',
  assignToMe: false,
  labels: [],
  useRepoTemplates: false,
}

const keys = (summary: SkillSummary) => [...summary.steps, ...summary.tail].map((s) => s.key)

describe('shortGitHubTarget', () => {
  it('reduces an issues URL to its repository', () => {
    expect(shortGitHubTarget('https://github.com/acme/api/issues')).toBe('acme/api')
    expect(shortGitHubTarget('https://github.com/acme/api')).toBe('acme/api')
    expect(shortGitHubTarget('https://github.com/acme/api/issues/')).toBe('acme/api')
  })

  it('leaves anything that is not a GitHub address alone', () => {
    // `issues.githubIssuesUrl` is free text, and a summary must not mangle it.
    expect(shortGitHubTarget('acme/api')).toBe('acme/api')
    expect(shortGitHubTarget('')).toBe('')
  })
})

describe('planSummary', () => {
  it('names the Jira project, and the issue types it will use', () => {
    const summary = planSummary(PLAN)
    const create = summary.steps[4]
    expect(create.key).toBe('repo.plan.step.createJira')
    // Empty fields mean the documented default, which is what the skill assumes —
    // never a summary reading "the epic ()".
    expect(create.vars).toEqual({ epic: 'Epic', story: 'Story', project: 'PROJ' })
  })

  it('says the project is asked for when the repo has none', () => {
    const summary = planSummary({ ...PLAN, jiraProject: '', epicType: 'Feature' })
    expect(summary.steps[4].key).toBe('repo.plan.step.createJiraNoProject')
    expect(summary.steps[4].vars).toEqual({ epic: 'Feature', story: 'Story' })
  })

  it('files GitHub issues when that is the tracker', () => {
    const summary = planSummary({ ...PLAN, tracker: 'github' })
    expect(summary.steps[4]).toEqual({
      key: 'repo.plan.step.createGithub',
      vars: { target: 'acme/api' },
    })
  })

  it('says so when GitHub is the tracker and no address is set', () => {
    const summary = planSummary({ ...PLAN, tracker: 'github', githubTarget: '' })
    expect(summary.steps[4].key).toBe('repo.plan.step.createGithubNoTarget')
  })

  it('promises a question when the tracker is asked for on each plan', () => {
    expect(planSummary({ ...PLAN, tracker: 'ask' }).steps[4].key).toBe('repo.plan.step.createAsk')
  })

  it('follows the duplicate check, the splitting and the criteria', () => {
    const summary = planSummary({
      ...PLAN,
      duplicateCheck: false,
      splitting: 'eager',
      acceptanceCriteria: 'gherkin',
    })
    expect(summary.steps.slice(0, 3).map((s) => s.key)).toEqual([
      'repo.plan.step.duplicateOff',
      'repo.plan.step.splitEager',
      'repo.plan.step.acGherkin',
    ])
  })

  it('falls back to the documented default for a value no build offers', () => {
    // These blocks are jsonb the webapp writes wholesale: an unknown value arrives,
    // and a summary is not the place to throw.
    const summary = planSummary({ ...PLAN, splitting: 'wild', acceptanceCriteria: 'wild' })
    expect(summary.steps[1].key).toBe('repo.plan.step.splitBalanced')
    expect(summary.steps[2].key).toBe('repo.plan.step.acChecklist')
  })

  it('trails only the flags that are on', () => {
    expect(planSummary(PLAN).tail).toEqual([])
    const summary = planSummary({
      ...PLAN,
      assignToMe: true,
      labels: ['bug', 'ui'],
      useRepoTemplates: true,
    })
    expect(summary.tail).toEqual([
      { key: 'repo.plan.tail.assign' },
      { key: 'repo.plan.tail.labels', vars: { labels: 'bug, ui' } },
      { key: 'repo.plan.tail.templates' },
    ])
  })
})

describe('commitSummary', () => {
  const COMMIT = {
    format: 'angular',
    style: 'single-line',
    allowOnProtectedBranch: true,
    developmentBranch: 'staging',
    coAuthor: true,
    includeTicketId: false,
  }

  it('lists the repo development branch among the protected ones', () => {
    const summary = commitSummary(COMMIT)
    expect(summary.steps[3]).toEqual({
      key: 'repo.commit.step.protectedAsk',
      vars: { branches: 'main, master, develop, staging' },
    })
  })

  it('does not list develop twice when that is also the development branch', () => {
    const summary = commitSummary({ ...COMMIT, developmentBranch: 'develop' })
    expect(summary.steps[3].vars).toEqual({ branches: 'main, master, develop' })
  })

  it('says it moves the work when protected branches are blocked', () => {
    const summary = commitSummary({ ...COMMIT, allowOnProtectedBranch: false })
    expect(summary.steps[3].key).toBe('repo.commit.step.protectedBlock')
  })

  it('follows the format and the style', () => {
    const summary = commitSummary({ ...COMMIT, format: 'gitmoji', style: 'multi-line' })
    expect(summary.steps.slice(1, 3).map((s) => s.key)).toEqual([
      'repo.commit.step.formatGitmoji',
      'repo.commit.step.styleMulti',
    ])
  })

  it('trails the co-author and the ticket id', () => {
    expect(commitSummary(COMMIT).tail).toEqual([{ key: 'repo.commit.tail.coAuthor' }])
    const both = commitSummary({ ...COMMIT, includeTicketId: true })
    expect(both.tail.map((f) => f.key)).toEqual([
      'repo.commit.tail.coAuthor',
      'repo.commit.tail.ticketId',
    ])
  })
})

describe('prSummary', () => {
  const PR = {
    trackerMode: 'jira',
    autoLinkTickets: true,
    testAccounts: 'off',
    testAccountsSource: '',
    commentOnPR: true,
    watchCI: true,
  }

  it('names the tracker the ticket lives in', () => {
    expect(prSummary(PR).steps[1].vars).toEqual({ tracker: 'Jira' })
    expect(prSummary({ ...PR, trackerMode: 'github' }).steps[3].vars).toEqual({ tracker: 'GitHub' })
  })

  it('follows the ticket comment and the CI watch', () => {
    const summary = prSummary({ ...PR, autoLinkTickets: false, commentOnPR: false, watchCI: false })
    expect(summary.steps.map((s) => s.key)).toEqual([
      'repo.pr.step.open',
      'repo.pr.step.autoLinkOff',
      'repo.pr.step.accountsOff',
      'repo.pr.step.ticketQuiet',
      'repo.pr.step.watchOff',
    ])
  })

  it('mentions the test-account source only when accounts are mentioned at all', () => {
    const off = prSummary({ ...PR, testAccountsSource: 'docs/accounts.md' })
    expect(off.tail).toEqual([])
    const inline = prSummary({
      ...PR,
      testAccounts: 'inline',
      testAccountsSource: 'docs/accounts.md',
    })
    expect(inline.steps[2].key).toBe('repo.pr.step.accountsInline')
    expect(inline.tail).toEqual([
      { key: 'repo.pr.tail.accountsSource', vars: { source: 'docs/accounts.md' } },
    ])
  })
})

describe('resolveSummary', () => {
  const RESOLVE = {
    commitMode: 'new',
    useCommitConfig: true,
    formatLabel: 'Angular',
    styleLabel: 'Single line',
    replyToComments: true,
  }

  it('describes the commit mode and where the message format comes from', () => {
    expect(resolveSummary(RESOLVE).steps.map((s) => s.key)).toEqual([
      'repo.resolve.step.read',
      'repo.resolve.step.commitNew',
      'repo.resolve.step.formatInherit',
      'repo.resolve.step.replyOn',
    ])
  })

  it('spells out a custom format with the labels it was given', () => {
    const summary = resolveSummary({ ...RESOLVE, useCommitConfig: false })
    expect(summary.steps[2]).toEqual({
      key: 'repo.resolve.step.formatCustom',
      vars: { format: 'Angular', style: 'Single line' },
    })
  })

  it('drops the format step for an amend, which rewrites a message it did not write', () => {
    const summary = resolveSummary({ ...RESOLVE, commitMode: 'amend', useCommitConfig: false })
    expect(summary.steps.map((s) => s.key)).toEqual([
      'repo.resolve.step.read',
      'repo.resolve.step.commitAmend',
      'repo.resolve.step.replyOn',
    ])
  })

  it('says when it will not reply in the review threads', () => {
    const summary = resolveSummary({ ...RESOLVE, replyToComments: false })
    expect(summary.steps.at(-1)?.key).toBe('repo.resolve.step.replyOff')
  })
})

describe('every line a setting can produce', () => {
  /** Every summary reachable by flipping one setting at a time, and then all of them. */
  const ALL: SkillSummary[] = [
    ...['jira', 'github', 'ask', 'wild'].flatMap((tracker) =>
      [true, false].map((duplicateCheck) =>
        planSummary({ ...PLAN, tracker, duplicateCheck, jiraProject: '', githubTarget: '' }),
      ),
    ),
    ...['conservative', 'balanced', 'eager'].map((splitting) => planSummary({ ...PLAN, splitting })),
    ...['checklist', 'gherkin', 'none'].map((acceptanceCriteria) =>
      planSummary({ ...PLAN, acceptanceCriteria }),
    ),
    planSummary({ ...PLAN, assignToMe: true, labels: ['a'], useRepoTemplates: true }),
    ...['conventional', 'angular', 'gitmoji', 'none'].flatMap((format) =>
      ['single-line', 'multi-line'].flatMap((style) =>
        [true, false].map((allowOnProtectedBranch) =>
          commitSummary({
            format,
            style,
            allowOnProtectedBranch,
            developmentBranch: 'staging',
            coAuthor: true,
            includeTicketId: true,
          }),
        ),
      ),
    ),
    ...['off', 'reference', 'inline'].flatMap((testAccounts) =>
      ['jira', 'github'].flatMap((trackerMode) =>
        [true, false].map((watchCI) =>
          prSummary({
            trackerMode,
            autoLinkTickets: watchCI,
            testAccounts,
            testAccountsSource: 'docs/accounts.md',
            commentOnPR: watchCI,
            watchCI,
          }),
        ),
      ),
    ),
    ...['new', 'amend', 'ask'].flatMap((commitMode) =>
      [true, false].flatMap((useCommitConfig) =>
        [true, false].map((replyToComments) =>
          resolveSummary({
            commitMode,
            useCommitConfig,
            formatLabel: 'Angular',
            styleLabel: 'Single line',
            replyToComments,
          }),
        ),
      ),
    ),
  ]

  it('is a message in both languages', () => {
    for (const key of new Set(ALL.flatMap(keys))) {
      expect(en[key as keyof typeof en], `en.${key}`).toBeTruthy()
      expect(fr[key as keyof typeof fr], `fr.${key}`).toBeTruthy()
    }
  })

  it('is given exactly the placeholders its message asks for', () => {
    // A missing value renders a literal `{project}` in the middle of a sentence, and a
    // spare one is a value the copy stopped using — both silent without this.
    const placeholders = (message: string) =>
      (message.match(/\{(\w+)\}/g) ?? []).map((m) => m.slice(1, -1)).sort()

    for (const summary of ALL) {
      for (const step of [...summary.steps, ...summary.tail]) {
        const message = en[step.key as keyof typeof en]
        expect(placeholders(message), `${step.key} vars`).toEqual(
          Object.keys(step.vars ?? {}).sort(),
        )
      }
    }
  })
})
