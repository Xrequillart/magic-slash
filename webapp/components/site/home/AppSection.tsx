'use client'

import { Fragment } from 'react'
import { ArrowRight, BotMessageSquare, ListTodo, Route } from 'lucide-react'
import { ButtonNavLink, FeaturePoints, SplitFeature } from '@/components/ui'
import { useT } from '@/lib/i18n/useLanguage'
import { DESKTOP_PATH } from '@/lib/siteNav'
import { GithubMark } from '../features/TasksModalMockup'
import { JiraMark } from '../features/TicketCardMockup'
import { Reveal } from '../Reveal'
import { AppWindowMockup } from './AppWindowMockup'
import { HomeHeading, HomeSection } from './Shell'

/**
 * The band where the app used to be shown at length: a heading, a paragraph, a button —
 * and the app's own window beside them, on the right.
 *
 * WHAT IT REPLACED. `DesktopSection` stood here: the same window at up to 0.85 scale,
 * centred under a headline, with four highlights closing the band. That composition is
 * now the whole of `/desktop` (`components/site/desktop/DesktopContent.tsx`) and this
 * band is what the homepage says about it instead. The product owner asked for the move
 * and for this shape — "un block titre + description et une illustration sur la droite".
 *
 * WHICH IS A BETTER DIVISION THAN IT LOOKS. That band was ~1,100px of vertical page
 * spent on one drawing, in the middle of a stack whose other bands each make ONE claim
 * and move on. Here the claim is made in a paragraph, the window is evidence beside it
 * rather than the subject, and the reader who wants the subject gets a button to a page
 * that is entirely about it.
 *
 * `SplitFeature` WITH `media="right"`, and the side is not only what was asked for.
 * `SkillsSection` directly above is `media="left"`; that component's own note is that a
 * page putting every picture on the same side reads as a template, so two adjacent
 * splits have to alternate. What was requested and what the arrangement needs are the
 * same thing here, which is worth recording precisely because it looks like a
 * coincidence.
 *
 * NO BACKDROP, AND A PLATE INSTEAD. The band it replaces carried `Aura` — four blurred
 * discs of pink, violet and amber behind the window — and the aura went to `/desktop`
 * with the window it was lighting. It is a signature for a composition that IS the
 * drawing; behind a half-width drawing in a stack of plain bands it would be the only lit
 * band on the homepage, which reads as an accident rather than as a signature.
 *
 * What the drawing sits on here is a `tone-sky` PLATE that crops it — the product owner
 * asked for the design system's own sky ground and for the app zoomed and cut off at the
 * bottom and the right. See `PLATE` below for why those two requests are one mechanism.
 *
 * THE COPY IS NEW — `site.appBand.*`, written for this band. `site.desktop.*` moved with
 * the composition it names, and the two say different things on purpose: that family
 * heads a page about the app ("Magic Slash", then what the window is), this one makes a
 * claim on a landing page and points at that page.
 */

