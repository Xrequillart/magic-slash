'use client'

import { Play } from 'lucide-react'
import type { MessageKey } from '@/lib/i18n'
import { useT } from '@/lib/i18n/useLanguage'
import { GithubIcon } from '../icons'

/**
 * The visual inside the `/magic:continue` card: a task from the app's Tasks page, with
 * the one control that matters on it.
 *
 * THE ROW IS DRAWN FROM THE REAL ONE —
 * `desktop/src/renderer/pages/Tasks/TasksRepoSection.tsx`: the ticket badge, then the
 * neutral label pill as `text-xs px-2 py-0.5 rounded`, then the title as
 * `text-sm truncate`, with the row's own `flex items-center gap-3 min-w-0`.
 *
 * THE BUTTON IS NOT. This is the one place across the four mockups on this page where
 * something is drawn that the app does not have, and it is worth being plain about:
 * the real Tasks page offers a filled primary "start an agent" and a neutral "discuss",
 * both two-line stacked buttons. There is no "Continue with magic-slash" control in
 * `desktop/src/`.
 *
 * What IS real is the capability — `/magic:continue` picks a ticket back up wherever it
 * was left, by you or by a colleague — and the button says that in the words a reader of
 * a marketing page can act on, where "start an agent" would need the app's vocabulary
 * first. So it is drawn in the SITE's own white button dress rather than an invented one:
 * `bg-white`, `border-hairline`, `shadow-button`, `rounded-button`, which is exactly what
 * `BUTTON_VARIANTS.secondary` in `components/ui.tsx` is made of. It reads as this site's
 * button because it is this site's button.
 *
 * NOT `ButtonLink` or `Button` itself, though. Those render an `<a>` and a `<button>` —
 * real controls, focusable, in the tab order — and this is a drawing inside an
 * `aria-hidden` panel. A keyboard user would tab into a button that does nothing. The
 * recipe is reused; the element is a `<span>`.
 *
 * NO ANIMATION. The card's argument is that the work is already there waiting, which is a
 * state and not an event. Something moving would have implied `/magic:continue` does
 * something to the ticket before you ask it to.
 *
 * `aria-hidden`, and the whole panel: it is a drawing, and its words paraphrase the card's
 * own description sitting directly above it.
 */

/** The two strings here that are language rather than identity. */
const CONTINUE_LABEL: MessageKey = 'site.continueCard.button'
const DESCRIPTION: MessageKey = 'site.continueCard.ticketDescription'

export function ContinueTaskMockup() {
  const { t } = useT()

  return (
    <div aria-hidden className="-mb-6 -mr-8 pl-7 pt-6">
      {/* `h-56` — the same 224px the start card's terminal stands at, so the two panels
          line up across the grid instead of each finding its own height.

          THE HEIGHT IS ALSO WHAT KEEPS THE BUTTON OUT OF THE CROP, which is the bug it
          fixes. The wrapper's `-mb-6` clips the bottom 24px of this panel, and the button
          used to be the last thing in it — 12px of padding below it, so the cut went
          straight through it. A fixed height puts the slack at the bottom instead, and
          the cut lands in the second task row rather than in a control.

          `overflow-hidden` so a longer translation is clipped INSIDE the white ground
          rather than spilling out of it — French runs longer than English here, and the
          description is the line that grows.

          `bg-canvas` and not `bg-white`: the page's own ground is white, so a white panel
          read as the same surface as the page rather than as a thing on a card.
          `canvas` (#F4F7FE) is the site's declared off-white — and it gives the white
          button below it somewhere to stand, which pure-on-pure did not. */}
      <div className="h-56 overflow-hidden rounded-xl border border-hairline bg-canvas p-3 shadow-lift">
        {/* The task the card is about. */}
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex shrink-0 items-center gap-1 rounded font-mono text-xs font-semibold text-ink">
            <GithubIcon size={12} />
            #269
          </span>
          {/* The app's neutral label pill. `ink/5` rather than the app's `surface`,
              which is a CSS variable this webapp does not have. */}
          <span className="shrink-0 rounded bg-ink/5 px-2 py-0.5 text-xs text-ink/60">
            enhancement
          </span>
          <span className="truncate text-sm text-ink">all-features page</span>
        </div>

        {/* The description, which the row alone did not carry. A ticket id and a title
            say what something is CALLED; a reader deciding whether to pick it back up
            needs to know what it is. The Tasks page shows it on the detail view for the
            same reason. */}
        <p className="mt-2 text-xs leading-relaxed text-ink/60">{t(DESCRIPTION)}</p>

        {/* The control, on its own line rather than beside the title: at this width the
            two would each get half, and a button that has to truncate its own label is
            a button nobody reads. The app makes the same call — its two buttons sit
            under the ticket, not next to it, "because side by side at this column's
            width both labels would wrap". */}
        <div className="mt-3 flex">
          <span className="inline-flex items-center gap-2 rounded-button border border-hairline bg-white px-3 py-2 text-sm font-medium text-ink shadow-button">
            <Play className="h-3.5 w-3.5 fill-current" />
            {t(CONTINUE_LABEL)}
          </span>
        </div>

        {/* A SECOND TASK, and it is what the crop is for. Without it the panel's bottom
            third was empty and the cut fell through nothing — which reads as a panel that
            was drawn too tall, not as a list that continues. One more row, and the same
            24px says "there is more of this". It carries no button: the offer belongs to
            the task the card is about. */}
        <div className="mt-4 border-t border-hairline pt-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex shrink-0 items-center gap-1 rounded font-mono text-xs font-semibold text-ink/60">
              <GithubIcon size={12} />
              #270
            </span>
            <span className="shrink-0 rounded bg-ink/5 px-2 py-0.5 text-xs text-ink/50">
              enhancement
            </span>
            <span className="truncate text-sm text-ink/60">scroll-driven hero scene</span>
          </div>
        </div>
      </div>
    </div>
  )
}
