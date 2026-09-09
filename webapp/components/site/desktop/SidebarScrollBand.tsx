'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { FeaturePoints } from '@/components/ui'
import { DESKTOP_BANDS, SIDEBAR_TOUR, STATUS_STEP_TITLE, type SidebarTourStep } from '@/lib/desktopPage'
import { titleOf } from '@/lib/features'
import { useT } from '@/lib/i18n/useLanguage'
import {
  InfoSidebarPanel,
  PANEL_WIDTH,
  SIDEBAR_STATUSES,
  type ScriptsPhase,
  type SidebarPart,
} from '../features/InfoSidebarMockup'
import { HomeHeading, HomeSection } from '../home/Shell'
import { Reveal } from '../Reveal'
import { DESKTOP_ICONS } from './icons'

/**
 * THE INFO SIDEBAR, READ BY SCROLLING.
 *
 * The panel beside an agent's terminal — `InfoSidebarPanel`, the app's own cards at the
 * app's own pixels — stands on the right in a frame and STAYS there (`sticky`) while a
 * column of short paragraphs scrolls past it on the left. Each paragraph is about one part
 * of the panel, and as it reaches the middle of the screen the panel pans and zooms inside
 * its frame to that part, the other cards dim, and the part takes a ring. Between the
 * paragraphs about the status pill, the pill itself changes: in progress, committed, PR
 * created (and the pull request card appears under the commits, as it does in the app),
 * in review, merged. Under every paragraph, three key points.
 *
 * This is the product owner's brief for the band: the sidebar "au complet, fixe en sticky,
 * au pixel perfect", explanatory text arriving on the left as you scroll, "un zoom sur
 * cette partie avec un highlight", "une animation de déplacement" between parts, the
 * statuses shown by scrolling rather than by a legend, and "des points clés sur chaque
 * étape". IT STAYS IN ITS FRAME. A version that let the panel loose on the whole page,
 * sliding under the text, was tried and sent back ("je préfère que ça reste dans le cadre
 * de l'illustration"); the frame is the reference the zoom is read against.
 *
 * HOW THE ZOOM IS COMPUTED, because it is the one piece of arithmetic on the page. The
 * panel is drawn once at 500px and scaled with a `transform` inside a clipping frame. Its
 * BASE scale is the one that fits the panel's width inside the frame with `FRAME_PAD` of
 * plate showing on either side; the panel is then panned so the part in focus is centred,
 * clamped so the same `FRAME_PAD` of plate shows above the panel's top edge and below its
 * foot. The padding is the same on all four sides at every step — the product owner asked
 * for exactly that ("on perd le padding égal en height et en width"), after a version that
 * fitted the panel flush to the frame and magnified a whole card until it filled it.
 *
 * A CARD STEP NEVER ZOOMS: the session card, the ticket, the repository, the pull request
 * are shown at the base scale and only panned to. A DETAIL or STATUS step — the ticket id,
 * the pill, the files, the commits, a row of the PR card — is the part being pointed at,
 * and that one is magnified: the largest scale that fits its box plus a margin inside the
 * frame, floored at the base and capped at `MAX_ZOOM` (so a 90px pill does not become a
 * poster). The box is read out of the DOM in the panel's own unscaled pixels (`data-part`,
 * which `InfoSidebarPanel` puts on every part); a step may name a wider `zoom` part than
 * the one it rings, which the scripts step does to keep its menu and its server row in
 * frame. `transition-transform` on the scaled element is the "animation de déplacement":
 * one property, one curve, and the browser draws the pan.
 *
 * THE SCRIPTS STEP PLAYS A SCENE. When its paragraph becomes the active one, the panel's
 * `scripts` phase runs on a clock: the dropdown opens under its trigger, the `dev` row is
 * hovered, `dev` starts (the purple bar appears in the card) and then serves (the address
 * row hangs under it) — what a reader would do in the app, done for them as they arrive.
 * The server stays up for the rest of the tour, as it would; scrolling back above the
 * step stops it, so the scene plays again on the way down. `prefers-reduced-motion` skips
 * the clock and shows the served state at once.
 *
 * WHICH PARAGRAPH IS ACTIVE is the one straddling the middle of the viewport, found on
 * every scroll frame from the paragraphs' own boxes. Above the first, nothing is active
 * and the panel shows whole at the width-fitting scale — which is also what a reader who
 * never scrolls sees, and what `prefers-reduced-motion` sees at every step (the transform
 * still applies, without the transition, so the reader is never shown the wrong card).
 *
 * THE FRAME IS STICKY AT EVERY WIDTH. From `lg` it is the right column, as tall as the
 * viewport less the header and a margin; below `lg` the layout is a column with the frame
 * FIRST, at 42vh, and it sticks under the header while the paragraphs scroll beneath it.
 * `flex-col` below `lg` is what makes that work: a sticky element is held inside its
 * parent's box, and in a stacked GRID the frame's cell would be exactly its own height.
 * From `lg` the grid takes over and `self-start` gives the frame its whole row to stick in.
 * Below `lg` the active paragraph is the one at the middle of what is left UNDER the frame,
 * or the active one would be the one hidden behind it.
 *
 * NOT `HomeHeading`'s eyebrow — no band on this page opens on one (see `lib/desktopPage.ts`).
 */

