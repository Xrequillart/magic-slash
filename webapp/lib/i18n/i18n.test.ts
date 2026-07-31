import { describe, expect, it } from 'vitest'
import {
  DEFAULT_LANGUAGE,
  isValidLanguage,
  LANGUAGE_AUTONYM,
  LANGUAGE_IDS,
  LANGUAGE_LOCALE,
  preferredLanguage,
  type LanguageId,
} from './languages'
import { en } from './en'
import { fr } from './fr'
import { localeOf, t } from '.'

/**
 * Runs in the ROOT vitest suite (`webapp/lib/**` is in its include list), on the root
 * node_modules. Everything reached from here is pure data — no React, no Supabase —
 * which is the constraint stated on `./languages.ts`.
 */

const CATALOGUES: Record<LanguageId, Record<string, string>> = { en, fr }

describe('message catalogues', () => {
  it('translates every key into every language', () => {
    // `Record<keyof typeof en, string>` in fr.ts already makes a MISSING key a tsc
    // error. This catches what types cannot: a key present but empty, or left as the
    // English string by a copy-paste.
    const keys = Object.keys(en) as (keyof typeof en)[]
    expect(keys.length).toBeGreaterThan(0)

    for (const lang of LANGUAGE_IDS) {
      const catalogue = CATALOGUES[lang]
      expect(Object.keys(catalogue).sort(), `${lang} key set`).toEqual([...keys].sort())

      for (const key of keys) {
        expect(catalogue[key], `${lang}.${key}`).toBeTruthy()
      }
    }
  })

  it('keeps the same placeholders in every language', () => {
    // A translation that drops `{name}` renders a sentence with a hole in it, and one
    // that invents `{nom}` renders the braces literally.
    const placeholders = (message: string) => (message.match(/\{\w+\}/g) ?? []).sort()

    for (const lang of LANGUAGE_IDS) {
      for (const key of Object.keys(en) as (keyof typeof en)[]) {
        expect(placeholders(CATALOGUES[lang][key]), `${lang}.${key} placeholders`).toEqual(
          placeholders(en[key]),
        )
      }
    }
  })

  it('leaves the French catalogue actually translated', () => {
    // Plenty of entries ARE the same word in both languages — product nouns, git and
    // format vocabulary, section titles French borrowed whole. Those are listed, so a
    // key that starts matching English fails here and has to be justified by adding
    // it. That is the point: an untranslated string is invisible on a French screen
    // to anyone who also reads English, and this is the only thing that notices.
    const SAME_IN_BOTH: (keyof typeof en)[] = [
      'nav.application',
      'nav.admin',
      'team.agents.one',
      'team.agents.many',
      'profile.role.dev',
      'profile.role.design',
      'profile.role.qa',
      'profile.role.ops',
      'profile.role.manager',
      'profile.level.expert',
      'profile.style.simple',
      'application.title',
      'theme.espresso',
      'settings.prWatcher.interval1m',
      'settings.prWatcher.interval2m',
      'settings.prWatcher.interval5m',
      'settings.claudeCode',
      'settings.launchMode.plan',
      'settings.launchMode.default',
      'settings.launchMode.auto',
      'settings.launchMode.bypass',
      'org.joinModal.placeholder',
      'org.role.admin',
      'org.colActions',
      'org.invitations',
      'repo.branches.section',
      'repo.worktree.section',
      'repo.commit.section',
      'repo.commit.style',
      'repo.commit.format',
      'repo.commit.formatConventional',
      'repo.commit.formatAngular',
      'repo.commit.formatGitmoji',
      'repo.resolve.section',
      'repo.resolve.askNoticeAmend',
      'repo.pr.section',
      'repo.issues.section',
    ]

    const identical = (Object.keys(en) as (keyof typeof en)[]).filter(
      (key) => en[key] === fr[key],
    )
    expect([...identical].sort()).toEqual([...SAME_IN_BOTH].sort())
  })
})

describe('translation', () => {
  it('returns the message for the language asked for', () => {
    expect(t('common.cancel', 'en')).toBe('Cancel')
    expect(t('common.cancel', 'fr')).toBe('Annuler')
  })

  it('substitutes named placeholders', () => {
    expect(t('dashboard.greeting', 'en', { name: 'Xavier' })).toBe('Hey Xavier.')
    expect(t('org.archiveModal.confirm', 'fr', { name: 'Poppins' })).toBe('Archiver Poppins ?')
  })

  it('leaves a placeholder alone when no value is given for it', () => {
    expect(t('dashboard.greeting', 'en', {})).toContain('{name}')
    expect(t('dashboard.greeting', 'en')).toContain('{name}')
  })

  it('falls back to English for a language it has never heard of', () => {
    // The stored language is validated on read, but t() must never throw: it renders
    // during the first paint, before anything has had a chance to sanitise it.
    expect(t('common.cancel', 'de' as LanguageId)).toBe(en['common.cancel'])
  })
})

describe('language preference', () => {
  it('accepts the languages it knows and nothing else', () => {
    expect(isValidLanguage('en')).toBe(true)
    expect(isValidLanguage('fr')).toBe(true)
    expect(isValidLanguage('de')).toBe(false)
    expect(isValidLanguage('en-US')).toBe(false)
    expect(isValidLanguage(undefined)).toBe(false)
    expect(isValidLanguage(null)).toBe(false)
  })

  it('prefers an explicit choice over the browser', () => {
    expect(preferredLanguage('en', ['fr-FR', 'fr'])).toBe('en')
    expect(preferredLanguage('fr', ['en-US'])).toBe('fr')
  })

  it('falls back to the browser when nothing was chosen', () => {
    expect(preferredLanguage(null, ['fr-FR', 'en-US'])).toBe('fr')
    // Region subtags are matched on their primary subtag: fr-CA is still French.
    expect(preferredLanguage(null, ['fr-CA'])).toBe('fr')
    // The first tag the app knows wins, not the first tag full stop.
    expect(preferredLanguage(null, ['de-DE', 'fr-FR'])).toBe('fr')
  })

  it('falls back to English for a browser asking for nothing it knows', () => {
    expect(preferredLanguage(null, ['de-DE', 'es'])).toBe(DEFAULT_LANGUAGE)
    expect(preferredLanguage(null, [])).toBe(DEFAULT_LANGUAGE)
    expect(preferredLanguage(undefined)).toBe(DEFAULT_LANGUAGE)
    // A value a newer build could have written to localStorage.
    expect(preferredLanguage('de', [])).toBe(DEFAULT_LANGUAGE)
  })

  it('gives every language a usable locale and an autonym', () => {
    for (const lang of LANGUAGE_IDS) {
      const tag = LANGUAGE_LOCALE[lang]
      expect(tag, `${lang} locale`).toMatch(/^[a-z]{2}-[A-Z]{2}$/)
      expect(new Intl.DateTimeFormat(tag).resolvedOptions().locale, `${lang} resolves`).toBeTruthy()
      // Autonyms are what the switcher lists; an empty one is an unpickable language.
      expect(LANGUAGE_AUTONYM[lang], `${lang} autonym`).toBeTruthy()
    }
    expect(localeOf(DEFAULT_LANGUAGE)).toBe(LANGUAGE_LOCALE[DEFAULT_LANGUAGE])
  })
})
