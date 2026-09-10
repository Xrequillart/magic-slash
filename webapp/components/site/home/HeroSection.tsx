'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, Download, FileText, GitBranch, MessageSquare } from 'lucide-react'
import { ButtonNavLink } from '@/components/ui'
import type { MessageKey } from '@/lib/i18n'
import { useT } from '@/lib/i18n/useLanguage'
import { DOWNLOAD_PATH } from '@/lib/siteNav'
import { WORKFLOW_PATH } from '@/lib/workflow'
import { JiraMark } from '../features/TicketCardMockup'
import { GithubMark } from '../features/TasksModalMockup'
import { Reveal } from '../Reveal'
import { RichText } from '../RichText'
import { HomeSection } from './Shell'

/**
 * The landing page's first screen, in two columns: the pitch on the left, the orbit on
 * the right.
 *
 * THE PITCH IS THE FRONTIER, not the cycle. The previous hero drew the seven commands as
 * a ladder beside a headline about a ticket becoming a PR, and the product owner's
 * reading of it was exact: "elle parle du workflow, mais ne parle pas des specs créées",
 * too many layers, and the three integrations named twice. This one makes a different
 * argument. The headline names the two ends — an idea, a merged PR — and what is left
 * for the reader to do (decide). The drawing puts the CODE in the middle, as the Claude
 * Code mark, and everything the product does AROUND it in orbit: the spec, the tickets,
 * the worktree and commits, the PR, the review, the closed ticket. A visitor who already
 * has Claude Code open in another tab — which is every visitor this page is for — reads
 * the picture as an answer to "why one more tool": that is the code, this is the rest.
 *
 * ARTEFACTS, NOT COMMANDS. The six cards are what a ticket leaves behind, not what you
 * type to get it, and no command is spelled anywhere in the hero any more — the old
 * `<code>/magic:start</code>` closing the headline went with the ladder. The commands
 * are the workflow band's and the skills band's subject, further down, and `/workflow`'s
 * at length; the hero is the one place on the page that can afford not to name them.
 *
 * FIVE THINGS ABOVE THE FOLD where there were nine: headline, subtitle, two buttons,
 * one row of the three marks, and the drawing. The pill above the headline is gone (it
 * counted the skills; the subtitle still does, once) and so is one of the two rows that
 * named Claude Code, Jira and GitHub — `Integrations` stays because it is now the ONLY
 * place the three are named, and Jira and GitHub also appear where they mean something,
 * on the cards they belong to.
 *
 * THE MARK IS ALIVE, a little. It hops now and then, one eye winks now and then, both
 * eyes glance about now and then, on three idle loops that drift against each other
 * (`hero-hop` 7s, `hero-wink` 5s, `hero-look` 11s in `tailwind.config.ts`). Clicked, it
 * flinches and says "Aïe !!" in a pixel bubble; clicked again and again it escalates —
 * `ClaudeFigure` has the ladder. All of it is the owner's brief. The mark is drawn as
 * SVG rather than the `/img/claudecode-color.png` bitmap the rest of the site uses,
 * because a wink needs one eye to be its own element; the geometry is read off that
 * bitmap on a 16-unit grid so the two are the same figure, and it sits on NO TILE — the
 * owner's second call ("sans card blanche") — so the orange is the only thing at the
 * centre of the ring. Every loop is `motion-reduce:animate-none`, and the clicks still
 * work without motion — the bubbles simply appear.
 *
 * THE TWO BUTTONS: `primary` opens `/download` — the page, not the .dmg, so the reader
 * meets the prerequisites and what the first launch sets up before the file lands in
 * their folder — and `secondary` opens `/workflow`, where the six artefacts are set out
 * at length. Both `size="lg"`, and the same 46px once `secondary` spends its border on
 * `border-hairline` and `primary` on `border-transparent` — see `BUTTON_BASE`. Both are
 * `ButtonNavLink`: two routes on this host, both with client-side navigation.
 */
