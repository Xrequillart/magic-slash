'use client'

import { ArrowRight } from 'lucide-react'
import { ButtonNavLink, SplitFeature } from '@/components/ui'
import { useT } from '@/lib/i18n/useLanguage'
import { DESKTOP_PATH } from '@/lib/siteNav'
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
