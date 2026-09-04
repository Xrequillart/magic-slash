import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { MAGIC_COMMANDS } from './commands'
import {
  commandLabel,
  FEATURE_FAMILIES,
  isCommandTitle,
  isLiteralTitle,
  LITERAL_TITLES,
  PAGE_CHROME,
  type Feature,
  type FeatureTitle,
} from './features'
import { marketingEn } from './i18n/marketing/en'

/**
 * Runs in the ROOT vitest suite on the root `node_modules`, which is the reason
 * `lib/features.ts` may not import anything but `lib/commands.ts` — see the note on that
 * file. THIS TEST EXISTING IS WHAT KEEPS THAT TRUE: add a `lucide-react`, a `next/*` or
 * a `./supabase` import over there and this fails to RESOLVE rather than shipping a
 * marketing page that drags the auth SDK into a bundle authenticating nobody.
 *
 * The other half of its job is the one a type cannot do, and it is worth being explicit
 * about WHY. `tsc` never runs on `webapp/` in CI (`.github/workflows/ci.yml` typechecks
 * `desktop/` only), so the `MessageKey` union on `title`, `intro` and `description`
 * guarantees nothing there — and `t()` has no per-key fallback, so a key that does not
 * exist renders as an empty paragraph rather than as an error. A regex on the SHAPE of
 * the key would not help either: `site.features.oops` is shaped perfectly. So every key
 * is looked up in the catalogue for real, which is what acceptance criterion 4 of #269
 * actually rests on. `i18n.test.ts` carries it the rest of the way: it asserts the French
 * catalogue has every English key, that none is empty, and that none is left as the
 * English string.
 */

/**
 * The families and their contents, written out BY HAND — deliberately not derived from
 * the thing under test, which would make every assertion below a tautology. Adding a
 * feature means editing this too, and that is the point: the edit is the reminder.
 *
 * `settingsCatalog.test.ts`'s `EVERY_FIELD` is the precedent, and the reason it works
 * the same way: "the list is complete" is not something a type can state.
 */
const EXPECTED: { family: string; anchor: string; layout: string; features: string[] }[] = [
  {
    family: 'workflow',
    anchor: 'workflow',
    layout: 'cards',
    features: ['plan', 'start', 'continue', 'commit', 'pr', 'review', 'resolve', 'done'],
  },
  {
    family: 'desktop',
    anchor: 'desktop',
    layout: 'rows',
    features: [
      'tasks',
      'skillsPage',
      'worktrees',
      'splitView',
      'spotlight',
      'notifications',
      'menuBar',
      'usage',
    ],
  },
  {
    family: 'insights',
    anchor: 'insights',
    layout: 'rows',
    features: ['agentContext', 'ticketInfo', 'repository', 'filePreview', 'devServer', 'pullRequest', 'prComments'],
  },
  {
    family: 'integrations',
    anchor: 'integrations',
    layout: 'showcase',
    features: ['jira', 'github', 'vscode', 'claudeCode', 'machineSetup'],
  },
  {
    family: 'configuration',
    anchor: 'configuration',
    layout: 'rows',
    features: [
      'multiRepo',
      'commitFormat',
      'pullRequests',
      // The profile reads BEFORE the languages: who the app is talking to comes before
      // which language it says it in.
      'profile',
      'languages',
      'permissionModes',
    ],
  },
  {
    family: 'cloud',
    anchor: 'cloud',
    layout: 'rows',
    features: ['team', 'teamRepos', 'planSessions', 'appSettings'],
  },
]

/**
 * The page's own chrome, spelled out — the same hand-written shape as `EXPECTED` above,
 * and for the same reason: reading these back off `PAGE_CHROME` would assert only that
 * the object equals itself.
 *
 * `Record<keyof typeof PAGE_CHROME, string>` is what makes it a two-way check. A field
 * added over there with no line here does not compile, so a new piece of chrome cannot
 * slip past the catalogue lookup below by simply not being mentioned.
 */
const EXPECTED_CHROME: Record<keyof typeof PAGE_CHROME, string> = {
  title: 'site.features.title',
  lead: 'site.features.pageLead',
  onThisPage: 'site.features.onThisPage',
  allFeatures: 'site.nav.allFeatures',
}

