import { describe, it, expect } from 'vitest'
import {
  canCloseAgent,
  formatTimestamp,
  formatRelativeDate,
  contextColors,
  detectTicketProvider,
  buildTicketLink,
  getSpecPanelMode,
  splitSpecPath,
  hasScrolledFromTop,
  SPEC_SCROLL_TOLERANCE_PX,
  STATUSES_BY_TYPE,
  resolveAgentType,
  canChangeAgentType,
} from './utils'
import { t as translate, type MessageKey } from '../../../i18n'

// Both formatters take a translator; bind English so the expectations below stay
// the compact abbreviations the sidebar has always shown. The French catalogue is
// exercised by i18n.test.ts, which checks every key resolves in both languages.
const t = (key: MessageKey, vars?: Record<string, string | number>) => translate(key, 'en', vars)

describe('formatTimestamp', () => {
  const now = 1700000000000

  it('returns "now" for less than 60 seconds', () => {
    expect(formatTimestamp(now - 30_000, now, t)).toBe('now')
    expect(formatTimestamp(now - 59_999, now, t)).toBe('now')
  })

  it('returns minutes for less than 1 hour', () => {
    expect(formatTimestamp(now - 60_000, now, t)).toBe('1min')
    expect(formatTimestamp(now - 30 * 60_000, now, t)).toBe('30min')
  })

  it('returns hours for less than 1 day', () => {
    expect(formatTimestamp(now - 3_600_000, now, t)).toBe('1h')
    expect(formatTimestamp(now - 12 * 3_600_000, now, t)).toBe('12h')
  })

  it('returns days for less than 1 week', () => {
    expect(formatTimestamp(now - 86_400_000, now, t)).toBe('1d')
    expect(formatTimestamp(now - 6 * 86_400_000, now, t)).toBe('6d')
  })

  it('returns weeks for less than 5 weeks', () => {
    expect(formatTimestamp(now - 7 * 86_400_000, now, t)).toBe('1w')
    expect(formatTimestamp(now - 28 * 86_400_000, now, t)).toBe('4w')
  })

  it('returns months for less than 12 months', () => {
    expect(formatTimestamp(now - 60 * 86_400_000, now, t)).toBe('2mo')
  })

  it('returns years for 365+ days', () => {
    expect(formatTimestamp(now - 400 * 86_400_000, now, t)).toBe('1y')
  })

  it('follows the language it is given', () => {
    const fr = (key: MessageKey, vars?: Record<string, string | number>) => translate(key, 'fr', vars)
    expect(formatTimestamp(now - 30_000, now, fr)).toBe('à l’instant')
    expect(formatTimestamp(now - 2 * 86_400_000, now, fr)).toBe('2 j')
  })
})

describe('formatRelativeDate', () => {
  it('formats simple relative dates', () => {
    expect(formatRelativeDate('2 hours ago', t)).toBe('2h')
    expect(formatRelativeDate('5 minutes ago', t)).toBe('5min')
    expect(formatRelativeDate('1 day ago', t)).toBe('1d')
    expect(formatRelativeDate('3 weeks ago', t)).toBe('3w')
    expect(formatRelativeDate('1 month ago', t)).toBe('1mo')
    expect(formatRelativeDate('2 years ago', t)).toBe('2y')
  })

  it('formats compound relative dates', () => {
    expect(formatRelativeDate('1 month, 5 days ago', t)).toBe('1mo5d')
    expect(formatRelativeDate('2 months, 1 week ago', t)).toBe('2mo1w')
  })

  it('returns input unchanged if no match', () => {
    expect(formatRelativeDate('just now', t)).toBe('just now')
    expect(formatRelativeDate('', t)).toBe('')
  })
})

describe('contextColors', () => {
  it('stays green below 40%', () => {
    expect(contextColors(0)).toEqual({ bar: 'bg-green', text: 'text-green' })
    expect(contextColors(39.9)).toEqual({ bar: 'bg-green', text: 'text-green' })
  })

  it('turns orange from 40% up to 70%', () => {
    expect(contextColors(40)).toEqual({ bar: 'bg-orange', text: 'text-orange' })
    expect(contextColors(69.9)).toEqual({ bar: 'bg-orange', text: 'text-orange' })
  })

  it('turns red from 70%', () => {
    expect(contextColors(70)).toEqual({ bar: 'bg-red', text: 'text-red' })
    expect(contextColors(100)).toEqual({ bar: 'bg-red', text: 'text-red' })
  })
})

