import { LANGUAGE_IDS, type LanguageId } from '../types'

/**
 * THE LANGUAGES THIS APP SHIPS IN, each named in itself.
 *
 * ONE LIST, where there were three: `LanguageSelect` carried a copy, the quick-settings
 * sheet carried another, and both came with the same paragraph explaining why the names
 * are not translated. Two copies of two words is two copies to forget when a third
 * language lands.
 *
 * NAMED IN ITSELF — English, Français — so the list reads correctly whatever the app is
 * currently showing. A reader who has accidentally set the app to a language they cannot
 * read has exactly one way back, and it is this list: translating it would write the way
 * out in the language they are trying to escape. It is also what keeps this clear of the
 * module-scope freeze a `t()` here would bring — this is evaluated once, at import.
 *
 * BUILT FROM `LANGUAGE_IDS` rather than typed out: that constant is what the rest of the
 * app validates against, and a second list would let a picker offer a language the config
 * refuses — or, worse, quietly stop offering one that was added. Adding a language is one
 * entry in `AUTONYMS`, one flag in the design system's `Flag`, and nothing anywhere else.
 */
const AUTONYMS: Record<LanguageId, string> = {
  en: 'English',
  fr: 'Français',
}

/** Every language on offer, as every picker and tile in the app wants it. */
export const LANGUAGES: { value: LanguageId; label: string; flag: LanguageId }[] =
  LANGUAGE_IDS.map((id) => ({ value: id, label: AUTONYMS[id], flag: id }))

/** One language's name in itself, for a surface that draws its own control. */
export function languageName(id: LanguageId): string {
  return AUTONYMS[id]
}
