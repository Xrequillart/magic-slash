import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { SearchField } from './FilterBar'
import { Icon } from './Icon'
import { MenuSidebarItem } from './MenuSidebarItem'
import { SETTINGS_RAIL_SEARCH_WIDTH, SETTINGS_RAIL_WIDTH } from './modalSizes'
import { Text } from './Text'
import type { IconComponent } from './types'

/**
 * The settings window's left column: every page of it, in runs separated by air.
 *
 * IT REPLACED TWO TAB STRIPS. Account and Settings were two overlays with a `TabStrip`
 * each in the header, split along the line the title bar draws — who the app is signed
 * in as, and what it does. Ten pages across two windows meant a reader looking for the
 * language had to know which of the two controls it lived behind first. One window with
 * all ten down the side answers that by showing them.
 *
 * EACH RUN WEARS A CAPTION, in the sidebar's own voice: the small uppercase word the
 * app's left column puts over its agents ("AGENTS"), at the same size, tone and
 * tracking, so the two columns of the app name their lists the same way. The caption
 * is optional per run, and the gap between runs stays either way — it is what says they
 * are different kinds of thing; the word says which.
 *
 * `SkillsRail`'s column — the width and the sunken ground — because the two are the same
 * object in two windows: a list on the left, the page it picks on the right. A reader who
 * has learnt one has learnt the other.
 *
 * NO RULE ON THE RIGHT, on either rail. The sunken ground already says where the column
 * ends, and a hairline beside a tint is a second answer to the same question — the
 * reason `TabStrip`'s track lost its border.
 *
 * ITEMS AND NOT CHILDREN, `MenuSidebar`'s rule: every row is the same row, and a list
 * whose contents arrive as nodes cannot promise that.
 *
 * A SEARCH BOX OVER THE RUNS, optional. Seventeen pages is past the point where a reader
 * can guess which one holds a switch, so the box searches the SETTINGS, not the page
 * names: while it holds a query the runs give way to the settings that match, each with
 * the page it lives on under its name. The matching is the caller's — this folder cannot
 * read a translation, and what counts as a match is a fact about the app's catalogue —
 * and the results arrive as data, like the rows.
 *
 * THE ARROWS WALK THE RESULTS FROM THE BOX, and Enter picks the lit one, so a reader who
 * typed never has to reach for the pointer. Escape clears the box before it closes the
 * window — `FilterBar`'s rule, and its box.
 *
 * WHILE THE SEARCH IS IN USE — the box focused, or holding a query — THE RAIL WIDENS over
 * the page (`SETTINGS_RAIL_SEARCH_WIDTH`) and the page dims under it: the reader is
 * looking through the list, not at the page, and a result's name and page fit on their
 * lines at that width. The rail keeps its slot at `SETTINGS_RAIL_WIDTH`, so the page does
 * not reflow. PICKING A RESULT ENDS THE SEARCH: the box empties and lets go of the focus,
 * the rail folds back, and the page the reader asked for is there undimmed. So does a
 * click on the dimmed page.
 */

export interface SettingsRailSearchResult {
  /** Stable identity, and what `onPick` reports back. */
  key: string
  /** The setting's name, translated. */
  label: string
  /** Where it lives — the page, and the section when there is one. Translated. */
  context: string
  /** The page's mark, so a result reads as belonging to the row it will light. */
  icon?: IconComponent
}

export interface SettingsRailSearch {
  value: string
  onChange: (value: string) => void
  placeholder: string
  /** The clear button's name. */
  clearLabel: string
  /** The matches for `value`, best first. Ignored while `value` is blank. */
  results: SettingsRailSearchResult[]
  onPick: (key: string) => void
  /** What the column says when nothing matches. */
  emptyLabel: string
}

export interface SettingsRailRow {
  /** Stable identity, and what `onSelect` reports back. */
  key: string
  /** Translated. */
  label: string
  /** From `@ds/desktop/icons`. */
  icon?: IconComponent
}

export interface SettingsRailGroup {
  /** Stable identity for the run. */
  id: string
  /** The caption over the run, translated. Drawn uppercase; absent, the run has none. */
  label?: string
  rows: SettingsRailRow[]
}

export interface SettingsRailProps {
  /** The runs, in order. A run is drawn as one block; the gap between two is the grouping. */
  groups: SettingsRailGroup[]
  /** The page in force. Controlled — the caller holds which page is open. */
  activeKey: string
  onSelect: (key: string) => void
  /** Names the landmark for a screen reader, translated. */
  ariaLabel: string
  /** The box over the runs. Absent, the rail is the runs alone. See the note at the top. */
  search?: SettingsRailSearch
  /**
   * Extra room above the first run, in px — the traffic lights' band when the window is
   * full screen and the rail reaches the panel's top edge. Set by `PageModal`, which is
   * the one that knows whether the lights are there.
   */
  topInset?: number
  /** Placement only. */
  className?: string
}

/** `bg-surface-sunken-soft`, as a layer over an opaque ground. */
const SUNKEN_LAYER = 'linear-gradient(var(--c-surface-sunken-soft), var(--c-surface-sunken-soft))'

