import type { Metadata } from 'next'
import { marketingEn } from '@/lib/i18n/marketing/en'
import { DesignSystemHome } from '@/components/site/designSystem/DesignSystemHome'

/**
 * `/design-system` — Prestige's home page, and the root of `design.magic-slash.io`.
 *
 * The two galleries sit under it: `/design-system/desktop`, public, and
 * `/design-system/webapp`, still development-only.
 *
 * A SERVER COMPONENT for the `metadata`, with the page in a client component next door:
 * the copy needs `useT()`. The same split `/desktop` and `/workflow` make. Not in
 * `PAGE_TITLES`, which `DocumentTitle` reads by the BROWSER's path — `/` on the design
 * host — and this page is not under the `(marketing)` layout that mounts it anyway.
 */

export const metadata: Metadata = {
  title: marketingEn['site.meta.designSystemTitle'],
  description:
    'Prestige is the Magic Slash design system: every component shown is the one compiled into the app.',
}

export default function DesignSystemHomePage() {
  return <DesignSystemHome />
}
