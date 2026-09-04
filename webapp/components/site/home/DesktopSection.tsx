'use client'

import { Columns, Plug, ScrollText, Sparkles } from 'lucide-react'
import type { MessageKey } from '@/lib/i18n'
import { useT } from '@/lib/i18n/useLanguage'
import { Reveal } from '../Reveal'
import { AppWindowMockup } from './AppWindowMockup'
import { BAND_TITLE, HomeSection } from './Shell'

/**
 * The band directly under the hero: a headline, two lines of type, the desktop app's own
 * window — drawn faithfully, lit from behind, and WHOLE — then a row of four highlights
 * under it.
 *
 * WHY IT IS HERE AT ALL. The page above it names a promise ("from idea to merged PR"),
 * says what the product is in two cards, and walks the five steps of the loop — all of it
 * in type and diagrams, and none of it the thing itself. This band does one job: put the
 * PRODUCT on the page. See `AppWindowMockup.tsx` for what is inside the window and which
 * file each band of it was read out of; this file is only the composition around it.
 *
 * IT WAS THE THIRD BAND AND IS NOW THE FOURTH. `WorkflowSection` shipped below it and the
 * product owner moved it above, so the window is no longer the first thing a reader meets
 * after the hero's promise — it is what they reach having been told what the product is and
 * what a day with it looks like. That is a better place for it and it cost this file
 * nothing but this paragraph: the composition below never depended on what preceded it.
 * `app/(marketing)/page.tsx` holds the order and the argument for all three middle bands.
 *
 * ── THE COMPOSITION ───────────────────────────────────────────────────────────────
 *
 * CENTRED, top to bottom: headline, a two-line subtitle narrower than it, then the window
 * wide underneath. The reference is CleanShot's own product page, which the product owner
 * brought as the target, and every part of that stack is deliberate:
 *
 *   • THE HEADING IS WRITTEN OUT rather than reaching for `HomeHeading`. That component is
 *     `max-w-2xl` and LEFT-aligned, which is right for a band whose content sits beside it
 *     and wrong for one whose whole point is a centred axis — passing `text-center` into it
 *     would be the caller dressing a component, which is exactly the conflict
 *     `components/ui.tsx`'s header warns about. `/features` writes its headline out for the
 *     same reason and documents it; this follows. What IS shared is the type:
 *     `BAND_TITLE.onLight` is the one place the page's headline size lives.
 *
 *   • THE SUBTITLE IS TWO LINES, on `max-w-2xl` at `text-lg leading-relaxed`. Two is a
 *     length rather than a break: there is no `<br>` in the copy, because a hard break at
 *     this width becomes four lines on a phone. `max-w-2xl` inside a centred column still
 *     needs `mx-auto` — a max-width narrower than its parent has to be told where to sit,
 *     the same note the hero's own subtitle carries. The French runs a little longer than
 *     the English, as it does in the hero, and is allowed to.
 *
 *   • THE WINDOW IS WHOLE — all 1280×800 of it, its bottom edge and its four corners
 *     included. IT WAS CROPPED, and the argument for the crop was a real one: a window
 *     seen partly reads as a thing photographed, where one drawn to fit its frame reads
 *     as a diagram. The product owner overruled it — "tu n'es pas obligé de couper
 *     l'application en bas ! j'aimerai la voir en entier" — and the second reference
 *     screenshot they brought shows the same CleanShot block with its window complete, so
 *     the aesthetic argument was not even the reference's. Nothing here crops any more:
 *     the frame is exactly the size of the scaled window, and `AppWindowMockup` rounds
 *     all four corners instead of two.
 *
 *   • FOUR HIGHLIGHTS CLOSE THE BAND, from the same reference: a row of icon tiles with a
 *     short bold label under each, hairline rules BETWEEN the columns and none around
 *     them. See `Highlights` below for what each of the four claims and where the wording
 *     comes from.
 *
 * ── THE SCALE, AND WHY THE WRAPPER IS STILL SIZED ─────────────────────────────────
 *
 * The window is drawn at 1280×800 — the app's own pixels, every padding and type step the
 * source's number — and then sized for the page with a UNIFORM `scale`. That is
 * `features/AgentsSidebarMockup.tsx`'s technique and the reason this is a reproduction:
 * proportions survive a transform exactly, so nothing inside had to be nudged to fit.
 *
 * A TRANSFORM DOES NOT CHANGE THE BOX IT CAME FROM, which is why the wrapper still
 * carries explicit pixels now that there is nothing to crop: the scaled window still
 * occupies 1280×800 of LAYOUT, and left in flow it would leak 800px of nothing below the
 * drawing and widen the document by 180px, in silence. So the mechanic is unchanged and
 * only the numbers moved — the frame is `FRAME_SIZE`, the size the window actually
 * renders at, with the drawing `absolute` inside it and pinned `origin-top-left` so the
 * two coincide exactly. No `overflow-hidden`: there is nothing outside the frame to clip,
 * and clipping would cut the `shadow-lift` the window casts.
 *
 * ONE ANCHORING NOW, AND IT IS CENTRED AT EVERY WIDTH. The left-anchored, right-cropped
 * variant below `lg` existed only to keep the type readable while the crop hid the rest;
 * with the whole window on the page there is nothing to anchor to but the middle, so the
 * frame is `mx-auto` and the scale simply follows the column. THE TYPE GETS SMALL ON A
 * PHONE and there is no way round it — at 375px the window is 256px wide, so the
 * sidebar's 12px rows render at 2.4px. That is the cost of the owner's call, and the
 * alternative (cropping) is the thing they asked us to stop doing.
 *
 * ── THE AURA ──────────────────────────────────────────────────────────────────────
 *
 * `Aura` below, and it is BLURRED BLOBS OF DECLARED TOKENS rather than a shadow. That is
 * not a stylistic preference: `lib/designTokens.test.ts` fails the build on any shadow
 * written as an arbitrary value, and the diffuse multi-colour glow this band is built
 * around has no rung of the four-step elevation scale that could express it. (That rule
 * scans this file as TEXT, comments included, so the offending class cannot even be
 * spelled here to say it is unwanted — the same note `FinalCtaSection.tsx` carries.)
 * `Bloom` in `HeroSection.tsx` and `Wash` in `FinalCtaSection.tsx` both solve it the same
 * way and are the house precedent. The window's own contact shadow is `shadow-lift`, a
 * real rung, applied in `AppWindowMockup`.
 *
 * THE DEFAULT `band` PADDING, and it used to be `follow`. That rung is for the band
 * DIRECTLY under the hero, whose bottom is already a band's bottom — and this band is no
 * longer that one: `PillarsSection` was inserted above it and took the rung with it, and
 * `WorkflowSection` now sits between the two as well. A band in the middle of a stack owes
 * the full gap on both sides.
 * Nothing is passed through `className` — `HomeSection`'s is documented as additive and
 * never a padding or a width, and this band needs neither.
 */
