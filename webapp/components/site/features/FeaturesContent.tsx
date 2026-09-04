'use client'

import {
  Activity,
  AppWindow,
  Bell,
  CheckCircle,
  CircleGauge,
  ClipboardList,
  Columns,
  Gauge,
  GitBranch,
  GitCommit,
  GitCommitHorizontal,
  FolderGit2,
  GitPullRequest,
  Info,
  Languages,
  Layers,
  ListTodo,
  NotebookPen,
  PanelRight,
  Pencil,
  Play,
  Plug,
  RefreshCw,
  Rocket,
  ScanSearch,
  ScrollText,
  Search,
  Settings2,
  ShieldCheck,
  SquareTerminal,
  Ticket,
  UserRound,
  Users,
  Wrench,
} from 'lucide-react'
import {
  commandLabel,
  FEATURE_FAMILIES,
  isCommandTitle,
  isLiteralTitle,
  PAGE_CHROME,
  type FeatureIcon,
  type FeatureTitle,
  type FeatureVisual,
} from '@/lib/features'
import { Fragment } from 'react'
import { Card, CARD_TONE_CYCLE, LogoPlate, ShowcaseCard, ToneCard } from '@/components/ui'
import type { Translate } from '@/lib/i18n'
import { useT } from '@/lib/i18n/useLanguage'
import { Bloom } from '../home/HeroSection'
import { HomeSection } from '../home/Shell'
import { GithubIcon } from '../icons'
import { FeaturesSidebar } from './FeaturesSidebar'
import { AgentsSidebarMockup } from './AgentsSidebarMockup'
import { CommitsCardMockup } from './CommitsCardMockup'
import { ContextCardMockup } from './ContextCardMockup'
import { MacNotificationMockup } from './MacNotificationMockup'
import { MenuBarMockup } from './MenuBarMockup'
import { ContinueTaskMockup } from './ContinueTaskMockup'
import { DoneChecklistMockup } from './DoneChecklistMockup'
import { PRWatchCardMockup } from './PRWatchCardMockup'
import { PRCommentsMockup } from './PRCommentsMockup'
import { PullRequestCardMockup } from './PullRequestCardMockup'
import { DevServerMockup, RepoCardMockup } from './RepoCardMockup'
import { ReposSettingsMockup } from './ReposSettingsMockup'
import { CommitConfigMockup, PRConfigMockup } from './RepoConfigMockup'
import { LanguagesArt } from './LanguagesArt'
import { LaunchModesGrid } from './LaunchModesGrid'
import { ResolvedThreadsMockup } from './ResolvedThreadsMockup'
import { ReviewDrawerMockup } from './ReviewDrawerMockup'
import { ReviewThreadsMockup } from './ReviewThreadsMockup'
import { SkillsPageMockup } from './SkillsPageMockup'
import { SpecPanelMockup } from './SpecPanelMockup'
import { SplitViewMockup } from './SplitViewMockup'
import { SpotlightBarMockup } from './SpotlightBarMockup'
import { StartTerminal } from './StartTerminal'
import { TasksModalMockup } from './TasksModalMockup'
import { TicketCardMockup } from './TicketCardMockup'
import { UsageCardMockup } from './UsageCardMockup'

