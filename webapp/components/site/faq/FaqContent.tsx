'use client'

import { ArrowUpRight } from 'lucide-react'
import { Collapse } from '@/components/ui'
import { NEW_ISSUE_URL } from '@/components/site/links'
import { PAGE_CHROME, QUESTIONS } from '@/lib/faq'
import { useT } from '@/lib/i18n/useLanguage'
import { Reveal } from '../Reveal'
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
 * putting the row in `components/ui.tsx`: this file names no colour at all now bar the
 * two links — the hero's gradient was the third and it is gone (see the band below). Note that the ANSWERS are full `text-ink` and not
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
    <div className="bg-white [--reveal-from:0px]">
      {/* A FADE AND NOT A RISE, and it is one custom property rather than a second
          animation. `reveal-a`/`reveal-b` translate by `var(--reveal-from, 0.75rem)`,
          so setting that to zero HERE leaves the opacity half of the keyframes and
          takes the movement out — for every `Reveal` on the page at once, because a
          custom property inherits. The site bar already uses the same seam from the
          other end (`[--reveal-from:-1.25rem]`, to drop in from above).

          IT IS THESE TWO PAGES ONLY. The home, `/desktop` and `/workflow` still rise
          12px; that is deliberate, at the owner's request, and not a divergence to
          propagate by reading this file. To make the whole site fade, move this class
          onto the keyframes' own default in `tailwind.config.ts` and delete it here. */}
      {/* `/changelog`'s opening band, and still verbatim — both pages left the wash
          together. `padding="hero"` because the bar is `fixed` at `h-16` and a page's
          first line owes it that; no `softblue → white` gradient and no `Bloom`.

          NO `backdrop` AT ALL rather than an empty one: `HomeSection` turns `relative`
          and clips itself only when it is passed a layer, so dropping the prop drops an
          `overflow-hidden` this band no longer needs. And no ground class either — the
          page's own `bg-white` is right underneath.

          `/download` and `/features` have since done the same. `/privacy` and `/terms`
          still open on the wash, deliberately: those two are documents, and a document
          has no drawing to put beside its title. */}
      <HomeSection padding="hero">
        {/* TWO COLUMNS: what the page IS on the left, a drawing of it on the right —
            `/changelog`'s opening, for the reason that page gives. It was one centred
            column on the argument that centring says "this is the page"; a split says the
            same thing with the width the band actually has.

            It stacks below `lg`, text first: the drawing is a decoration, so it is the
            half that waits. `items-center` because the text block is two elements tall
            and the drawing several times that — aligning their tops would hang the title
            off a column of empty space. */}
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <div>
            {/* THE ENTRANCE, and the margin moved onto the wrapper with it: a `mt-6` on a
                child of a `Reveal` would have to collapse through an element that is being
                translated, which happens to work and is not a thing to depend on.

                `order` counts the way the band is read — heading, line, then the drawing,
                80ms apart. `Reveal` does the rest: it plays on mount for what is already
                in view, waits for an `IntersectionObserver` for what is not, and leaves
                everything at rest for a reader who asked for less motion. */}
            <Reveal order={1}>
              <h1 className="font-display text-4xl font-black leading-[1.1] text-ink md:text-6xl">
                {t(PAGE_CHROME.title)}
              </h1>
            </Reveal>
            {/* `max-w-md` inside a half-column already about that wide: the measure holds
                on the screens where the column grows past it, so the line length stays
                readable instead of tracking the viewport. */}
            <Reveal order={2} className="mt-6">
              <p className="max-w-md text-lg leading-relaxed text-ink/60">
                {t(PAGE_CHROME.lead)}
              </p>
            </Reveal>
          </div>

          {/* THE DRAWING, and its file is CROPPED rather than sized down here. The source
              is a 1000×1000 canvas carrying the drawing at 878×950, so the box has dead
              margin on every side. `illustration-faq.svg` therefore ships with a
              `viewBox` of `61 25 878 950` and matching `width`/`height`, which is its
              measured bounding box — nothing in this file has to correct for empty space.

              `alt=""`: a decoration. It says nothing the heading beside it does not, and
              a screen reader on its way to the questions wants to get there. */}
          {/* THE `justify-self` MOVED TO THE WRAPPER, and it had to: `Reveal` renders a
              div, so that div is the grid item now and the image inside it is not. Left
              on the image the rule would simply stop applying, silently. */}
          <Reveal order={3} className="justify-self-center lg:justify-self-end">
            <img src="/img/illustration-faq.svg" alt="" className="w-full max-w-md" />
          </Reveal>
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
            /* EACH ROW RISES INTO PLACE AS IT ARRIVES, and with NO `order`. A stagger
               is for the few elements of one band crossing the fold together; twelve rows
               in a column taller than the screen do not, so an index delay would sit on
               top of an arrival the reader has already waited for. The scroll IS the
               stagger here. The wrapper is what the `gap-1` above now spaces. */
            <Reveal key={entry.id}>
              <Collapse id={entry.id} title={t(entry.question)}>
                <RichText k={entry.answer} as="p" />
              </Collapse>
            </Reveal>
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
        <Reveal className="mx-auto mt-10 flex max-w-3xl flex-wrap items-center gap-x-2 gap-y-1 text-sm">
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
        </Reveal>
      </HomeSection>
    </div>
  )
}