/**
 * THE LADDER: how big the window is drawn at each width, as two lists of literal classes.
 *
 * ONE RULE PRODUCES THE WHOLE TABLE. `HomeSection` is `px-6`, so the column is the
 * viewport less 48px (capped at `max-w-site`, 1100). Each rung is the largest 0.05 step of
 * the app's own 1280 that fits, and its breakpoint is that width plus the 48px of gutters
 * plus 32 more — a classic desktop scrollbar is up to ~17px of the viewport that `100vw`
 * counts and the layout does not, and a rung that changed a hair too early would put the
 * window's right edge under `HomeSection`'s `overflow-hidden`:
 *
 *     scale   window      breakpoint
 *     0.20    256 × 160   —          (down to a 304px viewport)
 *     0.25    320 × 200   400
 *     0.35    448 × 280   528
 *     0.45    576 × 360   656
 *     0.55    704 × 440   784
 *     0.65    832 × 520   912
 *     0.75    960 × 600   1040
 *     0.85   1088 × 680   1168       (and 1088 ≤ 1100, so it fits `max-w-site` too)
 *
 * EVERY RUNG IS A `min-[…]` VARIANT AND NOT `sm:` / `md:` / `lg:`, which is the one thing
 * here worth defending. The breakpoints above are derived from the DRAWING's width, and
 * not one of them is a Tailwind screen — `sm` would change the scale at 640 where 656 is
 * the width that fits. Keeping them all in one variant family also keeps them sorted
 * among themselves by width, which is what makes the last matching rung win.
 *
 * Both lists are written out as literal strings because Tailwind reads SOURCE: a scale
 * assembled from a number at runtime is a class that was never generated.
 */
