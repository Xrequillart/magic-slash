import { MAGIC_COMMANDS, type MagicCommandIcon, type MagicCommandId } from './commands'
import type { MessageKey } from './i18n'

/**
 * EVERY FEATURE THE PRODUCT HAS, grouped into families — the canonical list, and the
 * only one. `/features` renders it by `.map()`ing this array; no section on that page is
 * written by hand, which is the whole point of the file. Adding a capability to the site
 * is a row HERE, not a `<section>` over there, and that is what keeps the page from
 * drifting behind the app one forgotten band at a time.
 *
 * ZERO RUNTIME IMPORTS BAR `./commands`, and that is a hard constraint rather than a
 * preference — the same one `lib/commands.ts` and `lib/settingsCatalog.ts` are written
 * under. `features.test.ts` runs in the ROOT vitest suite, on the root `node_modules`,
 * and CI never installs `webapp/`'s dependencies (see the note in `vitest.config.ts`).
 * So a `react`, `next/*`, `lucide-react` or `@supabase/supabase-js` import at ANY depth
 * from here does not fail a test — it fails to RESOLVE one, which reads as a broken
 * suite instead of as a broken module.
 *
 * The two things that ARE imported, and why each is safe:
 *   • `./commands` as a VALUE, because that file imports nothing at all. It is the
 *     source of truth for the eight commands, and the `workflow` family below is MAPPED
 *     from it rather than retyped: their ids, their cycle order and their icons already
 *     live there, `commands.test.ts` already pins the order, and their prose is already
 *     bilingual under `site.commands.<id>`. A ninth command appears on `/features` on
 *     its own.
 *   • `./i18n` as a TYPE ONLY, which esbuild erases — nothing at runtime links this
 *     module to the catalogues. `settingsCatalog.ts:1` is the precedent.
 *
 * NOT `lib/skills.ts`, whose `TRACKED_SKILLS` looks like the same eight names and is the
 * TELEMETRY vocabulary instead — and which imports `./supabase`. See the note on that
 * distinction at the top of `lib/commands.ts`; it applies here word for word.
 *
 * WHICH IS WHY AN ICON IS A NAME. `icon` is an icon NAME, not a component: typing it as
 * one would import `lucide-react` here and break the rule above. The consumer resolves
 * the string through a `Record` keyed by `FeatureIcon`, so a name with no row in that
 * map is a TYPE error at the map — which is worth stating precisely, because it is NOT
 * a check on the pull request: CI typechecks `desktop/` only (`.github/workflows/ci.yml`
 * runs one `tsc --noEmit`, and it is not pointed here). What does catch it is `next
 * build` on Vercel, which typechecks and has no `ignoreBuildErrors` switching that off
 * — so the real consequence of a bad name today is a REFUSED DEPLOY. That is a good
 * deal stronger than nothing and a good deal weaker than a guarantee, so the consumer
 * keeps a runtime fallback behind it as well: the worst a name that slipped past both
 * could do is leave one neutral tile. `components/site/features/FeaturesContent.tsx`
 * holds the map and that fallback, beside the markup that renders them.
 *
 * There is no `window` and no `document` in here either, for the same reason: this is
 * data, and the only thing that should need a browser to read it is the page.
 */

/**
 * Every icon name used below, as a union — the reason a resolver map cannot miss one.
 *
 * The eight from `MagicCommandIcon` come in through the `workflow` family and are part
 * of the union even though that family draws no glyph at all — it renders as coloured
 * cards, whose headline is the command's prose name. They stay in because the map is
 * keyed by this type and because the family's layout is a property of the data: a
 * family that switched back to `rows` would need its eight glyphs to exist that day,
 * not to be added afterwards. The rest are the four hand-written families.
 *
 * AN ICON THIS SITE CAN DRAW, which is not the same set as lucide's exports and is why
 * every name below was checked against the version in `webapp/package.json` rather than
 * guessed: a name lucide does not ship is a missing import in the map, so a `tsc` error
 * and a failed Vercel build — and, if one ever reached a browser anyway, `undefined` at
 * the call site. `undefined` as a component type THROWS in render, and this page is one
 * `.map()`: the throw would blank every row rather than the one that is wrong.
 * Which is why the lookup over there resolves through a fallback instead of trusting
 * the type; checking the names here is still the cheaper half of the job.
 * `Github` is the one that is NOT lucide's — v1 dropped the brand glyphs for trademark
 * reasons, so `components/site/icons.tsx` draws that mark and `FeaturesContent`'s map
 * points this name at it. The union is the site's vocabulary; the map decides where each
 * name's artwork comes from.
 */
export type FeatureIcon =
  | MagicCommandIcon
  | 'Activity'
  | 'AppWindow'
  | 'Bell'
  | 'ClipboardList'
  | 'Columns'
  | 'Gauge'
  | 'GitBranch'
  | 'FolderGit2'
  | 'GitCommitHorizontal'
  | 'Github'
  | 'Languages'
  | 'Layers'
  | 'CircleGauge'
  | 'ListTodo'
  | 'PanelRight'
  | 'Pencil'
  | 'Plug'
  | 'RefreshCw'
  | 'ScrollText'
  | 'Search'
  | 'Settings2'
  | 'ShieldCheck'
  | 'SquareTerminal'
  | 'Ticket'
  | 'UserRound'
  | 'Users'

/**
 * The titles that are NOT copy — a product's own name, or a command as it is typed.
 *
 * "Jira" is "Jira" in every language, and so are the other five. Giving each one a
 * catalogue entry would mean an en/fr pair that is identical ON PURPOSE, and therefore a
 * hand-written row in `i18n.test.ts`'s `SAME_IN_BOTH.site` allow-list — which is an
 * EXACT list, not an inclusion, so every such name costs an edit in two more places and
 * buys nothing. `SiteFooter.tsx`'s `label: MessageKey | 'GitHub'` is the precedent; this
 * is the same trick with six names instead of one.
 *
 * A LIST AND NOT JUST A TYPE, because the consumer has to tell the two apart at RUNTIME
 * to decide whether to call `t()` — see `isLiteralTitle` below.
 */
