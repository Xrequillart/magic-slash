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
  | 'avatarpicker'
  | 'accountcard'
  | 'button'
  | 'buttonicon'
  | 'editabletext'
  | 'input'
  | 'kbd'
  | 'menu'
  | 'modalheader'
  | 'select'
  | 'sharebutton'
  | 'selecticon'
  | 'label'
  | 'status'
  | 'switch'
  | 'branchcard'
  | 'commitline'
  | 'commitcard'
  | 'timelineline'
  | 'diffstat'
  | 'filemodifiedline'
  | 'uncommittedchangescard'
  | 'checklist'
  | 'collapsibleline'
  | 'decisionlist'
  | 'sizingcard'
  | 'specheadercard'
  | 'reviewthreadline'
  | 'tabstrip'
  | 'tally'
  | 'pullrequestcard'
  | 'checklistcard'
  | 'fieldtable'
  | 'factlist'
  | 'languagecard'
  | 'settingrow'
  | 'settingscard'
  | 'disclosurecard'
  | 'healthcard'
  | 'repairlist'
  | 'noticecard'
  | 'breakdownlist'
  | 'budgetmeter'
  | 'notecard'
  | 'skillcard'
  | 'skillsrail'
  | 'skillbudget'
  | 'skillsoverview'
  | 'ticketcard'
  | 'boardcolumn'
  | 'taskboard'
  | 'filterbar'
  | 'trackerbadge'
  | 'copybutton'
  | 'commandchip'
  | 'chipinput'
  | 'stickybar'
  | 'metablock'
  | 'commentcard'
  | 'emptystate'
  | 'formfield'
  | 'imagefield'
  | 'skillheader'
  | 'skillintro'
  | 'outputsample'
  | 'ratelimitbar'
  | 'usagetable'
  | 'sectionheader'
  | 'profilecard'
  | 'organizationcard'
  | 'scriptcard'
  | 'repositorycard'
  | 'item'
  | 'repositoryitem'
  | 'planitem'
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
  | 'whatsnewdialog'
  | 'togglebutton'
  | 'stepper'
  | 'controlcenter'
  | 'setupstatuscard'
  | 'themegrid'
  | 'themepreviewgrid'