/**
 * THE PLATE THE WINDOW SITS ON, AND THE CROP IS THE PLATE.
 *
 * `bg-tone-sky` — the design system's own second ground, the one the colour cards deal
 * as `sky` and the one five drawings on `/features` already use. Asked for by name, and
 * it is the right one twice over: the window is nearly black, so it needs a PALE plate to
 * be seen against, and `sky` is the blue family's light rung. `tone-indigo` under a dark
 * window is two dark things stacked.
 *
 * A FIXED HEIGHT AND A LEFT-AND-TOP INSET, WHICH IS ALL THIS IS. The window runs off the
 * plate's bottom and right, so the only ground that shows is the two strips it is inset
 * from — and that asymmetry is what makes the drawing read as a window somebody is
 * looking at up close rather than as a picture of a window. `AgentsSidebarMockup` on
 * `/features` is the same construction on the same ground, and its note is the longer
 * version of this one.
 *
 * THE HEIGHT IS ALSO WHAT MAKES THE ZOOM POSSIBLE AT ALL: a transform does not change
 * the box it came from, so the magnified window would leave this container the height of
 * its unscaled self — 800px of it — and overflow in silence. `overflow-hidden` then does
 * the cropping, and it clips the window's `shadow-lift` on the two cropped edges, which
 * is correct: those edges are not there any more.
 *
 * ── THE RUNGS ─────────────────────────────────────────────────────────────────────
 *
 * The window is 1280×800 of the app's own pixels and is sized by a uniform `scale`,
 * which is `DesktopContent`'s technique and the reason it is a reproduction rather than
 * an illustration: proportions survive a transform exactly, so nothing inside had to be
 * nudged to fit. What differs from that page is only how far away the reader stands, and
 * that the frame here is smaller than the drawing on purpose.
 *
 *     viewport   plate     inset   visible     scale    window      info panel at
 *     320        272×240   16      256 × 224   0.350    448 × 280    273  (+17)
 *     528        480×340   20      460 × 320   0.650    832 × 520    507  (+47)
 *     768        ~367×320  20      347 × 300   0.500    640 × 400    390  (+43)   ← split
 *     1024       ~497×400  24      473 × 376   0.650    832 × 520    507  (+34)
 *     1148       ~565×470  32      533 × 438   0.750    960 × 600    585  (+52)
 *
 * THE HEIGHTS WENT UP ~25% at every rung by request — the drawing was asked to be taller,
 * and height is the one dimension it can grow in: the WIDTH is `SplitFeature`'s art share
 * and belongs to the arrangement, not to this plate. What a taller plate buys is bottom
 * crop given back — 73% of the window's height is in frame at the top rung where 58% was
 * — and what it costs is that the plate is now the taller of the two columns, which is
 * the shape that arrangement expects ("a drawing tall enough to be worth this much of a
 * band is taller than three paragraphs", `components/ui.tsx`). Every rung still crops the
 * bottom; the scales are untouched, so the right-hand crop is exactly where it was.
 *
 * THE LAST COLUMN IS WHAT PICKED EVERY SCALE, and it is the detail that separates a crop
 * from a botched fit. The window's two side columns are FIXED — a 230px agents rail and a
 * 500px info sidebar (see `WINDOW` in `AppWindowMockup.tsx`) — so the info sidebar begins
 * at x=780 of 1280, and `780 × scale` is where it would appear. Every rung keeps that
 * number BEYOND the visible width, by 17 to 52 pixels: the crop always lands inside the
 * terminal, and the reader never sees a 20px slice of card edges down the right side,
 * which is what the first version of this table did.
 *
 * TWO NUMBERS STEP DOWN AT 768px, and it is the one place on this site where a wider
 * viewport means a smaller drawing: that is where the band stops stacking and the copy
 * takes its half, so the art's column — `SplitFeature`'s `grow-[6]` of eleven, less the
 * row's gap — is barely half what it was at 767px. The plate follows the column and the
 * zoom follows the plate.
 *
 * WHAT STAYS ON SCREEN at every rung is therefore the same composition: the titlebar, the
 * agents rail with its five rows, and the terminal — the three things the paragraph beside
 * it is about. A quarter to a third of the window's height still goes, which is why the
 * usage gauges at the rail's foot are never in frame; they are on `/desktop`, where the
 * window is whole.
 *
 * EVERY RUNG IS A `min-[…]` VARIANT, including the ones that coincide with a Tailwind
 * screen: the breakpoints are derived from the DRAWING and the column, not from the
 * page's own tiers, and keeping them in one variant family is what keeps them sorted
 * among themselves by width so the last matching rung wins. `DesktopContent`'s table
 * makes the same call and states it at greater length.
 *
 * Both lists are written out as literal strings because Tailwind reads SOURCE: a height
 * or a scale assembled from a number at runtime is a class that was never generated.
 */
const PLATE = [
  'h-[240px] pl-4 pt-4',
  'min-[528px]:h-[340px] min-[528px]:pl-5 min-[528px]:pt-5',
  'min-[768px]:h-[320px]',
  'min-[1024px]:h-[400px] min-[1024px]:pl-6 min-[1024px]:pt-6',
  'min-[1148px]:h-[470px] min-[1148px]:pl-8 min-[1148px]:pt-8',
].join(' ')

const WINDOW_ZOOM = [
  'scale-[0.35]',
  'min-[528px]:scale-[0.65]',
  'min-[768px]:scale-[0.5]',
  'min-[1024px]:scale-[0.65]',
  'min-[1148px]:scale-[0.75]',
].join(' ')

