import type { Metadata } from 'next'
import { Hero } from '@/components/site/home/Hero'
import { HowSection } from '@/components/site/home/HowSection'
import { YourProductSection } from '@/components/site/home/YourProductSection'
import { ParallelSection } from '@/components/site/home/ParallelSection'
import { YourWaySection } from '@/components/site/home/YourWaySection'
import { WhereItStandsSection } from '@/components/site/home/WhereItStandsSection'
import { WhySection } from '@/components/site/home/WhySection'
import { FaqSection } from '@/components/site/home/FaqSection'
import { CtaSection } from '@/components/site/home/CtaSection'

/**
 * magic-slash.io — the landing page.
 *
 * Eight sections, in the order they argue: the promise, then how it actually works,
 * then that it runs on the product you already have, then that you can run several jobs
 * at once, then that it follows your conventions, then that you can see where each job
 * stands, then why we built it, then the questions and the ask.
 *
 * ⑥ was added last and answers the question ④ raises: twelve jobs in flight is only
 * bearable if each one says where it is, so the panel that says so gets its own section
 * rather than a bullet inside ④.
 *
 * The order IS the pitch. It opens on the outcome and only reaches the mechanism in ②,
 * where the seven commands live — the page used to lead with them ("7 skills. Entire
 * workflow.") and that is what made it read as a tool for engineers only. `/skills` and
 * `/desktop` are gone; what they said that still needed saying is folded into ② and ④,
 * and the reference is in the documentation.
 *
 * `page-wrapper` only ever wrapped the hero and the sections below it; the header sits
 * outside it and the other pages do not use it at all. Its job is `overflow: clip`,
 * which keeps the hero's decorative overflow from widening the document — so it has to
 * stay, and it has to stay HERE rather than in the layout.
 *
 * `content-sections` groups the closing run the same way the original did.
 */

export const metadata: Metadata = {
  title: 'magic-slash',
  description:
    "Describe what's next. Magic Slash builds it, on the product you already have.",
}

export default function Home() {
  return (
    <div className="page-wrapper">
      <Hero />
      <HowSection />
      <YourProductSection />
      <div className="content-sections">
        <ParallelSection />
        <YourWaySection />
        <WhereItStandsSection />
        <WhySection />
        <FaqSection />
        <CtaSection />
      </div>
    </div>
  )
}
