import { describe, it, expect } from 'vitest'
import { formatTimestamp, formatRelativeDate, contextColors, detectTicketProvider, buildTicketLink } from './utils'
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

  it('returns null for anything it cannot place', () => {
    expect(detectTicketProvider(undefined)).toBeNull()
    expect(detectTicketProvider('')).toBeNull()
    expect(detectTicketProvider('some free text')).toBeNull()
    // Lower-case is not a Jira key: the skill uppercases before writing, so this
    // shape only arrives hand-typed and guessing a tracker for it would be wrong.
    expect(detectTicketProvider('proj-123')).toBeNull()
    expect(detectTicketProvider('#12a')).toBeNull()
    expect(detectTicketProvider('12-34-56')).toBeNull()
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
