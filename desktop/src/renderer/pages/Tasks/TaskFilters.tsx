import { useCallback, useState } from 'react'
import { createPortal } from 'react-dom'
import { ArrowDownWideNarrow, BotMessageSquare, CalendarRange, Check, ChevronDown, FolderGit2, LoaderCircle, Search, TriangleAlert, X } from 'lucide-react'
import { useAnchoredPanel } from '../../components/useAnchoredPanel'
import { useT } from '../../i18n'
import { INPUT } from '../../theme/controls'
import type { TaskAgentFilter, TaskFilter, TaskSort } from '../../utils/taskRows'

/**
 * The controls at the top of the board: which repository, a search box, and three
 * pickers — in what order, which Jira epic, and whether somebody is already on it.
 *
 * THE REPOSITORY PICKER IS NOT A FILTER any more, and it leads the row because of it.
 * The page used to draw every repository's backlog at once and offer to narrow to one;
 * it now draws ONE repository's board, and the picker is what chooses it. That is why it
 * has no "all repositories" entry — four columns holding six repositories' tickets are
 * four columns nobody can read down — and why what it is set to is remembered on the
 * account rather than reset with the page. See `Config.tasksRepo`.
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
  /** The mark before the label takes this colour. Absent means no mark, never a default. */
  color?: string
}

/**
 * How a picker draws an option's colour: as a plain dot, or as the repository tile the
 * rest of the app draws a repository with.
 *
 * A MODE ON THE PICKER rather than a rendered node per option, because it is a property
 * of the LIST and not of any entry in it: every option of the repository picker is a
 * repository, and every option of the epic picker is an epic. Passing a node per option
 * would let one list draw two different marks, which is the bug this is shaped to make
 * impossible.
 */
type SelectMarker = 'dot' | 'repo'

/**
 * The option's colour, as the mark the list asks for.
 *
 * The repository tile is `components/agent-info-sidebar/RepoMark`'s — the same folder
 * glyph on the same colour-at-12% backdrop, at picker scale. Not that component itself,
 * which resolves its colour from the store by repository NAME: the filter already holds
 * the colour on `TaskFilterRepo`, off the same `getProjectColorMap` call, and going back
 * to the store for it would be a second answer to a question already answered.
 *
 * `1f` is the alpha suffix that component uses, appended to the hex — 12%, which is what
 * makes the tile a tint of the repository's colour rather than a block of it.
 */
