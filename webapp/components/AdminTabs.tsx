'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

/**
 * The back-office tab bar, sitting in the header between the logo and the account
 * menu. Rendered by `app/admin/layout.tsx` and passed to AppShell as its `nav`
 * slot, so it exists only inside /admin and the header stays a logo and a menu
 * everywhere else.
 *
 * The selected tab is marked by ONE background element that slides, rather than a
 * background on each tab that switches: with three separate backgrounds the
 * highlight can only cross-fade, and the movement is what tells you the sections
 * are siblings on one axis.
 */

const TABS = [
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/organizations', label: 'Organizations' },
  { href: '/admin/stats', label: 'Stats' },
]

interface Indicator {
  left: number
  width: number
}

export function AdminTabs() {
  // usePathname is typed as string but documented nullable in some Next versions;
  // the ?? keeps the startsWith below from throwing rather than asserting.
  const pathname = usePathname() ?? ''

  // Prefix match, not equality: /admin/users/<uuid> is the user drill-down, and
  // the Users tab must stay lit while you are inside it. The trailing slash stops
  // /admin/users-somethingelse from matching if such a route is ever added.
  const activeHref = TABS.find(
    (t) => pathname === t.href || pathname.startsWith(`${t.href}/`)
  )?.href

  const tabRefs = useRef(new Map<string, HTMLAnchorElement | null>())
  const [indicator, setIndicator] = useState<Indicator | null>(null)

  /**
   * Whether the indicator may animate. False until it has been positioned once,
   * so entering the section does not slide it in from x=0 — the first placement is
   * where it belongs, and only later tab changes are movement.
   */
  const [ready, setReady] = useState(false)

  const measure = useCallback(() => {
    if (!activeHref) {
      setIndicator(null)
      return
    }
    const el = tabRefs.current.get(activeHref)
    if (!el) return
    // offsetLeft/offsetWidth are layout values, so the parent's entrance
    // translateY does not skew them — the measurement is valid mid-animation.
    setIndicator({ left: el.offsetLeft, width: el.offsetWidth })
  }, [activeHref])

  useEffect(() => {
    measure()
  }, [measure])

  /**
   * Arm the transition one frame AFTER the indicator has been painted where it
   * belongs. requestAnimationFrame rather than a plain effect: an effect runs
   * within the same commit that positions the element, so enabling the transition
   * there would make the very first placement slide in from x=0.
   */
  useEffect(() => {
    if (!indicator || ready) return
    const frame = requestAnimationFrame(() => setReady(true))
    return () => cancelAnimationFrame(frame)
  }, [indicator, ready])

  /**
   * Re-measure when the tab widths can have changed underneath us. The font load
   * is the one that actually bites: Avenir and Cera Pro are declared
   * `font-display: swap`, so the bar is first laid out in the fallback face and
   * every label changes width when the real one lands — leaving the indicator
   * sized for text that is no longer there.
   */
  useEffect(() => {
    let cancelled = false
    const remeasure = () => {
      if (!cancelled) measure()
    }

    window.addEventListener('resize', remeasure)
    document.fonts?.ready.then(remeasure).catch(() => {
      /* No webfont support, or the load failed: the fallback metrics stand. */
    })

    return () => {
      cancelled = true
      window.removeEventListener('resize', remeasure)
    }
  }, [measure])

  return (
    <nav
      aria-label="Back-office sections"
      className="animate-admin-nav relative flex min-w-0 items-center gap-1 rounded-full bg-black/[0.04] p-1"
    >
      {/* The sliding background. aria-hidden because the active tab already says
          which one it is through aria-current — this is the same fact, painted. */}
      {indicator && (
        <span
          aria-hidden
          className={`admin-tab-indicator absolute left-0 top-1 h-[calc(100%-0.5rem)] rounded-full bg-white shadow-sm shadow-black/5 ${
            ready ? 'transition-[transform,width] duration-300 ease-out' : ''
          }`}
          style={{
            transform: `translateX(${indicator.left}px)`,
            width: `${indicator.width}px`,
          }}
        />
      )}

      {TABS.map(({ href, label }) => {
        const active = href === activeHref
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            ref={(el) => {
              tabRefs.current.set(href, el)
            }}
            // z-10 keeps the label above the indicator, which is painted first and
            // would otherwise cover it.
            className={`relative z-10 shrink-0 rounded-full px-4 py-1.5 font-display text-sm font-bold transition-colors ${
              active ? 'text-ink' : 'text-muted hover:text-ink'
            }`}
          >
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