/**
 * The whole of `/features`: the headline, the sticky table of contents, and every
 * family as an anchored section of inline rows.
 *
 * IT RENDERS `FEATURE_FAMILIES` AND NOTHING ELSE. No section on this page is written by
 * hand — the `.map()` below is the entire structure, which is what makes acceptance
 * criterion 2 ("the page lists every feature declared in `lib/features.ts`") true by
 * CONSTRUCTION rather than by anybody remembering. It cannot be tested from the root
 * suite, since JSX would not compile without `webapp/node_modules`; the `.map()` is the
 * guarantee, so nothing here may grow a hardcoded band beside it.
 *
 * A LIST AND NOT A CARD GRID, deliberately, and the reference is CleanShot's own
 * features page: one column of rows under one heading per family, read top to bottom. A
 * grid of ~30 cards asks the reader to compare them; a list lets them scan for the one
 * they came for. Which is also why there is no search and no filter — see the note in
 * `FeaturesSidebar.tsx`.
 *
 * NO `marketing.css`, and none of that stylesheet's eleven button recipes. This tree is
 * in `homepageStylesheet.test.ts`'s scan (it walks `components/site/**` and excludes only
 * `story/` and `documentation/`), so the rule is enforced rather than remembered: every
 * value below is a token from `tailwind.config.ts` or a primitive from `components/ui.tsx`.
 *
 * ONE INK AT SEVERAL ALPHAS, WHICH IS THE PART THIS PAGE DOES DIFFERENTLY.
 *
 * The reference page builds its whole text hierarchy out of a single near-black —
 * `#161618` for a heading, the SAME value at 64% for every description under it, and
 * again at 12% and 6% for its rules and its resting fills. It never reaches for a second
 * grey. That is why an inventory of ~30 rows reads as one surface instead of as thirty
 * cards: the only thing separating a title from its description is how much of the same
 * ink each one is given.
 *
 * So this page uses `text-ink` and `text-ink/60` where the rest of the site uses `ink`
 * and `muted`. `muted` (#52525b) is a DIFFERENT hue — cooler and desaturated — and next
 * to `ink` (#0a0a0a) at this density the two read as two decisions rather than one.
 * `ink/60` is the same decision, weakened. It is a page-local choice and not a token
 * change: `muted` stays exactly as it is everywhere else on the site.
 *
 * AND THE GROUND IS WHITE, not `canvas`. `canvas` (#F4F7FE) is a blue tint that works
 * under the homepage's bands, where it separates them; here there are no bands to
 * separate, and a translucent ink over a tinted ground is what turns a grey into a
 * colour. The header's scrolled state is already `bg-white/80`, so it lands cleanly.
 *
 * WHAT IS NOT COPIED: the reference's own blue (#0d44e8). This site has `brand` and
 * `accent` and a design system that just settled them (PR #277). The INKS are what was
 * asked for and what travels; a palette swap would be a different change.
 */

/**
 * Icon NAME → component, for the strings in `FEATURE_FAMILIES`.
 *
 * The reason `lib/features.ts` names an icon rather than importing one: that module is
 * read by the root vitest suite, which runs on the root `node_modules` and has no
 * `lucide-react` to resolve. So the map lives HERE, beside the markup that renders it —
 * the same split the homepage's retired commands band used, and for the same reason.
 *
 * EXHAUSTIVE BY TYPE, which is what makes the split safe rather than merely tidy: it is
 * keyed by the `FeatureIcon` union, so a new icon name over there is a `tsc` error at
 * this map instead of a row that renders no glyph.
 *
 * BUT A TYPECHECK IS NOT A CHECK THAT RUNS HERE, and that is the part worth writing
 * down. CI never typechecks `webapp/` — `.github/workflows/ci.yml` runs `tsc` on
 * `desktop/` only — so nothing on a pull request reads this map's exhaustiveness. What
 * reads it is `next build` on Vercel, which typechecks with no `ignoreBuildErrors` to
 * turn that off: a bad name today is a refused DEPLOY rather than a red check, which is
 * real but is not the same as impossible. `glyphFor` below therefore resolves through a
 * fallback, because the cost of being wrong is not proportionate: this page is a single
 * `.map()`, `undefined` as a component type THROWS in render, and one throw inside it
 * blanks every row on the page. One neutral tile is the failure this page can afford.
 *
 * NOT ALL OF THEM ARE LUCIDE, which is why the value type is a plain component and not
 * `LucideIcon`. lucide dropped its brand glyphs at v1 for trademark reasons and this
 * webapp is on `^1.26.0`, so `Github` has no export to import — `components/site/icons.tsx`
 * draws that one mark on the same 24×24 grid, and the footer and the documentation rail
 * already render it. Typing this map to lucide's own component would have forced the
 * one glyph the site draws itself through a branch of its own; a `ComponentType` that
 * takes a `className` is all either kind needs, so both go in the same map.
 */
type FeatureGlyph = React.ComponentType<{ className?: string }>

