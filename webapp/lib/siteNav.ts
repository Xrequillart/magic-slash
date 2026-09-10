import { FAQ_PATH } from './faq'
import type { MessageKey } from './i18n'
import { WORKFLOW_PATH } from './workflow'

/**
 * THE PUBLIC SITE'S HEADER NAV, as data: one menu, the six rows behind it, and the one
 * link the bar carries in the open (`FAQ_NAV_ROW`).
 *
 * The bar used to carry ONE link — `/features`, mapped from a one-row array that
 * `SiteHeader.tsx` still explains at length. This is the shape that array was left an
 * array for: a **Product** dropdown listing everything the product is, then the FAQ
 * beside it in the open. Two controls is the whole bar, which is what keeps it on the
 * page's own column at `md` — the arithmetic is in `SiteHeader`'s header note.
 *
 * TWO PAGES HAVE BEEN DELETED FROM THIS NAV, by request, and between them they took a
 * menu and a bare link:
 *
 *   • `/best-practices` was half of a **Help** menu, the other half being the FAQ. That
 *     menu only ever existed because the FAQ got a NEIGHBOUR — "Best practices" was the
 *     other thing a reader came here to be taught, and two links of that kind side by
 *     side in a bar of two controls read as three peers with no hierarchy at all. With
 *     one of the pair gone there was nothing left to hide behind a trigger, so the FAQ
 *     is a bare link again, which is the shape it had before the menu.
 *   • `/story` was the founding story, and it was a bare link for the reason a menu of
 *     one is furniture: it had no siblings. Nothing replaced it, in the bar or in the
 *     footer.
 *
 * WHICH LEAVES THE BAR AT ONE MENU AND ONE LINK, and the FAQ is the link because of what
 * that page does: it answers the objection that stops a download, so it is one press
 * from anywhere.
 *
 * ONE OF THE TWO NEEDS A REDIRECT AND THE OTHER DOES NOT, which is worth stating rather
 * than assuming. `/story` shipped and was in the footer of every public page for
 * releases, so it is in `RETIRED_PATHS` (`lib/hostRouting.ts`) and 308s to the homepage.
 * `/best-practices` never reached production — no link to it exists to keep alive — and
 * neither did the `/skills` page cut before it.
 *
 * IT WAS SEVEN ROWS AND A `/skills` PAGE FOR ONE ITERATION. That page was cut on the
 * reading that it duplicated `/workflow`: both were going to set out the eight commands,
 * one as the loop and one as a reference, and the loop is the version a visitor deciding
 * whether to install this needs. `/workflow`'s own note already lists the per-command
 * depth a fuller version of it would add — that is where the cut page's content belongs,
 * on the page that was going to link to it anyway. `/features#workflow` remains the
 * inventory's own section, which is where `lib/skillsBand.ts` has always pointed.
 *
 * WHY A MODULE AND NOT SEVEN LITERALS IN THE COMPONENT. Same reason `lib/workflow.ts`
 * owns `WORKFLOW_PATH` and `lib/faq.ts` owns `FAQ_PATH`, and it is not tidiness: a nav
 * row pointing at a path `PUBLIC_PATHS` (`lib/hostRouting.ts`) does not list is NOT a
 * 404 on production — it is a 307 to a login form on `app.magic-slash.io`, so a header
 * link appears to sign the reader out. `siteNav.test.ts` reads that file and pins every
 * row's path against it, and checks the page behind each one exists. Seven rows typed
 * into JSX are six rows no test can enumerate.
 *
 * ZERO RUNTIME IMPORTS BAR `./faq` AND `./workflow`, both of which are themselves pure
 * data (`./i18n` as a TYPE only, erased by esbuild). The constraint is the one stated on
 * `lib/features.ts`: this module is read by `siteNav.test.ts` in the ROOT vitest suite,
 * on the root `node_modules`, and CI never installs `webapp/`'s own — so a `react`,
 * `next/*` or `lucide-react` import at any depth from here would not fail a test, it
 * would fail to RESOLVE one.
 */

