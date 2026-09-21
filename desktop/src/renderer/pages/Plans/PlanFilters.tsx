import { Select, StickyBar, Text } from '@ds/desktop'
import { FolderGit2 } from '@ds/desktop/icons'
import type { PlanRepoRef } from '../../../types'
import { useT } from '../../i18n'

/**
 * The one control over the list: which repository's plans are showing.
 *
 * IT IS `Select` NOW, and this file is where that was asked for. The note that stood
 * here said it in as many words — the board's picker already expressed the one
 * difference this one has, as its optional `clearLabel`, and only being module-private
 * to `TaskFilters.tsx` kept the two apart; do that rather than growing this copy. The
 * component went one folder further, into the design system, because the eighteen native
 * `<select>`s in Settings were the other half of the same problem.
 *
 * THE DIFFERENCE THAT REMAINS is the one worth keeping: THIS PICKER HAS AN "ALL
 * REPOSITORIES" ENTRY and opens on it. The board's does not, deliberately, because four
 * columns holding six repositories' tickets are four columns nobody can read down; a
 * list of plans stays readable at any length, and reading your own and your team's
 * planning in one chronology is the point of the page.
 */

/** Pinned, so the control does not resize with the repository name it is showing. */
const REPO_WIDTH = 224

/**
 * The bar's height in pixels — 28px of control between 12px of padding either side.
 *
 * Stated as a number because `StickyBar` takes one, and it takes one for a reason this
 * bar does not need yet: whatever pins UNDER a band has to know exactly how tall it is.
 * Nothing pins under this one today. The number is the board's `FILTER_BAR_H` to the
 * pixel all the same, because two pinned bars in one app standing at different heights is
 * the drift a shared component exists to stop.
 */
export const PLAN_FILTER_BAR_H = 52

/**
 * What the page holds when nothing is narrowed. A page-local sentinel and not a value
 * `filterPlanCards` knows about: that function takes `null` for "every repository".
 *
 * IT STOPS AT THIS FILE. `Select` spells "nothing picked" as the empty string — that is
 * what its `clearLabel` entry sets — so the two are mapped on the way in and on the way
 * out, right here, and neither the page nor the design system has to know the other's
 * spelling.
 */
export const ALL_REPOS = '__all__'

export function PlanFilters({
  repoId,
  repos,
  count,
  onChange,
  stuck,
}: {
  /** `ALL_REPOS`, or the id of a repository that has at least one plan. */
  repoId: string
  /** Only the repositories that actually have a plan. See `planRepoOptions`. */
  repos: PlanRepoRef[]
  /** How many plans are showing under it — the answer to "is this all of them". */
  count: number
  onChange: (repoId: string) => void
  /**
   * Whether the bar has pinned itself to the top of the pane, which is the one thing that
   * changes about it: `StickyBar` lifts its shadow.
   *
   * The PAGE owns the question, because the sentinel that answers it has to sit where
   * this bar STARTS and a band that has moved cannot report the position it came from.
   * See `filtersStuck` in `index.tsx`.
   */
  stuck?: boolean
}) {
  const t = useT()
  const narrowed = repoId !== ALL_REPOS && repos.some((repo) => repo.id === repoId)

  return (
    // `StickyBar` owns the band: the opaque ground, the height, and the edge. What is left
    // here is the FULL BLEED — `-mx-6 px-6`, the page's own 24px inset — because a band
    // inset by it would let the rows slide past either side of it.
    //
    // THE HAIRLINE IS GONE, and with it the note that argued for drawing it always. That
    // note said the list below "opens on a rule of its own on every row, so a bar with no
    // edge would read as the first row of it" — which stopped being true when `PlanRow`
    // became a `PlanItem`: the rows are plates on the page's ground now, and there is no
    // rule left for this bar to be mistaken for. At rest it draws no edge, and once it has
    // pinned it lifts a shadow, which is what the board's does.
    <StickyBar height={PLAN_FILTER_BAR_H} stuck={stuck} className="-mx-6 px-6">
      <Select
        // The sentinel does not cross into the design system: nothing picked is `''`
        // there, and a repository that has left the list falls back to the same state —
        // which is the "all repositories" entry, and the honest answer either way.
        value={narrowed ? repoId : ''}
        options={repos.map((repo) => ({ value: repo.id, label: repo.name }))}
        onChange={(next) => onChange(next || ALL_REPOS)}
        placeholder={t('plans.filter.all')}
        // FIRST in the list, because it is the entry people reach for after having
        // narrowed wrongly — `Select` puts a clear entry at the top for that reason.
        clearLabel={t('plans.filter.all')}
        width={REPO_WIDTH}
        icon={FolderGit2}
        active={narrowed}
      />

      {count > 0 && (
        <Text tone="secondary" className="ml-auto flex-shrink-0 opacity-50">
          {t(count === 1 ? 'plans.count.one' : 'plans.count.other', { count })}
        </Text>
      )}
    </StickyBar>
  )
}
