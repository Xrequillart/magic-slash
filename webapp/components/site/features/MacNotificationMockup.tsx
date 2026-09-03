'use client'

import { useT } from '@/lib/i18n/useLanguage'

/**
 * The artwork beside the `Hooks and notifications` row: the banner macOS puts on screen
 * when an agent needs you, floating on a plate and running off its right edge.
 *
 * THE COPY IS THE APP'S OWN, and that is the part worth checking rather than the
 * rounding. `desktop/src/main/notifications/agent-message.ts` builds a `waiting`
 * notification as `notification.waiting.title` over `notification.waiting.body`, and that
 * body takes a SUBJECT which is the ticket id whenever there is one — the file's own note
 * says the ordering is "by how much the name tells somebody who is not looking at the
 * app", and a ticket needs no context. So the banner reads with a ticket in it, on the
 * same invented project as the drawings above.
 *
 * WAITING AND NOT COMPLETED, of the two states that notify. "An agent has finished" is
 * the pleasant one and the wrong one to advertise: the reason this feature exists is that
 * an agent can stop and need you, and a Mac that only told you about the finishes would
 * leave you watching the window for the stops.
 *
 * THE BANNER IS macOS's, NOT OURS — it is drawn by the system, so every part of it but
 * the icon and the two sentences is Apple's: a soft-cornered DARK panel, the app's icon
 * on the left, a semibold title over a regular body in the same off-white, and the age of
 * the notification dimmer beside it.
 *
 * DARK, AND SAMPLED RATHER THAN GUESSED. This was drawn as a white card first, which is
 * what a notification looks like in light mode and not what anybody running this app sees
 * — the desktop app ships only dark themes. The three values are read off a real banner
 * and declared in `tailwind.config.ts` under `macos`, for the reason the product plates
 * are: a borrowed colour inlined at a call site is one nobody can tell was chosen.
 *
 * `app-icon-desktop.png` is the icon that actually ships on the dock — the same file the
 * cloud family's plate and the homepage's closing CTA use. `rounded-[22%]`, which is the
 * corner macOS gives an app icon, rather than a radius from this site's scale: the icon's
 * artwork is a hard square, and the rounding is the operating system's.
 *
 * CROPPED ON THE RIGHT, inside the plate rather than by the card, for the reason the
 * spotlight drawing beside it is: a notification is a thing that arrives and slides away,
 * and one that ends neatly inside its own picture reads as a static card.
 *
 * `aria-hidden`: it is a drawing of somebody else's UI.
 */
export function MacNotificationMockup() {
  const { t } = useT()

  return (
    <div
      aria-hidden
      className="flex h-full min-h-44 items-center overflow-hidden rounded-xl bg-tone-indigo pl-6"
    >
      {/* `-mr-10` is the crop: the banner runs past the plate's right edge and the
          plate's own `overflow-hidden` cuts it. */}
      <div className="-mr-10 flex min-w-0 items-center gap-3 rounded-2xl bg-macos-notification px-4 py-3 shadow-lift">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/img/app-icon-desktop.png"
          alt=""
          className="h-9 w-9 shrink-0 rounded-[22%] object-cover"
        />
        <div className="min-w-0">
          {/* macOS puts the age in the banner's top RIGHT corner. It sits beside the
              title here instead, and that is the one deviation in this drawing: pushed
              right, it would be the first thing the crop takes, and a notification with
              no age on it is missing the half that says it just arrived. */}
          <div className="flex items-baseline gap-6">
            <span className="whitespace-nowrap text-[13px] font-semibold text-macos-notification-ink">
              {t('site.notificationCard.title')}
            </span>
            <span className="whitespace-nowrap text-[11px] text-macos-notification-dim">
              {t('site.notificationCard.when')}
            </span>
          </div>
          <p className="mt-0.5 whitespace-nowrap text-[13px] leading-snug text-macos-notification-ink">
            {t('site.notificationCard.body')}
          </p>
        </div>
      </div>
    </div>
  )
}
