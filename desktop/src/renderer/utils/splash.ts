import { isValidLanguage, DEFAULT_LANGUAGE } from '../../types'
import { t } from '../../i18n'

/**
 * The launch splash lives in index.html, so it paints before any of this code has
 * loaded, and in English. Call after initI18n(): the document language is set by
 * then, and the label switches to it before anyone has had time to read it.
 */
export function localizeSplash(): void {
  const label = document.getElementById('splash-label')
  if (!label) return
  const lang = document.documentElement.lang
  label.textContent = t('common.loading', isValidLanguage(lang) ? lang : DEFAULT_LANGUAGE)
}

/**
 * Tell the splash the app knows what to show: its loader fades and the rabbit takes
 * off. Safe to call more than once, and after the splash is gone.
 */
export function dismissSplash(): void {
  document.dispatchEvent(new Event('magic-slash:ready'))
}
