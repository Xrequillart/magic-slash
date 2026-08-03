import type { Metadata } from 'next'
import { SkillsNav } from '@/components/site/skills/SkillsNav'
import { SkillsContent } from '@/components/site/skills/SkillsContent'
import './skills.css'

/**
 * magic-slash.io/skills — ported from `docs/skills.html`.
 *
 * The sticky command bar renders before the content, as it did in the original: it is
 * `position: fixed`, so document order does not place it, but keeping the order means
 * it is also first in the tab sequence — which is what you want from a page nav.
 */

export const metadata: Metadata = {
  title: 'Skills — magic-slash',
  description: 'From ticket to merge in seven slash commands.',
}

export default function SkillsPage() {
  return (
    <>
      <SkillsNav />
      <SkillsContent />
    </>
  )
}