describe('detectTicketProvider', () => {
  // The regression: /magic:start writes the bare number, because it reuses the same
  // value for the worktree directory and the branch name. Issues 196 and 197 showed
  // no mark and no link until this accepted it.
  it('reads a GitHub issue with or without the #', () => {
    expect(detectTicketProvider('196')).toBe('github')
    expect(detectTicketProvider('#196')).toBe('github')
    expect(detectTicketProvider('1')).toBe('github')
  })

  it('reads a Jira key', () => {
    expect(detectTicketProvider('PROJ-123')).toBe('jira')
    expect(detectTicketProvider('A-1')).toBe('jira')
  })

  it('reads a project key carrying a digit or an underscore', () => {
    // Jira accepts a letter followed by letters, digits or underscores, so these are
    // ordinary project keys. The letters-only rule this replaces read as the common
    // case and dropped them: no mark, no link, and nothing on screen to say why.
    expect(detectTicketProvider('SUP2-14')).toBe('jira')
    expect(detectTicketProvider('AB_CD-7')).toBe('jira')
    expect(detectTicketProvider('X1-900')).toBe('jira')
  })

  it('reads a lower-case Jira key too', () => {
    // This REVERSES an earlier decision here, deliberately. The old rule returned
    // null for `proj-123`, reasoning that the skill uppercases before writing so the
    // shape only arrives hand-typed. But `normalizeTicketId` folds `per-5030` onto
    // `PER-5030` precisely because lower-case ids DO turn up in `agents.ticket_id` —
    // the Tasks card marks them, and a sidebar that refuses the same id is the
    // divergence this shared pattern exists to end. Jira browses keys
    // case-insensitively, so the link built from it resolves.
    expect(detectTicketProvider('proj-123')).toBe('jira')
    expect(detectTicketProvider('sup2-14')).toBe('jira')
  })

  it('returns null for anything it cannot place', () => {
    expect(detectTicketProvider(undefined)).toBeNull()
    expect(detectTicketProvider('')).toBeNull()
    expect(detectTicketProvider('some free text')).toBeNull()
    expect(detectTicketProvider('#12a')).toBeNull()
    expect(detectTicketProvider('12-34-56')).toBeNull()
    // The project part must still BEGIN with a letter, so widening the shape does
    // not start claiming arbitrary hyphenated values for Jira.
    expect(detectTicketProvider('2fa-1')).toBeNull()
  })
})

describe('buildTicketLink', () => {
  const urls = {
    jiraUrl: 'https://acme.atlassian.net/browse/',
    githubIssuesUrl: 'https://github.com/owner/repo/issues',
  }

  it('links a GitHub issue whichever form the ID takes', () => {
    expect(buildTicketLink('196', urls)).toBe('https://github.com/owner/repo/issues/196')
    expect(buildTicketLink('#196', urls)).toBe('https://github.com/owner/repo/issues/196')
  })

  it('links a Jira ticket', () => {
    expect(buildTicketLink('PROJ-123', urls)).toBe('https://acme.atlassian.net/browse/PROJ-123')
  })

  it('does not double the separator on a base URL that ends with one', () => {
    expect(buildTicketLink('196', { githubIssuesUrl: 'https://github.com/owner/repo/issues/' }))
      .toBe('https://github.com/owner/repo/issues/196')
  })

  it('returns null when the tracker has no base URL', () => {
    expect(buildTicketLink('196', { jiraUrl: urls.jiraUrl })).toBeNull()
    expect(buildTicketLink('PROJ-123', { githubIssuesUrl: urls.githubIssuesUrl })).toBeNull()
  })

  it('returns null for an unrecognised ID', () => {
    expect(buildTicketLink('some free text', urls)).toBeNull()
    expect(buildTicketLink(undefined, urls)).toBeNull()
  })
})

describe('resolveAgentType', () => {
  it('reads an absent or unknown kind as coder', () => {
    // Every agent predating the type has none, and reading those as planners would
    // put a spec panel in front of people writing code.
    expect(resolveAgentType(undefined)).toBe('coder')
    expect(resolveAgentType('')).toBe('coder')
    expect(resolveAgentType('some future kind')).toBe('coder')
  })

  it('passes the two known kinds through', () => {
    expect(resolveAgentType('coder')).toBe('coder')
    expect(resolveAgentType('planner')).toBe('planner')
  })
})

describe('getSpecPanelMode', () => {
  it('replaces the ticket header for a planner, whatever its status', () => {
    expect(getSpecPanelMode('planner')).toBe('replace')
  })

  it('hides for a coder, and for an agent with no kind yet', () => {
    expect(getSpecPanelMode('coder')).toBe('hidden')
    expect(getSpecPanelMode(undefined)).toBe('hidden')
    // A kind a newer build could persist: an implementation agent's sidebar must be
    // what it has always been, never a spec panel by accident.
    expect(getSpecPanelMode('some future kind')).toBe('hidden')
  })
})

