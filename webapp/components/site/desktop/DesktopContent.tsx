'use client'

import { Columns, Download, Plug, ScrollText, Sparkles } from 'lucide-react'
import { ButtonNavLink } from '@/components/ui'
import type { MessageKey } from '@/lib/i18n'
import { useT } from '@/lib/i18n/useLanguage'
import { PLACEHOLDER_PAGES } from '@/lib/siteNav'
import { WORKFLOW_PATH } from '@/lib/workflow'
import { Reveal } from '../Reveal'
import { RichText } from '../RichText'
import { AppWindowMockup } from '../home/AppWindowMockup'
import { HomeSection, STRUCK_WORD } from '../home/Shell'

/**
 * magic-slash.io/desktop — the app, sold on what it takes off your mind.
 *
 * THE PAGE OPENS ON THE PAIN, NOT THE PRODUCT. The headline is the sentence a product
 * builder with three Claude Code sessions in three terminals says to themself at four in
 * the afternoon, with the verb struck through; the line under it says the app does the
 * remembering. The product owner picked this direction for THIS page and not the homepage
 * on purpose: relieving the mental load — looking at what changed rather than at what
 * each agent is doing — is what the desktop app is for, where the homepage's job is to
 * show the whole cycle. The design mockup he chose from called it "mental load".
 *
 * THEN A BEFORE AND AN AFTER. "Before" is four windows drawn grey and crooked on purpose —
 * terminals, a Jira board, a PR — with the two questions floating over them; "after" is
 * the app's own window in colour, sidebar and all, at the size the column allows. The
 * grey half is deliberately the uglier half of the screen: it is the thing the app
 * replaces, and it has to look like it.
 *
 * THE STRIKE-THROUGH IS AN `<em>`, drawn by `STRUCK_WORD` — the recipe this page and the
 * homepage's "built for" band share, in `home/Shell.tsx`, which is where the why of it
 * is written down.
 *
 * THE WINDOW THAT USED TO STAND HERE at up to 0.85 scale, alone under a two-line heading,
 * is now the "after" panel: the same drawing, smaller, beside what it replaces. The four
 * highlights under it stayed where they were.
 */
export function DesktopContent() {
  const { t } = useT()

  return (
    <HomeSection padding="hero" backdrop={<Aura />}>
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 text-center">
        <Reveal order={1}>
          <span className="inline-flex items-center rounded-full border border-hairline bg-white px-3.5 py-1.5 text-xs font-bold text-muted">
            {t('site.desktop.eyebrow')}
          </span>
        </Reveal>

        <Reveal order={2}>
          <RichText
            k="site.desktop.title"
            as="h1"
            className={`font-display text-4xl font-black leading-[1.05] tracking-tight text-ink md:text-[3.6rem] [text-wrap:balance] ${STRUCK_WORD}`}
          />
        </Reveal>

        <Reveal order={3}>
          <p className="mx-auto max-w-2xl text-lg leading-relaxed text-muted">
            {t('site.desktop.subtitle')}
          </p>
        </Reveal>

        <Reveal order={4} className="flex flex-wrap items-center justify-center gap-3">
          {/* The download PAGE, not the .dmg — same call as the homepage hero's primary. */}
          <ButtonNavLink href={PLACEHOLDER_PAGES.download.path} variant="primary" size="lg" icon={Download}>
            {t('site.hero.downloadCta')}
          </ButtonNavLink>
          <ButtonNavLink href={WORKFLOW_PATH} variant="secondary" size="lg">
            {t('site.desktop.howCta')}
          </ButtonNavLink>
        </Reveal>

        <Reveal order={5}>
          <p className="flex flex-wrap items-center justify-center gap-2.5 text-sm text-muted">
            <span>{t('site.desktop.reassureFree')}</span>
            <Dot />
            <span>{t('site.desktop.reassureMac')}</span>
            <Dot />
            <span>{t('site.desktop.reassureTrackers')}</span>
          </p>
        </Reveal>
      </div>

      {/* ONE ROW, TWO COLUMNS, ONE HEIGHT. `items-stretch` (the grid default, named here
          because it is the point) gives both columns the row's height, and the row's
          height is the "after" window's: its frame is `aspect-[16/10]` and nothing else
          in the row has a height of its own. Each column is a flex column — caption on
          top, panel filling the rest — so the two captions share a line and the two
          panels share a floor. The "before" pile draws itself in percentages of that
          panel, so it takes whatever height the window gives it. */}
      <Reveal order={6} className="mt-12 grid items-stretch gap-6 md:mt-16 md:grid-cols-[0.85fr_1.15fr]">
        <div className="flex flex-col">
          <Caption>{t('site.desktop.beforeLabel')}</Caption>
          <Before />
        </div>
        <div className="flex flex-col">
          <Caption tone="after">{t('site.desktop.afterLabel')}</Caption>
          <After />
        </div>
      </Reveal>

      <Reveal order={7} className="mt-16 sm:mt-20">
        <Highlights />
      </Reveal>
    </HomeSection>
  )
}

function Dot() {
  return <span aria-hidden className="h-[3px] w-[3px] rounded-full bg-muted/50" />
}

function Caption({ tone = 'before', children }: { tone?: 'before' | 'after'; children: React.ReactNode }) {
  return (
    <p
      className={`mb-2.5 text-left text-xs font-black uppercase tracking-[0.14em] ${
        tone === 'after' ? 'text-brand' : 'text-muted'
      }`}
    >
      {children}
    </p>
  )
}

