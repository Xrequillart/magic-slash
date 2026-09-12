import { useCallback, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown, FolderGit2 } from '@ds/desktop/icons'
import type { PlanRepoRef } from '../../../types'
import { useAnchoredPanel } from '../../components/useAnchoredPanel'
import { useT } from '../../i18n'

/**
 * The one control over the list: which repository's plans are showing.
 *
 * Built on `pages/Tasks/TaskFilters.tsx` — the same pinned full-bleed band, the same
 * portalled picker on the same `useAnchoredPanel`, the same trigger and panel classes.
 * What differs is that THIS PICKER HAS AN "ALL REPOSITORIES" ENTRY and opens on it. The
 * board's does not, deliberately, because four columns holding six repositories' tickets
 * are four columns nobody can read down; a list of plans stays readable at any length,
 * and reading your own and your team's planning in one chronology is the point of the
 * page. It is also plainer: no colour tile, no icon-per-mode.
 *
 * WORTH KNOWING BEFORE TOUCHING THIS. That difference is not a reason the board's picker
 * could not have been used: `FilterSelect` over there already expresses it, as its
 * optional `clearLabel` prop — the epic picker passes one and gets exactly this leading
 * entry. It is module-private to `TaskFilters.tsx`, which is the only thing keeping the
 * two apart. Exporting it (or lifting it to `components/`) and rendering it here with
 * `clearLabel` and `icon={FolderGit2}` would delete most of this file and put the tint
 * rule, the truncation and the check mark back in one place — which is what that
 * component's own docblock says it exists for. Do that rather than growing this copy.
 */

/** Matched to the trigger, because `useAnchoredPanel` measures the panel with it. */
const REPO_WIDTH = 224

/**
 * What the picker is set to when nothing is narrowed. A page-local sentinel and not a
 * value `filterPlanCards` knows about: that function takes `null` for "every
 * repository", and a `<button>` value has to be a string.
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
  const [open, setOpen] = useState(false)
  const close = useCallback(() => setOpen(false), [])
  const { triggerRef, panelRef, style } = useAnchoredPanel(open, close, REPO_WIDTH)

  // Falls back to the "all repositories" label rather than rendering an empty trigger:
  // the selected repository can leave the list under it — a plan deleted, a repository
  // unshared — and a control naming something no longer on offer would narrow the page
  // to nothing with no way to see why.
  const selected = repos.find((repo) => repo.id === repoId)
  const narrowed = !!selected

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
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{ width: REPO_WIDTH }}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface border text-xs cursor-pointer transition-colors flex-shrink-0 ${
          narrowed ? 'border-accent/40 text-ink' : 'border-line-field text-ink hover:border-accent'
        }`}
      >
        <FolderGit2 className="w-3.5 h-3.5 shrink-0 text-text-secondary" />
        <span className="truncate">{selected ? selected.name : t('plans.filter.all')}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 shrink-0 ml-auto text-text-secondary transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {count > 0 && (
        <span className="text-xs text-text-secondary/50 ml-auto flex-shrink-0">
          {t(count === 1 ? 'plans.count.one' : 'plans.count.other', { count })}
        </span>
      )}

      {open && createPortal(
        <div
          ref={panelRef}
          style={style()}
          // `gap-0.5` between entries and `overscroll-contain` on the scroll, both for
          // the reasons the board's panel gives: touching rows read as one banded block,
          // and a wheel at either end of a long list would otherwise chain outwards into
          // a scroll the hook reads as "outside" and closes on.
          className="bg-bg-secondary border border-line rounded-xl shadow-2xl z-[60] p-1 max-h-80 overflow-y-auto overscroll-contain flex flex-col gap-0.5"
        >
          {/* "All repositories" is an ENTRY OF THE LIST, not a button of its own beside
              it: `repoId` is `ALL_REPOS` exactly when nothing is narrowed, so prepending
              it lets one mapping draw every row under one polarity. Written out twice it
              was the same markup with every condition negated, and a style landing on one
              copy but not its mirror would have read as a deliberate difference.

              FIRST in the list, because it is the entry people reach for after having
              narrowed wrongly — and because it is where the list starts. */}
          {[{ id: ALL_REPOS, name: t('plans.filter.all') }, ...repos].map((repo) => {
            const isSelected = repo.id === repoId
            return (
              <button
                key={repo.id}
                type="button"
                onClick={() => {
                  setOpen(false)
                  if (!isSelected) onChange(repo.id)
                }}
                className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left transition-colors ${
                  isSelected ? 'bg-surface' : 'hover:bg-surface'
                }`}
              >
                <span className={`text-xs truncate ${isSelected ? 'text-accent' : 'text-ink'}`}>{repo.name}</span>
                {isSelected && <Check className="w-3.5 h-3.5 text-accent shrink-0 ml-auto" />}
              </button>
            )
          })}
        </div>,
        document.body,
      )}
    </div>
  )
}
