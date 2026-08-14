'use client'

import { usePathname } from 'next/navigation'
import { Bell, Languages, Palette, Sparkles, SquareTerminal } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { MessageKey } from '@/lib/i18n'
import { useT } from '@/lib/i18n/useLanguage'
import { TabStrip } from '@/components/TabStrip'

/**
 * The Application page's tabs — one tab, one route.
 *
 * Order and wording follow the desktop app's own Settings tabs (Application →
 * Claude Code → Notifications → Appearance → Language), so the two surfaces name
 * the same box the same way when someone reads one while looking at the other.
 * The labels reuse the section keys the tabs' content already uses rather than
 * introducing a parallel set that could drift out of agreement with it.
 *
 * The strip itself — the pill that slides between tabs — is `TabStrip`, shared with
 * the dashboard's scope tabs. What stays here is the ROUTES: which tabs exist, in
 * which order, and where bare `/application` lands.
 */
export interface ApplicationTab {
  href: string
  labelKey: MessageKey
  icon: LucideIcon
}

export const APPLICATION_TABS: ApplicationTab[] = [
  { href: '/application/features', labelKey: 'settings.features', icon: Sparkles },
  { href: '/application/claude-code', labelKey: 'settings.claudeCode', icon: SquareTerminal },
  { href: '/application/notifications', labelKey: 'settings.notifications.section', icon: Bell },
  { href: '/application/appearance', labelKey: 'settings.appearance', icon: Palette },
  { href: '/application/language', labelKey: 'settings.language.section', icon: Languages },
]

/** Where bare `/application` lands. Also the tab the strip highlights there. */
export const DEFAULT_APPLICATION_TAB = APPLICATION_TABS[0].href

export function ApplicationTabs() {
  const { t } = useT()
  const pathname = usePathname()

  return (
    <TabStrip
      ariaLabel={t('application.title')}
      // The href IS the key: it is already unique per tab, and it makes the pathname
      // usable as the active key without a lookup table between the two.
      items={APPLICATION_TABS.map((tab) => ({
        key: tab.href,
        href: tab.href,
        label: t(tab.labelKey),
        icon: tab.icon,
      }))}
      activeKey={pathname}
    />
  )
}