/**
 * The four windows. Every position and size is a PERCENTAGE of the panel — both axes —
 * so the pile keeps its shape whatever height the row hands it, and nothing in it
 * reaches the panel's edge: the tallest window ends at 91%, the lowest bubble sits at
 * 5% from the floor. The panel is `grayscale` and dimmed as a whole rather than window
 * by window, so the two speech bubbles on top of it stay in full colour. The terminal
 * text is terminal text — `git status`, `gh pr view` — and stays as it is in every
 * language.
 *
 * `flex-1` takes the column's height under the caption; `min-h` is for the one layout
 * where there is no window beside it to set that height — a single column, under `md`.
 */
function Before() {
  const { t } = useT()

  return (
    <div className="relative min-h-[260px] flex-1 overflow-hidden rounded-2xl md:min-h-0">
      <div className="absolute inset-0 opacity-75 grayscale">
        <Pane title="Terminal — zsh" className="left-0 top-[7%] h-[62%] w-[62%]">
          ❯ claude
          <br />…
          <br />
          <span className="text-amber-300">? Continue? (y/n)</span>
          <br />▍
        </Pane>
        <Pane title="Terminal — zsh (2)" className="left-[18%] top-[20%] h-[62%] w-[62%]">
          ❯ git status
          <br />
          On branch feat/auth
          <br />
          Your branch is ahead by 3 commits
          <br />
          <span className="text-red-400">✗ 2 tests failed</span>
        </Pane>
        <Pane title="Jira — MS-268" light className="left-[38%] top-[33%] h-[58%] w-[60%]">
          MS-268 · In progress
          <br />
          MS-270 · To do
          <br />
          MS-271 · In review
          <br />
          MS-273 · To do
          <br />
          MS-274 · To do
        </Pane>
        <Pane title="Terminal — zsh (3)" className="left-[8%] top-[50%] h-[40%] w-[55%]">
          ❯ gh pr view 409
          <br />
          #409 · changes requested
          <br />2 comments unresolved
        </Pane>
      </div>
      <Bubble className="right-[6%] top-[8%]">{t('site.desktop.bubbleWhich')}</Bubble>
      <Bubble className="bottom-[5%] left-[4%]">{t('site.desktop.bubbleBranch')}</Bubble>
    </div>
  )
}

function Pane({
  title,
  light = false,
  className,
  children,
}: {
  title: string
  light?: boolean
  className: string
  children: React.ReactNode
}) {
  return (
    <div
      className={`absolute overflow-hidden rounded-[10px] border px-3 pb-3 pt-7 font-mono text-[0.62rem] leading-relaxed shadow-pane ${
        light ? 'border-hairline bg-white text-[#374151]' : 'border-white/10 bg-[#1c1f26] text-[#9aa0ad]'
      } ${className}`}
    >
      <span className="absolute left-3 top-2 font-sans text-[0.58rem] font-bold text-[#6b7280]">{title}</span>
      {children}
    </div>
  )
}

function Bubble({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span
      className={`absolute rounded-full border border-hairline bg-white px-3 py-1.5 text-xs font-bold text-[#374151] shadow-bubble ${className}`}
    >
      {children}
    </span>
  )
}

/**
 * THE APP'S WINDOW, scaled to the column — the WHOLE column, to its right edge, which is
 * what the product owner asked for once the fixed-size frame left a strip of canvas
 * beside it.
 *
 * `AppWindowMockup` draws itself at a fixed 1280×800 (see `WINDOW` there), and a
 * transform does not shrink the layout box, so the frame has to be sized from the
 * column and the drawing scaled to the frame. The frame is a CONTAINER
 * (`container-type: inline-size`), which makes its own width readable inside it as
 * `100cqw`; the drawing is then scaled by `100cqw / 1280px` — exactly the ratio that
 * lays 1280 drawn pixels across however wide the column is, at every width, with no
 * breakpoint table. (The band that stood here before had one, eight rungs long, because
 * it predates the unit.) `aspect-[16/10]` is the drawing's own 1280×800, so the whole
 * window shows — the product owner asked for no crop at either edge — and it is this
 * frame's height that the row, and the "before" pile beside it, take.
 *
 * `tan(atan2(100cqw, 1280px))` AND NOT `calc(100cqw / 1280)`, which is what this read
 * first and what rendered the window at full size: `calc` cannot divide a length by a
 * length, and a length divided by a number is still a length, which `scale()` rejects
 * and the browser drops whole. `atan2` takes two lengths and returns an angle; `tan`
 * of that angle is their ratio as a bare number. It is the one way CSS has to turn two
 * lengths into a number, and every engine has shipped it. `aspect-[1280/705]` is the frame's height: short of the
 * drawing's 800, so the window's bottom is cut by the band's floor and the window reads
 * as rising out of it — the crop the mockup the product owner chose has.
 *
 * `md:mx-0` is gone with the fixed width: a block as wide as its column has nothing to
 * centre.
 */
const WINDOW_WIDTH = 1280

function After() {
  return (
    <div
      className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl shadow-window"
      style={{ containerType: 'inline-size' }}
    >
      <div
        className="absolute left-0 top-0 origin-top-left"
        style={{ transform: `scale(tan(atan2(100cqw, ${WINDOW_WIDTH}px)))` }}
      >
        <AppWindowMockup />
      </div>
    </div>
  )
}

const HIGHLIGHTS: readonly { id: string; icon: typeof Columns; label: MessageKey }[] = [
  { id: 'parallel', icon: Columns, label: 'site.desktop.highlightParallel' },
  { id: 'context', icon: ScrollText, label: 'site.desktop.highlightContext' },
  { id: 'trackers', icon: Plug, label: 'site.desktop.highlightTrackers' },
  { id: 'commands', icon: Sparkles, label: 'site.desktop.highlightCommands' },
]

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