const ICONS: Record<FeatureIcon, FeatureGlyph> = {
  // The eight commands, from `MagicCommandIcon`. Their rows print a `picto` instead, but
  // they are in the union and therefore in the map: a picto that went missing would
  // otherwise leave the tile with nothing at all to fall back to.
  NotebookPen,
  Rocket,
  Play,
  GitCommit,
  GitPullRequest,
  ScanSearch,
  Wrench,
  CheckCircle,
  // The five hand-written families.
  Activity,
  AppWindow,
  Bell,
  CircleGauge,
  ClipboardList,
  Columns,
  FolderGit2,
  Gauge,
  GitBranch,
  GitCommitHorizontal,
  // The site's own mark, not lucide's — see the note above.
  Github: GithubIcon,
  Languages,
  Layers,
  ListTodo,
  PanelRight,
  Pencil,
  Plug,
  RefreshCw,
  ScrollText,
  Search,
  Settings2,
  ShieldCheck,
  SquareTerminal,
  Ticket,
  UserRound,
  Users,
}

/**
 * The glyph a name with no artwork lands on — a plain rounded square, on the same 24×24
 * grid and at the same 2px round stroke as everything in `ICONS`, so a tile that falls
 * back still reads as a tile rather than as a hole in the row.
 *
 * DRAWN HERE RATHER THAN IMPORTED, and that is the whole point of it: the failure this
 * covers is an icon name that resolves to nothing, so a fallback that were itself a
 * lucide export could be the very export that is missing. This one cannot be. It is not
 * in `components/site/icons.tsx` either — that file is for glyphs the SITE draws because
 * lucide has no equivalent, and this is a piece of this map's plumbing, not a mark
 * anyone would reach for by name.
 */
function FallbackGlyph({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={24}
      height={24}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="3" y="3" width="18" height="18" rx="4" />
    </svg>
  )
}

/**
 * An icon name → the component that draws it, or the fallback.
 *
 * The `| undefined` is the honest type of an index access into a `Record` whose key is a
 * union: `noUncheckedIndexedAccess` is off, so the compiler hands back a `FeatureGlyph`
 * and simply believes the map is complete. It is complete — and it is checked, but only
 * by a Vercel build and not by CI (see the note on `ICONS`), which is exactly the gap
 * this function stands in. Annotating the local rather than reaching for a `??` on a
 * value the compiler thinks can never be nullish keeps the branch visible to the next
 * reader instead of looking like dead code.
 */
function glyphFor(icon: FeatureIcon): FeatureGlyph {
  const glyph: FeatureGlyph | undefined = ICONS[icon]
  return glyph ?? FallbackGlyph
}

/**
 * Visual NAME → the component that draws it, the same split `ICONS` uses and for the
 * same reason: `lib/features.ts` is read by the root vitest suite, which has no React to
 * resolve, so the data names a visual and the resolving happens here.
 *
 * Keyed by the `FeatureVisual` union, so a second visual named over there is a `tsc`
 * error at this map rather than a card that renders nothing. No fallback, unlike
 * `glyphFor`: a missing visual leaves a card that is copy only, which is what seven of
 * the eight are anyway — there is nothing to degrade to and nothing that breaks.
 */
const VISUALS: Record<FeatureVisual, () => React.ReactElement> = {
  agentsSidebar: AgentsSidebarMockup,
  commitsCard: CommitsCardMockup,
  contextCard: ContextCardMockup,
  macNotification: MacNotificationMockup,
  menuBar: MenuBarMockup,
  continueTask: ContinueTaskMockup,
  devServer: DevServerMockup,
  doneChecklist: DoneChecklistMockup,
  planSpec: SpecPanelMockup,
  splitView: SplitViewMockup,
  spotlightBar: SpotlightBarMockup,
  prCard: PullRequestCardMockup,
  prComments: PRCommentsMockup,
  prWatchCard: PRWatchCardMockup,
  repoCard: RepoCardMockup,
  reposSettings: ReposSettingsMockup,
  commitConfig: CommitConfigMockup,
  prConfig: PRConfigMockup,
  languagesArt: LanguagesArt,
  launchModes: LaunchModesGrid,
  resolvedThreads: ResolvedThreadsMockup,
  reviewDrawer: ReviewDrawerMockup,
  reviewThreads: ReviewThreadsMockup,
  skillsPage: SkillsPageMockup,
  startTerminal: StartTerminal,
  tasksModal: TasksModalMockup,
  ticketCard: TicketCardMockup,
  usageCard: UsageCardMockup,
}

