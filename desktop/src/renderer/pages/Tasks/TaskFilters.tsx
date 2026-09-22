import { CalendarRange, ArrowDownWideNarrow, BotMessageSquare } from '@ds/desktop/icons'
import type { FilterBarControl, FilterBarProps } from '@ds/desktop'
import type { Translate } from '../../i18n'
import type { TaskAgentFilter, TaskFilter, TaskSort } from '../../utils/taskRows'

/**
 * The controls at the top of the board: which repository, a search box, and three
 * pickers — in what order, which Jira epic, and whether somebody is already on it.
 *
 * IT IS NOT A COMPONENT ANY MORE. `FilterBar` in `@ds/desktop` draws the band — the
 * pinned ground, the sentinel that tells it whether it has pinned, the widths, the clear
 * button inside the box, the spinner, the Escape that empties the field rather than
 * closing the page. What is left here is the only half that was ever this app's: WHICH
 * controls, in what order, and what each one narrows.
 *
 * THE REPOSITORY PICKER IS NOT A FILTER, and it leads the row because of it. The page used
 * to draw every repository's backlog at once and offer to narrow to one; it now draws ONE
 * repository's board, and the picker is what chooses it. That is why it has no "all
 * repositories" entry — four columns holding six repositories' tickets are four columns
 * nobody can read down — and why what it is set to is remembered on the account rather
 * than reset with the page. See `Config.tasksRepo`.
 *
 * They shape what is ON SCREEN and nothing else — no read is made, no query leaves the
 * process. That is why they are built here rather than in the reload path: the page
 * already holds every open ticket of the repository, and narrowing or reordering a list
 * you have is instant where re-reading it is a round trip.
 *
 * The rules they express are in `filterTaskRows` and `sortTaskRows`
 * (renderer/utils/taskRows.ts), which is where they can be tested.
 */

/**
 * What the bar is set to — `TaskFilter` itself, under the name this file's callers use.
 *
 * An alias and not a second interface: the page holds ONE object, hands it to
 * `filterTaskRows` and `sortTaskRows` unchanged, and passes it here. A shape declared twice
 * is a shape that can drift, and the compiler would only notice on the day a field was
 * added to one of them.
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
 * The pickers' widths, and the reason they differ.
 *
 * The sort is the narrowest because its two entries are two words the reader already
 * knows; the repository and the epic hold names of arbitrary length and truncate, so they
 * get the room. All of them shrink from the search box rather than from each other.
 *
 * The repository gets the most. It is no longer one narrowing control among several but the
 * answer to "which board am I looking at", and a repository name truncated to `magic-sl…`
 * is the page failing to say what it is showing.
 */
const REPO_WIDTH = 208
const SORT_WIDTH = 152
const EPIC_WIDTH = 192
/**
 * Narrower than the epic's, because both of its entries are two known words rather than a
 * title of arbitrary length — and because it is the last control in a row that has the
 * search box to feed.
 */
const AGENT_WIDTH = 160

export interface TaskFiltersInput {
  value: TaskFilterValue
  repos: TaskFilterRepo[]
  epics: TaskFilterEpic[]
  /**
   * The active sprint of the picked repository, when its Jira read named one. Absent for a
   * GitHub-only repository, and for a Jira one whose sprint could not be named — the chip
   * is then not drawn at all. There is no fallback text: a chip reading "sprint inconnu"
   * would take the search box's width to say nothing, and a project with no sprint running
   * already says so through `JiraErrorLines`.
   */
  sprintName?: string
  /**
   * Whether the box reaches PAST the board when it is used.
   *
   * True only on a board some column of which stopped at its budget. It changes no
   * behaviour — the page owns the read — but it changes what the box may honestly claim: on
   * a complete board the filter is exhaustive and saying "searching the whole sprint" would
   * be noise, while on a short one that sentence is the answer to "why did my ticket not
   * come up".
   */
  searchesSprint?: boolean
  /**
   * Whether the agent picker is worth offering at all.
   *
   * False on a board nobody has an agent on, where both of its entries answer the same
   * question: "with an agent" would empty the page and "without" would leave it exactly as
   * it is. The epic picker is withheld on the same rule — a control that can only ever say
   * what the board already says is a control to read past.
   */
  hasAgents?: boolean
  /** A sprint search is in flight. See `useSprintSearch`. */
  searching?: boolean
  /** The last sprint search came back as a failure. The board still shows what it has. */
  searchFailed?: boolean
  /** The page's own inset, spelled as a full bleed — see `FilterBar.className`. */
  bleed?: string
  t: Translate
  onChange: (next: TaskFilterValue) => void
}

/**
 * The bar, as `TaskBoard.filters` wants it.
 *
 * WHAT STAYED THIS FILE'S IS THE RULE ABOUT TINTING, because it is a fact about a FILTER
 * BAR and not about a picker: a control is lit when it is away from what the page opens on,
 * and what that means differs per control. The sort's default is its first entry, the
 * epic's and the agent's is having no value at all, and the repository has no default to be
 * away from — it is always set to something, so a rule inferred inside `Select` would leave
 * it permanently lit. Each entry below says which it is.
 */
