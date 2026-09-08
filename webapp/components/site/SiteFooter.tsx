'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useT } from '@/lib/i18n/useLanguage'
import type { MessageKey } from '@/lib/i18n'
import { HELP_MENU, HELP_MENU_LABEL, PRODUCT_MENU, type SiteNavRow } from '@/lib/siteNav'
import { LanguageMenu } from './LanguageMenu'
import { GithubIcon } from './icons'
import { GITHUB_REPO_URL, NEW_ISSUE_URL } from './links'

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
 * THREE COLUMNS, AND THE FIRST TWO ARE THE HEADER'S TWO MENUS. That is the change worth
 * reading twice, because the table below no longer decides most of what is in it: the
 * Product column IS `PRODUCT_MENU`, the Help column IS `HELP_MENU` — both read from
 * `lib/siteNav.ts`, heading included — so a row added to a menu appears here, and a
 * footer that disagrees with the bar about where "Download" goes is no longer possible.
 * It was possible until today, and the two did disagree: see the note on the Product
 * column.
 *
 * WHICH LEAVES RESOURCES AS WHAT THE FOOTER ALONE CARRIES: `/story`, the issue tracker
 * and the repository. That is the honest content of the column rather than a leftover —
 * a bar of two menus has no room for a company's story, and the bottom of a page
 * somebody read to the end is exactly where it belongs. The three rows are also why
 * this stayed at three columns when the Legal one went: two columns left a third of the
 * row empty and read as a column that had failed to render.
 *
 * THERE WAS A LEGAL COLUMN — the licence, the security policy and the issue tracker,
 * three links that all left for GitHub. It is gone by request. "Report an issue" moved
 * into Resources, where it reads as one of the ways to get help rather than as
 * paperwork, and the other two links are NOT on this site any more: nothing links to
 * `LICENSE` or `SECURITY.md` from the public pages now. `links.ts` still exports both
 * URLs and says so; whoever gives those two pages a route (story #273) has somewhere to
 * point them from.
 *
 * Every destination here EXISTS, and an internal one has to be a path `PUBLIC_PATHS` in
 * `lib/hostRouting.ts` enumerates: a footer link to a path absent from that list would
 * not 404 on production — it would 307 the reader to a login form, which is worse. The
 * rows that come from `lib/siteNav.ts` are pinned against that list by
 * `siteNav.test.ts`; the three this file adds are `/story`, which has been in it since
 * the page shipped, and two external URLs, which are not its business.
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
 * A menu's rows, as footer rows.
 *
 * The nav carries a glyph and a family colour per row (see `SiteNavRow`) and the footer
 * wants neither: this column is ten words on an ink plate, and a tinted icon beside each
 * would turn the quietest surface on the site into the loudest. So the mapping drops
 * everything but the destination and its label — which is also the whole of what the two
 * surfaces have to agree about.
 *
 * Nothing here is `external`: every row of both menus is a page on this site.
 */
const asRows = (rows: SiteNavRow[]): Column['rows'] =>
  rows.map((row) => ({ href: row.href, label: row.label }))

/**
 * At module scope: every value in here is a `MessageKey` literal, a module constant or a
 * mapping over one, so there is nothing to resolve per render — the labels go through
 * `t()` down in the markup. Same shape as the homepage's `FEATURES` and `STEPS`.
 */
const COLUMNS: Column[] = [
  {
    title: 'site.footer.product',
    // THE HEADER'S PRODUCT MENU, IN ITS ORDER, and this column used to be two rows that
    // were nobody's copy of anything: `/features` under a `site.footer.features` key of
    // its own, and the `.dmg` itself under `site.footer.download`.
    //
    // BOTH OF THOSE WERE DRIFT, and the second was a real disagreement rather than an
    // untidiness: the bar's Download row opens `/download` — the page that will hold the
    // button, the prerequisites and the release notes — while this row started the
    // download outright. One label, two destinations, on one page. The menu's version
    // wins because it is the one a reader can be told about ("it's under Product"), and
    // `DESKTOP_DOWNLOAD_URL` is now named where it belongs: by the page that asks for it.
    //
    // `site.footer.{features,download,commands,howItWorks}` stay in the catalogues
    // unreferenced, like every other family this rebuild has retired: nothing tests for
    // an unused key, and pruning them means editing `i18n.test.ts`'s exact `SAME_IN_BOTH`
    // allow-list in lockstep.
    rows: asRows(PRODUCT_MENU),
  },
  {
    // THE HEADER'S OWN HEADING, `site.nav.help` — "Help" / "Aide" — and not a
    // `site.footer.help` twin of it. Every other column here is titled from the footer's
    // own family because those names differ from the bar's ("Product" is a menu up there
    // and a category down here); this one is the same word for the same two rows, and a
    // second key would be a second thing to keep in step for nothing.
    title: HELP_MENU_LABEL,
    // Best practices, then the FAQ — the menu's order, for the reason it has that order:
    // the teaching before the troubleshooting. `site.footer.faq` is retired with the rest
    // of the family; the row is `site.nav.faq` now, so the two surfaces cannot come to
    // call one page two things.
    rows: asRows(HELP_MENU),
  },
  {
    title: 'site.footer.resources',
    // WHAT NEITHER MENU CARRIES, which is what this column is now — and it is a column
    // of its own rather than three rows appended to Help because these three are not
    // help: one is who we are, one is where to file a bug, one is the source.
    rows: [
      // `/story` stays here by request and it belongs here: a bar has no room for a
      // company's story and the bottom of a page has nothing better to offer.
      { href: '/story', label: 'site.footer.ourStory' },
      // MOVED OUT OF THE LEGAL COLUMN, which is gone. Under "Legal" this read as
      // paperwork; here, between the story and the repository, it reads as what it is —
      // the next thing to try when the FAQ did not have the answer.
      { href: NEW_ISSUE_URL, label: 'site.footer.reportIssue', external: true },
      { href: GITHUB_REPO_URL, label: 'GitHub', external: true },
      // `/changelog` LEFT THIS COLUMN, and it is the one row that moved rather than
      // arrived: it is in the Product menu, so it is in the Product column now. What
      // changed is where it belongs — a changelog is a fact about the build, and the
      // header decided that before this file did.
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

          {/* STILL THREE, though not the same three: Legal left and Help arrived. Which is
              also why this row is untouched — `grid-cols-2` below `sm` wraps the third
              column under the first two, and `sm:grid-cols-3` sets all three across, at
              the widths these labels have always had. */}
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
