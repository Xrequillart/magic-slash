import { Banner, BANNER_BAND_HEIGHT } from '@ds/desktop'
import { NotebookPen, X } from '@ds/desktop/icons'
import { useT } from '../../i18n'

/** How much the band takes off the top of the pane, for the filter bar pinned under it. */
export const PICK_PLAN_BAR_H = BANNER_BAND_HEIGHT

/**
 * What the Plans modal is for while a plan is being chosen for a planner — the Tasks
 * board's `PickTicketBanner`, for the other kind of agent. Same band, same one way out,
 * and the same promise in the hint: a click attaches, nothing opens and nothing starts.
 */
export function PickPlanBanner({
  agentName,
  onCancel,
}: {
  agentName: string
  onCancel: () => void
}) {
  const t = useT()

  return (
    <Banner
      variant="accent"
      layout="band"
      icon={NotebookPen}
      className="sticky top-0 z-30"
      hint={t('plans.pick.hint')}
      actions={[{ label: t('tasks.pick.cancel'), icon: X, onClick: onCancel }]}
    >
      {t('plans.pick.title', { name: agentName })}
    </Banner>
  )
}
