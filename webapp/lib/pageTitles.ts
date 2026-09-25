import type { MessageKey } from '@/lib/i18n'
import { marketingEn } from '@/lib/i18n/marketing/en'

/**
 * THE BROWSER TAB'S TITLE, per marketing page, as catalogue keys.
 *
 * TWO READERS, ONE TABLE. The server needs a title before any JavaScript runs, and it
 * cannot know the reader's language — that lives in the browser's `localStorage` (see
 * `lib/i18n/useLanguage.ts`) — so each page's `metadata.title` is the ENGLISH string,
 * through `pageTitle()`, which is also what a crawler indexes. `DocumentTitle` then
 * rewrites `document.title` in the reader's language from the same key. Keyed by path,
 * so a page cannot end up with one title in its metadata and another in its tab.
 *
 * DESCRIPTIVE, THEN THE BRAND, the owner's pick: a tab says what is in it before it says
 * whose it is, except on the home page, where the brand is the subject. "·" as the
 * separator, not the em dash the old titles used (the copy rule in the catalogues).
 */
export const PAGE_TITLES = {
  '/': 'site.meta.homeTitle',
  '/workflow': 'site.meta.workflowTitle',
  '/desktop': 'site.meta.desktopTitle',
  '/features': 'site.meta.featuresTitle',
  '/download': 'site.meta.downloadTitle',
  '/changelog': 'site.meta.changelogTitle',
  '/faq': 'site.meta.faqTitle',
  '/privacy': 'site.meta.privacyTitle',
  '/terms': 'site.meta.termsTitle',
} as const satisfies Record<string, MessageKey>

export type TitledPath = keyof typeof PAGE_TITLES

/** The English title, for a page's `metadata`. */
export function pageTitle(path: TitledPath): string {
  return marketingEn[PAGE_TITLES[path]]
}
