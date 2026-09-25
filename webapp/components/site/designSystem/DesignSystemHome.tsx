'use client'

import { useEffect } from 'react'
import { ArrowRight } from 'lucide-react'
import { ButtonLink } from '@/components/ui'
import { useT } from '@/lib/i18n/useLanguage'
import { Reveal } from '../Reveal'
import { SiteHeader } from '../SiteHeader'
import { SiteFooter } from '../SiteFooter'
import { HomeSection } from '../home/Shell'
import { DesktopBand, WebappBand } from './ProductBand'
import { DESIGN_SYSTEM_DESKTOP_PATH } from './paths'
import { ThemePlayground } from './ThemePlayground'

/**
 * THE NAME, HIGHLIGHTED: a marker stroke behind the lower half of the word, drawn from
 * the left once the headline has arrived. It borrows `STRUCK_WORD`'s mechanics in
 * `home/Shell.tsx` — a `::before` scaled by `animate-strike-in`, because a bar that
 * fades in has already covered the word before you see it — and sits under the letters
 * (`isolate` plus `-z-10`) rather than across them.
 */
const NAME_HIGHLIGHT = [
  'relative isolate inline-block',
  "before:absolute before:-inset-x-[0.08em] before:bottom-[0.1em] before:-z-10 before:h-[0.5em] before:origin-left before:rounded-sm before:bg-brand-20 before:content-['']",
  'before:animate-strike-in before:motion-reduce:animate-none',
].join(' ')

/**
 * Prestige's home page: the homepage hero's shape, pitch left and drawing right, inside
 * the public site's header and footer, then three bands:
 *
 *   • `DesktopBand`, right under the hero by request: three cards on what the desktop
 *     half is for, and the button into its gallery.
 *   • `WebappBand`, the same band for the web half, "coming soon" in place of its button.
 *   • `ThemePlayground` SHOWS the hero's claim: real components, eight themes, one click.
 *
 * THE HEADER AND FOOTER ARE MOUNTED HERE, not by a layout: a `design-system/layout.tsx`
 * would wrap the two galleries under it too, and they are full-window shells of their
 * own.
 *
 * ONE BUTTON, to the desktop gallery. `ButtonLink` and not `ButtonNavLink`: the gallery
 * is a different shell, and a hard navigation is what it gets anyway.
 *
 * THE DRAWING is `illustration-design-system.svg`, cropped to its measured bounding box
 * (`25 34 950 932`) like `illustration-magic.svg`, and hidden below `lg` for the reason
 * `HeroSection` gives.
 */
export function DesignSystemHome() {
  const { t } = useT()

  // The tab title in the reader's language, which `DocumentTitle` would otherwise set:
  // see `app/design-system/page.tsx`.
  useEffect(() => {
    document.title = t('site.meta.designSystemTitle')
  }, [t])

  return (
    <div data-site className="bg-white">
      <SiteHeader />
      <HomeSection padding="hero">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-14">
          <div className="flex flex-col items-start gap-6">
            <Reveal order={1}>
              <span className="inline-flex items-center rounded-full border border-hairline bg-white px-3.5 py-1.5 text-xs font-bold text-muted">
                {t('site.designSystem.eyebrow')}
              </span>
            </Reveal>

            <Reveal order={2}>
              <h1 className="font-display text-4xl font-black leading-[1.05] tracking-tight text-ink md:text-[3.4rem] [text-wrap:balance]">
                {/* The name, spelled the same in every language, so not in the catalogue. */}
                <span className={NAME_HIGHLIGHT}>Prestige.</span>
                <br />
                {t('site.designSystem.title')}
              </h1>
            </Reveal>

            <Reveal order={3}>
              <p className="max-w-xl text-lg leading-relaxed text-muted">{t('site.designSystem.subtitle')}</p>
            </Reveal>

            <Reveal order={4}>
              <ButtonLink href={DESIGN_SYSTEM_DESKTOP_PATH} variant="primary" size="lg">
                {t('site.designSystem.cta')}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </ButtonLink>
            </Reveal>
          </div>

          {/* `alt=""`: a decoration beside a headline that says what it says. */}
          <Reveal order={5} className="hidden justify-self-center lg:block lg:justify-self-end">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/img/illustration-design-system.svg" alt="" className="w-full max-w-[480px]" />
          </Reveal>
        </div>
      </HomeSection>
      <DesktopBand />
      <WebappBand />
      <ThemePlayground />
      <SiteFooter serverYear={new Date().getFullYear()} />
    </div>
  )
}
