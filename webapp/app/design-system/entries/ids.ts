/**
 * The entries, their families, and nothing else.
 *
 * A module of its own because both directions need it: `Shell` builds the rail and
 * the router from it, and each entry names the components it is BUILT ON so the
 * chips under its title can be clicked through to. Putting the labels in `Shell`
 * beside the components would make that second import a cycle.
 */
export type EntryId =
  | 'colors'
  | 'icon'
  | 'text'
  | 'progress'
  | 'loader'
  | 'card'
  | 'avatar'
  | 'button'
  | 'buttonicon'
  | 'editabletext'
  | 'menu'
  | 'modalheader'
  | 'selecticon'
  | 'label'
  | 'status'
  | 'switch'
  | 'branchcard'
  | 'commitline'
  | 'commitcard'
  | 'diffstat'
  | 'filemodifiedline'
  | 'uncommittedchangescard'
  | 'checklist'
  | 'collapsibleline'
  | 'reviewthreadline'
  | 'tabstrip'
  | 'tally'
  | 'pullrequestcard'
  | 'scriptcard'
  | 'repositorycard'
  | 'repositoryitem'
  | 'sidebaragentcoderinfo'
  | 'sidebaragentplannerinfo'
  | 'speccard'
  | 'modal'
  | 'repositoryselector'
  | 'banner'
  | 'agent'
  | 'contextagentcard'
  | 'headerrepocard'
  | 'menusidebar'
  | 'usageclaudecodecard'
  | 'titleagentcard'
  | 'menusidebaritem'
  | 'sidebar'
  | 'apptitlebar'
  | 'updatedialog'
  | 'togglebutton'
  | 'stepper'
  | 'controlcenter'
  | 'setupstatuscard'
  | 'themegrid'

export const ENTRY_LABELS: Record<EntryId, string> = {
  colors: 'Colours',
  icon: 'Icon',
  progress: 'ProgressBar',
  loader: 'Loader',
  card: 'Card',
  button: 'Button',
  buttonicon: 'ButtonIcon',
  editabletext: 'EditableText',
  menu: 'Menu',
  modalheader: 'ModalHeader',
  selecticon: 'SelectIcon',
  contextagentcard: 'ContextAgentCard',
  headerrepocard: 'HeaderRepoCard',
  menusidebar: 'MenuSidebar',
  usageclaudecodecard: 'UsageClaudeCodeCard',
  titleagentcard: 'TitleAgentCard',
  menusidebaritem: 'MenuSidebarItem',
  sidebar: 'Sidebar',
  apptitlebar: 'AppTitleBar',
  updatedialog: 'UpdateDialog',
  togglebutton: 'ToggleButton',
  stepper: 'Stepper',
  controlcenter: 'ControlCenter',
  setupstatuscard: 'SetupStatusCard',
  themegrid: 'ThemeGrid',
  text: 'Text',
  avatar: 'Avatar',
  label: 'Label',
  status: 'Status',
  switch: 'Switch',
  branchcard: 'BranchCard',
  commitline: 'CommitLine',
  commitcard: 'CommitCard',
  diffstat: 'DiffStat',
  filemodifiedline: 'FileModifiedLine',
  uncommittedchangescard: 'UnCommittedChangesCard',
  checklist: 'CheckList',
  collapsibleline: 'CollapsibleLine',
  reviewthreadline: 'ReviewThreadLine',
  tabstrip: 'TabStrip',
  tally: 'Tally',
  pullrequestcard: 'PullRequestCard',
  scriptcard: 'ScriptCard',
  repositorycard: 'RepositoryCard',
  repositoryitem: 'RepositoryItem',
  sidebaragentcoderinfo: 'SidebarAgentCoderInfo',
  sidebaragentplannerinfo: 'SidebarAgentPlannerInfo',
  speccard: 'SpecCard',
  modal: 'Modal',
  repositoryselector: 'RepositorySelector',
  banner: 'Banner',
  agent: 'Agent',
}

