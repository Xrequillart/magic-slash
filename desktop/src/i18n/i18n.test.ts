import { readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'
import { describe, it, expect } from 'vitest'
import {
  DEFAULT_LANGUAGE,
  isValidLanguage,
  LANGUAGE_IDS,
  LANGUAGE_LOCALE,
  type LanguageId,
} from '../types'
import { en } from './en'
import { fr } from './fr'
import { localeOf, t } from '.'

// Node environment, no jsdom on purpose: this suite exercises the SHARED module,
// which the main process imports before any window exists. A test that touched
// `window` would hide a DOM dependency creeping into it.

const SRC_DIR = join(__dirname, '..')

const CATALOGUES: Record<LanguageId, Record<string, string>> = { en, fr }

function walk(dir: string, extensions: string[]): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) return walk(full, extensions)
    return extensions.some((ext) => full.endsWith(ext)) ? [full] : []
  })
}

describe('message catalogues', () => {
  it('translates every key into every language', () => {
    // The `Record<keyof typeof en, string>` alias in fr.ts already makes a MISSING
    // key a tsc error. This catches what types cannot: a key present but empty, or
    // left as the English string by a copy-paste.
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
    // A translation that drops `{name}` renders a sentence with a hole in it, and
    // one that invents `{nom}` renders the braces literally.
    const placeholders = (message: string) => (message.match(/\{\w+\}/g) ?? []).sort()

    for (const lang of LANGUAGE_IDS) {
      for (const key of Object.keys(en) as (keyof typeof en)[]) {
        expect(placeholders(CATALOGUES[lang][key]), `${lang}.${key} placeholders`).toEqual(
          placeholders(en[key]),
        )
      }
    }
  })
})

describe('translation', () => {
  it('returns the message for the language asked for', () => {
    expect(t('tray.showWindow', 'en')).toBe('Show Window')
    expect(t('tray.showWindow', 'fr')).toBe('Afficher la fenêtre')
  })

  it('substitutes named placeholders', () => {
    expect(t('notification.completed.body', 'en', { subject: 'API refactor' })).toContain('API refactor')
    expect(t('tray.update.downloadingVersion', 'fr', { version: '1.2.3' })).toBe(
      'Téléchargement de la v1.2.3…',
    )
  })

  it('leaves a placeholder alone when no value is given for it', () => {
    // Better a visible `{subject}` than the word "undefined" in a notification.
    expect(t('notification.completed.body', 'en', {})).toContain('{subject}')
    expect(t('notification.completed.body', 'en')).toContain('{subject}')
  })

  it('falls back to English for a language it has never heard of', () => {
    // The stored language is re-validated everywhere, but t() is called from the
    // main process on every menu build and must never throw.
    expect(t('tray.showWindow', 'de' as LanguageId)).toBe(en['tray.showWindow'])
  })
})

describe('language preference', () => {
  it('accepts the languages it knows and nothing else', () => {
    expect(isValidLanguage('en')).toBe(true)
    expect(isValidLanguage('fr')).toBe(true)
    // A value a newer build could have written to user_settings or appearance.json.
    expect(isValidLanguage('de')).toBe(false)
    expect(isValidLanguage('en-US')).toBe(false)
    expect(isValidLanguage(undefined)).toBe(false)
    expect(isValidLanguage(null)).toBe(false)
  })

  it('gives every language a BCP-47 tag', () => {
    // A total record, so this cannot fail without someone deleting an entry — the
    // point is that the tags are real and usable by Intl, not merely present.
    for (const lang of LANGUAGE_IDS) {
      const tag = LANGUAGE_LOCALE[lang]
      expect(tag, `${lang} locale`).toMatch(/^[a-z]{2}-[A-Z]{2}$/)
      expect(new Intl.DateTimeFormat(tag).resolvedOptions().locale, `${lang} resolves`).toBeTruthy()
    }
    expect(localeOf(DEFAULT_LANGUAGE)).toBe(LANGUAGE_LOCALE[DEFAULT_LANGUAGE])
  })
})

describe('no hardcoded locale', () => {
  it('leaves no en-US in the code this branch made locale-aware', () => {
    // Every `toLocaleString`/`Intl.*` call in the app used to name 'en-US' inline,
    // which is exactly the kind of thing that comes back one component at a time.
    // The tag now lives in one place — LANGUAGE_LOCALE in types.ts — and callers
    // read it through useLocale(); nothing else may spell it out.
    const files = [
      ...walk(join(SRC_DIR, 'main'), ['.ts']),
      ...walk(join(SRC_DIR, 'renderer'), ['.ts', '.tsx']),
    ].filter((file) => !file.endsWith('.test.ts') && !file.endsWith('.test.tsx'))

    // Asserted so a directory rename cannot quietly turn this into a green no-op
    // that walks nothing and reports no offenders.
    expect(files.length).toBeGreaterThan(50)

    const offenders = files
      .filter((file) => /['"]en-US['"]/.test(readFileSync(file, 'utf-8')))
      .map((file) => file.slice(SRC_DIR.length + 1))

    expect(offenders).toEqual([])
  })
})
