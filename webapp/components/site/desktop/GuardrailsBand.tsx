'use client'

import { ChevronRight } from 'lucide-react'
import { ButtonNavLink } from '@/components/ui'
import { ALL_FEATURES_PATH, DESKTOP_BANDS, GUARDRAILS } from '@/lib/desktopPage'
import { PAGE_CHROME } from '@/lib/features'
import { useT } from '@/lib/i18n/useLanguage'
import { FeatureLegend, LegendTile } from '../features/FeatureLegend'
import { HomeHeading, HomeSection } from '../home/Shell'
import { Reveal } from '../Reveal'
import { DESKTOP_ICONS } from './icons'

/**
 * THE GUARDRAILS, AND THE WAY OUT TO THE FULL LIST.
 *
 * Four facts a reader wants before installing anything that runs agents on their code:
 * that the first launch checks and installs what Claude Code needs, that they decide how
 * far an agent goes before it asks, that they can see what a run costs, and that none of
 * it needs the mouse. Facts, not screens — so they are a legend, the bordered two-by-two
 * `/features` uses for the permission modes, with a glyph on a tile where that legend
 * has one: a `FeatureLegend` in `accent`, the same tile `LaunchModesGrid` draws.
 *
 * THE BUTTON UNDER IT IS THE PAGE'S ONE LINK TO THE INVENTORY, opened on its desktop
 * family: a reader who has read five bands and wants the other twenty rows is the reader
 * `/features` was written for. Centred under the legend, as the homepage's "built for"
 * band centres its own, and for the same reason: it is a footer to the band, not a
 * heading's companion. `FinalCtaSection` follows on the page, so the ask comes after.
 */
export function GuardrailsBand() {
  const { t } = useT()

  return (
    <HomeSection>
      <Reveal order={1}>
        <HomeHeading title={t(DESKTOP_BANDS.guardrails.title)} subtitle={t(DESKTOP_BANDS.guardrails.subtitle)} />
      </Reveal>

      <Reveal order={2}>
        {/* `FeatureLegend` brings its own `mt-8`; the extra `mt-4` here lands the legend
            at the `mt-12` every other band on this page puts between its heading and its
            content. */}
        <div className="mt-4">
          <FeatureLegend
            items={GUARDRAILS.map((row) => {
              const Icon = DESKTOP_ICONS[row.icon]
              return {
                id: row.id,
                mark: (
                  <LegendTile tone="bg-accent/10 text-accent">
                    <Icon className="h-4 w-4" />
                  </LegendTile>
                ),
                name: row.title,
                description: row.description,
              }
            })}
          />
        </div>
      </Reveal>

      <Reveal order={3} className="mt-12 flex justify-center">
        <ButtonNavLink href={ALL_FEATURES_PATH} variant="link" size="lg">
          {t(PAGE_CHROME.allFeatures)}
          <ChevronRight className="h-4 w-4 shrink-0" aria-hidden />
        </ButtonNavLink>
      </Reveal>
    </HomeSection>
  )
}
