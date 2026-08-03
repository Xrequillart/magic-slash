import type { Metadata } from 'next'
import { Hero } from '@/components/site/home/Hero'
import { FlowSection } from '@/components/site/home/FlowSection'
import { WhySection } from '@/components/site/home/WhySection'
import { DesktopAppSection } from '@/components/site/home/DesktopAppSection'
import { StackSection } from '@/components/site/home/StackSection'
import { FaqSection } from '@/components/site/home/FaqSection'
import { CtaSection } from '@/components/site/home/CtaSection'

/**
 * magic-slash.io — the landing page, ported from `docs/index.html`.
 *
 * `page-wrapper` only ever wrapped the hero and the sections below it; the header sits
 * outside it and the other four pages do not use it at all. Its job is
 * `overflow: clip`, which keeps the hero's decorative overflow from widening the
 * document — so it has to stay, and it has to stay HERE rather than in the layout.
 *
 * `content-sections` groups the last four the same way the original did.
 */

export const metadata: Metadata = {
  title: 'magic-slash',
  description: 'From ticket to merge — without the busywork.',
}

export default function Home() {
  return (
    <div className="page-wrapper">
      <Hero />
      <FlowSection />
      <WhySection />
      <div className="content-sections">
        <DesktopAppSection />
        <StackSection />
        <FaqSection />
        <CtaSection />
      </div>
    </div>
  )
}
