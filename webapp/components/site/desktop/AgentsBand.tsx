'use client'

import { FeaturePoints, SplitFeature } from '@/components/ui'
import { AGENTS_POINTS, DESKTOP_BANDS } from '@/lib/desktopPage'
import { useT } from '@/lib/i18n/useLanguage'
import { AgentsSidebarMockup } from '../features/AgentsSidebarMockup'
import { HomeHeading, HomeSection } from '../home/Shell'
import { Reveal } from '../Reveal'
import { DESKTOP_ICONS } from './icons'

/**
 * THE AGENTS, KEPT APART: the list down the window's left edge, magnified, beside the
 * three facts about it — a worktree and a terminal each, up to twelve, and the one
 * waiting for you marked so you see it first.
 *
 * The drawing is `/features`' own agents sidebar, WITHOUT the legend of the four states
 * that page draws under it: the product owner cut it here ("retire la légende"), and the
 * paragraph beside the drawing already names the three states that matter. `legend`
 * is the prop that does it.
 *
 * `media="left"`: the band above is stacked and the band below puts its panel on the
 * right, so the drawing goes left here for the page to alternate.
 */
export function AgentsBand() {
  const { t } = useT()

  return (
    <HomeSection>
      <SplitFeature
        media="left"
        art={
          <Reveal order={2}>
            <AgentsSidebarMockup legend={false} />
          </Reveal>
        }
      >
        <Reveal order={1}>
          <HomeHeading title={t(DESKTOP_BANDS.agents.title)} subtitle={t(DESKTOP_BANDS.agents.subtitle)} />
          <FeaturePoints
            className="mt-10"
            points={AGENTS_POINTS.map(({ icon, label }) => ({ icon: DESKTOP_ICONS[icon], label: t(label) }))}
          />
        </Reveal>
      </SplitFeature>
    </HomeSection>
  )
}
