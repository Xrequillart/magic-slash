'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useT } from '@/lib/i18n/useLanguage'
import type { MessageKey } from '@/lib/i18n'
import { DESKTOP_DOWNLOAD_URL } from '@/lib/desktopRelease'
import { LanguageMenu } from './LanguageMenu'
import { GithubIcon } from './icons'
import { GITHUB_REPO_URL, LICENSE_URL, NEW_ISSUE_URL, SECURITY_URL } from './links'

/**
 * The public site's footer — brand, three link columns, copyright, language picker.
 *
 * IN TAILWIND, where it used to be a dozen `marketing.css` classes; the stylesheet no
 * longer reaches these routes. The plate is `ink`, which is the one place on the public
 * site that inverts — a light footer under a light page has nothing to end the page
 * WITH — so everything on it comes from the `onink` ladder in `tailwind.config.ts`
 * (`body` for a link row, `dim` for the tagline and the glyph, `faint` for a column
 * heading and the copyright, `rule` for the hairline above the last line). Those used
 * to be `text-white/{60,50,40}` and `border-white/10` written out at each site: six
 * alphas repeated across ten call sites, which is the one hardcoded value the design
 * brief's allowance for new structural components does not permit.
 *
 * THREE COLUMNS, and the split is by what a reader is looking for rather than by where
 * the link goes: Product is the pitch (the page's own sections, and the build itself),
 * Resources is the reference, Legal is the paperwork. Every Legal entry leaves for
 * GitHub on purpose — see the note on `LICENSE_URL` in `links.ts`, and the one on
 * `site.footer.legal` in the catalogue.
 *
 * Every destination here EXISTS. `PUBLIC_PATHS` in `lib/hostRouting.ts` is `/`,
 * `/story` and `/documentation`, so a footer link to `/faq` or `/pricing` would not 404
 * on production — it would 307 the reader to a login form, which is worse.
 */

/**
 * One column, as data: a heading key and its rows, in order.
 *
 * `'GitHub'` beside `MessageKey` is the one row that is not copy — it is a product name,
 * spelled the same in every language, and giving it a catalogue entry would mean an
 * en/fr pair that is identical on purpose and therefore an entry in `i18n.test.ts`'s
 * allow-list. One narrow union is cheaper than that.
 */
type Column = {
  title: MessageKey
  rows: { href: string; label: MessageKey | 'GitHub'; external?: boolean }[]
}

/**
 * At module scope: every value in here is a `MessageKey` literal or a module constant,
 * so there is nothing to resolve per render — the labels go through `t()` down in the
 * markup. Same shape as the homepage's `FEATURES` and `STEPS`.
 */
const COLUMNS: Column[] = [
  {
    title: 'site.footer.product',
    rows: [
      // Both of these were same-page anchors — `/#features` and `/#commands` — and both
      // bands are gone. "Features" survives, repointed at the docs section that lists
      // them; "The commands" does not, because there is nothing left that is about the
      // commands specifically. Its `site.footer.commands` key stays in the catalogues
      // unreferenced, like every other family this rebuild retired.
      { href: '/documentation#skills', label: 'site.footer.features' },
      { href: '/#how', label: 'site.footer.howItWorks' },
      // The .dmg itself, not a releases page — see `DESKTOP_DOWNLOAD_URL`. A plain
      // anchor because GitHub answers it with `Content-Disposition: attachment`, so
      // the page the reader is on never changes.
      { href: DESKTOP_DOWNLOAD_URL, label: 'site.footer.download', external: true },
    ],
  },
  {
    title: 'site.footer.resources',
    rows: [
      { href: '/documentation', label: 'site.footer.documentation' },
      { href: '/documentation#quick-start', label: 'site.footer.gettingStarted' },
      { href: '/documentation#configuration', label: 'site.footer.configuration' },
      { href: '/documentation#changelog', label: 'site.footer.changelog' },
      { href: '/story', label: 'site.footer.ourStory' },
      { href: GITHUB_REPO_URL, label: 'GitHub', external: true },
    ],
  },
  {
    title: 'site.footer.legal',
    rows: [
      { href: LICENSE_URL, label: 'site.footer.license', external: true },
      { href: SECURITY_URL, label: 'site.footer.security', external: true },
      { href: NEW_ISSUE_URL, label: 'site.footer.reportIssue', external: true },
    ],
  },
]