/**
 * The tiers, in the order a component is built up through them.
 *
 * Composition is the ONLY rule: a tier may use the tiers above it and never its own
 * or the ones below. `Banner` draws an `Icon` and a `Text` and is therefore secondary.
 * A tier is not a size or an importance ranking — it is a position in the dependency
 * graph, which is what makes it checkable rather than a matter of taste.
 *
 * `Label` MOVED for exactly that reason. It was primary while it drew an `Icon` and a
 * `Text`; giving it an `avatar` made it draw an `Avatar` too, which is itself primary,
 * and a component cannot be the same tier as something it is built from. Nobody
 * argued about it — the graph said so.
 *
 * This is atomic design with different words: foundation / primary / secondary /
 * tertiary against Brad Frost's atoms / molecules / organisms. Worth knowing the
 * other vocabulary exists, since every design system article uses it — but these
 * names say the same thing and read better in French, so they stay until someone
 * prefers the originals.
 *
 * EMPTY TIERS ARE NOT SHOWN. Three components are extracted and the rail says so;
 * a `Primary` heading over nothing would be a promise the folder has not kept.
 */
export interface Family {
  label: string
  /** One line, under the heading, saying what belongs in it. */
  note: string
  entries: EntryId[]
}

/**
 * The one entry that is not a component and sits above the families.
 *
 * A palette is not something you compose with — it is what everything below is made
 * OF — so filing it under a tier would put it in a sequence it has no place in.
 */
export const FOUNDATION_PAGES: EntryId[] = ['colors']

/**
 * THE COMPOSITION GRAPH: what each entry DRAWS, by id.
 *
 * THE ONE PLACE IT IS WRITTEN. Two things read it — the "Built on" chips on an entry's own
 * page, and the tier that entry is filed under — and for a while they were two separate
 * hand-kept lists that said different things: `RepositoryCard` claimed five components it
 * only received in slots, `SidebarAgentCoderInfo` listed four it had stopped drawing. A
 * reader could not tell which claim was the real one, because neither was derived from
 * anything.
 *
 * DECLARED BY HAND rather than read off the imports, and that stays true: an import list
 * includes types, constants and everything a file touches, where this is the shorter and
 * more useful claim — what it DRAWS. What changed is that it is declared ONCE.
 *
 * A component that takes something as a `ReactNode` slot does NOT list it. The slot's own
 * prop documents what belongs there; listing it here would say this component draws it,
 * and the tier below would then be computed from a dependency it does not have.
 */
