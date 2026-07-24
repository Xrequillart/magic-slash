'use client'

import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { LayoutDashboard, Building2, UserRound, LogOut } from 'lucide-react'
import { getSupabase } from '@/lib/supabase'

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/organization', label: 'Organization', icon: Building2 },
  { href: '/account', label: 'Account', icon: UserRound },
]

/**
 * Signed-in app chrome: a fixed left nav rail (logo, sections, account footer)
 * and a scrollable content column. Shared by the dashboard, organization, and
 * account pages.
 */
export function AppShell({ email, children }: { email?: string; children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()

  const signOut = async () => {
    await getSupabase().auth.signOut()
    router.replace('/')
  }

  return (
    <div className="flex min-h-screen bg-canvas">
      <aside className="fixed inset-y-0 left-0 flex w-60 flex-col border-r border-black/5 bg-white">
        <Link href="/dashboard" className="flex h-16 items-center px-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/img/logo-readme-light.svg" alt="Magic Slash" className="h-6" />
        </Link>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  active ? 'bg-brand/10 text-brand' : 'text-muted hover:bg-black/[0.04] hover:text-ink'
                }`}
              >
                <Icon className="h-[18px] w-[18px]" />
                {label}
              </Link>
            )
          })}
        </nav>

        <div className="border-t border-black/5 p-3">
          {email && <div className="truncate px-3 pb-2 text-xs text-muted">{email}</div>}
          <button
            onClick={signOut}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted transition-colors hover:bg-black/[0.04] hover:text-ink"
          >
            <LogOut className="h-[18px] w-[18px]" />
            Sign out
          </button>
        </div>
      </aside>

      <div className="ml-60 flex-1">
        <div className="mx-auto max-w-3xl px-8 py-12">{children}</div>
      </div>
    </div>
  )
}

/** Monospace slash-command eyebrow — the through-line signature across pages. */
export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-3 font-mono text-xs font-medium tracking-tight text-brand">{children}</div>
  )
}
