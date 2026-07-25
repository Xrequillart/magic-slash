'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabase } from '@/lib/supabase'
import { HOME_PATH, useRequireGuest } from '@/lib/session'
import { FullPageLoader } from '@/components/ui'

export default function Login() {
  const router = useRouter()
  // Already signed in → straight to the dashboard, without painting the form.
  const { pending } = useRequireGuest()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting) return
    setSubmitting(true)
    setError(null)
    const { error } = await getSupabase().auth.signInWithPassword({ email, password })
    if (error) {
      setError('Incorrect email or password.')
      setSubmitting(false)
      return
    }
    router.replace(HOME_PATH)
  }

  if (pending) return <FullPageLoader tone="login" />

  return (
    <main className="flex min-h-screen items-center justify-center bg-softblue px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/img/logo-readme-light.svg" alt="Magic Slash" className="h-8" />
          <h1 className="mt-8 font-display text-3xl font-black text-ink">Welcome back</h1>
          <p className="mt-2 text-sm text-muted">Sign in to your Magic Slash account.</p>
        </div>

        <div className="rounded-2xl border border-black/5 bg-white p-7 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                placeholder="you@company.com"
                className="w-full rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-sm text-ink outline-none transition-colors focus:border-accent"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-sm text-ink outline-none transition-colors focus:border-accent"
              />
            </div>

            {error && (
              <div className="rounded-xl border border-red/20 bg-red/5 px-3.5 py-2.5 text-xs text-red">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || !email || !password}
              className="w-full rounded-full bg-ink px-4 py-3 font-display text-sm font-medium text-white transition-colors hover:bg-black/80 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {submitting ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-muted">
          Invited to a team? Open your invitation link to create your account.
        </p>
      </div>
    </main>
  )
}