export function HeroSection() {
  const { t } = useT()

  return (
    // `padding="hero"` for the taller top (the bar is `fixed` at `h-16`), the wash in
    // `className` because it is additive — see `SECTION_PADDING` in `Shell.tsx`.
    <HomeSection
      padding="hero"
      backdrop={<Bloom />}
      className="bg-gradient-to-b from-softblue to-canvas"
    >
      <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-14">
        <div className="flex flex-col items-start gap-6">
          <Reveal order={1}>
            {/* Two sentences, three lines, one ink: the promise broken where the catalogue
                breaks it (`<br>` in `site.hero.title`, through `RichText`), then the one
                thing the reader still does. The second sentence was muted for a round and
                the owner asked for it black ("tout le H1 en noir"): one colour, one voice.
                `text-wrap: balance` stays off — the breaks are deliberate. */}
            <h1 className="font-display text-4xl font-black leading-[1.05] tracking-tight text-ink md:text-[3.4rem]">
              <RichText k="site.hero.title" />
              <br />
              {t('site.hero.titleTail')}
            </h1>
          </Reveal>

          <Reveal order={2}>
            <p className="max-w-xl text-lg leading-relaxed text-muted">{t('site.hero.subtitle')}</p>
          </Reveal>

          <Reveal order={3} className="flex flex-wrap items-center gap-3">
            <ButtonNavLink href={DOWNLOAD_PATH} variant="primary" size="lg" icon={Download}>
              {t('site.hero.downloadCta')}
            </ButtonNavLink>
            <ButtonNavLink href={WORKFLOW_PATH} variant="secondary" size="lg">
              {t('site.hero.workflowCta')}
            </ButtonNavLink>
          </Reveal>

          <Reveal order={4}>
            <Integrations />
          </Reveal>
        </div>

        <Orbit />
      </div>
    </HomeSection>
  )
}

/**
 * Claude Code has no drawn mark in the codebase; it exists as a bitmap, and this is the
 * same file the app band's chip row uses (`AppSection.tsx`) for the same reason it gives.
 * The orbit's centre does NOT use it — see `ClaudeFigure` for why.
 */
function ClaudeCodeMark({ className = 'h-[18px] w-[18px]' }: { className?: string }) {
  return <img src="/img/claudecode-color.png" alt="" className={`${className} object-contain`} />
}

/**
 * Brand names, so no catalogue: they are spelled the same way in every language. This is
 * the hero's one row naming the three, now that the pill above the headline is gone.
 */
function Integrations() {
  return (
    <ul className="flex flex-wrap items-center gap-5 text-sm font-bold text-ink">
      <li className="flex items-center gap-2">
        <ClaudeCodeMark />
        Claude Code
      </li>
      <li className="flex items-center gap-2">
        <JiraMark className="h-[18px] w-[18px]" />
        Jira
      </li>
      <li className="flex items-center gap-2">
        <GithubMark className="h-[18px] w-[18px] text-ink" />
        GitHub
      </li>
    </ul>
  )
}

/**
 * One artefact on the ring: what it is, one line about it, which mark sits beside it,
 * and where on the square it lands. `position` is a full Tailwind class string per node
 * rather than two numbers — the scanner has to see every class it emits, and six
 * literal strings are the honest way to give it them.
 */
type Node = {
  title: MessageKey
  desc: MessageKey
  icon: React.ReactNode
  position: string
}

const ICON = 'h-4 w-4 shrink-0'

const ORBIT: readonly Node[] = [
  {
    title: 'site.hero.orbitSpecTitle',
    desc: 'site.hero.orbitSpecDesc',
    icon: <FileText className={`${ICON} text-brand`} strokeWidth={2.2} />,
    position: 'left-1/2 top-[8%]',
  },
  {
    title: 'site.hero.orbitEpicTitle',
    desc: 'site.hero.orbitEpicDesc',
    icon: <JiraMark className={ICON} />,
    position: 'left-[86%] top-[29%]',
  },
  {
    title: 'site.hero.orbitWorktreeTitle',
    desc: 'site.hero.orbitWorktreeDesc',
    icon: <GitBranch className={`${ICON} text-ink`} strokeWidth={2.2} />,
    position: 'left-[88%] top-[71%]',
  },
  {
    title: 'site.hero.orbitPrTitle',
    desc: 'site.hero.orbitPrDesc',
    icon: <GithubMark className={`${ICON} text-ink`} />,
    position: 'left-1/2 top-[92%]',
  },
  {
    title: 'site.hero.orbitReviewTitle',
    desc: 'site.hero.orbitReviewDesc',
    icon: <MessageSquare className={`${ICON} text-brand`} strokeWidth={2.2} />,
    position: 'left-[12%] top-[71%]',
  },
  {
    title: 'site.hero.orbitDoneTitle',
    desc: 'site.hero.orbitDoneDesc',
    icon: <CheckCircle2 className={`${ICON} text-green`} strokeWidth={2.4} />,
    position: 'left-[14%] top-[29%]',
  },
]

/** The copy's entrance runs orders 1–4; the orbit continues the count rather than restarting it. */
const ORBIT_FIRST_ORDER = 5