/** Every feature, in page order, paired with the family that holds it. */
const EVERY_FEATURE: { family: string; feature: Feature }[] = FEATURE_FAMILIES.flatMap((family) =>
  family.features.map((feature) => ({ family: family.id, feature })),
)

/**
 * The catalogue keys this module names, wherever they sit. A `const` like
 * `EVERY_FEATURE` above rather than a nullary function — the computation is the same
 * kind, and it is read once.
 *
 * No cast on any of the four: `FeatureTitle` is `MessageKey | LiteralTitle`, so a
 * `MessageKey` is already assignable to it. Spelling that out with an `as` would be the
 * one thing standing between the compiler and a future `FeatureTitle` that no longer
 * admits a plain key.
 *
 * `PAGE_CHROME` FIRST, and it is here rather than in a check of its own because this
 * walk is the whole guard: those keys print the page's headline, its lead, and the
 * rail's heading, and until they were named in `features.ts` they were spelled out in
 * JSX where nothing this suite can import would ever look at them. The page's biggest
 * line deserves the check its ~30 rows already had.
 */
const CATALOGUE_KEYS: { where: string; key: FeatureTitle }[] = [
  ...Object.entries(PAGE_CHROME).map(([field, key]) => ({ where: `chrome.${field}`, key })),
  ...FEATURE_FAMILIES.flatMap((family) => [
    { where: `${family.id}.title`, key: family.title },
    { where: `${family.id}.intro`, key: family.intro },
    ...family.features.flatMap((feature) => [
      { where: `${family.id}/${feature.id}.title`, key: feature.title },
      { where: `${family.id}/${feature.id}.description`, key: feature.description },
    ]),
  ]),
]

