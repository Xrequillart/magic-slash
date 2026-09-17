import { Select } from '@ds/desktop'
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
}: {
  /** `ALL_REPOS`, or the id of a repository that has at least one plan. */
  repoId: string
  /** Only the repositories that actually have a plan. See `planRepoOptions`. */
  repos: PlanRepoRef[]
  /** How many plans are showing under it — the answer to "is this all of them". */
  count: number
  onChange: (repoId: string) => void
}) {
  const t = useT()
  const narrowed = repoId !== ALL_REPOS && repos.some((repo) => repo.id === repoId)

  return (
    // PINNED, and full-bleed via `-mx-6 px-6`, for `TaskFilters`' reasons: what scrolls
    // past has to go under an opaque band edge to edge, and a band inset by the page's
    // 24px would let the rows slide past either side of it. `bg-bg-secondary` is
    // `PageModal`'s own panel colour — anything else reads as a floating toolbar.
    //
    // The bottom hairline is always drawn here, where the board's appears only once it
    // has pinned. The list below opens on a rule of its own on every row, so a bar with
    // no edge would read as the first row of it.
    <div className="sticky top-0 z-20 -mx-6 px-6 py-3 bg-bg-secondary border-b border-line-subtle flex items-center gap-3 min-w-0">
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
        <span className="text-xs text-text-secondary/50 ml-auto flex-shrink-0">
          {t(count === 1 ? 'plans.count.one' : 'plans.count.other', { count })}
        </span>
      )}
    </div>
  )
}
