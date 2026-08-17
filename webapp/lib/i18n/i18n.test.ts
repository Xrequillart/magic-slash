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
import { marketingEn } from './marketing/en'
import { marketingFr } from './marketing/fr'
import { docEn } from './marketing/doc-en'
import { docFr } from './marketing/doc-fr'
import { localeOf, t } from '.'

/**
 * Runs in the ROOT vitest suite (`webapp/lib/**` is in its include list), on the root
 * node_modules. Everything reached from here is pure data — no React, no Supabase —
 * which is the constraint stated on `./languages.ts`.
 */

const CATALOGUES: Record<LanguageId, Record<string, string>> = {
  en: { ...en, ...marketingEn, ...docEn },
  fr: { ...fr, ...marketingFr, ...docFr },
}

/**
 * The app catalogue and the public site's are checked with the same three rules but
 * SEPARATE allow-lists for "legitimately identical in both languages". Merging the
 * lists would mean a marketing rewrite could silently mask an untranslated string in
 * the product copy, and the two files are edited by different people.
 */
const PAIRS = [
  { name: 'app', en: en as Record<string, string>, fr: fr as Record<string, string> },
  {
    name: 'site',
    en: marketingEn as Record<string, string>,
    fr: marketingFr as Record<string, string>,
  },
] as const

