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

  // Load the anon-readable preview (org name, invited email, effective status).
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
      // 1. Establish a session: sign up (invitees create no org), or sign in if
      //    an account with this email already exists.
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
        // No session → email confirmation is required on this project.
        setError('Check your inbox to confirm your email, then reopen this link to finish.')
        setSubmitting(false)
        return
      }

      // 2. Accept the invitation (requires the session established above).
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
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6">
      <div className="w-full rounded-2xl border border-border bg-bg-secondary p-8 shadow-2xl">
        {phase === 'loading' && (
          <p className="text-center text-text-secondary">Loading your invitation…</p>
        )}

        {phase === 'invalid' && (
          <div className="text-center">
            <h1 className="text-xl font-semibold">Invitation not found</h1>
            <p className="mt-2 text-sm text-text-secondary">
              This invitation link is invalid. Ask an admin to send you a new one.
            </p>
          </div>
        )}

        {phase === 'unavailable' && preview && (
          <div className="text-center">
            <h1 className="text-xl font-semibold">Invitation unavailable</h1>
            <p className="mt-2 text-sm text-text-secondary">
              {UNAVAILABLE_COPY[preview.status] ?? 'This invitation can no longer be used.'}
            </p>
            {preview.status === 'accepted' && (
              <Link
                href="/download"
                className="mt-6 inline-block rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
              >
                Download the app
              </Link>
            )}
          </div>
        )}

        {phase === 'ready' && preview && (
          <>
            <div className="mb-6 text-center">
              <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-accent/15 px-3 py-1 text-xs font-medium text-accent">
                {preview.role === 'admin' ? 'Admin invitation' : 'Team invitation'}
              </div>
              <h1 className="text-xl font-semibold">
                Join <span className="text-accent">{preview.org_name}</span>
              </h1>
              <p className="mt-2 text-sm text-text-secondary">
                Create your Magic Slash account to accept this invitation.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-text-secondary">Email</label>
                <input
                  type="email"
                  value={preview.email}
                  readOnly
                  className="w-full cursor-not-allowed rounded-lg border border-border bg-bg-tertiary px-3 py-2 text-sm text-text-secondary"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-text-secondary">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  autoFocus
                  placeholder="At least 8 characters"
                  className="w-full rounded-lg border border-border bg-bg-tertiary px-3 py-2 text-sm text-white focus:border-accent focus:outline-none"
                />
              </div>

              {error && (
                <div className="rounded-lg border border-red/30 bg-red/10 px-3 py-2 text-xs text-red">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || password.length < 8}
                className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? 'Joining…' : `Accept & join ${preview.org_name}`}
              </button>
            </form>
          </>
        )}

        {phase === 'done' && preview && (
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green/15 text-2xl text-green">
              ✓
            </div>
            <h1 className="text-xl font-semibold">You&apos;re in!</h1>
            <p className="mt-2 text-sm text-text-secondary">
              You&apos;ve joined <span className="text-white">{preview.org_name}</span>. Download the
              app and sign in with your new account to get started.
            </p>
            <Link
              href="/download"
              className="mt-6 inline-block rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
            >
              Download the app
            </Link>
          </div>
        )}
      </div>
    </main>
  )
}
