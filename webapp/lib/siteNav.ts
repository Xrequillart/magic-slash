import { FAQ_PATH } from './faq'
import type { MessageKey } from './i18n'
import { WORKFLOW_PATH } from './workflow'

/**
 * THE PUBLIC SITE'S HEADER NAV, as data: one menu, the five rows behind it, and the one
 * link the bar carries in the open (`FAQ_NAV_ROW`).
 *
 * The bar used to carry ONE link — `/features`, mapped from a one-row array that
 * `SiteHeader.tsx` still explains at length. This is the shape that array was left an
 * array for: a **Product** dropdown listing everything the product is, then the FAQ
 * beside it in the open. Two controls is the whole bar, which is what keeps it on the
 * page's own column at `md` — the arithmetic is in `SiteHeader`'s header note.
 *
 * THREE PAGES HAVE BEEN DELETED FROM THIS NAV, by request, and between them they took a
 * menu, a bare link and a row of the Product menu:
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
 *   • `/cloud` was a row of the **Product** menu, and it left because the product side it
 *     named is not being sold any more — the owner stopped that part rather than the page
 *     ("on va arrêter cette partie"). It was the last page on this site that shipped as a
 *     row ahead of its content, so its deletion took the whole placeholder apparatus with
 *     it: `PLACEHOLDER_PAGES`, `PLACEHOLDER_NOTE`, `SOON_NOTE`, the `soon` pill the
 *     header and the footer drew from it, and `components/site/PlaceholderContent.tsx`.
 *     An empty table and a component with no caller are not a shape held ready for next
 *     time; they are a shape the next reader has to work out the purpose of. Whoever
 *     ships a row ahead of a page again writes four lines and a band, and git remembers
 *     what they looked like.
 *
 * WHICH LEAVES THE BAR AT ONE MENU AND ONE LINK, and the FAQ is the link because of what
 * that page does: it answers the objection that stops a download, so it is one press
 * from anywhere.
 *
 * TWO OF THE THREE NEED A REDIRECT AND THE THIRD DOES NOT, which is worth stating rather
 * than assuming. `/story` and `/cloud` both shipped — the first in the footer of every
 * public page, the second in this menu and behind a button on the homepage — so both are
 * in `RETIRED_PATHS` (`lib/hostRouting.ts`) and 308 to the homepage. `/best-practices`
 * never reached production — no link to it exists to keep alive — and neither did the
 * `/skills` page cut before it.
 *
 * IT WAS SEVEN ROWS AND A `/skills` PAGE FOR ONE ITERATION. That page was cut on the
 * reading that it duplicated `/workflow`: both were going to set out the eight commands,
 * one as the loop and one as a reference, and the loop is the version a visitor deciding
 * whether to install this needs. `/workflow`'s own note already lists the per-command
 * depth a fuller version of it would add — that is where the cut page's content belongs,
 * on the page that was going to link to it anyway. `/features#workflow` remains the
 * inventory's own section, which is where `lib/skillsBand.ts` has always pointed.
 *
 * WHY A MODULE AND NOT SIX LITERALS IN THE COMPONENT. Same reason `lib/workflow.ts`
 * owns `WORKFLOW_PATH` and `lib/faq.ts` owns `FAQ_PATH`, and it is not tidiness: a nav
 * row pointing at a path `PUBLIC_PATHS` (`lib/hostRouting.ts`) does not list is NOT a
 * 404 on production — it is a 307 to a login form on `app.magic-slash.io`, so a header
 * link appears to sign the reader out. `siteNav.test.ts` reads that file and pins every
 * row's path against it, and checks the page behind each one exists. Six rows typed
 * into JSX are five rows no test can enumerate.
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
 * ALL SIX ARE LUCIDE EXPORTS, checked against the `^1.26.0` in `webapp/package.json`
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
  | 'Download'
  | 'Layers'
  | 'ScrollText'
  | 'Workflow'

/**
 * The three colours a nav glyph is drawn in — and they are a GROUPING, not decoration.
 *
 * `accent` is the two rows that are the product itself, `purple` the two that are
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
   * glyph beside four that have one reads as a row that failed to load. The rule is all
   * or none PER PANEL; the bar ignores the field entirely.
   */
  icon?: SiteNavIcon
  /** Which of the three groups the row belongs to, said as a colour. */
  tone?: SiteNavTone
  /**
   * THE GLYPH IN A WHITE TILE — a rounded plate with a hairline and the quietest shadow
   * — rather than bare on the row's own ground.
   *
   * TWO ROWS CARRY IT, and they are the first group: the surfaces the product IS. The
   * treatment is what the reference dress does with the same families (measured off
   * CleanShot's own Product menu, the site this design system has taken a dress from
   * before — see `Collapse` in `components/ui.tsx`), and the argument is hierarchy: a
   * tile is a THING, and Workflow and Application are things. What to read about them
   * and where to get it are not, so those rows draw a bare tinted glyph.
   *
   * IN THE DROPDOWN ONLY. `MobileMenu` ignores this and draws every row bare, and it is
   * width that decides: a 40px tile plus 12px of gap leaves 204px of a 256px panel for a
   * label, and "Toutes les fonctionnalités" does not fit in it. The panel cannot grow —
   * `w-64` is what fits the 262px a 320px viewport offers — so the tiles are the half of
   * the dress that is dropped rather than the rows or their colours. See `SiteHeader`.
   */
  tile?: true
}

/**
 * THERE IS NO `soon` FIELD ANY MORE, and it is worth a line rather than an absence: a row
 * used to be able to say "this page is announced and not written", which drew a small
 * pill beside its label in the menu, in the mobile panel and in the footer. `/cloud` was
 * the only row that ever said it and the pill went with the page — along with
 * `SOON_NOTE`, `PLACEHOLDER_PAGES` and the band `PlaceholderContent` drew. Every row in
 * this file now opens a page that is written, which is the property a reader of the menu
 * can assume and the reason nothing marks it.
 */

/**
 * The page about the app — a Product row whose path no module of its own owns.
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
 * thing do", and the row under it is the surface it runs on — the app you install
 * (Application). It had a second neighbour, `/cloud`, until the cloud side stopped being
 * sold; see the note at the top of this file. The inventory and the changelog are
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
  ],
  [
    { href: '/features', label: 'site.nav.allFeatures', icon: 'Layers', tone: 'purple' },
    { href: '/changelog', label: 'site.nav.changelog', icon: 'ScrollText', tone: 'purple' },
  ],
  [{ href: DOWNLOAD_PATH, label: 'site.nav.download', icon: 'Download', tone: 'green' }],
]

/**
 * The same five rows, flat — for everything that cares what the menu CONTAINS rather
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
