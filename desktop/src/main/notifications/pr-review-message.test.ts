import { describe, it, expect } from 'vitest'
import { t as translate } from '../../i18n'
import type { LanguageId } from '../../types'
import { prReviewNotification, prReviewSubject } from './pr-review-message'

// Node environment: the composer is pure by design, so this suite reaches the real
// catalogue and asserts on the SENTENCES a person reads — not on catalogue keys.

const bound = (lang: LanguageId) => (key: Parameters<typeof translate>[0], vars?: Record<string, string | number>) =>
  translate(key, lang, vars)

const en = bound('en')
const fr = bound('fr')

describe('prReviewSubject', () => {
  it('names the work by ticket and PR number', () => {
    expect(prReviewSubject(en, 'MAGIC-202', 204)).toBe('MAGIC-202 (PR #204)')
  })

  it('falls back through what is known', () => {
    expect(prReviewSubject(en, 'MAGIC-202')).toBe('MAGIC-202')
    expect(prReviewSubject(en, undefined, 204)).toBe('PR #204')
    expect(prReviewSubject(en)).toBe('your pull request')
    expect(prReviewSubject(fr)).toBe('votre pull request')
  })

  it('ignores a label that is only whitespace', () => {
    // An agent whose title was never set must not produce "  (PR #204)".
    expect(prReviewSubject(en, '   ', 204)).toBe('PR #204')
  })
})

describe('prReviewNotification', () => {
  it('never puts a URL or a raw status in the message', () => {
    // The regression this module exists for: the body used to be `{url}: {status}`.
    for (const status of ['approved', 'changes-requested', 'commented', 'pending'] as const) {
      for (const t of [en, fr]) {
        const { title, body } = prReviewNotification(t, {
          status,
          reviewers: ['alice'],
          label: 'MAGIC-202',
          prNumber: 204,
        })
        expect(`${title} ${body}`).not.toMatch(/https?:\/\//)
        // The enum spelling itself, not the English word "approved" that legitimately
        // appears in a sentence: `changes-requested` is what used to leak through.
        expect(`${title} ${body}`).not.toContain('changes-requested')
        expect(body).toContain('MAGIC-202 (PR #204)')
        expect(body).not.toContain('{')
      }
    }
  })

  it('credits a single reviewer by name', () => {
    expect(prReviewNotification(en, { status: 'approved', reviewers: ['alice'], label: 'MAGIC-202' }).body)
      .toBe('MAGIC-202 was approved by alice')
    expect(prReviewNotification(fr, { status: 'changes-requested', reviewers: ['alice'], label: 'MAGIC-202' }).body)
      .toBe('alice demande des modifications sur MAGIC-202')
  })

  it('credits nobody when several reviewers could be the author of the verdict', () => {
    // `reviewers` says who reviewed, not whose review set the status — naming one
    // of two would credit the person who merely commented.
    const { body } = prReviewNotification(en, {
      status: 'approved',
      reviewers: ['alice', 'bob'],
      label: 'MAGIC-202',
    })
    expect(body).toBe('MAGIC-202 was approved')
  })

  it('says nobody approved a pending review, whoever is on it', () => {
    const { title, body } = prReviewNotification(en, { status: 'pending', reviewers: ['alice'], prNumber: 204 })
    expect(title).toBe('Review pending')
    expect(body).toBe('PR #204 is waiting for a review')
  })

  it('translates the whole message, title included', () => {
    const { title, body } = prReviewNotification(fr, { status: 'approved', label: 'MAGIC-202', prNumber: 204 })
    expect(title).toBe('Pull request approuvée')
    expect(body).toBe('MAGIC-202 (PR #204) a été approuvée')
  })
})
