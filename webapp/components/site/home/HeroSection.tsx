'use client'

import { Check, Download } from 'lucide-react'
import { ButtonNavLink } from '@/components/ui'
import { MAGIC_COMMANDS, type MagicCommandId } from '@/lib/commands'
import type { MessageKey } from '@/lib/i18n'
import { useT } from '@/lib/i18n/useLanguage'
import { PLACEHOLDER_PAGES } from '@/lib/siteNav'
import { WORKFLOW_PATH } from '@/lib/workflow'
import { JiraMark } from '../features/TicketCardMockup'
import { GithubMark } from '../features/TasksModalMockup'
import { Reveal } from '../Reveal'
import { HomeSection } from './Shell'

/**
 * The landing page's first screen, in two columns: the pitch on the left, the cycle on
 * the right.
 *
 * THE PITCH IS THE CYCLE. The headline says what goes in (a Jira ticket) and what comes
 * out (a merged PR), and that the reader said one command in between; the ladder beside
 * it draws the seven commands that ran. That is the whole argument of the page — an
 * ecosystem that closes the loop, not a chat window — and it replaced a centred, type-only
 * hero whose one line ("From idea to merged PR.") named the loop without showing it. The
 * three directions the product owner weighed are in the design mockup he chose from;
 * this is the second of them, "the whole cycle".
 *
 * THE COMMAND IS DRAWN, NOT TRANSLATED. `site.hero.title` is the first sentence and
 * `site.hero.titleTail` the second minus its last word; the `<code>` that closes it comes
 * from `lib/commands.ts`, where a typo is a compile error, and never from a catalogue.
 * `lib/skillsBand.test.ts` states the rule for the band below; the hero follows it.
 *
 * SEVEN CARDS AND NOT EIGHT. `/magic:continue` is a way back INTO the cycle — resuming a
 * ticket already started — and not a step of it, so the ladder leaves it out. THE COPY
 * STILL SAYS EIGHT, in the pill and in the subtitle, and the two do not contradict each
 * other: the words count what you install, the drawing shows the path one ticket takes
 * through it. The skills band lower down says eight for the same reason.
 *
 * THE TWO BUTTONS: `primary` opens `/download` — the page, not the .dmg, so the reader
 * meets the prerequisites and what the first launch sets up before the file lands in
 * their folder — and `secondary` opens `/workflow`, where the ladder is set out at length. The
 * earlier hero sent its primary to the login page; the product owner moved it to the
 * download when he chose the mockup — asking for an account before the product has been
 * seen was the one friction on the page nothing else earned. Both `size="lg"`, and the
 * same 46px once `secondary` spends its border on `border-hairline` and `primary` on
 * `border-transparent` — see `BUTTON_BASE`.
 *
 * Both are `ButtonNavLink`: two routes on this host, both with client-side navigation.
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
      <div className="grid items-center gap-12 md:grid-cols-[1.05fr_0.95fr] md:gap-14">
        <div className="flex flex-col items-start gap-6">
          <Reveal order={1}>
            <HeroEyebrow />
          </Reveal>

          <Reveal order={2}>
            {/* `text-wrap: balance` is deliberately NOT here: with a `<code>` token at the
                end, balancing would push it alone onto a last line more often than not,
                and a command on its own line reads as a caption rather than the sentence's
                last word. */}
            <h1 className="font-display text-4xl font-black leading-[1.05] tracking-tight text-ink md:text-[3.4rem]">
              {t('site.hero.title')} {t('site.hero.titleTail')}{' '}
              {/* `whitespace-nowrap` on the token and the full stop together, so the
                  sentence can never break between them. */}
              <span className="whitespace-nowrap">
                <code className="rounded-lg border border-hairline bg-white px-[0.4em] py-[0.05em] align-[0.06em] font-mono text-[0.72em] font-bold tracking-normal text-brand">
                  {START.command}
                </code>
                .
              </span>
            </h1>
          </Reveal>

          <Reveal order={3}>
            <p className="max-w-xl text-lg leading-relaxed text-muted">{t('site.hero.subtitle')}</p>
          </Reveal>

          <Reveal order={4} className="flex flex-wrap items-center gap-3">
            <ButtonNavLink href={PLACEHOLDER_PAGES.download.path} variant="primary" size="lg" icon={Download}>
              {t('site.hero.downloadCta')}
            </ButtonNavLink>
            <ButtonNavLink href={WORKFLOW_PATH} variant="secondary" size="lg">
              {t('site.hero.workflowCta')}
            </ButtonNavLink>
          </Reveal>

          <Reveal order={5}>
            <Integrations />
          </Reveal>
        </div>

        <Ladder />
      </div>
    </HomeSection>
  )
}

const START = MAGIC_COMMANDS.find((command) => command.id === 'start')!

/** The three marks, each on a white tile; the same three the `Integrations` row names. */
function HeroEyebrow() {
  const { t } = useT()
  return (
    <span className="inline-flex items-center gap-2.5 rounded-full border border-hairline bg-white py-1.5 pl-2 pr-3.5 text-xs font-bold text-muted">
      <span className="flex gap-1">
        <MarkTile>
          <ClaudeCodeMark />
        </MarkTile>
        <MarkTile>
          <JiraMark className="h-3.5 w-3.5" />
        </MarkTile>
        <MarkTile>
          <GithubMark className="h-3.5 w-3.5 text-ink" />
        </MarkTile>
      </span>
      {t('site.hero.eyebrow')}
    </span>
  )
}

