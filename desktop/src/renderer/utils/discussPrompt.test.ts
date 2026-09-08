import { describe, it, expect } from 'vitest'
import { discussAgentTitle, discussPrompt, resolveDiscussionLanguage } from './discussPrompt'

describe('resolveDiscussionLanguage', () => {
  it('reads the repository setting', () => {
    expect(resolveDiscussionLanguage({ discussion: 'fr' })).toBe('fr')
  })

  it('falls back to English when nothing is set', () => {
    expect(resolveDiscussionLanguage(undefined)).toBe('en')
    expect(resolveDiscussionLanguage({})).toBe('en')
  })

  it('falls back on a code the app cannot write', () => {
    // The config is a jsonb blob the webapp writes wholesale, so a language this
    // build has never heard of can arrive. Interpolating it would leave the prompt
    // in no language at all.
    expect(resolveDiscussionLanguage({ discussion: 'de' })).toBe('en')
    expect(resolveDiscussionLanguage({ discussion: '' })).toBe('en')
  })
})

describe('discussPrompt', () => {
  it('opens on the ticket in the repository language', () => {
    expect(discussPrompt('PROJ-123', { discussion: 'fr' })).toBe('Discutons de PROJ-123 ')
    expect(discussPrompt('PROJ-123', { discussion: 'en' })).toBe("Let's discuss PROJ-123 ")
  })

  it('ends on a space, so the person types straight on', () => {
    expect(discussPrompt('PROJ-123', { discussion: 'fr' }).endsWith(' ')).toBe(true)
  })

  it('stays one line — a newline in a draft would send it', () => {
    for (const lang of ['en', 'fr'] as const) {
      expect(discussPrompt('https://github.com/o/r/issues/7', { discussion: lang })).not.toMatch(/[\r\n]/)
    }
  })
})

describe('discussAgentTitle', () => {
  it('names the agent after the ticket it discusses', () => {
    expect(discussAgentTitle('PROJ-123')).toBe('Discuss PROJ-123')
  })
})