export const LITERAL_TITLES = [
  // The app's own names for its own things, printed as the product's words rather than
  // translated: the site heads these rows the way the window itself labels them, which is
  // also how "Split View" and "Spotlight" below have always been handled.
  'Tasks',
  'Agents',
  // The window's own title bar, and the rail heading inside it. `sidebar.skills` is
  // "Skills" in the app's French catalogue too, so translating it here would be the page
  // and the app using two words for one screen.
  'Skills',
  'Jira',
  'GitHub',
  'VS Code',
  'Claude Code',
  'Split View',
  'Spotlight',
] as const

/**
 * A title that is printed verbatim: one of the six names above, or a command as typed.
 *
 * The template-literal half is derived from `MagicCommandId` rather than spelled out, so
 * it cannot disagree with `MagicCommand['command']` — the eight rows of the `workflow`
 * family put that exact string in the `title` field.
 */
export type LiteralTitle = (typeof LITERAL_TITLES)[number] | `/magic:${MagicCommandId}`

/** A feature's title: a catalogue key to translate, or a name to print as-is. */
export type FeatureTitle = MessageKey | LiteralTitle

/**
 * Whether a title is a command as typed — which decides BOTH that it is printed
 * verbatim and that it is printed in the monospace the rest of the site gives one.
 *
 * The prefix test is what covers the eight commands without listing them: every
 * `MessageKey` in the catalogues is a dotted `site.*` or app key, so none of them can
 * begin with a slash, and `features.test.ts` asserts that of the catalogue for real.
 *
 * EXPORTED because the page needs the same answer for the typeface, and this module is
 * the one that owns what a command title looks like. It read `startsWith('/magic:')`
 * inline before, which put the prefix in two modules and let the eight rows lose their
 * monospace silently the day `MagicCommand['command']` changed shape.
 */
export function isCommandTitle(title: FeatureTitle): title is `/magic:${MagicCommandId}` {
  return title.startsWith('/magic:')
}

/**
 * A command's name IN PROSE — "Plan", not `/magic:plan`.
 *
 * Two ways of naming the same thing, and the page wants the other one. `/magic:plan` is
 * how you TYPE it: it belongs in a terminal, in the documentation, and anywhere the
 * reader is about to run it. As the headline of a card in a grid of eight it is mostly
 * punctuation — the `/magic:` is identical on all eight, so it repeats a prefix eight
 * times and leaves four characters of actual difference between one card and the next.
 *
 * WRITTEN OUT, NOT CAPITALISED FROM THE ID, and `pr` is the reason. A
 * `charAt(0).toUpperCase()` would produce "Pr", which is not how anybody writes it —
 * and the fix would then be a special case sitting beside a rule, which is two things
 * to keep in sync instead of one table to read. `COMMAND_DESCRIPTIONS` above is written
 * out for the same reason.
 *
 * NOT IN THE CATALOGUE, like the six product names in `LITERAL_TITLES`: these are the
 * commands' own names, the same in French as in English, and an en/fr pair identical on
 * purpose costs a row in `i18n.test.ts`'s exact `SAME_IN_BOTH.site` list and buys
 * nothing. `features.test.ts` pins all eight.
 */
const COMMAND_LABELS: Record<MagicCommandId, string> = {
  plan: 'Plan',
  start: 'Start',
  continue: 'Continue',
  commit: 'Commit',
  // Not "Pr". This is the whole reason the table is a table.
  pr: 'PR',
  review: 'Review',
  resolve: 'Resolve',
  done: 'Done',
}

/**
 * The prose name for a command title, for whoever is drawing it.
 *
 * Takes the TITLE rather than the id, so a caller that has a `FeatureTitle` in hand does
 * not have to take the string apart to use this — the narrowing `isCommandTitle` already
 * did is enough. Lives here rather than in the component for the same reason
 * `isCommandTitle` does: this module owns what a command title is, and the root vitest
 * suite can see it.
 */
export function commandLabel(title: `/magic:${MagicCommandId}`): string {
  return COMMAND_LABELS[title.slice('/magic:'.length) as MagicCommandId]
}

/**
 * Whether a title is printed verbatim rather than translated: a command, or one of the
 * six product names.
 */
export function isLiteralTitle(title: FeatureTitle): title is LiteralTitle {
  if (isCommandTitle(title)) return true
  return (LITERAL_TITLES as readonly string[]).includes(title)
}

