'use client'

import { useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { ButtonNavLink, Collapse } from '@/components/ui'
import { FAQ_PATH, HOME_CHROME, HOME_QUESTIONS } from '@/lib/faq'
import { useT } from '@/lib/i18n/useLanguage'
import { Reveal } from '../Reveal'
import { RichText } from '../RichText'
import { HomeHeading, HomeSection } from './Shell'

/**
 * The last band before the ask: five questions, and a way to the other six.
 *
 * ── WHY IT IS HERE, AND WHY HERE SPECIFICALLY ───────────────────────────────────────
 *
 * IT SITS BETWEEN `BuiltForSection` AND `FinalCtaSection`, which is the whole idea. The
 * page spends five bands saying what the product does and then asks for a download; the
 * reader who has got that far and not pressed the button is held up by something, and
 * on a product like this it is nearly always one of five things — is this for me, what
 * does it cost, what do I need, will it run on my machine, does it know my tracker.
 * Answering those in the band ABOVE the button is the difference between a closing CTA
 * and a closing CTA somebody presses. `HOME_QUESTION_IDS` in `lib/faq.ts` carries the
 * argument for which five, and for the six it deliberately leaves on `/faq`.
 *
 * IT IS NOT BAND ⑧ COMING BACK, and the difference is the point. That band WAS the FAQ:
 * five questions on a site with no FAQ page to send anyone to, which is why it was cut
 * in the rebuild and why `site.faq.viewAll` went with it. This is a WINDOW onto `/faq` —
 * the same rows, rendered from the same list, with a button to the rest. Nothing here
 * duplicates a question; see `HOME_QUESTIONS`.
 *
 * ── THE SHAPE ───────────────────────────────────────────────────────────────────────
 *
 * TWO COLUMNS: the copy and the button on the left, the five rows on the right. The
 * product owner asked for it that way, and it is the right split for a band whose job is
 * a SIDE ARGUMENT rather than the page's spine — a centred heading over a full-width
 * accordion would read as the page changing subject, where a column of rows beside a
 * heading reads as a footnote you can open.
 *
 * 5/12 AND 7/12, not `lg:grid-cols-2`. Half of `max-w-site` is 550px, and the rows are
 * the half that needs the room: a question is `text-lg` inside `Collapse`'s `p-4`, so
 * 550px leaves ~46 characters and two of these questions wrap onto three lines. Giving
 * the list 7/12 (~600px) and the copy 5/12 costs the copy nothing — it is a headline,
 * three lines and a button, and `HomeHeading`'s own `max-w-2xl` was never the binding
 * width here.
 *
 * `lg:` AND NOT `md:`, because the rung matters: at `md` (768px) a 7/12 column is 430px,
 * which is worse for these questions than one column at full width. So the band stacks
 * until 1024px and the rows get the whole measure below that.
 *
 * ── WHAT IT DOES NOT DO ─────────────────────────────────────────────────────────────
 *
 * NO ROW OPENS ON ARRIVAL. `defaultOpen` is available on `Collapse` and this band does
 * not use it: five collapsed plates are a list you take in at a glance, and one of them
 * hanging open makes the right column taller than the left for a reason the reader
 * cannot see. It also picks a question on their behalf, which is exactly what a band
 * showing five out of eleven should avoid.
 *
 * ONE ROW AT A TIME, and this band IS an accordion — which is the opposite of `/faq`,
 * and the opposite of what shipped here first. It went out with every row owning its own
 * state, on the page's argument (`FaqContent` makes it at length: two of those answers
 * get compared, and a widget that shuts the first as you open the second makes that
 * impossible for no gain) plus one of this band's own — that closing a row undoes the
 * reader's last action. The product owner asked for it the other way, and on this
 * surface they are right for a reason the page does not have:
 *
 *   • THE BAND IS TWO COLUMNS, and the rows are one of them. Every open row makes the
 *     right column taller while the left stays a heading, a paragraph and a button, so
 *     five open answers is a column three times the height of the one beside it and a
 *     band that has lost its shape. On `/faq` the rows ARE the page and there is nothing
 *     for them to grow out of alignment with.
 *   • NOBODY COMPARES TWO OF THESE FIVE. The comparing happens between `trackers` and
 *     `platforms`, or `terminal` and `updates` — and only one of each pair is on this
 *     band. The five here are five independent yes/no doubts, read one at a time by
 *     definition.
 *   • THE ASK IS DIRECTLY BELOW. Rows that stay open push the download button further
 *     down the page with every question the reader opens, which is the one thing a band
 *     immediately above a CTA must not do.
 *
 * `Collapse` SUPPORTS BOTH and this needed no change to it: pass `open` and `onToggle`
 * and the row stops keeping its own state. So the two surfaces disagree about the
 * behaviour without owning two components — see the note at the bottom of that component.
 *
 * `null` IS A REAL STATE and the one the band arrives in: all five closed. The accordion
 * closes the open row when its own question is pressed again, rather than trapping the
 * reader into always having exactly one answer showing.
 *
 * NO `id` ON THE ROWS. On `/faq` each row is addressable, because `/faq#credentials` is
 * a link that gets pasted into a support reply. Here the ids would be DUPLICATES of that
 * page's — same `id` attribute on two routes is not invalid, but `#developer` would then
 * mean "the homepage band" or "the FAQ row" depending on which page you were on, and the
 * one worth linking is the page. So the anchor stays there and this band takes none.
 *
 * NO `id` ON THE BAND EITHER, which is the homepage's standing rule: every nav row that
 * names this page names a ROUTE, and the page publishes no same-page anchor. See
 * `app/(marketing)/page.tsx`. A `#faq` here would be the first, and it would compete
 * with `/faq` in the header for the same word.
 */
export function FaqSection() {
  const { t } = useT()

  // WHICH ROW IS OPEN, or `null` for none — the band's whole state, and the reason it is
  // here rather than in each row. Holding the id (and not a boolean per row) is what
  // makes "open this one" and "close the other one" the same assignment.
  const [openId, setOpenId] = useState<string | null>(null)

  return (
    <HomeSection>
      {/* `items-start` so the two columns keep their own heights — the alternative
          stretches the copy column to the list's height and centres nothing in
          particular. `gap-12` between the columns and, below `lg`, between the stacked
          blocks: the copy and the rows are one argument, so they sit closer than two
          bands do. */}
      <div className="grid items-start gap-12 lg:grid-cols-12">
        {/* THE COPY. `HomeHeading` is the page's own heading vocabulary — the same `h2`
            size every band above uses — and it needs no eyebrow: there is no slash
            command to name here, which is what that slot is for. */}
        <Reveal order={1} className="lg:col-span-5">
          <HomeHeading title={t(HOME_CHROME.title)} subtitle={t(HOME_CHROME.subtitle)} />

          {/* `secondary`, and it is the one button on the page that argues for being
              quieter than its band. Two `primary` blues within one screen of each other
              — this and the download below it — would put the page's loudest control on
              its second-most-important action; the reader who wants the FAQ will find a
              white button, and the reader who wants the app should meet only one blue
              one. `ButtonNavLink` because `/faq` is a route on this origin: see the note
              on that component for why an `<a>` here would be the only internal link on
              the site that reloads the document. */}
          <div className="mt-8">
            <ButtonNavLink href={FAQ_PATH} variant="secondary" size="lg" icon={ArrowRight}>
              {t(HOME_CHROME.cta)}
            </ButtonNavLink>
          </div>
        </Reveal>

        {/* THE ROWS. `gap-1` is `Collapse`'s own convention — the reference's 5px of air
            between plates, owned by the group rather than by the row, so a lone row
            never ships with space under it. `FaqContent` states the same rule and the
            same reason for not putting a border or a divider anywhere near these.

            ONE `Reveal` AROUND THE WHOLE LIST, not one per row. Five plates staggered
            15ms apart is an animation the reader watches instead of a band that arrives;
            the two columns are the two things moving here, which is why the order runs
            1, 2 rather than 1..6. */}
        <Reveal order={2} className="lg:col-span-7">
          <div className="flex flex-col gap-1">
            {HOME_QUESTIONS.map((entry) => (
              /* `RichText` for the answer and `t()` for the question, exactly as the page
                 does it: the answers carry `<code>` and `<strong>` (a path, a version, a
                 product name mid-sentence) and the questions carry no markup at all. */
              <Collapse
                key={entry.id}
                title={t(entry.question)}
                open={openId === entry.id}
                /* `next` is the state the row is asking for, so this is the whole
                   accordion: opening one row stores its id and the previously open row
                   is no longer the match, and pressing the open row again stores `null`.
                   No effect, no list of booleans to keep in step. */
                onToggle={(next) => setOpenId(next ? entry.id : null)}
              >
                <RichText k={entry.answer} as="p" />
              </Collapse>
            ))}
          </div>
        </Reveal>
      </div>
    </HomeSection>
  )
}
