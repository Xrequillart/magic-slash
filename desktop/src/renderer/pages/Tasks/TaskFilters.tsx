import { useCallback, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown, Search, X } from 'lucide-react'
import { useAnchoredPanel } from '../../components/useAnchoredPanel'
import { useT, type Translate } from '../../i18n'
import { INPUT } from '../../theme/controls'

/**
 * The two controls at the top of the backlog: which repository, and a search box.
 *
 * They filter what is ON SCREEN and nothing else — no read is made, no query leaves
 * the process. That is why they live here rather than in the reload path: the page
 * already holds every open ticket of every repository, and narrowing a list you have
 * is instant where re-reading it is a round trip per repository.
 *
 * The rules they express are in `filterTaskRows` (renderer/utils/taskRows.ts), which
 * is where they can be tested. This file is the chrome.
 */

/** Both halves of the filter, so the page holds one piece of state rather than two. */
export interface TaskFilterValue {
  configKey: string
  query: string
}

export interface TaskFilterRepo {
  configKey: string
  name: string
  color: string
}

/**
 * A number rather than a Tailwind width, because `useAnchoredPanel` measures with
 * it. Matched to the trigger below, so the panel opens exactly over the control it
 * belongs to instead of reading as a floating menu.
 */
const PANEL_WIDTH = 224

/**
 * The repository picker — a custom select, for `LanguageSelect`'s reasons.
 *
 * An `<option>` can hold TEXT and nothing else, so the colour dot that identifies a
 * repository everywhere else on this page is not a styling problem inside a native
 * select but an impossibility; and macOS draws that popup itself and ignores the
 * app's theme. Both are why this is a button and a portalled panel, built on the
 * same `useAnchoredPanel` every other picker in the app uses.
 */
function RepoSelect({
  value,
  repos,
  onChange,
  t,
}: {
  value: string
  repos: TaskFilterRepo[]
  onChange: (configKey: string) => void
  t: Translate
}) {
  const [open, setOpen] = useState(false)
  const close = useCallback(() => setOpen(false), [])
  const { triggerRef, panelRef, style } = useAnchoredPanel(open, close, PANEL_WIDTH)

  // Falls back to "every repository" rather than rendering an empty trigger: the
  // selected repository can leave the list under the filter — a reload after its
  // group stopped arriving, or a repository dropped from the config — and a control
  // naming something that is no longer on offer would filter the page down to
  // nothing with no way to see why.
  const selected = repos.find((repo) => repo.configKey === value)

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        // Tinted while it is filtering, like `AgentSortButton`: a page showing a
        // fraction of its rows has to say so from the control rather than only from
        // the gap where the other rows were.
        className={`flex items-center gap-2 w-56 px-3 py-1.5 rounded-lg bg-surface border text-xs cursor-pointer transition-colors ${
          selected ? 'border-accent/40 text-ink' : 'border-line-field text-ink hover:border-accent'
        }`}
      >
        {selected && (
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: selected.color }} />
        )}
        <span className="truncate">{selected ? selected.name : t('tasks.filter.allRepos')}</span>
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
            <span className={`text-xs ${value ? 'text-ink' : 'text-accent'}`}>{t('tasks.filter.allRepos')}</span>
            {!value && <Check className="w-3.5 h-3.5 text-accent shrink-0 ml-auto" />}
          </button>
          {repos.map((repo) => {
            const isSelected = repo.configKey === value
            return (
              <button
                key={repo.configKey}
                type="button"
                onClick={() => {
                  setOpen(false)
                  if (!isSelected) onChange(repo.configKey)
                }}
                className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left transition-colors ${
                  isSelected ? 'bg-surface' : 'hover:bg-surface'
                }`}
              >
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: repo.color }} />
                <span className={`text-xs truncate ${isSelected ? 'text-accent' : 'text-ink'}`}>{repo.name}</span>
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
 * The filter row: a search box that takes the width, and the repository picker.
 *
 * Debouncing the box would be the usual reflex and is wrong here: nothing is
 * fetched on a keystroke, the filtering is one pass over an array already in memory,
 * and a delay would only make the page feel slower than it is.
 *
 * Rendered by the page ONLY when there is something to filter — see its call site.
 * A pair of controls over an empty backlog is two more things to read before finding
 * out there is nothing there.
 */
export function TaskFilters({
  value,
  repos,
  onChange,
}: {
  value: TaskFilterValue
  repos: TaskFilterRepo[]
  onChange: (next: TaskFilterValue) => void
}) {
  const t = useT()

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
      <RepoSelect
        value={value.configKey}
        repos={repos}
        onChange={(configKey) => onChange({ ...value, configKey })}
        t={t}
      />
    </div>
  )
}
