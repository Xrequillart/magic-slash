'use client'

import { ArrowRight } from 'lucide-react'
import { ButtonLink, ToneCard, type CardTone } from '@/components/ui'
import type { MessageKey } from '@/lib/i18n'
import { useT } from '@/lib/i18n/useLanguage'
import { Reveal } from '../Reveal'
import { HomeHeading, HomeSection } from '../home/Shell'
import { DESIGN_SYSTEM_DESKTOP_PATH } from './paths'

/**
 * ONE BAND PER HALF OF PRESTIGE: a heading, a subtitle and the way into that half's
 * gallery, over three coloured cards saying what it is for. The homepage's
 * `BuiltForSection` shape, with the way in beside the heading rather than under the
 * cards. Two bands, one component: the desktop and the web app are described the same
 * way so a reader compares them rather than decoding two layouts.
 *
 * THE WAY IN IS A BUTTON OR A "COMING SOON" PILL. The web gallery still `notFound()`s in
 * production (see `app/design-system/webapp/page.tsx`), so its band says so in the place
 * the button would be instead of opening a 404.
 *
 * THE CARDS ARE NOT LINKS, by request: the button is the one way in.
 */
type Card = {
  id: string
  tone: CardTone
  title: MessageKey
  description: MessageKey
  art: string
  /**
   * The drawing sits ON the card's bottom edge, with no margin under it: a figure cut
   * by the frame as if it reached in from below. A composition floating in its own
   * space keeps a margin all round instead.
   */
  flush?: true
}

type Band = {
  eyebrow: MessageKey
  title: MessageKey
  subtitle: MessageKey
  /** The gallery's path, or null while it is not published. */
  href: string | null
  /**
   * `thirds`: three stacked cards in a row, drawing under the copy. `halves`: two per
   * row, the drawing on the right of the copy (`ToneCard`'s `halves` layout).
   */
  grid: 'thirds' | 'halves'
  cards: readonly Card[]
}

/**
 * The tape measure for "made to measure" (as on the homepage), a team for "whoever
 * uses it", the notebook of ideas for "every choice explained". `illustration-team.svg`
 * ships cropped to its measured bounding box, `53 25 894 950`.
 */
const DESKTOP: Band = {
  eyebrow: 'site.designSystem.desktopEyebrow',
  title: 'site.designSystem.desktopTitle',
  subtitle: 'site.designSystem.desktopSubtitle',
  href: DESIGN_SYSTEM_DESKTOP_PATH,
  grid: 'thirds',
  cards: [
    { id: 'tailored', tone: 'sky', title: 'site.designSystem.tailoredTitle', description: 'site.designSystem.tailoredDesc', art: '/img/illustration-measure.svg', flush: true },
    { id: 'everyone', tone: 'amber', title: 'site.designSystem.everyoneTitle', description: 'site.designSystem.everyoneDesc', art: '/img/illustration-team.svg' },
    { id: 'why', tone: 'lemon', title: 'site.designSystem.whyTitle', description: 'site.designSystem.whyDesc', art: '/img/illustration-ideas.svg', flush: true },
  ],
}

/**
 * FOUR CARDS, NOT THREE, two to a row with the drawing on the right: a figure at a
 * laptop on bars of rising height for "made for the browser" — the bars read as the
 * widths the primitives hold at, 390 to 1440 (`illustration-breakpoints.svg`, cropped to
 * `25 58 950 884`) — the designer at her desk for the colours, the leap with a tick for "readable by everyone", and the figure climbing
 * out of a light bulb for the illustrations themselves. Three of the tones are the ones
 * the desktop band does not use, so the two bands do not read as one repeated.
 */
const WEBAPP: Band = {
  eyebrow: 'site.designSystem.webappEyebrow',
  title: 'site.designSystem.webappTitle',
  subtitle: 'site.designSystem.webappSubtitle',
  href: null,
  grid: 'halves',
  cards: [
    { id: 'browser', tone: 'mint', title: 'site.designSystem.browserTitle', description: 'site.designSystem.browserDesc', art: '/img/illustration-breakpoints.svg', flush: true },
    { id: 'colours', tone: 'rose', title: 'site.designSystem.coloursTitle', description: 'site.designSystem.coloursDesc', art: '/img/illustration-sketch.svg' },
    { id: 'readable', tone: 'mist', title: 'site.designSystem.readableTitle', description: 'site.designSystem.readableDesc', art: '/img/illustration-approved.svg' },
    { id: 'drawings', tone: 'lemon', title: 'site.designSystem.drawingsTitle', description: 'site.designSystem.drawingsDesc', art: '/img/illustration-lightbulb.svg' },
  ],
}

/** The drawing's width and margin, by whether it rests on the card's bottom edge. */
const ART_SIZE = {
  flush: 'max-w-[22rem] px-4',
  padded: 'max-w-[20rem] px-6 pb-6',
} as const

export function DesktopBand() {
  return <ProductBand band={DESKTOP} />
}

export function WebappBand() {
  return <ProductBand band={WEBAPP} />
}

function ProductBand({ band }: { band: Band }) {
  const { t } = useT()
  const halves = band.grid === 'halves'

  return (
    <HomeSection>
      <Reveal className="flex flex-col items-start gap-6 md:flex-row md:items-end md:justify-between">
        <HomeHeading eyebrow={t(band.eyebrow)} title={t(band.title)} subtitle={t(band.subtitle)} />
        {band.href ? (
          <ButtonLink href={band.href} variant="primary" size="lg" className="shrink-0">
            {t('site.designSystem.cta')}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </ButtonLink>
        ) : (
          // The button's height and radius, so the two bands line up, in the site's
          // quiet ink: a state, not a control.
          <span className="inline-flex h-[46px] shrink-0 items-center gap-2 rounded-button border border-hairline bg-canvas px-5 text-sm font-bold text-muted">
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-brand" />
            {t('site.designSystem.webappSoon')}
          </span>
        )}
      </Reveal>

      {/* `grid-cols-1` and `min-w-0` for the reason `BuiltForSection` gives.

          HALVES GO TO TWO COLUMNS ONLY FROM `lg`: the drawing sits beside the copy from
          `md`, and half of a tablet is too narrow for both. Below `lg` each card takes the
          full row, where the pair has the room it needs. */}
      <div className={`mt-12 grid grid-cols-1 gap-6 ${halves ? 'lg:grid-cols-2' : 'md:grid-cols-3'}`}>
        {band.cards.map((card, index) => (
          <Reveal key={card.id} order={index + 2} className="min-w-0">
            <ToneCard
              tone={card.tone}
              layout={halves ? 'halves' : 'stacked'}
              visual={halves && card.flush ? 'corner' : 'end'}
              title={t(card.title)}
              description={t(card.description)}
              className="h-full"
            >
              {/* `block`, or an inline image keeps the line box's descender gap under
                  it and the flush drawings float a few pixels off the edge. */}
              <img
                src={card.art}
                alt=""
                className={`mx-auto block w-full ${ART_SIZE[card.flush ? 'flush' : 'padded']} ${halves && !card.flush ? 'md:py-6' : ''}`}
              />
            </ToneCard>
          </Reveal>
        ))}
      </div>
    </HomeSection>
  )
}