/**
 * EVERY GLYPH THE NAV DRAWS, as a union — the reason a resolver map cannot miss one.
 *
 * AN ICON IS A NAME AND NOT A COMPONENT, which is the rule `lib/features.ts` states at
 * length and for the reason that applies here word for word: typing this as a component
 * would import `lucide-react` into a module the ROOT vitest suite reads, and the suite
 * runs on the root `node_modules` — so the import would not fail a test, it would fail
 * to RESOLVE one. `components/site/SiteHeader.tsx` holds the map from these names to
 * lucide's components, beside the markup that renders them.
 *
 * ALL SEVEN ARE LUCIDE EXPORTS, checked against the `^1.26.0` in `webapp/package.json`
 * rather than guessed — v1 dropped the brand glyphs and renamed a family of others
 * (`HelpCircle` is `CircleHelp` here), and a name lucide does not ship is a `tsc` error
 * at the map and a refused Vercel build. The map keeps a fallback behind that anyway.
 *
 * WHICH IS ALSO WHY GITHUB'S MARK IS NOT IN HERE. The bar links to the repository, and
 * that glyph is the one lucide will not ship: `components/site/icons.tsx` draws it, and
 * the link that uses it is written out in `SiteHeader.tsx` rather than being a row here.
 * A `SiteNavIcon` is a name the ICONS map can resolve; a name it cannot is worse than
 * an exception stated once.
 */
export type SiteNavIcon =
  | 'AppWindow'
  | 'CircleHelp'
  | 'Cloud'
  | 'Download'
  | 'Layers'
  | 'ScrollText'
  | 'Workflow'

/**
 * The three colours a nav glyph is drawn in — and they are a GROUPING, not decoration.
 *
 * `accent` is the four rows that are the product itself, `purple` the two that are
 * reference (the inventory, and what changed), `green` the one that is the ask. Which
 * means the rules between the groups and the colours inside them say the same thing
 * twice, on purpose: the rule is the structure for anyone reading the shapes, the colour
 * is the structure for anyone scanning the column, and neither is load-bearing alone.
 *
 * TOKENS, all three — `accent`, `purple` and `green` in `tailwind.config.ts` — and the
 * one worth a note is the last. `green` is declared there as a STATUS colour ("this
 * finished": a check, a diff's additions, a passing gauge), and that file is explicit
 * that spending it on decoration is how a green stops meaning "ok". It is spent here by
 * request, on exactly one row, and the row it is spent on is the one thing on the site
 * that is unambiguously good news — so the two readings do not fight. `Badge`'s own
 * `green` tone is the precedent for using it outside a status.
 *
 * NOT `brand`: the split `tailwind.config.ts` spends its longest note on is that `brand`
 * dresses controls and type while `accent` dresses decoration, and a glyph beside a menu
 * row is decoration — the row is the control.
 */
export type SiteNavTone = 'accent' | 'purple' | 'green'

/** One nav row: where it goes, the key that names it, and how it is drawn. */
export type SiteNavRow = {
  /** A path this site owns — every one of them is in `PUBLIC_PATHS`. */
  href: string
  label: MessageKey
  /**
   * The glyph beside the label, IN THE PANELS. Nothing in the NAV draws one — one
   * trigger, its chevron and one bare link, because a 64px bar of icons beside two words
   * is a toolbar rather than a nav.
   *
   * EVERY ROW HAS ONE ANYWAY, the FAQ included, and the reason is the surface below
   * `md`: there the panel is a single column of every row there is, so a label with no
   * glyph beside six that have one reads as a row that failed to load. The rule is all
   * or none PER PANEL; the bar ignores the field entirely.
   */
  icon?: SiteNavIcon
  /** Which of the three groups the row belongs to, said as a colour. */
  tone?: SiteNavTone
  /**
   * THE GLYPH IN A WHITE TILE — a rounded plate with a hairline and the quietest shadow
   * — rather than bare on the row's own ground.
   *
   * THREE ROWS CARRY IT, and they are the first group: the surfaces the product IS. The
   * treatment is what the reference dress does with the same three families (measured
   * off CleanShot's own Product menu, the site this design system has taken a dress from
   * before — see `Collapse` in `components/ui.tsx`), and the argument is hierarchy: a
   * tile is a THING, and Workflow, Application and Cloud are things. What to read
   * about them and where to get it are not, so those three rows draw a bare tinted glyph.
   *
   * IN THE DROPDOWN ONLY. `MobileMenu` ignores this and draws every row bare, and it is
   * width that decides: a 40px tile plus 12px of gap leaves 204px of a 256px panel for a
   * label, and "Toutes les fonctionnalités" does not fit in it. The panel cannot grow —
   * `w-64` is what fits the 262px a 320px viewport offers — so the tiles are the half of
   * the dress that is dropped rather than the rows or their colours. See `SiteHeader`.
   */
  tile?: true
  /**
   * The row opens a page that is announced and not written: the label carries a small
   * "coming soon" pill beside it, in the menu, in the mobile panel and in the footer, so
   * a reader is told before the press rather than by the page. `/cloud` is the one row
   * that says so today; `SOON_NOTE` is the word on the pill.
   */
  soon?: true
}

