import { useCallback, useSyncExternalStore } from 'react'
import { DEFAULT_LANGUAGE, isValidLanguage, type LanguageId } from '../../types'
import { localeOf, t as translate, type Translate } from '../../i18n'

export type { MessageKey, Translate } from '../../i18n'
export { ROLE_LABEL_KEYS, LEVEL_LABEL_KEYS, STYLE_LABEL_KEYS } from '../../i18n/profileLabels'

/**
 * The renderer's view of the interface language, for the three windows at once.
 *
 * Same shape as the theme store next door, and for the same reason: the tray
 * popover and the quick launch never load a config, and the main window only
 * gets one seconds after it opens. The main process is the one that knows — it
 * hands the language over as a launch argument (so a cold start in French never
 * flashes English) and broadcasts every change.
 */

function resolveLanguage(value: unknown): LanguageId {
  return isValidLanguage(value) ? value : DEFAULT_LANGUAGE
}

let current: LanguageId = resolveLanguage(window.electronAPI?.language?.initial())
const listeners = new Set<() => void>()

/**
 * Tell the user agent which language the document is in. Not decoration: `lang`
 * drives spellcheck in every input, hyphenation, `:lang()` and the voice a screen
 * reader picks. This is the language's counterpart to the theme's `applyTheme` —
 * the one thing that has to reach the document, not just React.
 */
function applyDocumentLanguage(language: LanguageId): void {
  document.documentElement.lang = language
}

// Subscribed here rather than inside initI18n(): a window that forgot the call
// would silently stop following language changes, which is a bug you only meet
// in the one window nobody tested.
window.electronAPI?.language?.onChanged((language) => {
  const applied = resolveLanguage(language)
  if (applied === current) return
  current = applied
  applyDocumentLanguage(current)
  for (const listener of listeners) listener()
})

/**
 * Adopt the boot language before React renders. Call once per window entry point,
 * at module scope: the shells ship `<html lang="en">`, so this is what makes a
 * French window declare itself French, and an eager import is also what guarantees
 * the subscription above is installed by the time the first change arrives (this
 * module's only other consumers are components).
 */
export function initI18n(): void {
  applyDocumentLanguage(current)
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useLanguage(): LanguageId {
  return useSyncExternalStore(subscribe, () => current)
}

/**
 * The translate function for the active language. Its identity changes with the
 * language, which is what makes every component holding it re-render on a
 * switch — no reload, terminal chrome included.
 */
export function useT(): Translate {
  const language = useLanguage()
  return useCallback<Translate>((key, vars) => translate(key, language, vars), [language])
}

/**
 * The BCP-47 tag for the active language. For the `Intl.*` and `toLocaleString`
 * calls that must not freeze at the boot language — read it in the render path,
 * never at module scope.
 */
export function useLocale(): string {
  return localeOf(useLanguage())
}
