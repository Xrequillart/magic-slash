'use client'

import { Card, Eyebrow } from '@/components/ui'
import type { MessageKey } from '@/lib/i18n'
import { useT } from '@/lib/i18n/useLanguage'
import { HomeHeading, HomeSection } from './Shell'

/**
 * The three moments: you describe, it builds, you approve.
 *
 * Late in the funnel on purpose. The page used to OPEN on the mechanism ("7 skills.
 * Entire workflow.") and that is what made it read as a tool for engineers only; here
 * the reader has already seen what the product is and which piece of it they want, and
 * this is the section that tells them what using it feels like.
 *
 * `id="how"` is linked from the site header and from the footer, so it has to keep that
 * id whatever else moves.
 */

const STEPS: { n: string; title: MessageKey; description: MessageKey }[] = [
  { n: '01', title: 'site.how.step1Title', description: 'site.how.step1Desc' },
  { n: '02', title: 'site.how.step2Title', description: 'site.how.step2Desc' },
  { n: '03', title: 'site.how.step3Title', description: 'site.how.step3Desc' },
]

export function HowItWorksSection() {
  const { t } = useT()

  return (
    <HomeSection id="how">
      <HomeHeading title={t('site.how.title')} subtitle={t('site.how.subtitle')} />

      <div className="mt-10 grid gap-5 md:grid-cols-3">
        {STEPS.map((step) => (
          <Card key={step.n} className="p-6">
            {/* `Eyebrow` even though "01" is not a slash command: its recipe is the
                page's one monospace signature, and restating those five classes here
                meant retuning the eyebrow would silently leave the step numbers behind
                — which `components/ui.tsx`'s header forbids. `spacing=""` empties the
                slot, since the `h3` below already owns the gap. */}
            <Eyebrow spacing="">{step.n}</Eyebrow>
            <h3 className="mt-3 font-display text-lg font-bold text-ink">{t(step.title)}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">{t(step.description)}</p>
          </Card>
        ))}
      </div>
    </HomeSection>
  )
}