/** The plate showing around the panel, on all four sides, at every step. */
const FRAME_PAD = 24
/**
 * The margin around a magnified part, in the panel's own pixels — generous above and
 * below, tight at the sides. Most parts run the panel's full width, so the width is what
 * caps the zoom on them; a tight side margin lets those parts come as close as the frame
 * allows without cutting the numbers at their right edge.
 */
const FOCUS_PAD_Y = 28
const FOCUS_PAD_X = 8
/** The furthest the panel is ever magnified. */
const MAX_ZOOM = 1.9

/** The scripts scene, in milliseconds after the step becomes active. */
const SCRIPTS_SCENE: readonly { at: number; phase: ScriptsPhase }[] = [
  { at: 600, phase: 'open' },
  { at: 1400, phase: 'hover' },
  { at: 2100, phase: 'running' },
  { at: 3300, phase: 'serving' },
]
const SCRIPTS_STEP = SIDEBAR_TOUR.findIndex((step) => step.id === 'scripts')

/** A part's box in the coordinates of the panel it sits in — offsets summed up the tree. */
function boxWithin(el: HTMLElement, root: HTMLElement) {
  let x = 0
  let y = 0
  let node: HTMLElement | null = el
  while (node && node !== root) {
    x += node.offsetLeft
    y += node.offsetTop
    node = node.offsetParent as HTMLElement | null
  }
  return { x, y, w: el.offsetWidth, h: el.offsetHeight }
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

export function SidebarScrollBand() {
  const { t } = useT()
  const [active, setActive] = useState(-1)
  const [transform, setTransform] = useState<string>()
  const stepRefs = useRef<(HTMLElement | null)[]>([])
  const frameRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  // Bumped on resize so the transform is recomputed for the frame's new size.
  const [layoutTick, setLayoutTick] = useState(0)

  // ── Which paragraph straddles the middle of the screen ──────────────────────────
  useEffect(() => {
    let frame = 0
    const measure = () => {
      frame = 0
      // The line a paragraph has to straddle to be the active one. From `lg` it is the
      // middle of the viewport, the panel standing beside the text. Below `lg` the panel
      // is sticky ABOVE the text and covers the top of the screen, so the line is the
      // middle of what is left under it.
      const sticky = frameRef.current
      const top =
        sticky && !window.matchMedia('(min-width: 1024px)').matches ? sticky.getBoundingClientRect().bottom : 0
      const middle = top + (window.innerHeight - top) / 2
      let found = -1
      stepRefs.current.forEach((el, index) => {
        if (!el) return
        const rect = el.getBoundingClientRect()
        if (rect.top <= middle && rect.bottom >= middle) found = index
      })
      if (found === -1) {
        // Between two paragraphs, or past the last: keep the nearest one above the
        // middle, so the panel never snaps back to the overview mid-tour.
        stepRefs.current.forEach((el, index) => {
          if (el && el.getBoundingClientRect().top <= middle) found = index
        })
      }
      setActive(found)
    }
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(measure)
    }
    const onResize = () => {
      setLayoutTick((n) => n + 1)
      onScroll()
    }
    measure()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onResize)
      if (frame) window.cancelAnimationFrame(frame)
    }
  }, [])

  const step: SidebarTourStep | null = active >= 0 ? SIDEBAR_TOUR[active] : null
  const status = step?.status ?? 'inProgress'
  const pr = step?.pr ?? null
  const focus: SidebarPart | null = step?.part ?? null
  const zoomPart: SidebarPart | null = step?.zoom ?? focus

  // ── The scripts scene ───────────────────────────────────────────────────────────
  const [scripts, setScripts] = useState<ScriptsPhase>('closed')
  useEffect(() => {
    if (active < SCRIPTS_STEP) {
      setScripts('closed')
      return
    }
    if (active > SCRIPTS_STEP) {
      setScripts('serving')
      return
    }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setScripts('serving')
      return
    }
    setScripts('closed')
    const timers = SCRIPTS_SCENE.map(({ at, phase }) => window.setTimeout(() => setScripts(phase), at))
    return () => timers.forEach((id) => window.clearTimeout(id))
  }, [active])

  // ── Where the panel goes for that paragraph ─────────────────────────────────────
  useLayoutEffect(() => {
    const frame = frameRef.current
    const panel = panelRef.current
    if (!frame || !panel) return
    const fw = frame.clientWidth
    const fh = frame.clientHeight
    const pw = PANEL_WIDTH
    const ph = panel.offsetHeight
    // The base: the panel's width inside the frame, `FRAME_PAD` of plate either side.
    const base = (fw - FRAME_PAD * 2) / pw

    const target = zoomPart ? panel.querySelector<HTMLElement>(`[data-part="${zoomPart}"]`) : null
    if (!target) {
      setTransform(`translate(${FRAME_PAD}px, ${FRAME_PAD}px) scale(${base})`)
      return
    }

    const box = boxWithin(target, panel)
    let scale = base
    if (step && step.kind !== 'card') {
      const fitBox = Math.min((fw - FRAME_PAD * 2) / (box.w + FOCUS_PAD_X * 2), (fh - FRAME_PAD * 2) / (box.h + FOCUS_PAD_Y * 2))
      scale = clamp(fitBox, base, Math.max(base, MAX_ZOOM))
    }

    // Centre the part; then keep `FRAME_PAD` of plate at whichever edge the panel reaches.
    const wantX = fw / 2 - scale * (box.x + box.w / 2)
    const wantY = fh / 2 - scale * (box.y + box.h / 2)
    const tx = scale * pw <= fw - FRAME_PAD * 2 ? (fw - scale * pw) / 2 : clamp(wantX, fw - FRAME_PAD - scale * pw, FRAME_PAD)
    const ty = scale * ph <= fh - FRAME_PAD * 2 ? (fh - scale * ph) / 2 : clamp(wantY, fh - FRAME_PAD - scale * ph, FRAME_PAD)
    setTransform(`translate(${tx}px, ${ty}px) scale(${scale})`)
    // `pr` and `scripts` change the panel's height (the PR card appears, the server row
    // appears), so they are dependencies even though the arithmetic never reads them.
  }, [zoomPart, step, pr, scripts, layoutTick])

  return (
    <HomeSection>
      <Reveal order={1}>
        <HomeHeading title={t(DESKTOP_BANDS.sidebar.title)} subtitle={t(DESKTOP_BANDS.sidebar.subtitle)} />
      </Reveal>

      <div className="mt-12 flex flex-col gap-10 lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:items-start lg:gap-16">
        {/* ── THE PANEL, STICKY ───────────────────────────────────────────────────── */}
        <div
          ref={frameRef}
          aria-hidden
          className="sticky top-20 z-10 h-[42vh] min-h-[300px] w-full self-start overflow-hidden rounded-2xl bg-tone-sky shadow-lift lg:order-2 lg:top-24 lg:h-[calc(100vh-8rem)] lg:max-h-[880px] lg:min-h-[520px]"
        >
          {/* `origin-top-left` and a translate: the arithmetic above is written for that
              origin, and every other origin would need the box re-derived. `will-change`
              because the pan is the one thing on the page that animates a large raster. */}
          <div
            ref={panelRef}
            className="absolute left-0 top-0 origin-top-left will-change-transform transition-transform duration-[900ms] ease-[cubic-bezier(0.2,0.7,0.2,1)] motion-reduce:transition-none"
            style={{ transform, width: PANEL_WIDTH }}
          >
            {/* `bg-appbg` is the window's ground the panel's `bg-black/30` sits on in the
                app; without it the cards would float on the plate's blue. */}
            {/* `rounded-xl` and a hairline: with plate showing on every side the panel is an
                object on it rather than a fill, and an object has edges. */}
            <div className="overflow-hidden rounded-xl bg-appbg ring-1 ring-inset ring-white/10">
              <InfoSidebarPanel status={status} pr={pr} focus={focus} scripts={scripts} />
            </div>
          </div>
        </div>

        {/* ── THE PARAGRAPHS ──────────────────────────────────────────────────────── */}
        <ol className="flex flex-col lg:order-1">
          {SIDEBAR_TOUR.map((tourStep, index) => (
            <li
              key={tourStep.id}
              ref={(el) => {
                stepRefs.current[index] = el
              }}
              // A CARD or DETAIL paragraph gets 70vh, a STATUS paragraph 55vh: with three
              // key points under every paragraph the short ones are no longer short, and
              // the taller measure is what keeps one paragraph on screen at a time. Both
              // centre their copy in that height, so the text is at the middle of the
              // screen when the paragraph is the active one.
              className={`flex flex-col justify-center py-6 transition-opacity duration-500 ${
                tourStep.kind === 'status' ? 'min-h-[55vh]' : 'min-h-[70vh]'
              } ${active === index || active === -1 ? 'opacity-100' : 'opacity-40'}`}
            >
              <StepCopy step={tourStep} />
            </li>
          ))}
        </ol>
      </div>
    </HomeSection>
  )
}