/**
 * One row, either dress. The `<a>` and the `<Link>` must not drift apart.
 *
 * `hover:text-white` is Tailwind's own full-strength white on purpose: it is the top of
 * the `onink` ladder and the hover target of all three of its rungs, so it needs no
 * name of its own — see the note on those tokens in `tailwind.config.ts`.
 */
const ROW = 'text-sm text-onink-body transition hover:text-white'

export function SiteFooter({ serverYear }: { serverYear: number }) {
  const { t } = useT()

  // The copyright year, without a hydration mismatch and without going stale.
  //
  // `docs/` used `document.write(new Date().getFullYear())`, which has no
  // server-rendered equivalent: computing the date during SSR bakes the year into a
  // statically generated page, and computing it during render makes the server's HTML
  // and the client's first paint disagree across a New Year boundary. So the server's
  // year is the initial state — hydration matches by construction — and the browser
  // corrects it after mount on the one day a year it could be wrong.
  const [year, setYear] = useState(serverYear)
  useEffect(() => {
    setYear(new Date().getFullYear())
  }, [])

  return (
    // `border-t` HERE rather than `border-b` on the band above it: the closing CTA and
    // this footer are both `bg-ink`, so what separates them is a rule and nothing else,
    // and the rule belongs to whichever of the two is always present. `/story` has no
    // closing band of its own shape, but it does have this footer.
    //
    // `onink-rule` — white at 10% — and it started at the link colour, white at 60%, which
    // read as a bright band across the page. On a surface this close to black there is
    // only one direction "darker" can go: DOWN IN WHITE. A rule actually darker than
    // `ink` (#0a0a0a) has nothing left to be darker against and disappears, so the knob
    // is alpha, not hue. At 10% the line is a dark grey groove — present when you look
    // for it, silent when you do not — and it is the same value that divides the columns
    // from the copyright below, so the footer now has one rule weight instead of two.
    <footer className="border-t border-onink-rule bg-ink px-6 pb-8 pt-16 text-white">
      <div className="mx-auto max-w-site">
        <div className="flex flex-col gap-12 md:flex-row md:justify-between">
          <div className="max-w-xs">
            {/* The white variant, because this band is `bg-ink`. It is a real second
                file rather than the black one under a CSS `invert`: the artwork carries
                `fill="black"` on its paths, so a filter would be inverting a colour the
                markup states rather than one it inherits — and the two-file pair is the
                convention the logo it replaces already used. */}
            <img className="h-12 w-auto" src="/img/logo-white.svg" alt="Magic slash" />
            <p className="mt-4 text-sm text-onink-dim">{t('site.footer.tagline')}</p>
            <a
              href={GITHUB_REPO_URL}
              target="_blank"
              rel="noreferrer"
              aria-label="GitHub"
              className="mt-5 inline-flex text-onink-dim transition hover:text-white"
            >
              <GithubIcon size={20} />
            </a>
          </div>

          <div className="grid grid-cols-2 gap-x-10 gap-y-8 sm:grid-cols-3">
            {COLUMNS.map((column) => (
              <div key={column.title}>
                <h4 className="font-display text-xs font-bold uppercase tracking-wider text-onink-faint">
                  {t(column.title)}
                </h4>
                <ul className="mt-4 flex flex-col gap-2.5">
                  {column.rows.map((row) => {
                    const label = row.label === 'GitHub' ? 'GitHub' : t(row.label)
                    return (
                      <li key={row.href}>
                        {row.external ? (
                          <a href={row.href} target="_blank" rel="noreferrer" className={ROW}>
                            {label}
                          </a>
                        ) : (
                          <Link href={row.href} className={ROW}>
                            {label}
                          </Link>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-14 flex flex-wrap items-center justify-between gap-4 border-t border-onink-rule pt-6">
          <span className="text-xs text-onink-faint">© {year} magic-slash</span>
          <LanguageMenu variant="footer" />
        </div>
      </div>
    </footer>
  )
}
