import { t as translate, type Translate } from '../i18n'
import { DEFAULT_LANGUAGE, type LanguageId } from '../types'

/**
 * The main process's view of the catalogue: `t()` with the current language
 * already bound, so a menu or a notification reads as one call.
 *
 * It lives here rather than in src/i18n/index.ts because that module is shared
 * with the renderer, which binds the language its own way.
 *
 * The language is held here rather than in appearance.ts, even though
 * appearance.ts is what reads it off disk and writes it back: this is the module
 * every string-producing module imports, and appearance.ts pulls in `electron`
 * and `fs`. Owning the value here keeps `t` importable from a plain node
 * context — which is what the test suite runs in, with no electron installed at
 * the repo root.
 *
 * Nothing is cached: menus and notifications are rebuilt on every language
 * change, so each call reads the language that is current at that moment.
 *
 * There is no `locale()` companion to the renderer's `useLocale()`: nothing in the
 * main process formats a date or a number (the digest interpolates raw counts, the
 * notifications interpolate names and URLs). Whoever needs one writes
 * `localeOf(currentLanguage())`.
 */

let current: LanguageId = DEFAULT_LANGUAGE

export function currentLanguage(): LanguageId {
  return current
}

/**
 * Record the language in force. Validating it, mirroring it to disk and telling
 * the rest of the app belong to `applyLanguage` in appearance.ts, its only caller.
 */
export function setLanguage(language: LanguageId): void {
  current = language
}

export const t: Translate = (key, vars) => translate(key, current, vars)
