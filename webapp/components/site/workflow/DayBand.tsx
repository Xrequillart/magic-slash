'use client'

import { useT } from '@/lib/i18n/useLanguage'
import { DAY_FACTS, WORKFLOW_BANDS } from '@/lib/workflowPage'
import { DesktopFactList } from '../desktop/FactList'
import { BAND_LEAD, BAND_TITLE, HomeSection } from '../home/Shell'
import { Reveal } from '../Reveal'

/**
 * AFTER THE LOOP, THE DAY: the five bands above are one ticket's life, and this is what
 * happens when a reader has several. Picking one back up, running them side by side, the
 * context kept in the app, the app calling when an agent stops.
 *
 * `/desktop`'S DARK BAND, verbatim in shape: `bg-ink`, the headline in `BAND_TITLE.onDark`,
 * and `DesktopFactList` in its dark tone, a glyph and a headline per fact, a paragraph
 * under the pair. The register change is the point. Five light bands with a plate each
 * have just walked the reader through the loop, and the page turning black is how it says
 * "and now the part around it". The closing band is dark too, so the page ends on the
 * same sheet it changed to here, with the white control band between them as a breath.
 *
 * THIS IS WHERE `/magic:continue` LIVES, the one command with no step. The old page owed
 * it a paragraph and said so; it is the first fact here, because re-entering a ticket is a
 * fact about a working day and not about a piece of work (`lib/workflow.ts`).
 */
export function DayBand() {
  const { t } = useT()

  return (
    <HomeSection className="bg-ink">
      <Reveal order={1}>
        <div className="max-w-2xl">
          <h2 className={BAND_TITLE.onDark}>{t(WORKFLOW_BANDS.day.title)}</h2>
          <p className={`mt-4 ${BAND_LEAD.onDark}`}>{t(WORKFLOW_BANDS.day.subtitle)}</p>
        </div>
      </Reveal>

      <DesktopFactList facts={DAY_FACTS} tone="dark" className="mt-14" />
    </HomeSection>
  )
}