/** The pill beside a `soon` row, and the badge on the page it opens. */
export const SOON_NOTE: MessageKey = 'site.nav.soon'

/**
 * THE ONE PAGE THAT DOES NOT EXIST YET, and what it will be about.
 *
 * It is a placeholder on purpose and the shape says so: a path, the label the menu
 * gives it, and the two lines the page itself prints — a title and one lead — with
 * `PLACEHOLDER_NOTE` below them. `components/site/PlaceholderContent.tsx` renders it,
 * so `app/(marketing)/cloud/page.tsx` is a `metadata` export and one component call.
 *
 * IT IS A TABLE OF ONE, AND IT STAYS A TABLE. There were four entries here. `/desktop`
 * left first: the homepage's own app band moved onto it whole
 * (`components/site/desktop/DesktopContent.tsx`). `/download` followed, with the button,
 * the prerequisites and the latest release's notes
 * (`components/site/download/DownloadContent.tsx`) — both rows are written out below
 * rather than mapped from here, and `site.desktopPage.*` is gone from the catalogues
 * while `site.downloadPage.*` stayed, because that page still needs a title and a lead,
 * just not a promise of scope. `/best-practices` left LAST and differently: it was
 * deleted rather than written, with the Help menu that opened it. Collapsing what is
 * left into a bare constant would be a shape that has to be rebuilt the next time a row
 * ships ahead of its page, and `siteNav.test.ts` walks this by entry name.
 *
 * A ROUTE HAD TO EXIST THE DAY THE MENU SHIPPED, which is the same argument
 * `WORKFLOW_PATH` records: the alternative to a thin page is a menu row that 307s to a
 * login form. So the pages open, they say what they will hold, and they close on the
 * homepage's last band.
 *
 * `/desktop` AND NOT `/application`, though the menu row says "Application". The product
 * already owns `/application/*` on `app.magic-slash.io` — the app's own settings section
 * (`app/application/`) — and two route branches resolving one path is a build question
 * rather than a naming one. `/desktop` is also what the page is about: the native macOS
 * app, which the homepage's own band already calls the desktop.
 */
export type PlaceholderPage = {
  path: string
  /** How the Product menu names it. */
  label: MessageKey
  /** The page's `h1`. */
  title: MessageKey
  /** The one line under it. */
  lead: MessageKey
}

export const PLACEHOLDER_PAGES = {
  cloud: {
    path: '/cloud',
    label: 'site.nav.cloud',
    title: 'site.cloudPage.title',
    lead: 'site.cloudPage.lead',
  },
} as const satisfies Record<string, PlaceholderPage>

/**
 * The line every unfinished page carries where its content will go.
 *
 * IT WAS ONE KEY FOR TWO PAGES and it is not renamed for being down to one, because
 * what it says is not about `/cloud`: it is deliberately a plain statement rather than a
 * promise with a date on it — "in preparation" ages, "shipping in March" is wrong in
 * April — and the next unwritten page will want the same sentence.
 */
export const PLACEHOLDER_NOTE: MessageKey = 'site.pageSoon.note'

/**
 * A placeholder page, as the menu row that opens it.
 *
 * The glyph and the tone are arguments rather than fields on `PLACEHOLDER_PAGES`: what a
 * page is called and what it will hold belong to the page, and how the MENU dresses the
 * row that opens it belongs to the menu. `/cloud` would keep its copy if the menu were
 * redrawn tomorrow — which is more than a hypothetical now that a menu has been.
 */
