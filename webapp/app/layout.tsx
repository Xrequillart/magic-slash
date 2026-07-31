import type { Metadata } from 'next'
import { LANGUAGE_IDS, LANGUAGE_STORAGE_KEY, DEFAULT_LANGUAGE } from '@/lib/i18n/languages'
import './globals.css'

export const metadata: Metadata = {
  title: 'Magic Slash',
  description: 'Magic Slash — the desktop agent for your Jira + GitHub development cycle.',
}

/**
 * Sets `<html lang>` before the first paint.
 *
 * The document element is server-rendered, and the server cannot know what is in this
 * browser's localStorage — so without this, a French visitor's page would announce
 * itself as English until React hydrated and corrected it. `lang` is not decoration:
 * it drives spellcheck in every input, hyphenation and the voice a screen reader
 * picks, all of which are decided before hydration.
 *
 * It reimplements the rule in `preferredLanguage()` — which is the source of truth and
 * the one under test — because this has to run as plain ES5 in a blocking script tag,
 * with no imports. The ids and the storage key are injected from that module rather
 * than retyped, so the only thing duplicated here is the matching itself.
 */
const BOOT_LANGUAGE = `
try {
  var ids = ${JSON.stringify(LANGUAGE_IDS)};
  var stored = window.localStorage.getItem(${JSON.stringify(LANGUAGE_STORAGE_KEY)});
  var pick = ids.indexOf(stored) >= 0 ? stored : null;
  if (!pick) {
    var tags = navigator.languages || [navigator.language || ''];
    for (var i = 0; i < tags.length && !pick; i++) {
      var base = String(tags[i]).toLowerCase().split('-')[0];
      if (ids.indexOf(base) >= 0) pick = base;
    }
  }
  document.documentElement.lang = pick || ${JSON.stringify(DEFAULT_LANGUAGE)};
} catch (e) {}
`.trim()

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang={DEFAULT_LANGUAGE}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: BOOT_LANGUAGE }} />
      </head>
      <body className="min-h-screen bg-white font-sans text-ink antialiased">{children}</body>
    </html>
  )
}