/**
 * THE THREE ROWS UNDER THE PARAGRAPH, and they are a caption to the window beside them.
 *
 * ASKED FOR AS "une liste avec icon bleu comme le block 8 skills", which is exactly what
 * this is: the same `FeaturePoints` recipe `SkillsSection` calls, at the same `mt-10`,
 * with the same brand-blue outline glyphs. Nothing here dresses it — the recipe owns the
 * stroke weight, the size and the colour (see `components/ui.tsx`), so the two bands stay
 * one list and not two that resemble each other.
 *
 * WHY IT IS A MODULE CONST AND NOT AN INLINE `.map()`: the component below is already a
 * composition of four things, and a three-row array in the middle of it would be the only
 * data in a file that is otherwise arrangement. `SkillsSection` splits the same way; the
 * difference is that its rows live in `lib/skillsBand.ts` because they are ALSO read by a
 * test that runs outside `webapp/`. These three are not, so they stay here, beside the
 * band that prints them — a module in `lib/` for one caller and no second reader would be
 * a file to keep in step for nothing.
 *
 * THE ICONS ARE THE APP'S OWN WHERE THE APP HAS ONE. `ListTodo` is what the window in
 * this very band draws beside its Tasks action (`AppWindowMockup.tsx`), what `/features`
 * puts on the tasks modal, and what the app itself uses — so the first row's glyph is the
 * one a reader will meet again ten seconds later. `BotMessageSquare` is the agent, chosen
 * over a plain `Bot` because what these agents do in the window is TALK to you — the
 * speech bubble is the half of the drawing that says a terminal is a conversation.
 * `Route` is the follow-up: a path with waypoints, which is what a ticket's life through
 * the eight commands looks like, and it is not `Activity` or `LineChart` on purpose —
 * this band is not claiming a dashboard of metrics.
 *
 * TWO OF THE THREE ROWS NAME A PRODUCT, and they name it as a chip rather than as a
 * word: the trackers on the first row, Claude Code on the second. Their labels are
 * therefore assembled by `points()` below instead of being taken straight from the
 * catalogue. See `ProductChip`.
 */
const POINTS = [
  { icon: ListTodo, label: 'site.appBand.pointTasks' },
  { icon: BotMessageSquare, label: 'site.appBand.pointAgents' },
  { icon: Route, label: 'site.appBand.pointTracking' },
] as const

/**
 * SOMEBODY ELSE'S BRAND, AT 14-16% — the pale ground each chip sits on, as an inline
 * style rather than as a token.
 *
 * Jira's is Atlassian's own blue at 14%, the same number and the same spelling as
 * `TrackerTile` in `features/TasksModalMockup.tsx`, which is where the app's drawn
 * tracker tiles get it. Claude's is Anthropic's coral at 16%, and the two points are not
 * a typo: `#D97757` is a far less saturated hue than `#2684FF`, so an equal alpha puts a
 * visibly fainter plate under the chip beside it. The pair was tuned to look like one
 * family, which is a thing the eye judges and a number cannot.
 *
 * NOT TOKENS, DELIBERATELY, and `tailwind.config.ts` states the rule this follows: the
 * design system's blues are `brand` (the primary button) and `accent` (state and focus),
 * and its coral does not exist — `#D97757` appears in that file only as the hue
 * `plate-claude` is built from, with a note saying coral belongs to the PLATES because it
 * is somebody else's. A chip wearing `brand` or `accent` would be the page claiming
 * Atlassian's mark for its own palette, and would drift the day either is retuned.
 *
 * GITHUB'S IS A TAILWIND CLASS instead, because grey IS ours: `bg-ink/5`, the wash this
 * site already uses for a plate under text — the open state of a `Collapse` row and the
 * selected item in the `/features` sidebar both wear it — rather than a third arbitrary
 * alpha invented for one chip. Under the `hairline`'s 8% on purpose: the chip is a
 * surface and not an edge, so it has to sit UNDER the weight the page draws borders at.
 * GitHub's mark is `currentColor` — see `GithubMark` — so it takes the row's `ink` and
 * needs no colour of its own.
 *
 * ── THE MARKS ─────────────────────────────────────────────────────────────────────
 *
 * TWO VECTORS AND ONE BITMAP, which is not a preference but what the repo ships. Jira's
 * and GitHub's are the app's own `JiraMark` and `GithubMark` — the same components the
 * window drawn beside this band uses in its info panel and on its ticket rows, which is
 * the point of reaching for them here rather than for a pair of lucide glyphs: the chips
 * are a promise the picture next to them keeps.
 *
 * Claude Code has no such component: it exists as `claudecode-color.png`, the 640px mark
 * `/features` prints at 40px and `LogoPlate` at 64px. Drawing an SVG of it here would
 * mean inventing somebody else's artwork by hand, so the chip points at the file — 640px
 * of source into a 16px box is a downscale a retina screen has room to spare on. It is
 * `claudecode-color.png` and NOT `claude-logo.png` for `lib/features.ts`'s reason: the
 * product in that sentence is Claude CODE, and the repo ships a mark for each.
 *
 * The three are matched OPTICALLY and not by box, which is what `MARK` and `MARK_BITMAP`
 * are: two of them fill a 16px square and the bitmap needs 20px to draw a glyph the same
 * height. See the note there.
 */
