'use client'

import { useT } from '@/lib/i18n/useLanguage'
import { PAGE_CHROME, SECTIONS } from '@/lib/privacyPage'
import { Bloom } from '../home/HeroSection'
import { HomeSection } from '../home/Shell'
import { RichText } from '../RichText'
import { NEW_ISSUE_URL } from '../links'

/**
 * The whole of `/privacy`: what Magic Slash stores, what never leaves the machine, and
 * how to be rid of all of it.
 *
 * ── THE RULE THIS PAGE WAS WRITTEN UNDER ────────────────────────────────────────────
 *
 * EVERY CLAIM MUST BE SOURCED FROM CODE IN THIS REPOSITORY, and that is a constraint on
 * whoever edits the copy next rather than a boast about the copy as it stands. A privacy
 * policy is the one page on a site that is read as a promise, so a sentence here that
 * nothing enforces is worse than no sentence: it is a commitment made on behalf of a
 * system that does not know about it.
 *
 * AND NOTHING IN THIS TREE CHECKS THE RULE, which the first version of the copy proved:
 * a read against the code found five claims false or materially incomplete, from the
 * Jira credential on disk that the "only token" sentence denied by omission to the
 * personal rows `delete_account()` leaves behind. They are corrected in the catalogues
 * and the reason sits above each key. Re-read the named file before rewording a claim.
 *
 * So the page deliberately does NOT say several things a template would have said. There
 * is no retention period, because nothing in `supabase/migrations` expires a row. There
 * is no legal entity, because the repository names an author and not a company. There is
 * no GDPR legal basis and no certification, for the same reason. Where the code does not
 * settle a question, the copy says less. The notes beside the `site.privacy.*` family in
 * `lib/i18n/marketing/en.ts` name a migration or a module per claim.
 *
 * ── THE SHAPE ───────────────────────────────────────────────────────────────────────
 *
 * `/faq`'s page frame, unchanged: `padding="hero"` because the bar is `fixed` at `h-16`
 * and a page's first line owes it that, the `softblue → white` wash, `Bloom` fading
 * `to-white` so the band lands on the ground below, then a `max-w-3xl` column. A legal
 * page that invented a dress of its own would be a second reading experience to
 * maintain, and this one is the same thing those pages are: prose in a column.
 *
 * THE SECTIONS ARE A `.map()` OVER `SECTIONS`, which lives in `lib/privacyPage.ts` and
 * not here, so adding one is a pair of catalogue keys and a row in that module.
 * `RichText` renders the bodies because several of them carry a `<code>` path or a
 * `<strong>` clause, and `<br>` is how a section gets a second paragraph — the
 * catalogue holds strings and never arrays.
 *
 * THAT ARRAY WAS IN THIS FILE, and moving it out is not tidiness. The comment on it
 * argued that spelling each key as a literal against `MessageKey` was enough because
 * `next build` would catch a typo. It would — on Vercel, after the merge.
 * `.github/workflows/ci.yml` typechecks `desktop/` alone, so on a pull request that
 * union checks nothing at all, and `t()` has no per-key fallback: an unknown key renders
 * as an EMPTY paragraph under its heading. On a legal page that is a section which
 * announces a promise and then makes none, shipped in silence. In `lib/` the keys are
 * read by `privacyPage.test.ts` in the root vitest suite, which looks every one of them
 * up in both catalogues on the pull request itself. That module is also where the page's
 * path lives, pinned against `PUBLIC_PATHS`.
 *
 * NO CLOSING CTA. `page.tsx` says why at length; the short version is that a download
 * button under a retention section undoes the page.
 *
 * ── THE ONE LINK ────────────────────────────────────────────────────────────────────
 *
 * COMPOSED HERE, NOT IN THE CATALOGUE. `i18n.test.ts` fails on an `<a>` in a translated
 * string, which is the right rule: a URL in a translator's hands is a URL that changes
 * when somebody edits prose. So the href is `NEW_ISSUE_URL` from `links.ts` and only the
 * LABEL is a key. The same shape `FaqContent.tsx` uses for its way out.
 *
 * AND IT IS THE ISSUE TRACKER RATHER THAN AN ADDRESS, which is a fact about this
 * repository rather than a preference: there is no contact email anywhere in it. Writing
 * one here would be inventing a mailbox nobody reads, on the page where being reachable
 * is the entire point.
 *
 * ── NO `marketing.css` ──────────────────────────────────────────────────────────────
 *
 * `homepageStylesheet.test.ts` walks `components/site/**` recursively, so this tree is in
 * it. Every value here is a token from `tailwind.config.ts`; there is no button on the
 * page at all, which is the easiest way to pass a rule about button classes.
 */

export function PrivacyContent() {
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
            {t(PAGE_CHROME.title)}
          </h1>
          <p className="mx-auto mt-8 max-w-xl text-lg leading-relaxed text-ink/60">
            {t(PAGE_CHROME.lead)}
          </p>
        </div>
      </HomeSection>

      <HomeSection padding="follow">
        {/* 48rem, the measure `/faq`'s answers are set to: about 75 characters, which is
            where a paragraph stops needing the eye to travel back. A legal page is the
            worst place to make that trip harder than it has to be. */}
        <div className="mx-auto flex max-w-3xl flex-col gap-10">
          {SECTIONS.map((entry) => (
            <section key={entry.title}>
              <h2 className="font-display text-xl font-black leading-tight text-ink md:text-2xl">
                {t(entry.title)}
              </h2>
              {/* `text-ink/70` and not full `text-ink`: the headings above are the whole
                  hierarchy on a page made of nothing but text, and a body at the same
                  strength as its heading flattens it. `/changelog`'s entry rows are set
                  at the same rung, and it is an alpha of `ink` rather than `muted` for
                  the reason `FaqContent.tsx` sets out — `muted` is a cooler hue, so
                  beside `ink` it reads as a second decision instead of one weakened. */}
              <RichText
                k={entry.body}
                as="p"
                className="mt-3 text-base leading-relaxed text-ink/70"
              />
            </section>
          ))}

          {/* THE WAY TO ASK, last, and a footnote rather than a band of its own — the
              ending `/faq` has, for the same reason: whoever is at the bottom of this
              page has a question it did not answer, and the useful response is where to
              put it rather than a download button. */}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-hairline pt-6 text-sm">
            <span className="text-ink/60">{t(PAGE_CHROME.askLead)}</span>
            <a
              href={NEW_ISSUE_URL}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-ink transition-colors hover:text-brand"
            >
              {t(PAGE_CHROME.askLink)}
            </a>
          </div>
        </div>
      </HomeSection>
    </div>
  )
}
