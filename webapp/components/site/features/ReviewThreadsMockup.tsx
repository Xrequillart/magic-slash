'use client'

import { UserRound } from 'lucide-react'
import type { MessageKey } from '@/lib/i18n'
import { useT } from '@/lib/i18n/useLanguage'
import { Reveal } from '../Reveal'

/**
 * The visual inside the `/magic:review` card: two review comments landing on the lines
 * they belong to, in the shape GitHub gives them. CROPPED at the bottom only.
 *
 * WHY THIS ONE IS NOT DRAWN FROM A DESKTOP COMPONENT, unlike the other three
 * reproductions on this page. `/magic:review` does not render anything: it reads a diff
 * and posts inline comments, and where they land is GitHub's pull request page. The app
 * shows them back in `agent-info-sidebar/PRWatchCard`'s thread list, but that is the
 * REPLY view — a one-line summary per thread — and it is not what the command produces.
 * So the reference here is the artefact itself: a file path, the hunk the comment is
 * anchored to, and the comment under it.
 *
 * THE ENTRANCE IS `Reveal`, THE SITE'S OWN. Bottom to top, 600ms, staggered, played ONCE
 * on mount and never again — which is what was asked for, and it is also the one
 * entrance on this page that is not a loop. `Reveal` is worth reusing rather than
 * re-keyframing because it already solves two things this would have got wrong: it
 * renders the RESTING state on the server (so the comments are there with JavaScript
 * off, rather than a blank panel waiting for an effect), and it drops the animation
 * entirely under `prefers-reduced-motion`.
 *
 * ONE CONSEQUENCE OF "ON MOUNT" WORTH KNOWING: this card sits well down the page, so the
 * entrance plays while it is still below the fold, and a reader who scrolls to it finds
 * it settled. That is the trade of a mount-triggered entrance over a scroll-triggered
 * one — it is what "page arrival, no replay" means — and the alternative is an
 * IntersectionObserver, which is a different feature.
 *
 * CROPPED AT THE BOTTOM ONLY. A review comment's meaning runs left to right — the path,
 * the hunk, the sentence — so cutting either side would take words. Cutting the bottom
 * takes the third comment, which is exactly the right thing to lose: it says the review
 * is longer than the card without spending card on proving it.
 *
 * `bg-white`, and the rule is the same one the other panels follow: clear your own
 * ground. This card is `tone-sky` (#D9E8FF → #BDC5F7), which is deep enough that white
 * separates cleanly — where on the near-white `tone-mist` it would not have.
 *
 * `aria-hidden`, and the whole panel: it is a drawing, and its words paraphrase the card's
 * own description sitting directly above it.
 */

/**
 * The two comments. Each is a real file in this repository and a hunk that plausibly
 * belongs to it — the `hostRouting` one is literally the change this page's own ticket
 * required, which is the sort of detail a reader can check.
 *
 * The paths and the diff lines are code, not language, so they are literals; only the
 * comment sentence goes through the catalogues.
 */
/**
 * Who the comments are FROM. "you", because that is who GitHub records: `/magic:review`
 * posts through the authenticated `gh` CLI, so the threads arrive under the user's own
 * account. Language, so it is a catalogue key.
 */
const AUTHOR: MessageKey = 'site.reviewCard.author'

const THREADS: readonly {
  path: string
  removed: string
  added: string
  comment: MessageKey
}[] = [
  {
    path: 'webapp/lib/hostRouting.ts:47',
    removed: "const PUBLIC_PATHS = new Set(['/', '/story', '/documentation'])",
    added: "const PUBLIC_PATHS = new Set(['/', '/features', '/story', '/documentation'])",
    comment: 'site.reviewCard.comment1',
  },
  {
    path: 'webapp/components/site/features/FeaturesSidebar.tsx:118',
    removed: 'window.addEventListener(\'scroll\', read)',
    added: 'window.addEventListener(\'scroll\', schedule, { passive: true })',
    comment: 'site.reviewCard.comment2',
  },
]

export function ReviewThreadsMockup() {
  const { t } = useT()

  return (
    // `-mb-6` is the only negative margin: bottom crop, nothing on the sides.
    //
    // `pt-2` and not the `pt-6` the other panels use. There is no slack in this card —
    // the copy plus a 224px panel already exceeds `min-h-80` — so the top inset is the
    // one thing that moves the comments up, and every pixel taken off it is a pixel of
    // the second comment that survives the bottom crop. 8px is close enough to the copy
    // to still read as separate from it.
    <div aria-hidden className="-mb-6 px-7 pt-2">
      {/* `h-56`, the same 224px the other three panels stand at, so all four line up
          across the grid. Two comments come to a little more than that, which is what
          gives the crop something to cut. */}
      <div className="flex h-56 flex-col gap-2 overflow-hidden">
        {THREADS.map((thread, index) => (
          // `order` is the stagger — `Reveal` turns it into an `animation-delay`, so the
          // second comment lands after the first rather than with it.
          <Reveal key={thread.path} order={index}>
            <div className="overflow-hidden rounded-md border border-hairline bg-white">
              {/* The anchor: which file, which line. Monospace, because it is a path. */}
              <div className="truncate border-b border-hairline px-3 py-1.5 font-mono text-[10px] text-ink/50">
                {thread.path}
              </div>

              {/* The hunk. `red/10` and `green/10` are the declared status tokens at the
                  tint GitHub uses for a diff — the one place on this page those two
                  colours mean what they mean everywhere else in the product. */}
              <div className="font-mono text-[10px] leading-relaxed">
                <div className="truncate bg-red/10 px-3 text-ink/70">- {thread.removed}</div>
                <div className="truncate bg-green/10 px-3 text-ink/70">+ {thread.added}</div>
              </div>

              {/* The comment, and the author is YOU — which is not a marketing
                  flourish, it is who GitHub records. `/magic:review` posts through the
                  authenticated `gh` CLI, so the comments arrive under the user's own
                  account: the review is theirs, written by the agent. Saying
                  "magic-slash" here, as this did, credited the tool with an authorship
                  GitHub does not give it.

                  A GLYPH AND NOT AN INITIAL in the disc. "you" and "vous" start with
                  different letters, so an initial would have been the one piece of this
                  drawing that changed shape with the language — and there is no avatar
                  image to use instead: no product imagery is on disk, and this is not
                  the place to invent any. */}
              <div className="border-t border-hairline px-3 py-2">
                <div className="flex items-center gap-1.5">
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
                    <UserRound className="h-2.5 w-2.5" />
                  </span>
                  <span className="text-[11px] font-semibold text-ink">{t(AUTHOR)}</span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-ink/60">{t(thread.comment)}</p>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </div>
  )
}
