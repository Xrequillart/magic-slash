'use client'

import { FeaturePoints } from '@/components/ui'
import { DESKTOP_BANDS, TASKS_POINTS } from '@/lib/desktopPage'
import { useT } from '@/lib/i18n/useLanguage'
import { TasksModalMockup } from '../features/TasksModalMockup'
import { HomeHeading, HomeSection } from '../home/Shell'
import { Reveal } from '../Reveal'
import { DESKTOP_ICONS } from './icons'

/**
 * THE FIRST BAND UNDER THE HERO: the backlog, and what a ticket in it is one click from.
 *
 * The hero has just said the app remembers what your agents are doing; the first thing to
 * show is where an agent COMES FROM, and in this app that is the Tasks window. The
 * drawing is `/features`' own — the modal with the two trackers' tickets grouped by
 * repository, cropped at the plate's floor because a backlog never ends inside its own
 * picture.
 *
 * STACKED, NOT SPLIT. It shipped as a `SplitFeature` with the window on the right, and
 * the product owner called it: "il est trop large pour la mettre à droite". The modal is
 * drawn at the app's width and a column six elevenths of the band wide showed it small
 * and cut; at the full width of the band it is the screen it is. So the copy goes first —
 * headline and paragraph on the left, the three claims beside them on the right — and the
 * window takes the whole row under it.
 *
 * `padding="follow"`: the hero above is its own band with a band's bottom, so this one
 * owes it only the remainder — the same rung `/features` and `/download` put under theirs.
 */
export function TasksBand() {
  const { t } = useT()

  return (
    <HomeSection padding="follow">
      {/* THE COPY IN TWO COLUMNS: headline and paragraph on the left, the three claims on
          the right, level with each other (`md:items-center`) — the product owner's
          placement ("le point clé à droite du titre et de la description"). Below `md`
          the claims drop under the paragraph, at the `mt-10` every other band puts
          between a paragraph and its claims. */}
      <Reveal order={1} className="grid gap-10 md:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] md:items-center md:gap-16">
        <HomeHeading title={t(DESKTOP_BANDS.tasks.title)} subtitle={t(DESKTOP_BANDS.tasks.subtitle)} />
        <FeaturePoints
          points={TASKS_POINTS.map(({ icon, label }) => ({ icon: DESKTOP_ICONS[icon], label: t(label) }))}
        />
      </Reveal>

      <Reveal order={2} className="mt-12 md:mt-16">
        <TasksModalMockup />
      </Reveal>
    </HomeSection>
  )
}
