import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Avatar } from './Avatar'
import { Icon } from './Icon'
import { Text } from './Text'
import type { IconComponent } from './types'

/**
 * A PILL RAIL WHOSE BACKGROUND SLIDES to the tab you pick — the app's one tab row.
 *
 * It is what the settings modal's header switches pages with, what a repository's
 * configuration is cut into, what the Team page switches organizations with, and what
 * the settings panel beside the quick-settings sheet uses. It lived in
 * `desktop/src/renderer/components/` and moved here unchanged in behaviour, for this
 * folder's one rule: what the desktop draws, the design system owns.
 *
 * WHY THE PILL IS MEASURED and not styled. A background painted on the active button can
 * only cut from one place to another; one absolutely positioned box, moved by transform,
 * travels — which is what makes the movement read as the answer to the click. The cost is
 * the offsets, the ResizeObserver and the first-paint rule below, all of which exist to
 * keep it on the tab it belongs to.
 *
 * THEME-AWARE THROUGHOUT: the rail, the pill and the labels are theme tokens
 * (`surface-*`, `line-*`, `ink`, `text-secondary`). The marketing site paints the same
 * two shapes with a solid light rail and a translucent black pill, which it can afford —
 * its pages have one appearance. Transplanted here they would be a pill that disappears
 * the moment the window is dark, so every colour goes through a token instead.
 *
 * THE SITE KEEPS ITS OWN COPY, and that is deliberate rather than a migration left half
 * done: `webapp/components/TabStrip.tsx` renders a `<Link>` per tab because its tabs are
 * ROUTES. Every tab here is view state and the desktop has no router. Two components that
 * agree on a drawing and disagree on what a tab IS are two components.
 */

export interface TabStripItem {
  /** Stable identity, and what `onSelect` reports back. */
  key: string
  label: string
  /** The mark before the word. From `@ds/desktop/icons`. */
  icon?: IconComponent
  /**
   * A PERSON in front of the word instead of a glyph — the settings tab wears the
   * signed-in account's photo. Wins over `icon`.
   *
   * DATA AND NOT A NODE, which is the whole reason it can exist here, and it is
   * `Label`'s `avatar` to the letter: `{ src, alt }` is what this hands to `Avatar`,
   * where a `ReactNode` would be a slot and the end of this component being simple.
   * It took a node while it lived in the app — the account's own avatar component,
   * passed in — and a design system that receives its children instead of importing
   * them is a design system one call site can redraw.
   *
   * `alt` is required for `Avatar`'s reason: a strip cannot invent alternative text.
   * The empty string is the right answer HERE, and the one the app passes — the label
   * beside the photo already names the person, and a reader hearing "Account photo
   * Xavier, Xavier" is hearing the decoration read out loud.
   *
   * Always the BARE glyph when there is no photo: the account button this replaced drew
   * a naked `CircleUserRound`, and a badge appearing behind it would be a visible change
   * for everyone who never uploads a picture.
   */
  avatar?: { src: string | null; alt: string }
}

interface Pill {
  left: number
  width: number
}

export interface TabStripProps {
  items: TabStripItem[]
  /** The tab in force. CONTROLLED: which page is open is what decides what the caller
   *  draws under the rail, so the caller holds it. */
  activeKey: string | undefined
  onSelect?: (key: string) => void
  /** Names the set for a screen reader — "Settings pages". Translated. */
  ariaLabel: string
  /** Margins and placement. Not the ground, the radius or the type. */
  className?: string
}

export function TabStrip({ items, activeKey, onSelect, ariaLabel, className = '' }: TabStripProps) {
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
    <nav aria-label={ariaLabel} className={className}>
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
              className={`relative z-10 flex shrink-0 items-center gap-2 rounded-full px-3.5 py-1.5
                border-none bg-transparent cursor-pointer transition-colors ${
                active ? 'text-ink' : 'text-text-secondary hover:text-ink'
              }`}
            >
              {item.avatar ? (
                <Avatar src={item.avatar.src} alt={item.avatar.alt} size="xs" fallback="glyph" />
              ) : (
                item.icon && <Icon glyph={item.icon} size="sm" tone="inherit" className="shrink-0" />
              )}
              <Text size="xs" weight="medium" tone="inherit" className="whitespace-nowrap">
                {item.label}
              </Text>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