/**
 * What a row or a card is HEADED with. Three kinds, in the order they are tested:
 *
 *   • a command → its prose name, "Plan" rather than `/magic:plan`. On this page the
 *     eight are headlines in a grid, and `/magic:` is the same six characters on all
 *     of them; the typed form belongs in the documentation, where the reader is about
 *     to run it. `commandLabel` lives in `lib/features.ts` because that module owns
 *     what a command title is — and because the root suite can pin all eight there.
 *   • one of the six product names → printed verbatim. "Jira" is "Jira".
 *   • anything else → a catalogue key, translated.
 *
 * `isCommandTitle` and `isLiteralTitle` narrow their own branches, so none of the three
 * needs a cast: the last else is `MessageKey`, which is exactly what `t()` takes.
 */
function titleOf(title: FeatureTitle, t: Translate): string {
  if (isCommandTitle(title)) return commandLabel(title)
  return isLiteralTitle(title) ? title : t(title)
}

export function FeaturesContent() {
  const { t } = useT()

  return (
    // `bg-white` on the page's own root rather than in the `(marketing)` layout: that
    // layout also wraps `/story` (on `softblue`) and the homepage (on `canvas`), so each
    // page paints its own ground. See the ink note above for why this one is white.
    <div className="bg-white">
      {/* TWO `HomeSection`s, where there used to be one. The opening is its own band so
          it can carry the homepage hero's wash — `softblue` fading down, with the blue
          `Bloom` behind the headline — without that wash running under thirty rows of
          list. `padding="hero"` because this is the page's first band: the bar is
          `fixed` and 64px tall, so the first line owes it the taller top pad. The
          component also supplies the `max-w-site` column every other page of the site
          is capped on, which is the reason not to hand-roll a wrapper here.

          THE GRADIENT ENDS ON WHITE, NOT `canvas`, and so does the bloom's own fade
          (`fadeTo="to-white"`): this page's ground is white (see the ink note above),
          and a band that fades to `canvas` over a white page leaves a blue-grey step at
          its bottom edge. Same recipe as `HeroSection`, one token changed. */}
      <HomeSection
        padding="hero"
        backdrop={<Bloom fadeTo="to-white" />}
        className="bg-gradient-to-b from-softblue to-white"
      >
        {/*
          The headline is written out instead of going through `HomeHeading`, and the
          reason is the heading LEVEL: that component emits an `h2`, because on the
          homepage every band sits under the hero's one `h1`. Here the page's own
          headline IS the `h1`, and an `h2` at the top of a document with no `h1` above
          it is an outline with a hole in it. The type comes from the same `BAND_TITLE`
          constant, so the two pages still read at one size.
        */}
        {/* Both keys come from `PAGE_CHROME` rather than being spelled out here, and
            not for tidiness: `lib/features.ts` is the one module the root vitest suite
            can import, so a key named there is a key `features.test.ts` looks up in the
            catalogue for real. Inline, these two were the page's biggest line and its
            lead sitting outside that guard — and `t()` renders a missing key as
            nothing at all. */}
        {/* CENTRED, ON THE HOMEPAGE HERO'S OWN RECIPE — `mx-auto max-w-3xl text-center`
            around the pair, the `4xl → 6xl` display face on the headline, and the lead
            at `text-lg` under it with its own `mx-auto` (a `max-w-xl` inside a centred
            column still hugs the left edge unless it is told where to sit).

            It is copied from `HeroSection` rather than routed through `BAND_TITLE`,
            which is what this used to use: `BAND_TITLE` is the type of a BAND heading —
            an `h2` at `3xl` sitting under a page's `h1` — and this line is the page's
            `h1`. The two want different sizes for the same reason they want different
            levels. `text-center` is inherited rather than restated per element.

            The GRID BELOW STAYS LEFT-ALIGNED. Centring an opening is a way of saying
            "this is the page"; centring thirty rows of prose would just make them
            harder to scan. */}
        {/* THE AIR BETWEEN THE OPENING AND THE GRID IS THE TWO BANDS' PADDING, and none
            of it is written here. `HomeSection`'s padding arrives through the `padding`
            slot precisely so a caller cannot race it — a `pt-40` appended through
            `className` against the slot's `pt-32` is a CONFLICTING utility, and which
            one lands is decided by Tailwind sorting class names rather than by anything
            written here (see `SECTION_PADDING` in `Shell.tsx`).

            The reference gives its own heading 80px above and 48px below, then starts
            the columns 80px further down. The hero band's bottom plus the next band's
            `follow` top is that rhythm on this page's scale — the same 7rem (10rem from
            `md`) the old `pb-4 md:pb-8` + `mt-24 lg:mt-32` margins came to, before the
            opening became a band of its own. */}
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
        {/* The rail's width is fixed and the content column takes the rest.
            `minmax(0,1fr)` and not `1fr`: a grid track's automatic minimum is its
            content, so a long unbroken string in a row would push the column wider than
            the page instead of wrapping inside it. Single-column below `lg`, where the
            sidebar is hidden anyway. */}
        <div className="grid gap-12 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-16">
          <FeaturesSidebar />

          <div className="flex flex-col">
            {FEATURE_FAMILIES.map((family) => (
              // `scroll-mt-24` HERE and not only on `HomeSection`: the anchor the
              // sidebar links to is this inner section, and without an offset of its
              // own the family's heading lands underneath the `fixed h-16` bar.
              //
              // SPACE BETWEEN FAMILIES, AND NOTHING ELSE. There was a `border-t` here —
              // the reference page's own device, on the argument that on a white ground
              // with one ink, whitespace alone does not say where a section ends. That
              // was true of the page as it was then: five plain lists of rows, one after
              // another. It is not true now. The skills family is a grid of coloured
              // cards with five captions through it, and the four below it open on a
              // heading twice the size the rule was drawn against — so the rule had
              // stopped doing work and started reading as a scar across the page.
              //
              // `pt-20` rather than the `pt-16` that sat under it: without a line to
              // mark the boundary, the space has to be unambiguous on its own, and 64px
              // between a section's last row and the next section's heading is not.
              <section
                key={family.id}
                id={family.anchor}
                className="scroll-mt-24 pt-20 first:pt-0"
              >
                {/* THE SECTION HEADING, and it sits above the group captions inside it —
                    `3xl/4xl` here against their `xl/2xl`. That order is the point: a
                    caption introduces a pair of cards, this heads the whole section, and
                    the louder of the two should be the one with more under it. Under the
                    page's own `4xl/6xl` `h1`, so the outline reads top to bottom. */}
                <h2 className="font-display text-3xl font-black leading-tight text-ink md:text-4xl">
                  {t(family.title)}
                </h2>
                <p className="mt-4 max-w-2xl text-base leading-relaxed text-ink/60 md:text-lg">
                  {t(family.intro)}
                </p>

                {family.layout === 'cards' ? (
                  /* THE CARD GRID. TWO COLUMNS, and it stays two all the way up
                     rather than widening to four, because the composition is pairs: the
                     six middle commands are three pairs that belong side by side, and a
                     four-column row would break every one of them across the grid.

                     A `span: 'full'` card then takes both columns — `plan` opening the
                     loop, `done` closing it — which is what gives the grid its rhythm:
                     one wide, three pairs, one wide.

                     Single column below `sm`, where two cards of this weight would each
                     be ~160px and the copy would set in four-word lines. Everything
                     stacks in reading order, so the pairing is lost but nothing else is.

                     `items-stretch` is implicit in a grid, which is what makes a pair
                     two equal cards rather than two boxes of different heights — the
                     copy varies by a line or two between commands. */
                  <div className="mt-10 grid gap-4 sm:grid-cols-2">
                    {family.features.map((feature, index) => (
                      <Fragment key={feature.id}>
                        {/* THE GROUP CAPTION, when this card opens one. Full-width type
                            between the rows — `sm:col-span-2` so it takes a row of its
                            own rather than a cell, which is what makes it read as a
                            heading over the pair below instead of a card beside them.

                            `pt-10`, and `first:pt-0` because the opening caption
                            already has the page's own lead above it: a tenth of a screen
                            of nothing between a lead and the line under it reads as a
                            missing section.

                            THIS WAS 80px FOR A WHILE, on the argument that the captions
                            are the only thing separating five groups and 40 left the
                            grid reading as a single run of eight. Judged on the built
                            page rather than in the abstract, that was wrong twice over:
                            80px pushed the five groups so far apart that the section
                            stopped reading as one set of skills, and the caption itself
                            drifted away from the pair it introduces. 40 is the number
                            that keeps both.

                            `font-medium` — 500 — on the display face, and NOT the
                            `font-black` it started as: at a full row's width a 900
                            weight is a second page headline, and the page already has
                            one. Size does the structural work here; the weight only has
                            to keep these from reading as body copy.

                            `text-xl md:text-2xl`, which is BELOW a family heading rather
                            than above it. That inversion is deliberate now: a caption
                            introduces a pair, a family heading heads the whole section,
                            and the louder of the two should be the one with more under
                            it.

                            `pb-4` on top of the grid's own `gap-4`, so a caption sits
                            32px above its cards and 56px below the pair before it.
                            Asymmetric on purpose, and the asymmetry is the whole device
                            — a line equidistant from what it follows and what it
                            introduces belongs to neither, and this one belongs to what
                            comes after it. Left-aligned, so it reads as a heading over
                            the pair rather than a floating label between two rows. */}
                        {feature.caption ? (
                          <p className="pb-4 pt-10 text-left font-display text-xl font-medium leading-tight text-ink first:pt-0 sm:col-span-2 md:text-2xl">
                            {t(feature.caption)}
                          </p>
                        ) : null}
                      <ToneCard
                        // Cycled by POSITION unless the row asks for a ground by name.
                        // A tone is normally a surface in a family, not a skill's
                        // identity — see the note on `TONES` in the Tailwind config — so
                        // a ninth command costs no new colour and the grid keeps its
                        // rhythm. `done` is the one that asks: green is how this product
                        // says "finished", and that should survive a reorder of the
                        // eight, which a positional tone would not.
                        tone={feature.tone ?? CARD_TONE_CYCLE[index % CARD_TONE_CYCLE.length]}
                        title={titleOf(feature.title, t)}
                        description={t(feature.description)}
                        // DERIVED, not a fourth field on the data. A card puts its
                        // visual beside its copy when it is wide enough to hold both —
                        // which is exactly "full width AND carrying a visual". That is a
                        // rendering rule rather than a fact about the command, so it
                        // belongs here; `span` and `visual` are the facts, and this
                        // reads them.
                        layout={feature.span === 'full' && feature.visual ? 'beside' : 'stacked'}
                        // `sm:col-span-2` and not `col-span-2`: below `sm` the grid is
                        // a single column, where spanning two tracks that do not exist
                        // is at best a no-op and at worst an overflow. The flex
                        // direction used to be here too and has moved into `ToneCard` —
                        // an arrangement is not additive layout.
                        className={feature.span === 'full' ? 'sm:col-span-2' : undefined}
                      >
                        {/* THE VISUAL, IF THE CARD HAS ONE — and most do not. `ToneCard`
                            leaves `children` unpadded on purpose, so what goes here
                            decides its own inset: a picto wants one on all four sides, a
                            cropped window wants none on two of them.

                            All eight carry one now — six drawing a surface the product
                            has, two drawing an outcome instead. See the note in
                            `lib/features.ts` for which and why. The eight
                            `skill-*.png` pictos used to sit here and are gone — same
                            file. */}
                        {(() => {
                          if (!feature.visual) return null
                          const Visual = VISUALS[feature.visual]
                          return <Visual />
                        })()}
                      </ToneCard>
                      </Fragment>
                    ))}
                  </div>
                ) : family.layout === 'showcase' ? (
                  /* THE SHOWCASE COLUMN — one white card per integration, copy on the
                     left and the product's mark on a plate of its own colour on the
                     right. `ShowcaseCard` and `LogoPlate` are both design-system
                     components: the arrangement and the plate recipe live in `ui.tsx`
                     beside `Card` and `ToneCard`, and this file only says which row gets
                     which ground.

                     ONE COLUMN AT EVERY WIDTH, unlike the skill grid. A showcase card is
                     a row of two halves that already fills the measure — putting two
                     side by side would halve each one and turn both halves into columns
                     too narrow for either. `gap-5` rather than the rows list's `gap-7`,
                     because these carry their own border and shadow: two surfaces need
                     less air between them than two bare paragraphs do. */
                  <div className="mt-10 flex flex-col gap-5">
                    {family.features.map((feature) => (
                      <ShowcaseCard
                        key={feature.id}
                        title={titleOf(feature.title, t)}
                        description={t(feature.description)}
                        art={
                          /* BOTH OR NEITHER. A plate with no mark is an empty coloured
                             box and a mark with no plate has nothing to sit on, so the
                             panel is drawn only when the row declares the pair — which
                             `features.test.ts` also pins, so this is the fallback rather
                             than the rule. */
                          feature.plate && feature.picto ? (
                            <LogoPlate
                              ground={feature.plate}
                              src={feature.picto}
                              fit={feature.plateFit}
                              className="h-full"
                            />
                          ) : undefined
                        }
                      />
                    ))}
                  </div>
                ) : (
                <div className="mt-8 flex flex-col gap-7">
                  {family.features.map((feature) => {
                    // Through `glyphFor`, never a bare `ICONS[...]`: the map is
                    // exhaustive by TYPE and this repo does not typecheck `webapp/` in
                    // CI, so a name with no row would be `undefined` here — and
                    // `undefined` as a component type throws, which in a page that is
                    // one `.map()` means the whole inventory goes blank rather than one
                    // tile going neutral.
                    const Icon = glyphFor(feature.icon)
                    const label = titleOf(feature.title, t)

                    // A ROW WITH A DRAWING IS NOT A ROW. Everything else in a `rows`
                    // family is a glyph, a title and a line — the shape an inventory of
                    // thirty entries wants. A row that names a visual gets the opposite
                    // treatment: a heading, a paragraph and the screen under it, full
                    // width, with NO glyph. The tile is what makes the compact rows
                    // scannable as a list, and beside a 24px headline it would read as a
                    // bullet point on a section.
                    //
                    // Written as a branch on the DATA rather than as a second family
                    // layout, so a row promotes itself the day it is given a picture and
                    // the six beside it are untouched.
                    // OR A ROW THAT ASKS FOR THE BLOCK SHAPE WITHOUT A DRAWING — see
                    // `FeatureShape`: the heading and the paragraph, and nothing under
                    // them. `Visual` is then `undefined`, and the two branches below that
                    // need one cannot be reached, since a shape other than `block` on a
                    // row with no visual has nothing to put in a card.
                    if (feature.visual || feature.shape === 'block') {
                      const Visual = feature.visual ? VISUALS[feature.visual] : undefined

                      // THE QUIETER OF THE TWO SHAPES, and it is the design system's
                      // `ShowcaseCard` rather than anything this page owns — the same
                      // card the integrations family is built from. Reusing it is the
                      // point: a row whose drawing illustrates a sentence is exactly the
                      // shape that component exists for, and a second arrangement that
                      // looked almost like it would be a second thing to keep in step.
                      //
                      // `art` is a SLOT, so what goes in it is any panel — a logo on its
                      // ground over in `integrations`, a search bar or a notification
                      // here. That is why this branch needs no new component at all.
                      // THE CARD SHAPE — a skill card in a rows family. The same
                      // `ToneCard` the workflow grid is built from, `beside` because a
                      // row is full width and a stacked card would set its one sentence
                      // across it. Nothing new to keep in step.
                      if (feature.shape === 'card' && Visual) {
                        return (
                          <ToneCard
                            key={feature.id}
                            tone={feature.tone ?? 'mist'}
                            layout="beside"
                            title={label}
                            description={t(feature.description)}
                          >
                            <Visual />
                          </ToneCard>
                        )
                      }

                      if (feature.shape === 'showcase' && Visual) {
                        return (
                          <ShowcaseCard
                            key={feature.id}
                            title={label}
                            description={t(feature.description)}
                            art={<Visual />}
                          />
                        )
                      }

                      return (
                        // `pb-5` on top of the list's `gap-7`: a drawing needs more
                        // air under it than a paragraph does, and putting it here rather
                        // than widening the gap leaves the six compact rows at the
                        // spacing an inventory wants.
                        <div key={feature.id} className="flex flex-col pb-5">
                          <h3 className="font-display text-2xl font-bold leading-tight text-ink">
                            {label}
                          </h3>
                          {/* `max-w-3xl`, so a full-width section still sets its copy at
                              a readable measure. The drawing below takes the width; the
                              sentence does not want it. */}
                          <p className="mt-3 max-w-3xl text-base leading-relaxed text-ink/60">
                            {t(feature.description)}
                          </p>
                          {Visual ? (
                            <div className="mt-8">
                              <Visual />
                            </div>
                          ) : null}
                        </div>
                      )
                    }

                    return (
                      <div key={feature.id} className="flex gap-4">
                        {/* TWO DIFFERENT THINGS, AND THEY GET DIFFERENT TREATMENT.
                            This used to be one plate with either shape dropped inside
                            it, which meant real artwork — a skill picto, a product's
                            logo — was inset in a 40px box at 20px with a tinted square
                            around it. Artwork that has its own colour and its own shape
                            does not want a plate: it wants the box.

                            So a `picto` FILLS the 40px slot, and only a lucide glyph
                            keeps the tile. Same footprint either way, so the rows still
                            line up down the column.

                            A bare `<img>` because `next/image` is used nowhere in this
                            webapp — see `SiteFooter`'s logo. `object-contain` so a mark
                            that is not square keeps its ratio inside the slot rather
                            than being stretched to it. `alt=""` is what hides it from a
                            screen reader — the heading beside it names the row, and an
                            `aria-hidden` on top of an empty `alt` would be the same
                            instruction twice. */}
                        {feature.picto ? (
                          <img
                            src={feature.picto}
                            alt=""
                            className="h-10 w-10 shrink-0 object-contain"
                          />
                        ) : (
                          /* `accent`, not `brand`. The token table reserves `brand` for
                             the primary CTA fill and the `Eyebrow`'s type, and gives
                             every tint — an icon plate among them — to `accent`. This
                             tile is decoration; there is nothing to press.

                             `aria-hidden` on the tile rather than on the glyph inside
                             it, so the boundary around the decoration is one element
                             and `ICONS` only ever has to hand back something that takes
                             a `className` — which is what lets the site's own GitHub
                             mark sit in that map beside lucide's components. */
                          <span
                            aria-hidden
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-button bg-accent/10"
                          >
                            <Icon className="h-4 w-4 text-accent" />
                          </span>
                        )}

                        {/* `min-w-0` is the half that is easy to forget: a flex item's
                            automatic minimum size is its content, so without it a long
                            word in the paragraph refuses to wrap and widens the row. */}
                        <div className="min-w-0">
                          {/* ONE TYPEFACE, because there is now only one kind of
                              title. This used to branch: a command was printed as
                              typed and took the monospace the site uses for one, and
                              everything else took the display face. `titleOf` now
                              gives a command its prose name ("Plan"), so the branch
                              was choosing a monospace for a word that is not code —
                              and it survived only because the eight commands moved to
                              the card grid and stopped reaching this renderer at all.
                              A dead branch that would have been wrong if it ran. */}
                          <h3 className="font-display text-base font-bold text-ink">
                            {label}
                          </h3>
                          <p className="mt-1.5 text-sm leading-relaxed text-ink/60">
                            {t(feature.description)}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
                )}

                {/* THE FAMILY'S CLOSING NOTE, when it has one. `Card` from the design
                    system rather than a hand-rolled box, because that is what a surface
                    carrying prose on this site looks like, and this is the one place on
                    the page that is neither a coloured card nor a row.

                    FLAT, THROUGH THE `shadow` SLOT rather than a `className`: shadows do
                    not compose, so a rival class would have raced `shadow-card` on
                    ordering, and the slot SUBSTITUTES instead. It is flat because this
                    note is an aside under a grid of coloured cards — lifting it off the
                    page argues it is the more important of the two, which is exactly
                    backwards.

                    `accent` on the icon and NOT `brand`: the token table reserves
                    `brand` for the primary CTA fill and the `Eyebrow`'s type, and gives
                    every other blue — an information mark among them — to `accent`.
                    There is nothing to press here. */}
                {family.note ? (
                  <Card shadow="shadow-none" className="mt-10 flex items-start gap-3 p-5">
                    <Info className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                    <p className="text-sm leading-relaxed text-ink/70">{t(family.note)}</p>
                  </Card>
                ) : null}
              </section>
            ))}
          </div>
        </div>
      </HomeSection>
    </div>
  )
}
