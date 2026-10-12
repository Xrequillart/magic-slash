'use client'

import { useEffect, useState } from 'react'
import { getSupabase } from '@/lib/supabase'
import { postAcceptUrl } from '@/lib/inviteLink'
import { DESKTOP_DOWNLOAD_URL } from '@/lib/desktopRelease'
import { useT } from '@/lib/i18n/useLanguage'
import type { MessageKey } from '@/lib/i18n'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { Logo } from '@/components/Logo'
import { Button, ButtonLink, Input } from '@/components/ui'

interface InvitationPreview {
  org_name: string
  email: string
  role: 'user' | 'admin'
  status: 'pending' | 'accepted' | 'revoked' | 'expired'
  expires_at: string | null
}

// No 'done' phase: a successful acceptance leaves for the product, where the install
// banner picks up the "download the app" nudge. It leaves the HOST too — see
// `postAcceptUrl`, and `hostRouting.ts` for why a relative path cannot work here.
type Phase = 'loading' | 'invalid' | 'unavailable' | 'ready'

// Supabase surfaces "already registered" with varying copy across versions;
// match loosely so an existing invitee falls through to sign-in.
function isAlreadyRegistered(message: string): boolean {
  const m = message.toLowerCase()
  return m.includes('already registered') || m.includes('already been registered') || m.includes('user already exists')
}

const UNAVAILABLE_KEYS: Record<string, MessageKey> = {
  accepted: 'invite.unavailable.accepted',
  revoked: 'invite.unavailable.revoked',
  expired: 'invite.unavailable.expired',
}

export default function InvitePage({ params }: { params: { token: string } }) {
  const token = params.token
  const { t } = useT()
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
            setError(t('invite.error.exists'))
            setSubmitting(false)
            return
          }
        } else {
          setError(signUp.error.message)
          setSubmitting(false)
          return
        }
      } else if (!signUp.data.session) {
        setError(t('invite.error.confirmEmail'))
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

      // Signed in and a member: hand over to the product, on its own host. A full
      // page load rather than a route transition, because this leaves the invite host
      // entirely — `postAcceptUrl` explains why a client-side `/dashboard` could not
      // work from here. Keep `submitting` true so the button stays disabled while the
      // browser navigates away.
      window.location.replace(postAcceptUrl(window.location.origin))
    } catch (err) {
      setError(err instanceof Error ? err.message : t('invite.error.generic'))
      setSubmitting(false)
    }
  }

  return (
    <main className="flex min-h-screen">
      {/* Left — illustration.

          WHITE, AND WORDLESS. It was a blue panel carrying the mark, a mascot, a heading
          and a paragraph — four things competing with the form that is the only reason
          anyone opens this page. What is left is the mark and one drawing, on the same
          ground as the form beside it: the page reads as one surface now rather than as
          two halves arguing.

          `relative` so the mark hangs off THIS column. It was `absolute` inside a static
          parent, which pinned it to the page — the same place, by luck, and only while
          this column starts at the page's own left edge. */}
      <aside className="relative hidden w-1/2 flex-col items-center justify-center bg-white px-12 lg:flex">
        <Logo size="lg" className="absolute left-10 top-8" />
        {/* `alt=""` because it is a decoration: it says nothing the heading in the next
            column does not, and a screen reader has no use for a description of it. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/img/illustration-launch.svg" alt="" className="w-full max-w-lg" />
      </aside>

      {/* Right — form */}
      <section className="relative flex w-full flex-col items-center justify-center px-6 py-12 lg:w-1/2">
        {/* Top of the form column, not of the page: on a wide screen the left half is
            an illustration, and a control floating over it would look unmoored. */}
        <div className="absolute right-6 top-6">
          <LanguageSwitcher />
        </div>

        {/* The mark, for the one layout where the column beside it is not on screen.
            `hidden` is `display:none`, so only ever one of the two is in the
            accessibility tree and neither has to be silenced for the other. */}
        <Logo size="lg" className="mb-10 mt-12 lg:hidden" />

        <div className="w-full max-w-sm">
          {phase === 'loading' && <p className="text-center text-muted">{t('invite.loading')}</p>}

          {phase === 'invalid' && (
            <div className="text-center">
              <h1 className="font-display text-2xl font-black text-ink">
                {t('invite.notFound.title')}
              </h1>
              <p className="mt-2 text-sm text-muted">{t('invite.notFound.body')}</p>
            </div>
          )}

          {phase === 'unavailable' && preview && (
            <div className="text-center">
              <h1 className="font-display text-2xl font-black text-ink">
                {t('invite.unavailable.title')}
              </h1>
              <p className="mt-2 text-sm text-muted">
                {t(UNAVAILABLE_KEYS[preview.status] ?? 'invite.unavailable.fallback')}
              </p>
              {preview.status === 'accepted' && (
                <ButtonLink href={DESKTOP_DOWNLOAD_URL} size="lg" className="mt-6">
                  {t('invite.downloadApp')}
                </ButtonLink>
              )}
            </div>
          )}

          {phase === 'ready' && preview && (
            <>
              <div className="mb-8">
                {/* No `mt-4`: the badge that used to sit above this — "Team invitation" —
                    is gone, and with it the gap it needed. The heading opens the column. */}
                <h1 className="font-display text-3xl font-black leading-tight text-ink">
                  {t('invite.joinLead')} <span className="text-brand">{preview.org_name}</span>
                </h1>
                <p className="mt-2 text-sm text-muted">{t('invite.subtitle')}</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted">
                    {t('invite.email')}
                  </label>
                  <input
                    type="email"
                    value={preview.email}
                    readOnly
                    className="w-full cursor-not-allowed rounded-xl border border-black/10 bg-black/[0.03] px-3.5 py-2.5 text-sm text-muted"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted">
                    {t('invite.password')}
                  </label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    autoFocus
                    placeholder={t('invite.passwordPlaceholder')}
                  />
                </div>

                {error && (
                  <div className="rounded-xl border border-red/20 bg-red/5 px-3.5 py-2.5 text-xs text-red">
                    {error}
                  </div>
                )}

                <Button type="submit" size="lg" className="w-full" disabled={submitting || password.length < 8}>
                  {submitting
                    ? t('invite.submitting')
                    : t('invite.submit', { org: preview.org_name })}
                </Button>
              </form>
            </>
          )}

        </div>
      </section>
    </main>
  )
}
