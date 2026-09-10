'use client'

import { ChevronRight } from 'lucide-react'
import { ButtonNavLink } from '@/components/ui'
import { ALL_FEATURES_PATH, DESKTOP_BANDS, GUARDRAILS } from '@/lib/desktopPage'
import { PAGE_CHROME } from '@/lib/features'
import { useT } from '@/lib/i18n/useLanguage'
import { HomeHeading, HomeSection } from '../home/Shell'
import { Reveal } from '../Reveal'
import { DesktopFactList } from './FactList'

/**
 * THE GUARDRAILS, AND THE WAY OUT TO THE FULL LIST.
 *
 * Four facts a reader wants before installing anything that runs agents on their code:
 * that the first launch checks and installs what Claude Code needs, that they decide how
 * far an agent goes before it asks, that they can see what a run costs, and that the app
 * keeps itself up to date without being asked. Facts, not screens.
 *
 * SET LIKE THE BAND ABOVE IT, which is the change worth reading twice. These four were a
 * `FeatureLegend` — the bordered two-by-two `/features` uses for the permission modes:
 * a 16px glyph on an `accent` tile, the name at `text-sm`, the line under it at
 * `text-xs`. The product owner asked for the type and the glyph of the dark band instead
 * ("un gros icon et le text plus gros"), on white, in black. So both bands render
 * `DesktopFactList` and this one passes `tone="light"`, which is a mirror of the dark
 * recipe rather than a second design: `ink` where that one is `white`, `muted` where it
 * is `onink-body`.
 *
 * NO GROUND OF ITS OWN. `HomeSection` paints nothing and the page's body is white, which
 * is exactly what was asked for ("juste sur un fond blanc") — and it is what makes the
 * dark band above read as the register change it is. A plate here would have given the
 * page two sheets in a row.
 *
 * THE KEYBOARD USED TO BE THE FOURTH FACT and it is in the band above now, by request:
 * getting around without the mouse is something the app does AROUND the window, not a
 * guardrail. The automatic update took its place, which is a fact of this band's own kind
 * — see `GUARDRAILS` in `lib/desktopPage.ts`.
 *
 * THE BUTTON UNDER IT IS THE PAGE'S ONE LINK TO THE INVENTORY, opened on its desktop
 * family: a reader who has read five bands and wants the other twenty rows is the reader
 * `/features` was written for. Centred under the list, as the homepage's "built for" band
 * centres its own, and for the same reason: it is a footer to the band, not a heading's
 * companion. `FinalCtaSection` follows on the page, so the ask comes after.
 */
export function GuardrailsBand() {
  const { t } = useT()

  return (
    <HomeSection>
      <Reveal order={1}>
        <HomeHeading title={t(DESKTOP_BANDS.guardrails.title)} subtitle={t(DESKTOP_BANDS.guardrails.subtitle)} />
      </Reveal>

      {/* `mt-12` is what every other band on this page puts between its heading and its
          content — the legend that used to be here brought an `mt-8` of its own and had
          to be nudged. */}
      <DesktopFactList facts={GUARDRAILS} tone="light" className="mt-12" />

      <Reveal order={GUARDRAILS.length + 2} className="mt-12 flex justify-center">
        <ButtonNavLink href={ALL_FEATURES_PATH} variant="link" size="lg">
          {t(PAGE_CHROME.allFeatures)}
          <ChevronRight className="h-4 w-4 shrink-0" aria-hidden />
        </ButtonNavLink>
      </Reveal>
    </HomeSection>
  )
}