const FRAME_SIZE = [
  'h-[160px] w-[256px]',
  'min-[400px]:h-[200px] min-[400px]:w-[320px]',
  'min-[528px]:h-[280px] min-[528px]:w-[448px]',
  'min-[656px]:h-[360px] min-[656px]:w-[576px]',
  'min-[784px]:h-[440px] min-[784px]:w-[704px]',
  'min-[912px]:h-[520px] min-[912px]:w-[832px]',
  'min-[1040px]:h-[600px] min-[1040px]:w-[960px]',
  'min-[1168px]:h-[680px] min-[1168px]:w-[1088px]',
].join(' ')

const WINDOW_SCALE = [
  'scale-[0.2]',
  'min-[400px]:scale-[0.25]',
  'min-[528px]:scale-[0.35]',
  'min-[656px]:scale-[0.45]',
  'min-[784px]:scale-[0.55]',
  'min-[912px]:scale-[0.65]',
  'min-[1040px]:scale-[0.75]',
  'min-[1168px]:scale-[0.85]',
].join(' ')

/**
 * THE FOUR HIGHLIGHTS, and each one is a fact about the product rather than a line of
 * marketing — which is the whole test a row like this has to pass, because four short
 * bold phrases under a screenshot are read as claims.
 *
 *   1. TWELVE AGENTS IN PARALLEL is the site's own number, not a new one:
 *      `site.features.desktopDesc` already says "up to twelve agents at once, each in its
 *      own worktree". `Columns` is the glyph `lib/features.ts` gives `splitView` — agents
 *      side by side in one window, which is exactly what the drawing above shows.
 *   2. ALL YOUR CONTEXT, SAVED, and this one is about the PERSON rather than the
 *      machine. It read "one worktree per task" first, which is true — the skills do run
 *      `git worktree add ../${REPO_NAME}-$TICKET_ID` (`skills/magic-start/SKILL.md:404`)
 *      — but a worktree is plumbing, and stating it here spent one of four slots telling
 *      the reader how the trick is done instead of what they get. What they get is that
 *      the ticket, the branch, the description, the session and its cost are held per
 *      agent, so dropping a task and coming back to it costs nothing: the window
 *      remembers, and the reader does not have to. That is the claim the hero's own
 *      subtitle makes ("vous gardez la tête libre"), and this is where the app backs it.
 *      `ScrollText` for the record that is kept — `features.ts` gives it to the rows
 *      about written history, and it is the union's nearest thing to a saved transcript.
 *   3. JIRA AND GITHUB CONNECTED — the two trackers every skill reads and writes. `Plug`
 *      is `features.ts`'s glyph for what the app plugs itself into (`machineSetup`).
 *   4. THE EIGHT /MAGIC: COMMANDS, which is the count `lib/features.ts` holds in
 *      `MAGIC_COMMANDS` and the number the whole site is built on. `Sparkles` is the
 *      APP's own glyph for them — Sidebar.tsx:295 heads its Skills action with it, and the
 *      window above draws that row.
 *
 * GLYPHS BORROWED, NOT INVENTED, for the reason `features.ts`'s icon union gives: this
 * site has a small icon vocabulary and a fifth idea drawn with a fifth family of marks
 * reads as a different site. All four are already in that union.
 */
