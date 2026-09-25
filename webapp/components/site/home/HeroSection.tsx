'use client'

import { Download } from 'lucide-react'
import { ButtonNavLink } from '@/components/ui'
import { useT } from '@/lib/i18n/useLanguage'
import { DOWNLOAD_PATH } from '@/lib/siteNav'
import { WORKFLOW_PATH } from '@/lib/workflow'
import { JiraMark } from '../features/TicketCardMockup'
import { GithubMark } from '../features/TasksModalMockup'
import { Reveal } from '../Reveal'
import { RichText } from '../RichText'
import { HomeSection } from './Shell'

/**
 * The landing page’s first screen, in two columns: the pitch on the left, the drawing on
 * the right.
 *
 * THE PITCH IS THE FRONTIER, not the cycle: the headline names the two ends — an idea, a
 * merged PR — and what is left for the reader to do (decide).
 *
 * THE DRAWING IS AN ILLUSTRATION NOW, the magician pulling something out of a hat from
 * the site's own set (`illustration-magic.svg`), where it was an animated orbit: six
 * artefact cards on a turning ring around a Claude Code figure that hopped, winked and
 * answered clicks. The owner cut the orbit and the figure together, and the blue wash
 * behind the band with them, so the hero opens on the page's own ground.
 *
 * FIVE THINGS ABOVE THE FOLD: headline, subtitle, two buttons, one row of the three
 * marks, and the drawing. `Integrations` is the ONLY place the three are named.
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
    // `padding="hero"` for the taller top (the bar is `fixed` at `h-16`). No backdrop and
    // no wash: the band is on the page's own ground.
    <HomeSection padding="hero">
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

        {/* THE DRAWING, and its file is CROPPED rather than sized down here: the source is
            a 1000×1000 canvas, and `illustration-magic.svg` ships with a `viewBox` of
            `25 35 950 930`, its measured bounding box — nothing here corrects for dead
            margin.

            BELOW `lg` IT IS NOT SHOWN, the rule the orbit before it kept: the owner cut the
            hero illustrations on small screens, where the headline alone says it. The
            grid goes to two columns at `lg` for the same reason.

            `alt=""`: a decoration beside a headline that says what it says. */}
        <Reveal order={5} className="hidden justify-self-center lg:block lg:justify-self-end">
          <img src="/img/illustration-magic.svg" alt="" className="w-full max-w-[480px]" />
        </Reveal>
      </div>
    </HomeSection>
  )
}

/**
 * Claude Code has no drawn mark in the codebase; it exists as a bitmap, and this is the
 * same file the app band's chip row uses (`AppSection.tsx`) for the same reason it gives.
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
