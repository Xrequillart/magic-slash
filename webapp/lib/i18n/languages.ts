/**
 * What a language IS for the webapp: the ids, the default, the BCP-47 tag each one
 * formats dates and numbers with, and how a first-time visitor's language is picked.
 *
 * Mirrored from `desktop/src/types.ts` (LANGUAGE_IDS, DEFAULT_LANGUAGE,
 * LANGUAGE_LOCALE), which the webapp cannot import — separate TypeScript project,
 * separate build. Add a language there, add it here.
 *
 * PURE on purpose, and that is a hard constraint rather than tidiness: the root
 * vitest suite covers `webapp/lib/**` with the ROOT node_modules only, and CI never
 * installs the webapp's own dependencies. Everything `i18n.test.ts` reaches — this
 * module, the catalogues, `./index` — must therefore import nothing but each other.
 * No React, no `window`, no Supabase. The browser-facing half lives in
 * `./useLanguage.ts`.
 */

export const LANGUAGE_IDS = ['en', 'fr'] as const

export type LanguageId = (typeof LANGUAGE_IDS)[number]

export const DEFAULT_LANGUAGE: LanguageId = 'en'

/** The BCP-47 tag each language formats dates and numbers with. */
export const LANGUAGE_LOCALE: Record<LanguageId, string> = {
  en: 'en-US',
  fr: 'fr-FR',
}

/**
 * How each language names itself. Deliberately NOT translated: you pick your
 * language written in that language, or you cannot find it in a list you can't read.
 */
export const LANGUAGE_AUTONYM: Record<LanguageId, string> = {
  en: 'English',
  fr: 'Français',
}

export function isValidLanguage(value: unknown): value is LanguageId {
  return typeof value === 'string' && (LANGUAGE_IDS as readonly string[]).includes(value)
}

/**
 * Where the chosen language is kept. localStorage and nothing else: this is a
 * property of the BROWSER, not of the account, so it works on the login and
 * invitation pages — where there is no account to read a preference from — and it
 * never races with `user_settings.language`, which belongs to the desktop app.
 */
export const LANGUAGE_STORAGE_KEY = 'magic-slash.language'

/**
 * The language to open in: an explicit choice if there is one, else what the browser
 * asks for, else English.
 *
 * Takes both inputs as arguments rather than reading `localStorage` and `navigator`
 * itself, so the rule can be tested and so the inline boot script in `app/layout.tsx`
 * can apply the same one before React exists.
 *
 * Matches on the PRIMARY subtag, so `fr-CA` and `fr-BE` both resolve to French — the
 * region only changes date formatting, which `LANGUAGE_LOCALE` decides anyway.
 */
export function preferredLanguage(
  stored: unknown,
  browserLanguages: readonly string[] = [],
): LanguageId {
  if (isValidLanguage(stored)) return stored
  for (const tag of browserLanguages) {
    const base = tag.toLowerCase().split('-')[0]
    if (isValidLanguage(base)) return base
  }
  return DEFAULT_LANGUAGE
}
