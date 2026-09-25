'use client'

import { FeaturePoints } from '@/components/ui'
import { DESKTOP_BANDS, PLANS_POINTS } from '@/lib/desktopPage'
import { useT } from '@/lib/i18n/useLanguage'
import { PlanModalMockup } from '../features/PlanModalMockup'
import { HomeHeading, HomeSection } from '../home/Shell'
import { Reveal } from '../Reveal'
import { DESKTOP_ICONS } from './icons'

/**
 * THE FIRST BAND UNDER THE HERO: the plans, which is where the work on this page starts.
 *
 * BEFORE THE BACKLOG, by the product owner's call, and it reads in the order things
 * happen: an idea becomes a spec you approve, the spec becomes an epic and its stories,
 * and those stories are the tickets the Tasks band under this one hands to an agent.
 *
 * `TasksBand`'S SHAPE, on purpose: the copy first, headline and paragraph on the left and
 * the three claims beside them, then the window across the whole row. The window is
 * `/features`' own Plans drawing, the app's real components on the app's default theme,
 * with its legend under it as the Tasks window has; see `PlanModalMockup`.
 *
 * `padding="follow"`: the hero above is its own band with a band's bottom, so this one
 * owes it only the remainder.
 */
export function PlansBand() {
  const { t } = useT()

  return (
    <HomeSection padding="follow">
      <Reveal order={1} className="grid gap-10 md:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] md:items-center md:gap-16">
        <HomeHeading title={t(DESKTOP_BANDS.plans.title)} subtitle={t(DESKTOP_BANDS.plans.subtitle)} />
        <FeaturePoints
          points={PLANS_POINTS.map(({ icon, label }) => ({ icon: DESKTOP_ICONS[icon], label: t(label) }))}
        />
      </Reveal>

      <Reveal order={2} className="mt-12 md:mt-16">
        <PlanModalMockup />
      </Reveal>
    </HomeSection>
  )
}