function OptionMark({ color, marker }: { color: string; marker: SelectMarker }) {
  if (marker === 'dot') {
    return <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
  }
  return (
    <span
      className="flex items-center justify-center w-5 h-5 rounded-md flex-shrink-0"
      style={{ backgroundColor: `${color}1f`, color }}
    >
      <FolderGit2 className="w-3 h-3" />
    </span>
  )
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
  alwaysNeutral,
  marker = 'dot',
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
  /** For a picker that is always set to something, and so is never "away from default". */
  alwaysNeutral?: boolean
  /** What an option's colour is drawn as. See `SelectMarker`. */
  marker?: SelectMarker
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
  // so from the control rather than only from the gap where the other rows were.
  //
  // A picker with no clear entry is at its default exactly when its FIRST option is
  // selected — the arrangement `TaskFilters` relies on for the sort, whose leading entry
  // is the order the page comes in. The repository picker is the exception and passes
  // `alwaysNeutral`: it has no default to be away from, so tinting it would leave the
  // control permanently lit on every repository but whichever one happened to sort first.
  const active = alwaysNeutral ? false : clearLabel ? !!selected : selected?.value !== options[0]?.value

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{ width }}
        // `py-1` under a repository tile and `py-1.5` under a dot, so the trigger stands
        // the same 30px either way: the tile is 20px where a line of `text-xs` is 16, and
        // left on the taller padding this control would sit four pixels above the search
        // box it shares a row with.
        className={`flex items-center gap-2 px-3 ${marker === 'repo' ? 'py-1' : 'py-1.5'} rounded-lg bg-surface border text-xs cursor-pointer transition-colors flex-shrink-0 ${
          active ? 'border-accent/40 text-ink' : 'border-line-field text-ink hover:border-accent'
        }`}
      >
        {Icon && <Icon className="w-3.5 h-3.5 shrink-0 text-text-secondary" />}
        {selected?.color && <OptionMark color={selected.color} marker={marker} />}
        <span className="truncate">{selected ? selected.label : placeholder}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 shrink-0 ml-auto text-text-secondary transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && createPortal(
        <div
          ref={panelRef}
          style={style()}
          // `gap-0.5` between entries, not flush. The rows carry a hover and a selected
          // ground of their own, so touching they read as one banded block and the
          // highlight has no edge of its own to land on; a two-pixel breath is enough to
          // make each entry a thing being pointed at.
          className="bg-bg-secondary border border-line rounded-xl shadow-2xl z-[60] p-1 max-h-80 overflow-y-auto flex flex-col gap-0.5"
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
                {option.color && <OptionMark color={option.color} marker={marker} />}
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
 * WHICH sprint the board is showing — a label in a row of controls, and deliberately
 * not one of them.
 *
 * It lives here because the sprint is no longer a property of a card but of the whole
 * page: the board draws ONE repository, so every ticket in the four columns is in this
 * sprint, and the repository picker beside it is the only other thing on the page that
 * says what is being looked at. It used to trail the repository name on that card's
 * header and went out with the card.
 *
 * NO BORDER AND NO HOVER, which is the whole of what separates it from its neighbours:
 * every real control in this row is `bg-surface` inside `border-line-field`, so a
 * bordered chip here would be a fourth picker that does nothing when clicked. The
 * transparent border is what keeps it the same 30px tall as the controls it sits
 * between — they owe two of those pixels to their own border.
 *
 * Rendered only when the read actually named the sprint. There is no fallback text: a
 * chip reading "sprint inconnu" would take the search box's width to say nothing, and
 * a project with no sprint running already says so through `JiraErrorLines`.
 */
function SprintChip({ name, hint }: { name: string; hint: string }) {
  return (
    <span
      title={hint}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-transparent bg-surface-subtle text-xs text-text-secondary min-w-0 max-w-[11rem] flex-shrink"
    >
      <CalendarRange className="w-3.5 h-3.5 shrink-0 text-text-secondary/60" />
      <span className="truncate">{name}</span>
    </span>
  )
}

/**
 * The pickers' widths, and the reason they differ.
 *
 * The sort is the narrowest because its two entries are two words the reader already
 * knows; the repository and the epic hold names of arbitrary length and truncate, so
 * they get the room. All three shrink from the search box rather than from each
 * other — `flex-shrink-0` on the triggers, `flex-1 min-w-0` on the box.
 *
 * The repository gets the most of the three. It is no longer one narrowing control among
 * several but the answer to "which board am I looking at", and a repository name
 * truncated to `magic-sl…` is the page failing to say what it is showing.
 */
const REPO_WIDTH = 208
const SORT_WIDTH = 152
const EPIC_WIDTH = 192
/**
 * Narrower than the epic's, because both of its entries are two known words rather
 * than a title of arbitrary length — and because it is the fifth control in a row that
 * has the search box to feed.
 */
const AGENT_WIDTH = 160

/**
 * The filter row: a search box that takes the width, then the three pickers.
 *
 * Debouncing the box would be the usual reflex and is wrong here: nothing is
 * fetched on a keystroke, the filtering is one pass over an array already in memory,
 * and a delay would only make the page feel slower than it is.
 *
 * Rendered by the page when there is something to narrow OR a query already narrowing
 * it — `narrowable` at its call site. Controls over a backlog that was never read are
 * more things to read before finding out there is nothing there; but a page opened on a
 * ticket with no row here (closed, or in a repository nobody tracks) has a live query
 * over an empty list, and hiding the bar would hide the box holding it, leaving the
 * reader nothing to clear.
 *
 * The EPIC picker follows a rule of its own one level down: it is rendered
 * only when some visible ticket actually hangs off an epic, so a page with no Jira
 * repository on it — or a sprint whose tickets are all top-level — shows three
 * controls rather than four with one that can only ever empty the page.
 */
export function TaskFilters({
  value,
  repos,
  epics,
  hasAgents,
  sprintName,
  searchesSprint,
  searching,
  searchFailed,
  onChange,
}: {
  value: TaskFilterValue
  repos: TaskFilterRepo[]
  epics: TaskFilterEpic[]
  /**
   * The active sprint of the picked repository, when its Jira read named one. Absent
   * for a GitHub-only repository, and for a Jira one whose sprint could not be named —
   * see `SprintChip`, which is then not drawn at all.
   */
  sprintName?: string
  /**
   * Whether the box reaches PAST the board when it is used.
   *
   * True only on a board some column of which stopped at its budget. It changes no
   * behaviour here — the page owns the read — but it changes what the box may honestly
   * claim: on a complete board the filter is exhaustive and saying "searching the whole
   * sprint" would be noise, while on a short one that sentence is the answer to "why
   * did my ticket not come up".
   */
  searchesSprint?: boolean
  /**
   * Whether the agent picker is worth offering at all.
   *
   * False on a board nobody has an agent on, where both of its entries answer the same
   * question: "with an agent" would empty the page and "without" would leave it exactly
   * as it is. The epic picker is withheld on the same rule one line down — a control
   * that can only ever say what the board already says is a control to read past.
   */
  hasAgents?: boolean
  /** A sprint search is in flight. See `useSprintSearch`. */
  searching?: boolean
  /** The last sprint search came back as a failure. The board still shows what it has. */
  searchFailed?: boolean
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

  // Both halves of the question, and the clear entry is what makes them a pair rather
  // than a switch: "who is being worked on" and "what is left to pick up" are two things
  // to ask of a sprint, and neither is the board's default state.
  const agentOptions: SelectOption[] = [
    { value: 'with', label: t('tasks.filter.withAgent') },
    { value: 'without', label: t('tasks.filter.withoutAgent') },
  ]

  return (
    <div className="flex items-center gap-2 min-w-0">
      {/* FIRST, and before the search box, because it is the only control here that
          decides what the page is about rather than how much of it is on screen. No
          `clearLabel`: there is no "all repositories" state to go back to. */}
      <FilterSelect
        value={value.configKey}
        options={repos.map((repo) => ({ value: repo.configKey, label: repo.name, color: repo.color }))}
        onChange={(configKey) => onChange({ ...value, configKey })}
        placeholder={t('tasks.filter.pickRepo')}
        width={REPO_WIDTH}
        alwaysNeutral
        // The repository tile the sidebar and the webapp draw a repository with, rather
        // than the bare dot the epic picker keeps. The picker names the page's subject
        // now, so it is worth being recognised across surfaces the way a repository is
        // everywhere else; an epic is a Jira relationship with no such mark of its own.
        marker="repo"
      />
      {/* Directly after the picker, because the two answer one question between them:
          the picker says which repository, and this says which of its sprints. */}
      {sprintName && <SprintChip name={sprintName} hint={t('tasks.jira.sprintHint', { sprint: sprintName })} />}
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
          // The placeholder is where the box says how far it reaches, because it is the
          // only text a reader sees BEFORE typing — which is when "will this find the
          // ticket I cannot see" is the question. A caption under the bar would say it
          // after the fact, and to everyone including the boards it is not true of.
          placeholder={searchesSprint ? t('tasks.filter.searchSprintPlaceholder') : t('tasks.filter.searchPlaceholder')}
          className={`${INPUT} w-full pl-9 ${
            value.query && (searching || searchFailed) ? 'pr-14' : value.query || searching ? 'pr-8' : ''
          }`}
        />
        {/* THREE THINGS CAN SIT AT THE RIGHT EDGE and only ever one of them does, which
            is why they share a row rather than each claiming `right-2`: a spinner while
            the sprint is being searched, a warning when that search failed, and the
            clear button whenever there is something to clear. Stacked absolutely they
            would overlap; in a flex row the clear button simply moves left by the width
            of whichever status glyph is showing. */}
        {(value.query || searching) && (
          <span className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {searching && (
              // The in-memory filter has ALREADY narrowed the board by the time this
              // appears — it runs on the keystroke, undebounced — so this spinner is not
              // "the page is loading". It says a wider answer is on its way, which is why
              // it is a 12px glyph in the corner of the box rather than anything that
              // covers the columns.
              <LoaderCircle
                className="w-3.5 h-3.5 text-text-secondary/50 animate-spin"
                aria-label={t('tasks.filter.searchingSprint')}
              />
            )}
            {!searching && searchFailed && (
              // The reach past the board failed; the board itself is fine and still
              // showing everything it loaded. A glyph and a sentence on hover, not a
              // banner: nothing is broken that the reader can act on, and the tickets
              // they can see are all real.
              <span title={t('tasks.filter.searchFailed')} className="flex items-center">
                <TriangleAlert className="w-3.5 h-3.5 text-orange" aria-label={t('tasks.filter.searchFailed')} />
              </span>
            )}
            {value.query && (
              <button
                type="button"
                onClick={() => onChange({ ...value, query: '' })}
                title={t('tasks.filter.clearSearch')}
                aria-label={t('tasks.filter.clearSearch')}
                className="p-0.5 rounded text-text-secondary/60 hover:text-ink hover:bg-surface-strong transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </span>
        )}
      </div>
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
      {/* AFTER the epic, so the two conditional pickers sit together at the end of the
          row and the three permanent controls keep the places the reader knows them by.
          Its glyph is the board card's own agent mark, for the sort's reason: "With an
          agent" beside an epic title would read as a third thing to narrow by until the
          bot says what it is about. */}
      {(hasAgents || !!value.agent) && (
        <FilterSelect
          value={value.agent}
          options={agentOptions}
          onChange={(agent) => onChange({ ...value, agent: agent as TaskAgentFilter })}
          placeholder={t('tasks.filter.anyAgent')}
          clearLabel={t('tasks.filter.anyAgent')}
          width={AGENT_WIDTH}
          icon={BotMessageSquare}
        />
      )}
    </div>
  )
}
