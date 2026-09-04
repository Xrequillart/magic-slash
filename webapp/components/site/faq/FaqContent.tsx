'use client'

import { ArrowUpRight } from 'lucide-react'
import { Collapse } from '@/components/ui'
import { NEW_ISSUE_URL } from '@/components/site/links'
import { PAGE_CHROME, QUESTIONS } from '@/lib/faq'
import { useT } from '@/lib/i18n/useLanguage'
import { Bloom } from '../home/HeroSection'
import { HomeSection } from '../home/Shell'
import { RichText } from '../RichText'

/**
 * The whole of `/faq`: the headline, eleven disclosure rows, and one way out.
 *
 * ── THE SHAPE, AND WHERE IT COMES FROM ──────────────────────────────────────────────
 *
 * Modelled on `cleanshot.com/faq`, measured off that page rather than eyeballed — the
 * ROW itself is theirs and lives in `Collapse` (`components/ui.tsx`), which lists every
 * value it took from their stylesheet and the two it refused. What is this file's is the
 * page around it, and the two things worth copying there are both subtractions.
 *
 * It is ONE FLAT LIST — no categories over groups of two and three, which would add a
 * level of structure a reader has to get past to reach the question they came with. And
 * every row is COLLAPSED on arrival, so the page opens as a table of contents you can
 * read in a glance rather than as four screens of prose you have to scroll to find out
 * what is on it. Eleven questions is the length that works that way; `lib/faq.ts` says
 * what happens at thirty.
 *
 * THEIR COLUMN IS 800px AND OURS IS 768 (`max-w-3xl`), which is the one measurement not
 * taken from them exactly: 48rem is a declared rung and 800px is not, and the difference
 * is two characters of measure.
 *
 * ROWS OPEN INDEPENDENTLY — this is not an accordion that closes its siblings, even
 * though `Collapse` supports being driven that way. Two of these answers get compared
 * (the tracker question against the platform one, "do I need the app" against "how do
 * updates work"), and a widget that shuts the first answer as you open the second makes
 * that impossible for no gain. One-at-a-time earns its keep when a panel is tall enough
 * to lose the reader's place; a three-sentence paragraph is not.
 *
 * SO THERE IS NO STATE IN THIS COMPONENT. Every row owns its own, which is what makes
 * the page a `.map()` over `QUESTIONS` with nothing in front of it.
 *
 * ── WHAT REPLACED WHAT ──────────────────────────────────────────────────────────────
 *
 * THIS PAGE IS WHERE `/documentation` WENT. That was a 16-section manual on its own
 * route group — its own dark theme, its own full-height sidebar, its own 666-line
 * stylesheet, and 675 positional catalogue keys — and the honest reading of it was that
 * nobody arrived there. Nothing on the site linked to it by the end; the header's
 * Product dropdown that used to had already been cut, and the desktop app's only link
 * into it pointed at the changelog section, which is a page of its own now. What it
 * carried has split three ways: the changelog to `/changelog`, the capability inventory
 * to `/features`, and the eleven things people actually ask to here.
 *
 * `site.faq.*` PREDATES THE PAGE. Five of these questions were written as band ⑧ of the
 * homepage, which the rebuild cut; their keys sat in the catalogue unread until there
 * was somewhere to put them. See the note in `lib/i18n/marketing/en.ts`.
 *
 * ── ONE INK AT SEVERAL ALPHAS ───────────────────────────────────────────────────────
 *
 * `text-ink` and `text-ink/60`, not `ink` and `muted`, and the ground is white rather
 * than `canvas` — `/features`'s convention, restated at length in `FeaturesContent.tsx`
 * and again in `ChangelogContent.tsx`. Short version: `muted` (#52525b) is a cooler,
 * desaturated hue, so beside `ink` (#0a0a0a) the two read as two decisions instead of
 * one weakened, and a page made of nothing but text hierarchy cannot afford that.
 *
 * Every alpha on this page is inside `Collapse` rather than here, which is the point of
 * putting the row in `components/ui.tsx`: this file names no colour at all bar the
 * hero's gradient and the two links. Note that the ANSWERS are full `text-ink` and not
 * the `/changelog` rows' 70% — the reasoning is on the component, and it is about a row
 * that has no rule under it.
 *
 * ── NO `marketing.css` ──────────────────────────────────────────────────────────────
 *
 * `homepageStylesheet.test.ts` walks `components/site/**` and this tree is in it, so
 * that is enforced rather than remembered. Nothing here is a class from the old static
 * site; every value is a token from `tailwind.config.ts` or a primitive from
 * `components/ui.tsx`.
 */