describe('FEATURE_FAMILIES', () => {
  it('lists the six families in reading order', () => {
    // The order IS the content: the page opens on the commands because they are what the
    // product is, and an alphabetical list would open on "cloud". `cloud` sits beside
    // `desktop` because the two are the product's SURFACES — the app where agents run
    // and the web where an organization is read — rather than because they were written
    // together.
    expect(FEATURE_FAMILIES.map((family) => family.id)).toEqual(EXPECTED.map((e) => e.family))
  })

  it('holds exactly the features expected of each family, in order', () => {
    // A row silently dropped from a family is a capability the page stops claiming, with
    // nothing on screen saying anything is missing.
    for (const expected of EXPECTED) {
      const family = FEATURE_FAMILIES.find((f) => f.id === expected.family)
      expect(family, `no family \`${expected.family}\``).toBeDefined()
      expect(family?.features.map((feature) => feature.id), expected.family).toEqual(
        expected.features,
      )
    }
  })

  it('gives every family a non-empty list', () => {
    // A family with no rows renders as a heading over nothing — a section that reads as
    // a feature the product forgot to ship.
    for (const family of FEATURE_FAMILIES) {
      expect(family.features.length, family.id).toBeGreaterThan(0)
    }
  })

  it('never uses the same feature id twice', () => {
    // The id is the React key across the whole page, not just within one family: two
    // rows sharing one would have React reuse the wrong node between them.
    const ids = EVERY_FEATURE.map(({ feature }) => feature.id)
    expect(new Set(ids).size, `duplicate id among ${ids.join(', ')}`).toBe(ids.length)
  })

  it('gives every family a unique anchor a URL can carry', () => {
    // The anchor is in whatever URL someone shared, and the sidebar links to it. Two
    // families on one anchor means one of them is unreachable from that sidebar.
    const anchors = FEATURE_FAMILIES.map((family) => family.anchor)
    expect(new Set(anchors).size).toBe(anchors.length)
    expect(anchors).toEqual(EXPECTED.map((e) => e.anchor))

    for (const anchor of anchors) {
      // Lower-case and hyphens only: an anchor with a space or a capital is escaped
      // differently by every client that rewrites the URL.
      expect(anchor, anchor).toMatch(/^[a-z-]+$/)
    }
  })

  it('derives the workflow family from the eight commands, in cycle order', () => {
    // The one family that is MAPPED rather than declared. If it were retyped, the page
    // would show seven commands while the product shipped eight — and `commands.test.ts`
    // pins the cycle order, so this is where the two lists are held together.
    const workflow = FEATURE_FAMILIES.find((family) => family.id === 'workflow')
    expect(workflow?.features.map((feature) => feature.id)).toEqual(
      MAGIC_COMMANDS.map((command) => command.id),
    )

    for (const command of MAGIC_COMMANDS) {
      const row = workflow?.features.find((feature) => feature.id === command.id)
      // The title is what you TYPE, so it has to be the command's own spelling rather
      // than a prettified version of its id.
      expect(row?.title, command.id).toBe(command.command)
      expect(row?.icon, command.id).toBe(command.icon)
    }
  })

  it('names every icon as a string rather than importing one', () => {
    // An icon NAME, checked as one: the component it resolves to cannot be imported
    // here, and typing the field as a component over in `features.ts` is exactly the
    // import that would break the root suite. This is the assertion that notices.
    //
    // What it CANNOT check is that the name resolves to artwork — most of them are
    // lucide exports and one (`Github`) is the site's own glyph, and neither list is
    // readable from this suite. `FeaturesContent`'s `Record<FeatureIcon, …>` is what
    // catches a name with no row; only a build catches a row with no export.
    //
    // TRAILING DIGITS ARE PART OF THE VOCABULARY, not a typo to catch: lucide numbers
    // its variants — `Building2`, `Users2`, `Trash2` — so a pattern that banned them
    // would reject half the icon set for looking wrong.
    for (const { family, feature } of EVERY_FEATURE) {
      expect(feature.icon, `${family}/${feature.id}`).toMatch(/^[A-Z][A-Za-z]+\d?$/)
    }
  })

  it('draws the skills as cards, the integrations as showcases, the rest as rows', () => {
    // The layout is data, not markup — `FeaturesContent` branches on this field, so a
    // family that changed its mind about its own shape would change the page with no
    // component edit and nothing here to notice. Pinned rather than derived, like the
    // rest of this file: reading it back off `FEATURE_FAMILIES` would assert only that
    // the field is equal to itself.
    //
    // It matters WHICH family is which. `cards` is the loud shape and it only earns
    // itself where the entries are few and each one is a thing in its own right; a
    // second family quietly taking it would turn an inventory into a wall of colour.
    for (const expected of EXPECTED) {
      const family = FEATURE_FAMILIES.find((candidate) => candidate.id === expected.family)
      expect(family?.layout, expected.family).toBe(expected.layout)
    }
    expect(FEATURE_FAMILIES.filter((family) => family.layout === 'cards')).toHaveLength(1)
    // And the same for the other loud shape. A showcase card is a full-width surface
    // carrying artwork; a second family taking it would double the page's height for
    // rows that have no artwork to put on a plate.
    expect(FEATURE_FAMILIES.filter((family) => family.layout === 'showcase')).toHaveLength(1)
  })

  it('names every command in prose rather than as it is typed', () => {
    // The page heads a skill card with "Plan", not `/magic:plan` — the typed form is
    // six identical characters on all eight and belongs in the documentation, where the
    // reader is about to run one.
    //
    // Written out, and `PR` is why this is a test and not a one-liner: capitalising the
    // id would produce "Pr", which is not how anybody writes it, renders perfectly and
    // would sit at the top of a card until somebody noticed.
    expect(MAGIC_COMMANDS.map((command) => commandLabel(command.command))).toEqual([
      'Plan',
      'Start',
      'Continue',
      'Commit',
      'PR',
      'Review',
      'Resolve',
      'Done',
    ])
  })

  it('leaves no command without a prose name', () => {
    // `commandLabel` reads a table keyed by `MagicCommandId`, so a ninth command is a
    // `tsc` error there — but `tsc` does not run on `webapp/` in CI. Without this, a
    // missing row would reach the page as `undefined` and head a card with nothing.
    for (const command of MAGIC_COMMANDS) {
      expect(commandLabel(command.command), command.id).toMatch(/^[A-Z][A-Za-z]*$/)
    }
  })

  it('gives a row of its own to the two commands that bookend the loop', () => {
    // `plan` opens the cycle and `done` closes it, so each takes the full width and the
    // six between them pair off — start/continue, commit/pr, review/resolve. The grid
    // is two columns, so this field IS the composition: get it wrong and the pairs break
    // across rows.
    //
    // Pinned as an exact list rather than checked one by one, so a third `span: 'full'`
    // added in the middle fails here instead of quietly reflowing every pair below it.
    const full = FEATURE_FAMILIES.flatMap((family) =>
      family.features.filter((feature) => feature.span === 'full').map((feature) => feature.id),
    )
    expect(full).toEqual(['plan', 'done'])
  })

  it('sets no card width on a family that draws rows', () => {
    // `span` does nothing outside a `cards` family. A field that is silently inert in
    // four families out of five is one the next reader sets in good faith and then has
    // to work out why nothing moved — so it is an error rather than a no-op.
    for (const family of FEATURE_FAMILIES) {
      if (family.layout === 'cards') continue
      for (const feature of family.features) {
        expect(feature.span, `${family.id}/${feature.id}`).toBeUndefined()
      }
    }
  })

  it('gives every card a drawn visual, in grid order', () => {
    // All eight, which is where this ended up rather than where it started — see the
    // note in `features.ts` for why the last two draw an OUTCOME where the first six
    // draw a surface. Still pinned as an exact ordered list: the day a ninth command
    // lands, this fails and asks what its card should show, which is the question worth
    // being asked.
    //
    // Pinned as an exact list, and in grid order, because a third would arrive as a
    // one-word edit in the data with nothing on screen to argue with it.
    //
    // SCOPED TO THE SKILLS FAMILY, which it did not have to be until a row grew a
    // visual of its own. Read across every family it would now fail on `tasks` — a row,
    // not a card — and the two facts are separate: this one is "all eight cards draw
    // something", and the row-level guard below is "no row draws anything unless it was
    // meant to".
    const workflow = FEATURE_FAMILIES.find((family) => family.id === 'workflow')
    const withVisual = (workflow?.features ?? [])
      .filter((feature) => feature.visual)
      .map((feature) => feature.id)
    expect(withVisual).toEqual([
      'plan',
      'start',
      'continue',
      'commit',
      'pr',
      'review',
      'resolve',
      'done',
    ])
  })

  it('names a card ground that the design system actually declares', () => {
    // `FeatureTone` is a union here and `CARD_TONES` is the authority over there, and
    // the two cannot be one type: `components/ui.tsx` imports React, so this module
    // would stop resolving in the root suite the moment it imported from it. Read as
    // TEXT instead — the same trick `designTokens.test.ts` uses on the same file — so
    // the duplication is checked rather than merely regretted.
    const ui = readFileSync(
      fileURLToPath(new URL('../components/ui.tsx', import.meta.url)),
      'utf8',
    )
    for (const family of FEATURE_FAMILIES) {
      for (const feature of family.features) {
        if (!feature.tone) continue
        expect(ui, `${family.id}/${feature.id} → tone "${feature.tone}"`).toContain(
          `${feature.tone}: { surface: 'bg-tone-${feature.tone}'`,
        )
      }
    }
  })

  it('gives a chosen ground to the two commands that bookend the loop, and to the limits card', () => {
    // Every other card takes whatever the positional cycle hands it, which is what keeps
    // the palette from becoming a legend rather than a rhythm. A THIRD named tone in the
    // skills grid would arrive as a one-word edit with nothing on screen to argue with
    // it, which is why this is an exact list and not a `toContain`.
    const named = FEATURE_FAMILIES.flatMap((family) =>
      family.features.filter((feature) => feature.tone).map((feature) => feature.id),
    )
    // In reading order: `start` opens the loop in orange, `done` closes it in green — the
    // two bookends, and the two whose cycled ground (`sky`, `midnight`) said nothing
    // about the command under it. `usage` is the third and it is in another family: the
    // Claude Code limits are two gauges, and green is what a gauge with room left says in
    // this product, so it asks for `done`'s ground rather than a colour of its own.
    expect(named).toEqual(['start', 'done', 'usage'])
  })

  it('closes the skills and the info sidebar families with a note, and no other', () => {
    // The note exists to contradict the shape the grid draws — five captions and a loop
    // read as an order you have to follow, and the eight skills have no such order. A
    // second family carrying one would be a second closing argument on a page that only
    // needs the one.
    const noted = FEATURE_FAMILIES.filter((family) => family.note).map((family) => family.id)
    expect(noted).toEqual(['workflow', 'insights'])
  })

  it('opens each group of skills with a caption, and nowhere else', () => {
    // The five captions are what break eight equal cards into a loop with a shape — one
    // skill to organise, two to get moving, two to propose, two to read back, one to
    // finish. WHICH cards carry one is therefore the grouping itself, so it is pinned as
    // an exact ordered list: a sixth would split a pair, and a missing one would silently
    // fold two groups into a single wall.
    //
    // These are also the five cards that open a grid row, which is why the captions land
    // between the rows rather than inside one.
    const captioned = FEATURE_FAMILIES.flatMap((family) =>
      family.features.filter((feature) => feature.caption).map((feature) => feature.id),
    )
    expect(captioned).toEqual(['plan', 'start', 'commit', 'review', 'done'])
  })

  it('names a visual this page knows how to draw', () => {
    // `FeatureVisual` is a union, so an unknown name is a `tsc` error at the resolver
    // map — and `tsc` does not run on `webapp/` in CI. Without this, a typo would reach
    // the page as an undefined component and throw inside the grid's `.map()`, which
    // blanks every card rather than one.
    const DRAWN = [
      'agentsSidebar',
      'commitsCard',
      'contextCard',
      'macNotification',
      'menuBar',
      'continueTask',
      'devServer',
      'doneChecklist',
      'planSpec',
      'prCard',
      'prComments',
      'prWatchCard',
      'repoCard',
      'reposSettings',
      'commitConfig',
      'prConfig',
      'profileArt',
      'languagesArt',
      'launchModes',
      'resolvedThreads',
      'reviewDrawer',
      'reviewThreads',
      'skillsModal',
      'splitView',
      'spotlightBar',
      'startTerminal',
      'tasksModal',
      'ticketCard',
      'usageCard',
    ]
    for (const family of FEATURE_FAMILIES) {
      for (const feature of family.features) {
        if (!feature.visual) continue
        expect(DRAWN, `${family.id}/${feature.id}`).toContain(feature.visual)
      }
    }
  })

  it('draws a row-level visual only on the rows that have earned one', () => {
    // THIS TEST USED TO SAY THE OPPOSITE — that no row may carry a visual at all,
    // because `visual` was resolved in the card branch only and setting it on a row
    // silently did nothing. The renderer now promotes a row that names one into a
    // full-width block, so the assertion inverts rather than disappears: the point was
    // never "rows have no pictures", it was "a picture on a row must be deliberate".
    //
    // Pinned as an exact list for that reason. A `rows` family is an INVENTORY, and the
    // failure this guards is the second and third row quietly acquiring a screenshot
    // until a list of thirty entries has become a scroll of thirty screens.
    const drawn = EVERY_FEATURE.filter(({ feature }) => feature.visual).map(
      ({ family, feature }) => `${family}/${feature.id}`,
    )
    const rowVisuals = drawn.filter((entry) => !entry.startsWith('workflow/'))
    expect(rowVisuals).toEqual([
      'desktop/tasks',
      'desktop/skillsPage',
      'desktop/worktrees',
      'desktop/splitView',
      'desktop/spotlight',
      'desktop/notifications',
      'desktop/menuBar',
      'desktop/usage',
      'insights/agentContext',
      'insights/ticketInfo',
      'insights/repository',
      'insights/filePreview',
      'insights/devServer',
      'insights/pullRequest',
      'insights/prComments',
      // The configuration family's opening row, drawn for the reason `desktop/tasks` is:
      // its claim is about a screen, so the screen is under it.
      'configuration/multiRepo',
      'configuration/commitFormat',
      'configuration/pullRequests',
      // The profile and the languages row are a pair, and they are drawn as one: two
      // showcase cards, one over the other, with the same plate under each mark.
      'configuration/profile',
      'configuration/languages',
      'configuration/permissionModes',
    ])

    // And the SHAPE each of them takes, pinned separately because it is a different
    // decision from "does this row have a picture at all". `block` is full width and
    // costs a third of a section; the desktop family carries three of them — Tasks,
    // Skills and Agents — and a fourth arriving as an omitted field is exactly the
    // change nothing else would notice.
    const shapes = EVERY_FEATURE.filter(({ feature }) => feature.visual).map(
      ({ feature }) => feature.shape ?? 'block',
    )
    expect(shapes.filter((shape) => shape === 'showcase')).toHaveLength(6)
  })

  it('points every picto at a file that is actually on disk', () => {
    // A missing `picto` renders a broken image where the icon tile should be — and it
    // is the ONLY field here naming something outside the repository's own modules, so
    // nothing else would catch a rename under `public/img`.
    for (const { family, feature } of EVERY_FEATURE) {
      if (!feature.picto) continue
      expect(feature.picto, `${family}/${feature.id}`).toMatch(/^\/img\/[\w.-]+$/)
      const file = fileURLToPath(new URL(`../public${feature.picto}`, import.meta.url))
      expect(existsSync(file), `${family}/${feature.id} → ${feature.picto} is not on disk`).toBe(
        true,
      )
    }
  })

  it('gives a picto to the five integrations and to nothing else', () => {
    // A `picto` is a MARK, and the integrations are the only rows that need one — a
    // showcase card's plate is nothing without it. Four of the five are somebody else's
    // product; the fifth is ours, on the row about the app setting the machine up.
    // Written out rather than derived, so a future row cannot quietly claim a logo: the
    // disk check above would catch a bad PATH, but not a row that should never have had
    // a picto at all.
    //
    // THE EIGHT COMMANDS USED TO BE IN THIS LIST. Their `skill-*.png` pictos headed the
    // skill cards and were removed — eight flat marks in a grid of eight coloured cards
    // was one decoration too many. The files are still on disk and the documentation
    // still renders them, so nothing here should point at them again by accident.
    const withPicto = EVERY_FEATURE.filter(({ feature }) => feature.picto).map(
      ({ feature }) => feature.id,
    )
    expect(withPicto).toEqual(['jira', 'github', 'vscode', 'claudeCode', 'machineSetup'])
  })

  it('names a plate the design system actually declares', () => {
    // `FeaturePlate` is a union here and `PLATE_GROUNDS` is the authority over there —
    // and the two cannot be linked by a shared type, since `components/ui.tsx` imports
    // React and `lib/features.ts` may not. So the check is textual, the same way the
    // tone check above is: a name with no row in that table resolves to `undefined` as
    // a class, which paints a plate with no ground and no error.
    const ui = readFileSync(
      fileURLToPath(new URL('../components/ui.tsx', import.meta.url)),
      'utf8',
    )
    for (const { family, feature } of EVERY_FEATURE) {
      if (!feature.plate) continue
      expect(ui, `${family}/${feature.id} → plate "${feature.plate}"`).toContain(
        `${feature.plate}: 'bg-plate-${feature.plate}'`,
      )
    }
  })

  it('gives a plate and a mark together, or neither', () => {
    // The panel is drawn only when a row declares BOTH — a plate with no mark is an
    // empty coloured box, and a mark with no plate has nothing to sit on. The renderer
    // falls back rather than throwing, which is exactly why the data needs pinning: the
    // failure would be one card silently missing its artwork.
    for (const { family, feature } of EVERY_FEATURE) {
      expect(Boolean(feature.plate), `${family}/${feature.id}`).toBe(Boolean(feature.picto))
    }
  })

  it('bleeds the two marks that bring their own ground, and no others', () => {
    // `plateFit` describes the FILE: Jira's mark and ours are finished app icons with
    // their own square ground, and the other three are bare glyphs on transparency. Get
    // it the wrong way round and the plate draws a coloured box inside a white box —
    // which renders perfectly and looks like a design decision, so nothing but this
    // would notice.
    const bleeding = EVERY_FEATURE.filter(({ feature }) => feature.plateFit === 'bleed').map(
      ({ feature }) => feature.id,
    )
    expect(bleeding).toEqual(['jira', 'machineSetup'])

    // And nothing outside a showcase family may set it: `plateFit` is read in that
    // branch only, so on a row it would silently do nothing.
    for (const { family, feature } of EVERY_FEATURE) {
      if (!feature.plateFit) continue
      expect(feature.plate, `${family}/${feature.id}`).toBeTruthy()
    }
  })
})

