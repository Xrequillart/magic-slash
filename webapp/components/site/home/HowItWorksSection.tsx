'use client'

import { ArrowRight } from 'lucide-react'
import { ButtonLink, Card, Eyebrow } from '@/components/ui'
import type { MessageKey } from '@/lib/i18n'
import { useT } from '@/lib/i18n/useLanguage'
import { PAGE_CHROME } from '@/lib/features'
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
 *
 * AND THIS IS THE HOMEPAGE'S WAY OUT TO `/features`, which is worth explaining because
 * the obvious place was the closing band. Three answers were possible and two are wrong:
 *
 *   • the HERO's buttons are a product decision documented at length in
 *     `HeroSection.tsx` — start free, or download — and a third would undo it;
 *   • the CLOSING band is documented as ONE BUTTON, NOT TWO (`FinalCtaSection.tsx`), on
 *     the argument that the end of a landing page is the one place a second option is a
 *     question rather than a convenience. A features link there is exactly that
 *     question, asked after the reader had decided.
 *
 * So it lands here, at the end of the band that has just said what using the product
 * feels like — which is precisely where a reader asks "what else does it do?" — and the
 * page keeps one ask per band. `secondary`, since the page's `primary` belongs to the
 * hero's CTA, and `site.nav.allFeatures` for the label: the header's row for the same
 * destination says the same words, and one string for one place is the point of reusing
 * the key rather than writing a second one.
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

      {/* The margin is on a WRAPPER rather than on the button's own `className`, which
          is how the retired commands band closed too: `ButtonLink` is `inline-flex`, and
          a block around it is what gives the gap something to push against. An
          `ArrowRight` because this one LEAVES the page — every other control on the
          homepage either scrolls it or downloads the app. */}
      <div className="mt-10">
        <ButtonLink href="/features" variant="secondary" icon={ArrowRight}>
          {t(PAGE_CHROME.allFeatures)}
        </ButtonLink>
      </div>
    </HomeSection>
  )
}