const HIGHLIGHTS: readonly { id: string; icon: typeof Columns; label: MessageKey }[] = [
  { id: 'parallel', icon: Columns, label: 'site.desktop.highlightParallel' },
  { id: 'context', icon: ScrollText, label: 'site.desktop.highlightContext' },
  { id: 'trackers', icon: Plug, label: 'site.desktop.highlightTrackers' },
  { id: 'commands', icon: Sparkles, label: 'site.desktop.highlightCommands' },
]

export function DesktopSection() {
  const { t } = useT()

  return (
    <HomeSection backdrop={<Aura />}>
      <div className="mx-auto max-w-3xl text-center">
        <Reveal order={1}>
          <h2 className={BAND_TITLE.onLight}>{t('site.desktop.title')}</h2>
        </Reveal>
        <Reveal order={2}>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted">
            {t('site.desktop.subtitle')}
          </p>
        </Reveal>
      </div>

      <Reveal order={3} className="mt-12 sm:mt-16">
        {/* THE FRAME, and it no longer crops anything: it is exactly the size the window
            renders at, so the only thing it still does is hold the layout box the
            transform does not shrink. `mx-auto` centres it; `origin-top-left` on the
            drawing inside makes the scaled pixels start at the frame's own corner, so the
            two boxes coincide and nothing leaks in any direction. See `FRAME_SIZE`. */}
        <div className={`relative mx-auto ${FRAME_SIZE}`}>
          <div className={`absolute left-0 top-0 origin-top-left ${WINDOW_SCALE}`}>
            <AppWindowMockup />
          </div>
        </div>
      </Reveal>

      {/* GENEROUS AIR ABOVE THE ROW, which the reference has and which this band needs
          more than the reference does: the window now ENDS above it, so the gap is what
          separates the app's own bottom edge from a row of the site's own type. Under the
          crop there was no bottom edge for anything to sit under. */}
      <Reveal order={4} className="mt-16 sm:mt-20">
        <Highlights />
      </Reveal>
    </HomeSection>
  )
}

/**
 * The row that closes the band: four icon tiles, a short bold label under each, and
 * hairline rules BETWEEN the columns.
 *
 * RULES BETWEEN AND NOT AROUND, which is the reference's own detail and the reason this
 * is a grid of `border-l` rather than a bordered box: a frame around four claims reads as
 * a table of specifications, four columns divided by a filet read as one row of things
 * that belong together. `border-hairline` is the site's one filet weight — the note on it
 * in `tailwind.config.ts` is explicit that there is exactly one.
 *
 * THE RULE IS ON THE LEFT OF EVERY COLUMN THAT IS NOT FIRST IN ITS ROW, which is what
 * keeps a dangling filet off the end when the row wraps. Two columns on a phone and four
 * from `md`, so the third cell STARTS a row below `md` and must have no rule there, then
 * gains one at `md` where it is mid-row: that is the one index needing a variant, and it
 * is why the border side is computed per index rather than written once. Grid cells
 * stretch to their row's height, so each rule runs the full height of the row — as it
 * does on the reference — without anything being told how tall it is.
 *
 * `LegendTile` IS NOT REUSED, and deliberately. It is this repo's icon-tile recipe with
 * several call sites (`features/FeatureLegend.tsx`), but it is a 32px tile whose GROUND is
 * the caller's `tone` — a state tint behind a coloured glyph, which is what a legend
 * annotating a drawing needs. This row's tiles are the reference's: ~48px, a white face
 * on a hairline with the quietest rung of the elevation scale under it, and the glyph in
 * the brand blue. Passing that through `tone` would mean also overriding `h-8 w-8` from
 * the call site — the caller dressing a component, which is the exact conflict
 * `components/ui.tsx`'s header warns about, and it would leave both call sites wrong to
 * read. So the tile is written out here, once, and this paragraph is the reason.
 *
 * `shadow-card`, the quietest declared rung, because that is what "a whisper" is: the
 * tiles sit on the page's own blue canvas, and anything more reads as four buttons.
 */
