'use client'

import { Download } from 'lucide-react'
import { ButtonNavLink } from '@/components/ui'
import { useT } from '@/lib/i18n/useLanguage'
import { DOWNLOAD_PATH } from '@/lib/siteNav'
import { WORKFLOW_STEPS } from '@/lib/workflow'
import { WORKFLOW_PAGE_CHROME, stepAnchor } from '@/lib/workflowPage'
import { Reveal } from '../Reveal'
import { HomeSection } from '../home/Shell'

/**
 * THE OPENING OF `/workflow`: the promise, and the two ways on.
 *
 * `/desktop`'S HERO SHAPE. Centred axis, a pill above the headline, one paragraph, a
 * primary and a secondary button side by side, the reassurance line under them, an aura
 * of blurred discs behind: that is `DesktopHero`, and a reader who has seen one product
 * page on this site should recognise the next one's opening. The pill is the homepage
 * hero's, with the Claude Code mark on its tile, because the eight skills are the thing
 * the page is about; the aura is that page's in this page's hues (see `Aura`).
 *
 * THE SECONDARY BUTTON SCROLLS, it does not leave: the ask on this page is the page. The
 * primary is the download, the same call as the homepage's and `/desktop`'s.
 *
 * THERE WAS A RAIL OF THE FIVE STEPS UNDER THIS, five coloured pills in a row, each a link
 * to its band, and the product owner cut it on sight ("horrible et pas utile"). The
 * argument for it was a table of contents drawn as the loop; the argument against is that
 * the first band is one scroll away and already says what the first pill said. The button
 * above keeps the one thing the rail did that the page needed: a way down to the steps.
 */
export function WorkflowHero() {
  const { t } = useT()

  return (
    <HomeSection padding="hero" backdrop={<Aura />}>
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 text-center">
        <Reveal order={1}>
          {/* The homepage hero's pill, with one mark instead of three: the skills are
              Claude Code's, and the tile is the same 22px tile on `canvas` that row uses.
              The bitmap is the one `HeroSection` and `AppSection` both point at. */}
          <span className="inline-flex items-center gap-2.5 rounded-full border border-hairline bg-white py-1.5 pl-2 pr-3.5 text-xs font-bold text-muted">
            <span className="grid h-[22px] w-[22px] place-items-center rounded-md border border-hairline bg-canvas">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/img/claudecode-color.png" alt="" className="h-3.5 w-3.5 object-contain" />
            </span>
            {t(WORKFLOW_PAGE_CHROME.eyebrow)}
          </span>
        </Reveal>

        <Reveal order={2}>
          <h1 className="font-display text-4xl font-black leading-[1.05] tracking-tight text-ink md:text-[3.6rem] [text-wrap:balance]">
            {t(WORKFLOW_PAGE_CHROME.title)}
          </h1>
        </Reveal>

        <Reveal order={3}>
          <p className="mx-auto max-w-2xl text-lg leading-relaxed text-muted">
            {t(WORKFLOW_PAGE_CHROME.subtitle)}
          </p>
        </Reveal>

        <Reveal order={4} className="flex flex-wrap items-center justify-center gap-3">
          <ButtonNavLink href={DOWNLOAD_PATH} variant="primary" size="lg" icon={Download}>
            {t('site.hero.downloadCta')}
          </ButtonNavLink>
          <ButtonNavLink href={`#${stepAnchor(WORKFLOW_STEPS[0].id)}`} variant="secondary" size="lg">
            {t(WORKFLOW_PAGE_CHROME.stepsCta)}
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
    </HomeSection>
  )
}

function Dot() {
  return <span aria-hidden className="h-[3px] w-[3px] rounded-full bg-muted/50" />
}

/**
 * THE BACKDROP: `/desktop`'s aura, the four blurred discs fading into white, in this
 * page's own hues. That page throws violet, pink and amber across its field; this one is
 * asked to be "un mélange de bleu et de vert clair", so the wide core is the brand blue,
 * the two sides are the pale mint (`softgreen`, the light stop of `tone-mint`) and the
 * status green at a wash, and the accent blue sits under the middle. The fade starts
 * half-way down for the reason that page gives: the last of the colour should be gone
 * well before the band's edge rather than at it.
 */
function Aura() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <div className="absolute left-1/2 top-1/4 h-2/3 w-[80%] -translate-x-1/2 rounded-full bg-brand/25 blur-3xl" />
      <div className="absolute -left-[10%] top-1/3 h-1/2 w-3/5 rounded-full bg-softgreen blur-3xl" />
      <div className="absolute -right-[10%] top-1/3 h-1/2 w-3/5 rounded-full bg-green/20 blur-3xl" />
      <div className="absolute left-1/2 top-[45%] h-1/2 w-2/5 -translate-x-1/2 rounded-full bg-accent/25 blur-3xl" />
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-b from-transparent to-white" />
    </div>
  )
}
