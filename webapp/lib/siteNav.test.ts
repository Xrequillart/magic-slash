import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { marketingEn } from './i18n/marketing/en'
import { marketingFr } from './i18n/marketing/fr'
import * as siteNav from './siteNav'
import {
  ALL_NAV_GROUPS,
  ALL_NAV_ROWS,
  DESKTOP_PATH,
  DOWNLOAD_PATH,
  FAQ_NAV_ROW,
  PLACEHOLDER_NOTE,
  PLACEHOLDER_PAGES,
  PRODUCT_MENU,
  PRODUCT_MENU_GROUPS,
  PRODUCT_MENU_LABEL,
} from './siteNav'

/**
 * Runs in the ROOT vitest suite on the root `node_modules`, which is the reason
 * `lib/siteNav.ts` may import nothing but `./faq`, `./workflow` and `./i18n` — see the
 * note on that file. THIS TEST EXISTING IS WHAT KEEPS THAT TRUE: add a `react`, a
 * `next/*` or a `lucide-react` import over there and this fails to RESOLVE rather than
 * shipping a bundle dragged into a list of eight strings.
 *
 * Its real job is the two halves of a broken nav row, neither of which is visible in a
 * diff, and both of which are worse in a HEADER than anywhere else on the site — the bar
 * is on every public page, so one bad row is bad everywhere at once:
 *
 *   ① the path has to be one `PUBLIC_PATHS` lists, or the apex decides it belongs to the
 *     app and 307s the reader to a login form on `app.magic-slash.io`;
 *   ② the route has to exist, which `PUBLIC_PATHS` cannot check — a listed path with no
 *     page behind it is a clean 404 and still a dead row in the menu.
 *
 * And the catalogue half, which `tsc` does not cover here: CI typechecks `desktop/` only
 * (`.github/workflows/ci.yml`), so the `MessageKey` unions over there guarantee nothing
 * on a pull request — and `t()` has no per-key fallback, so a key that does not exist
 * renders as an EMPTY row rather than as an error. In a dropdown that is a blank line
 * you can still click.
 *
 * Same shape and same reasoning as `workflow.test.ts` and `skillsBand.test.ts` next door.
 */

const site = (key: string) => (marketingEn as Record<string, string>)[key]
const siteFr = (key: string) => (marketingFr as Record<string, string>)[key]

const webapp = (relative: string) => fileURLToPath(new URL(relative, import.meta.url))

const routing = () => readFileSync(webapp('./hostRouting.ts'), 'utf8')

