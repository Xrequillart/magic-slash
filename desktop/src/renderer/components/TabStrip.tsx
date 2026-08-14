import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { LucideIcon } from 'lucide-react'

/**
 * A pill rail whose background SLIDES to the tab you pick.
 *
 * The same control as the webapp's `components/TabStrip.tsx`, which the dashboard and the
 * Application page share there — so switching scope on the Team page reads the same
 * whether you are in the app or on the site. Ported rather than imported: the two are
 * separate builds, and this one drops the `<Link>` half of the webapp's version because
 * the desktop has no router and every tab here is view state.
 *
 * WHY THE PILL IS MEASURED and not styled. A background painted on the active button can
 * only cut from one place to another; one absolutely positioned box, moved by transform,
 * travels — which is what makes the movement read as the answer to the click. The cost is
 * the offsets, the ResizeObserver and the first-paint rule below, all of which exist to
 * keep it on the tab it belongs to.
 *
 * THEME-AWARE THROUGHOUT: the rail, the pill and the labels are theme tokens
 * (`surface-*`, `line-*`, `ink`, `text-secondary`). The webapp paints the same two shapes
 * with a solid light rail and a translucent black pill, which it can afford — its pages
 * have one appearance. Transplanted here they would be a pill that disappears the moment
 * the window is dark, so every colour goes through a token instead.
 */
export interface TabStripItem {
  /** Stable identity, and what `onSelect` reports back. */
  key: string
  label: string
  icon?: LucideIcon
}

interface Pill {
  left: number
  width: number
}

export function TabStrip({
  items,
  activeKey,
  onSelect,
  ariaLabel,
}: {
  items: TabStripItem[]
  activeKey: string | undefined
  onSelect?: (key: string) => void
  ariaLabel: string
}) {
  const listRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([])

  /** Null until the active tab has been measured — the pill is not drawn before. */
  const [pill, setPill] = useState<Pill | null>(null)
  /**
   * Whether the pill may animate. False for its first appearance: a pill that slides in
   * from the left edge every time the page opens reads as a glitch, where the same
   * movement between two tabs reads as the answer to a click.
   */
  const [animate, setAnimate] = useState(false)

  // Falls back to the first tab rather than to none: every strip here always has an
  // active tab, and an unmatched key is a caller bug that should still render.
  const activeIndex = Math.max(0, items.findIndex((item) => item.key === activeKey))

  /**
   * Measure the active tab and put the pill on it. Layout effect, so the pill is placed
   * in the same frame the tab is painted in.
   *
   * The labels are a dependency because they change width — a translation, or a different
   * set of organizations — and a ResizeObserver watches the rail and every tab in it:
   * Cera Pro lands after first paint and widens the row under us, which would otherwise
   * leave the pill measured against text that no longer exists.
   */
  const labels = items.map((item) => item.label).join(' ')
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
  }, [activeIndex, labels])

  // One frame after the pill exists, so the transition applies to MOVES and not to the
  // initial placement.
  useEffect(() => {
    if (!pill || animate) return
    const id = requestAnimationFrame(() => setAnimate(true))
    return () => cancelAnimationFrame(id)
  }, [pill, animate])

  return (
    <nav aria-label={ariaLabel}>
      <div
        ref={listRef}
        className="relative inline-flex max-w-full gap-1 overflow-x-auto rounded-full bg-surface-subtle border border-line-subtle p-1"
      >
        {/* The moving background. `aria-hidden` because the active tab already says it is
            active — to a screen reader this is decoration. */}
        {pill && (
          <span
            aria-hidden
            className={`absolute bottom-1 top-1 left-0 rounded-full bg-surface-strong ${
              animate ? 'transition-[transform,width] duration-300 ease-out' : ''
            }`}
            style={{ transform: `translateX(${pill.left}px)`, width: pill.width }}
          />
        )}

        {items.map((item, index) => {
          const Icon = item.icon
          const active = index === activeIndex
          return (
            <button
              key={item.key}
              type="button"
              ref={(el) => {
                itemRefs.current[index] = el
              }}
              onClick={() => onSelect?.(item.key)}
              // `aria-current` is for the current PAGE; a view-state tab is a pressed
              // control instead, and the two are read out differently.
              aria-pressed={active}
              className={`relative z-10 flex shrink-0 items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                active ? 'text-ink' : 'text-text-secondary hover:text-ink'
              }`}
            >
              {Icon && <Icon className="w-3.5 h-3.5 shrink-0" />}
              {item.label}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
