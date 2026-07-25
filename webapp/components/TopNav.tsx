'use client'

import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { LayoutDashboard, Building2, UserRound, LogOut } from 'lucide-react'
import { getSupabase } from '@/lib/supabase'

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/organization', label: 'Organization', icon: Building2 },
  { href: '/settings', label: 'Settings', icon: UserRound },
]

/** Horizontal app chrome: logo, sections, account actions. */
export function TopNav({ email }: { email?: string }) {
  const router = useRouter()
  const pathname = usePathname()

  const signOut = async () => {
    await getSupabase().auth.signOut()
    router.replace('/')
  }

  return (
    <header className="sticky top-0 z-40 border-b border-black/5 bg-white/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-5xl items-center gap-4 px-5 sm:px-8">
        <Link href="/dashboard" className="shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/img/logo-readme-light.svg" alt="Magic Slash" className="h-6" />
        </Link>

        <nav className="flex min-w-0 flex-1 items-center gap-1">
          {NAV.map(({ href, label, icon: Icon }) => {
            // startsWith, not equality — keeps the pill lit on future sub-routes.
            const active = pathname === href || pathname.startsWith(`${href}/`)
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition-colors ${
                  active ? 'bg-brand/10 text-brand' : 'text-muted hover:bg-black/[0.04] hover:text-ink'
                }`}
              >
                <Icon className="h-[18px] w-[18px] shrink-0" />
                <span className="hidden sm:inline">{label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-3">
          {email && <span className="hidden max-w-[180px] truncate text-xs text-muted md:block">{email}</span>}
          <button
            onClick={signOut}
            title="Sign out"
            className="flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-black/[0.04] hover:text-ink"
          >
            <LogOut className="h-[18px] w-[18px] shrink-0" />
            <span className="hidden md:inline">Sign out</span>
          </button>
        </div>
      </div>
    </header>
  )
}