describe('the site header nav', () => {
  it('names keys the catalogues actually carry', () => {
    // Both catalogues, not just English: `i18n.test.ts` asserts French has every English
    // key, so this could rest on that — but the failure it would produce over there is
    // "fr is missing site.nav.cloud", which does not say who wanted it. Here it does.
    const keys = [
      PRODUCT_MENU_LABEL,
      PLACEHOLDER_NOTE,
      ...ALL_NAV_ROWS.map((row) => row.label),
      ...Object.values(PLACEHOLDER_PAGES).flatMap((page) => [page.title, page.lead]),
    ]

    for (const key of keys) {
      expect(site(key), `en.${key}`).toBeTruthy()
      expect(siteFr(key), `fr.${key}`).toBeTruthy()
    }
  })

  it('points every row at a path the public site owns and actually renders', () => {
    // Read as TEXT for the purity reason above: `hostRouting.ts` imports nothing, but
    // this assertion is about what the file SAYS, and a literal inside a `Set` is not
    // reachable any other way. `workflow.test.ts` and `skillsBand.test.ts` read it the
    // same way for the same one path each; this reads it for eight.
    const source = routing()

    for (const row of ALL_NAV_ROWS) {
      // ① The apex has to answer it.
      expect(source, `${row.href} in PUBLIC_PATHS`).toContain(`'${row.href}',`)

      // ② And something has to be there. `existsSync` is what `features.test.ts` uses to
      // pin a visual to its component — the file, or the reason it is missing.
      expect(
        existsSync(webapp(`../app/(marketing)${row.href}/page.tsx`)),
        `app/(marketing)${row.href}/page.tsx`,
      ).toBe(true)
    }
  })

  it('leaves `/application` to the app host', () => {
    // THE ONE PATH THIS NAV DELIBERATELY DOES NOT USE, and the assertion is here because
    // the mistake is so easy to make from the outside: the menu row reads "Application",
    // so the obvious path for it is `/application` — which the PRODUCT owns. That is the
    // app's own settings section (`app/application/`, on `app.magic-slash.io`), decided
    // by `PUBLIC_PATHS`' default of "absent → the app host", and two route branches
    // resolving one path is a build question rather than a naming one.
    //
    // So the page is `/desktop`, and adding `/application` to that list would quietly
    // move a signed-in section of the product onto the public site.
    expect(routing()).not.toContain("'/application',")
    expect(DESKTOP_PATH).toBe('/desktop')
  })

  it('leaves `/desktop` out of the placeholders, because it is a real page now', () => {
    // The homepage's app band moved onto it whole, so it heads itself with
    // `site.desktop.title` and renders `DesktopContent` — no `PlaceholderContent`, and no
    // promise of scope. The row is written out in `PRODUCT_MENU_GROUPS` for that reason;
    // this is what stops it drifting back into a table it no longer belongs in, which
    // would put "Page in preparation" under a finished page.
    expect(Object.values(PLACEHOLDER_PAGES).map((page) => page.path)).not.toContain(DESKTOP_PATH)

    const page = readFileSync(webapp(`../app/(marketing)${DESKTOP_PATH}/page.tsx`), 'utf8')
    expect(page).toContain('<DesktopContent />')
    expect(page).not.toContain('PlaceholderContent')
  })

  it('leaves `/download` out of the placeholders too, now that it hands out the app', () => {
    // Same argument as `/desktop` above: the page has a button, the prerequisites and
    // the latest release on it (`DownloadContent`), so "Page in preparation" under it
    // would be a lie. The row is written out in `PRODUCT_MENU_GROUPS`; this stops it
    // drifting back into the table.
    expect(Object.values(PLACEHOLDER_PAGES).map((page) => page.path)).not.toContain(DOWNLOAD_PATH)

    const page = readFileSync(webapp(`../app/(marketing)${DOWNLOAD_PATH}/page.tsx`), 'utf8')
    expect(page).toContain('<DownloadContent')
    expect(page).not.toContain('PlaceholderContent')
  })

  it('draws every row with a glyph and a family colour, the bar\'s own two included', () => {
    // The glyph and the tone are what the panels read (`dress` in `SiteHeader.tsx`), and
    // a row missing either does not fail anywhere: it renders as a bare label in a column
    // of seven that are not, which looks like a row that failed to load.
    //
    // EVERY ROW, and the two the bar shows in the open are the ones worth saying so
    // about: up there they are bare type, because nothing in the bar draws a glyph. Below
    // `md` they are two rows of the same column as the menu's six, and a column is all
    // glyphs or none. The FAQ had neither field while it stood in the bar the FIRST time,
    // and the absence was pinned here as a decision; being in `ALL_NAV_GROUPS` is what
    // reversed it.
    for (const row of ALL_NAV_ROWS) {
      expect(row.icon, `${row.href} icon`).toBeTruthy()
      expect(row.tone, `${row.href} tone`).toBeTruthy()
    }
  })

  it('reads the link in the bar as reference, in the reference colour', () => {
    // PURPLE IS NOT A FAMILY INVENTED FOR THE ROW THAT IS NOT IN THE MENU — it is the
    // same one the Product menu's middle group carries: things you go to READ. A colour
    // that meant "reference" inside the menu and "outside the menu" beside it would mean
    // nothing in either place, which is why this is asserted across the two rather than
    // inside one.
    expect(FAQ_NAV_ROW.tone).toBe('purple')
    expect(PRODUCT_MENU_GROUPS[1]?.map((row) => row.tone)).toEqual(['purple', 'purple'])

    // And no tile: a tile says "this is a thing you can open" (see `tile` in
    // `siteNav.ts`), and a page you read is not one.
    expect(FAQ_NAV_ROW.tile).toBeUndefined()
  })

  it('has no Help menu left, and neither deleted page still standing', () => {
    // THE MENU IS GONE WITH THE PAGE THAT MADE IT ONE. It held "Best practices" and the
    // FAQ; `/best-practices` is deleted by request, and a trigger over a single row is a
    // press bought with nothing — so the FAQ is a bare link in the bar again.
    //
    // THREE HALVES OF ONE DELETION, and each of them is silent on its own: an export
    // nothing renders, a route nobody links to, and a catalogue key with no call site.
    // The last is the one that would come back as a real bug — `site.nav.help` titling
    // the footer's column while nothing in the NAV says "Help" is how a key comes to
    // outlive what it names, so the word moved to `site.footer.help` and this pins the
    // move rather than the string.
    expect(Object.keys(siteNav)).not.toContain('HELP_MENU')
    expect(Object.keys(siteNav)).not.toContain('HELP_MENU_LABEL')
    expect(Object.keys(siteNav)).not.toContain('STORY_NAV_ROW')
    expect(Object.keys(PLACEHOLDER_PAGES)).not.toContain('bestPractices')
    expect(existsSync(webapp('../app/(marketing)/best-practices/page.tsx'))).toBe(false)
    expect(existsSync(webapp('../app/(marketing)/story/page.tsx'))).toBe(false)

    for (const gone of ['site.nav.help', 'site.nav.bestPractices', 'site.nav.ourStory']) {
      expect(site(gone), `en.${gone}`).toBeUndefined()
      expect(siteFr(gone), `fr.${gone}`).toBeUndefined()
    }
    expect(site('site.footer.help')).toBeTruthy()
    expect(siteFr('site.footer.help')).toBeTruthy()
  })

  it('sends the deleted story to the homepage, and the never-shipped page nowhere', () => {
    // THE DIFFERENCE BETWEEN THE TWO DELETIONS, and it is the one thing about them that
    // is not visible on the site. `/story` was in the footer of every public page for
    // releases, so its URL outlives the route: it stays in `PUBLIC_PATHS` — without
    // which the apex would decide it belongs to the app and 307 the reader to a login
    // form — and `RETIRED_PATHS` 308s it to the homepage, since nothing replaced what
    // that page said. `/best-practices` never reached production, so there is no link to
    // keep alive and no entry to write.
    const source = routing()

    expect(source).toContain("'/story',")
    expect(source).toContain("'/story': '/',")
    expect(source).not.toContain("'/best-practices'")
  })

  it('gives each family one colour, and no two families the same', () => {
    // THE RULES AND THE COLOURS SAY THE SAME THING TWICE, on purpose — see `SiteNavTone`.
    // Which only holds while the two agree: a row added to the middle group with the
    // first group's tone would put a blue glyph under a rule that says "new family", and
    // nothing on screen would call that a mistake.
    const tones = PRODUCT_MENU_GROUPS.map((group) => {
      const inGroup = new Set(group.map((row) => row.tone))
      expect(inGroup.size, `one tone per group: ${group.map((row) => row.href).join(', ')}`).toBe(1)
      return group[0]?.tone
    })

    expect(new Set(tones).size, tones.join(', ')).toBe(tones.length)
    expect(tones).toEqual(['accent', 'purple', 'green'])
  })

  it('tiles the first family and only the first', () => {
    // The white plate says "this is a thing you can open" (see `tile` in `siteNav.ts`),
    // so it belongs to the three rows that are the product and to no others. A tile on
    // "Changelog" would claim the same weight for a reference page; a first group without
    // one would leave the reference dress with nothing to distinguish the families by but
    // colour — and the rules and the colours are already saying that twice.
    const tiled = ALL_NAV_ROWS.filter((row) => row.tile).map((row) => row.href)
    expect(tiled).toEqual(PRODUCT_MENU_GROUPS[0]?.map((row) => row.href))
  })

  it('leaves the ask a group of its own', () => {
    // Download is last (below) AND alone, which is the part a diff hides: a row appended
    // to the final group would sit under the same rule and read as part of the ask.
    expect(PRODUCT_MENU_GROUPS.at(-1)?.map((row) => row.href)).toEqual([
      DOWNLOAD_PATH,
    ])
    // And in the mobile panel the ask is the second group from the bottom, because the
    // row the bar shows in the open is a fourth group under it. Appended to the ask
    // instead it would sit beneath the same rule and read as part of it, which is the
    // failure a diff hides.
    expect(ALL_NAV_GROUPS.at(-2)).toEqual(PRODUCT_MENU_GROUPS.at(-1))
  })

  it('names glyphs the header can actually draw', () => {
    // `lib/siteNav.ts` may not import `lucide-react` (the note on `SiteNavIcon` says
    // why), so the map from these names to components is in `SiteHeader.tsx` — and a name
    // absent from it is a `tsc` error only on a Vercel build, since CI typechecks
    // `desktop/` alone. Read as TEXT here, the same trick `features.test.ts` and
    // `workflow.test.ts` use on `components/ui.tsx`, so the pairing is checked on a pull
    // request rather than at deploy time.
    const header = readFileSync(webapp('../components/site/SiteHeader.tsx'), 'utf8')

    for (const row of ALL_NAV_ROWS) {
      if (!row.icon) continue
      expect(header, `${row.icon} imported`).toContain(`  ${row.icon},\n`)
    }
  })

  it('names tones the popover dress actually declares', () => {
    // `POPOVER_ICON_TONES` in `NavDropdown.tsx` is the authority, and it cannot be one
    // type with `SiteNavTone`: that file imports React, so this module would stop
    // resolving in the root suite the moment it imported from it. Read as text instead —
    // `workflow.test.ts` pins its card tones against `components/ui.tsx` the same way.
    const dropdown = readFileSync(webapp('../components/site/NavDropdown.tsx'), 'utf8')

    for (const row of ALL_NAV_ROWS) {
      if (!row.tone) continue
      expect(dropdown, `tone "${row.tone}"`).toContain(`${row.tone}: 'text-${row.tone}'`)
    }
  })

  it('keeps the FAQ in the bar and out of the Product menu', () => {
    // It answers the objection that stops a download, so it is one press from anywhere
    // and not a row of the menu about what the product is. A refactor that tidied it in
    // there would be invisible on screen — the bar would simply have one control fewer —
    // which is exactly why it is asserted.
    expect(PRODUCT_MENU.map((row) => row.href)).not.toContain(FAQ_NAV_ROW.href)
    expect(ALL_NAV_ROWS).toEqual([...PRODUCT_MENU, FAQ_NAV_ROW])
  })

  it('shows the FAQ in the open, from its constant', () => {
    // THE BAR'S LAST GROUP IS THE ONE ROW IT NAMES ITSELF. It was two until `/story` was
    // deleted, and both halves of this are invisible in a diff — a row tidied into the
    // menu costs the bar its only link, and a row dropped from `ALL_NAV_GROUPS` leaves
    // the mobile panel without a page the bar shows at every other width.
    expect(ALL_NAV_GROUPS.at(-1)).toEqual([FAQ_NAV_ROW])

    // And the bar draws it from this constant rather than from a path typed into JSX —
    // the whole reason the nav is a module (see the note at the top of `siteNav.ts`).
    // Read as text, like the glyph and tone assertions below.
    const header = readFileSync(webapp('../components/site/SiteHeader.tsx'), 'utf8')
    expect(header).toContain('FAQ_NAV_ROW.href')
    expect(header).not.toContain(`href="${FAQ_NAV_ROW.href}"`)
  })

  it('asks last', () => {
    // Download is the ask, and a menu that asks before it explains is a menu people
    // close. The order above it is an argument (see `PRODUCT_MENU`); this is the half of
    // it worth pinning, because a row appended to the array lands after it by default.
    expect(PRODUCT_MENU.at(-1)?.href).toBe(DOWNLOAD_PATH)
  })

  it('offers no destination twice', () => {
    // Two rows on one path is a menu that looks like it has more in it than it does, and
    // it is what a copy-pasted row produces when only its label is edited.
    const paths = ALL_NAV_ROWS.map((row) => row.href)
    expect(new Set(paths).size, paths.join(', ')).toBe(paths.length)

    const labels = ALL_NAV_ROWS.map((row) => row.label)
    expect(new Set(labels).size, labels.join(', ')).toBe(labels.length)
  })

  it('says out loud that the unwritten page is a placeholder', () => {
    // The routes shipped with the menu because a row pointing nowhere 307s to a login
    // form — such a page is thin ON PURPOSE, and `PlaceholderContent` is the thing that
    // admits it on screen. A page rewritten for real drops that component, and this
    // assertion with it; a page left thin keeps both. One entry is left in the table
    // (`/cloud`), and this still walks it by name so the next one is covered too.
    for (const [name, page] of Object.entries(PLACEHOLDER_PAGES)) {
      const file = readFileSync(webapp(`../app/(marketing)${page.path}/page.tsx`), 'utf8')
      expect(file, `${name} renders PlaceholderContent`).toContain('<PlaceholderContent')
      expect(file, `${name} reads its copy from PLACEHOLDER_PAGES`).toContain(
        `PLACEHOLDER_PAGES.${name}`,
      )
    }
  })
})
