import { describe, it, expect } from 'vitest'
import { t as translate } from '../../i18n'
import type { LanguageId } from '../../types'
import { agentNotification, agentSubject } from './agent-message'

const bound = (lang: LanguageId) => (key: Parameters<typeof translate>[0], vars?: Record<string, string | number>) =>
  translate(key, lang, vars)

const en = bound('en')
const fr = bound('fr')

describe('agentSubject', () => {
  it('prefers the ticket, which needs no context at all', () => {
    const subject = agentSubject(en, {
      ticketId: 'MAGIC-202',
      title: 'Refonte du menu',
      name: 'Claude 3',
      repositories: ['/Users/me/Documents/magic-slash'],
    })
    expect(subject).toBe('MAGIC-202')
  })

  it('falls back to the skill-reported title, quoted per language', () => {
    const input = { title: 'Refonte du menu', name: 'Claude 3' }
    expect(agentSubject(en, input)).toBe('"Refonte du menu"')
    expect(agentSubject(fr, input)).toBe('« Refonte du menu »')
  })

  it('names the repository when all it has is the generated name', () => {
    // "Claude 3" alone told the person nothing: it is a counter, not a subject.
    const input = { name: 'Claude 3', repositories: ['/Users/me/Documents/magic-slash'] }
    expect(agentSubject(en, input)).toBe('"Claude 3" (magic-slash)')
    expect(agentSubject(fr, input)).toBe('« Claude 3 » (magic-slash)')
  })

  it('survives a trailing slash on the repository path', () => {
    expect(agentSubject(en, { name: 'Claude 3', repositories: ['/Users/me/Documents/magic-slash/'] }))
      .toBe('"Claude 3" (magic-slash)')
  })

  it('names only the first repository of an agent that spans several', () => {
    expect(agentSubject(en, { name: 'Claude 3', repositories: ['/a/api', '/b/web'] }))
      .toBe('"Claude 3" (api)')
  })

  it('treats blank metadata as absent', () => {
    // A title cleared to an empty string must not render as `""`.
    expect(agentSubject(en, { ticketId: '  ', title: '', name: 'Claude 3' })).toBe('"Claude 3"')
    expect(agentSubject(en, {})).toBe('An agent')
    expect(agentSubject(fr, {})).toBe('Un agent')
  })
})

describe('agentNotification', () => {
  it('says which agent and what it needs, in both languages', () => {
    expect(agentNotification(en, 'waiting', { ticketId: 'MAGIC-202' })).toEqual({
      title: 'An agent is waiting for you',
      body: 'MAGIC-202 needs your answer to continue',
    })
    expect(agentNotification(fr, 'waiting', { ticketId: 'MAGIC-202' })).toEqual({
      title: 'Un agent vous attend',
      body: 'MAGIC-202 a besoin de votre réponse pour continuer',
    })
  })

  it('keeps the title stable between the two states it covers', () => {
    // A constant title is recognised at a glance without being read; only the body
    // varies. See the `metadata.status`-in-the-title option, deliberately not taken.
    expect(agentNotification(en, 'completed', { title: 'Refonte du menu' })).toEqual({
      title: 'An agent has finished',
      body: '"Refonte du menu" finished its task',
    })
    expect(agentNotification(fr, 'completed', { name: 'Claude 3', repositories: ['/x/magic-slash'] })).toEqual({
      title: 'Un agent a terminé',
      body: '« Claude 3 » (magic-slash) a terminé sa tâche',
    })
  })

  it('leaves no placeholder unfilled', () => {
    for (const state of ['waiting', 'completed'] as const) {
      for (const t of [en, fr]) {
        const { title, body } = agentNotification(t, state, { name: 'Claude 3' })
        expect(`${title} ${body}`).not.toContain('{')
      }
    }
  })
})