const row = (
  page: PlaceholderPage,
  icon: SiteNavIcon,
  tone: SiteNavTone,
  tile?: true,
): SiteNavRow => ({
  href: page.path,
  label: page.label,
  icon,
  tone,
  tile,
  // Every placeholder page is, by definition, coming soon: the pill follows the row.
  soon: true,
})

/**
 * The page about the app — the one Product row that is neither a placeholder nor owned by
 * a module of its own.
 *
 * HERE RATHER THAN IN A `lib/desktopPage.ts`, and that is a judgement rather than an
 * omission: `lib/workflow.ts` and `lib/faq.ts` own their paths because they own their
 * pages' DATA — five steps, eleven questions — and a component should not have to know
 * the site's URL shape to link to them. `/desktop` has no such data. Its copy is
 * `site.desktop.*`, the family the homepage band brought with it, and its composition is
 * the component. So the path lives with the menu that names it, and `siteNav.test.ts`
 * pins it against `PUBLIC_PATHS` and against the page like every other row.
 *
 * `/desktop` AND NOT `/application`, though the row is labelled "Application": the
 * product owns `/application/*` on `app.magic-slash.io` — its own settings section — and
 * two route branches resolving one path is a build question rather than a naming one.
 */
export const DESKTOP_PATH = '/desktop'

/**
 * The page that hands out the app — the button, what the machine needs first, and what
 * the latest release changed.
 *
 * A PAGE AND NOT THE `.dmg`. The footer's Download row and `FinalCtaSection` still start
 * the download outright (`DESKTOP_DOWNLOAD_URL`); every other button on the site opens
 * this page first, so a visitor is told which build they are getting and what the first
 * launch will check before the file lands in their Downloads folder.
 *
 * NAMED HERE FOR THE SAME REASON `DESKTOP_PATH` IS, and unlike `/workflow` or `/faq` it
 * has a data module of its own (`lib/downloadPage.ts`) that could have owned it. It does
 * not, on purpose: that module is the page's COPY — keys, prerequisites, steps — and the
 * homepage hero and `/desktop` link to this path without needing any of that. A path is
 * a fact about the site, and the menu is where the site's paths are listed.
 */
export const DOWNLOAD_PATH = '/download'

/** The Product menu's trigger. */
export const PRODUCT_MENU_LABEL: MessageKey = 'site.nav.product'

/**
 * THE PRODUCT MENU AS THREE GROUPS, in menu order — and the order is the argument, not
 * the alphabet.
 *
 * WHAT IT IS, then WHAT TO READ ABOUT IT, then THE ASK. Workflow answers "what does this
 * thing do", and the two rows under it are the surfaces it runs on — the one you install
 * and the one you never see (Application, Cloud). The inventory and the changelog are
 * the second group because they are reference — a reader goes to them to look something
 * up, not to be told what the product is. Download is a group of ONE and
 * it is last, because it is the ask, and a menu that asks before it explains is a menu
 * people close.
 *
 * A NESTED ARRAY AND NOT A `divider: true` FLAG ON A ROW, which was the other way to draw
 * the same two rules. A flag says "put a line above me" — the line is then a property of
 * a row, so moving a row moves a rule that was never about it, and two rows both carrying
 * the flag draw two rules with nothing between them. Groups say what is actually true:
 * there are three families here, and the rules are what is BETWEEN them, so a row moved
 * from one family to another keeps the menu coherent and a fourth family is a nested
 * array rather than a flag somebody has to remember to move. `siteNav.test.ts` pins the
 * grouping against the tones for the same reason.
 *
 * `/features` and `/changelog` are spelled here as literals, like they are in
 * `SiteFooter.tsx`'s own table. `/workflow` and `/faq` are not, because those two have
 * an owner already — a second copy of a path whose module exists to hold it is exactly
 * the drift those constants were extracted to stop.
 */