/**
 * The drawing: a dashed ring with one bright arc turning on it, the Claude Code figure
 * at its centre, and the six artefact cards on the ring. The square is `aspect-square`
 * so the ring is a circle at every width, and the cards are centred on their point with
 * a `-translate-x/y-1/2`, so a card that grows with its translation grows evenly.
 *
 * The cards on the ring's left and right sit at 12–14% and 86–88% rather than on the
 * circle itself, because a card is wider than it is tall: centred on the circle it
 * would hang off the square's edge, and the band would clip it.
 *
 * BELOW `lg` THE DRAWING IS NOT SHOWN AT ALL (`hidden lg:block`), and the hero is the
 * copy alone. It was scaled to 78% on phones for a round, cards and all, and the owner
 * cut it with every other hero illustration on the site ("retire les illustrations des
 * hero section de chaque page"): under a headline that already says what comes out, six
 * cards squeezed into a phone's width repeat it smaller, and the figure's loops are
 * exactly the motion `lib/stillness.ts` stops there anyway. The grid above goes to two
 * columns at `lg` and not `md` for the same reason — a tablet gets the one column.
 */
function Orbit() {
  const { t } = useT()

  return (
    <div className="relative mx-auto hidden aspect-square w-full max-w-[470px] lg:block">
      <div
        aria-hidden
        className="absolute inset-[11%] rounded-full border-2 border-dashed border-brand/35"
      >
        {/* The arc: a transparent ring with two sides painted, turning. `spin` is
            Tailwind's own keyframe; only the period is ours. */}
        <div className="absolute -inset-0.5 rounded-full border-2 border-transparent border-r-brand border-t-brand animate-[spin_10s_linear_infinite] motion-reduce:animate-none" />
      </div>

      {/* `z-10`: the six cards come later in the DOM and would paint over the figure's
          speech bubble, which reaches out to where the "Epic" card sits. The figure is
          the one thing here that talks, so it is the one thing lifted. */}
      <Reveal
        order={ORBIT_FIRST_ORDER}
        className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2"
      >
        <ClaudeFigure />
      </Reveal>

      {ORBIT.map((node, index) => (
        <Reveal
          key={node.title}
          order={ORBIT_FIRST_ORDER + 1 + index}
          className={`absolute -translate-x-1/2 -translate-y-1/2 ${node.position}`}
        >
          <div className="flex items-center gap-2.5 whitespace-nowrap rounded-xl border border-hairline bg-white px-3 py-2 shadow-card">
            {node.icon}
            <span className="leading-tight">
              <span className="block text-[0.8rem] font-bold text-ink">{t(node.title)}</span>
              <span className="block text-[0.7rem] font-semibold text-muted">{t(node.desc)}</span>
            </span>
          </div>
        </Reveal>
      ))}
    </div>
  )
}

/**
 * How long the figure stays in a mood after the LAST click. Long enough to read a line,
 * short enough that the ladder can be climbed again a moment later.
 */
const CALM_MS = 1800

/**
 * THE LADDER. How many clicks in one burst earn which reaction — each rung is the
 * lowest count that reaches it, and the figure stays on a rung until the next one or
 * until the burst ends. The first two clicks get the original "Aïe"; the owner asked
 * for what comes after ("lorsqu'on spam click sur lui").
 */
const MOODS = [
  { from: 8, line: 'site.hero.dance', motion: 'animate-hero-dance' },
  { from: 5, line: 'site.hero.enough', motion: 'animate-hero-sulk' },
  { from: 3, line: 'site.hero.stop', motion: 'animate-hero-shake' },
  { from: 1, line: 'site.hero.ouch', motion: 'animate-hero-flinch' },
] as const satisfies readonly { from: number; line: MessageKey; motion: string }[]

