'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getSupabase } from '@/lib/supabase'

interface InvitationPreview {
  org_name: string
  email: string
  role: 'user' | 'admin'
  status: 'pending' | 'accepted' | 'revoked' | 'expired'
  expires_at: string | null
}

type Phase = 'loading' | 'invalid' | 'unavailable' | 'ready' | 'done'

// Supabase surfaces "already registered" with varying copy across versions;
// match loosely so an existing invitee falls through to sign-in.
function isAlreadyRegistered(message: string): boolean {
  const m = message.toLowerCase()
  return m.includes('already registered') || m.includes('already been registered') || m.includes('user already exists')
}

const UNAVAILABLE_COPY: Record<string, string> = {
  accepted: 'This invitation has already been accepted. Just download the app and sign in.',
  revoked: 'This invitation has been revoked. Ask an admin to send you a new one.',
  expired: 'This invitation has expired. Ask an admin to send you a new one.',
}

export default function InvitePage({ params }: { params: { token: string } }) {
  const token = params.token
  const [phase, setPhase] = useState<Phase>('loading')
  const [preview, setPreview] = useState<InvitationPreview | null>(null)
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const { data, error } = await getSupabase().rpc('get_invitation_preview', {
          invitation_token: token,
        })
        if (!active) return
        const row = (data as InvitationPreview[] | null)?.[0]
        if (error || !row) {
          setPhase('invalid')
          return
        }
        setPreview(row)
        setPhase(row.status === 'pending' ? 'ready' : 'unavailable')
      } catch {
        if (active) setPhase('invalid')
      }
    })()
    return () => {
      active = false
    }
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!preview || submitting) return
    setSubmitting(true)
    setError(null)
    const supabase = getSupabase()
    const email = preview.email

    try {
      const signUp = await supabase.auth.signUp({ email, password })
      if (signUp.error) {
        if (isAlreadyRegistered(signUp.error.message)) {
          const signIn = await supabase.auth.signInWithPassword({ email, password })
          if (signIn.error) {
            setError('An account already exists for this email. Check your password and try again.')
            setSubmitting(false)
            return
          }
        } else {
          setError(signUp.error.message)
          setSubmitting(false)
          return
        }
      } else if (!signUp.data.session) {
        setError('Check your inbox to confirm your email, then reopen this link to finish.')
        setSubmitting(false)
        return
      }

      const { error: acceptError } = await supabase.rpc('accept_invitation', {
        invitation_token: token,
      })
      if (acceptError) {
        setError(acceptError.message)
        setSubmitting(false)
        return
      }

      setPhase('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      setSubmitting(false)
    }
  }

  return (
    <main className="flex min-h-screen">
      {/* Left — illustration */}
      <aside className="hidden w-1/2 flex-col items-center justify-center bg-softblue px-12 lg:flex">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/img/logo-readme-light.svg" alt="Magic Slash" className="absolute left-10 top-8 h-7" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/img/mascot-peace.png" alt="" className="w-64 drop-shadow-xl" />
        <h2 className="mt-10 max-w-sm text-center font-display text-3xl font-black leading-tight text-ink">
          Your team is waiting for you.
        </h2>
        <p className="mt-3 max-w-sm text-center text-muted">
          Join your organization on Magic Slash and start shipping with your AI dev agents.
        </p>
      </aside>

      {/* Right — form */}
      <section className="flex w-full flex-col items-center justify-center px-6 py-12 lg:w-1/2">
        {/* mobile logo */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/img/logo-readme-light.svg" alt="Magic Slash" className="mb-10 h-7 lg:hidden" />

        <div className="w-full max-w-sm">
          {phase === 'loading' && <p className="text-center text-muted">Loading your invitation…</p>}

          {phase === 'invalid' && (
            <div className="text-center">
              <h1 className="font-display text-2xl font-black text-ink">Invitation not found</h1>
              <p className="mt-2 text-sm text-muted">
                This invitation link is invalid. Ask an admin to send you a new one.
              </p>
            </div>
          )}

          {phase === 'unavailable' && preview && (
            <div className="text-center">
              <h1 className="font-display text-2xl font-black text-ink">Invitation unavailable</h1>
              <p className="mt-2 text-sm text-muted">
                {UNAVAILABLE_COPY[preview.status] ?? 'This invitation can no longer be used.'}
              </p>
              {preview.status === 'accepted' && (
                <Link
                  href="/download"
                  className="mt-6 inline-block rounded-full bg-ink px-6 py-3 font-display text-sm font-medium text-white transition-colors hover:bg-black/80"
                >
                  Download the app
                </Link>
              )}
            </div>
          )}

          {phase === 'ready' && preview && (
            <>
              <div className="mb-8">
                <span className="inline-flex items-center rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
                  {preview.role === 'admin' ? 'Admin invitation' : 'Team invitation'}
                </span>
                <h1 className="mt-4 font-display text-3xl font-black leading-tight text-ink">
                  Join <span className="text-brand">{preview.org_name}</span>
                </h1>
                <p className="mt-2 text-sm text-muted">
                  Create your Magic Slash account to accept this invitation.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted">Email</label>
                  <input
                    type="email"
                    value={preview.email}
                    readOnly
                    className="w-full cursor-not-allowed rounded-xl border border-black/10 bg-black/[0.03] px-3.5 py-2.5 text-sm text-muted"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    autoFocus
                    placeholder="At least 8 characters"
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
                  disabled={submitting || password.length < 8}
                  className="w-full rounded-full bg-ink px-4 py-3 font-display text-sm font-medium text-white transition-colors hover:bg-black/80 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {submitting ? 'Joining…' : `Accept & join ${preview.org_name}`}
                </button>
              </form>
            </>
          )}

          {phase === 'done' && preview && (
            <div className="text-center">
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-green/10 text-3xl text-green">
                ✓
              </div>
              <h1 className="font-display text-3xl font-black text-ink">You&apos;re in!</h1>
              <p className="mt-2 text-sm text-muted">
                You&apos;ve joined <span className="font-medium text-ink">{preview.org_name}</span>.
                Download the app and sign in with your new account to get started.
              </p>
              <Link
                href="/download"
                className="mt-6 inline-block rounded-full bg-ink px-6 py-3 font-display text-sm font-medium text-white transition-colors hover:bg-black/80"
              >
                Download the app
              </Link>
            </div>
          )}
        </div>
      </section>
    </main>
  )
}
