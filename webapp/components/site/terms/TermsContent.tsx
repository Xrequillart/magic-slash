'use client'

import { useT } from '@/lib/i18n/useLanguage'
import { PAGE_CHROME, SECTIONS } from '@/lib/termsPage'
import { Bloom } from '../home/HeroSection'
import { HomeSection } from '../home/Shell'
import { RichText } from '../RichText'
import { LICENSE_URL, NEW_ISSUE_URL } from '../links'

/**
 * The whole of `/terms`: what Magic Slash is provided as, what you may do with it, and
 * what it does not promise.
 *
 * ── IT IS NOT THE LICENCE, AND SAYS SO ──────────────────────────────────────────────
 *
 * The code is under PolyForm Shield 1.0.0 and `LICENSE` in the repository is the licence.
 * This page NAMES that
 * file and links to it rather than restating its terms, because a second, prettier copy
 * of a licence is a second copy to keep in step with the one that actually governs, and
 * the two would eventually disagree in front of the person relying on them. What is left
 * for this page is everything the licence does not cover: the hosted account, the
 * services you connect it to, and who is responsible for what the agent does.
 *
 * SO THERE IS NO EULA HERE EITHER. The desktop app is the same licensed code, installed.
 *
 * ── SOURCED, LIKE `/privacy` ────────────────────────────────────────────────────────
 *
 * Same rule as the page next door and it is worth restating on both: no clause here may
 * describe a thing this repository does not do. It is an obligation on the next edit and
 * not a property this file can vouch for. Two clauses broke it on the first pass, the
 * machine clause and the third-party one, and both are corrected in the catalogues with
 * the reason recorded above the key. There is no governing law and no
 * jurisdiction, because naming one is a decision about a legal entity and the repository
 * names an author, not a company. There is no paid plan, no fee and no refund policy,
 * because there is no billing code. Those are gaps to close with a lawyer, and the copy
 * is written so that closing them is an addition rather than a correction.
 *
 * ── THE SHAPE ───────────────────────────────────────────────────────────────────────
 *
 * `PrivacyContent.tsx`'s frame, deliberately identical: the same opening band, the same
 * `max-w-3xl` column, the same headed sections rendered from an array, the same footnote
 * out. Two legal pages that read differently make the reader wonder which one is the
 * real one.
 *
 * AND THE ARRAY IS IN `lib/termsPage.ts`, not here, which is the same move made next
 * door and for the same reason spelled out there: the keys used to sit in this file
 * under a comment that leaned on `next build`'s typecheck, and that build only ever runs
 * on Vercel — `.github/workflows/ci.yml` typechecks `desktop/` alone. Meanwhile `t()`
 * renders a key it does not know as an EMPTY paragraph, so a mistyped key here shipped
 * as a clause with a heading and no clause under it, silently. In `lib/` the list is
 * read by `termsPage.test.ts` in the root vitest suite, which looks each key up in both
 * catalogues on the pull request itself.
 *
 * TWO LINKS, BOTH COMPOSED HERE. `i18n.test.ts` fails on an `<a>` in a translated string,
 * so the hrefs are `LICENSE_URL` and `NEW_ISSUE_URL` from `links.ts` and only the labels
 * are keys. `LICENSE_URL` is one of the two constants that file keeps for exactly this:
 * a document read from the repository, because there is no `/license` route and there is
 * not meant to be one.
 */

export function TermsContent() {
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
        <div className="mx-auto flex max-w-3xl flex-col gap-10">
          {SECTIONS.map((entry) => (
            <section key={entry.title}>
              <h2 className="font-display text-xl font-black leading-tight text-ink md:text-2xl">
                {t(entry.title)}
              </h2>
              <RichText
                k={entry.body}
                as="p"
                className="mt-3 text-base leading-relaxed text-ink/70"
              />
            </section>
          ))}

          {/* THE TWO WAYS OUT of this page, on one line under the rule: the licence
              itself, and the place to ask about any of the above. Both leave the site,
              which is the honest shape — one is a file in the repository and the other is
              its issue tracker. */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-hairline pt-6 text-sm">
            <a
              href={LICENSE_URL}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-ink transition-colors hover:text-brand"
            >
              {t(PAGE_CHROME.licenseLink)}
            </a>
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