/**
 * THE BOX THE TWO VECTORS TAKE. 16px, which is the mark's own scale beside 14/16px type.
 *
 * CLAUDE'S IS 20px AND THE DIFFERENCE IS THE ARTWORK, not a taste. `JiraMark` and
 * `GithubMark` fill their 24-unit viewBox almost edge to edge, so a 16px box draws ~15px
 * of mark. `claudecode-color.png` is a WIDE glyph inset in a square canvas — the robot
 * occupies about 64% of the file's height and all of its width — so the same box would
 * have drawn ~10px of it and put a visibly smaller logo in the third chip. At 20px it
 * draws ~13px tall, which is the height the other two read at, and the extra width is the
 * mark's own proportion rather than a mistake.
 *
 * `-my-0.5` PAYS FOR THOSE 4 PIXELS. The chip's box is set by its tallest child, so a
 * 20px mark inside `py-0.5` would deepen this one plate and break the row of three. The
 * negative margin gives back exactly what the larger box took, and it costs nothing:
 * what it eats into is the empty band the artwork already carries.
 */
const MARK = 'h-4 w-4 shrink-0'
const MARK_BITMAP = '-my-0.5 h-5 w-5 shrink-0'

/**
 * One chip's parts: what it is called, what it is drawn with, and the ONE of the two
 * grounds it takes — a `tint` for a brand's own colour, a `ground` class for ours.
 */
type Chip = { name: string; mark: React.ReactNode; tint?: string; ground?: string }

/**
 * A `Record` OVER A NAMED UNION rather than an inferred object, and it is the difference
 * between this compiling and not: `keyof` an inferred literal gives the three names, but
 * `CHIPS[product].tint` on that type is an error the moment one entry lacks the key —
 * which is exactly the shape here, since GitHub's chip has a `ground` and no `tint`.
 * Annotated, every entry is one `Chip` with two optional grounds, and the union survives
 * for `ChipProduct` to be read off.
 */
const CHIPS: Record<'jira' | 'github' | 'claude', Chip> = {
  jira: {
    name: 'Jira',
    mark: <JiraMark className={MARK} />,
    tint: 'rgba(38, 132, 255, 0.14)',
  },
  github: {
    name: 'GitHub',
    mark: <GithubMark className={MARK} />,
    ground: 'bg-ink/5',
  },
  claude: {
    name: 'Claude Code',
    // eslint-disable-next-line @next/next/no-img-element
    mark: <img src="/img/claudecode-color.png" alt="" className={MARK_BITMAP} />,
    tint: 'rgba(217, 119, 87, 0.16)',
  },
}

type ChipProduct = keyof typeof CHIPS

