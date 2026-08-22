import { describe, it, expect } from 'vitest'
import { resolveSpecLanguage, resolveTicketLanguage } from './languages'

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

describe('resolveSpecLanguage', () => {
  it('prefers an explicit spec language', () => {
    expect(resolveSpecLanguage({ spec: 'fr', ticket: 'en' })).toBe('fr')
  })

  // The point of the whole feature: a spec reviewed in French, tickets filed in
  // English for an international team.
  it('separates the spec from the tickets', () => {
    expect(resolveSpecLanguage({ spec: 'fr', ticket: 'en' })).toBe('fr')
    expect(resolveTicketLanguage({ spec: 'fr', ticket: 'en' })).toBe('en')
  })

  it('falls back to the ticket language when unset', () => {
    expect(resolveSpecLanguage({ ticket: 'fr' })).toBe('fr')
  })

  // It inherits the ticket CHAIN, not just its head — a repo that only ever set
  // `jiraComment` must carry that all the way through to the spec.
  it('follows the ticket chain through to jiraComment', () => {
    expect(resolveSpecLanguage({ jiraComment: 'fr' })).toBe('fr')
  })

  it('falls back to en when nothing in the chain is set', () => {
    expect(resolveSpecLanguage(undefined)).toBe('en')
    expect(resolveSpecLanguage({})).toBe('en')
    expect(resolveSpecLanguage({ discussion: 'fr' })).toBe('en')
  })

  it('treats an empty string as unset at every link', () => {
    expect(resolveSpecLanguage({ spec: '', ticket: 'fr' })).toBe('fr')
    expect(resolveSpecLanguage({ spec: '', ticket: '', jiraComment: 'fr' })).toBe('fr')
    expect(resolveSpecLanguage({ spec: '', ticket: '', jiraComment: '' })).toBe('en')
  })

  // Same guard as the ticket chain: `discussion` is what a skill TALKS in.
  it('never falls back to discussion', () => {
    expect(resolveSpecLanguage({ discussion: 'fr', jiraComment: 'en' })).toBe('en')
  })

  // An unset key must resolve exactly as it did before the key existed, or adding
  // it silently re-languages every repository already out there.
  it('is a no-op for a config that predates the key', () => {
    for (const langs of [{}, { jiraComment: 'fr' }, { ticket: 'fr' }, { ticket: 'fr', jiraComment: 'en' }]) {
      expect(resolveSpecLanguage(langs)).toBe(resolveTicketLanguage(langs))
    }
  })
})
