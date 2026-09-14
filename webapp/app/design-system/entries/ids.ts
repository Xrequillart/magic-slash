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
  | 'buttonicon'
  | 'editabletext'
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

export const ENTRY_LABELS: Record<EntryId, string> = {
  colors: 'Colours',
  icon: 'Icon',
  progress: 'ProgressBar',
  loader: 'Loader',
  card: 'Card',
  buttonicon: 'ButtonIcon',
  editabletext: 'EditableText',
  selecticon: 'SelectIcon',
  contextagentcard: 'ContextAgentCard',
  headerrepocard: 'HeaderRepoCard',
  menusidebar: 'MenuSidebar',
  usageclaudecodecard: 'UsageClaudeCodeCard',
  titleagentcard: 'TitleAgentCard',
  menusidebaritem: 'MenuSidebarItem',
  sidebar: 'Sidebar',
  apptitlebar: 'AppTitleBar',
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

export const FAMILIES: Family[] = [
  {
    label: 'Foundation',
    note: 'Draws itself. Depends on nothing.',
    entries: ['icon', 'text', 'progress', 'loader', 'card', 'switch'],
  },
  {
    label: 'Primary',
    note: 'One control, built from foundations.',
    /**
     * `DiffStat` IS HERE ON THE GRAPH RATHER THAN ON THE NOTE, which is the other half
     * of what `AppTitleBar` says below. It is not a control — nothing in it can be
     * pressed — and by the note alone it would file under "several pieces saying one
     * thing", next to `Label`. But `FileModifiedLine` DRAWS it, and a component cannot
     * sit in the same tier as something it is built from, so the graph puts it a rung
     * up and the note gives way.
     */
    entries: ['avatar', 'buttonicon', 'selecticon', 'editabletext', 'diffstat'],
  },
  {
    label: 'Secondary',
    note: 'Several pieces saying one thing.',
    entries: ['label', 'status', 'branchcard', 'commitline', 'filemodifiedline', 'agent', 'menusidebaritem', 'banner'],
  },
  {
    label: 'Tertiary',
    note: 'A whole region of a page.',
    /**
     * `AppTitleBar` IS HERE ON THE NOTE RATHER THAN ON THE GRAPH, which is worth saying
     * out loud since the graph is what settles every other row. It draws one `ButtonIcon`
     * and nothing else, so nothing would stop it sitting a tier higher — but a tier is a
     * position AND this family's note is "a whole region of a page", which a title bar is
     * exactly. It uses only what is above it, so the rule holds either way.
     */
    entries: [
      'commitcard',
      'uncommittedchangescard',
      'titleagentcard',
      'contextagentcard',
      'headerrepocard',
      'menusidebar',
      'usageclaudecodecard',
      'apptitlebar',
    ],
  },
  /**
   * THE FOURTH TIER EXISTS BECAUSE THE GRAPH SAID SO, the way `Label` moved down when it
   * grew an avatar. `Sidebar` draws a `MenuSidebar` and is handed a `UsageClaudeCodeCard`
   * to hang under it, and both of those are tertiary — a component cannot sit in the
   * same tier as something it is built from.
   *
   * It is atomic design's TEMPLATE, one rung past the organism: not a region of a
   * window but a whole side of one, with the regions arranged in it.
   */
  {
    label: 'Quaternary',
    note: 'A whole side of the window, regions arranged in it.',
    entries: ['sidebar'],
  },
]

/** What each entry's row says under its name. */
export const ENTRY_NOTES: Record<EntryId, string> = {
  colors: 'The hexes and the roles, kept apart',
  progress: 'A filled track, green until told otherwise',
  loader: 'Something is happening, in two shapes',
  card: 'A raised panel, and nothing else',
  buttonicon: 'A control that is only a mark',
  editabletext: 'Words you can click into',
  selecticon: 'That control, opening a menu',
  contextagentcard: 'What an agent is spending',
  headerrepocard: 'A repository, and what you can do to it',
  menusidebar: 'A menu, as a landmark',
  usageclaudecodecard: 'What is left of the account',
  titleagentcard: 'Who an agent is, in four facts',
  menusidebaritem: 'One row that takes you somewhere',
  sidebar: 'The whole left column, and it knows nothing',
  apptitlebar: 'The bar across the top, and it knows nothing either',
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
  banner: 'States a fact about a surface',
  agent: 'What it is called, and what it is doing',
}