export type Feature = {
  /**
   * The row's identity — unique across ALL families, since it is the React key and the
   * name a bug report uses. A plain `string` and not a union, unlike `MagicCommandId`
   * next door: nothing is keyed BY a feature id, so a union would buy no exhaustiveness
   * and would have to be retyped on every addition. `features.test.ts` holds the
   * inventory instead, by hand, which is the reminder a type would not be.
   */
  id: string
  /** A lucide icon NAME — resolved to a component by whoever renders it. */
  icon: FeatureIcon
  title: FeatureTitle
  description: MessageKey
  /**
   * How wide the card is, in a `cards` family. `undefined` is a half-width card; `full`
   * takes the whole row.
   *
   * ONLY MEANINGFUL WHERE `FeatureFamily.layout` IS `cards`, and `features.test.ts`
   * asserts no `rows` family sets it — a field that quietly does nothing in four
   * families out of five is a field the next reader will set and then wonder about.
   *
   * It is here rather than computed from the index because the composition is a fact
   * about the eight commands, not an alternating pattern: `plan` opens the cycle and
   * `done` closes it, and those two get a row of their own precisely because they are
   * the entry and the exit. The six in between are pairs — start/continue, commit/pr,
   * review/resolve — and each pair is two halves of one moment in the loop. Derive that
   * from a modulo and the next command added in the middle shuffles the whole grid.
   */
  span?: 'full'
  /**
   * A flat mark under `public/`, shown in the icon tile INSTEAD of the lucide glyph.
   *
   * The four integrations have one — `jira`, `github`, `vscode`, `claudeCode` — because
   * a row whose title is a product's NAME reads wrong under a generic outline. The eight
   * commands used to carry their `skill-*.png` here and no longer do; see the note in
   * the `.map()` that builds them.
   *
   * These are icons, not screenshots. There is no product imagery on disk and this field
   * is not the place to invent any — a real visual goes through `visual` below.
   */
  picto?: string
  /**
   * The ground the row's mark sits on, in a `showcase` family. A NAME, resolved to a
   * class by `PLATE_GROUNDS` in `components/ui.tsx` — the same indirection `tone` uses,
   * and for the same reason: that module imports React and this one may not.
   *
   * A plate is a PRODUCT'S OWN HUE and means exactly one thing, which is why it is asked
   * for by name and never cycled. Contrast `tone`, three fields down, where cycling is
   * the entire idea. `features.test.ts` checks every name here against the table over
   * there.
   */
  plate?: FeaturePlate
  /**
   * How a row that carries a `visual` is arranged. `undefined` means `block` — see
   * `FeatureShape`, which is where the choice between the two is argued.
   */
  shape?: FeatureShape
  /**
   * How the row's mark meets the white tile on its plate, in a `showcase` family.
   *
   * A FACT ABOUT THE ARTWORK, not a taste about the plate, which is why it is data at
   * all: `bleed` belongs to a mark that arrives as a finished app icon with its own
   * square ground — Jira's and ours — and `inset`, the default, to a bare glyph on
   * transparency. Get it the wrong way round and the plate draws a coloured box inside
   * a white box. See `LogoPlate` in `components/ui.tsx`.
   */
  plateFit?: FeaturePlateFit
  /**
   * A drawn visual for the card, named rather than passed.
   *
   * A NAME AND NOT A COMPONENT, for the same reason `icon` is a name: this module is
   * read by the root vitest suite, which has no React to resolve, so a component here
   * would break the purity the whole file exists to keep. `FeaturesContent` maps the
   * name to the thing that draws it, the way it maps `icon` through `ICONS`.
   *
   * A ROW MAY NOW CARRY ONE TOO, and that is the one rule here that changed. It used to
   * be a card-only field, guarded by a test asserting no row ever set it — because a
   * `rows` family is an INVENTORY, and thirty screenshots is not an inventory.
   *
   * What that rule got wrong is that a row's job is not always to be counted. `tasks` is
   * the desktop family's opening claim and the screen behind it is the argument, so the
   * renderer promotes a row that names a visual into a full-width block — a heading, a
   * paragraph and the drawing under it — and leaves every row that does not exactly as
   * it was. That keeps the default honest: a row is a line of type unless somebody
   * deliberately gives it a picture. `features.test.ts` pins which rows have one.
   */
  visual?: FeatureVisual
  /**
   * The card's ground, when the positional cycle is the wrong answer for it.
   *
   * `undefined` — every card but one — means "take whatever the cycle gives you", which
   * is right precisely because a tone usually means NOTHING: it is a surface in a
   * family, and cycling four across eight cards is what gives the grid its light/dark
   * rhythm without turning the palette into a legend.
   *
   * `done` is the exception, and it is an exception on purpose: green is already how
   * this product says "finished", so the card that closes the loop being green is the
   * palette agreeing with itself. That is a fact about the command, not about its
   * position in a grid — reorder the eight and it should still be green.
   *
   * A STRING AND NOT `CardTone`, the same trick `icon` and `visual` use: `CardTone`
   * lives in `components/ui.tsx`, which imports React, and this module has to stay
   * resolvable by the root vitest suite. `features.test.ts` reads `ui.tsx` as text to
   * assert every name used here is a tone that actually exists, which is the guard a
   * shared type would otherwise have been.
   */
  tone?: FeatureTone
  /**
   * A sentence that OPENS the group this card begins, drawn across the full width above
   * it. `undefined` on a card that continues a group.
   *
   * WHY IT HANGS OFF A CARD RATHER THAN GROUPING THEM. The obvious shape is a list of
   * groups, each with a caption and its features — and it would have cost the page its
   * one guarantee. `FeaturesContent` renders `family.features` through a single `.map()`,
   * which is the only reason "the page lists every feature declared here" is true by
   * construction; a nested list means a nested loop, and a nested loop is somewhere a
   * group can be dropped without a test noticing.
   *
   * So the grouping is expressed as "this is where a group starts", which is a fact about
   * one card and needs no new level. It happens to land on exactly the five cards that
   * already open a grid row — `plan`, `start`, `commit`, `review`, `done` — because the
   * pairs the captions describe ARE the rows. That is not a coincidence to rely on,
   * though: the caption spans the row itself, so it stays above its group whatever the
   * grid does at a given width.
   */
  caption?: MessageKey
}

/**
 * The tones a card may ask for by name. A subset of `CARD_TONES` in
 * `components/ui.tsx` — only the ones that mean something — kept as its own union here
 * for the purity reason above.
 */
export type FeatureTone = 'mint'

/**
 * The plates a row may sit its mark on. A subset of `PLATE_GROUNDS` in
 * `components/ui.tsx` — kept as its own union here for the purity reason above, and
 * cross-checked against that table by `features.test.ts`.
 */
export type FeaturePlate = 'jira' | 'github' | 'vscode' | 'claude' | 'magic'

/**
 * How a mark meets its tile. Mirrors `PlateFit` in `components/ui.tsx`, and is spelled
 * again here rather than imported for the purity reason above.
 */
export type FeaturePlateFit = 'inset' | 'bleed'

/**
 * How a ROW that carries a visual is arranged. Meaningless on a row without one, and on
 * a card — the skills grid has its own rule for that, derived from `span`.
 *
 * `block` is the default and the loud one: a heading, a paragraph and the drawing under
 * it, full width. It is what a row wants when the drawing IS the claim — a backlog you
 * can start an agent from, a sidebar full of running agents — and a family can afford
 * very few of them before it stops being an inventory.
 *
 * `showcase` is the quieter half: the white card the integrations use, copy on the left
 * and the artwork beside it. It suits a row whose drawing ILLUSTRATES a sentence rather
 * than replacing it — a search bar, a notification — and it costs a third of the height.
 *
 * `block` SET EXPLICITLY ON A ROW WITH NO VISUAL is the heading without the drawing: the
 * same `h3` and paragraph, full width, nothing under them. It is for a row that sits
 * among blocks and would otherwise be the one compact line in a family of headings. NO ROW
 * ASKS FOR IT TODAY — the profile row was the one that did, until it was paired with the
 * languages row and took a showcase card of its own — and it is kept because the case it
 * answers is a real one: a capability with nothing to photograph, in a family where
 * everything else is a screen. On a row with a visual it changes nothing, since `block` is
 * what an omitted shape already means.
 */
export type FeatureShape = 'block' | 'showcase' | 'card'

