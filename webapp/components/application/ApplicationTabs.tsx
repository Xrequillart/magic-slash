'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Bell, Languages, Palette, Sparkles, SquareTerminal } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { MessageKey } from '@/lib/i18n'
import { useT } from '@/lib/i18n/useLanguage'

/**
 * The Application page's tabs — one tab, one route.
 *
 * Order and wording follow the desktop app's own Settings tabs (Application →
 * Claude Code → Notifications → Appearance → Language), so the two surfaces name
 * the same box the same way when someone reads one while looking at the other.
 * The labels reuse the section keys the tabs' content already uses rather than
 * introducing a parallel set that could drift out of agreement with it.
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

interface Pill {
  left: number
  width: number
}

export function ApplicationTabs() {
  const { t, lang } = useT()
  const pathname = usePathname()

  const listRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([])

  /** Null until the active tab has been measured — the pill is not drawn before. */
  const [pill, setPill] = useState<Pill | null>(null)
  /**
   * Whether the pill may animate. False for its first appearance: a pill that
   * slides in from the left edge on every page load reads as a glitch, where the
   * same movement between two tabs reads as the answer to a click.
   */
  const [animate, setAnimate] = useState(false)

  const activeIndex = Math.max(
    0,
    APPLICATION_TABS.findIndex((tab) => pathname === tab.href),
  )

  /**
   * Measure the active tab and put the pill on it. Layout effect, so the pill is
   * placed in the same frame the tab is painted in.
   *
   * `lang` is a dependency because the labels change width with it, and a
   * ResizeObserver watches the strip and every tab in it: web fonts land after
   * first paint and widen the row under us, which would otherwise leave the pill
   * measured against text that no longer exists.
   */
  useLayoutEffect(() => {
    const measure = () => {
      const el = itemRefs.current[activeIndex]
      if (!el) return
      setPill({ left: el.offsetLeft, width: el.offsetWidth })
    }
    measure()

    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(measure)
    if (listRef.current) observer.observe(listRef.current)
    for (const el of itemRefs.current) if (el) observer.observe(el)
    return () => observer.disconnect()
  }, [activeIndex, lang])

  // One frame after the pill exists, so the transition applies to MOVES and not
  // to the initial placement.
  useEffect(() => {
    if (!pill || animate) return
    const id = requestAnimationFrame(() => setAnimate(true))
    return () => cancelAnimationFrame(id)
  }, [pill, animate])

  return (
    <nav aria-label={t('application.title')}>
      <div
        ref={listRef}
        className="relative inline-flex max-w-full gap-1 overflow-x-auto rounded-full border border-black/5 bg-white p-1"
      >
        {/* The moving background. `aria-hidden` because the active tab already
            says it is active — to a screen reader this is decoration. */}
        {pill && (
          <span
            aria-hidden
            className={`absolute bottom-1 top-1 left-0 rounded-full bg-black/[0.05] ${
              animate ? 'transition-[transform,width] duration-300 ease-out' : ''
            }`}
            style={{ transform: `translateX(${pill.left}px)`, width: pill.width }}
          />
        )}

        {APPLICATION_TABS.map((tab, index) => {
          const Icon = tab.icon
          const active = index === activeIndex
          return (
            <Link
              key={tab.href}
              href={tab.href}
              ref={(el) => {
                itemRefs.current[index] = el
              }}
              aria-current={active ? 'page' : undefined}
              className={`relative z-10 flex shrink-0 items-center gap-2 rounded-full px-4 py-2 font-display text-sm font-medium transition-colors ${
                active ? 'text-ink' : 'text-muted hover:text-ink'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {t(tab.labelKey)}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
