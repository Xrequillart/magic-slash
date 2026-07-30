'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Building2, GaugeCircle, LogOut, Users } from 'lucide-react'

/**
 * The back-office chrome. Replaces AppShell for everything under /admin.
 *
 * It shares the app's blue, and carries the demarcation through STRUCTURE instead:
 *
 *  1. FULL BLEED. No centered max-w-5xl column. Tables need the width, and the
 *     absence of the column the rest of the app is built on is felt immediately.
 *  2. A NAV BAR THAT IS A SURFACE. The user pages put their header straight on the
 *     canvas — no border, no panel — so a white bar spanning the full width, ruled
 *     off from the blue ground below it, is recognisably not that header even though
 *     both sit at the top.
 *  3. AN EXIT, not a back link. It sits at the leading edge, where a browser puts
 *     Back and where the eye starts, because leaving here is a change of context and
 *     not a step up a hierarchy. Icon-only, so the row reads sections-first.
 *
 * Horizontal, not the column it replaces: three entities do not fill a 224px
 * column, and the width that column ate is exactly what the tables want. Three words
 * and nothing else — the row counts that used to sit beside each entry are gone, and
 * with them the shell's only reason to know anything about the data. Selection is a
 * brand-tinted pill and nothing else — no underline, since a bar under an item in a
 * bar that already has a bottom rule is two horizontal lines saying different things
 * two pixels apart. The pill SLIDES between items rather than blinking off one and on
 * the next, so the eye is carried from where selection was to where it went. See
 * useSlidingIndicator below.
 *
 * Room for growth: the bar holds a handful more sections before it crowds the
 * email, and past that the overflow goes in a menu — a column would only be worth
 * bringing back for nested groups, which a flat CRUD console does not have.
 */

const SECTIONS = [
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/organizations', label: 'Organizations', icon: Building2 },
  { href: '/admin/stats', label: 'Fleet', icon: GaugeCircle },
] as const

/** Where the sliding pill should be, in pixels relative to the list. */
interface IndicatorRect {
  left: number
  width: number
}

/**
 * Measures the active nav item so one shared element can be moved onto it.
 *
 * The pill cannot be a border on the item itself, because CSS has nothing to
 * transition BETWEEN two elements — the only way to animate the move is to have a
 * single element and change where it is. That means pixels, and pixels measured from
 * the DOM go stale, so the ResizeObserver is the substance of this hook rather than a
 * precaution. Two things resize these items after the first paint, both of them
 * normal: the `sm` breakpoint swapping the text labels in, and Cera Pro finishing
 * loading and re-laying-out the labels it had drawn in the fallback.
 *
 * Returns null when nothing is active — no route matched, or the very first paint
 * before the effect has run — and the caller renders no pill at all. That is what
 * keeps the pill from being born at left:0 and skating across the bar on arrival.
 */
function useSlidingIndicator(listRef: React.RefObject<HTMLElement>, pathname: string) {
  const [rect, setRect] = useState<IndicatorRect | null>(null)

  useEffect(() => {
    const list = listRef.current
    if (!list) return

    const measure = () => {
      // Read the DOM rather than tracking the active index in state: `aria-current`
      // is already the single source of truth for which item is selected, and asking
      // it means the pill cannot disagree with the item that looks selected.
      const active = list.querySelector<HTMLElement>('[aria-current="page"]')
      if (!active) {
        setRect(null)
        return
      }
      // offsetLeft, not getBoundingClientRect: it is relative to the positioned list
      // and so is unaffected by page scroll or by the sticky header's own offset.
      const next = { left: active.offsetLeft, width: active.offsetWidth }
      // Bail on an unchanged measurement. The observer fires for reasons that do not
      // move the pill, and a fresh object every time would re-render on each one.
      setRect((prev) => (prev && prev.left === next.left && prev.width === next.width ? prev : next))
    }

    measure()

    const observer = new ResizeObserver(measure)
    // The list catches its own reflow; each item is observed too, because a label can
    // change an item's width without changing the list's. The pill is skipped — it is
    // a child of this list and its width is animated, so observing it would call
    // measure on every frame of its own transition.
    observer.observe(list)
    for (const item of Array.from(list.children)) {
      if (!(item as HTMLElement).dataset.indicator) observer.observe(item)
    }
    return () => observer.disconnect()
  }, [listRef, pathname])

  return rect
}

