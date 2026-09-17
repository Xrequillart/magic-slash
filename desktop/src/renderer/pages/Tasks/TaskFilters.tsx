import { Input, Select, type SelectOption } from '@ds/desktop'
import { ArrowDownWideNarrow, BotMessageSquare, CalendarRange, LoaderCircle, Search, TriangleAlert, X } from '@ds/desktop/icons'
import { useT } from '../../i18n'
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

/**
 * THE PICKERS ARE `Select` — the design system's, and this file is where it came from.
 *
 * A trigger and a portalled panel were written out here, and again on the Plans bar,
 * and again in `LanguageSelect`, and again in `RoleSelect`; the copy over on Plans
 * carried a docblock naming the fix and asking whoever came next to do it rather than
 * grow a fifth. It is done, one folder further out than that note suggested — the
 * eighteen native `<select>`s in Settings were the other half of the problem, and only
 * a picker the design system owns makes those and these one object.
 *
 * WHAT STAYED HERE IS THE RULE ABOUT TINTING, because it is a fact about a FILTER BAR
 * and not about a picker: a control is lit when it is away from what the page opens on,
 * and what that means differs per control. The sort's default is its first entry, the
 * epic's and the agent's is having no value at all, and the repository has no default to
 * be away from — it is always set to something, so a rule inferred inside the component
 * would leave it permanently lit. Each call site below says which it is.
 */

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
 * The bar's height in pixels, and the offset everything that pins UNDER it has to use —
 * the board's own column headings, which are sticky too (see `TaskBoard`).
 *
 * Stated as a number and set on the element rather than left to the content, for the
 * reason `TaskDetailPage.TOP_BAR_H` is: two sticky bands at `top: 0` are one band
 * hiding the other, so the second has to know exactly how tall the first is, and a
 * height that falls out of its padding is a height nobody else can read.
 *
 * 30px of controls — what every trigger and the search box stand — between 12px of
 * padding either side, plus the hairline along the bottom.
 */
export const FILTER_BAR_H = 55

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
  stuck,
  topOffset = 0,
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
  /**
   * Whether the bar has pinned itself to the top of the pane, which is the only thing
   * that changes about it: it draws its bottom edge. The page owns the question — the
   * sentinel that answers it has to sit where this bar STARTS, which is a position a
   * bar that has moved cannot report about itself. See `filtersStuck` in `index.tsx`.
   */
  stuck?: boolean
  /**
   * Where the bar pins, in pixels from the top of the pane. 0 unless something else is
   * already pinned there — today only the picking banner, which is `PICK_BAR_H` tall.
   * The page owns this for `stuck`'s reason: a band cannot see what is stacked above it.
   */
  topOffset?: number
  /** A sprint search is in flight. See `useSprintSearch`. */
  searching?: boolean
  /** The last sprint search came back as a failure. The board still shows what it has. */
  searchFailed?: boolean
  onChange: (next: TaskFilterValue) => void
}) {
  const t = useT()

  // `recent` FIRST, because the leading option IS this picker's default — see the note
  // above `SprintChip`, and the `active` it is handed below.
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
    // PINNED, because the board under it is four columns deep and the controls that
    // narrow it were a scroll away from anything below the fold — the search box most of
    // all, which is the one control people reach for while already looking at a card.
    //
    // Full-bleed via `-mx-6 px-6`, the ticket page's own top bar's trick: what scrolls
    // past has to go under an opaque band edge to edge, and a band inset by the page's
    // 24px would let the cards slide past either side of it. `bg-bg-secondary` is
    // `PageModal`'s own panel colour for the same reason it is there — anything else
    // reads as a floating toolbar.
    //
    // `py-3 -my-3` is padding the layout does not pay for: the negative margin gives the
    // column's gap back, so the row sits exactly where it did, and the padding is what
    // the band covers the page with above and below the controls once it is pinned.
    //
    // The bottom edge appears only once it is stuck. A hairline under a bar with the
    // board flush beneath it is a rule across the page for no reason; without one, cards
    // sliding underneath dissolve into it.
    <div
      className={`sticky z-20 -mx-6 px-6 py-3 -my-3 bg-bg-secondary border-b transition-colors
        flex items-center gap-2 min-w-0 ${stuck ? 'border-line' : 'border-transparent'}`}
      style={{ height: FILTER_BAR_H, top: topOffset }}
    >
      {/* FIRST, and before the search box, because it is the only control here that
          decides what the page is about rather than how much of it is on screen. No
          `clearLabel`: there is no "all repositories" state to go back to. */}
      <Select
        value={value.configKey}
        options={repos.map((repo) => ({ value: repo.configKey, label: repo.name, color: repo.color }))}
        onChange={(configKey) => onChange({ ...value, configKey })}
        placeholder={t('tasks.filter.pickRepo')}
        width={REPO_WIDTH}
        // Never tinted: it has no default to be away from. See the note above.
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
        {/* The MARK is the field's (`icon`), the STATUS ROW at the other edge is this
            page's — a spinner, a warning, a clear button, and which of them is showing
            is a fact about this board. So the field is asked only to keep room
            (`trailing`), and the row is positioned against the wrapper here. */}
        <Input
          type="search"
          value={value.query}
          onChange={(query) => onChange({ ...value, query })}
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
          icon={Search}
          trailing={
            value.query && (searching || searchFailed) ? 'wide' : value.query || searching ? 'narrow' : 'none'
          }
          className="w-full"
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
      <Select
        value={value.sort}
        options={sortOptions}
        onChange={(sort) => onChange({ ...value, sort: sort as TaskSort })}
        placeholder={t('tasks.filter.sortRecent')}
        width={SORT_WIDTH}
        icon={ArrowDownWideNarrow}
        // Away from default = in any order but the one the page comes in, which is the
        // leading entry.
        active={value.sort !== sortOptions[0].value}
      />
      {epics.length > 0 && (
        <Select
          value={value.epicKey}
          options={epics.map((epic) => ({ value: epic.key, label: epic.title, ...(epic.color ? { color: epic.color } : {}) }))}
          onChange={(epicKey) => onChange({ ...value, epicKey })}
          placeholder={t('tasks.filter.allEpics')}
          clearLabel={t('tasks.filter.allEpics')}
          width={EPIC_WIDTH}
          active={!!value.epicKey}
        />
      )}
      {/* AFTER the epic, so the two conditional pickers sit together at the end of the
          row and the three permanent controls keep the places the reader knows them by.
          Its glyph is the board card's own agent mark, for the sort's reason: "With an
          agent" beside an epic title would read as a third thing to narrow by until the
          bot says what it is about. */}
      {(hasAgents || !!value.agent) && (
        <Select
          value={value.agent}
          options={agentOptions}
          onChange={(agent) => onChange({ ...value, agent: agent as TaskAgentFilter })}
          placeholder={t('tasks.filter.anyAgent')}
          clearLabel={t('tasks.filter.anyAgent')}
          width={AGENT_WIDTH}
          icon={BotMessageSquare}
          active={!!value.agent}
        />
      )}
    </div>
  )
}
