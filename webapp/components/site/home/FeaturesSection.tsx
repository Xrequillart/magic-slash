'use client'

import {
  Command,
  Cpu,
  GitPullRequest,
  Layers,
  LifeBuoy,
  Map,
  Monitor,
  Settings,
  Shield,
  type LucideIcon,
} from 'lucide-react'
import type { MessageKey } from '@/lib/i18n'
import { useT } from '@/lib/i18n/useLanguage'
import { FeatureCard } from '../FeatureCard'
import { HomeHeading, HomeSection } from './Shell'

/**
 * NOT RENDERED. `app/(marketing)/page.tsx` no longer imports this band — the product
 * owner cut it — and it is kept on disk because restoring it is one import and one line,
 * and because story #269 reuses `FeatureCard` for the `/features` page.
 *
 * TWO THINGS ROTTED THE MOMENT IT STOPPED BEING RENDERED, so read them before wiring it
 * back up. The "Eight commands" tile below points at `#commands`, an anchor that no
 * longer exists on the page: `CommandsSection` was cut in the same pass. And the header's
 * Product menu and the footer both used to link HERE, at `/#features`; they now point at
 * `/documentation#skills`, so restoring this band means repointing them too.
 */
/**
 * The features grid — nine tiles, each an icon, a title, one line and a link to where
 * the thing is written up. This is the funnel's widest step: a visitor who is still
 * deciding gets to pick the one thing they came for.
 *
 * EVERY DESTINATION EXISTS, and that is the constraint that shaped the list rather than
 * a check applied to it. `PUBLIC_PATHS` in `lib/hostRouting.ts` is `/`, `/story` and
 * `/documentation`; a tile pointing at `/features` or `/pricing` would not 404 on
 * production, it would 307 the reader into a login form. So eight of the nine land on
 * anchors `DocSidebar` already publishes, and the ninth — "Eight commands", which has no
 * detail page anywhere — opens `#commands` further up this same page.
 *
 * `id="features"` is linked from the header's Product menu and from the footer.
 */

const FEATURES: {
  icon: LucideIcon
  title: MessageKey
  description: MessageKey
  href: string
}[] = [
  // The one with no detail page: it goes to this page's own section.
  {
    icon: Command,
    title: 'site.features.commandsTitle',
    description: 'site.features.commandsDesc',
    href: '#commands',
  },
  {
    icon: Map,
    title: 'site.features.workflowsTitle',
    description: 'site.features.workflowsDesc',
    href: '/documentation#workflows',
  },
  {
    icon: Monitor,
    title: 'site.features.desktopTitle',
    description: 'site.features.desktopDesc',
    href: '/documentation#desktop',
  },
  {
    icon: Layers,
    title: 'site.features.multiRepoTitle',
    description: 'site.features.multiRepoDesc',
    href: '/documentation#multi-repo',
  },
  {
    icon: Settings,
    title: 'site.features.configurationTitle',
    description: 'site.features.configurationDesc',
    href: '/documentation#configuration',
  },
  {
    icon: GitPullRequest,
    title: 'site.features.integrationsTitle',
    description: 'site.features.integrationsDesc',
    href: '/documentation#integrations',
  },
  {
    icon: Cpu,
    title: 'site.features.hooksTitle',
    description: 'site.features.hooksDesc',
    href: '/documentation#hooks',
  },
  {
    icon: Shield,
    title: 'site.features.securityTitle',
    description: 'site.features.securityDesc',
    href: '/documentation#security',
  },
  {
    icon: LifeBuoy,
    title: 'site.features.troubleshootingTitle',
    description: 'site.features.troubleshootingDesc',
    href: '/documentation#troubleshooting',
  },
]

export function FeaturesSection() {
  const { t } = useT()

  return (
    <HomeSection id="features">
      <HomeHeading title={t('site.features.title')} subtitle={t('site.features.subtitle')} />

      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((feature) => (
          <FeatureCard
            key={feature.href}
            icon={feature.icon}
            title={t(feature.title)}
            description={t(feature.description)}
            href={feature.href}
            cta={t('site.features.learnMore')}
          />
        ))}
      </div>
    </HomeSection>
  )
}