/**
 * The visuals a card can draw. A union, so that adding one is a `tsc` error at the
 * resolver map in `FeaturesContent` rather than a card that renders nothing.
 */
export type FeatureVisual =
  | 'commitsCard'
  | 'contextCard'
  | 'continueTask'
  | 'devServer'
  | 'doneChecklist'
  | 'planSpec'
  | 'prCard'
  | 'prComments'
  | 'prWatchCard'
  | 'repoCard'
  | 'resolvedThreads'
  | 'reviewDrawer'
  | 'reviewThreads'
  | 'skillsModal'
  | 'splitView'
  | 'spotlightBar'
  | 'startTerminal'
  | 'agentsSidebar'
  | 'macNotification'
  | 'menuBar'
  | 'tasksModal'
  | 'reposSettings'
  | 'commitConfig'
  | 'prConfig'
  | 'profileArt'
  | 'languagesArt'
  | 'launchModes'
  | 'ticketCard'
  | 'usageCard'

export type FeatureFamily = {
  id: string
  /**
   * The `#fragment` the sidebar links to and the `id` on the section it lands on.
   *
   * Its own field rather than `id` reused, because the two answer to different owners:
   * `id` is ours to rename, an anchor is in whatever URL someone shared. `[a-z-]+`,
   * asserted in the test.
   */
  anchor: string
  title: MessageKey
  /** One line under the family heading, before its rows. */
  intro: MessageKey
  /**
   * How the family draws itself: a list of rows, or a grid of coloured cards.
   *
   * DECLARED WITH THE DATA RATHER THAN DECIDED IN THE COMPONENT, and that is what
   * keeps the page honest. `FeaturesContent` renders `FEATURE_FAMILIES` through one
   * `.map()`, which is the only reason "the page lists every feature declared here"
   * is true by construction; a component that special-cased `family.id === 'workflow'`
   * would have put one family's shape back into the markup, and the next family that
   * wanted cards would have gone in beside it as a second branch on a name.
   *
   * A field the family owns is also the honest place for it: whether eight commands
   * read better as cards than as rows is a fact about the eight commands.
   */
  layout: FamilyLayout
  /**
   * A closing note for the whole family, drawn under its content as an info card.
   *
   * On the family and not on a feature, unlike `caption`: this is a fact about the SET
   * — that the eight skills do not have to be run in the order the grid puts them in —
   * and hanging it off the last card would have made it look like a note about `done`.
   */
  note?: MessageKey
  features: readonly Feature[]
}

/**
 * `rows` is the ink list this page opened as — an icon, a title, a line, stacked. It
 * is what an inventory of ~30 entries wants, and it stays the default shape.
 *
 * `cards` is the coloured grid, and it earns itself only where the entries are FEW
 * and each one is a thing in its own right. The eight commands qualify: they are the
 * product, they have their own artwork, and eight is a grid. Six settings do not.
 *
 * `showcase` is one white card per entry, copy on the left and the product's mark on a
 * plate of its own colour on the right. It is the widest of the three per entry and so
 * the most expensive, and it is the right shape for exactly one family: the integrations,
 * where the entry IS somebody else's product and the mark is what a reader recognises
 * before they read a word. It would be the wrong shape for the settings families, which
 * have no artwork to show and twice as many rows.
 */
export type FamilyLayout = 'rows' | 'cards' | 'showcase'

/**
 * Command id → its one-line description. Written out rather than interpolated:
 * `MessageKey` is a typed union, so a template string would need a cast and a missing
 * key would become a blank on screen instead of a `tsc` error. Lifted verbatim from the
 * homepage's retired commands band, where it was already doing this job.
 */
const COMMAND_DESCRIPTIONS: Record<MagicCommandId, MessageKey> = {
  plan: 'site.commands.plan',
  start: 'site.commands.start',
  continue: 'site.commands.continue',
  commit: 'site.commands.commit',
  pr: 'site.commands.pr',
  review: 'site.commands.review',
  resolve: 'site.commands.resolve',
  done: 'site.commands.done',
}

/**
 * The two commands that take a row of their own — see the note on `span` in `Feature`,
 * and the one on the `.map()` below. Named rather than inlined so the reason lives in
 * one place and `features.test.ts` can pin the pair.
 */
const FULL_WIDTH_COMMANDS: readonly MagicCommandId[] = ['plan', 'done']

/**
 * Which commands carry a drawn visual, and which drawing. A partial record: the six
 * absent from it are copy-only cards, which is the intended proportion rather than a
 * gap — see the note at the `.map()` below. `features.test.ts` pins the pair.
 */
const CARD_VISUALS: Partial<Record<MagicCommandId, FeatureVisual>> = {
  plan: 'planSpec',
  start: 'startTerminal',
  continue: 'continueTask',
  commit: 'commitsCard',
  pr: 'prWatchCard',
  review: 'reviewThreads',
  resolve: 'resolvedThreads',
  done: 'doneChecklist',
}

/**
 * The commands whose card ground is chosen rather than cycled. One, so far. See the note
 * on `Feature.tone`.
 */
const CARD_TONES_BY_COMMAND: Partial<Record<MagicCommandId, FeatureTone>> = {
  done: 'mint',
}

/**
 * The five sentences that break the eight cards into groups, each keyed to the command
 * that opens its group.
 *
 * The grid was legible and unreadable: eight cards of equal weight, four of them carrying
 * a drawing, and nothing telling you that `start` and `continue` are two halves of one
 * moment while `commit` and `pr` are two halves of another. The loop HAS a shape — one
 * skill to organise, two to get moving, two to put up for review, two to read back, one
 * to finish — and these say it out loud so the reader is not left to infer it from
 * adjacency.
 *
 * They also do the work the page needed most: air. Five full-width lines of type between
 * the rows is what turns a wall of eight into five things to read.
 */
const CARD_CAPTIONS: Partial<Record<MagicCommandId, MessageKey>> = {
  plan: 'site.features.groupPlan',
  start: 'site.features.groupBuild',
  commit: 'site.features.groupPropose',
  review: 'site.features.groupReview',
  done: 'site.features.groupFinish',
}

/**
 * The eight commands, DERIVED rather than declared — the one family this file does not
 * write out. `MAGIC_COMMANDS` already carries the ids, the cycle order and the icons;
 * duplicating them here would be a second list to keep in step, and the failure would be
 * a page that shows seven commands while the product ships eight.
 */
