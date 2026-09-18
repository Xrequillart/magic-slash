'use client'

import { useEffect, useState } from 'react'
import { Logo } from '@/components/Logo'
import { isEmailChangeRedirect } from '@/lib/emailConfirmRedirect'
import { useT } from '@/lib/i18n/useLanguage'

/**
 * THE PAGE YOU LAND ON AFTER CONFIRMING A NEW EMAIL ADDRESS.
 *
 * ── WHY IT IS A LAYOUT-WIDE OVERLAY AND NOT A ROUTE ───────────────────────────────
 *
 * Because the redirect gives us no route to be. Supabase's verify endpoint answers a
 * confirmation link with, verified against the running server:
 *
 *     303 See Other
 *     Location: {site_url}#access_token=…&refresh_token=…&type=email_change
 *
 * Two things follow from that one line. It lands on the ROOT of `site_url` — there is
 * no path to give a page, and `site_url` cannot carry one because every other auth
 * flow redirects there too. And everything that says WHY we are here is in the
 * FRAGMENT, which browsers never send to a server: no middleware, no route handler and
 * no server component can read it. Only a mounted client can.
 *
 * So this sits in the root layout, watches for its own marker, and draws over whatever
 * was underneath. That also makes it independent of auth: the root of the app host
 * rewrites to `/dashboard`, which a signed-out visitor never reaches, and the one
 * person guaranteed to arrive here is somebody who just proved they own a mailbox and
 * may well not be signed in on the web at all.
 *
 * ── THE URL IS CLEANED BEFORE ANYTHING IS DRAWN ───────────────────────────────────
 *
 * That fragment holds a working access token and refresh token. They arrive whether we
 * want them or not, and leaving them in the address bar puts them in the browser
 * history, in a screenshot, and in whatever the user pastes when they ask a colleague
 * "is this normal?". `replaceState` takes them out without a reload — and it must be
 * `replaceState` rather than `pushState`, or Back would put the tokens back.
 *
 * We do NOT consume them. The web client is configured `detectSessionInUrl: false`
 * (see `lib/supabase.ts`), so nothing signs anybody in behind their back — confirming
 * an address from a phone should not leave a session on that phone.
 */

export function EmailConfirmed() {
  const { t } = useT()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!isEmailChangeRedirect(window.location.hash)) return
    setOpen(true)
    // Tokens out of the address bar before the first paint the user can screenshot.
    window.history.replaceState(null, '', window.location.pathname + window.location.search)
  }, [])

  if (!open) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-50 flex items-center justify-center bg-white px-6"
    >
      {/* THE MARK, TOP LEFT, AND IT DOES NOT MOVE.
          The page animates its CONTENT — the tick, then the words — and this is not
          content, it is the frame: the same kind of thing as the white ground behind
          it. Fading it in with the rest would put the reader's eye on the corner at
          the exact moment the one piece of news is being struck in the middle.

          The black variant because this page is white in every state, which is the
          same call `SiteHeader` makes for the same reason. `decorative` on purpose:
          the body copy two lines down already says "Magic Slash", and a screen reader
          announcing the name twice is a worse page than one that skips a decoration.

          `sm` (40px) rather than the header's `md`: there it anchors a 64px navigation
          bar, here it is a corner mark on an otherwise empty page and the heading is
          what the eye should land on. */}
      <Logo variant="black" size="sm" decorative className="absolute left-6 top-6" />

      <div className="flex w-full max-w-sm flex-col items-center text-center">
        {/* THE MARK DRAWS ITSELF. A tick that is simply present is a state; a tick that
            is struck in front of you is an event, and this is the only moment in the
            flow that is one. `stroke-dasharray` equal to the path length with the
            offset animated to zero is the whole trick — no library, no sprite, and it
            scales because it is a path rather than a picture of one. */}
        <span className="relative flex h-20 w-20 items-center justify-center">
          <span className="absolute inset-0 animate-[ec-ring_600ms_cubic-bezier(0.16,1,0.3,1)_forwards] rounded-full bg-green/10" />
          <svg viewBox="0 0 52 52" className="relative h-10 w-10" aria-hidden="true">
            <path
              d="M14 27l8 8 16-16"
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="animate-[ec-tick_420ms_ease-out_180ms_forwards] text-green [stroke-dasharray:40] [stroke-dashoffset:40]"
            />
          </svg>
        </span>

        {/* The words come in behind the mark rather than with it: the tick is the news
            and the sentence is the explanation, and staggering them by a beat is what
            makes the page read in that order instead of all at once. */}
        <h1 className="mt-6 animate-[ec-rise_420ms_ease-out_320ms_both] font-display text-2xl font-semibold text-ink">
          {t('emailConfirmed.title')}
        </h1>
        <p className="mt-2 animate-[ec-rise_420ms_ease-out_400ms_both] text-sm leading-relaxed text-muted">
          {t('emailConfirmed.body')}
        </p>
        <p className="mt-6 animate-[ec-rise_420ms_ease-out_480ms_both] text-xs text-muted/70">
          {t('emailConfirmed.hint')}
        </p>
      </div>
    </div>
  )
}
