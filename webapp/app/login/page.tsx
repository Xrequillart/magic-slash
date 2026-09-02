'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabase } from '@/lib/supabase'
import { HOME_PATH, useRequireGuest } from '@/lib/session'
import { useT } from '@/lib/i18n/useLanguage'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { Button, Card, FullPageLoader, Input } from '@/components/ui'

export default function Login() {
  const router = useRouter()
  const { t } = useT()
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
      setError(t('login.failed'))
      setSubmitting(false)
      return
    }
    router.replace(HOME_PATH)
  }

  if (pending) return <FullPageLoader tone="login" />

  return (
    <main className="flex min-h-screen items-center justify-center bg-softblue px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/img/logo-readme-light.svg" alt="Magic Slash" className="h-11" />
          <h1 className="mt-8 font-display text-3xl font-black text-ink">{t('login.title')}</h1>
          <p className="mt-2 text-sm text-muted">{t('login.subtitle')}</p>
        </div>

        <Card className="p-7">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted">{t('login.email')}</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                placeholder={t('login.emailPlaceholder')}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted">
                {t('login.password')}
              </label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="rounded-xl border border-red/20 bg-red/5 px-3.5 py-2.5 text-xs text-red">
                {error}
              </div>
            )}

            {/* `lg` carries the height; its horizontal padding is inert on a button
                that spans the form. */}
            <Button type="submit" size="lg" className="w-full" disabled={submitting || !email || !password}>
              {submitting ? t('login.submitting') : t('login.submit')}
            </Button>
          </form>
        </Card>

        <p className="mt-6 text-center text-xs text-muted">{t('login.invited')}</p>

        {/* Under the card rather than in a corner: this page has no chrome to hang a
            control off, and someone who cannot read the form is looking at the form. */}
        <div className="mt-8 flex justify-center">
          <LanguageSwitcher />
        </div>
      </div>
    </main>
  )
}