/**
 * The Claude Code figure at the centre of the orbit, on nothing and under nothing: the
 * label that named it over its head went at the owner's request ("retire le logo claude
 * code au-dessus"), and the `Integrations` row already says whose figure this is. 200px
 * wide, which is most of the 366px ring — the owner asked for it bigger twice, and it
 * is the one thing in the drawing meant to be looked at rather than read. It hops (`animate-hero-hop`, on the outer wrapper, from the feet), one eye
 * winks (`animate-hero-wink`, on that eye), both eyes glance about (`animate-hero-look`,
 * on the group that holds them), and clicks move it up `MOODS`.
 *
 * THE CLICK IS A BUTTON, so it is reachable from the keyboard and announced as what it
 * is; its label is the product's name, because that is what the figure is. `clicks`
 * counts the burst rather than holding a boolean: it is the `key` on the mood wrapper,
 * so every click remounts it and the one-shots (flinch, shake, sulk) replay from their
 * first frame instead of being ignored; the dance is `infinite` and a remount only
 * restarts the bar. The bubble is keyed on the MOOD, so it pops once per rung and holds
 * while the clicks keep coming, rather than blinking on every one. `CALM_MS` after the
 * last click, everything resets — the figure turns back round, the bubble goes.
 *
 * THE GEOMETRY IS THE BITMAP'S: `/img/claudecode-color.png` is 640px on a 16-unit
 * grid — body 2→14 across and 3.25→11.25 down, arms the full width at 7.25→9.25, four
 * legs one unit wide at 3, 5, 10 and 12, eyes one unit wide at 4 and 11 from 5.4 to
 * 7.3. The eyes are holes in the bitmap; here they are white rects over the body,
 * which on the hero's blue wash reads as the whites of two eyes — and gives the wink
 * a lid to lower.
 */
function ClaudeFigure() {
  const { t } = useT()
  const [clicks, setClicks] = useState(0)

  useEffect(() => {
    if (clicks === 0) return
    const timer = window.setTimeout(() => setClicks(0), CALM_MS)
    return () => window.clearTimeout(timer)
  }, [clicks])

  const mood = MOODS.find((m) => clicks >= m.from)

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Claude Code"
        onClick={() => setClicks((count) => count + 1)}
        className="block h-[200px] w-[200px] rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
      >
        <span className="block h-full w-full origin-bottom animate-hero-hop motion-reduce:animate-none">
          <span
            key={clicks}
            className={`block h-full w-full ${mood ? `${mood.motion} motion-reduce:animate-none` : ''}`}
          >
            <svg viewBox="0 0 16 16" className="h-full w-full" aria-hidden shapeRendering="crispEdges">
              <g fill="#D97757">
                <rect x="2" y="3.25" width="12" height="8" />
                <rect x="0" y="7.25" width="16" height="2" />
                <rect x="3" y="11.25" width="1" height="2" />
                <rect x="5" y="11.25" width="1" height="2" />
                <rect x="10" y="11.25" width="1" height="2" />
                <rect x="12" y="11.25" width="1" height="2" />
              </g>
              <g fill="#fff" className="animate-hero-look motion-reduce:animate-none">
                <rect x="4" y="5.4" width="1" height="1.9" />
                <rect
                  x="11"
                  y="5.4"
                  width="1"
                  height="1.9"
                  className="animate-hero-wink motion-reduce:animate-none"
                  style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
                />
              </g>
            </svg>
          </span>
        </span>
      </button>

      {mood && (
        // The bubble: a pixel one, so square corners, a hard 2px ink border and a tail
        // built from two squares stepping down to the figure's head. `role="status"`
        // so a screen reader hears the joke too. `steps(1)` on `hero-ouch` pops it in
        // frame by frame. ANCHORED BY ITS LEFT EDGE, where the tail is: the four lines
        // are different lengths, and a bubble pinned by its right edge walked its tail
        // across the figure's head as the line grew. Pinned here, the tail stays put and
        // the bubble grows away from the figure.
        <span
          key={mood.line}
          role="status"
          className="absolute -top-5 left-[68%] origin-bottom-left animate-hero-ouch whitespace-nowrap border-2 border-ink bg-white px-2.5 py-1 font-mono text-sm font-black tracking-tight text-ink"
        >
          {t(mood.line)}
          <span aria-hidden className="absolute -bottom-[6px] left-1 h-1 w-1 bg-ink" />
          <span aria-hidden className="absolute -bottom-[10px] left-0 h-1 w-1 bg-ink" />
        </span>
      )}
    </div>
  )
}

/**
 * The hero's backdrop: three soft discs of the page's blues, blurred, with a fade over
 * them so the band still lands on `canvas` at its bottom edge. `fadeTo` exists for a band
 * that sits on white instead.
 */
export function Bloom({ fadeTo = 'to-canvas' }: { fadeTo?: 'to-canvas' | 'to-white' }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <div className="absolute left-1/2 top-0 h-2/3 w-2/3 -translate-x-1/2 rounded-full bg-brand/20 blur-3xl" />
      <div className="absolute -left-1/4 top-1/4 h-1/2 w-1/2 rounded-full bg-accent/15 blur-3xl" />
      <div className="absolute -right-1/4 top-1/4 h-1/2 w-1/2 rounded-full bg-accent/15 blur-3xl" />
      <div className={`absolute inset-0 bg-gradient-to-b from-transparent via-transparent ${fadeTo}`} />
    </div>
  )
}