export const PRODUCT_MENU_GROUPS: SiteNavRow[][] = [
  // THE PRODUCT ITSELF — the one group whose glyphs are tiled. See `tile` above.
  [
    { href: WORKFLOW_PATH, label: 'site.nav.workflow', icon: 'Workflow', tone: 'accent', tile: true },
    { href: DESKTOP_PATH, label: 'site.nav.application', icon: 'AppWindow', tone: 'accent', tile: true },
    row(PLACEHOLDER_PAGES.cloud, 'Cloud', 'accent', true),
  ],
  [
    { href: '/features', label: 'site.nav.allFeatures', icon: 'Layers', tone: 'purple' },
    { href: '/changelog', label: 'site.nav.changelog', icon: 'ScrollText', tone: 'purple' },
  ],
  [{ href: DOWNLOAD_PATH, label: 'site.nav.download', icon: 'Download', tone: 'green' }],
]

/**
 * The same six rows, flat — for everything that cares what the menu CONTAINS rather
 * than how it is divided: `ALL_NAV_ROWS` below, and every assertion in
 * `siteNav.test.ts` that walks the rows.
 *
 * Derived, never a second list. The groups are the source; this is a `.flat()` of them.
 */
export const PRODUCT_MENU: SiteNavRow[] = PRODUCT_MENU_GROUPS.flat()

/**
 * The FAQ row — the bar's second control, in the open, which is where it started.
 *
 * A VISITOR WITH A DOUBT is the reader it is for: the page answering the objection that
 * stops a download should be one press from anywhere, and for a release it was not —
 * it spent that release as a row of the **Help** menu, one press further in, on the
 * reading that the word on the trigger is what somebody with a question looks for
 * before they look for "FAQ". That menu is gone with the second row it was built to
 * hold (see the note at the top of this file), and a trigger reading "Help" over a
 * single FAQ row would be a press bought with nothing.
 *
 * ITS OWN CONSTANT STILL, and now for a plainer reason than moving between menus:
 * `SiteHeader.tsx` renders it as a `Link`, so this is the row a test can point at to
 * say the bar names a CONSTANT rather than a path typed into JSX — the whole argument
 * for this module. `siteNav.test.ts` also pins it out of the Product menu.
 */
export const FAQ_NAV_ROW: SiteNavRow = {
  href: FAQ_PATH,
  label: 'site.nav.faq',
  icon: 'CircleHelp',
  // PURPLE AND A GLYPH, neither of which the BAR draws — it had neither the first time it
  // stood out here, and the difference is that it is in `ALL_NAV_GROUPS` now: below `md`
  // it lands in a column where every other row has both. `purple` is the reference
  // family, the one `/features` and `/changelog` are in — a page you go to READ. See
  // `icon` on `SiteNavRow`.
  tone: 'purple',
}

/**
 * THE WHOLE NAV AS GROUPS — the Product menu's three families, then the one row the bar
 * carries itself.
 *
 * This is what the MOBILE panel renders. Below `md` there are no dropdowns at all: the
 * panel is one column of links, so it draws every row in the bar's own order with a rule
 * wherever the bar would have had one — three rules, the last of which is the boundary
 * between the MENU and the row the bar names in the open.
 *
 * WHICH IS THE ONE PLACE THE TRIGGER STOPS BEING VISIBLE, and that last rule is what is
 * left of it. A panel that reproduced the trigger would be a disclosure inside a
 * disclosure — three presses to reach a link on the surface where presses cost most.
 *
 * Fed from the same constants the bar reads rather than a second copy of them, for the
 * reason `SiteHeader`'s note gives: the bar showing a nav the panel does not is a failure
 * nothing announces.
 */
export const ALL_NAV_GROUPS: SiteNavRow[][] = [
  ...PRODUCT_MENU_GROUPS,
  // THE ROW THE BAR SHOWS ITSELF, as the panel's last group. It was a group of two until
  // `/story` was deleted, and it stays a GROUP rather than being appended to the menu's
  // last family for the reason the rule above it draws: what this row has in common with
  // nothing else in the panel is that the bar does not hide it behind the trigger.
  // Appended to the ask it would read as part of the ask.
  [FAQ_NAV_ROW],
]

/**
 * Every row the bar can reach, flat — the menu's rows and the one beside them — for the
 * question "what does the nav CONTAIN", as against "how is it divided".
 * `siteNav.test.ts` walks it row by row.
 *
 * Derived from the groups, like `PRODUCT_MENU` is. Nothing here is a second list.
 */
export const ALL_NAV_ROWS: SiteNavRow[] = ALL_NAV_GROUPS.flat()