function MarkTile({ children }: { children: React.ReactNode }) {
  return (
    <span className="grid h-[22px] w-[22px] place-items-center rounded-md border border-hairline bg-canvas">
      {children}
    </span>
  )
}

/**
 * Claude Code has no drawn mark in the codebase; it exists as a bitmap, and this is the
 * same file the app band's chip row uses (`AppSection.tsx`) for the same reason it gives.
 */
function ClaudeCodeMark({ className = 'h-3.5 w-3.5' }: { className?: string }) {
  return <img src="/img/claudecode-color.png" alt="" className={`${className} object-contain`} />
}

/** Brand names, so no catalogue: they are spelled the same way in every language. */
function Integrations() {
  return (
    <ul className="flex flex-wrap items-center gap-5 text-sm font-bold text-ink">
      <li className="flex items-center gap-2">
        <ClaudeCodeMark className="h-[18px] w-[18px]" />
        Claude Code
      </li>
      <li className="flex items-center gap-2">
        <JiraMark className="h-[18px] w-[18px]" />
        Jira
      </li>
      <li className="flex items-center gap-2">
        <GithubMark className="h-[18px] w-[18px]" />
        GitHub
      </li>
    </ul>
  )
}

/**
 * One rung: which command, what it leaves behind, and which tracker that lands in. The
 * command's text and icon come from `MAGIC_COMMANDS`; only the one-line "what" is copy.
 */
type Rung = { id: MagicCommandId; what: MessageKey; tracker: 'jira' | 'github' }

const HERO_LADDER: readonly Rung[] = [
  { id: 'plan', what: 'site.hero.skillPlan', tracker: 'jira' },
  { id: 'start', what: 'site.hero.skillStart', tracker: 'github' },
  { id: 'commit', what: 'site.hero.skillCommit', tracker: 'github' },
  { id: 'pr', what: 'site.hero.skillPr', tracker: 'github' },
  { id: 'review', what: 'site.hero.skillReview', tracker: 'github' },
  { id: 'resolve', what: 'site.hero.skillResolve', tracker: 'github' },
  { id: 'done', what: 'site.hero.skillDone', tracker: 'jira' },
]

/**
 * The reveal the ladder rides in on. `Reveal` rises an element 12px by default; the
 * rungs come up from 28px so the column visibly climbs, one card after the next, and the
 * entrance is the same one the copy uses — same keyframes, same 150ms step, same replay
 * on a language change — so nothing here needs its own animation.
 */
const RISE = '[--reveal-from:1.75rem]'

/** The copy's entrance runs orders 1–5; the ladder continues the count rather than restarting it. */
const LADDER_FIRST_ORDER = 5

function Ladder() {
  const { t } = useT()

  return (
    <div className="relative flex flex-col gap-2.5">
      {/* The rail: one thin line down the column of numerals, from under the first
          rung to above the last. It fades at both ends so it reads as a thread the
          cards hang on rather than a border with two loose ends. */}
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-10 left-[1.9rem] top-10 w-px bg-gradient-to-b from-brand/0 via-brand/40 to-brand/0"
      />

      <Reveal order={LADDER_FIRST_ORDER} className={RISE}>
        <div className="flex items-center gap-3 px-1">
          <span className="font-display text-xl font-black tracking-tight text-ink">
            {t('site.hero.ladderStart')}
          </span>
          <span className="h-px flex-1 bg-hairline" />
        </div>
      </Reveal>

      {HERO_LADDER.map((rung, index) => {
        const command = MAGIC_COMMANDS.find((c) => c.id === rung.id)!
        return (
          <Reveal key={rung.id} order={LADDER_FIRST_ORDER + 1 + index} className={RISE}>
            <div className="relative flex items-center gap-3.5 rounded-xl border border-hairline bg-white px-3.5 py-3 shadow-card">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-brand/15 bg-canvas font-mono text-xs font-black text-brand">
                {String(index + 1).padStart(2, '0')}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-mono text-[0.8rem] font-bold text-ink">
                  {command.command}
                </span>
                <span className="block text-xs text-muted">{t(rung.what)}</span>
              </span>
              {rung.tracker === 'jira' ? (
                <JiraMark className="h-[18px] w-[18px] shrink-0" />
              ) : (
                <GithubMark className="h-[18px] w-[18px] shrink-0 text-ink" />
              )}
            </div>
          </Reveal>
        )
      })}

      <Reveal order={LADDER_FIRST_ORDER + 1 + HERO_LADDER.length} className={RISE}>
        <div className="flex items-center gap-3 px-1">
          <span className="h-px flex-1 bg-hairline" />
          <span className="flex items-center gap-2 font-display text-xl font-black tracking-tight text-ink">
            {/* The check is the only green on the page above the fold, which is what
                makes it read as "done" rather than as decoration. */}
            <span className="grid h-6 w-6 place-items-center rounded-full bg-green text-white shadow-ring-green">
              <Check className="h-3.5 w-3.5" strokeWidth={3} />
            </span>
            {t('site.hero.ladderEnd')}
          </span>
        </div>
      </Reveal>
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
