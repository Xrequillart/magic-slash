import type { Metadata } from 'next'

/**
 * THE SOCIAL CARD FOR ONE PAGE, built in one place because Next does not merge the
 * parts of it — and that non-merging is the whole reason this file exists.
 *
 * `title` and `description` at the root ARE inherited by a route that omits them.
 * `openGraph` and `twitter` are NOT: a page that sets neither inherits the parent's
 * object WHOLESALE, keeping the root's `og:title` instead of its own `<title>`. So the
 * eight marketing pages that each already set a good page-specific `title` would all
 * share as "Magic Slash" the moment the root gained an `openGraph` block, because a
 * crawler that finds an `og:title` prefers it over `<title>`. With no og tags at all it
 * falls back to `<title>` and is right by accident, which makes a partial card at the
 * root WORSE than no card at all. That is the trap this helper closes.
 *
 * Every public page builds all four blocks from the same two strings, so a page cannot
 * declare one title and quietly advertise another. `pageMetadata.test.ts` pins it: it
 * reads every `app/(marketing)` page and fails on one that hand-rolls `metadata`
 * instead of coming through here, which is what stops a NINTH page added later from
 * reintroducing the same regression without anyone catching it in review.
 *
 * ZERO RUNTIME IMPORTS, on purpose, and `next` is a TYPE-ONLY import that esbuild
 * erases — the same constraint `lib/features.ts` and `lib/siteNav.ts` are written
 * under, for the same reason: the test runs in the ROOT vitest suite against the root
 * `node_modules`, and CI never installs `webapp/`'s dependencies, so a real `next`
 * import here would fail to RESOLVE that test rather than fail it.
 */

const SITE_NAME = 'Magic Slash'

/** The apex. Only the homepage emits `og:url`; see the `url` option below. */
export const SITE_URL = 'https://magic-slash.io'

/**
 * The icon that ships on the dock today. Square, which is why every card below is
 * `summary` and not `summary_large_image`: a large card expects roughly 1.91:1 and
 * would letterbox a 256x256 source. Swapping in a wide 1200x630 asset is this constant
 * plus the card type, and it moves every page at once.
 */
const CARD_IMAGE = {
  url: '/img/app-icon-desktop.png',
  width: 256,
  height: 256,
  alt: SITE_NAME,
} as const

export interface PageMetadataOptions {
  title: string
  description: string
  /**
   * Absolute URL of this page, emitted as `og:url`. Omitted almost everywhere on
   * purpose: an inherited `og:url` made `/features` and the rest each claim to BE the
   * homepage, and for a page that does not care, an absent `og:url` beats a wrong one
   * — crawlers fall back to the URL actually being shared.
   */
  url?: string
}

/** Title, description, Open Graph and Twitter for one page, all from the same strings. */
export function pageMetadata({ title, description, url }: PageMetadataOptions): Metadata {
  return {
    title,
    description,
    openGraph: {
      type: 'website',
      siteName: SITE_NAME,
      title,
      description,
      images: [{ ...CARD_IMAGE }],
      ...(url ? { url } : {}),
    },
    twitter: {
      card: 'summary',
      title,
      description,
      images: [CARD_IMAGE.url],
    },
  }
}
