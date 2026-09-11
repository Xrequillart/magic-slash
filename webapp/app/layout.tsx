import type { Metadata } from 'next'
import { LANGUAGE_IDS, LANGUAGE_STORAGE_KEY, DEFAULT_LANGUAGE } from '@/lib/i18n/languages'
import './globals.css'

const DESCRIPTION = 'Magic Slash — the desktop agent for your Jira + GitHub development cycle.'

/**
 * `metadataBase` is what lets the relative image path below resolve to an absolute
 * URL. Crawlers for X, Slack and iMessage do not resolve relative URLs, so without
 * it the image is simply dropped and the card renders bare.
 *
 * The card is `summary` rather than `summary_large_image` because app-icon.png is
 * square (256x256); a large card expects ~1.91:1 and would letterbox it.
 */
export const metadata: Metadata = {
  metadataBase: new URL('https://magic-slash.io'),
  title: 'Magic Slash',
  description: DESCRIPTION,
  openGraph: {
    type: 'website',
    siteName: 'Magic Slash',
    url: 'https://magic-slash.io',
    title: 'Magic Slash',
    description: DESCRIPTION,
    images: [{ url: '/img/app-icon.png', width: 256, height: 256, alt: 'Magic Slash' }],
  },
  twitter: {
    card: 'summary',
    title: 'Magic Slash',
    description: DESCRIPTION,
    images: ['/img/app-icon.png'],
  },
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
      {/* No `bg-white` here, deliberately. The white page background is set on
          `html, body` in globals.css, which is where a route-level stylesheet can
          still override it: `marketing.css` paints the public site's canvas with
          `html body`. As a UTILITY CLASS the same colour would win on specificity
          (0,1,0 beats 0,0,2) and the landing page's hero would render white — which
          is only visible in the hero, because every section below it paints its own
          background. */}
      <body className="min-h-screen font-sans text-ink antialiased">{children}</body>
    </html>
  )
}