export const ENTRY_USES: Record<EntryId, EntryId[]> = {
  colors: [],
  icon: [],
  progress: [],
  loader: [],
  card: [],
  button: ['icon', 'loader', 'text'],
  buttonicon: ['icon', 'loader'],
  editabletext: ['icon'],
  menu: ['avatar', 'icon', 'text'],
  modalheader: ['buttonicon', 'icon', 'tabstrip', 'text'],
  selecticon: ['buttonicon', 'icon', 'text'],
  contextagentcard: ['card', 'label', 'progress', 'buttonicon'],
  headerrepocard: ['label', 'selecticon', 'buttonicon'],
  menusidebar: ['menusidebaritem'],
  usageclaudecodecard: ['card', 'label', 'buttonicon', 'progress'],
  titleagentcard: ['card', 'label', 'status', 'editabletext'],
  menusidebaritem: ['avatar', 'icon', 'text'],
  sidebar: ['menusidebar', 'agent', 'buttonicon', 'selecticon', 'usageclaudecodecard'],
  apptitlebar: ['buttonicon', 'label'],
  togglebutton: ['icon', 'text', 'label'],
  stepper: ['buttonicon', 'text'],
  tabstrip: ['avatar', 'icon', 'text'],
  // The tiles, the stepper and the pickers on the sheet are the CALLER's — slots, not
  // drawings — so only the group heading counts.
  controlcenter: ['text'],
  setupstatuscard: ['card', 'buttonicon', 'icon', 'loader', 'text'],
  themegrid: ['card'],
  updatedialog: ['modal', 'card', 'icon', 'progress', 'text'],
  text: [],
  avatar: ['icon'],
  label: ['icon', 'text', 'avatar'],
  status: ['icon', 'text'],
  switch: [],
  branchcard: ['buttonicon', 'icon', 'text'],
  commitline: ['buttonicon', 'icon', 'text'],
  commitcard: ['commitline', 'text'],
  diffstat: ['text'],
  filemodifiedline: ['diffstat', 'text'],
  uncommittedchangescard: ['filemodifiedline', 'diffstat', 'text'],
  checklist: ['icon', 'text'],
  collapsibleline: ['icon', 'text'],
  reviewthreadline: ['icon', 'label', 'text'],
  tally: ['text'],
  pullrequestcard: ['buttonicon', 'collapsibleline', 'icon', 'text'],
  scriptcard: ['button', 'loader', 'icon', 'text'],
  repositorycard: ['card', 'headerrepocard', 'branchcard', 'uncommittedchangescard', 'commitcard'],
  repositoryitem: ['icon', 'label', 'text'],
  sidebaragentcoderinfo: ['contextagentcard', 'titleagentcard', 'repositorycard', 'repositoryselector'],
  sidebaragentplannerinfo: ['contextagentcard', 'speccard'],
  modal: [],
  repositoryselector: ['modal', 'card', 'label', 'buttonicon'],
  speccard: ['card', 'label', 'status', 'editabletext', 'buttonicon'],
  banner: ['button', 'icon', 'text'],
  agent: ['loader', 'icon', 'text'],
}

/** The graph as `EntryHeader` wants it: an id and the label to print on the chip. */
export function usesOf(id: EntryId): { id: EntryId; label: string }[] {
  return ENTRY_USES[id].map((dep) => ({ id: dep, label: ENTRY_LABELS[dep] }))
}

/**
 * THE TIERS ARE COMPUTED, and this is the rule in one line: a component sits one rung
 * above the highest thing it draws.
 *
 * SO THE GRAPH DECIDES, always, and there is no longer a second answer to argue with. The
 * tiers used to be five hand-kept arrays, and every judgement call in them carried a
 * paragraph explaining whether the graph or the family's note had won — `AppTitleBar` was
 * placed "on the note rather than on the graph", `DiffStat` the other way round. Those
 * paragraphs were the tell: a taxonomy you have to argue about per row is one nobody can
 * keep correct. Nine components were filed under the wrong tier by the time this was
 * written, `SelectIcon` and `SidebarAgentCoderInfo` among them.
 *
 * NOTHING IS PINNED. Move a component's drawing and its tier moves with it on the next
 * render, which is the whole point: the rail cannot fall behind the folder.
 */
const TIER_NAMES = ['Foundation', 'Primary', 'Secondary', 'Tertiary', 'Quaternary', 'Quinary']

const TIER_NOTES = [
  'Draws itself. Depends on nothing.',
  'One control, built from foundations.',
  'Several pieces saying one thing.',
  'A whole region of a page.',
  'A whole side of the window, regions arranged in it.',
  'A column with those sides arranged in it.',
]

/**
 * How deep an entry sits: 0 when it draws nothing, otherwise one past the deepest thing it
 * draws. Memoised across the walk because the foundations are reached from almost every
 * node, and the graph is acyclic by construction — a component cannot draw something that
 * draws it.
 */
function tierOf(id: EntryId, depth: Map<EntryId, number> = TIER_DEPTHS): number {
  const cached = depth.get(id)
  if (cached !== undefined) return cached
  const deps = ENTRY_USES[id]
  const own = deps.length === 0 ? 0 : 1 + Math.max(...deps.map((dep) => tierOf(dep, depth)))
  depth.set(id, own)
  return own
}