describe('the copy every row points at', () => {
  it('names a key that exists in the catalogue', () => {
    // The assertion criterion 4 rests on. `tsc` does not run on `webapp/` in CI, so the
    // `MessageKey` union guarantees nothing here — and `t()` has no per-key fallback, so
    // a key that does not exist renders an EMPTY paragraph rather than the raw key.
    //
    // `CATALOGUE_KEYS` covers the page's CHROME as well as its rows, which is the
    // whole reason those four keys are named in `features.ts` instead of inline in the
    // JSX: a rename in the catalogues would otherwise blank the `h1` with every row
    // below it intact, and no test in the repository would have an opinion.
    const catalogue = marketingEn as Record<string, string>
    const missing = CATALOGUE_KEYS
      .filter(({ key }) => !isLiteralTitle(key))
      .filter(({ key }) => !catalogue[key])
      .map(({ where, key }) => `${where} → ${key}`)

    expect(missing, `key(s) with no entry in marketingEn:\n  ${missing.join('\n  ')}`).toEqual([])
  })

  it('translates every family heading and intro rather than printing a name', () => {
    // A literal is fine on a feature row — "Jira" is "Jira" — but a family heading is a
    // sentence, and one left as a `LiteralTitle` would print the same on a French page.
    for (const family of FEATURE_FAMILIES) {
      expect(isLiteralTitle(family.title), `${family.id}.title`).toBe(false)
      expect(isLiteralTitle(family.intro), `${family.id}.intro`).toBe(false)
    }
  })

  it('keeps the verbatim titles out of the catalogue', () => {
    // The six product names exist as literals precisely so they need no en/fr pair. One
    // that ALSO had a catalogue entry would be translated by whichever branch the page
    // took, and the entry would owe a row in `i18n.test.ts`'s exact allow-list.
    const catalogue = marketingEn as Record<string, string>
    for (const name of LITERAL_TITLES) {
      expect(catalogue[name], `\`${name}\` is a catalogue key as well as a literal`).toBeUndefined()
    }
  })

  it('recognises a command and a product name, and nothing else', () => {
    // The prefix branch is what covers the eight commands without listing them, and it
    // is safe only because no `MessageKey` begins with a slash. If one ever did, that
    // key would be printed raw instead of translated.
    expect(isLiteralTitle('/magic:plan')).toBe(true)
    expect(isLiteralTitle('Jira')).toBe(true)
    expect(isLiteralTitle('site.features.worktreesTitle')).toBe(false)

    for (const key of Object.keys(marketingEn)) {
      expect(key.startsWith('/'), `\`${key}\` would be printed rather than translated`).toBe(false)
    }
  })

  it('names the page chrome the components actually print', () => {
    // The keys are pinned by hand because the components no longer spell them out: a
    // typo'd rename in `PAGE_CHROME` would sail through the catalogue check above only
    // if the wrong key happened to exist, and would print the WRONG copy on the
    // headline if it did. This is where the four strings themselves are held.
    expect(PAGE_CHROME).toEqual(EXPECTED_CHROME)
  })

  it('translates every page-chrome key rather than printing a name', () => {
    // The chrome is prose in all four cases — a headline, a lead, a rail heading, a nav
    // label. One left shaped like a `LiteralTitle` would print its English on the
    // French page, the way "Jira" is meant to and a headline is not.
    for (const [field, key] of Object.entries(PAGE_CHROME)) {
      expect(isLiteralTitle(key), `chrome.${field}`).toBe(false)
    }
  })

  it('tells a command apart from the other verbatim titles', () => {
    // `isCommandTitle` is the narrower half, and the page reads it for the TYPEFACE:
    // a command prints in the monospace, "Jira" and "Split View" in the display face.
    // Both used to spell the prefix out — here and in the component — so this pins the
    // one owner rather than the two spellings.
    expect(isCommandTitle('/magic:plan')).toBe(true)
    expect(isCommandTitle('Jira')).toBe(false)
    expect(isCommandTitle('site.features.worktreesTitle')).toBe(false)

    for (const command of MAGIC_COMMANDS) {
      expect(isCommandTitle(command.command), command.id).toBe(true)
    }
  })
})
