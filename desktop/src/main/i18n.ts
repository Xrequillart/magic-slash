import { t as translate, type Translate } from '../i18n'
import { currentLanguage } from './appearance'

/**
 * The main process's view of the catalogue: `t()` with the current language
 * already bound, so a menu or a notification reads as one call.
 *
 * It lives here rather than in src/i18n/index.ts because that module is shared
 * with the renderer — binding the language there would make it import
 * `appearance.ts`, and with it `electron` and `fs`.
 *
 * Nothing is cached: menus and notifications are rebuilt on every language
 * change, so each call reads the language that is current at that moment.
 *
 * There is no `locale()` companion to the renderer's `useLocale()`: nothing in the
 * main process formats a date or a number (the digest interpolates raw counts, the
 * notifications interpolate names and URLs). Whoever needs one writes
 * `localeOf(currentLanguage())`.
 */
export const t: Translate = (key, vars) => translate(key, currentLanguage(), vars)