const TIER_DEPTHS = new Map<EntryId, number>()

/**
 * The tiers, in the order a component is built up through them.
 *
 * EMPTY TIERS ARE NOT SHOWN. A `Quinary` heading over nothing would be a promise the
 * folder has not kept — and since the depth is computed, a tier empties out on its own the
 * day its last member loses a dependency.
 *
 * `FOUNDATION_PAGES` are excluded: a palette is not something you compose with.
 */
export const FAMILIES: Family[] = TIER_NAMES.map((label, tier) => ({
  label,
  note: TIER_NOTES[tier],
  entries: (Object.keys(ENTRY_USES) as EntryId[])
    .filter((id) => !FOUNDATION_PAGES.includes(id) && tierOf(id) === tier)
    // Alphabetical inside a tier: nothing about the graph orders two components that sit
    // at the same depth, and a stable order is worth more than an arbitrary one.
    .sort((a, b) => ENTRY_LABELS[a].localeCompare(ENTRY_LABELS[b])),
})).filter((family) => family.entries.length > 0)

/** What each entry's row says under its name. */
export const ENTRY_NOTES: Record<EntryId, string> = {
  colors: 'The hexes and the roles, kept apart',
  progress: 'A filled track, green until told otherwise',
  loader: 'Something is happening, in two shapes',
  card: 'A raised panel, and nothing else',
  button: 'A control that is a word',
  buttonicon: 'A control that is only a mark',
  editabletext: 'Words you can click into',
  menu: 'Rows under something you drew',
  modalheader: 'The top of every dialog, once',
  selecticon: 'That control, opening a menu',
  contextagentcard: 'What an agent is spending',
  headerrepocard: 'A repository, and what you can do to it',
  menusidebar: 'A menu, as a landmark',
  usageclaudecodecard: 'What is left of the account',
  titleagentcard: 'Who an agent is, in four facts',
  menusidebaritem: 'One row that takes you somewhere',
  sidebar: 'The whole left column, and it knows nothing',
  updatedialog: 'The app, about to become a newer app',
  speccard: 'A plan being written, live',
  modal: 'The ground a dialog floats on',
  repositoryselector: 'Which repositories an agent works in',
  repositoryitem: 'A repository, as a list scans it',
  sidebaragentplannerinfo: 'The right column of a planner',
  apptitlebar: 'The bar across the top, and it knows nothing either',
  togglebutton: 'A feature, on or off, in one circle',
  stepper: 'A value walked up and down',
  controlcenter: 'The quick settings, sliding down from under the bar',
  setupstatuscard: 'The machine’s verdict in one row',
  themegrid: 'Eight themes to look at, four to a line',
  icon: 'Every glyph, five sizes, three tones',
  text: 'Cera Pro, six sizes, four weights',
  avatar: 'A face, or the icon when there is none',
  label: 'Names a thing, on a tinted plate',
  status: 'Reports a state, and changes it',
  switch: 'On or off, and it takes at once',
  branchcard: 'Where the work is, and where it goes',
  commitline: 'One commit, on the branch’s rail',
  commitcard: 'What this branch has that its base does not',
  diffstat: 'How much was added, how much was taken away',
  filemodifiedline: 'One file that has changed, and by how much',
  uncommittedchangescard: 'The files you are in the middle of',
  checklist: 'Every check the run is made of, named',
  collapsibleline: 'One box to tick, and what is behind it',
  reviewthreadline: 'One review thread, scanned rather than read',
  tabstrip: 'A pill rail that slides to the tab you pick',
  tally: 'A total, broken into the parts it is made of',
  pullrequestcard: 'A pull request, as the sidebar watches it',
  scriptcard: 'A process still alive on your machine',
  repositorycard: 'One repository, and everything happening to it',
  sidebaragentcoderinfo: 'The right column, and the agent in it',
  banner: 'States a fact about a surface',
  agent: 'What it is called, and what it is doing',
}