export function ConsoleShell({
  email,
  children,
}: {
  email?: string
  children: React.ReactNode
}) {
  const pathname = usePathname() ?? ''
  const listRef = useRef<HTMLUListElement>(null)
  const indicator = useSlidingIndicator(listRef, pathname)

  return (
    <div className="min-h-screen bg-regie-ground">
      {/* Full bleed and flush to the top: no rounding, no side borders, and the rule
          only along the bottom, because a corner radius on an edge-to-edge bar reads
          as a card that failed to fit rather than as a deliberate shape. No shadow
          either — the bottom rule alone separates the bar from the ground, and the
          white-on-blue change of surface does the rest of that work. */}
      <header className="sticky top-0 z-40 flex h-14 w-full items-center gap-2 border-b border-regie-rule bg-regie-panel px-5 sm:gap-3 sm:px-7">
        {/* The exit, at the leading edge and icon-only. Square rather than a pill so
            it reads as a control and not as a fourth, unlabelled section — the nav
            items right of it are also icons at this size. `aria-label` carries the
            name the button no longer prints; `title` alone would leave it unnamed to
            a screen reader. */}
        <Link
          href="/dashboard"
          aria-label="Quitter le back-office"
          title="Quitter le back-office"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-black/[0.04] text-ink transition-colors hover:bg-black/[0.08]"
        >
          {/* Mirrored, so the arrow points the way the click goes — out to the left,
              towards the edge the button sits on. Lucide draws LogOut leaving to the
              right, which fights the placement. A flip rather than a different icon
              keeps the door: it says "leave this room", where a bare ArrowLeft would
              say "back one step". */}
          <LogOut className="h-4 w-4 scale-x-[-1]" />
        </Link>

        <div className="mx-0.5 h-6 w-px shrink-0 bg-regie-rule-soft" />

        {/* The logo doubles as the way home, as it does in the user chrome, so the
            one thing everybody already tries clicking does what they expect. The
            badge beside it names the place: on a blue ground with rounded cards the
            console could pass for a user page at a glance. */}
        <Link href="/dashboard" className="shrink-0" title="Retour à l'application">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/img/logo-readme-light.svg" alt="Magic Slash" className="h-5" />
        </Link>
        <span className="hidden shrink-0 rounded-full bg-brand/10 px-2 py-0.5 font-display text-[10px] font-bold uppercase tracking-[0.12em] text-brand sm:inline-block">
          Back-office
        </span>

        <div className="mx-0.5 hidden h-6 w-px shrink-0 bg-regie-rule-soft sm:block" />

        {/* Labels drop under sm rather than the items disappearing behind a toggle:
            switching entity is the most frequent action here, and a console that
            hides its own map costs a tap every time. */}
        <nav aria-label="Sections du back-office" className="min-w-0">
          <ul ref={listRef} className="relative flex items-center gap-0.5 sm:gap-1">
            {/* The pill. An `li` because a `ul` may only contain them, and aria-hidden
                because it says nothing `aria-current` on the real item does not
                already say.
                Width is animated alongside the move: the sections have different
                label lengths, so a fixed-width pill would either overhang Fleet or
                clip Organizations. Both properties come from `style` rather than a
                class, since they are measurements and not design tokens.
                `inset-y-0` and not a fixed height — it takes the list's height, which
                is the items' height, so the pill matches whatever they measure. */}
            {indicator && (
              <li
                aria-hidden
                data-indicator
                className="absolute inset-y-0 left-0 z-0 rounded-lg bg-brand/[0.08] transition-[transform,width] duration-300 ease-out motion-reduce:transition-none"
                style={{ width: indicator.width, transform: `translateX(${indicator.left}px)` }}
              />
            )}
            {SECTIONS.map(({ href, label, icon: Icon }) => {
              // Prefix match so a record route keeps its section lit:
              // /admin/users/<uuid> is still Users. The trailing slash stops
              // /admin/users-elsewhere from matching if such a route appears.
              const active = pathname === href || pathname.startsWith(`${href}/`)

              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={active ? 'page' : undefined}
                    title={label}
                    // `relative z-10`: an absolutely positioned sibling paints above
                    // static content, so without this the pill would cover the label
                    // it is meant to sit behind.
                    // Hover is a darkening of the text and nothing else. A tinted
                    // hover fill would be a second pill competing with the one that
                    // marks the actual selection, and on a bar this small the two
                    // read as two selected items for as long as the cursor rests.
                    className={`relative z-10 flex items-center gap-2 rounded-lg px-2 py-1.5 font-display text-[12px] font-bold uppercase tracking-[0.06em] transition-colors sm:px-2.5 ${
                      active ? 'text-brand' : 'text-regie-dim hover:text-ink'
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="hidden sm:inline">{label}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        {email && (
          <p
            className="ml-auto hidden max-w-[220px] shrink-0 truncate pl-3 font-mono text-[11px] text-regie-dim lg:block"
            title={email}
          >
            {email}
          </p>
        )}
      </header>

      {/* The page inset now lives here rather than on the wrapper, which is what lets
          the bar above run edge to edge while the content keeps its margins. */}
      <main className="min-w-0 px-5 py-5 sm:px-7">{children}</main>
    </div>
  )
}

/**
 * A page's title row inside the console: the heading, and what the page is for.
 *
 * It used to print the route as a path — `admin / users` — above the title. Dropped:
 * the nav is two lines up and lights the section you are in, so the path restated
 * what the pill already said, and on a record page it restated the title too.
 *
 * `meta` is the line UNDER the title, for the identifier a record is known by
 * elsewhere — the uuid a log line or a database query carries, where the title is
 * the email a human uses. A node rather than a string because it holds a control:
 * an id worth showing is an id worth copying.
 */
export function PageHead({
  title,
  meta,
  description,
  action,
}: {
  title: string
  meta?: React.ReactNode
  description?: string
  action?: React.ReactNode
}) {
  return (
    <header className="mb-5 flex flex-wrap items-end gap-4 px-1">
      <div className="min-w-0">
        <h1 className="font-display text-[26px] font-black leading-tight tracking-tight text-ink">
          {title}
        </h1>
        {meta && <div className="mt-1.5">{meta}</div>}
        {description && <p className="mt-1.5 max-w-2xl text-[13px] text-regie-dim">{description}</p>}
      </div>
      {action && <div className="ml-auto">{action}</div>}
    </header>
  )
}