const WORKFLOW_FEATURES: readonly Feature[] = MAGIC_COMMANDS.map((command) => ({
  id: command.id,
  icon: command.icon,
  // The typed form. `commandLabel` turns it into the prose name a card is headed with.
  title: command.command,
  description: COMMAND_DESCRIPTIONS[command.id],
  // NO PICTO. The eight `skill-*.png` marks used to head these cards at 48px, and they
  // are gone from this page on purpose: eight flat pictos in a grid of eight coloured
  // cards is one decoration too many — the tone already tells the cards apart, and the
  // marks were competing with it rather than adding to it. The files stay on disk; the
  // documentation still renders them inline, which is where they read as icons.
  //
  // What replaces them is nothing on seven cards and a real visual on one. See `visual`
  // below, and the note on it in `Feature`.
  // THE BOOKENDS GET A ROW EACH. `plan` is where a piece of work enters the loop and
  // `done` is where it leaves; the six between them are three pairs, and each pair is
  // two halves of one moment — start/continue is beginning and resuming, commit/pr is
  // recording and proposing, review/resolve is reading and answering. A full-width card
  // at the top and another at the bottom is the shape of that, and it is why this is a
  // property of the command rather than an alternating pattern over the index.
  ...(FULL_WIDTH_COMMANDS.includes(command.id) ? { span: 'full' as const } : {}),
  // ALL EIGHT SHOW SOMETHING NOW, which is not where this started and is worth the
  // note. Six of them draw a surface the product actually has — the spec panel, the
  // terminal, the Tasks row, the commits list, the PR watch card, a review thread. The
  // last two draw an OUTCOME instead, because `resolve` and `done` have no screen of
  // their own: `resolve` answers a review, so its card shows the pull request's
  // conversations afterwards — two settled, one still open under the reply that argued
  // back — and `done` runs a cleanup, so its card shows the cleanup ticking off. That is
  // a different kind of drawing and it is the honest one for them.
  //
  // `resolve` USED TO DRAW GITHUB'S MERGE BUTTON, and the swap is worth the line: the
  // command does not merge anything, so the prettiest visual on the page was also the
  // one teaching the reader the wrong thing about what it does. `plan` produces a document, the part of this product
  // nobody expects, so its card draws the app's own spec panel holding one. `start`
  // is the command they would actually type to find out whether any of this is real,
  // so its card shows it running. `continue` is the claim that the work is still
  // there when you or a colleague come back, so its card shows the ticket waiting
  // with the one control that picks it up. `commit` is the one whose OUTPUT is worth
  // seeing rather than its running: a list of atomic commits with real subjects is
  // the argument.
  //
  // The two full-width bookends therefore both carry a panel BESIDE their copy rather
  // than under it — `plan` opens on the spec it writes, `done` closes on the list it
  // clears — which is what makes the grid read as a loop that comes back round.
  ...(CARD_VISUALS[command.id] ? { visual: CARD_VISUALS[command.id] } : {}),
  ...(CARD_TONES_BY_COMMAND[command.id] ? { tone: CARD_TONES_BY_COMMAND[command.id] } : {}),
  ...(CARD_CAPTIONS[command.id] ? { caption: CARD_CAPTIONS[command.id] } : {}),
}))

/**
 * THE SIX FAMILIES, IN READING ORDER, and the order is the content: `workflow` first
 * because the commands are what the product IS, then the two SURFACES it runs on — the
 * desktop app and the cloud beside it — then what it reaches outside itself, then what
 * you can change about it, then what it tells you back. Sorting these alphabetically
 * would open the page on "cloud".
 *
 * `cloud` SITS NEXT TO `desktop` FOR THAT REASON and not because the two were written
 * together. They are the product's two windows on one account: the app is where agents
 * run, the web is where an organization, its people and its plans are read. Putting the
 * cloud family further down — after the integrations, say — would have implied it is
 * something the product connects TO rather than something it IS.
 *
 * The five hand-written families draw their taxonomy from `lib/settingsCatalog.ts` — the
 * sixteen groups the back-office reads `user_settings` through, which are themselves the
 * desktop app's own section titles. That is deliberate: a reader who scrolls this page
 * and then opens the app's Application tab should meet the same words for the same
 * things. Where a capability has no setting behind it (worktrees, the Tasks list, the
 * file preview) it is named after what the app calls it on screen.
 *
 * NOTHING IN HERE IS ASPIRATIONAL. Every row was checked against `desktop/src` or
 * `skills/` before it was written; a capability that could not be confirmed was left
 * out rather than described optimistically, because this is the page a reader treats as
 * the product's inventory.
 */
