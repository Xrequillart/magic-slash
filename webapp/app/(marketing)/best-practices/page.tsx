import type { Metadata } from 'next'
import { FinalCtaSection } from '@/components/site/home/FinalCtaSection'
import { PlaceholderContent } from '@/components/site/PlaceholderContent'
import { PLACEHOLDER_PAGES } from '@/lib/siteNav'

/**
 * magic-slash.io/best-practices — how to get good at this. NOT WRITTEN YET.
 *
 * The `metadata`-only server component, with the copy in a client component next door:
 * the same split every page in this group makes, and `PLACEHOLDER_PAGES` in
 * `lib/siteNav.ts` owns the path and the two keys.
 *
 * WHAT IT OWES, and it is the page on this site with the most material already lying
 * around: the eight skills each carry an opinion about how work should be shaped — one
 * ticket per branch, a spec before an epic, atomic commits, a review before a merge —
 * and none of that is written down anywhere a reader can find it. `skills/*\/SKILL.md`
 * is where those opinions actually live today, which makes them documentation for the
 * TOOL rather than advice for the person using it.
 *
 * NOT A SECOND `/workflow`, which is the trap here and the reason a `/skills` page was
 * cut from this menu (see `lib/siteNav.ts`). That page is the loop: five steps, in order,
 * with the commands each one runs. This one is the judgement around it — when to split a
 * ticket, what belongs in a spec, when to let an agent run unattended and when not to —
 * which is the part no command can carry for you.
 */

export const metadata: Metadata = {
  title: 'Best practices — magic-slash',
  description:
    'How to shape the work so the agents can carry it: tickets, specs, branches, commits and reviews.',
}

export default function BestPracticesPage() {
  const page = PLACEHOLDER_PAGES.bestPractices

  return (
    <>
      <PlaceholderContent title={page.title} lead={page.lead} />
      <FinalCtaSection />
    </>
  )
}