describe('STATUSES_BY_TYPE', () => {
  it('offers every status to exactly one kind, plus the shared empty one', () => {
    const planner = STATUSES_BY_TYPE.planner
    const coder = STATUSES_BY_TYPE.coder
    // '' is where every agent starts, so both lists carry it and nothing else overlaps.
    const shared = planner.filter(s => (coder as readonly string[]).includes(s))
    expect(shared).toEqual([''])
  })

  it('covers the whole status union between the two lists', () => {
    // Guards the contract the type cannot: adding a status to TerminalMetadata without
    // assigning it to a workflow would leave it unreachable from every picker.
    const ALL_STATUSES = [
      '', 'planning', 'planned', 'in progress', 'committed', 'ready for PR',
      'PR created', 'CI green', 'in review', 'changes requested',
      'Review addressed', 'PR merged',
    ]
    const covered = new Set([...STATUSES_BY_TYPE.planner, ...STATUSES_BY_TYPE.coder])
    expect([...covered].sort()).toEqual([...ALL_STATUSES].sort())
  })
})

describe('splitSpecPath', () => {
  it('splits an absolute path into the directory and the file name', () => {
    expect(splitSpecPath('/Users/me/repo/.magic/specs/plan.md')).toEqual({
      repoPath: '/Users/me/repo/.magic/specs',
      filePath: 'plan.md',
    })
  })

  it('keeps the root as a directory of its own', () => {
    expect(splitSpecPath('/plan.md')).toEqual({ repoPath: '/', filePath: 'plan.md' })
  })

  it('ignores surrounding whitespace', () => {
    expect(splitSpecPath('  /tmp/spec.md  ')).toEqual({ repoPath: '/tmp', filePath: 'spec.md' })
  })

  it('refuses anything that is not an absolute file path', () => {
    expect(splitSpecPath(undefined)).toBeNull()
    expect(splitSpecPath('')).toBeNull()
    expect(splitSpecPath('   ')).toBeNull()
    // Relative: there is no single root to resolve it against — an agent can hold
    // several repositories — so guessing one would read an unrelated file.
    expect(splitSpecPath('.magic/specs/plan.md')).toBeNull()
    expect(splitSpecPath('plan.md')).toBeNull()
    // A directory names no spec.
    expect(splitSpecPath('/Users/me/repo/')).toBeNull()
  })
})

describe('hasScrolledFromTop', () => {
  it('stays quiet at the top, where the panel opens', () => {
    expect(hasScrolledFromTop({ scrollTop: 0 })).toBe(false)
  })

  it('stays quiet within the tolerance', () => {
    // A touchpad twitch or macOS overscroll, not a reader who moved down the spec.
    expect(hasScrolledFromTop({ scrollTop: 12 })).toBe(false)
    expect(hasScrolledFromTop({ scrollTop: SPEC_SCROLL_TOLERANCE_PX })).toBe(false)
  })

  it('offers the way back once the reader scrolls past the tolerance', () => {
    expect(hasScrolledFromTop({ scrollTop: SPEC_SCROLL_TOLERANCE_PX + 1 })).toBe(true)
    expect(hasScrolledFromTop({ scrollTop: 900 })).toBe(true)
  })
})

describe('canCloseAgent', () => {
  it('allows closing an agent that never started, whatever its kind', () => {
    expect(canCloseAgent(undefined, 'coder')).toBe(true)
    expect(canCloseAgent('', 'planner')).toBe(true)
  })

  it('allows closing each kind at the end of its OWN workflow', () => {
    expect(canCloseAgent('PR merged', 'coder')).toBe(true)
    // A planner stops at `planned`: it never reaches `PR merged`, so this is the only
    // thing that makes it closeable at all.
    expect(canCloseAgent('planned', 'planner')).toBe(true)
  })

  it('refuses the other kind\'s terminal status', () => {
    // The pairing is what matters: `planned` on a coder is not an ending, and neither
    // is `PR merged` on a planner — a status the kind never reaches must not close it.
    expect(canCloseAgent('planned', 'coder')).toBe(false)
    expect(canCloseAgent('PR merged', 'planner')).toBe(false)
  })

  it('refuses every status in between', () => {
    for (const status of ['in progress', 'committed', 'ready for PR', 'PR created', 'CI green', 'in review', 'changes requested', 'Review addressed']) {
      expect(canCloseAgent(status, 'coder')).toBe(false)
    }
    expect(canCloseAgent('planning', 'planner')).toBe(false)
  })

  it('treats a missing kind as a coder', () => {
    expect(canCloseAgent('PR merged', undefined)).toBe(true)
    expect(canCloseAgent('planned', undefined)).toBe(false)
  })
})

describe('canChangeAgentType', () => {
  it('allows the switch only before the agent has done anything', () => {
    expect(canChangeAgentType(undefined)).toBe(true)
    expect(canChangeAgentType('')).toBe(true)
  })

  it('refuses once any status has been reported', () => {
    // Once a workflow has started the status would be stranded outside the list the
    // new kind offers, so the control is hidden rather than made to strand it.
    for (const status of ['planning', 'planned', 'in progress', 'PR merged']) {
      expect(canChangeAgentType(status), status).toBe(false)
    }
  })
})