/**
 * A PRODUCT, NAMED INSIDE A SENTENCE: its mark on the left, its name on the right, both
 * on a tinted plate. Asked for in those terms — "un card bleu clair avec à gauche le logo
 * Jira et le wording Jira qui suit", then the grey one for GitHub and the same again for
 * Claude Code.
 *
 * WHY THE ROW SAYS IT TWICE OVER. "Your tasks and issues" is true of the app and says
 * nothing a reader can check; the marks are what make it a fact about THEIR backlog, and
 * they are recognised before the words beside them are read. Same on the second row: an
 * agent is an abstraction until the thing running it has a face.
 *
 * `text-sm md:text-base` AGAINST THE ROW'S `text-base md:text-lg` — one step down at both
 * breakpoints. A chip set at the label's own size stops being an inset and becomes two
 * more words of the sentence with a box around them, which is the failure mode of every
 * badge in prose. A step down and it reads as a thing being pointed at.
 *
 * `align-middle` rather than the baseline an `inline-flex` would take by default: the
 * plate has `py-0.5` of its own, so baseline-aligned it hangs a half-line low and drops
 * the row's leading. Centred on the x-height it sits in the line rather than under it.
 *
 * `rounded-lg` INSIDE A ROW WITH NO OTHER RADIUS, one step under the `rounded-xl` the
 * window beside it wears. A pill (`rounded-full`) was the other candidate and is what
 * this site's status pills are; it was not taken because a pill reads as a STATUS — the
 * app draws ticket statuses that way (`LabelPill`, `TicketBadge`) — and these are names,
 * not states.
 *
 * NO `aria-hidden` AND NO `alt` TEXT: the marks are decorative (the two vectors say so
 * themselves, the `img` carries `alt=""`) and the names beside them are real text, so the
 * rows are announced as "Your tasks Jira and issues GitHub" and "Your agents Claude Code
 * at work" — the sentences, in order, with the pictures left out.
 */
