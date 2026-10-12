'use client'

import { useState } from 'react'
import { CircleCheck } from 'lucide-react'
import { Button } from '@/components/ui'
import { getSupabase } from '@/lib/supabase'
import { useT } from '@/lib/i18n/useLanguage'

/**
 * The waitlist form, where the site used to ask for the download.
 *
 * Nobody can sign up to the app yet, on purpose, so every "Download for Mac" outside
 * `/download` itself became this: one address, one button. `/download` keeps its button,
 * for whoever has the link.
 *
 * THE ADDRESS GOES THROUGH `join_waitlist`, never a table insert: the function ignores a
 * duplicate, so a second submit reads as a success and the page never says whether an
 * address was already on the list. See the migration that adds it.
 *
 * `source` names the page, so the list can tell a hero from a closing band. `dark` is the
 * dress for `FinalCtaSection`'s ink sheet: the button takes the white `secondary` face
 * there for the reason that band gives, and the field goes translucent to sit on black.
 */
type Status = 'idle' | 'sending' | 'done' | 'error'

/** The same shape the migration's check constraint enforces, so the two cannot disagree. */
const EMAIL_SHAPE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

export function WaitlistForm({
  source,
  dark = false,
  align = 'start',
}: {
  source: string
  dark?: boolean
  align?: 'start' | 'center'
}) {
  const { t, lang } = useT()
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [invalid, setInvalid] = useState(false)

  const justify = align === 'center' ? 'justify-center text-center' : 'justify-start'

  if (status === 'done') {
    return (
      <p
        role="status"
        className={`flex items-center gap-2 text-base font-semibold ${justify} ${dark ? 'text-white' : 'text-ink'}`}
      >
        <CircleCheck className={`h-5 w-5 shrink-0 ${dark ? 'text-white' : 'text-brand'}`} aria-hidden />
        {t('site.waitlist.done')}
      </p>
    )
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const value = email.trim()
    if (!EMAIL_SHAPE.test(value) || value.length > 254) {
      setInvalid(true)
      return
    }
    setInvalid(false)
    setStatus('sending')
    const { error } = await getSupabase().rpc('join_waitlist', {
      p_email: value,
      p_source: source,
      p_locale: lang,
    })
    setStatus(error ? 'error' : 'done')
  }

  const message = invalid ? t('site.waitlist.invalid') : status === 'error' ? t('site.waitlist.error') : null

  return (
    <form onSubmit={submit} noValidate className="w-full max-w-md">
      <div className={`flex flex-col gap-3 sm:flex-row ${justify}`}>
        <label htmlFor={`waitlist-${source}`} className="sr-only">
          {t('site.waitlist.label')}
        </label>
        <input
          id={`waitlist-${source}`}
          type="email"
          name="email"
          autoComplete="email"
          inputMode="email"
          required
          value={email}
          onChange={(e) => {
            setEmail(e.target.value)
            if (invalid) setInvalid(false)
          }}
          placeholder={t('site.waitlist.placeholder')}
          aria-invalid={invalid || undefined}
          aria-describedby={message ? `waitlist-${source}-message` : undefined}
          className={`h-[46px] min-w-0 flex-1 rounded-button border px-4 text-base outline-none transition-colors ${
            dark
              ? 'border-onink-rule bg-onink-tint text-white placeholder:text-onink-faint focus:border-white/40'
              : 'border-hairline bg-white text-ink placeholder:text-muted focus:border-accent'
          }`}
        />
        <Button
          type="submit"
          variant={dark ? 'secondary' : 'primary'}
          size="lg"
          disabled={status === 'sending'}
          className="shrink-0"
        >
          {status === 'sending' ? t('site.waitlist.sending') : t('site.waitlist.button')}
        </Button>
      </div>
      {message && (
        <p
          id={`waitlist-${source}-message`}
          role="alert"
          className={`mt-2 text-sm ${align === 'center' ? 'text-center' : ''} ${dark ? 'text-onink-body' : 'text-red'}`}
        >
          {message}
        </p>
      )}
    </form>
  )
}
