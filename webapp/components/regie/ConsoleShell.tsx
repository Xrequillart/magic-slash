'use client'

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
 *  2. A SIDE NAV where every user page has a top bar. A floating rounded card on
 *     the blue ground, with a brand-tinted active item marked by the same 2px bar
 *     the selected table row carries — selection reads identically in both places.
 *  3. AN EXIT, not a back link. "Quitter" is a labelled way out rather than a
 *     breadcrumb, because leaving here is a change of context and not a step up a
 *     hierarchy.
 *
 * A column, not the tab bar it replaces: tabs say "three views of one thing", a
 * column says "the entities of a system", which is what a CRUD console is. Counts
 * sit next to each entry because the first question about a list is how long it is,
 * and answering it in the nav saves opening the section to find out.
 */

const SECTIONS = [
  { href: '/admin/users', label: 'Users', icon: Users, countKey: 'users' },
  { href: '/admin/organizations', label: 'Organizations', icon: Building2, countKey: 'orgs' },
  { href: '/admin/stats', label: 'Fleet', icon: GaugeCircle, countKey: 'devices' },
] as const

export type ConsoleCounts = Partial<Record<'users' | 'orgs' | 'devices', number>>

export function ConsoleShell({
  email,
  counts = {},
  children,
}: {
  email?: string
  counts?: ConsoleCounts
  children: React.ReactNode
}) {
  const pathname = usePathname() ?? ''

  return (
    <div className="flex min-h-screen gap-3 bg-regie-ground p-3">
      {/* The nav card. Collapses to icons under lg rather than disappearing behind
          a toggle: switching entity is the most frequent action here, and a console
          that hides its own map costs a tap every time.
          `h-[calc(100vh-1.5rem)]` is the viewport less the p-3 above and below, so
          the card stays fully visible instead of running under the fold. */}
      <nav
        aria-label="Sections du back-office"
        className="sticky top-3 flex h-[calc(100vh-1.5rem)] w-16 shrink-0 flex-col overflow-hidden rounded-2xl border border-regie-rule bg-regie-panel shadow-sm shadow-brand/[0.04] lg:w-56"
      >
        {/* The badge that names the place. On a blue ground with rounded cards the
            console could pass for a user page at a glance, so this says outright
            where you are — the job the greige used to do. */}
        <div className="border-b border-regie-rule-soft px-3 py-4 lg:px-4">
          <span className="inline-block rounded-full bg-brand/10 px-2 py-0.5 font-display text-[10px] font-bold uppercase tracking-[0.12em] text-brand">
            Back-office
          </span>
          <p className="mt-1.5 hidden font-mono text-[11px] text-regie-dim lg:block">magic-slash</p>
        </div>

        <ul className="flex-1 space-y-0.5 p-2">
          {SECTIONS.map(({ href, label, icon: Icon, countKey }) => {
            // Prefix match so a record route keeps its section lit:
            // /admin/users/<uuid> is still Users. The trailing slash stops
            // /admin/users-elsewhere from matching if such a route appears.
            const active = pathname === href || pathname.startsWith(`${href}/`)
            const count = counts[countKey]

            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  title={label}
                  // Same 2px left marker as the selected table row, and carried by
                  // every item so activating one cannot shift its label sideways.
                  className={`flex items-center gap-2.5 rounded-xl border-l-2 px-2.5 py-2 font-display text-[12px] font-bold uppercase tracking-[0.06em] transition-colors lg:px-3 ${
                    active
                      ? 'border-l-brand bg-brand/[0.08] text-brand'
                      : 'border-l-transparent text-regie-dim hover:bg-regie-tint hover:text-ink'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="hidden lg:inline">{label}</span>
                  {typeof count === 'number' && (
                    <span className="ml-auto hidden font-mono text-[11px] tabular-nums text-regie-dim lg:inline">
                      {count}
                    </span>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>

        <div className="border-t border-regie-rule-soft p-2 lg:p-3">
          {email && (
            <p
              className="mb-1.5 hidden truncate px-1 font-mono text-[11px] text-regie-dim lg:block"
              title={email}
            >
              {email}
            </p>
          )}
          <Link
            href="/dashboard"
            title="Quitter le back-office"
            className="flex items-center gap-2 rounded-xl bg-black/[0.04] px-2.5 py-2 font-display text-[11px] font-bold uppercase tracking-[0.06em] text-ink transition-colors hover:bg-black/[0.08]"
          >
            <LogOut className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden lg:inline">Quitter</span>
          </Link>
        </div>
      </nav>

      <main className="min-w-0 flex-1 px-2 py-3 sm:px-4">{children}</main>
    </div>
  )
}

/**
 * A page's title row inside the console: the route as a path, then the heading.
 *
 * The path is the signature typographic device, and it is not decoration: it is
 * where you are, written the way this product writes everything else — the
 * landing page's eyebrows, the skills, the CLI are all `/magic:something`. A
 * back-office for a slash-command tool can afford to say `admin / users` instead
 * of printing a 5xl headline, which is what the user pages do.
 */
export function PageHead({
  path,
  title,
  description,
  action,
}: {
  path: string
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <header className="mb-5 flex flex-wrap items-end gap-4 px-1">
      <div className="min-w-0">
        <p className="font-mono text-[12px] text-brand">{path}</p>
        <h1 className="mt-1 font-display text-[26px] font-black leading-tight tracking-tight text-ink">
          {title}
        </h1>
        {description && <p className="mt-1.5 max-w-2xl text-[13px] text-regie-dim">{description}</p>}
      </div>
      {action && <div className="ml-auto">{action}</div>}
    </header>
  )
}