/**
 * One paragraph of the tour, and its three key points. A card step is the `/features`
 * row's own title and description, a detail step its own pair; a status step is headed
 * "Status: …" with the pill drawn in the heading — the same tint and ink the panel's pill
 * takes for that status, so the reader sees on the left exactly what changes on the right.
 *
 * THE KEY POINTS ARE `FeaturePoints`, the design system's own list — the one the Tasks and
 * Agents bands set under their paragraphs — with a glyph of its own for each line
 * (`POINT_ICONS` in `lib/desktopPage.ts`). A lighter list was tried first, on the argument
 * that forty-five claims at near-heading weight would out-shout fifteen paragraphs; the
 * product owner asked for the classic bands' style instead ("icon et texte plus grand, en
 * gras"), and one recipe across the page is the better call: a reader who has read the
 * Tasks band's three claims reads these the same way.
 */
function StepCopy({ step }: { step: SidebarTourStep }) {
  const { t } = useT()

  const heading =
    step.kind === 'status' ? (
      <h3 className="flex flex-wrap items-center gap-3 font-display text-2xl font-bold leading-tight text-ink md:text-3xl">
        <span>{t(STATUS_STEP_TITLE, { status: '' }).trim()}</span>
        <span
          className={`inline-flex items-center rounded-full px-3 py-1 font-display text-sm font-medium ring-1 ring-inset ring-ink/10 ${
            SIDEBAR_STATUSES[step.status].tone
          }`}
        >
          {t(step.statusLabel)}
        </span>
      </h3>
    ) : (
      <h3 className="font-display text-2xl font-bold leading-tight text-ink md:text-3xl">
        {step.kind === 'card' ? titleOf(step.feature.title, t) : t(step.title)}
      </h3>
    )

  const description =
    step.kind === 'card' ? step.feature.description : step.description

  return (
    <>
      {heading}
      <p className="mt-4 max-w-md text-base leading-relaxed text-muted">{t(description)}</p>
      {/* `mt-8` rather than the `mt-10` the band-level bands use: these follow a paragraph
          set a step smaller than a band's, and the gap scales with it. The list keeps
          `FeaturePoints`' own `gap-6`: a `gap-4` appended here would race it in the
          stylesheet rather than replace it, which is the conflict `components/ui.tsx`
          warns about. */}
      <FeaturePoints
        className="mt-8 max-w-md"
        points={step.points.map(({ icon, label }) => ({ icon: DESKTOP_ICONS[icon], label: t(label) }))}
      />
    </>
  )
}