export function buildTaskFilters({
  value,
  repos,
  epics,
  sprintName,
  searchesSprint,
  hasAgents,
  searching,
  searchFailed,
  bleed,
  t,
  onChange,
}: TaskFiltersInput): Omit<FilterBarProps, 'top' | 'paneRef'> {
  // `recent` FIRST, because the leading option IS this picker's default — see the `active`
  // it is handed below.
  const sortOptions = [
    { value: 'recent', label: t('tasks.filter.sortRecent') },
    { value: 'priority', label: t('tasks.filter.sortPriority') },
  ]

  const before: FilterBarControl[] = [
    {
      // FIRST, and before the search box, because it is the only control here that decides
      // what the page is about rather than how much of it is on screen. No `clearLabel`:
      // there is no "all repositories" state to go back to.
      kind: 'select',
      id: 'repo',
      value: value.configKey,
      options: repos.map((repo) => ({ value: repo.configKey, label: repo.name, color: repo.color })),
      onChange: (configKey) => onChange({ ...value, configKey }),
      placeholder: t('tasks.filter.pickRepo'),
      width: REPO_WIDTH,
      // The repository tile the sidebar and the webapp draw a repository with, rather than
      // the bare dot the epic picker keeps. The picker names the page's subject now, so it
      // is worth being recognised across surfaces the way a repository is everywhere else;
      // an epic is a Jira relationship with no such mark of its own.
      marker: 'repo',
    },
  ]

  // Directly after the picker, because the two answer one question between them: the picker
  // says which repository, and this says which of its sprints. A chip and not a control —
  // a sprint NAMES a thing and the name does not change while you look at it.
  if (sprintName) {
    before.push({
      kind: 'chip',
      id: 'sprint',
      label: sprintName,
      icon: CalendarRange,
      title: t('tasks.jira.sprintHint', { sprint: sprintName }),
    })
  }

  const after: FilterBarControl[] = [
    {
      // An icon here and on neither of its neighbours, because it is the one picker whose
      // values do not name their own subject: "Newest" beside a repository name and an epic
      // title reads as a third thing to filter by until the arrow says it is an order.
      kind: 'select',
      id: 'sort',
      value: value.sort,
      options: sortOptions,
      onChange: (sort) => onChange({ ...value, sort: sort as TaskSort }),
      placeholder: t('tasks.filter.sortRecent'),
      width: SORT_WIDTH,
      icon: ArrowDownWideNarrow,
      // Away from default = in any order but the one the page comes in, which is the
      // leading entry.
      active: value.sort !== sortOptions[0].value,
    },
  ]

  if (epics.length > 0) {
    after.push({
      kind: 'select',
      id: 'epic',
      value: value.epicKey,
      options: epics.map((epic) => ({ value: epic.key, label: epic.title, ...(epic.color ? { color: epic.color } : {}) })),
      onChange: (epicKey) => onChange({ ...value, epicKey }),
      placeholder: t('tasks.filter.allEpics'),
      clearLabel: t('tasks.filter.allEpics'),
      width: EPIC_WIDTH,
      active: !!value.epicKey,
    })
  }

  // AFTER the epic, so the two conditional pickers sit together at the end of the row and
  // the permanent controls keep the places the reader knows them by. Its glyph is the board
  // card's own agent mark, for the sort's reason: "With an agent" beside an epic title would
  // read as a third thing to narrow by until the bot says what it is about.
  if (hasAgents || !!value.agent) {
    after.push({
      kind: 'select',
      id: 'agent',
      value: value.agent,
      options: [
        // Both halves of the question, and the clear entry is what makes them a pair rather
        // than a switch: "who is being worked on" and "what is left to pick up" are two
        // things to ask of a sprint, and neither is the board's default state.
        { value: 'with', label: t('tasks.filter.withAgent') },
        { value: 'without', label: t('tasks.filter.withoutAgent') },
      ],
      onChange: (agent) => onChange({ ...value, agent: agent as TaskAgentFilter }),
      placeholder: t('tasks.filter.anyAgent'),
      clearLabel: t('tasks.filter.anyAgent'),
      width: AGENT_WIDTH,
      icon: BotMessageSquare,
      active: !!value.agent,
    })
  }

  return {
    before,
    after,
    search: {
      value: value.query,
      onChange: (query) => onChange({ ...value, query }),
      // The placeholder is where the box says how far it reaches, because it is the only
      // text a reader sees BEFORE typing. A caption under the bar would say it after the
      // fact, and to everyone including the boards it is not true of.
      placeholder: searchesSprint
        ? t('tasks.filter.searchSprintPlaceholder')
        : t('tasks.filter.searchPlaceholder'),
      clearLabel: t('tasks.filter.clearSearch'),
      ...(searching ? { busy: true, busyLabel: t('tasks.filter.searchingSprint') } : {}),
      ...(searchFailed ? { warning: t('tasks.filter.searchFailed') } : {}),
    },
    ...(bleed ? { className: bleed } : {}),
  }
}