function ProductChip({ product }: { product: ChipProduct }) {
  const { name, mark, tint, ground } = CHIPS[product]

  return (
    <span
      // The greys are a class and the brands are a style, which is why one arrives
      // through `className` and the other through `style`: see `CHIPS`.
      className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-0.5 align-middle text-sm md:text-base${
        ground ? ` ${ground}` : ''
      }`}
      style={tint ? { backgroundColor: tint } : undefined}
    >
      {mark}
      {name}
    </span>
  )
}

/**
 * The placeholders a row's sentence may carry, and what each becomes.
 *
 * THE PATTERN IS BUILT FROM `CHIPS` rather than typed out beside it, so a fourth product
 * is one entry in that table and nothing else. A token spelled in two places is a token
 * that eventually only exists in one of them, and the failure would be silent: an
 * unmatched `{claude}` renders as those seven characters on the page.
 *
 * SPLIT ON A CAPTURING GROUP, which is what keeps the delimiters in the output — the
 * pieces come back as ["Your tasks ", "{jira}", " and issues ", "{github}", ""] and the
 * spaces the sentence was written with survive, which is the whole reason not to
 * `replace()` and re-join. A piece that is not a placeholder is rendered as the text it
 * is; a `Fragment` keys each one, since an array of children needs keys even when half of
 * them are strings.
 *
 * EVERY ROW GOES THROUGH IT, not only the two that carry a chip today. A sentence with no
 * token splits into one piece and renders as itself, so the cost is nil and the third row
 * can name a product tomorrow without a second code path being invented for it.
 *
 * THE TOKENS ARE `t()`'s OWN SYNTAX (`lib/i18n/index.ts` substitutes `{name}` from a
 * `vars` map) and these rows simply do not pass `vars`, so they arrive untouched. That is
 * deliberate rather than a trick: if this component is ever deleted and the rows go back
 * to being plain strings, an unsubstituted `{jira}` renders visibly on the page instead
 * of silently vanishing — which is the behaviour that module documents and relies on.
 */
const CHIP_TOKENS = new RegExp(`(${Object.keys(CHIPS).map((name) => `\\{${name}\\}`).join('|')})`)

/** `{jira}` → `jira`; any other piece of the sentence → `null`. */
function chipIn(piece: string): ChipProduct | null {
  const name = piece.slice(1, -1)
  return piece.startsWith('{') && name in CHIPS ? (name as ChipProduct) : null
}

function withChips(sentence: string) {
  return sentence.split(CHIP_TOKENS).map((piece, index) => {
    const product = chipIn(piece)
    return <Fragment key={index}>{product ? <ProductChip product={product} /> : piece}</Fragment>
  })
}

/**
 * The rows, translated, in the shape `FeaturePoints` takes — `SkillsSection`'s `points()`
 * next door, and a function for its reason: the component below stays a composition, and
 * the translator is passed in rather than a second `useT()` subscribing to the language
 * again for three strings.
 *
 * `id` IS THE MESSAGE KEY, and it is on every row rather than only on the ones that need
 * it. The list keys on `id` when a label is a node (see `FeaturePoint` in
 * `components/ui.tsx`), and every label here is one now that all three go through
 * `withChips` — but the key would be the right choice anyway: it is the one string in
 * this file guaranteed distinct and stable, where a label is neither, since two rows may
 * one day translate to the same words.
 */
function points(t: ReturnType<typeof useT>['t']) {
  return POINTS.map(({ icon, label }) => ({ icon, id: label, label: withChips(t(label)) }))
}

export function AppSection() {
  const { t } = useT()

  return (
    <HomeSection>
      <SplitFeature
        media="right"
        art={
          <Reveal order={2}>
            {/* NO `aria-hidden` HERE, and it is not an oversight: `AppWindowMockup`'s own
                root already carries it — the whole window is a drawing, and a screen
                reader that read out four agent names, a token gauge and three commit
                subjects would be reciting a picture. Repeating it on the plate would be a
                second copy of a decision that belongs to the drawing.

                `overflow-hidden` is the crop and the fixed height is what makes it
                possible — see `PLATE`. `origin-top-left` so the zoom pushes into the
                bottom and right edges rather than off the two the window is inset from:
                the strips of `sky` down the left and along the top are the only ground
                that shows, and they are what say this is a panel and not a page. */}
            <div className={`overflow-hidden rounded-2xl bg-tone-sky ${PLATE}`}>
              {/* `shadow-panel` ON THE SCALED WRAPPER, which is the one element whose box
                  is exactly the window's: `AppWindowMockup` sets its own 1280×800, so this
                  div's silhouette is the window's and `rounded-xl` matches the radius it
                  draws itself with. The mockup's own `shadow-lift` cannot do this job —
                  it casts straight down, and down is cropped — and it is not this band's
                  to change: `/desktop` needs exactly that shadow over its aura.

                  `panel` is a DECLARED rung, added for this (see `tailwind.config.ts`).
                  Writing the value here instead would fail `lib/designTokens.test.ts`,
                  which scans this file as text — comments included, which is why the
                  offending class cannot even be spelled in this note.

                  IT IS INSIDE THE TRANSFORM, so the shadow scales with the drawing: the
                  rung's 24px of spill becomes 18px at 0.75 and 12px at 0.5. That is the
                  right way round — a shadow held at full size while the window shrank
                  would read as a smudge around a small picture — and both figures still
                  land inside the 16-32px of plate the window is inset by. */}
              <div className={`origin-top-left rounded-xl shadow-panel ${WINDOW_ZOOM}`}>
                <AppWindowMockup />
              </div>
            </div>
          </Reveal>
        }
      >
        <Reveal order={1}>
          {/* `HomeHeading` AND NOT A HAND-WRITTEN HEADLINE, which is the opposite call
              from the band this replaces. That one wrote its `h2` out because its whole
              composition was a centred axis and this component is `max-w-2xl` and
              left-aligned — exactly what a split's copy column wants. `SkillsSection`
              hands it the same two strings for the same reason. */}
          <HomeHeading title={t('site.appBand.title')} subtitle={t('site.appBand.subtitle')} />

          {/* `mt-10` under the paragraph, against the `mt-4` `HomeHeading` puts between
              its own two lines: the rows are a separate move and not a third line of the
              heading. Same gap and same reasoning as `SkillsSection`, which is what keeps
              the two bands reading as one page rather than as two lists at two rhythms. */}
          <FeaturePoints className="mt-10" points={points(t)} />

          {/* A `div` rather than a margin on the button: `mt-10` through `className`
              would be additive layout on a recipe that already owns its own box.
              `SkillsSection` builds the same stack, at the same gap, and the note there
              says why the spacing lives at the call site. */}
          <div className="mt-10">
            <ButtonNavLink href={DESKTOP_PATH} variant="secondary" size="lg" icon={ArrowRight}>
              {t('site.appBand.cta')}
            </ButtonNavLink>
          </div>
        </Reveal>
      </SplitFeature>
    </HomeSection>
  )
}
