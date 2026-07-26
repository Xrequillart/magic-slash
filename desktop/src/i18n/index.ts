import { DEFAULT_LANGUAGE, LANGUAGE_LOCALE, type LanguageId } from '../types'
import { en } from './en'
import { fr } from './fr'

/**
 * The application's message catalogue, shared by the main process and all three
 * renderers.
 *
 * Deliberately pure: no `electron`, no `window`, no `fs`. The main process needs
 * these strings before any window exists (menus, the tray, notifications) and
 * the renderer needs the same ones, so importing either side's environment here
 * would make the module unusable from the other — and from a node-environment
 * test. Whoever calls `t()` passes the language in; the two thin wrappers that
 * know it are main/i18n.ts and renderer/i18n/index.ts.
 */

export type MessageKey = keyof typeof en

/**
 * A translate function with the language already bound. Both wrappers return this
 * shape (`main/i18n.ts`'s `t`, the renderer's `useT()`), and anything that takes a
 * translator as a parameter should say `Translate` rather than restate the
 * signature — so widening `vars` stays a one-line change.
 */
export type Translate = (key: MessageKey, vars?: Record<string, string | number>) => string

const CATALOGUES: Record<LanguageId, Record<MessageKey, string>> = { en, fr }

/**
 * Translate `key` into `lang`, substituting `{name}` placeholders from `vars`.
 *
 * Interpolation is intentionally minimal — no plurals, no dates, no nesting.
 * Anything that varies grammatically (a plural, an enumeration) gets its own
 * catalogue entry per form, because a suffix rule that works in English does not
 * survive translation. See the `digest.*` keys for the pattern.
 */
export function t(
  key: MessageKey,
  lang: LanguageId = DEFAULT_LANGUAGE,
  vars?: Record<string, string | number>,
): string {
  // An unknown language can only come from unvalidated storage; English is the
  // reference catalogue, so it is always complete. No per-key fallback beyond
  // that: every catalogue is typed `Record<keyof typeof en, string>`, so a key
  // present in `en` is present everywhere.
  const message = (CATALOGUES[lang] ?? en)[key]
  if (!vars) return message
  return message.replace(/\{(\w+)\}/g, (whole, name: string) =>
    name in vars ? String(vars[name]) : whole,
  )
}

/**
 * The BCP-47 tag to format dates and numbers with, for a given language. The one
 * door onto `LANGUAGE_LOCALE`: callers name a language, never a tag.
 */
export function localeOf(lang: LanguageId): string {
  return LANGUAGE_LOCALE[lang]
}
