import { FAQ_PATH } from './faq'
import type { MessageKey } from './i18n'
import { WORKFLOW_PATH } from './workflow'

/**
 * THE PUBLIC SITE'S HEADER NAV, as data: two menus, and the eight rows behind them.
 *
 * The bar used to carry ONE link — `/features`, mapped from a one-row array that
 * `SiteHeader.tsx` still explains at length. This is the shape that array was left an
 * array for: a **Product** dropdown listing everything the product is, then a **Help**
 * dropdown beside it. Two controls is the whole bar, which is what keeps it on the
 * page's own column at `md` (the arithmetic is in `SiteHeader`'s header note, and two
 * controls is the case it was already sized for).
 *
 * THE SECOND CONTROL WAS A BARE FAQ LINK, and it became a menu when it got a neighbour:
 * "Best practices" is the other thing a reader comes to this site to be TAUGHT, and two
 * links of that kind side by side in a bar of two controls would have made the bar read
 * as three peers with no hierarchy at all. So the shape is one menu per QUESTION — what
 * is this thing, and how do I get good at it — and the rows behind each are that
 * question's answers.
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
 */
export type SiteNavIcon =
  | 'AppWindow'
  | 'CircleHelp'
  | 'Cloud'
  | 'Download'
  | 'Layers'
  | 'Lightbulb'
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
   * The glyph beside the label, IN THE PANELS. Nothing in the bar itself draws one — it
   * is two triggers and their chevrons, and a 64px bar of icons beside two words is a
   * toolbar rather than a nav.
   *
   * Every row has one, which was not true while the FAQ stood in the bar as a link: the
   * one bare label in a column reads as a row that failed to load, so the rule is all or
   * none per panel.
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
}

/**
 * THE FOUR PAGES THAT DO NOT EXIST YET, and what each one will be about.
 *
 * They are placeholders on purpose and the shape says so: a path, the label the menu
 * gives it, and the two lines the page itself prints — a title and one lead — with
 * `PLACEHOLDER_NOTE` below them. `components/site/PlaceholderContent.tsx` renders all
 * four, so the four `page.tsx` files under `app/(marketing)` are a `metadata` export and
 * one component call each.
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
  desktop: {
    path: '/desktop',
    label: 'site.nav.application',
    title: 'site.desktopPage.title',
    lead: 'site.desktopPage.lead',
  },
  cloud: {
    path: '/cloud',
    label: 'site.nav.cloud',
    title: 'site.cloudPage.title',
    lead: 'site.cloudPage.lead',
  },
  download: {
    path: '/download',
    label: 'site.nav.download',
    title: 'site.downloadPage.title',
    lead: 'site.downloadPage.lead',
  },
  // The Help menu's own new row. `/best-practices` and not `/best-practice`: the page is
  // a collection of them, and the plural is what everybody who has ever linked to such a
  // page has used.
  bestPractices: {
    path: '/best-practices',
    label: 'site.nav.bestPractices',
    title: 'site.bestPracticesPage.title',
    lead: 'site.bestPracticesPage.lead',
  },
} as const satisfies Record<string, PlaceholderPage>

/**
 * The line every unfinished page carries where its content will go.
 *
 * ONE KEY FOR ALL FOUR, and it is deliberately a plain statement rather than a promise
 * with a date on it: "in preparation" ages, "shipping in March" is wrong in April.
 */
export const PLACEHOLDER_NOTE: MessageKey = 'site.pageSoon.note'

