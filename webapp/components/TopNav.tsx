'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Building2, ChevronDown, LogOut, UserRound } from 'lucide-react'
import { getSupabase } from '@/lib/supabase'

/**
 * App chrome, reduced to a logo and an account menu. It sits on the same canvas
 * as the page — no border, no panel — so the header reads as part of the page
 * rather than a bar over it. The sections that used to be nav pills live in the
 * account menu, which is the only remaining way to reach them.
 */

const MENU_LINKS = [
  { href: '/organization', label: 'Organization', icon: Building2 },
  { href: '/account', label: 'Account', icon: UserRound },
]

const MENU_ITEM =
  'flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm font-medium text-muted transition-colors hover:bg-canvas hover:text-ink'

export function TopNav({ email }: { email?: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close on an outside click or Escape — the two ways out people expect.
  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const signOut = async () => {
    await getSupabase().auth.signOut()
    router.replace('/')
  }

  return (
    <header className="sticky top-0 z-40 bg-canvas">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-5 sm:px-8">
        <Link href="/dashboard" className="shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/img/logo-readme-light.svg" alt="Magic Slash" className="h-6" />
        </Link>

        <div ref={menuRef} className="relative shrink-0">
          <button
            onClick={() => setOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={open}
            className={`flex items-center gap-2 rounded-full px-4 py-2.5 font-display text-sm font-bold transition-colors ${
              open ? 'bg-black/[0.05] text-ink' : 'text-muted hover:bg-black/[0.04] hover:text-ink'
            }`}
          >
            {email && <span className="max-w-[220px] truncate">{email}</span>}
            <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>

          {open && (
            <div
              role="menu"
              className="absolute right-0 top-full mt-2 w-52 overflow-hidden rounded-2xl border border-black/5 bg-white p-1 shadow-xl shadow-black/5"
            >
              {MENU_LINKS.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  role="menuitem"
                  onClick={() => setOpen(false)}
                  className={`${MENU_ITEM} rounded-xl`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {label}
                </Link>
              ))}
              <div className="my-1 h-px bg-black/5" />
              <button role="menuitem" onClick={signOut} className={`${MENU_ITEM} rounded-xl`}>
                <LogOut className="h-4 w-4 shrink-0" />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
