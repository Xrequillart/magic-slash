'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useT } from '@/lib/i18n/useLanguage'
import type { MessageKey } from '@/lib/i18n'
import { FAQ_NAV_ROW, PRODUCT_MENU, type SiteNavRow } from '@/lib/siteNav'
import { LanguageMenu } from './LanguageMenu'
import { GithubIcon } from './icons'
import { GITHUB_REPO_URL, NEW_ISSUE_URL } from './links'

/**
 * The public site's footer — brand, two link columns, copyright, language picker.
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
 * THREE COLUMNS, AND THE FIRST IS THE HEADER'S PRODUCT MENU. That is the change worth
 * reading twice, because the table below no longer decides most of what is in it: the
 * Product column IS `PRODUCT_MENU`, read from `lib/siteNav.ts` — so a row added to the
 * menu appears here, and a footer that disagrees with the bar about where "Download"
 * goes is no longer possible. It was possible until today, and the two did disagree: see
 * the note on the Product column.
 *
 * THE HELP COLUMN WAS THE HEADER'S SECOND MENU and there is no second menu any more:
 * "Best practices" is deleted and the FAQ is a bare link in the bar (see `FAQ_NAV_ROW`).
 * So this is the one column the footer now COMPOSES rather than mirrors — the FAQ, then
 * "Report an issue" pulled across from Resources, which is the honest pairing: both rows
 * answer "I am stuck", one with an answer we have already written and one with the way
 * to ask for an answer we have not. It stays a column of two rather than collapsing into
 * Resources because a footer of two columns leaves a third of the row empty and reads as
 * a column that failed to render — the same reason it stayed at three when the Legal one
 * went.
 *
 * AND THERE WERE THREE COLUMNS UNTIL RESOURCES EMPTIED OUT. It held `/story` and the
 * repository. The founding story is deleted by request — the page, the bar's link and
 * this row together — which left one row pointing at GitHub, and the GLYPH under the
 * tagline four inches to its left already points there. So the column went rather than
 * standing as a heading over a link the footer makes twice. The mark stays, because it
 * is the one that was never a duplicate.
 *
 * TWO COLUMNS, THEN, and the note in the markup below says what that does to the grid.
 * `site.footer.resources` is parked in the catalogues with the rest of the retired
 * footer family rather than deleted: the next column this footer grows may well be that
 * word again.
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
 * `siteNav.test.ts`, and this file now adds no internal destination of its own — the two
 * URLs it spells out, the issue tracker and the repository, leave the site and are not
 * that list's business.
 */

/**
 * One column, as data: a heading key and its rows, in order.
 *
 * `label` WAS `MessageKey | 'GitHub'`, the union carrying the one row that was not copy:
 * a product name, spelled the same in every language, which a catalogue entry would have
 * turned into an identical en/fr pair and therefore a line in `i18n.test.ts`'s exact
 * allow-list. That row went with the Resources column — the footer still links to the
 * repository, as the mark under the tagline — so every label here is a key again and the
 * markup below has one branch fewer.
 */
type Column = {
  title: MessageKey
  rows: { href: string; label: MessageKey; external?: boolean }[]
}

/**
 * Nav rows, as footer rows.
 *
 * The nav carries a glyph and a family colour per row (see `SiteNavRow`) and the footer
 * wants neither: this column is ten words on an ink plate, and a tinted icon beside each
 * would turn the quietest surface on the site into the loudest. So the mapping drops
 * everything but the destination and its label — which is also the whole of what the two
 * surfaces have to agree about.
 *
 * Nothing it is handed is `external`: every row of the Product menu, and the FAQ row
 * beside it, is a page on this site.
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
    // `site.footer.help` — "Help" / "Aide". It was `site.nav.help`, the header's own
    // trigger label, on the argument that one word for one set of rows should not be
    // typed twice; the header has no such trigger now, so the key moved into the family
    // every other heading here comes from rather than staying the last `site.nav.*`
    // entry with nothing in the nav behind it.
    title: 'site.footer.help',
    rows: [
      // THE FAQ THROUGH `FAQ_NAV_ROW`, which is the header's own row: `site.footer.faq`
      // is retired with the rest of that family, so the label is `site.nav.faq` and the
      // two surfaces cannot come to call one page two things. The `href` comes with it,
      // which is what stops this column pointing at a `/faq` typed by hand.
      ...asRows([FAQ_NAV_ROW]),
      // MOVED IN FROM RESOURCES, where it had itself moved from the Legal column that
      // was cut. Under "Legal" it read as paperwork and under "Resources" as one item of
      // reference among three; here it is what it is — the next thing to try when the
      // FAQ did not have the answer.
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
    // and the rule belongs to whichever of the two is always present — every public page
    // ends on this footer, and not all of them end on that band.
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

          {/* TWO NOW, WHICH IS WHY `sm:grid-cols-3` IS GONE RATHER THAN LEFT HARMLESS:
              three tracks over two columns would hold a third of this row empty and read
              as a column that failed to render — the exact failure that kept the footer
              at three when the Legal column was cut. `grid-cols-2` is what the row
              already did below `sm`, so the narrow layout is unchanged and the wide one
              simply stops promising a track nothing fills.

              THE COLUMNS STILL SIT IN THE RIGHT HALF of the footer: the flex row above
              is `md:justify-between`, so the brand block holds the left and this grid
              holds the right whatever it contains. */}
          <div className="grid grid-cols-2 gap-x-10 gap-y-8">
            {COLUMNS.map((column) => (
              <div key={column.title}>
                <h4 className="font-display text-xs font-bold uppercase tracking-wider text-onink-faint">
                  {t(column.title)}
                </h4>
                <ul className="mt-4 flex flex-col gap-2.5">
                  {column.rows.map((row) => (
                    <li key={row.href}>
                      {row.external ? (
                        <a href={row.href} target="_blank" rel="noreferrer" className={ROW}>
                          {t(row.label)}
                        </a>
                      ) : (
                        <Link href={row.href} className={ROW}>
                          {t(row.label)}
                        </Link>
                      )}
                    </li>
                  ))}
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