export const FEATURE_FAMILIES: readonly FeatureFamily[] = [
  {
    id: 'workflow',
    anchor: 'workflow',
    // "Skills" IN BOTH LANGUAGES, and that is a decision rather than an oversight: it
    // is what the product calls them, what the app's own menu says, and what the
    // documentation says — `site.mockup.menuSkills` is already on the same footing in
    // `i18n.test.ts`'s allow-list for exactly this reason. Translating it to
    // "compétences" would name something the app does not have.
    //
    // Because the two catalogues then hold an identical string, the key has to be
    // listed in that test's `SAME_IN_BOTH.site` — an EXACT list, not an inclusion, so
    // it is the one place this costs an edit.
    title: 'site.features.groupSkillsTitle',
    // The tile the old feature grid gave the same eight commands. Reused rather than
    // rewritten: already bilingual, and already says this.
    intro: 'site.features.commandsDesc',
    layout: 'cards',
    // The grid reads as a pipeline — five captions, a loop that comes back round — and
    // that is true of a whole ticket and false of the skills themselves. Every one of
    // them stands alone, and the page has to say so or the shape it just drew becomes a
    // rule the reader thinks they have to follow.
    note: 'site.features.skillsIndependent',
    features: WORKFLOW_FEATURES,
  },
  {
    id: 'desktop',
    anchor: 'desktop',
    title: 'site.features.desktopTitle',
    intro: 'site.features.desktopDesc',
    layout: 'rows',
    features: [
      {
        // MOVED OUT OF `integrations`, where it sat because its contents are read from
        // Jira and GitHub. But what the row describes is a SURFACE — `pages/Tasks/` in
        // the desktop app, one section per repository — and the reader looking for it is
        // looking for a thing the window has, not for a tracker the app talks to. The
        // family it belongs to is the one about the app.
        //
        // THE FIRST ROW ON THIS PAGE TO CARRY A VISUAL WITHOUT BEING A CARD. Everything
        // else in this family is a line of type under a glyph, which is what an
        // inventory of seven wants; this one opens on the screen itself, because "every
        // ticket you could pick up, in one list, with an agent one click away" is a
        // claim a sentence cannot make and a drawing of the list can. See `visual` on
        // `Feature` for how a row promotes itself, and `FamilyLayout` for why the rest
        // of the family stays as rows.
        id: 'tasks',
        icon: 'ListTodo',
        title: 'Tasks',
        description: 'site.features.tasksDesc',
        visual: 'tasksModal',
      },
      {
        // A BLOCK, AND IT WAS A SHOWCASE — a sentence with a light drawing of a list
        // beside it. What that shape could not say is that this window is not a list at
        // all: it is a rail of every skill on the machine, a budget gauge scaled to the
        // model that is running, and a warnings band that offers to fix what it found.
        // Three things, and a thumbnail beside a paragraph shows none of them.
        //
        // So it takes the shape `Agents` takes, two rows down: a heading, a paragraph,
        // the screen at full width, and a legend under it naming the parts of the screen
        // that a still image cannot explain.
        //
        // "Skills" AND NOT "The Skills page", for the reason `Tasks` and `Agents` are
        // headed the way they are: it is the word on the window's own title bar, in both
        // languages, and heading the row with anything else would be the page and the
        // app disagreeing about the name of a screen.
        id: 'skillsPage',
        icon: 'Layers',
        title: 'Skills',
        description: 'site.features.skillsPageDesc',
        visual: 'skillsModal',
      },
      {
        // "Agents", the sidebar's own heading for the list — the same call `Tasks` above
        // makes. What the row is ABOUT is still one worktree per job; what the reader
        // sees in the app is a column labelled AGENTS, and heading the row with anything
        // else would be the page and the window using two words for one thing.
        id: 'worktrees',
        icon: 'GitBranch',
        title: 'Agents',
        description: 'site.features.worktreesDesc',
        visual: 'agentsSidebar',
      },
      {
        id: 'splitView',
        icon: 'Columns',
        title: 'Split View',
        description: 'site.features.splitViewDesc',
        visual: 'splitView',
        shape: 'showcase',
      },
      {
        // SHOWCASE AND NOT BLOCK, like Split View just above it. The drawing here
        // illustrates the sentence rather than replacing it — you can say what Quick
        // Launch does in a line, and the picture only has to show that the line is
        // literal. A full-width block would have spent a third of the section on it.
        id: 'spotlight',
        icon: 'Search',
        title: 'Spotlight',
        description: 'site.features.spotlightDesc',
        visual: 'spotlightBar',
        shape: 'showcase',
      },
      {
        // The retired feature grid's "Hooks and notifications" tile, whose pair says
        // exactly this and says it in both languages.
        id: 'notifications',
        icon: 'Bell',
        title: 'site.features.hooksTitle',
        description: 'site.features.hooksDesc',
        visual: 'macNotification',
        shape: 'showcase',
      },
      {
        id: 'menuBar',
        icon: 'AppWindow',
        title: 'site.features.menuBarTitle',
        description: 'site.features.menuBarDesc',
        visual: 'menuBar',
        shape: 'showcase',
      },
      {
        // Moved here from the info sidebar family: the two rate limits are the LEFT
        // sidebar's footer card, on every screen of the app, not a card of the panel.
        id: 'usage',
        icon: 'Gauge',
        title: 'site.features.usageTitle',
        description: 'site.features.usageDesc',
        // A CARD, the third shape a row can take and the one the skills are drawn as:
        // the tone card with the copy on the left and the drawing beside it. Green, as
        // `/magic:done` is — the gauges are the palette agreeing with itself again.
        visual: 'usageCard',
        shape: 'card',
        tone: 'mint',
      },
    ],
  },
  {
    // THE INFO SIDEBAR — the app's right-hand panel, card by card. Right after the
    // desktop family, because it is a part of that window: the part the app keeps open
    // beside every agent. Seven rows, each a `block` with the card redrawn under it, the
    // way Tasks and Agents are drawn above.
    //
    // The limits card is NOT here: in the app it lives in the left sidebar's footer, so
    // its row is in the desktop family above.
    id: 'insights',
    anchor: 'insights',
    title: 'site.features.groupInsightsTitle',
    intro: 'site.whereItStands.subtitle',
    layout: 'rows',
    // A fact about the whole panel, not about its last card: it keeps itself up to date,
    // and it can be edited by hand. On the family for the reason the skills note is.
    note: 'site.features.sidebarSelfUpdating',
    features: [
      {
        id: 'agentContext',
        icon: 'CircleGauge',
        title: 'site.features.agentContextTitle',
        description: 'site.features.agentContextDesc',
        visual: 'contextCard',
      },
      {
        id: 'ticketInfo',
        icon: 'Ticket',
        title: 'site.features.ticketInfoTitle',
        description: 'site.features.ticketInfoDesc',
        visual: 'ticketCard',
      },
      {
        id: 'repository',
        icon: 'GitBranch',
        title: 'site.features.repositoryTitle',
        description: 'site.features.repositoryDesc',
        visual: 'repoCard',
      },
      {
        id: 'filePreview',
        icon: 'ScrollText',
        title: 'site.features.filePreviewTitle',
        description: 'site.features.filePreviewDesc',
        // Moved here from the desktop family: the review drawer opens from this card's
        // file list, so it belongs beside the branch and the commits it reviews.
        visual: 'reviewDrawer',
      },
      {
        // THE DETAIL AFTER THE REPOSITORY CARD: the same card, a different story. A row of
        // its own rather than a second picture under the one above, because it says one
        // more thing — a server can be started from here — and a sentence wants a heading.
        id: 'devServer',
        icon: 'SquareTerminal',
        title: 'site.features.devServerTitle',
        description: 'site.features.devServerDesc',
        visual: 'devServer',
      },
      {
        id: 'pullRequest',
        icon: 'Github',
        title: 'site.features.pullRequestTitle',
        description: 'site.features.pullRequestDesc',
        visual: 'prCard',
      },
      {
        id: 'prComments',
        icon: 'ScrollText',
        title: 'site.features.prCommentsTitle',
        description: 'site.features.prCommentsDesc',
        visual: 'prComments',
      },
    ],
  },
  {
    id: 'integrations',
    anchor: 'integrations',
    // A title of its own rather than the grid's "GitHub and Jira": this family also
    // holds VS Code, Claude Code and the machine setup, and a heading that names two of
    // the five reads as a promise the rows below break.
    title: 'site.features.groupIntegrationsTitle',
    intro: 'site.features.integrationsDesc',
    // THE ONE FAMILY THAT IS NOT A LIST. It was `rows` — a 40px mark, a product name, a
    // sentence — and the mark was the problem: a logo is the thing a reader recognises
    // before they read anything, and at 40px in a stack of five it was a bullet point.
    // See `FamilyLayout` for why this shape is right here and wrong for the two families
    // below it.
    layout: 'showcase',
    features: [
      // EVERY ROW CARRIES ITS OWN MARK, not a lucide glyph stood in for one, and in this
      // family that is not decoration — the plate IS the row's identity. `public/img/`
      // ships all five. The `icon` stays on every row because the union is what `ICONS`
      // is keyed by: it is the fallback if a logo ever goes missing from disk, which
      // `features.test.ts` checks for.
      //
      // THE TITLES NAME AN ACTION, NOT A PRODUCT. They used to be "Jira", "GitHub",
      // "VS Code" — which the mark beside them now says better than a word can, so the
      // headline was spending itself on a thing the reader had already seen. What it
      // says instead is what you get: open it, drive it, ship through it.
      //
      // TWO OF THE FIVE MARKS BLEED. Jira's and ours arrive as finished app icons with
      // their own square ground; the other three are bare glyphs on transparency. See
      // `plateFit` — it is a fact about the file, not a preference.
      {
        id: 'jira',
        icon: 'Ticket',
        title: 'site.features.jiraTitle',
        description: 'site.features.jiraDesc',
        picto: '/img/jira-logo.png',
        plate: 'jira',
        plateFit: 'bleed',
      },
      {
        id: 'github',
        icon: 'Github',
        title: 'site.features.githubTitle',
        description: 'site.features.githubDesc',
        picto: '/img/github-logo.png',
        plate: 'github',
      },
      {
        id: 'vscode',
        icon: 'Pencil',
        title: 'site.features.vscodeTitle',
        description: 'site.features.vscodeDesc',
        picto: '/img/vscode-logo.png',
        plate: 'vscode',
      },
      {
        id: 'claudeCode',
        icon: 'SquareTerminal',
        title: 'site.features.claudeCodeTitle',
        description: 'site.features.claudeCodeDesc',
        // `claudecode-color.png` and not `claude-logo.png`: the integration is Claude
        // CODE, and the repo ships a mark for each.
        picto: '/img/claudecode-color.png',
        plate: 'claude',
      },
      {
        // THE ONE ROW WHOSE PLATE IS OURS. It is not somebody else's product — it is the
        // app wiring this machine up to all four above it — so it takes the app's own
        // mark on the brand plate.
        id: 'machineSetup',
        icon: 'Plug',
        title: 'site.features.machineSetupTitle',
        description: 'site.features.machineSetupDesc',
        // `app-icon-desktop.png` — the icon that actually ships on the dock today, and
        // the one file in `public/img/` that is it. `app-icon.png` is the OLD mascot on
        // a white field (the `/admin` device panel still draws it, and still calls it
        // "the REAL icon", which it has not been for some time), and `mascot.png` is the
        // bare rabbit with no ground.
        //
        // It brings its own square, so it bleeds to the tile's edge like Jira's.
        picto: '/img/app-icon-desktop.png',
        plate: 'magic',
        plateFit: 'bleed',
      },
    ],
  },
  {
    id: 'configuration',
    anchor: 'configuration',
    title: 'site.features.configurationTitle',
    intro: 'site.features.configurationDesc',
    layout: 'rows',
    features: [
      {
        // THE FAMILY'S OPENING CLAIM, drawn — the same call `tasks` makes at the top of
        // the desktop family. "One GitHub repository is one configuration, and the
        // organization owns it" is a sentence about a SCREEN: the Settings modal open
        // on Repositories, with a personal section and the organization's under it.
        // So the row promotes itself to a block with that screen redrawn beneath it,
        // and the four rows after it stay the compact inventory they were.
        id: 'multiRepo',
        icon: 'Layers',
        title: 'site.features.multiRepoTitle',
        description: 'site.features.multiRepoDesc',
        visual: 'reposSettings',
      },
      {
        // A BLOCK, like the row above it: the claim is about a settings tab, so the tab
        // is drawn under it — and the four formats the select offers are tabled under
        // the drawing, since a closed select shows one of them.
        id: 'commitFormat',
        icon: 'GitCommitHorizontal',
        title: 'site.features.commitFormatTitle',
        description: 'site.features.commitFormatDesc',
        visual: 'commitConfig',
      },
      {
        // THE PULL REQUEST'S OWN ROW, beside the commit's, and drawn the same way: the
        // Pull Request tab of the same page, with the five things it configures listed
        // under the drawing. `GitPullRequest` is in the union through the `pr`
        // command's icon.
        id: 'pullRequests',
        icon: 'GitPullRequest',
        title: 'site.features.pullRequestsTitle',
        description: 'site.features.pullRequestsDesc',
        visual: 'prConfig',
      },
      {
        // THE LANGUAGES ROW'S TWIN, and built as one on purpose: same `showcase` shape,
        // same plate, same 96px mark centred on it. The two are a pair — who the app is
        // talking to, and which language it says it in — and a pair reads as one only if
        // both halves are drawn the same way.
        //
        // IT SITS ABOVE `languages`, which is the other half of that: who is being
        // spoken to comes before which language it is said in. Read the other way round,
        // the profile arrives as an afterthought to a settings list it is in fact the
        // premise of.
        //
        // IT WAS A BARE HEADING, and the reason it could not stay one is the pairing. The
        // onboarding form is a six-step wizard and the profile itself is a markdown file,
        // so there is no screen to reproduce here — which is why this row spent a long
        // time as the one heading in the family with nothing under it, and read as a
        // footnote to its neighbour rather than its equal. `profileArt` answers with a
        // sign rather than a surface; see the note in that file.
        id: 'profile',
        icon: 'UserRound',
        title: 'site.features.profileTitle',
        description: 'site.features.profileDesc',
        visual: 'profileArt',
        shape: 'showcase',
      },
      {
        // SHOWCASE, the quieter of the two shapes: the sentence lists the five surfaces
        // a language is set on, and the art is one glyph beside it rather than a tab
        // that would list them again.
        id: 'languages',
        icon: 'Languages',
        title: 'site.features.languagesTitle',
        description: 'site.features.languagesDesc',
        visual: 'languagesArt',
        shape: 'showcase',
      },
      {
        // A BLOCK WITH NO WINDOW IN IT: the visual is the five launch modes, two to a
        // row, each with the app's own help line. The setting is one select in the
        // Claude Code tab, and a drawing of it would show one mode out of five.
        id: 'permissionModes',
        icon: 'ShieldCheck',
        title: 'site.features.permissionModesTitle',
        description: 'site.features.permissionModesDesc',
        visual: 'launchModes',
      },
    ],
  },
  {
    id: 'cloud',
    anchor: 'cloud',
    // "Cloud", flat, and it is the one family heading that is a NOUN rather than a
    // sentence. The other five say what you get — "Connected to your tools", "Where
    // every job stands" — and this one says where you are, because that is the fact a
    // reader arriving from the desktop family needs first: there is a second surface,
    // and it is the same account. The intro carries the sentence the heading no longer
    // does.
    //
    // Identical in both catalogues on purpose, which costs a line in `i18n.test.ts`'s
    // `SAME_IN_BOTH` — the same call `site.features.groupSkillsTitle` already makes.
    title: 'site.features.groupCloudTitle',
    intro: 'site.features.cloudDesc',
    layout: 'rows',
    features: [
      // FOUR ROWS, AND THEY WERE SIX. The first draft had one row per SCREEN — the web
      // app, the organization page, invitations, the team board, plans, shared repos —
      // which is how the product is built and not how it is understood. Grouped by what
      // a reader actually wants from the cloud, it is four things: the people, the
      // repositories they share, the plans they write, and the settings that follow them
      // between machines.
      //
      // The row that opened the six — "the same account, in a browser" — is gone as a
      // row and lives in the family's intro instead. It answers a question about the
      // WHOLE family ("is this a second product?"), so a line above all four says it
      // once rather than a row saying it beside three others.
      {
        // The organization page and the invitation modal, which are one job: who is in
        // your team and what they may do. The two roles are the app's own, and their
        // descriptions in the catalogue are `org.role.member.help` and
        // `org.role.admin.help` — the sentences that modal prints under each choice.
        id: 'team',
        icon: 'Users',
        title: 'site.features.teamTitle',
        description: 'site.features.teamDesc',
      },
      {
        // MOVED OUT OF `configuration` when this family was written, and it earns its
        // place here twice over now: the family it sat in is called "Your conventions"
        // and every other row in it is a setting you choose, while this one is a SHARING
        // MODEL — who owns a repository's conventions and who may change them.
        //
        // It has absorbed the team board, which was its own row: `/dashboard` lists
        // shared repositories and the agents on each, so it is the same subject seen
        // from the other end.
        id: 'teamRepos',
        icon: 'FolderGit2',
        title: 'site.features.teamReposTitle',
        description: 'site.features.teamReposDesc',
      },
      {
        // MOVED OUT OF `insights`, where it read as a fact about storage — "a plan
        // survives the window it was written in". True, and the smaller half: the specs
        // are on the account so that `/plans` can list every one written on a repository
        // you can see, your team's included.
        id: 'planSessions',
        icon: 'ClipboardList',
        title: 'site.features.planSessionsTitle',
        description: 'site.features.planSessionsDesc',
      },
      {
        // THE ONE ROW THAT IS ABOUT THE DESKTOP APP AND STILL BELONGS HERE. Its settings
        // have no local file — `CLAUDE.md` is explicit that Supabase is the single
        // source of truth and that the app holds its config in memory, hydrated from the
        // cloud — so where they LIVE is a cloud fact, and the `/application/*` pages are
        // where they are edited from a browser.
        id: 'appSettings',
        icon: 'Settings2',
        title: 'site.features.appSettingsTitle',
        description: 'site.features.appSettingsDesc',
      },
    ],
  },
]