export function FaqContent() {
  const { t } = useT()

  return (
    // WHITE, not `canvas`. See the ink note above; `/features` and `/changelog` paint
    // their own ground the same way, and the `(marketing)` layout deliberately paints
    // none.
    <div className="bg-white">
      {/* `/changelog`'s opening band verbatim: `padding="hero"` because the bar is
          `fixed` at `h-16` and the first line owes it that, the `softblue → white` wash,
          and `Bloom` fading `to-white` so the band lands on the ground below instead of
          leaving a blue-grey step at its bottom edge. */}
      <HomeSection
        padding="hero"
        backdrop={<Bloom fadeTo="to-white" />}
        className="bg-gradient-to-b from-softblue to-white"
      >
        {/* Centred, and the list below is not. Centring an opening says "this is the
            page"; centring a column of questions would make them harder to scan. The
            same split `/features` and `/changelog` make. */}
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="font-display text-4xl font-black leading-[1.1] text-ink md:text-6xl">
            {t(PAGE_CHROME.title)}
          </h1>
          <p className="mx-auto mt-8 max-w-xl text-lg leading-relaxed text-ink/60">
            {t(PAGE_CHROME.lead)}
          </p>
        </div>
      </HomeSection>

      <HomeSection padding="follow">
        {/* NARROWER THAN THE PAGE'S COLUMN. `max-w-site` is 1100px, and a question set
            in 18px display type across 1100px is one line of eight words with 600px of
            nothing after it — the plate reads as a band with a word on it rather than as
            something to press. 3xl (48rem) is the measure the answers want too: ~75
            characters, which is where a paragraph stops needing the eye to travel back.
            It is also within two characters of the reference's own 800px column.

            `gap-1` IS THE ONLY THING THIS CONTAINER DOES, and it is the reference's 5px
            of air between tiles. It is here rather than as a margin on the row because a
            margin needs a `:last-of-type` rule to take itself back off — which is what
            theirs has — and a lone `Collapse` should not ship with space under it.

            NO BORDER AND NO DIVIDERS. That is the shape: these are soft plates that
            light up under the pointer, not rows in a ruled table. A `border-t` here (and
            this container had one, before the row was measured properly) puts a line
            above the first tile that belongs to nothing. */}
        <div className="mx-auto flex max-w-3xl flex-col gap-1">
          {QUESTIONS.map((entry) => (
            /* `id` MAKES EACH ROW ADDRESSABLE — `/faq#credentials` is a real link, and
               the kind that gets pasted into a support reply or an issue comment.
               Nothing on the page draws that anchor as a control (the reference has no
               permalinks either), but it costs an attribute and `Collapse` puts the
               `scroll-mt-24` on it for the fixed bar.

               A ROW ARRIVING VIA ITS OWN ANCHOR IS STILL CLOSED, which is worth naming
               as a known edge rather than a thing to fix here: the browser scrolls to
               it, the question is at the top of the screen, and the reader presses it.
               Opening it from the fragment would mean reading `location.hash` on mount
               and driving these rows as controlled — state on this component, an effect,
               and a hydration mismatch to think about — to save one press.

               `RichText` for the answer and `t()` for the question. The answers carry
               `<code>` and `<strong>` (a path, a version, a product name mid-sentence)
               and the questions carry nothing, which is not an accident: a heading with
               markup in it is a heading someone will eventually want to link, and the
               questions are already the pressable part of the row. */
            <Collapse key={entry.id} id={entry.id} title={t(entry.question)}>
              <RichText k={entry.answer} as="p" />
            </Collapse>
          ))}
        </div>

        {/* THE WAY OUT, and it is the last thing on the list rather than a band of its
            own. Whoever is still reading at the bottom of a FAQ is the one person on the
            site with a question it did not answer, and the worst possible answer to that
            is a download button.

            `NEW_ISSUE_URL` is `issues/new/choose`, so they land on the templates rather
            than on a blank box — see `links.ts`. A plain `<a>` and not `ButtonLink`:
            this is a footnote under a list, and the page's own ask is the closing band
            `page.tsx` puts under it. */}
        <div className="mx-auto mt-10 flex max-w-3xl flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          <span className="text-ink/60">{t(PAGE_CHROME.stillStuck)}</span>
          <a
            href={NEW_ISSUE_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 font-medium text-ink transition-colors hover:text-brand"
          >
            {t(PAGE_CHROME.openIssue)}
            <ArrowUpRight className="h-4 w-4" aria-hidden />
          </a>
        </div>
      </HomeSection>
    </div>
  )
}
