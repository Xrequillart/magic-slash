import { CircleDot, FolderGit2 } from '@ds/desktop/icons'
import type { FilterBarControl, FilterBarProps } from '@ds/desktop'
import { PLAN_STATUSES, type PlanRepoRef } from '../../../types'
import type { Translate } from '../../i18n'
import type { PlanFilter } from '../../utils/planRows'
import { STATUS_LOOK } from './PlanRow'

/**
 * The controls over the list: which status, a search box, and which repository. How many
 * plans are showing is the heading's to say, as on the board — see `SectionHeader.count`.
 *
 * NOT A COMPONENT, for the reason `TaskFilters.tsx` is not one: `FilterBar` in
 * `@ds/desktop` draws the band — the pinned ground, the sentinel that says whether it has
 * pinned, the clear button inside the box, the Escape that empties it. What is left here is
 * the half that is this page's: which controls, in what order, and what each one narrows.
 *
 * THE REPOSITORY PICKER HAS AN "ALL REPOSITORIES" ENTRY and opens on it, where the board's
 * does not: four columns holding six repositories' tickets are four columns nobody can read
 * down, but a list of plans stays readable at any length, and reading your own and your
 * team's planning in one chronology is the point of the page. So does the status picker,
 * for the same reason — every picker here narrows, none of them chooses the subject, and
 * each is lit only while it is away from "everything".
 *
 * The rule they express is `filterPlanCardsBy` (renderer/utils/planRows.ts), where it is
 * tested. Nothing here reads anything: the page already holds every plan it may show.
 */

/** Pinned, so the control does not resize with the repository name it is showing. */
const REPO_WIDTH = 208
/** Wide enough for "En cours d'implémentation", the longest status in either language. */
const STATUS_WIDTH = 208

export interface PlanFiltersInput {
  value: PlanFilter
  /** Only the repositories that actually have a plan. See `planRepoOptions`. */
  repos: PlanRepoRef[]
  t: Translate
  onChange: (next: PlanFilter) => void
}

export function buildPlanFilters({ value, repos, t, onChange }: PlanFiltersInput): Omit<FilterBarProps, 'top' | 'paneRef'> {
  const before: FilterBarControl[] = [
    {
      // BEFORE the search box: a status is the first thing a reader narrows a planning
      // history by — what is still being written, what is done.
      kind: 'select',
      id: 'status',
      value: value.status,
      // The row's own colours, from the row's own table, so the dot in the list and the
      // pill on the row it picks are one colour.
      options: PLAN_STATUSES.map((status) => ({
        value: status,
        label: t(STATUS_LOOK[status].labelKey),
        color: `rgb(var(--c-${STATUS_LOOK[status].tone}))`,
      })),
      onChange: (status) => onChange({ ...value, status: status as PlanFilter['status'] }),
      placeholder: t('plans.filter.allStatuses'),
      clearLabel: t('plans.filter.allStatuses'),
      width: STATUS_WIDTH,
      icon: CircleDot,
      active: !!value.status,
    },
  ]

  // Offered only when there is a choice to make: one repository means the picker could
  // only ever narrow the list to itself.
  const after: FilterBarControl[] = repos.length > 1
    ? [{
        kind: 'select',
        id: 'repo',
        // A repository that has left the list reads as "all repositories", which is the
        // honest answer — the page resolves the stored id against the same list.
        value: repos.some((repo) => repo.id === value.repoId) ? value.repoId : '',
        options: repos.map((repo) => ({ value: repo.id, label: repo.name })),
        onChange: (repoId) => onChange({ ...value, repoId }),
        placeholder: t('plans.filter.all'),
        clearLabel: t('plans.filter.all'),
        width: REPO_WIDTH,
        icon: FolderGit2,
        active: !!value.repoId,
      }]
    : []

  return {
    before,
    after,
    search: {
      value: value.query,
      onChange: (query) => onChange({ ...value, query }),
      // The placeholder says how far the box reaches: the title and the idea, not the spec,
      // which the list read never downloads (see `LIST_COLUMNS` in main/cloud/plans.ts).
      placeholder: t('plans.filter.searchPlaceholder'),
      clearLabel: t('plans.filter.clearSearch'),
    },
    // The page's own 24px inset, spelled as a full bleed — see `FilterBar.className`.
    className: '-mx-6 px-6',
  }
}
