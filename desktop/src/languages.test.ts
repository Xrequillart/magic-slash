import { describe, it, expect } from 'vitest'
import { resolveTicketLanguage } from './languages'

describe('resolveTicketLanguage', () => {
  it('prefers an explicit ticket language', () => {
    expect(resolveTicketLanguage({ ticket: 'fr', jiraComment: 'en' })).toBe('fr')
  })

  it('falls back to jiraComment when ticket is unset', () => {
    expect(resolveTicketLanguage({ jiraComment: 'fr' })).toBe('fr')
  })

  it('falls back to en when neither is set', () => {
    expect(resolveTicketLanguage({ discussion: 'fr' })).toBe('en')
  })

  it('falls back to en on an absent languages block', () => {
    expect(resolveTicketLanguage(undefined)).toBe('en')
    expect(resolveTicketLanguage({})).toBe('en')
  })

  // The webapp writes the languages block wholesale, with no per-key validation,
  // so '' can reach this function. Treating it as a value would resolve a ticket
  // to no language at all.
  it('treats an empty string as unset at every link', () => {
    expect(resolveTicketLanguage({ ticket: '', jiraComment: 'fr' })).toBe('fr')
    expect(resolveTicketLanguage({ ticket: '', jiraComment: '' })).toBe('en')
  })

  // discussion is the language the skill TALKS in, not the one it WRITES tickets
  // in. It must never leak into this chain.
  it('never falls back to discussion', () => {
    expect(resolveTicketLanguage({ discussion: 'fr', jiraComment: 'en' })).toBe('en')
  })
})