export const ENTRY_LABELS: Record<EntryId, string> = {
  colors: 'Colours',
  icon: 'Icon',
  progress: 'ProgressBar',
  loader: 'Loader',
  card: 'Card',
  button: 'Button',
  buttonicon: 'ButtonIcon',
  editabletext: 'EditableText',
  input: 'Input',
  kbd: 'Kbd',
  menu: 'Menu',
  modalheader: 'ModalHeader',
  select: 'Select',
  sharebutton: 'ShareButton',
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
  whatsnewdialog: 'WhatsNewDialog',
  togglebutton: 'ToggleButton',
  stepper: 'Stepper',
  controlcenter: 'ControlCenter',
  setupstatuscard: 'SetupStatusCard',
  themegrid: 'ThemeGrid',
  themepreviewgrid: 'ThemePreviewGrid',
  text: 'Text',
  avatar: 'Avatar',
  avatarpicker: 'AvatarPicker',
  accountcard: 'AccountCard',
  label: 'Label',
  status: 'Status',
  switch: 'Switch',
  branchcard: 'BranchCard',
  commitline: 'CommitLine',
  commitcard: 'CommitCard',
  timelineline: 'TimelineLine',
  diffstat: 'DiffStat',
  filemodifiedline: 'FileModifiedLine',
  uncommittedchangescard: 'UnCommittedChangesCard',
  checklist: 'CheckList',
  collapsibleline: 'CollapsibleLine',
  decisionlist: 'DecisionList',
  sizingcard: 'SizingCard',
  specheadercard: 'SpecHeaderCard',
  reviewthreadline: 'ReviewThreadLine',
  tabstrip: 'TabStrip',
  tally: 'Tally',
  pullrequestcard: 'PullRequestCard',
  checklistcard: 'ChecklistCard',
  fieldtable: 'FieldTable',
  factlist: 'FactList',
  languagecard: 'LanguageCard',
  settingrow: 'SettingRow',
  settingscard: 'SettingsCard',
  disclosurecard: 'DisclosureCard',
  healthcard: 'HealthCard',
  repairlist: 'RepairList',
  noticecard: 'NoticeCard',
  breakdownlist: 'BreakdownList',
  budgetmeter: 'BudgetMeter',
  notecard: 'NoteCard',
  skillcard: 'SkillCard',
  skillsrail: 'SkillsRail',
  skillbudget: 'SkillBudget',
  skillsoverview: 'SkillsOverview',
  ticketcard: 'TicketCard',
  boardcolumn: 'BoardColumn',
  taskboard: 'TaskBoard',
  filterbar: 'FilterBar',
  trackerbadge: 'TrackerBadge',
  copybutton: 'CopyButton',
  commandchip: 'CommandChip',
  chipinput: 'ChipInput',
  stickybar: 'StickyBar',
  metablock: 'MetaBlock',
  commentcard: 'CommentCard',
  emptystate: 'EmptyState',
  formfield: 'FormField',
  imagefield: 'ImageField',
  skillheader: 'SkillHeader',
  skillintro: 'SkillIntro',
  outputsample: 'OutputSample',
  ratelimitbar: 'RateLimitBar',
  usagetable: 'UsageTable',
  sectionheader: 'SectionHeader',
  profilecard: 'ProfileCard',
  organizationcard: 'OrganizationCard',
  scriptcard: 'ScriptCard',
  repositorycard: 'RepositoryCard',
  item: 'Item',
  repositoryitem: 'RepositoryItem',
  planitem: 'PlanItem',
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
  input: ['icon'],
  kbd: ['text'],
  menu: ['avatar', 'icon', 'text'],
  modalheader: ['buttonicon', 'icon', 'tabstrip', 'text'],
  select: ['icon', 'text'],
  sharebutton: ['avatar', 'button', 'buttonicon', 'icon', 'text'],
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
  themepreviewgrid: ['icon', 'text'],
  updatedialog: ['modal', 'card', 'icon', 'progress', 'text'],
  whatsnewdialog: ['modal', 'button', 'text'],
  text: [],
  avatar: ['icon'],
  avatarpicker: [],
  label: ['icon', 'text', 'avatar'],
  status: ['icon', 'text'],
  switch: [],
  branchcard: ['buttonicon', 'icon', 'text'],
  commitline: ['buttonicon', 'icon', 'text'],
  commitcard: ['commitline', 'text'],
  timelineline: ['avatar', 'icon', 'label', 'text'],
  diffstat: ['text'],
  filemodifiedline: ['diffstat', 'text'],
  uncommittedchangescard: ['filemodifiedline', 'diffstat', 'text'],
  checklist: ['icon', 'text'],
  collapsibleline: ['icon', 'text'],
  decisionlist: ['buttonicon'],
  sizingcard: ['icon'],
  specheadercard: ['icon', 'label', 'text'],
  reviewthreadline: ['icon', 'label', 'text'],
  tally: ['text'],
  pullrequestcard: ['buttonicon', 'collapsibleline', 'icon', 'text'],
  checklistcard: ['collapsibleline', 'icon', 'text'],
  fieldtable: ['button', 'text'],
  factlist: ['status', 'text'],
  languagecard: ['card', 'settingrow', 'text'],
  settingrow: ['button', 'buttonicon', 'chipinput', 'icon', 'input', 'select', 'stepper', 'switch', 'text'],
  settingscard: ['banner', 'card', 'settingrow', 'text'],
  disclosurecard: ['card', 'icon', 'settingrow', 'text'],
  healthcard: ['banner', 'card', 'icon', 'loader', 'repairlist', 'settingrow', 'text'],
  repairlist: ['button', 'text'],
  noticecard: ['banner', 'card', 'label', 'text'],
  breakdownlist: ['label', 'text'],
  budgetmeter: ['progress', 'text'],
  notecard: ['icon', 'text'],
  skillcard: ['icon', 'label', 'text'],
  skillsrail: ['buttonicon', 'icon', 'label', 'menusidebaritem', 'text'],
  skillbudget: ['banner', 'breakdownlist', 'budgetmeter', 'notecard', 'sectionheader', 'tabstrip', 'text'],
  skillsoverview: ['emptystate', 'label', 'loader', 'noticecard', 'sectionheader', 'skillbudget', 'skillcard', 'text'],
  ticketcard: ['buttonicon', 'copybutton', 'icon', 'label', 'status', 'text', 'trackerbadge'],
  boardcolumn: ['icon', 'text'],
  taskboard: ['boardcolumn', 'emptystate', 'filterbar', 'noticecard', 'sectionheader', 'ticketcard'],
  filterbar: ['buttonicon', 'icon', 'input', 'label', 'loader', 'select', 'stickybar'],
  trackerbadge: ['label'],
  copybutton: ['buttonicon'],
  commandchip: ['copybutton', 'icon'],
  chipinput: ['button', 'icon', 'input', 'text'],
  stickybar: [],
  metablock: ['text'],
  commentcard: ['card', 'text'],
  emptystate: ['button', 'icon', 'text'],
  formfield: ['input', 'text'],
  imagefield: ['button', 'buttonicon', 'icon', 'text'],
  skillheader: ['icon', 'label', 'text'],
  skillintro: ['card', 'commandchip', 'text'],
  outputsample: ['text'],
  ratelimitbar: ['progress', 'text'],
  usagetable: ['text'],
  sectionheader: ['button', 'icon', 'text'],
  profilecard: ['fieldtable', 'text'],
  organizationcard: ['card', 'avatar', 'button', 'buttonicon', 'icon', 'loader', 'select', 'status', 'text'],
  scriptcard: ['button', 'loader', 'icon', 'text'],
  repositorycard: ['card', 'headerrepocard', 'branchcard', 'uncommittedchangescard', 'commitcard'],
  // `Item` holds a ground and a shape and draws nothing: the rows inside it are the
  // caller's, the same way `Card`'s children are.
  item: [],
  repositoryitem: ['item', 'icon', 'label', 'text'],
  planitem: ['item', 'label', 'status', 'text'],
  sidebaragentcoderinfo: ['contextagentcard', 'titleagentcard', 'repositorycard', 'repositoryselector'],
  sidebaragentplannerinfo: ['contextagentcard', 'speccard'],
  modal: [],
  repositoryselector: ['modal', 'card', 'label', 'buttonicon'],
  speccard: ['card', 'label', 'status', 'editabletext', 'buttonicon'],
  banner: ['button', 'icon', 'text'],
  agent: ['loader', 'icon', 'text'],
  accountcard: ['fieldtable', 'avatar', 'banner', 'button', 'icon', 'text'],
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
  input: 'A box you type in, one line or several',
  kbd: 'A key you press, as the cap it is written on',
  menu: 'Rows under something you drew',
  modalheader: 'The top of every dialog, once',
  select: 'The app’s one picker, and the list under it',
  sharebutton: 'Who may see and edit, behind one button',
  selecticon: 'That control, opening a menu',
  contextagentcard: 'What an agent is spending',
  headerrepocard: 'A repository, and what you can do to it',
  menusidebar: 'A menu, as a landmark',
  usageclaudecodecard: 'What is left of the account',
  titleagentcard: 'Who an agent is, in four facts',
  menusidebaritem: 'One row that takes you somewhere',
  sidebar: 'The whole left column, and it knows nothing',
  updatedialog: 'The app, about to become a newer app',
  accountcard: 'Who is signed in, and what you can do about it',
  whatsnewdialog: 'What the version you just installed brought',
  speccard: 'A plan being written, live',
  modal: 'The ground a dialog floats on',
  repositoryselector: 'Which repositories an agent works in',
  item: 'One row of a list, and the stack it belongs to',
  repositoryitem: 'A repository, as a list scans it',
  planitem: 'One plan, as one dense line',
  sidebaragentplannerinfo: 'The right column of a planner',
  apptitlebar: 'The bar across the top, and it knows nothing either',
  togglebutton: 'A feature, on or off, in one circle',
  stepper: 'A value walked up and down',
  controlcenter: 'The quick settings, sliding down from under the bar',
  setupstatuscard: 'The machine’s verdict in one row',
  themegrid: 'Eight themes to look at, four to a line',
  themepreviewgrid: 'Every theme as a little window, with its name',
  icon: 'Every glyph, five sizes, three tones',
  text: 'Cera Pro, six sizes, four weights',
  avatar: 'A face, or the default portrait when there is none',
  avatarpicker: 'Thirty drawn faces, six to a line',
  label: 'Names a thing, on a tinted plate',
  status: 'Reports a state, and changes it',
  switch: 'On or off, and it takes at once',
  branchcard: 'Where the work is, and where it goes',
  commitline: 'One commit, on the branch’s rail',
  commitcard: 'What this branch has that its base does not',
  timelineline: 'Who did what, and how, on a history’s rail',
  diffstat: 'How much was added, how much was taken away',
  filemodifiedline: 'One file that has changed, and by how much',
  uncommittedchangescard: 'The files you are in the middle of',
  checklist: 'Every check the run is made of, named',
  collapsibleline: 'One box to tick, and what is behind it',
  decisionlist: 'The questions a plan was framed by, and what was decided',
  sizingcard: 'How big a plan was judged to be, and why',
  specheadercard: 'Where a spec lives, and where it stands',
  reviewthreadline: 'One review thread, scanned rather than read',
  tabstrip: 'A pill rail that slides to the tab you pick',
  tally: 'A total, broken into the parts it is made of',
  pullrequestcard: 'A pull request, as the sidebar watches it',
  checklistcard: 'What is left to do, and how far through you are',
  fieldtable: 'A list of settings, as a table',
  factlist: 'A list of facts, nothing to press',
  languagecard: 'Which language the product speaks to you in',
  settingrow: 'One setting, and the control that changes it',
  settingscard: 'Settings stacked, with the rules between them',
  disclosurecard: 'What a feature records, and what it never touches',
  healthcard: 'Is this working, and what is wrong if not',
  repairlist: 'What is broken, and the way to it not being',
  noticecard: 'One fact, and the things it counts',
  breakdownlist: 'What a total is made of, ranked',
  budgetmeter: 'A quantity against its allowance',
  notecard: 'One thing worth knowing, on a quiet plate',
  skillcard: 'One skill as a tile you can open',
  skillsrail: 'Every skill on the machine, down the left',
  skillbudget: 'What the skill listing costs, against the model’s window',
  skillsoverview: 'The Skills page’s overview: warnings, budget, cards',
  ticketcard: 'One ticket on a board, in three bands',
  boardcolumn: 'One column of a board, heading and all',
  taskboard: 'A board of tickets, and the page around it',
  filterbar: 'The pinned row of controls over a list',
  trackerbadge: 'Which tracker a ticket came from',
  copybutton: 'A string onto the clipboard, and the tick that says so',
  commandchip: 'A command you are meant to type',
  chipinput: 'A set of words the reader builds',
  stickybar: 'An opaque band pinned to the top of a pane',
  metablock: 'One field of a metadata column',
  commentcard: 'One turn in a conversation',
  emptystate: 'Nothing here yet, and the ways to change that',
  formfield: 'One entry of a form you fill in',
  imagefield: 'A picture a thing will wear',
  skillheader: 'What a skill is, read rather than edited',
  skillintro: 'What a command does, above its settings',
  outputsample: 'What the settings will actually produce',
  ratelimitbar: 'One plan limit, and when it turns over',
  usagetable: 'Figures over periods, in columns',
  sectionheader: 'What the thing under it is',
  profilecard: 'Who the human is, as the skills read it',
  organizationcard: 'One organization, and everyone in it',
  scriptcard: 'A process still alive on your machine',
  repositorycard: 'One repository, and everything happening to it',
  sidebaragentcoderinfo: 'The right column, and the agent in it',
  banner: 'States a fact about a surface',
  agent: 'What it is called, and what it is doing',
}