function Highlights() {
  const { t } = useT()

  return (
    <ul className="mx-auto grid max-w-5xl grid-cols-2 md:grid-cols-4">
      {HIGHLIGHTS.map(({ id, icon: Icon, label }, index) => (
        <li
          key={id}
          className={`flex flex-col items-center px-4 py-6 text-center ${
            // First in its row at every width: never a rule.
            index === 0
              ? ''
              : // Starts the second row at two columns, sits mid-row at four.
                index === 2
                ? 'border-hairline md:border-l'
                : 'border-l border-hairline'
          }`}
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-hairline bg-white shadow-card">
            <Icon className="h-5 w-5 text-brand" />
          </span>
          {/* `max-w-[9rem]` is what makes the label set on two lines rather than one long
              one, which is the shape the reference has and the reason the wording is kept
              to about four words. `font-display` and `font-bold`: Cera Pro has a real Bold
              at 700, and this is the row's only type. */}
          <span className="mt-4 max-w-[9rem] font-display text-sm font-bold leading-snug text-ink">
            {t(label)}
          </span>
        </li>
      ))}
    </ul>
  )
}

/**
 * The glow behind the window: pink, violet and amber bleeding outward and fading to
 * nothing. The product owner's word for it on the reference page was "le dégradé
 * box-shadow qui est trop stylé", and it is the signature of the whole composition.
 *
 * FOUR BLURRED DISCS AND NOT A SHADOW, for the reason the header above gives. `blur-3xl`
 * on each, which is 64px — the same reach `Bloom` and `Wash` use, and what turns a disc
 * into a field rather than a shape you can see the edge of.
 *
 * THE COLOURS ARE DECLARED TOKENS, and two of them are doing a job their name does not
 * quite say. There is no `pink` in this palette and inventing one for a single band is the
 * unfindable value the config exists to prevent, so the pink is `red` at 25%: at that
 * alpha, blurred, over the blue `canvas`, #ef4444 reads as rose rather than as red —
 * which is the call `FinalCtaSection`'s `Wash` already makes with `bg-red/20`, one step down.
 * The amber is `orange` (#f97316), declared for the app's context gauge. `purple` carries
 * the violet, and `accent` sits under the middle of the window to tie the whole thing to
 * the page's own blue rather than letting it float off into a sunset.
 *
 * POSITIONED IN THE LOWER TWO-THIRDS of the band, so the glow belongs to the window and
 * not to the headline: type over a colour field loses the contrast that makes it a
 * headline. The column above is `relative`, so the words are never inside the blur.
 *
 * THE BOTTOM FADE is the one non-disc layer. This band's ground is `canvas` and the band
 * BELOW it is the closing dark sheet, so the aura has to be gone by the time the two meet
 * — otherwise a violet haze runs under the seam and reads as a rendering fault rather
 * than as light.
 *
 * `aria-hidden` and `pointer-events-none`, as `HomeSection`'s `backdrop` slot requires:
 * it is decoration, and there is nothing in it to announce.
 */
function Aura() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {/* The violet core, widest and centred on the window's own axis. */}
      <div className="absolute left-1/2 top-1/4 h-2/3 w-[80%] -translate-x-1/2 rounded-full bg-purple/30 blur-3xl" />
      {/* The pink and the amber, thrown out to either side so the field has a hue
          gradient across it rather than one colour at two strengths. */}
      <div className="absolute -left-[10%] top-1/3 h-1/2 w-3/5 rounded-full bg-red/25 blur-3xl" />
      <div className="absolute -right-[10%] top-1/3 h-1/2 w-3/5 rounded-full bg-orange/25 blur-3xl" />
      {/* The page's own blue, under the middle of the window. */}
      <div className="absolute left-1/2 top-[45%] h-1/2 w-2/5 -translate-x-1/2 rounded-full bg-accent/25 blur-3xl" />
      {/* Gone before the band ends. */}
      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-b from-transparent to-canvas" />
    </div>
  )
}