/**
 * A placeholder page, as the menu row that opens it.
 *
 * The glyph and the tone are arguments rather than fields on `PLACEHOLDER_PAGES`: what a
 * page is called and what it will hold belong to the page, and how the MENU dresses the
 * row that opens it belongs to the menu. The four pages would keep their copy if the
 * menu were redrawn tomorrow.
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
})

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
    row(PLACEHOLDER_PAGES.desktop, 'AppWindow', 'accent', true),
    row(PLACEHOLDER_PAGES.cloud, 'Cloud', 'accent', true),
  ],
  [
    { href: '/features', label: 'site.nav.allFeatures', icon: 'Layers', tone: 'purple' },
    { href: '/changelog', label: 'site.nav.changelog', icon: 'ScrollText', tone: 'purple' },
  ],
  [row(PLACEHOLDER_PAGES.download, 'Download', 'green')],
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
 * The FAQ row — which is now a row IN a menu rather than the bar's second control.
 *
 * A visitor with a doubt is the reader it is for, and it kept its place in the bar for
 * exactly as long as the bar had a place to keep: one press from anywhere. It is one
 * press further now, and what buys that back is the trigger it sits behind being named
 * **Help** — a reader with a question reads that word before they read "FAQ".
 *
 * ITS OWN CONSTANT STILL, rather than a literal inside `HELP_MENU` below, because
 * `siteNav.test.ts` asserts where this row is: in the Help menu and not in the Product
 * one. A row that can move between menus is worth being able to name.
 */
export const FAQ_NAV_ROW: SiteNavRow = {
  href: FAQ_PATH,
  label: 'site.nav.faq',
  icon: 'CircleHelp',
  // PURPLE, which it did not have while it stood in the bar — there was no family to be
  // part of out there. Inside a menu it is reference, the same as `/features` and
  // `/changelog`: see the note on `HELP_MENU`.
  tone: 'purple',
}

/** The Help menu's trigger. */
export const HELP_MENU_LABEL: MessageKey = 'site.nav.help'

/**
 * THE HELP MENU: how to get good at this, and what to do when you are stuck.
 *
 * ONE GROUP AND NO RULE. Two rows that answer the same question do not divide, and a
 * rule with one row on either side of it is furniture — the Product menu's rules are
 * there because it holds three families, not because a menu should have lines in it.
 *
 * PURPLE, BOTH ROWS, and this is the decision worth stating: purple is not a fourth
 * family invented for a second menu, it is the SAME family the Product menu's middle
 * group carries — reference, the things you go to READ rather than the things the
 * product is. `/features` and `/changelog` are that; so are best practices and a FAQ.
 * The colour means the same thing in both menus, which is the only way a colour means
 * anything across two of them.
 *
 * NO TILES either, for the same reason those two purple rows have none: a tile says
 * "this is a thing you can open" (see `tile`), and a page you read is not one.
 *
 * ORDER: the teaching before the troubleshooting. Best practices is what a reader who
 * has the product working comes back for; the FAQ is where somebody goes when it is not
 * working, and they will find it wherever it is.
 */
export const HELP_MENU: SiteNavRow[] = [
  row(PLACEHOLDER_PAGES.bestPractices, 'Lightbulb', 'purple'),
  FAQ_NAV_ROW,
]

/**
 * THE WHOLE NAV AS GROUPS — the Product menu's three families, then the Help menu.
 *
 * This is what the MOBILE panel renders. Below `md` there are no dropdowns at all: the
 * panel is one column of links, so it draws every row in the bar's own order with a rule
 * wherever the bar would have had one — three rules, the last of which is the boundary
 * between the two MENUS rather than between two families of one.
 *
 * WHICH IS THE ONE PLACE THE TWO TRIGGERS STOP BEING VISIBLE, and the rules are what is
 * left of them. A panel that reproduced the triggers would be two disclosures inside a
 * disclosure — three presses to reach a link on the surface where presses cost most.
 *
 * Fed from the same constants the bar reads rather than a second copy of them, for the
 * reason `SiteHeader`'s note gives: the bar showing a nav the panel does not is a failure
 * nothing announces.
 */
export const ALL_NAV_GROUPS: SiteNavRow[][] = [...PRODUCT_MENU_GROUPS, HELP_MENU]

/**
 * Every row the bar can reach, flat — both menus' rows — for the question "what does the
 * nav CONTAIN", as against "how is it divided". `siteNav.test.ts` walks it row by row.
 *
 * Derived from the groups, like `PRODUCT_MENU` is. Nothing here is a second list.
 */
export const ALL_NAV_ROWS: SiteNavRow[] = ALL_NAV_GROUPS.flat()
