import { DEFAULT_LANGUAGE, LANGUAGE_LOCALE, type LanguageId } from './languages'
import { en } from './en'
import { fr } from './fr'
import { marketingEn } from './marketing/en'
import { marketingFr } from './marketing/fr'

/**
 * Translation, as a plain function of (key, language).
 *
 * Deliberately pure — no React, no `window`, no storage. The language is passed IN,
 * which is what lets a formatter in `lib/` (`formatRelative`) translate without
 * becoming a hook, and what keeps this module testable by the root vitest suite.
 * The React binding lives next door in `./useLanguage.ts`.
 */

/**
 * Two catalogues, one namespace.
 *
 * `en`/`fr` are the signed-in app's copy. `marketingEn`/`marketingFr` are the public
 * site's.
 *
 * THERE WERE THREE. `docEn`/`docFr` carried `/documentation` — 675 positional keys of
 * prose, an order of magnitude more than the rest of the site put together, and edited
 * as a document rather than as UI copy, which is why it had a file of its own. The page
 * is gone and so are they; `/faq` is what stands in its place, and its ~25 keys are
 * ordinary site copy that belongs in the site catalogue with everything else.
 *
 * Every key outside the app catalogue is prefixed `site.`, so they can never collide;
 * `i18n.test.ts` enforces that rather than trusting it. They merge here, so `useT()`
 * is the SAME hook on a landing page and on the dashboard — which is why the language
 * switcher works everywhere without knowing where it is.
 */
export type MessageKey = keyof typeof en | keyof typeof marketingEn

/**
 * A translate function with the language already bound — what `useT()` returns.
 * Anything taking a translator as a parameter should say `Translate` rather than
 * restate the signature, so widening `vars` stays a one-line change.
 */
export type Translate = (key: MessageKey, vars?: Record<string, string | number>) => string

const CATALOGUES: Record<LanguageId, Record<MessageKey, string>> = {
  en: { ...en, ...marketingEn },
  fr: { ...fr, ...marketingFr },
}

export { en, fr, marketingEn, marketingFr }

/**
 * Translate `key` into `lang`, substituting `{name}` placeholders from `vars`.
 *
 * An unknown language can only come from unvalidated storage; English is the
 * reference catalogue and is always complete, so it is the fallback. There is no
 * per-key fallback beyond that: every catalogue is typed `Record<keyof typeof en,
 * string>`, so a key present in `en` is present everywhere.
 *
 * A placeholder with no value is left as-is: a visible `{name}` is a better bug
 * report than the word "undefined" in the middle of a sentence.
 */
export function t(
  key: MessageKey,
  lang: LanguageId = DEFAULT_LANGUAGE,
  vars?: Record<string, string | number>,
): string {
  const message = (CATALOGUES[lang] ?? en)[key]
  if (!vars) return message
  return message.replace(/\{(\w+)\}/g, (whole, name: string) =>
    name in vars ? String(vars[name]) : whole,
  )
}

/**
 * The BCP-47 tag to format dates and numbers with. The one door onto
 * `LANGUAGE_LOCALE`: callers name a language, never a tag.
 */
export function localeOf(lang: LanguageId): string {
  return LANGUAGE_LOCALE[lang] ?? LANGUAGE_LOCALE[DEFAULT_LANGUAGE]
}
