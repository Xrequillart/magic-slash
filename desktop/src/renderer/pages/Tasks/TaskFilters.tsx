import { useCallback, useState } from 'react'
import { createPortal } from 'react-dom'
import { ArrowDownWideNarrow, Check, ChevronDown, Search, X } from 'lucide-react'
import { useAnchoredPanel } from '../../components/useAnchoredPanel'
import { useT } from '../../i18n'
import { INPUT } from '../../theme/controls'
import type { TaskFilter, TaskSort } from '../../utils/taskRows'

/**
 * The controls at the top of the backlog: a search box, and three pickers — which
 * repository, in what order, which Jira epic.
 *
 * They shape what is ON SCREEN and nothing else — no read is made, no query leaves
 * the process. That is why they live here rather than in the reload path: the page
 * already holds every open ticket of every repository, and narrowing or reordering a
 * list you have is instant where re-reading it is a round trip per repository.
 *
 * The rules they express are in `filterTaskRows` and `sortTaskRows`
 * (renderer/utils/taskRows.ts), which is where they can be tested. This file is the
 * chrome.
 */

/**
 * What the bar is set to — `TaskFilter` itself, under the name this file's props use.
 *
 * An alias and not a second interface: the page holds ONE object, hands it to
 * `filterTaskRows` and `sortTaskRows` unchanged, and passes it here. A shape declared
 * twice is a shape that can drift, and the compiler would only notice on the day a
 * field was added to one of them.
 */
export type TaskFilterValue = TaskFilter

export interface TaskFilterRepo {
  configKey: string
  name: string
  color: string
}

export interface TaskFilterEpic {
  key: string
  title: string
  /** Absent on an epic whose site records no colour — the entry then draws no dot. */
  color?: string
}

/** One entry of a picker: what it is worth, what it says, and what colour identifies it. */
interface SelectOption {
  value: string
  label: string
  /** A dot before the label. Absent means no dot, never a default colour. */
  color?: string
}

/**
 * A picker — a custom select, for `LanguageSelect`'s reasons.
 *
 * An `<option>` can hold TEXT and nothing else, so the colour dot that identifies a
 * repository and an epic everywhere else on this page is not a styling problem inside
 * a native select but an impossibility; and macOS draws that popup itself and ignores
 * the app's theme. Both are why this is a button and a portalled panel, built on the
 * same `useAnchoredPanel` every other picker in the app uses.
 *
 * ONE COMPONENT FOR ALL THREE, where the repository picker used to be written out on
 * its own. The three differ in their options and in whether they can be cleared, and
 * in nothing else — three copies would be three places for the tint rule, the
 * truncation and the check mark to drift apart.
 *
 * `clearLabel` is what makes the difference between a picker that can be switched off
 * and one that cannot. The repository and the epic both have a "no filter" state and
 * it leads the panel, because it is the entry people reach for after having picked
 * wrongly; the sort has no such state — a list is always in SOME order — so it passes
 * none and every entry is a real choice.
 */