describe('message catalogues', () => {
  it('translates every key into every language', () => {
    // `Record<keyof typeof en, string>` in fr.ts already makes a MISSING key a tsc
    // error. This catches what types cannot: a key present but empty, or left as the
    // English string by a copy-paste.
    const keys = Object.keys(CATALOGUES.en)
    expect(keys.length).toBeGreaterThan(0)

    for (const lang of LANGUAGE_IDS) {
      const catalogue = CATALOGUES[lang]
      expect(Object.keys(catalogue).sort(), `${lang} key set`).toEqual([...keys].sort())

      for (const key of keys) {
        expect(catalogue[key], `${lang}.${key}`).toBeTruthy()
      }
    }
  })

  it('namespaces the two catalogues apart', () => {
    // They are merged into one flat lookup, so a key defined in both would resolve to
    // whichever spreads last — silently, and differently per language if only one side
    // has the clash. The `site.` prefix is what prevents it; this is what enforces it.
    const appKeys = Object.keys(en)
    const siteKeys = Object.keys(marketingEn)
    const docKeys = Object.keys(docEn)

    for (const [name, keys] of [
      ['site', siteKeys],
      ['doc', docKeys],
    ] as const) {
      expect(keys.filter((key) => !key.startsWith('site.')), `unprefixed ${name} keys`).toEqual([])
    }
    expect(appKeys.filter((key) => key.startsWith('site.')), 'app keys in the site namespace').toEqual([])
    expect(Object.keys(CATALOGUES.en)).toHaveLength(
      appKeys.length + siteKeys.length + docKeys.length,
    )
  })

  it('translates the documentation prose, not just its headings', () => {
    // The doc catalogue is 675 entries of prose — an exact allow-list of "legitimately
    // identical" would be unmaintainable and would stop being read. So the rule is
    // about LENGTH instead: a short entry may match (a filename, a config value, a
    // status name), but five words of English on a French page is a hole, and the few
    // long entries that genuinely must not be translated are named here.
    const LITERAL = new Set([
      // Trigger phrases are typed verbatim; translating them names a phrase that does
      // not trigger anything. Both the English and the French ones are literal.
      'site.doc.skills.13',
      'site.doc.skills.27',
      'site.doc.skills.28',
      'site.doc.skills.68',
      'site.doc.skills.69',
      'site.doc.skills.79',
      'site.doc.skills.80',
      'site.doc.skills.90',
      'site.doc.skills.91',
      // Config values, commit-format examples and API field values.
      'site.doc.skills.38',
      'site.doc.configuration.22',
      'site.doc.configuration.23',
      'site.doc.configuration.24',
      'site.doc.desktop.37',
      'site.doc.hooks.27',
      'site.doc.environments.36',
      // Lists of MCP tool names.
      'site.doc.hooks.33',
      'site.doc.hooks.34',
      // Jira status names, which are the literal strings on the board.
      'site.doc.troubleshooting.34',
      'site.doc.troubleshooting.35',
      // "Via WSL 2 (Windows Subsystem for Linux)" is the same sentence in French.
      'site.doc.environments.8',
    ])

    const words = (message: string) => message.replace(/<[^>]+>/g, '').split(/\s+/).filter(Boolean)

    const untranslated = (Object.keys(docEn) as (keyof typeof docEn)[]).filter(
      (key) => docEn[key] === docFr[key] && words(docEn[key]).length >= 5 && !LITERAL.has(key),
    )
    expect(untranslated).toEqual([])
  })

  it('keeps the same placeholders in every language', () => {
    // A translation that drops `{name}` renders a sentence with a hole in it, and one
    // that invents `{nom}` renders the braces literally.
    const placeholders = (message: string) => (message.match(/\{\w+\}/g) ?? []).sort()

    for (const lang of LANGUAGE_IDS) {
      for (const key of Object.keys(CATALOGUES.en)) {
        expect(placeholders(CATALOGUES[lang][key]), `${lang}.${key} placeholders`).toEqual(
          placeholders(CATALOGUES.en[key]),
        )
      }
    }
  })

  it('keeps the same inline markup in every language', () => {
    // The site and doc copy carries `<br>`, `<strong>`, `<code>` and `<em>`, rendered
    // by `RichText` via dangerouslySetInnerHTML. A translation that drops a
    // `</strong>` does not just lose bold — it leaks the tag into the rest of the page.
    const tags = (message: string) => (message.match(/<\/?[a-z]+>/g) ?? []).sort()

    for (const [source, target] of [
      [marketingEn as Record<string, string>, marketingFr as Record<string, string>],
      [docEn as Record<string, string>, docFr as Record<string, string>],
    ] as const) {
      for (const key of Object.keys(source)) {
        expect(tags(target[key]), `fr.${key} markup`).toEqual(tags(source[key]))
      }
    }
  })

  it('allows only <br>, <strong>, <code> and <em> in the site copy', () => {
    // `RichText` hands these strings to dangerouslySetInnerHTML. That is safe because
    // this repo is the only author — but only as long as the markup stays this small,
    // so anything richer has to become JSX rather than a bigger string. An `<a>` here
    // would put a URL in a translator's hands, and a `<script>` would end the argument.
    const ALLOWED = /^<\/?(br|strong|code|em)>$/

    for (const catalogue of [marketingEn, marketingFr, docEn, docFr]) {
      for (const [key, message] of Object.entries(catalogue)) {
        for (const tag of message.match(/<[^>]+>/g) ?? []) {
          expect(ALLOWED.test(tag), `${key} contains ${tag}`).toBe(true)
        }
      }
    }
  })

  it('leaves the French catalogue actually translated', () => {
    // Plenty of entries ARE the same word in both languages — product nouns, git and
    // format vocabulary, section titles French borrowed whole. Those are listed, so a
    // key that starts matching English fails here and has to be justified by adding
    // it. That is the point: an untranslated string is invisible on a French screen
    // to anyone who also reads English, and this is the only thing that notices.
    const SAME_IN_BOTH: Record<(typeof PAIRS)[number]['name'], string[]> = {
      app: [
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
      // "Notifications" and "Format" are the same word in both languages, and
      // "Pull requests" is left in English on purpose — it is what the GitHub UI
      // says, in both.
      'settings.notifications.section',
      'settings.notifications.pr.section',
      'settings.sidebars.format.label',
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
      // Two duration units. "{count}h" is the form the banner was specified with in
      // both languages, and "min" is the same abbreviation in French.
      'skillHours.hours',
      'skillHours.minutes',
      ],
      // The site's list is product vocabulary French borrowed whole. It shrank a lot
      // when the landing page stopped selling the seven skills by name: the command
      // titles ("Start", "Commit", …) were proper nouns that could not be translated,
      // and they left with the `/skills` page.
      site: [
        'site.nav.configuration',
        'site.nav.documentationCategory',
        'site.nav.faq',
        'site.nav.changelog',
        'site.faq.title',
        // The hero mockup mirrors the app's own chrome, and these four labels are the
        // same word in French — "Skills" is the product's name for them, and AGENTS /
        // SESSION / Commits are borrowed whole, exactly as they are in the app.
        'site.mockup.menuSkills',
        'site.mockup.agentsLabel',
        'site.mockup.session',
        'site.mockup.commits',
        'site.mockup.scripts',
        // The settings illustration borrows the app's labels, and these are the same word
        // on both screens — git and format vocabulary French took whole, plus the two
        // product names the app's own section titles use.
        'site.repoCfg.branches',
        'site.repoCfg.commit',
        'site.repoCfg.style',
        'site.repoCfg.format',
        'site.repoCfg.worktree',
        'site.repoCfg.resolve',
        'site.repoCfg.pr',
        'site.repoCfg.issues',
        'site.story.tl9Date',
        'site.footer.configuration',
        'site.footer.changelog',
        'site.footer.documentation',
        'site.footer.faq',
      ],
    }

    for (const pair of PAIRS) {
      const identical = Object.keys(pair.en).filter((key) => pair.en[key] === pair.fr[key])
      expect([...identical].sort(), `${pair.name} catalogue`).toEqual(
        [...SAME_IN_BOTH[pair.name]].sort(),
      )
    }
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