/**
 * THE KEYS THE PAGE'S OWN CHROME PRINTS — its headline, its lead, the rail's heading,
 * and the label of the link that leads to it. Everything on `/features` that is not a
 * family or a feature row.
 *
 * They live in this module, which is a data file and not a component, for one reason:
 * `features.test.ts` runs in the ROOT vitest suite and can therefore see THIS file,
 * while a `.tsx` importing react is unresolvable from there. Left spelled out inline in
 * the JSX — which is where all four started — these keys sat OUTSIDE the only guard
 * that actually holds the page's copy together. The argument that test makes for
 * acceptance criterion 4 applies to them word for word: `tsc` does not run on `webapp/`
 * in CI, and `t()` has no per-key fallback, so a key that is renamed in the catalogues
 * and not here prints an EMPTY heading rather than an error, on the page's biggest line.
 * Naming them here puts them through the same catalogue lookup as `family.title`, and
 * the components read them from here rather than retyping the strings.
 *
 * `allFeatures` IS THE ODD ONE, and deliberately in: it labels the link INTO this page
 * rather than anything on it — the header's Product row and the homepage's closing CTA
 * both print it. It is guarded here because this page is what it points at, and an
 * empty label is a link that reads as broken to the only page these keys serve.
 *
 * Not `as const` alone and not a bare `Record` either: `satisfies` keeps the values
 * narrow enough for the test to compare them against hand-written strings while still
 * checking every one of them is a real `MessageKey`. `RepositoryForm.tsx` is the
 * precedent for the operator in this webapp.
 */
export const PAGE_CHROME = {
  /** The page's `h1`. */
  title: 'site.features.title',
  /** The one line under it. */
  lead: 'site.features.pageLead',
  /** The sidebar's heading, which also names the rail for a screen reader. */
  onThisPage: 'site.features.onThisPage',
  /** The label of the link to this page, wherever the site offers one. */
  allFeatures: 'site.nav.allFeatures',
} as const satisfies Record<string, MessageKey>