function FilterSelect({
  value,
  options,
  onChange,
  placeholder,
  clearLabel,
  width,
  icon: Icon,
}: {
  value: string
  options: SelectOption[]
  onChange: (value: string) => void
  /** What the trigger says when nothing is picked. Only reachable with a `clearLabel`. */
  placeholder: string
  /** The panel's "no filter" entry, when this picker has one. */
  clearLabel?: string
  /**
   * A number rather than a Tailwind width, because `useAnchoredPanel` measures with
   * it. Matched to the trigger, so the panel opens exactly over the control it
   * belongs to instead of reading as a floating menu.
   */
  width: number
  /** A glyph before the label, for a picker whose values do not name their own subject. */
  icon?: typeof ArrowDownWideNarrow
}) {
  const [open, setOpen] = useState(false)
  const close = useCallback(() => setOpen(false), [])
  const { triggerRef, panelRef, style } = useAnchoredPanel(open, close, width)

  // Falls back to the placeholder rather than rendering an empty trigger: the
  // selected value can leave the list under it — a reload after a group stopped
  // arriving, a repository dropped from the config, an epic whose last ticket was
  // closed — and a control naming something that is no longer on offer would filter
  // the page down to nothing with no way to see why.
  const selected = options.find((option) => option.value === value)

  // Tinted while it is narrowing or reordering, like `AgentSortButton`: a page showing
  // a fraction of its rows, or showing them in an order it was not left in, has to say
  // so from the control rather than only from the gap where the other rows were. A
  // picker with no clear entry is at its default exactly when its first option is
  // selected, which is the arrangement `TaskFilters` relies on below.
  const active = clearLabel ? !!selected : selected?.value !== options[0]?.value

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{ width }}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface border text-xs cursor-pointer transition-colors flex-shrink-0 ${
          active ? 'border-accent/40 text-ink' : 'border-line-field text-ink hover:border-accent'
        }`}
      >
        {Icon && <Icon className="w-3.5 h-3.5 shrink-0 text-text-secondary" />}
        {selected?.color && (
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: selected.color }} />
        )}
        <span className="truncate">{selected ? selected.label : placeholder}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 shrink-0 ml-auto text-text-secondary transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && createPortal(
        <div
          ref={panelRef}
          style={style()}
          className="bg-bg-secondary border border-line rounded-xl shadow-2xl z-[60] p-1 max-h-80 overflow-y-auto"
        >
          {/* The way back out, and the entry the control opens on. First, because it
              is the one people reach for after having picked wrongly. */}
          {clearLabel && (
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                if (value) onChange('')
              }}
              className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left transition-colors ${
                value ? 'hover:bg-surface' : 'bg-surface'
              }`}
            >
              <span className={`text-xs ${value ? 'text-ink' : 'text-accent'}`}>{clearLabel}</span>
              {!value && <Check className="w-3.5 h-3.5 text-accent shrink-0 ml-auto" />}
            </button>
          )}
          {options.map((option) => {
            const isSelected = option.value === value
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  setOpen(false)
                  if (!isSelected) onChange(option.value)
                }}
                className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left transition-colors ${
                  isSelected ? 'bg-surface' : 'hover:bg-surface'
                }`}
              >
                {option.color && (
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: option.color }} />
                )}
                <span className={`text-xs truncate ${isSelected ? 'text-accent' : 'text-ink'}`}>{option.label}</span>
                {isSelected && <Check className="w-3.5 h-3.5 text-accent shrink-0 ml-auto" />}
              </button>
            )
          })}
        </div>,
        document.body,
      )}
    </>
  )
}

/**
 * The pickers' widths, and the reason they differ.
 *
 * The sort is the narrowest because its two entries are two words the reader already
 * knows; the repository and the epic hold names of arbitrary length and truncate, so
 * they get the room. All three shrink from the search box rather than from each
 * other — `flex-shrink-0` on the triggers, `flex-1 min-w-0` on the box.
 */
const REPO_WIDTH = 176
const SORT_WIDTH = 152
const EPIC_WIDTH = 192

/**
 * The filter row: a search box that takes the width, then the three pickers.
 *
 * Debouncing the box would be the usual reflex and is wrong here: nothing is
 * fetched on a keystroke, the filtering is one pass over an array already in memory,
 * and a delay would only make the page feel slower than it is.
 *
 * Rendered by the page ONLY when there is something to filter — see its call site.
 * Controls over an empty backlog are more things to read before finding out there is
 * nothing there. The EPIC picker follows the same rule one level down: it is rendered
 * only when some visible ticket actually hangs off an epic, so a page with no Jira
 * repository on it — or a sprint whose tickets are all top-level — shows three
 * controls rather than four with one that can only ever empty the page.
 */
export function TaskFilters({
  value,
  repos,
  epics,
  onChange,
}: {
  value: TaskFilterValue
  repos: TaskFilterRepo[]
  epics: TaskFilterEpic[]
  onChange: (next: TaskFilterValue) => void
}) {
  const t = useT()

  // `recent` FIRST, because `FilterSelect` reads the leading option as the default
  // for a picker with no clear entry — that is what keeps the trigger untinted until
  // somebody actually changes the order.
  const sortOptions: SelectOption[] = [
    { value: 'recent', label: t('tasks.filter.sortRecent') },
    { value: 'priority', label: t('tasks.filter.sortPriority') },
  ]

  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className="relative flex-1 min-w-0">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-secondary/50 pointer-events-none" />
        <input
          type="text"
          value={value.query}
          onChange={(e) => onChange({ ...value, query: e.target.value })}
          // Escape clears the box rather than closing the page. PageModal listens for
          // it on `window`, so a reader whose first instinct is Escape would otherwise
          // lose the whole backlog to clear one word — and clearing is what Escape
          // means in a search box everywhere else. Only when there is something to
          // clear, so an empty box still closes the page.
          onKeyDown={(e) => {
            if (e.key !== 'Escape' || !value.query) return
            e.preventDefault()
            e.stopPropagation()
            onChange({ ...value, query: '' })
          }}
          placeholder={t('tasks.filter.searchPlaceholder')}
          className={`${INPUT} w-full pl-9 ${value.query ? 'pr-8' : ''}`}
        />
        {value.query && (
          <button
            type="button"
            onClick={() => onChange({ ...value, query: '' })}
            title={t('tasks.filter.clearSearch')}
            aria-label={t('tasks.filter.clearSearch')}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded text-text-secondary/60 hover:text-ink hover:bg-surface-strong transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      <FilterSelect
        value={value.configKey}
        options={repos.map((repo) => ({ value: repo.configKey, label: repo.name, color: repo.color }))}
        onChange={(configKey) => onChange({ ...value, configKey })}
        placeholder={t('tasks.filter.allRepos')}
        clearLabel={t('tasks.filter.allRepos')}
        width={REPO_WIDTH}
      />
      {/* An icon here and on neither of its neighbours, because it is the one picker
          whose values do not name their own subject: "Newest" beside a repository name
          and an epic title reads as a third thing to filter by until the arrow says it
          is an order. */}
      <FilterSelect
        value={value.sort}
        options={sortOptions}
        onChange={(sort) => onChange({ ...value, sort: sort as TaskSort })}
        placeholder={t('tasks.filter.sortRecent')}
        width={SORT_WIDTH}
        icon={ArrowDownWideNarrow}
      />
      {epics.length > 0 && (
        <FilterSelect
          value={value.epicKey}
          options={epics.map((epic) => ({ value: epic.key, label: epic.title, ...(epic.color ? { color: epic.color } : {}) }))}
          onChange={(epicKey) => onChange({ ...value, epicKey })}
          placeholder={t('tasks.filter.allEpics')}
          clearLabel={t('tasks.filter.allEpics')}
          width={EPIC_WIDTH}
        />
      )}
    </div>
  )
}
