import type { Metadata } from 'next'
import { HeroSection } from '@/components/site/home/HeroSection'
import { HowItWorksSection } from '@/components/site/home/HowItWorksSection'
import { FinalCtaSection } from '@/components/site/home/FinalCtaSection'

/**
 * magic-slash.io — the landing page.
 *
 * THREE SECTIONS: the promise, what using it feels like, the ask. It was rebuilt as six
 * and cut to three by the product owner, band by band — "on the product you already
 * have", then "the eight commands", then the feature grid.
 *
 * ONE OF THOSE CUTS COSTS AN ACCEPTANCE CRITERION, and it is written here rather than
 * left for someone to rediscover. Criterion 2 of issue #268 reads "homepage features are
 * presented as clickable cards leading to the features page; a card with no detail page
 * leads to the matching section rather than a 404" — and there is no longer a card grid
 * on this page for it to be true of. The decision was explicit and it is the product
 * owner's to make; what follows from it is that #268 cannot claim that criterion, and
 * that story #269 (the `/features` page) now has no homepage entry point to link back
 * from.
 *
 * THE CUT BANDS' COMPONENTS ARE GONE, not parked. They were kept on disk for one round —
 * unrendered, so that restoring a band was one import and one line — and the review
 * (Greptile, PR #278) rightly called that what it was: this PR ADDING dead code, which is
 * worse than a PR retaining some. `FeaturesSection.tsx`, `FeatureCard.tsx` and
 * `CommandsSection.tsx` were deleted in the same PR that introduced them, so #269 writes
 * its own card component and reads the grid out of this PR's history rather than off the
 * branch.
 *
 * `lib/commands.ts` is the exception and stays: `desktop/src/main/skills-registry.test.ts`
 * reads it as one of the eight duplicated skill lists, and `lib/commands.test.ts` pins its
 * order — it is exercised data, not an unrendered component.
 *
 * The knock-on: `/#features` and `/#commands` were live same-page anchors from the
 * header's Product menu and the footer's Product column. Both bands are gone, so both
 * links are repointed at `/documentation#skills` — see the notes at those two call
 * sites. `#how` is the only same-page anchor left.
 *
 * Every retired band's copy stays in the catalogues, unreferenced (`site.yourProduct.*`,
 * `site.features.*`, `site.how.commandsTitle`, `site.mockup.*`), alongside the other
 * families this rebuild retired — nothing tests for an unused key, and pruning them
 * means editing `i18n.test.ts`'s exact `SAME_IN_BOTH` allow-list in lockstep.
 *
 * Rebuilt from zero on the design system landed by #267. There is no `marketing.css`
 * behind any of this — the `(marketing)` layout no longer imports it — so every band is
 * Tailwind over the tokens in `tailwind.config.ts` and the primitives in
 * `components/ui.tsx`. What that replaces: eight sections dressed by ~5,000 lines of
 * ported stylesheet, eleven rival button definitions among them.
 *
 * `bg-canvas` IS HERE AND NOT IN THE LAYOUT, on purpose. That layout wraps `/story` too,
 * and `/story` is on `softblue` — painting `#F4F7FE` one level up would cover it.
 *
 * The `page-wrapper` / `content-sections` wrappers are gone with the stylesheet that
 * gave them meaning: `page-wrapper` existed for an `overflow: clip` that kept the old
 * hero's decorative overflow from widening the document, and nothing here overflows.
 */

export const metadata: Metadata = {
  title: 'magic-slash',
  description: 'Your ideas become AI-powered features. The app for product builders.',
}

export default function Home() {
  return (
    <div className="bg-canvas">
      <HeroSection />
      <HowItWorksSection />
      <FinalCtaSection />
    </div>
  )
}
