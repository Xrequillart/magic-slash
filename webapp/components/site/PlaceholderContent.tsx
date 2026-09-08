'use client'

import type { MessageKey } from '@/lib/i18n'
import { useT } from '@/lib/i18n/useLanguage'
import { PLACEHOLDER_NOTE } from '@/lib/siteNav'
import { Badge } from '@/components/ui'
import { Bloom } from './home/HeroSection'
import { HomeSection } from './home/Shell'

/**
 * A PAGE THAT EXISTS AND IS NOT WRITTEN YET: its title, one line of scope, and a badge
 * saying so.
 *
 * FOUR ROUTES SHARE IT — `/desktop`, `/cloud` and `/download` from the Product menu, and
 * `/best-practices` from the Help menu (`PLACEHOLDER_PAGES` in `lib/siteNav.ts`). One
 * component rather than four near-identical bands, because the four will not be replaced
 * on the same day: each `page.tsx` swaps this call for its own content when its turn
 * comes, and the ones still waiting keep agreeing with each other in the meantime.
 *
 * There were five for a moment. `/skills` was cut for duplicating `/workflow`, and the
 * count above is the kind of sentence that is worth keeping true — see the note in
 * `lib/siteNav.ts` for what the cut was about.
 *
 * WHY THE ROUTES SHIPPED EMPTY AT ALL, which is the thing to be honest about rather than
 * quiet about: a header row pointing at a path `PUBLIC_PATHS` does not list 307s the
 * reader to a login form on `app.magic-slash.io` (`lib/hostRouting.ts`), so the menus and
 * their pages had to arrive together. A thin page is the cost of that; an apparent
 * sign-out on every public page is what it buys off.
 *
 * IT IS `/workflow`'s OPENING BAND, deliberately unchanged: `padding="hero"` because the
 * bar is `fixed` at `h-16` and a page's first line owes it that, the `softblue → white`
 * wash, and `Bloom` fading `to-white` so the band lands on the ground below instead of
 * leaving a blue-grey step at its bottom edge. A placeholder that invented a dress of its
 * own would be a fifth page design to unpick later.
 *
 * THE BADGE IS THE WHOLE ADMISSION and it is a `neutral` `Badge` on purpose — the tone
 * scale's quietest rung. `accent` or `yellow` would read as a feature announcement,
 * which is the opposite of what the line says. It sits BELOW the lead rather than above
 * it as an eyebrow: what the page will hold is the useful part, and the reader should
 * meet that before the apology.
 *
 * `bg-white` on the wrapper, not `canvas`, like every other page in this group: the
 * `(marketing)` layout paints no ground, so whichever page owns one paints its own.
 */
export function PlaceholderContent({ title, lead }: { title: MessageKey; lead: MessageKey }) {
  const { t } = useT()

  return (
    <div className="bg-white">
      <HomeSection
        padding="hero"
        backdrop={<Bloom fadeTo="to-white" />}
        className="bg-gradient-to-b from-softblue to-white"
      >
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="font-display text-4xl font-black leading-[1.1] text-ink md:text-6xl">
            {t(title)}
          </h1>
          {/* 36rem inside the 48rem column: one sentence of scope, set to ~60 characters
              so it reads as a subtitle rather than as the first paragraph of a page that
              has no paragraphs yet. `/workflow`'s own lead is capped the same way. */}
          <p className="mx-auto mt-8 max-w-xl text-lg leading-relaxed text-ink/60">{t(lead)}</p>
          <div className="mt-8">
            <Badge>{t(PLACEHOLDER_NOTE)}</Badge>
          </div>
        </div>
      </HomeSection>
    </div>
  )
}