export function SettingsRail({ groups, activeKey, onSelect, ariaLabel, search, topInset, className = '' }: SettingsRailProps) {
  const searching = !!search && search.value.trim() !== ''
  const results = searching ? search.results : []

  // In use: the box has the focus, or holds a query. See the note at the top.
  const [focused, setFocused] = useState(false)
  const open = focused || searching
  const box = useRef<HTMLDivElement>(null)

  /** The search over: the box emptied and let go of, so the rail folds back. */
  const end = () => {
    search?.onChange('')
    box.current?.querySelector('input')?.blur()
    setFocused(false)
  }
  const pick = (key: string) => {
    search?.onPick(key)
    end()
  }

  // Which result the arrows have lit. Back to the best match on every keystroke: a new
  // query is a new list, and a cursor carried over would point at whatever happened to
  // land at its old index.
  const [cursor, setCursor] = useState(0)
  useEffect(() => setCursor(0), [search?.value])

  const list = useRef<HTMLDivElement>(null)
  useEffect(() => {
    list.current?.querySelector<HTMLElement>(`[data-result-index="${cursor}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [cursor])

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!search || results.length === 0) return
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const step = event.key === 'ArrowDown' ? 1 : -1
      setCursor((at) => (at + step + results.length) % results.length)
    } else if (event.key === 'Enter') {
      event.preventDefault()
      const picked = results[Math.min(cursor, results.length - 1)]
      if (picked) pick(picked.key)
    }
  }

  return (
    // The slot keeps the rail's resting width; the rail itself widens over the page.
    <div className={`relative shrink-0 ${className}`.trim()} style={{ width: SETTINGS_RAIL_WIDTH }}>
      {/* The page dimmed under the widened rail. Past the slot's right edge and as wide as
          the window: the panel's `overflow-hidden` cuts it at the panel's edge. A press on
          it ends the search, the way a press outside a menu closes it. */}
      <div
        aria-hidden
        onMouseDown={open ? end : undefined}
        className={`absolute inset-y-0 left-full z-10 w-screen bg-black/40 transition-opacity duration-200 ease-out motion-reduce:transition-none ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />
      <nav
        aria-label={ariaLabel}
        className={`absolute inset-y-0 left-0 z-20 flex flex-col bg-bg-secondary transition-[width] duration-200 ease-out motion-reduce:transition-none ${
          open ? 'shadow-2xl' : ''
        }`}
        style={{
          width: open ? SETTINGS_RAIL_SEARCH_WIDTH : SETTINGS_RAIL_WIDTH,
          // The sunken tint is translucent, and a rail widened over the page would show the
          // page through it: so the panel's own ground under it, and the tint as a layer.
          backgroundImage: SUNKEN_LAYER,
          ...(topInset ? { paddingTop: topInset } : {}),
        }}
      >
        {/* The box stays put and the list scrolls under it: a query is typed at the top, and
            a long list of results should not carry the box away with it. */}
        {search && (
          <div
            ref={box}
            className="shrink-0 px-2 pt-3"
            onFocus={() => setFocused(true)}
            // Focus moving between the box and its own clear button is still the search.
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false)
            }}
          >
            <SearchField
              search={{
                value: search.value,
                onChange: search.onChange,
                placeholder: search.placeholder,
                clearLabel: search.clearLabel,
              }}
              onKeyDown={onKeyDown}
            />
          </div>
        )}

        <div ref={list} className="min-h-0 flex-1 overflow-y-auto px-2 py-3">
          {searching ? (
            results.length === 0 ? (
              <Text size="xs" tone="secondary" className="block px-2 pt-1 opacity-50">
                {search.emptyLabel}
              </Text>
            ) : (
              <div role="listbox" aria-label={search.placeholder} className="flex flex-col gap-0.5">
                {results.map((result, index) => (
                  <SearchResultRow
                    key={result.key}
                    result={result}
                    index={index}
                    lit={index === cursor}
                    onHover={() => setCursor(index)}
                    onPick={() => pick(result.key)}
                  />
                ))}
              </div>
            )
          ) : (
            groups.map(({ id, label, rows }, index) => (
              <div key={id} role="group" aria-label={label} className={`flex flex-col gap-0.5 ${index === 0 ? '' : 'mt-4'}`}>
                {/* The sidebar's list caption, to the class: `pl-2` puts the word on the same
                    line as the rows' own icons, which sit at `px-2` inside this `px-2` column. */}
                {label && (
                  <div aria-hidden className="pl-2 pt-1 pb-1.5 text-xs text-text-secondary/50 uppercase tracking-wider">
                    {label}
                  </div>
                )}
                {rows.map((row) => (
                  <MenuSidebarItem
                    key={row.key}
                    label={row.label}
                    icon={row.icon}
                    active={row.key === activeKey}
                    onClick={() => onSelect(row.key)}
                  />
                ))}
              </div>
            ))
          )}
        </div>
      </nav>
    </div>
  )
}

/**
 * One match: the setting's name over the page it lives on, behind that page's mark.
 *
 * `MenuSidebarItem`'s box — padding, radius, the hover ground — with a second line, which
 * that row has no room for: a result without its page would be "Notifications" three
 * times over with nothing to tell them apart. Lit by the arrows OR the pointer, one
 * cursor for both, so the row Enter would pick is always the row that looks picked.
 */
function SearchResultRow({
  result,
  index,
  lit,
  onHover,
  onPick,
}: {
  result: SettingsRailSearchResult
  index: number
  lit: boolean
  onHover: () => void
  onPick: () => void
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={lit}
      data-result-index={index}
      onMouseMove={lit ? undefined : onHover}
      onClick={onPick}
      className={`flex w-full items-start gap-2 rounded-lg border-none px-2 py-1.5 text-left cursor-pointer transition-all ${
        lit ? 'bg-text-secondary/10 text-ink' : 'text-text-secondary'
      }`}
    >
      {result.icon && <Icon glyph={result.icon} tone="inherit" className="mt-px flex-shrink-0" />}
      <span className="flex min-w-0 flex-col">
        <Text size="xs" tone="inherit" className="truncate">
          {result.label}
        </Text>
        <Text size="2xs" tone="secondary" className="truncate opacity-60">
          {result.context}
        </Text>
      </span>
    </button>
  )
}
